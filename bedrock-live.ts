/**
 * Live smoke test for @effect/ai-amazon-bedrock against the real Bedrock
 * runtime endpoint. Exercises the tool-calling and structured-output paths
 * added by the recent commits.
 *
 *   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=us-east-1 \
 *     node scratchpad/bedrock-live.ts
 *
 * Optional env:
 *   AWS_SESSION_TOKEN   required when using temporary/STS credentials
 *   BEDROCK_MODEL_ID    defaults to the Claude Sonnet 4.5 US inference profile
 */
// Requires `"@effect/ai-amazon-bedrock": "workspace:*"` in scratchpad/package.json.
// That file is tracked, so the dep line and the resulting pnpm-lock.yaml churn
// must both be reverted before opening the PR -- see NOTES.md.
import { AmazonBedrockClient, AmazonBedrockLanguageModel } from "@effect/ai-amazon-bedrock"
import { NodeHttpClient } from "@effect/platform-node"
import { Effect, Layer, Redacted, Schema, Stream } from "effect"
import { LanguageModel, Tool, Toolkit } from "effect/unstable/ai"

const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-sonnet-4-5-20250929-v1:0"

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (value === undefined || value === "") {
    throw new Error(`missing required env var ${name}`)
  }
  return value
}

const sessionToken = process.env.AWS_SESSION_TOKEN

const ClientLayer = AmazonBedrockClient.layer({
  accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
  secretAccessKey: Redacted.make(requireEnv("AWS_SECRET_ACCESS_KEY")),
  region: process.env.AWS_REGION ?? "us-east-1",
  ...(sessionToken ? { sessionToken: Redacted.make(sessionToken) } : {})
}).pipe(Layer.provide(NodeHttpClient.layerUndici))

const ModelLayer = AmazonBedrockLanguageModel.layer({ model: MODEL_ID }).pipe(
  Layer.provide(ClientLayer)
)

// ---------------------------------------------------------------------------
// A toolkit whose handler prints when it actually runs, so a real round trip is
// distinguishable from the model merely claiming it called the tool.
// ---------------------------------------------------------------------------

const GetWeather = Tool.make("GetWeather", {
  description: "Get the current weather for a city",
  parameters: Schema.Struct({ city: Schema.String }),
  success: Schema.Struct({ celsius: Schema.Number, summary: Schema.String })
})

const toolkit = Toolkit.make(GetWeather)

const ToolkitLayer = toolkit.toLayer({
  GetWeather: ({ city }) =>
    Effect.sync(() => {
      console.log(`  [handler] GetWeather invoked with city=${city}`)
      return { celsius: 21, summary: "clear skies" }
    })
})

// ---------------------------------------------------------------------------

const generateWithTools = Effect.gen(function*() {
  console.log("\n=== generateText + toolkit ===")
  const response = yield* LanguageModel.generateText({
    prompt: "What is the weather in Zurich? Use the GetWeather tool.",
    toolkit
  })
  console.log("  text:", JSON.stringify(response.text))
  for (const part of response.content) {
    if (part.type === "tool-call") {
      console.log("  tool-call:", part.name, JSON.stringify(part.params))
    }
    if (part.type === "tool-result") {
      console.log("  tool-result:", part.name, JSON.stringify(part.result))
    }
  }
  console.log("  usage:", JSON.stringify(response.usage))
  console.log("  finishReason:", response.finishReason)
})

const forcedToolChoice = Effect.gen(function*() {
  console.log("\n=== generateText + toolChoice: required ===")
  const response = yield* LanguageModel.generateText({
    prompt: "Tell me a joke.",
    toolkit,
    toolChoice: "required"
  })
  const calls = response.content.filter((part) => part.type === "tool-call")
  console.log(`  forced ${calls.length} tool call(s):`, calls.map((call) => call.name).join(", "))
})

const structuredOutput = Effect.gen(function*() {
  console.log("\n=== generateObject ===")
  const result = yield* LanguageModel.generateObject({
    prompt: "Invent a person and describe them.",
    objectName: "person",
    schema: Schema.Struct({
      name: Schema.String,
      age: Schema.Number,
      occupation: Schema.String
    })
  })
  console.log("  value:", JSON.stringify(result.value))
})

const streamWithTools = Effect.gen(function*() {
  console.log("\n=== streamText + toolkit ===")
  yield* LanguageModel.streamText({
    prompt: "What is the weather in Bern? Use the GetWeather tool, then summarize.",
    toolkit
  }).pipe(
    Stream.runForEach((part) =>
      Effect.sync(() => {
        switch (part.type) {
          case "text-delta":
            return process.stdout.write(part.delta)
          case "tool-call":
            return console.log(`\n  [stream] tool-call ${part.name} ${JSON.stringify(part.params)}`)
          case "tool-result":
            return console.log(`  [stream] tool-result ${part.name} ${JSON.stringify(part.result)}`)
          case "finish":
            return console.log(`\n  [stream] finish: ${part.reason} ${JSON.stringify(part.usage)}`)
        }
      })
    )
  )
})

const program = Effect.gen(function*() {
  console.log(`model:  ${MODEL_ID}`)
  console.log(`region: ${process.env.AWS_REGION ?? "us-east-1"}`)
  yield* generateWithTools
  yield* forcedToolChoice
  yield* structuredOutput
  yield* streamWithTools
}).pipe(
  Effect.provide([ModelLayer, ToolkitLayer])
)

Effect.runPromise(program).then(
  () => console.log("\nall live checks passed"),
  (error) => {
    console.error("\nfailed:", error)
    process.exit(1)
  }
)
