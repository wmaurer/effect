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

Every test in this package stubs the `HttpClient`, so nothing here is evidence about AWS itself.
`packages/ai/amazon-bedrock/test/live/` holds checks that talk to real Bedrock; see its README for
how to run them and why they cannot fire by accident. **That directory is temporary and comes out
before the branch is squashed for the upstream PR** — these gaps are what it exists to close, and
they stay open until a live run reports them green.

**Streaming.** `AmazonBedrockEventStream.ts` hand-rolls the `vnd.amazon.eventstream` framing and
`test/utils.ts` hand-builds the frames the unit tests decode — both from the same reading of the AWS
spec, so a shared misreading passes both. `AmazonBedrockStream.integration.test.ts` decodes bytes
AWS actually produced, covering multi-frame text deltas and a tool call whose input JSON arrives
split across `contentBlockDelta` frames. Reasoning deltas over the stream remain uncovered.

Note that the decoder does not validate CRCs at all — `AmazonBedrockEventStream.ts:54-56` documents
this deliberately, and `test/utils.ts` writes zeroes into both CRC fields. Live bytes therefore
prove nothing about frame integrity; nothing reads those fields. That is defensible over HTTPS, but
it means a truncated or corrupted frame surfaces as a decode error rather than a checksum failure.

**Cache-write disjointness.** The original oracle ran on a call where `cacheWriteInputTokens` was
`0`, so the write term contributed nothing to `9 + 15800 + 0 + 5 = 15814` and the equation held
whether writes were disjoint from `inputTokens` or included in them — only the _read_ side was ever
proven. The cache-point check now asserts the identity over both calls, and gives the cached prefix
a per-run nonce so the first call is always a genuine write rather than a hit on a warm 5-minute
cache from an earlier run.

**Error mapping rests on two observed 403s.** `ExpiredTokenException` and `AccessDeniedException`
were hit by accident and drove the classification in `internal/errors.ts`.
`UnrecognizedClientException`, `InvalidSignatureException` and `MissingAuthenticationTokenException`
are mapped from AWS documentation. Running the live suites with a syntactically valid but fake
access key id does reach AWS and classifies as `InvalidKey` — but three exception shapes map to that
kind, and the run did not capture `x-amzn-errortype`, so it does not pin down which one AWS sent.

**Also unexercised against live AWS:** reasoning, citations, documents, images, the `1h` cache TTL
(only `5m` is pinned and billed), and long-lived IAM key pairs — every live call so far used a
temporary `ASIA…` triple, so the no-session-token path is untested.

## Not this package

Streaming structured output is a gap in `packages/effect`, not here. `LanguageModel.streamText`
hardcodes `responseFormat: { type: "text" }` and there is no `streamObject` export, so a provider's
`streamText` can never receive a `json` response format. Nothing this provider does can enable it.
