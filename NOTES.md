# `feat/ai-amazon-bedrock` — working notes

Scratch notes and tooling for the `@effect/ai-amazon-bedrock` port. **None of this
belongs in the upstream PR.** It lives on the orphan branch `bedrock-notes`, which
shares no history with `main` and therefore cannot be accidentally included in one.

- Feature branch: `feat/ai-amazon-bedrock` (in `Effect-TS/effect`, pushed to the `wmaurer` fork)
- Upstream target: `Effect-TS/effect`, branch `main`

---

## 1. Where the branch came from

The provider was originally written on a fork of the **archived** `Effect-TS/effect-smol`
repo. `effect-smol` history was merged into `Effect-TS/effect`, so the two share
history — commit `8441836e` ("Derive template literal arbitraries…") is the fork point
and is an ancestor of both.

The 8 original commits were transplanted with a plain cherry-pick:

```bash
git fetch /path/to/effect-smol feat/ai-amazon-bedrock
git cherry-pick 56d51c0baede^..82bc20dd2
```

Two commits from the smol branch were **deliberately dropped** and redone here:
its lockfile-regen commit (conflicts; regenerate with `pnpm install` instead) and its
`beta.84` version bump (stale; the monorepo had moved on).

## 2. Pre-PR checklist

Check these before opening or updating the PR. They are **not** every-push
requirements — WIP pushes to the `wmaurer` fork should never be gated.

- [ ] `@effect/ai-amazon-bedrock` is present in the `fixed` array in `.changeset/config.json`
- [ ] `packages/ai/amazon-bedrock/package.json` version matches the sibling AI providers
      (compare against `packages/ai/anthropic/package.json`)
- [ ] `pnpm-lock.yaml` regenerated with `pnpm install`, not hand-resolved
- [ ] `pnpm check && pnpm lint && pnpm vitest run --project "@effect/ai-amazon-bedrock"` all clean
- [ ] the `bedrock-live.ts` scratchpad dep is reverted (see section 7) —
      `git status` must show no change to `scratchpad/package.json` or `pnpm-lock.yaml`

**Why the first two matter:** the package was added on a fork at `beta.78` and never
went through the upstream version process, so it was missing from the changeset `fixed`
group and silently drifted behind core on every release. Once it is in that group,
changesets bumps it in lockstep and the version check becomes a formality. There is **no
upstream CI check** for fixed-group membership — `check.yml` runs lint/types/build/test
/docgen only. Nothing will catch this for you.

## 3. Rebase workflow

Rebase onto `origin/main`; never merge.

```bash
git fetch origin
git rebase origin/main
git push --force-with-lease wmaurer feat/ai-amazon-bedrock
```

- `git config rerere.enabled true` — **per machine**, the cache in `.git/rr-cache/` is
  never pushed. The recurring conflicts are the registration lines in
  `tsconfig.tests.json` and `tsconfig.packages.json`; rerere replays them after you
  resolve once.
- **Never hand-resolve `pnpm-lock.yaml`.** On conflict:
  `git checkout --theirs pnpm-lock.yaml && pnpm install && git add pnpm-lock.yaml`
- `--force-with-lease`, not `--force`. Upstream squash-merges, so rewritten history on
  the branch costs nothing.

## 4. Upstream API drift to watch for

The port crossed ~20 beta releases (`beta.78/84` → `beta.104`). Fixed so far:

| Was | Now |
|---|---|
| `Schema.TaggedErrorClass<Self>(id)(tag, fields)` | `Schema.TaggedError<Self>(id)(tag, fields)` — pure rename |
| `Prompt.ToolResultPart` | gained a **required** `providerExecuted: boolean` |
| per-package `vitest.config.ts` + root `vitest.shared.ts` | both deleted; test projects declared centrally in the root `vitest.config.ts` |

⚠️ **The vitest one fails silently.** An unregistered package's tests are simply never
collected — the run passes green while testing nothing. After any long rebase, confirm
the project still appears in the root `vitest.config.ts` and that the test count is
non-zero:

```bash
pnpm vitest run --project "@effect/ai-amazon-bedrock"   # expect 3 files / 30 tests
```

## 5. Temporary publishing

`publish-fork.sh` publishes the package to GitHub Packages as
`@wmaurer/ai-amazon-bedrock` without touching the branch.

```bash
./publish-fork.sh                       # dry run — packs a tarball, publishes nothing
SUFFIX=wmaurer.1 ./publish-fork.sh --publish
```

