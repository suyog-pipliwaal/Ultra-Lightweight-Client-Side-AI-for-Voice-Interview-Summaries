import * as ort from "onnxruntime-web"
let session = null 

export async function loadSummarizer() {
  if (session) return session

  session = await ort.InferenceSession.create(
    "/models/summarizer.onnx",{executionProviders: ["wasm"],graphOptimizationLevel: "all"}
  );
  return session;
}