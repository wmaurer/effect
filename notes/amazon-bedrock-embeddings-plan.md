# Amazon Bedrock embeddings: plan for the upstream PR

Written 2026-11-15. Planning only, no code yet. Follows section 4 of
`notes/amazon-bedrock-upstream-gap.md`.

## Goal

Add `AmazonBedrockEmbeddingModel` to `packages/ai/amazon-bedrock` in `Effect-TS/effect`, in the
shape the maintainers would write, so the PR merges with no changes from tim-smart or effect-bot.

The port is not a copy of my lib. My lib has about 550 src and 900 test lines for embeddings.
The plan has about 210 src and 190 test lines.

## How the plan was made

- Compared my lib's `AmazonBedrockEmbeddingModel.ts` and `internal/embeddings.ts` with upstream
  `OpenAiEmbeddingModel` (openai and openai-compat), `AmazonBedrockClient`, and `EmbeddingModel`.
- Q2 (concurrency): a search of the PR corpus in `~/projects/code-principles/corpus`.
- Q1 and Q3: an architect arena with two candidate designs (opus and sonnet) and a sonnet
  cross-judge. Base: the opus candidate (24 to 23), with two grafts from the sonnet one.
- A cut pass with the rules of the `effect-pr-review` skill, run by a fresh reviewer. Accepted 11
  of 13 findings.

## Evidence that drives the design

- #9980 replaced my lib's model table for `generateObject` with an explicit
  `structuredOutputs: true` flag. Upstream `AmazonBedrockLanguageModel.Model` is `string`
  (`AmazonBedrockLanguageModel.ts:70`). So no logic keyed on model ids.
- `OpenAiClient.createEmbedding` shows that each operation is a client method. `service.client`
  skips `AmazonBedrockConfig.transformClient`, so the embedding model cannot use it.
- `OpenAiClient.createResponse` (`OpenAiClient.ts:67`) and `AnthropicClient.createMessage`
  (`AnthropicClient.ts:64`) return `[body, response]`. `AnthropicClient.streamRequest`
  (`AnthropicClient.ts:53`) takes the schema first.
- In #8862 effect-bot's commit 7f962fbd removed `MAX_CONCURRENT_REQUESTS = 64` and a shared
  `Semaphore` from `McpClient`. That is the same pattern as my lib's `makeResolved`.
- tim-smart's v4 spec for `EmbeddingModel` (`.specs/ai-embedding-model.md` at 342fc4b051):
  "Keep the provider API minimal: batch inputs in, vectors out". v3's `maxBatchSize` and
  `concurrency` options were not brought back.
- `EmbeddingModel.make` groups all concurrent `embed` calls into one `embedMany` with no size cap
  (`EmbeddingModel.ts:239-254`). It already checks the total vector count
  (`EmbeddingModel.ts:294`).
- No Effect AI provider has live tests. All tests use a fake `HttpClient`.
- OpenAI reads usage from the body (`usage.prompt_tokens`). Cohere on Bedrock has no token count in
  the body. Only the `x-amzn-bedrock-input-token-count` header has it.

## Design

### Usage

```ts
const Embeddings = AmazonBedrockEmbeddingModel.model("eu.cohere.embed-v4:0", {
  family: "cohere-embed-v4",
  dimensions: 1024,
  config: { input_type: "search_document" }
})

const query = EmbeddingModel.EmbeddingModel.pipe(
  Effect.flatMap((model) => model.embed("what is bedrock?")),
  AmazonBedrockEmbeddingModel.withConfigOverride({ input_type: "search_query" })
)
```

### Client (Q3)

`AmazonBedrockClient.Service` gets one new method:

```ts
readonly invokeModel: <S extends Schema.Decoder<unknown>>(
  schema: S
) => (request: { readonly modelId: string; readonly body: unknown }) => Effect.Effect<
  readonly [body: S["Type"], response: HttpClientResponse.HttpClientResponse],
  AiError.AiError
>
```

- The private `execute` takes `(operation, method, modelId, body)` and gets the operation
  `"invoke"`. `converse` and `converseStream` split off `modelId` themselves. About 6 changed
  lines.
- Same path as `converse`: `AmazonBedrockConfig.transformClient`, credentials,
  `mapHttpClientError` and `mapSchemaError` with method `"invokeModel"`, `withRedactedHeaders`.
- The module doc and the `Service` doc mention InvokeModel next to Converse.
- About +28 lines.

### Embedding model (Q1)

- `Model = string`. The id is never parsed.
- `Family = "titan-embed-text-v2" | "cohere-embed-v3" | "cohere-embed-v4"`, required on `model`,
  `make` and `layer`.
- `Config` as in OpenAI: AWS field names, `dimensions` inside it, and an index signature
  `[x: string]: unknown`. No `Simplify<>`. No settings check: Bedrock rejects bad fields itself.
- `model(id, { family, dimensions, config })` writes `dimensions` into the config and provides
  `EmbeddingModel.Dimensions`. `layer` provides only `EmbeddingModel`.
