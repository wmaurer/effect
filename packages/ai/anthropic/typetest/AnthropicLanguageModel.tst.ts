import { AnthropicLanguageModel } from "@effect/ai-anthropic"
import { describe, expect, it } from "tstyche"

declare const acceptsKnownModel: (model: AnthropicLanguageModel.Model) => void

declare const withEffort: (
  effort: NonNullable<typeof AnthropicLanguageModel.Config.Service["output_config"]>["effort"]
) => void

describe("AnthropicLanguageModel", () => {
  describe("Model", () => {
    it("keeps the known model ids as literals, while the constructors still accept custom ids", () => {
      expect(acceptsKnownModel).type.toBeCallableWith("claude-opus-4-8")
      expect(acceptsKnownModel).type.not.toBeCallableWith("not-a-real-model")
      expect(AnthropicLanguageModel.model).type.toBeCallableWith("not-a-real-model")
    })
  })

  describe("Config", () => {
    it("accepts every effort level the generated schema defines", () => {
      expect(withEffort).type.toBeCallableWith("low")
      expect(withEffort).type.toBeCallableWith("medium")
      expect(withEffort).type.toBeCallableWith("high")
      expect(withEffort).type.toBeCallableWith("max")
      expect(withEffort).type.not.toBeCallableWith("not-an-effort-level")
    })
  })
})
