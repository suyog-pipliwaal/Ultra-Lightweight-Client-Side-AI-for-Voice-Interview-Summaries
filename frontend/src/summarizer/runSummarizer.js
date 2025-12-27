import { encodeText } from "./textEncoder";
import { loadSummarizer } from "./onnxSummarizer";
import * as ort from "onnxruntime-web";

export async function runSummarizer(text) {
  const session = await loadSummarizer();

  const input = encodeText(text);
  const tensor = new ort.Tensor("int32", input, [1, input.length]);

  const output = await session.run({
    input_ids: tensor
  });

  return output.summary.data;
}
