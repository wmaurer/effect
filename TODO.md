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

## `DocumentSource.content` and `DocumentBlock.context`

`bytes`, `s3Location` and `text` are modelled; `content` is not. It carries a document as a list of
pre-chunked `{ text }` blocks, and it is what makes chunk-granular citations meaningful:
`DocumentChunkLocation.start` and `.end` are chunk indices, so a `documentChunk` citation has
nothing to index into unless the request supplied chunks. `Prompt.FilePart` carries a single `data`
and cannot express "this document is these five sections", so modelling it means a new
`amazonBedrock` file-part option carrying document payload rather than configuration — the first
option in this repo to do so. That is the decision to make before implementing it. `DocumentBlock`
also carries a `context` field ("contextual information about how the document should be processed
or interpreted by the model when generating citations") which is likewise unmodelled.

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

## Not this package

Streaming structured output is a gap in `packages/effect`, not here. `LanguageModel.streamText`
hardcodes `responseFormat: { type: "text" }` and there is no `streamObject` export, so a provider's
`streamText` can never receive a `json` response format. Nothing this provider does can enable it.
