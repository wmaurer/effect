---
"@effect/ai-anthropic": patch
---

Allow the `max` effort level on `AnthropicLanguageModel.Config`.

`output_config` is omitted from the generated request params so that `format`
stays owned by the provider, which derives it from the response format. Only
`effort` is re-exposed — but it was spelled out by hand as `"low" | "medium" |
"high"`, so it had drifted from `Generated.BetaEffortLevel`, which has carried
`max` for some time. The result was that `max` could not be requested at all.

`effort` is now typed from the generated schema rather than restated, so it
cannot drift again.
