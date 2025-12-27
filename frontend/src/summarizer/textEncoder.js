// ultra-light tokenizer (placeholder)
// real tokenizer will be baked into model later

export function encodeText(text, maxLen = 128) {
  const tokens = text
    .toLowerCase()
    .split(/\s+/)
    .slice(0, maxLen);

  const input = new Int32Array(maxLen);
  tokens.forEach((t, i) => {
    input[i] = t.length; // cheap numeric proxy
  });

  return input;
}
