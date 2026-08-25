# TODO — `@effect/ai-amazon-bedrock`

Extensions deliberately scoped out while implementing streaming tool calls, reasoning,
images/documents, prompt caching, and citations. None of these are bugs; each is a Converse
capability the provider does not model yet. Ordered by how likely they are to matter.

## Video blocks

`VideoBlock` mirrors `ImageBlock` exactly: a format enum (`mkv`, `mov`, `mp4`, `webm`, `flv`,
`mpeg`, `mpg`, `wmv`, `three_gp`) plus a source that is `bytes` or `s3Location`. The `MediaSource`
schema, the `fileSource` resolver and the media-type lookup-table pattern all already exist from
the image/document work, so this is mostly mechanical. Today a `video/*` file part fails with
`InvalidUserInputError` naming the media type.

## `DocumentSource.content`

`bytes`, `s3Location` and `text` are modelled; `content` is not. It carries a document as a list of
pre-chunked `{ text }` blocks, and it is what makes chunk-granular citations meaningful:
`DocumentChunkLocation.start` and `.end` are chunk indices, so a `documentChunk` citation has
nothing to index into unless the request supplied chunks. `Prompt.FilePart` carries a single `data`
and cannot express "this document is these five sections", so modelling it means a new
`amazonBedrock` file-part option carrying document payload rather than configuration — the first
option in this repo to do so. That is the decision to make before implementing it.

## `ImageBlock.error`

`ErrorBlock` reports that an image could not be processed. Not modelled, so such a response decodes
as an image block with no usable content rather than surfacing the reason.

---

Other `ContentBlock` union members remain unmodelled and decode-and-ignore by design: `audio`,
`guardContent`, `searchResult`, `toolAddition`, `toolRemoval`. So are the `web` and
`searchResultLocation` members of `CitationLocation`, which accompany search results the provider
cannot send; such a citation is dropped rather than attributed to a document.
The `systemTool` member of the `Tool` union is likewise unmodelled: it selects Bedrock-hosted tools
this provider cannot invoke.

## Verification gaps

Every test in this package stubs the `HttpClient`, so nothing here is evidence about AWS
itself. `packages/ai/amazon-bedrock/test/live/` holds checks that talk to real Bedrock; see
its README for how to run them and why they cannot fire by accident. **That directory is
temporary and comes out before the branch is squashed for the upstream PR.**

The suites have been run green against real Bedrock in `eu-west-1` against Sonnet 4.5 via
the EU geo inference profile. What that run settled, and what it did not:

**Closed.** Streaming decodes bytes AWS actually produced, over several frames, including a
tool call whose input JSON is split across `contentBlockDelta` frames — so the parser and
its hand-built unit-test fixtures no longer rest on a single shared reading of the spec.
A tool call is answered and sent back: the `toolResult` block, its `toolUseId` and the
`toolConfig` that has to accompany it are accepted by Converse, and the model's next
answer is built from the tool's output — the pairing Converse validates itself and a
stubbed test cannot see. Cache checkpoints are written and read back at both `5m` and
`1h`, with the usage identity
`totalTokens == inputTokens + cacheRead + cacheWrite + outputTokens` asserted on the
write call as well as the read, where the write term is actually non-zero. Image and
document blocks round-trip, and citations come back as source parts resolving to the right
document. Three of the nine mapped Converse stop reasons are observed rather than assumed:
`end_turn`, `tool_use`, and `max_tokens` forced with a one-token ceiling. The
`x-amzn-errortype` values behind three of the five mapped exception shapes are pinned to
the strings AWS sends: `UnrecognizedClientException`, `InvalidSignatureException` and
`AccessDeniedException`.

**Found by doing this.** Converse accepts a `text` document source only alongside a
citations config, and rejects an uncited one with "must set one of the following keys:
bytes, s3Location". The provider converted every `text/*` document to a `text` source
unconditionally, so uncited text, csv, html and markdown documents were rejected outright.
The Smithy model lists `text` as an unconditional member of the `DocumentSource` union, so
no amount of reading the spec would have shown this, and a stubbed test would only have
confirmed the wrong shape.

**Still open.** Reasoning is unexercised end to end, and cannot be: enabling extended
thinking on an Anthropic model needs `additionalModelRequestFields` on the Converse
request, which `ConverseRequest` does not model. The decode path for `reasoningContent`,
the signature round-trip that lets a reasoning block be sent back in a later turn, and
reasoning deltas over the stream are therefore all covered only by stubs. Modelling that
field is the prerequisite, and is not currently on this list.

`AccessDeniedException` is now pinned too, from an unusual direction: a request that
carries no `Authorization` header at all. That is documented as the
`MissingAuthenticationTokenException` case, and Bedrock disagrees — it answers
`AccessDeniedException` with the body `{"Message": "Authorization header is missing"}`, so
the reader gets `InsufficientPermissions`, not `MissingKey`. It is also the only observed
response that spells the body key `Message` rather than `message`, which the schema already
accepts. Nothing observed so far produces `MissingAuthenticationTokenException` at all; the
table entry may be dead weight inherited from the AWS-wide error set, and it is left in
place because a wrong mapping costs more than an unused one.

The remaining six stop reasons stay mapped from the Smithy model alone. `stop_sequence`
is provokable and shares its target (`stop`) with `end_turn`; `content_filtered` and
`guardrail_intervened` need a configured guardrail; the two `malformed_*` reasons need a
model that misbehaves on demand. The `toolChoice` encodings are half covered: the
`{ tool: { name } }` form runs live through `generateObject`, while `{ any: {} }` and
`{ auto: {} }` are stub-only. Image and document `s3Location` sources are untested — they
need a bucket and objects to point at. The 429 -> `RateLimitError` mapping has been seen
in practice (it is why `--no-file-parallelism` exists) but is asserted nowhere, since
provoking it means deliberately exceeding the account's token quota.

`ExpiredTokenException` is the last entry still mapped from documentation alone, and cannot
be provoked on demand: an absent or malformed session token is `UnrecognizedClientException`
("The security token included in the request is invalid"), not an expired one, and the
shortest token STS will issue lives fifteen minutes. Closing it means holding a genuinely
expired token from an earlier session.

Long-lived IAM key pairs remain untested end to end. The no-session-token _signing_ path now
runs — signing without a session token produces a canonical request AWS accepts as far as
key lookup, rather than one rejected as malformed — but every call that reached a model used
a temporary `ASIA…` triple, so no `AKIA…` pair has ever been signed successfully.

Note also that the decoder does not validate CRCs at all — `AmazonBedrockEventStream.ts:54-56`
documents this deliberately, and `test/utils.ts` writes zeroes into both CRC fields. Live
bytes prove nothing about frame integrity; nothing reads those fields. That is defensible
over HTTPS, but it means a truncated or corrupted frame surfaces as a decode error rather
than a checksum failure.

## Not this package

Streaming structured output is a gap in `packages/effect`, not here. `LanguageModel.streamText`
hardcodes `responseFormat: { type: "text" }` and there is no `streamObject` export, so a provider's
`streamText` can never receive a `json` response format. Nothing this provider does can enable it.
