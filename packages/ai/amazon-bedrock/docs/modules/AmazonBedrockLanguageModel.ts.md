---
title: AmazonBedrockLanguageModel.ts
nav_order: 4
parent: Modules
---

## AmazonBedrockLanguageModel.ts overview

The `AmazonBedrockLanguageModel` module maps the Effect AI `LanguageModel`
abstraction onto Amazon Bedrock's Converse API.

**Scope**

Text, tool calling, and tool-result messages are supported in both the
streaming and non-streaming paths. Structured output is supported for
non-streaming requests via Converse's native `outputConfig.textFormat`
json_schema mode, where it can be combined with the caller's own tools. On
models without native support (detected from the model id, overridable with
`Config.structuredOutputs`), and on any model when the prompt holds tool
calls but the request offers no tools, the object is asked for through a
tool instead: forced where the model accepts a forced `toolChoice`
(overridable with `Config.forcedToolChoice`), and otherwise left unforced
with an instruction to call it. Reasoning is surfaced on both paths, and
reasoning blocks round-trip into later turns when they carry the Bedrock
signature. Image and document file parts are converted into Converse
`image` / `document` blocks; a media type Converse does not accept fails
loudly with `AiError.InvalidUserInputError` rather than silently dropping
content. Prompt caching is opt-in per message or per part via provider
options. Citations are opt-in per document, and the citation blocks and
deltas Converse returns are surfaced as document source parts.

Since v4.0.0

---

## Exports Grouped by Category

- [configuration](#configuration)
  - [Config (class)](#config-class)
  - [withConfigOverride](#withconfigoverride)
- [constructors](#constructors)
  - [make](#make)
  - [model](#model)
- [layers](#layers)
  - [layer](#layer)
- [models](#models)
  - [CachePoint (type alias)](#cachepoint-type-alias)
  - [Citations (type alias)](#citations-type-alias)
  - [Model (type alias)](#model-type-alias)
  - [ReasoningInfo (type alias)](#reasoninginfo-type-alias)
- [services](#services)
  - [ToolCachePoint](#toolcachepoint)

---

# configuration

## Config (class)

Per-request configuration for the Amazon Bedrock language model.

**Details**

Derived from `ConverseRequest`, minus the fields built from the prompt, so
every Converse request parameter is settable per request. That includes
`additionalModelRequestFields`, which carries inference parameters specific
to the target model — among them extended thinking on Anthropic models. The
thinking budget is drawn from the same ceiling as the visible answer, so
`inferenceConfig.maxTokens` must exceed `budget_tokens`.

**Example** (Enabling extended thinking for one request)

```ts
import { AmazonBedrockLanguageModel } from "@effect/ai-amazon-bedrock"
import { LanguageModel } from "effect/ai"

const answer = LanguageModel.generateText({
  prompt: "How many r's are in strawberry?"
}).pipe(
  AmazonBedrockLanguageModel.withConfigOverride({
    additionalModelRequestFields: {
      thinking: { type: "enabled", budget_tokens: 1024 }
    },
    inferenceConfig: { maxTokens: 4096 }
  })
)
```

**Signature**

```ts
declare class Config
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockLanguageModel.ts#L530)

Since v4.0.0

## withConfigOverride

Provides config overrides for Amazon Bedrock language model operations.

**Signature**

```ts
declare const withConfigOverride: {
  (overrides: typeof Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>
}
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockLanguageModel.ts#L760)

Since v4.0.0

# constructors

## make

Creates an Amazon Bedrock `LanguageModel` service from a model identifier and
optional request defaults.

**Signature**

```ts
declare const make: (args_0: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<typeof Config.Service, "modelId"> | undefined
}) => Effect.Effect<LanguageModel.LanguageModel, never, AmazonBedrockClient>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockLanguageModel.ts#L617)

Since v4.0.0

## model

Creates an Amazon Bedrock model descriptor that can be provided with
`Effect.provide`.

**Signature**

```ts
declare const model: (
  model: (string & {}) | Model,
  config?: Omit<typeof Config.Service, "modelId">
) => AiModel.Model<"amazon-bedrock", LanguageModel.LanguageModel, AmazonBedrockClient>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockLanguageModel.ts#L603)

Since v4.0.0

# layers

## layer

Creates a layer for the Amazon Bedrock language model.

**Signature**

```ts
declare const layer: (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<typeof Config.Service, "modelId"> | undefined
}) => Layer.Layer<LanguageModel.LanguageModel, never, AmazonBedrockClient>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockLanguageModel.ts#L747)

Since v4.0.0

# models

## CachePoint (type alias)

A request to cache everything preceding a message or part.

**Details**

Converse caches a prefix of the request rather than an individual block, so
this becomes a `cachePoint` block appended after the content it covers.
Omitting `ttl` leaves the cache lifetime to Bedrock.

**Signature**

```ts
type CachePoint = typeof CachePointBlock.Encoded
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockLanguageModel.ts#L97)

Since v4.0.0

## Citations (type alias)

Requests that a document be citable.

**Signature**

```ts
type Citations = typeof CitationsConfig.Encoded
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockLanguageModel.ts#L247)

Since v4.0.0

## Model (type alias)

A Bedrock model identifier or cross-region inference profile id (e.g.
`us.anthropic.claude-sonnet-4-5-20250929-v1:0`).

**Signature**

```ts
type Model = string & {}
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockLanguageModel.ts#L78)

Since v4.0.0

## ReasoningInfo (type alias)

The Bedrock-side identity of a reasoning block.

**Details**

Converse returns reasoning either as text plus a `signature` that proves the
model produced it, or as an opaque `redactedContent` blob (base64) when the
provider's safety systems encrypted it. Either way the payload must be echoed
back unmodified for the block to be accepted in a later turn, so it is
carried on the part's provider metadata rather than reconstructed.

**Signature**

```ts
type ReasoningInfo =
  | {
      readonly type: "reasoningText"
      /**
       * A token verifying that the reasoning text was generated by the model, or
       * `null` when the model did not supply one.
       */
      readonly signature: string | null
    }
  | {
      readonly type: "redactedContent"
      /**
       * Reasoning encrypted by the model provider, as the base64 string Bedrock
       * uses to carry the underlying blob over JSON.
       */
      readonly redactedContent: string
    }
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockLanguageModel.ts#L408)

Since v4.0.0

# services

## ToolCachePoint

Marks a tool as the end of the cacheable prefix of the tool list.

**Details**

Converse caches everything preceding a cache point, so annotating a tool
caches that tool and every tool declared before it. Annotate the last tool to
cache the whole list, or the last stable one and declare volatile tools after
it. Omitting `ttl` leaves the cache lifetime to Bedrock. Bedrock also limits
how many cache checkpoints a single request may carry across `system`,
`messages`, and `tools` combined, so annotate the tool at the end of the
cacheable prefix rather than every tool in the toolkit.

**Example** (Caching a tool definition)

```ts
import { AmazonBedrockLanguageModel } from "@effect/ai-amazon-bedrock"
import { Schema } from "effect"
import { Tool } from "effect/ai"

const search = Tool.make("search", {
  parameters: Schema.Struct({ query: Schema.String })
}).annotate(AmazonBedrockLanguageModel.ToolCachePoint, { type: "default" })
```

**Signature**

```ts
declare const ToolCachePoint: Context.Reference<
  { readonly type: "default"; readonly ttl?: "5m" | "1h" | undefined } | undefined
>
```

[Source](https://github.com/Effect-TS/effect/tree/main/packages/ai/amazon-bedrock/src/AmazonBedrockLanguageModel.ts#L128)

Since v4.0.0
