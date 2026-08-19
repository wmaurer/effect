---
"effect": patch
---

Type `Prompt.MessageConstructorParams` and `Prompt.PartConstructorParams` options with the message's/part's own options.

`MessageConstructorParams<M>` declared `options` as `Part["options"]`, so the role-specific constructors (`Prompt.systemMessage`, `userMessage`, `assistantMessage`, `toolMessage`) accepted part options rather than message options. `PartConstructorParams<P>` had the same defect one alias over: it declared `options` as `Part["options"]` (the union of every part's options) instead of `P["options"]`, so the part constructors (`Prompt.textPart`, etc.) silently accepted options belonging to a different part type. The two are structurally identical until a provider augments them, at which point the mismatch made `Prompt.ts` itself fail to compile. Both properties are now typed against their own generic parameter (`M["options"]` and `P["options"]`, respectively).