It stages a throwaway git worktree, rewrites the package identity there, builds, and
publishes — so your working tree is never modified. That isolation is **required**, not
cosmetic: the release build steps (`scripts/set-strip-internal.mjs`, `pnpm codemod`)
rewrite `tsconfig.base.json` and every `packages/*/src/**/*.ts` in place.

Gotchas it handles for you:

1. `repository.url` must point at `wmaurer/effect` — GitHub Packages uses it to
   determine the owning repo, and a mismatch fails with an opaque 401/404.
2. `publishConfig.provenance` must be removed — it needs OIDC from inside GitHub
   Actions and fails on a laptop.
3. Versions are **never** reusable on GitHub Packages, even after deletion. Bump
   `SUFFIX` every time.
4. `effect: "workspace:^"` is rewritten to a real range (`^4.0.0-beta.104`) by pnpm at
   pack time. `publishConfig.exports` is also merged at pack time, repointing `.` from
   `./src/index.ts` to `./dist/index.js`.

**Consumer tax:** GitHub Packages requires a PAT with `read:packages` to *install*, even
for public packages. Consumers need an `.npmrc`:

```
@wmaurer:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<PAT>
```

**Lower-friction alternative:** the repo already depends on `pkg-pr-new` and has a
`snapshot.yml` workflow. Installing the pkg.pr.new GitHub App on `wmaurer/effect` gives
per-commit previews with **no consumer auth** and no renaming:
`pnpm add https://pkg.pr.new/@effect/ai-amazon-bedrock@<sha>`. Downsides: keeps the
`@effect/` name, and previews expire after a few weeks.

## 6. `pre-push` hook (optional, per machine)

`pre-push` is a **warn-only** hook — it never blocks, because WIP pushes to the fork
happen constantly and a blocking hook just trains you to type `--no-verify`.

```bash
install -m 755 pre-push "$(git rev-parse --git-common-dir)/hooks/pre-push"
```

It is local and never committed to the feature branch. The hooks directory is shared
across all worktrees of the repo, and the hook no-ops where the package is absent.
Remove with `rm "$(git rev-parse --git-common-dir)/hooks/pre-push"`.

Largely redundant now that the package is in the `fixed` group — keep it only if you
want the belt-and-braces reminder.

## 7. Live check against real Bedrock (`bedrock-live.ts`)

`bedrock-live.ts` exercises tool calling, forced `toolChoice`, structured output and
streaming-with-tools against the real `bedrock-runtime` endpoint. The unit tests all
run against a mocked `HttpClient`, so this is the only thing that proves the request
shape is actually accepted by AWS.

**It lives here, not in the repo.** `scratchpad/**/*` is gitignored, and every existing
`*.integration.test.ts` in the repo is testcontainers-backed and credential-free — CI
sets `EFFECT_INTEGRATION_TESTS=1` unconditionally, so anything in that glob *runs
upstream* and would fail without AWS credentials. No AI provider package has a live
test; all five mock the HTTP layer. Keeping this off the feature branch is deliberate.

### Running it

```bash
cp bedrock-live.ts <effect-worktree>/scratchpad/
```

Add the dep to `scratchpad/package.json` (tracked — revert before the PR):

```json
"@effect/ai-amazon-bedrock": "workspace:*",
```

Then:

```bash
pnpm install
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=us-east-1
node scratchpad/bedrock-live.ts
```

Afterwards, to get back to a clean tree:

```bash
git checkout -- scratchpad/package.json pnpm-lock.yaml
```

A relative import (`../packages/ai/...`) would avoid the dep entirely, but
`scratchpad/tsconfig.json` sets `rootDir: "."` so it fails `tsc` with TS6059. It still
*runs* under Node's type stripping if you don't care about the typecheck.

### Gotchas

- **Static credentials only.** `AmazonBedrockClient.layer` takes `accessKeyId` /
  `secretAccessKey` / `sessionToken` directly — there is no AWS credential-provider
  chain, so `AWS_PROFILE` and SSO do not work. Materialize them first:
  `eval "$(aws configure export-credentials --profile <p> --format env)"`.
  That also exports `AWS_SESSION_TOKEN`, which the script picks up automatically and
  which is **required** for temporary credentials.
- **Model access is opt-in per account and region**, and costs real money per run.
  Default is the Claude Sonnet 4.5 US inference profile; the `us.` prefix is a
  cross-region inference profile, not a bare model ID. Override with `BEDROCK_MODEL_ID`.
- The `GetWeather` handler logs `[handler] GetWeather invoked` when it actually fires.
  Watch for that line — without it you cannot tell a real tool round trip from the
  model merely narrating that it called a tool.