- `batchKey: [Config, AmazonBedrockConfig]`. `withConfigOverride` is the OpenAI dual.
- The config is read with `makeConfig = Effect.contextWith(...)`, built once in `make`
  (`OpenAiEmbeddingModel.ts:143`).
- One private row per family, `{ textsPerRequest, body }`, typed `{ readonly [F in Family]: Row }`
  so a missing row fails `tsc`:
  - Titan: 1 text. Body `{ ...config, inputText }`.
  - Cohere v3: 96 texts. Body `{ ...config without dimensions, texts }`.
  - Cohere v4: 96 texts. Body `{ ...config without dimensions, output_dimension: dimensions, texts }`.
- One response decoder, built once in `make`: `{ embedding }` or
  `{ embeddings: number[][] | { float: number[][] } }`, plus one `vectors(body)` function. No
  `embedding_types` in the request.
- `embedMany`: `Effect.forEach(Arr.chunksOf(inputs, row.textsPerRequest), send, { concurrency: <fixed constant> })`.
  No public option and no `Semaphore` (Q2). One JSDoc Gotchas sentence points to
  `withClientTransform` plus `HttpClient.withRateLimiter`.
- Usage: the sum of the token-count headers, or `undefined` when one is missing. Inline
  `header === undefined ? undefined : Number(header)`.
- No count check in the provider. Core does it.
- The module doc is one paragraph, as in `OpenAiEmbeddingModel.ts:1-10`. The reasons go in the PR
  text.
- `@since 4.1.5` everywhere, the version the module first ships in. Bump it if 4.1.5 ships first.
  - `@effect/ai-amazon-bedrock` first shipped in 4.1.4 (npm, 2026-11-11; the 0.x versions are the
    v3 package). But its modules say `@since 4.0.0`, as #9980 wrote them.
  - The rest of the repo uses the shipping version: `AnthropicTool.DeferLoading` has
    `@since 4.1.2`, and main already has 93 `@since 4.1.5` tags while the packages are at 4.1.4.
  - So 4.1.5 follows the repo rule but differs from the package's own files. Check again at PR
    time.
- About 180 lines.

### Why Cohere splits at 96

Core groups all concurrent `embed` calls into one `embedMany`. Without the split,
`Effect.forEach(docs, embed)` over 97 documents fails. OpenAI has the same gap at 2,048 inputs,
where it is rare. The split costs nothing, because Titan already goes through `Arr.chunksOf` with
size 1.

### Tests (one new file, 5 tests)

1. `model` provides `Dimensions`, sends it as `output_dimension` to v4, and decodes the `{ float }`
   shape.
2. Titan sends one request per text, in order, and sums the header token counts.
3. Cohere v3 with 97 texts sends 96 and 1, decodes the array shape, and sends no
   `output_dimension`.
4. `withConfigOverride` wins over the layer config.
5. Concurrent `embed` calls with different `input_type` values share no request.

About 190 lines. No `.types.ts` file, no internal unit tests, no live suite.

### Other files

- `index.ts`: run `pnpm codegen` (`@barrel`).
- README: the intro line also names `EmbeddingModel`, plus one Features bullet. No new usage
  section.
- One changeset, `patch`: "Add `AmazonBedrockEmbeddingModel` for Amazon Titan Text Embeddings V2
  and Cohere Embed v3 and v4."

## What is not ported from my lib

- Detecting the family from the model id, geo prefixes and ARN parsing.
- The `concurrency` option and the shared `Semaphore`.
- `checkSettings` and its rules table.
- `checkPart`: the length and finite checks. `Schema.Finite` and core's count check cover them.
- `InvokeModelResult` with `inputTokens`.
- The `.types.ts` files, `test/internal/embeddings.test.ts`, the live suite, and the test matrices.

These stay in my lib.

## PR text

- Template headings, simple B2 English, no mention of Claude.
- Alternatives considered (3): detecting the family from the id, `invokeModel` returning
  `{ body, inputTokens }`, one Cohere request with no split.
- Testing: the 5 tests, plus one sentence that I ran the code against real Bedrock in eu-west-1
  with my lib's live suite.
- Mention that #9980 listed an embedding model as a follow-up.

## Open risks

- The required `family` option. A maintainer may prefer detection from the id, or a Titan-only
  PR.
- The value of the fixed concurrency constant ("why 5?"). The fallback is `"unbounded"`.
- Usage from a header is new upstream. Headers are read today only for errors. The fallback is the
  Titan body count, with `undefined` for Cohere.
- `HttpClientResponse` in `Service.invokeModel`.
- `@since 4.1.5` differs from the `@since 4.0.0` of the package's existing modules. A maintainer
  may ask for one or the other.

## Before writing code

- Check live, with my lib's live suite: the Cohere v3 response shape, the 96 limit, and the token
  header on every family.
- Type-check the single response decoder.
- Optional: open a short issue first that asks which #9980 follow-ups they would accept.

## Design files

The arena candidates, the cross-judge rubric and the synthesis were in the session scratchpad,
`arena-bedrock-embed/`. They are not saved here. This note is the result.
