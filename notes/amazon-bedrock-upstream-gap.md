# Amazon Bedrock: upstream vs `@wmaurer/effect-ai-amazon-bedrock`

Written 2026-11-14.

- Upstream: `packages/ai/amazon-bedrock` in `Effect-TS/effect`, added by
  [#9980](https://github.com/Effect-TS/effect/pull/9980) (merged 2026-11-10, released in 4.1.4).
- Mine: `~/projects/wmaurer/effect-ai-amazon-bedrock`, last commit 2026-10-26.

## The key fact

The #9980 description says these were **left out on purpose, for follow-ups**:

> guardrails (`guardContent`, trace parsing), citations, S3 sources, tool-definition cache
> points, credential refresh caching, an embedding model.

So for these six, the Effect team already expects a follow-up PR. A PR for one of them is a
fair test of whether they accept features they do not use themselves.

## 1. What my lib has and upstream does not

| Feature | My lib | Upstream |
| --- | --- | --- |
| Embeddings (`AmazonBedrockEmbeddingModel`, Titan etc.) | yes, with a live suite | none |
| Citations: document `citations` option, `source` parts in the response | yes | none |
| Document `context` option | yes | none |
| S3 sources (`s3://` for images and documents) | yes | rejects every URL |
| Text documents sent as a `text` source when citations are on | yes | always bytes |
| Tool-definition caching (`ToolCachePoint` annotation) | yes | none, but the wire schema already has `Tool.cachePoint` |
| Guardrails, full: `guardContent` on text, system and image parts, `qualifiers`; `stopReason`, `guardrail` and `trace` in the finish metadata; `ContentPolicyError` from `generateObject` | yes | only passes `guardrailConfig` through and puts `stopReason` in the metadata |
| Credential provider with caching: refresh 5 minutes before expiry, single-flight, keeps the last credentials if the provider fails, `forceRefresh` after an auth error | yes | a plain `credentials` effect; the README tells users to wrap it in `Effect.cachedWithTTL` |
| Per-model `generateObject` path (native output, forced tool, or unforced tool, chosen from the model ID, plus a `forcedToolChoice` override) | yes | forced tool by default; native output only with `structuredOutputs: true` |
| Fable data-retention hint on the error | yes | none |
| `invokeModel` on the client | yes | upstream has `service.client` instead |

About the `generateObject` row: Llama, Palmyra, and Opus/Sonnet 5.5 reject a forced tool, so on
upstream they fail on the default path.

### Where upstream is ahead

- It checks the CRC of each event-stream frame. My lib does not.
- It sends `status: "error"` on a failed tool result. This is my open issue #11.

### What both have

`data:` URL stripping, model-ID encoding in the path, `ServiceQuotaExceededException` mapping,
the check for tool history without tools, `outputConfig.effort`, and the `gen_ai.*` span
attributes.

## 2. What my lib plans (open issues)

None of these are in upstream either.

- #10 `Tool.dynamic` tools
- #12 move system messages from the history into the `system` field
- #15 `additionalModelResponseFieldPaths` and `additionalModelResponseFields`
- #16 `promptVariables`, `requestMetadata`, `performanceConfig`, `serviceTier`
- #17 the `ApplyGuardrail` operation
- #18 video blocks
- #19 pre-chunked documents (`DocumentSource.content`)
- #20 the `error` field of an image block
- #21 AWS request ID and exception type on responses and errors
- #23 `ToolSpecification.strict` for tools with `Tool.Strict`
- #25 an option for the name of a document block
- #26 raw usage and `cacheDetails` in the finish metadata
- #34 test the `gen_ai.*` attributes of a successful `generateObject` span
- #35 keep the stop reason on the `streamText` span when the stream fails before metadata
- #37 keep the reason of a rejected fetch in the `NetworkError` description

These issues look stale:

- #14 embeddings and #36 model-ID encoding: commits in my lib seem to have done them. Check and
  close.
- #11 tool result status: upstream has it, so only my lib is missing it.

## 3. Tool-definition cache points: dropped as the first PR (2026-11-14)

Decision: do not start with this PR. Start with embeddings (section 4).

Why:

- It is low-value. Bedrock builds the cache prefix in the order `tools` → `system` →
  `messages`, and a cache point caches everything before it. So a cache point on the system
  message already caches all tool definitions. A cache point on a tool only helps when the
  system prompt changes between requests but the tools do not, or to cache stable tools before
  ones that change.
  ([Bedrock prompt caching guide](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html):
  "Cache checkpoints are processed in this order: `tools` → `system` → `messages`." and
  "modifying `tools` invalidates the `system` and `messages` caches".)
- Only Claude models accept a cache point in `tools`. Nova accepts them only in `system` and
  `messages`.
- Bedrock now has automatic caching, which uses one of the 4 checkpoint slots per request.
- It is a weak test. A tiny, safe change is easy to accept, so a "yes" says little about
  citations or embeddings. A maintainer can also fairly say "put a cache point on the system
  message".
- My design doc says tool definitions "cannot be cached at all". That is too strong: they
  cannot be cached on their own, apart from the system prompt.

Other providers: none has tool cache points. Anthropic's API has `cache_control` on tools
(`Generated.BetaTool`), but the Effect provider never sets it, and no issue or PR asked for it.
The pattern is accepted, though: `AnthropicTool.DeferLoading` (#10273) is a provider tool
annotation built the same way (`Context.Reference`, read in `prepareTools`).

Keep it for later, maybe in a wider prompt-caching PR. The original reasons and details follow.

Original reasons:

- It is on the #9980 follow-up list, so it is not a feature they never wanted.
- It is tiny. Upstream `AmazonBedrockSchema.Tool` already has `cachePoint`
  (`packages/ai/amazon-bedrock/src/AmazonBedrockSchema.ts:335`). The missing parts are:
  - a `Context.Reference` annotation, `ToolCachePoint`, about 10 lines (my lib:
    `packages/amazon-bedrock/src/AmazonBedrockLanguageModel.ts:142`)
  - in `prepareTools`, add `{ cachePoint }` after each annotated tool's `{ toolSpec }`
  - 2–3 request-capture tests, ported from my lib's
    `packages/amazon-bedrock/test/AmazonBedrockLanguageModel.test.ts:352` and `:847`
  - a one-line "Add …" changeset
  - a short line in the upstream README "Features" list
- It touches nothing else. Requests from tools without the annotation stay the same.
- It is proven live. My 5m and 1h cache runs checked it against real Bedrock.

Details to keep:

- Converse rejects a `tools` array that holds only cache points. Any check that decides whether
  to send `toolConfig` must count tool specs, not array entries.
- Upstream uses the provider key `"amazon-bedrock"`; my lib uses `amazonBedrock`. Follow
  upstream names and the `@effect/ai-amazon-bedrock/...` identifier prefix.
- My design record: `docs/design/2026-08-19-bedrock-tool-definition-caching-design.md` and the
  plan next to it, in my lib's repository.

## 4. Order of PRs (changed 2026-11-14)

1. Embeddings: the clearest gap (upstream has no embedding model), the most useful to users,
   and on the #9980 follow-up list. Start here.
2. Citations: medium size.
3. Document `context`: a small option.

Optional cheap test before or next to the embeddings PR: a short issue that lists the #9980
follow-ups, says I have working, live-tested code for embeddings, citations, and S3 sources,
and asks which ones they would accept as PRs.

Leave for later: the `generateObject` model table and credential caching. Upstream chose a
simpler design on purpose for both, so a PR there argues against their design.

## Rules for PRs to Effect

- Simple B2 English in PR text, issues, and replies.
- PR branches are shared: maintainer agents may push to them. Pull first, never force-push.
- Run root `pnpm check`, `pnpm lint-fix`, and targeted `pnpm test --run <file>`.
- Use the PR template, minimal tests, one short changeset.
