---
title: AmazonBedrockSchema.ts
nav_order: 5
parent: Modules
---

## AmazonBedrockSchema.ts overview

The `AmazonBedrockSchema` module defines the text and tool-calling subset of
the Amazon Bedrock Converse API request, response, and streaming event
schemas used by this provider.

**Scope**

This models text and tool use (tool-use / tool-result content blocks and tool
configuration). Images and documents are not modelled here yet,
but the content block and delta unions tolerate (and ignore) non-text members
so decoding never fails on them.

Since v4.0.0

---

## Exports Grouped by Category

- [schemas](#schemas)
  - [CachePointBlock (class)](#cachepointblock-class)
  - [Citation (class)](#citation-class)
  - [CitationLocation](#citationlocation)
  - [CitationTextContent](#citationtextcontent)
  - [CitationsConfig (class)](#citationsconfig-class)
  - [CitationsContentBlock (class)](#citationscontentblock-class)
  - [CitationsDelta (class)](#citationsdelta-class)
  - [ContentBlock](#contentblock)
  - [ContentBlockDelta](#contentblockdelta)
  - [ContentBlockDeltaEvent (class)](#contentblockdeltaevent-class)
  - [ContentBlockStart](#contentblockstart)
  - [ContentBlockStartEvent (class)](#contentblockstartevent-class)
  - [ContentBlockStopEvent (class)](#contentblockstopevent-class)
  - [ConverseMetrics (class)](#conversemetrics-class)
  - [ConverseOutput (class)](#converseoutput-class)
  - [ConverseRequest (class)](#converserequest-class)
  - [ConverseResponse (class)](#converseresponse-class)
  - [ConverseResponseStreamEvent](#converseresponsestreamevent)
  - [ConverseResponseStreamEvent (type alias)](#converseresponsestreamevent-type-alias)
  - [ConverseStreamMetadataEvent (class)](#conversestreammetadataevent-class)
  - [DocumentBlock (class)](#documentblock-class)
  - [DocumentLocation (class)](#documentlocation-class)
  - [DocumentSource](#documentsource)
  - [ImageBlock (class)](#imageblock-class)
  - [InferenceConfiguration (class)](#inferenceconfiguration-class)
  - [IntZeroOrGreater](#intzeroorgreater)
  - [JsonSchemaDefinition](#jsonschemadefinition)
  - [MediaSource](#mediasource)
  - [Message (class)](#message-class)
  - [MessageStartEvent (class)](#messagestartevent-class)
  - [MessageStopEvent (class)](#messagestopevent-class)
  - [OutputConfig](#outputconfig)
  - [OutputFormat](#outputformat)
  - [OutputFormatStructure](#outputformatstructure)
  - [ReasoningContentBlock](#reasoningcontentblock)
  - [ReasoningContentBlockDelta](#reasoningcontentblockdelta)
  - [ReasoningTextBlock (class)](#reasoningtextblock-class)
  - [S3Location (class)](#s3location-class)
  - [StopReason](#stopreason)
  - [StopReason (type alias)](#stopreason-type-alias)
  - [SystemContentBlock](#systemcontentblock)
  - [TokenUsage (class)](#tokenusage-class)
  - [Tool (class)](#tool-class)
  - [ToolChoice](#toolchoice)
  - [ToolChoice (type alias)](#toolchoice-type-alias)
  - [ToolConfiguration (class)](#toolconfiguration-class)
  - [ToolResultBlock (class)](#toolresultblock-class)
  - [ToolSpecification (class)](#toolspecification-class)
  - [ToolUseBlock (class)](#tooluseblock-class)
  - [ToolUseBlockDelta](#tooluseblockdelta)
  - [ToolUseBlockStart](#tooluseblockstart)

---

# schemas

## CachePointBlock (class)

A cache point marking the end of a reusable prefix of a request.

**Details**

Converse caches everything preceding the block rather than the block it is
attached to, so a cache point is its own content block appended after the
content it should cover. `ttl` opts into extended caching; when omitted
Bedrock uses the default lifetime for `type`.

`ttl` uses `optionalKey` rather than `optional`: this block's encoded type is
surfaced through the `Prompt` provider options, whose values must satisfy
`Schema.Json`, and `Json` admits a missing key but not an explicit
`undefined`.

**Signature**

```ts
declare class CachePointBlock
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L160)

Since v4.0.0

## Citation (class)

A reference from generated content back to a source document.

**Signature**

```ts
declare class Citation
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L331)

Since v4.0.0

## CitationLocation

The location a citation points at.

**Details**

AWS models `CitationLocation` as a UNION, so every member is optional. Only
the document members are modelled; `web` and `searchResultLocation` accompany
search results, which this provider cannot send, and decode as undefined.

**Signature**

```ts
declare const CitationLocation: Schema.Struct<{
  readonly documentChar: Schema.optional<typeof DocumentLocation>
  readonly documentPage: Schema.optional<typeof DocumentLocation>
  readonly documentChunk: Schema.optional<typeof DocumentLocation>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L301)

Since v4.0.0

## CitationTextContent

A piece of text attached to a citation.

**Details**

Models `CitationGeneratedContent` (the answer text a citation supports),
`CitationSourceContent` (the source text it was drawn from) and
`CitationSourceContentDelta`, which are all a single optional `text` member.

**Signature**

```ts
declare const CitationTextContent: Schema.Struct<{ readonly text: Schema.optional<Schema.String> }>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L320)

Since v4.0.0

## CitationsConfig (class)

Opts a document into citations.

**Details**

When enabled the model may ground its answer in the document and return
`citationsContent` blocks pointing back at the spans it used.

**Signature**

```ts
declare class CitationsConfig
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L239)

Since v4.0.0

## CitationsContentBlock (class)

Generated content together with the citations backing it.

**Details**

Returned in place of a plain `text` block once any document in the request
has citations enabled, so `content` carries the answer text itself.

**Signature**

```ts
declare class CitationsContentBlock
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L350)

Since v4.0.0

## CitationsDelta (class)

The citation member of a streaming content-block delta.

**Details**

`CitationsDelta` repeats the fields of `Citation`; Converse sends one whole
citation per delta rather than splitting a single citation across several.

**Signature**

```ts
declare class CitationsDelta
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L686)

Since v4.0.0

## ContentBlock

A text content block within a Converse message.

**Details**

AWS models `ContentBlock` as a UNION whose members (`text`, `toolUse`,
`reasoningContent`, ...) are all optional. Every member is optional here so
a block this provider does not model (e.g. `citationsContent`) decodes (as
`{ type: "text" }` with no `text`) instead of failing the whole response;
the language model ignores such blocks.

**Signature**

```ts
declare const ContentBlock: Schema.Struct<{
  readonly type: Schema.withDecodingDefaultKey<Schema.tag<"text">, never>
  readonly text: Schema.optional<Schema.String>
  readonly toolUse: Schema.optional<typeof ToolUseBlock>
  readonly toolResult: Schema.optional<typeof ToolResultBlock>
  readonly reasoningContent: Schema.optional<
    Schema.Struct<{
      readonly reasoningText: Schema.optional<typeof ReasoningTextBlock>
      readonly redactedContent: Schema.optional<Schema.String>
    }>
  >
  readonly image: Schema.optional<typeof ImageBlock>
  readonly document: Schema.optional<typeof DocumentBlock>
  readonly cachePoint: Schema.optional<typeof CachePointBlock>
  readonly citationsContent: Schema.optional<typeof CitationsContentBlock>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L372)

Since v4.0.0

## ContentBlockDelta

A delta within a streaming content block.

**Details**

AWS models `ContentBlockDelta` as a UNION whose members (`text`, `toolUse`,
`reasoningContent`, `citation`, ...) are all optional. Every member is
optional here so a delta this provider does not model (e.g. an image delta)
does not fail the union decode and truncate the stream; the language model
skips such deltas.

**Signature**

```ts
declare const ContentBlockDelta: Schema.Struct<{
  readonly text: Schema.optional<Schema.String>
  readonly toolUse: Schema.optional<Schema.Struct<{ readonly input: Schema.String }>>
  readonly reasoningContent: Schema.optional<
    Schema.Struct<{
      readonly text: Schema.optional<Schema.String>
      readonly signature: Schema.optional<Schema.String>
      readonly redactedContent: Schema.optional<Schema.String>
    }>
  >
  readonly citation: Schema.optional<typeof CitationsDelta>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L708)

Since v4.0.0

## ContentBlockDeltaEvent (class)

A streamed delta event for a content block.

**Signature**

```ts
declare class ContentBlockDeltaEvent
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L722)

Since v4.0.0

## ContentBlockStart

The start of a streaming content block.

**Details**

Like `ContentBlockDelta`, AWS models this as a union of optional members.
Members this provider does not model decode with their keys undefined rather
than failing the union decode and truncating the stream.

**Signature**

```ts
declare const ContentBlockStart: Schema.Struct<{
  readonly toolUse: Schema.optional<Schema.Struct<{ readonly toolUseId: Schema.String; readonly name: Schema.String }>>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L768)

Since v4.0.0

## ContentBlockStartEvent (class)

AWS may emit a `contentBlockStart` frame before a block's deltas (it always
does for tool-use blocks, where `start` carries `toolUse`; text blocks
typically start directly with deltas). The union must accept it or the whole
stream fails to decode.

**Signature**

```ts
declare class ContentBlockStartEvent
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L782)

Since v4.0.0

## ContentBlockStopEvent (class)

A streamed stop event for a content block.

**Signature**

```ts
declare class ContentBlockStopEvent
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L736)

Since v4.0.0

## ConverseMetrics (class)

Metrics about a Converse call.

**Signature**

```ts
declare class ConverseMetrics
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L607)

Since v4.0.0

## ConverseOutput (class)

The output containing the message generated by the model.

**Signature**

```ts
declare class ConverseOutput
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L596)

Since v4.0.0

## ConverseRequest (class)

The request payload for the Converse and ConverseStream operations.

**Details**

`additionalModelRequestFields` carries inference parameters that are specific
to the target model, beyond the base set Converse exposes through
`inferenceConfig`. AWS models it as a free-form document, and it is kept
free-form here: its shape is defined by the model, not by Converse. Extended
thinking on an Anthropic model is enabled through it, and the thinking budget
is drawn from the same ceiling as the visible answer, so
`inferenceConfig.maxTokens` must exceed it. See
`AmazonBedrockLanguageModel.Config` for a worked example.

**Signature**

```ts
declare class ConverseRequest
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L575)

Since v4.0.0

## ConverseResponse (class)

The response from a successful Converse call.

**Signature**

```ts
declare class ConverseResponse
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L618)

Since v4.0.0

## ConverseResponseStreamEvent

The Converse stream event union.

**Details**

Each member is keyed by the AWS event-stream `:event-type` wrapper (e.g.
`{ messageStart: ... }`). A synthetic `type` discriminator is filled on decode
(and omitted on encode) so downstream code can branch on `event.type`.

**Signature**

```ts
declare const ConverseResponseStreamEvent: Schema.Union<
  readonly [
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"messageStart">, never>
      readonly messageStart: typeof MessageStartEvent
    }>,
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"contentBlockStart">, never>
      readonly contentBlockStart: typeof ContentBlockStartEvent
    }>,
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"contentBlockDelta">, never>
      readonly contentBlockDelta: typeof ContentBlockDeltaEvent
    }>,
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"contentBlockStop">, never>
      readonly contentBlockStop: typeof ContentBlockStopEvent
    }>,
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"messageStop">, never>
      readonly messageStop: typeof MessageStopEvent
    }>,
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"metadata">, never>
      readonly metadata: typeof ConverseStreamMetadataEvent
    }>,
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"internalServerException">, never>
      readonly internalServerException: Schema.Struct<{ readonly message: Schema.optional<Schema.String> }>
    }>,
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"modelStreamErrorException">, never>
      readonly modelStreamErrorException: Schema.Struct<{ readonly message: Schema.optional<Schema.String> }>
    }>,
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"serviceUnavailableException">, never>
      readonly serviceUnavailableException: Schema.Struct<{ readonly message: Schema.optional<Schema.String> }>
    }>,
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"throttlingException">, never>
      readonly throttlingException: Schema.Struct<{ readonly message: Schema.optional<Schema.String> }>
    }>,
    Schema.Struct<{
      readonly type: Schema.withDecodingDefaultKey<Schema.tag<"validationException">, never>
      readonly validationException: Schema.Struct<{ readonly message: Schema.optional<Schema.String> }>
    }>
  ]
>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L833)

Since v4.0.0

## ConverseResponseStreamEvent (type alias)

The type of `ConverseResponseStreamEvent`.

**Signature**

```ts
type ConverseResponseStreamEvent = typeof ConverseResponseStreamEvent.Type
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L887)

Since v4.0.0

## ConverseStreamMetadataEvent (class)

The trailing metadata event for a Converse stream, carrying usage and metrics.

**Signature**

```ts
declare class ConverseStreamMetadataEvent
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L809)

Since v4.0.0

## DocumentBlock (class)

A document content block.

**Details**

`name` is required and Bedrock restricts it to alphanumerics, single runs of
whitespace, hyphens, parentheses and square brackets.

`context` is free text telling the model how to interpret the document. AWS
documents it in terms of citations, but the model constrains it neither in
length nor in alphabet and does not tie it to `citations`, so it is sent
whenever it is set.

**Signature**

```ts
declare class DocumentBlock
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L260)

Since v4.0.0

## DocumentLocation (class)

A span within a cited document.

**Details**

Models `DocumentCharLocation`, `DocumentPageLocation` and
`DocumentChunkLocation`, which are structurally identical; the enclosing
`CitationLocation` member says which unit `start` and `end` are counted in.
`documentIndex` indexes the documents sent in the request, in order.

**Signature**

```ts
declare class DocumentLocation
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L282)

Since v4.0.0

## DocumentSource

The source of a document content block.

**Details**

`DocumentSource` is a Smithy union, so every member is optional here. It
adds `text` to the `bytes` / `s3Location` pair `MediaSource` carries: a
textual document travels as a plain string rather than base64, which is
about a quarter smaller on the wire. The union's fourth member, `content`,
is not modelled.

**Signature**

```ts
declare const DocumentSource: Schema.Struct<{
  readonly text: Schema.optional<Schema.String>
  readonly bytes: Schema.optional<Schema.String>
  readonly s3Location: Schema.optional<typeof S3Location>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L210)

Since v4.0.0

## ImageBlock (class)

An image content block.

**Signature**

```ts
declare class ImageBlock
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L222)

Since v4.0.0

## InferenceConfiguration (class)

Base inference parameters to pass to a model in a Converse call.

**Signature**

```ts
declare class InferenceConfiguration
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L420)

Since v4.0.0

## IntZeroOrGreater

A non-negative integer, used for token counts and content block indices.

**Signature**

```ts
declare const IntZeroOrGreater: Schema.Int
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L29)

Since v4.0.0

## JsonSchemaDefinition

A JSON Schema the model's output must conform to.

**Details**

`schema` is the JSON Schema serialized to a string: Converse models it as a
`String`, not a document, and rejects an object here.

**Signature**

```ts
declare const JsonSchemaDefinition: Schema.Struct<{
  readonly schema: Schema.String
  readonly name: Schema.optionalKey<Schema.String>
  readonly description: Schema.optionalKey<Schema.String>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L513)

Since v4.0.0

## MediaSource

The source of an image or document.

**Details**

AWS models `ImageSource` and `DocumentSource` as UNIONs, so both members are
optional here. `bytes` is a Smithy blob, which the JSON protocol carries as a
base64 string.

**Signature**

```ts
declare const MediaSource: Schema.Struct<{
  readonly bytes: Schema.optional<Schema.String>
  readonly s3Location: Schema.optional<typeof S3Location>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L190)

Since v4.0.0

## Message (class)

A message within a Converse conversation.

**Signature**

```ts
declare class Message
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L391)

Since v4.0.0

## MessageStartEvent (class)

The start of a streamed message.

**Signature**

```ts
declare class MessageStartEvent
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L636)

Since v4.0.0

## MessageStopEvent (class)

The stop event for a streamed message.

**Signature**

```ts
declare class MessageStopEvent
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L796)

Since v4.0.0

## OutputConfig

Output configuration for a Converse request: native structured output
(`textFormat`) and the model's effort level (`effort`, one of `low`,
`medium`, `high`, `xhigh` or `max` on the models that accept it).

**Signature**

```ts
declare const OutputConfig: Schema.Struct<{
  readonly textFormat: Schema.optionalKey<
    Schema.Struct<{
      readonly type: Schema.Literal<"json_schema">
      readonly structure: Schema.Struct<{
        readonly jsonSchema: Schema.Struct<{
          readonly schema: Schema.String
          readonly name: Schema.optionalKey<Schema.String>
          readonly description: Schema.optionalKey<Schema.String>
        }>
      }>
    }>
  >
  readonly effort: Schema.optionalKey<Schema.String>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L552)

Since v4.0.0

## OutputFormat

Structured output parameters for a Converse request.

**Signature**

```ts
declare const OutputFormat: Schema.Struct<{
  readonly type: Schema.Literal<"json_schema">
  readonly structure: Schema.Struct<{
    readonly jsonSchema: Schema.Struct<{
      readonly schema: Schema.String
      readonly name: Schema.optionalKey<Schema.String>
      readonly description: Schema.optionalKey<Schema.String>
    }>
  }>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L538)

Since v4.0.0

## OutputFormatStructure

The structure the model's output must adhere to. A union on the wire whose
only member today is `jsonSchema`.

**Signature**

```ts
declare const OutputFormatStructure: Schema.Struct<{
  readonly jsonSchema: Schema.Struct<{
    readonly schema: Schema.String
    readonly name: Schema.optionalKey<Schema.String>
    readonly description: Schema.optionalKey<Schema.String>
  }>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L527)

Since v4.0.0

## ReasoningContentBlock

A reasoning content block.

**Details**

AWS models `ReasoningContentBlock` as a UNION of `reasoningText` and
`redactedContent`, so both members are optional here. `redactedContent` is a
Smithy blob, which the JSON protocol carries as a base64 string; it is kept
as that string so it round-trips untouched.

**Signature**

```ts
declare const ReasoningContentBlock: Schema.Struct<{
  readonly reasoningText: Schema.optional<typeof ReasoningTextBlock>
  readonly redactedContent: Schema.optional<Schema.String>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L136)

Since v4.0.0

## ReasoningContentBlockDelta

The reasoning-content member of a streaming content-block delta.

**Details**

AWS models `ReasoningContentBlockDelta` as a UNION of `text`, `signature`,
and `redactedContent`, so every member is optional. The signature arrives in
its own delta after the text deltas, once the model has finished reasoning.

**Signature**

```ts
declare const ReasoningContentBlockDelta: Schema.Struct<{
  readonly text: Schema.optional<Schema.String>
  readonly signature: Schema.optional<Schema.String>
  readonly redactedContent: Schema.optional<Schema.String>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L668)

Since v4.0.0

## ReasoningTextBlock (class)

The reasoning text produced by a model, with the token that verifies the
model generated it.

**Details**

`signature` must be echoed back unmodified alongside the text when the block
is sent in a later turn, or Bedrock rejects the request.

**Signature**

```ts
declare class ReasoningTextBlock
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L117)

Since v4.0.0

## S3Location (class)

The location of an object in an Amazon S3 bucket.

**Signature**

```ts
declare class S3Location
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L172)

Since v4.0.0

## StopReason

The reason the model stopped generating a response.

**Signature**

```ts
declare const StopReason: Schema.Literals<
  readonly [
    "end_turn",
    "tool_use",
    "max_tokens",
    "stop_sequence",
    "guardrail_intervened",
    "content_filtered",
    "malformed_model_output",
    "malformed_tool_use",
    "model_context_window_exceeded"
  ]
>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L38)

Since v4.0.0

## StopReason (type alias)

The type of `StopReason`.

**Signature**

```ts
type StopReason = typeof StopReason.Type
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L57)

Since v4.0.0

## SystemContentBlock

A system content block.

**Details**

AWS models `SystemContentBlock` as a UNION, so both members are optional; a
block carries either the system text or a cache point.

**Signature**

```ts
declare const SystemContentBlock: Schema.Struct<{
  readonly text: Schema.optional<Schema.String>
  readonly cachePoint: Schema.optional<typeof CachePointBlock>
}>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L408)

Since v4.0.0

## TokenUsage (class)

Token usage statistics returned by the Converse API.

**Signature**

```ts
declare class TokenUsage
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L66)

Since v4.0.0

## Tool (class)

A tool entry within a `ToolConfiguration`.

**Details**

Converse models this as a union: an entry is either a `toolSpec` describing a
callable tool, or a `cachePoint` marking the end of the cacheable prefix of
the tool list. Like every AWS union in this module, it is modelled as a
struct whose members are all optional.

The union's third member, `systemTool`, selects a Bedrock-hosted tool this
provider cannot invoke, and is not modelled.

**Signature**

```ts
declare class Tool
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L461)

Since v4.0.0

## ToolChoice

Controls how the model selects a tool: let it decide (`auto`), force any tool
(`any`), or force a specific tool (`tool`).

**Signature**

```ts
declare const ToolChoice: Schema.Union<
  readonly [
    Schema.Struct<{ readonly auto: Schema.Struct<{}> }>,
    Schema.Struct<{ readonly any: Schema.Struct<{}> }>,
    Schema.Struct<{ readonly tool: Schema.Struct<{ readonly name: Schema.String }> }>
  ]
>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L474)

Since v4.0.0

## ToolChoice (type alias)

The type of `ToolChoice`.

**Signature**

```ts
type ToolChoice = typeof ToolChoice.Type
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L487)

Since v4.0.0

## ToolConfiguration (class)

The tool configuration for a Converse request.

**Signature**

```ts
declare class ToolConfiguration
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L496)

Since v4.0.0

## ToolResultBlock (class)

A tool-result content block: the outcome of a tool invocation fed back to the
model. Content is text-only in this provider.

**Signature**

```ts
declare class ToolResultBlock
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L99)

Since v4.0.0

## ToolSpecification (class)

The JSON Schema specification of a tool the model may call.

**Signature**

```ts
declare class ToolSpecification
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L436)

Since v4.0.0

## ToolUseBlock (class)

A tool-use content block: the model's request to invoke a tool.

**Signature**

```ts
declare class ToolUseBlock
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L85)

Since v4.0.0

## ToolUseBlockDelta

The tool-use member of a streaming content-block delta. Bedrock streams tool
arguments as a partial JSON string that the consumer accumulates across
deltas and parses once the block stops.

**Signature**

```ts
declare const ToolUseBlockDelta: Schema.Struct<{ readonly input: Schema.String }>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L651)

Since v4.0.0

## ToolUseBlockStart

The tool-use member of a streaming content-block start. Carries the call id
and tool name; the arguments arrive as `toolUse` deltas.

**Signature**

```ts
declare const ToolUseBlockStart: Schema.Struct<{ readonly toolUseId: Schema.String; readonly name: Schema.String }>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts#L750)

Since v4.0.0
