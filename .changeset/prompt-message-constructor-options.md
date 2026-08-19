---
"effect": patch
---

Type `Prompt.MessageConstructorParams` options with the message's own options.

`MessageConstructorParams<M>` declared `options` as `Part["options"]`, so the role-specific constructors (`Prompt.systemMessage`, `userMessage`, `assistantMessage`, `toolMessage`) accepted part options rather than message options. The two are structurally identical until a provider augments them, at which point the mismatch made `Prompt.ts` itself fail to compile. The property is now typed as `M["options"]`.
