# CLAUDE.md

General repo rules live in [AGENTS.md](AGENTS.md) (symlink to `.agents/AGENTS.md`) — read that first.
This file only documents the **local upstream source checkouts** under `.repos/`.

## Why this exists

`.repos/` holds real upstream source, cloned locally by `scripts/repos.js` (config: `repos.config.js`).
Read it instead of guessing at AWS wire formats or recalling APIs from memory.

`.repos/` is git-ignored **and** hidden, so ripgrep / glob tooling skips it by default. Pass the path
explicitly and disable the ignore rules:

```sh
rg --hidden --no-ignore 'ConverseStream' .repos/refs/api-models-aws
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm refs:fetch` | Clone/refresh every reference repo to its branch tip |
| `pnpm deps:fetch` | Clone/checkout every dependency repo at the pinned version |
| `pnpm deps:check` | Offline check — fails if a dep checkout drifted from its pin |

## References (`.repos/refs/`)

Read for prior art and API shapes. Not built against, so they track the branch tip — newer is
strictly better.

| Name | Upstream | Read it for | Key paths |
| --- | --- | --- | --- |
| `api-models-aws` | [aws/api-models-aws](https://github.com/aws/api-models-aws) | Authoritative Smithy models for the Bedrock Runtime Converse API — the source of truth behind `AmazonBedrockSchema.ts` | `models/bedrock-runtime/service/2023-09-30/bedrock-runtime-2023-09-30.json` |
| `aws-sdk-js-v3` | [aws/aws-sdk-js-v3](https://github.com/aws/aws-sdk-js-v3) | Generated TypeScript clients for the same API: concrete types where the Smithy models are abstract. Large clone (~750 MB working tree) | `clients/client-bedrock-runtime/src/models/models_0.ts` (concrete TS unions for every `ContentBlock` / stream event), `clients/client-bedrock-runtime/src/commands/Converse{,Stream}Command.ts`, `clients/client-bedrock-runtime/src/schemas/` (serde; replaced the old `protocols/` dir) |
| `smithy-typescript` | [awslabs/smithy-typescript](https://github.com/awslabs/smithy-typescript) | The reference `vnd.amazon.eventstream` codec that `AmazonBedrockEventStream.ts` reimplements — prelude/headers/payload framing and the CRC checks. Lives here, not in `aws-sdk-js-v3`, which only consumes it | `packages/eventstream-codec/src/`, `packages/eventstream-serde-universal/src/` |
| `vercel-ai` | [vercel/ai](https://github.com/vercel/ai) | The AI SDK's own Amazon Bedrock provider, as prior art for feature coverage and edge cases (tool choice, stop reasons, streaming deltas) | `packages/amazon-bedrock/src/` |

## Dependencies (`.repos/deps/`)

Things this project is actually built against, pinned to the exact installed version so the source
never shows an API we do not have.

| Name | Upstream | Pin | Notes |
| --- | --- | --- | --- |
| `aws4fetch` | [mhart/aws4fetch](https://github.com/mhart/aws4fetch) | tag `v{v}`, seeded at `1.0.20` | SigV4 request signing used by `@effect/ai-amazon-bedrock`. The npm probe resolves from `node_modules` and from root or `packages/*` manifests; `aws4fetch` is declared two levels down in `packages/ai/amazon-bedrock/package.json` and pnpm does not hoist it, so the probe misses and the pin falls back to `seed`. **Keep `seed` in `repos.config.js` in step with the range in that package.json.** |

## Consuming package

`packages/ai/amazon-bedrock` (`@effect/ai-amazon-bedrock`) — runtime dep `aws4fetch`, peer dep
`effect`. Source: `AmazonBedrockClient.ts`, `AmazonBedrockConfig.ts`, `AmazonBedrockEventStream.ts`,
`AmazonBedrockLanguageModel.ts`, `AmazonBedrockSchema.ts`.
