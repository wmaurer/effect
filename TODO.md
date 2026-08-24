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

`smoke-bedrock.ts` is the only thing that has ever run against real AWS: four billed calls, one
account, one region (`eu-west-1`), one model (`eu.anthropic.claude-sonnet-4-5-20250929-v1:0`), one
run. It proved the non-streaming happy path end to end, and proved `cachePoint` reaches Bedrock in
a position Bedrock honours. Everything below is covered by unit tests only.

**Streaming has no live coverage at all.** `AmazonBedrockEventStream.ts` — the hand-rolled
`vnd.amazon.eventstream` codec, prelude framing, header parsing, the CRC checks — plus streaming
tool calls and reasoning deltas. This is the most fragile surface in the package and the one where
unit tests prove the least, because the test frames were authored from the same reading of the spec
as the parser. A `ConverseStream` smoke check is the highest-value thing to add.

**Cache-write disjointness is inferred, not observed.** The oracle ran on a call where
`cacheWriteInputTokens` was `0`, so the write term contributed nothing to `9 + 15800 + 0 + 5 =
15814`. That equation matches whether writes are disjoint from `inputTokens` or included in them —
only the _read_ side is proven. `smoke-bedrock.ts` captures raw usage for every call in `rawUsages`
but runs the oracle over the last one only; running it over the first (cache-writing) call too
would close this.

**Error mapping rests on two observed 403s.** `ExpiredTokenException` and `AccessDeniedException`
were hit by accident and drove the classification in `internal/errors.ts`.
`UnrecognizedClientException`, `InvalidSignatureException` and `MissingAuthenticationTokenException`
are mapped from AWS documentation and have never been reproduced.

**Also unexercised against live AWS:** reasoning, citations, documents, images, the `1h` cache TTL
(only `5m` was pinned and billed), and long-lived IAM key pairs — every call so far used a
temporary `ASIA…` triple, so the no-session-token path is untested.

## Not this package

Streaming structured output is a gap in `packages/effect`, not here. `LanguageModel.streamText`
hardcodes `responseFormat: { type: "text" }` and there is no `streamObject` export, so a provider's
`streamText` can never receive a `json` response format. Nothing this provider does can enable it.
