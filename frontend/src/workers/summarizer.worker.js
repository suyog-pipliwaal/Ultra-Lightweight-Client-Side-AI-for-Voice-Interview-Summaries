import * as ort from "onnxruntime-web";

let session = null;

async function loadModel() {
  if (session) return;

  // Configure ONNX Runtime WASM settings
  try {
    // Disable SIMD to avoid SIMD-related errors
    ort.env.wasm.simd = false;
    
    // Vite should automatically serve WASM files from node_modules with correct MIME type
    // But if there are issues, we can configure paths explicitly
    // For now, let ONNX Runtime auto-detect the WASM files
  } catch (e) {
    // If setting config fails, continue anyway
    console.warn("Could not configure ONNX Runtime WASM settings:", e);
  }

  // Try multiple execution providers in order of preference
  // webgl doesn't require SIMD, wasm (non-SIMD) as fallback
  const providers = ["webgl", "wasm"];
  
  let lastError = null;
  for (const provider of providers) {
    try {
      session = await ort.InferenceSession.create(
        "/models/summarizer.onnx",
        {
          executionProviders: [provider],
          graphOptimizationLevel: "all"
        }
      );
      console.log(`✓ Model loaded with ${provider} execution provider`);
      return; // Success, exit
    } catch (error) {
      lastError = error;
      console.warn(`Failed to load with ${provider}:`, error.message);
      // Continue to next provider
    }
  }
  
  // If all providers failed, try auto-detect (no provider specified)
  try {
    session = await ort.InferenceSession.create(
      "/models/summarizer.onnx",
      {
        graphOptimizationLevel: "all"
      }
    );
    console.log("✓ Model loaded with auto-detected execution provider");
  } catch (autoError) {
    console.error("All execution providers failed. Last error:", lastError?.message || autoError.message);
    throw autoError;
  }
}

/**
 * Encode text into sentences for extractive summarization
 * Matches the encoding used in textEncoder.js
 */
function encodeText(text, maxSentences = 50, maxWordsPerSentence = 32) {
  if (!text || text.trim().length === 0) {
    return {
      encoded: new Int32Array(maxSentences * maxWordsPerSentence).fill(0),
      sentences: [],
      shape: [1, maxSentences, maxWordsPerSentence]
    };
  }

  // Split text into sentences
  // Handle both proper sentence endings and speech recognition output (which may lack punctuation)
  const sentenceEndings = /[.!?]+/g;
  let rawSentences = text.split(sentenceEndings).map(s => s.trim()).filter(s => s.length > 0);
  
  // If no sentence endings found, split by common speech patterns or long pauses
  // Speech recognition often doesn't include punctuation, so we need to handle this
  if (rawSentences.length === 1 && rawSentences[0].length > 50) {
    const originalText = rawSentences[0];
    // Split by common phrases that indicate sentence boundaries
    const speechPatterns = /\s+(?:I have|I am|I was|I worked|I built|thank you|let me|that is|this is|I have experience)/gi;
    const parts = originalText.split(speechPatterns);
    if (parts.length > 1) {
      // Reconstruct sentences with the pattern included
      rawSentences = [];
      const matches = [...originalText.matchAll(speechPatterns)];
      let lastIndex = 0;
      for (const match of matches) {
        if (match.index > lastIndex) {
          const sentence = originalText.substring(lastIndex, match.index).trim();
          if (sentence.length > 10) {
            rawSentences.push(sentence);
          }
        }
        lastIndex = match.index;
      }
      if (lastIndex < originalText.length) {
        const sentence = originalText.substring(lastIndex).trim();
        if (sentence.length > 10) {
          rawSentences.push(sentence);
        }
      }
      // Filter out empty sentences
      rawSentences = rawSentences.filter(s => s.length > 0);
    }
  }
  
  // If still only one sentence, try splitting by length (every ~100 characters)
  if (rawSentences.length === 1 && rawSentences[0].length > 100) {
    const longText = rawSentences[0];
    rawSentences = [];
    for (let i = 0; i < longText.length; i += 100) {
      const chunk = longText.substring(i, i + 100).trim();
      if (chunk.length > 20) { // Only add chunks with meaningful length
        rawSentences.push(chunk);
      }
    }
  }
  
  // Limit number of sentences
  const sentences = rawSentences.slice(0, maxSentences);
  
  // Encode each sentence
  const encoded = new Int32Array(maxSentences * maxWordsPerSentence);
  
  sentences.forEach((sentence, sentIdx) => {
    // Normalize: lowercase, remove extra whitespace
    const normalized = sentence.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Split into words
    const words = normalized.split(/\s+/).slice(0, maxWordsPerSentence);
    
    // Encode words using hash-based tokenization
    words.forEach((word, wordIdx) => {
      const pos = sentIdx * maxWordsPerSentence + wordIdx;
      
      // Simple hash function for word-to-ID mapping
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        const char = word.charCodeAt(j);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      // Map to positive range and limit vocabulary size (matches model vocab_size=10000)
      encoded[pos] = Math.abs(hash) % 10000;
    });
    
    // Pad remaining words in sentence with 0
    for (let wordIdx = words.length; wordIdx < maxWordsPerSentence; wordIdx++) {
      const pos = sentIdx * maxWordsPerSentence + wordIdx;
      encoded[pos] = 0;
    }
  });
  
  // Pad remaining sentences with zeros
  for (let sentIdx = sentences.length; sentIdx < maxSentences; sentIdx++) {
    for (let wordIdx = 0; wordIdx < maxWordsPerSentence; wordIdx++) {
      const pos = sentIdx * maxWordsPerSentence + wordIdx;
      encoded[pos] = 0;
    }
  }
  
  return {
    encoded,
    sentences,
    shape: [1, maxSentences, maxWordsPerSentence]
  };
}

/**
 * Fallback rule-based summarization
 */
function fallbackSummarize(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Extract sentences with key interview-related keywords
  const keywords = ['experience', 'worked', 'built', 'project', 'team', 
                    'skill', 'learned', 'achieved', 'responsible', 'developed'];
  
  const summary = sentences
    .filter(s => {
      const lower = s.toLowerCase();
      return keywords.some(kw => lower.includes(kw));
    })
    .map(s => `• ${s.trim()}`)
    .slice(0, 5); // Limit to 5 key points
  
  return summary.length > 0 ? summary : [`• ${sentences[0]?.trim() || text.substring(0, 100)}`];
}

self.onmessage = async (e) => {
  const { type, text, topK } = e.data;

  if (type === "LOAD_MODEL") {
    try {
      await loadModel();
      self.postMessage({ type: "READY" });
    } catch (error) {
      self.postMessage({ type: "ERROR", error: error.message });
    }
  }

  if (type === "RUN_SUMMARY") {
    try {
      console.log("[Worker] RUN_SUMMARY received, text length:", text?.length);
      await loadModel();

      if (!text || text.trim().length === 0) {
        console.log("[Worker] Empty text, returning empty summary");
        self.postMessage({
          type: "RESULT",
          summary: [],
          latency: 0
        });
        return;
      }

      const startTime = performance.now();

      // Encode text into sentences
      const { encoded, sentences, shape } = encodeText(text);
      console.log("[Worker] Encoded text:", {
        numSentences: sentences.length,
        shape: shape,
        firstSentence: sentences[0]?.substring(0, 50)
      });
      
      if (sentences.length === 0) {
        console.log("[Worker] No sentences found, returning empty summary");
        self.postMessage({
          type: "RESULT",
          summary: [],
          latency: performance.now() - startTime
        });
        return;
      }

      // Create tensor with shape [batch_size, max_sentences, max_words_per_sentence]
      const tensor = new ort.Tensor("int32", encoded, shape);
      console.log("[Worker] Created tensor, running inference...");

      // Run inference
      const output = await session.run({
        input_ids: tensor
      });

      console.log("[Worker] Inference complete. Output keys:", Object.keys(output));
      if (Object.keys(output).length > 0) {
        const firstKey = Object.keys(output)[0];
        console.log("[Worker] First output:", {
          key: firstKey,
          dims: output[firstKey]?.dims,
          dataType: typeof output[firstKey]?.data,
          dataLength: output[firstKey]?.data?.length
        });
      }

      // Extract sentence scores from output
      let scores = null;
      
      if (output.sentence_scores) {
        scores = output.sentence_scores;
        console.log("[Worker] Using 'sentence_scores' output");
      } else if (output.output) {
        scores = output.output;
        console.log("[Worker] Using 'output' output");
      } else {
        // Get first output value
        const outputKeys = Object.keys(output);
        if (outputKeys.length > 0) {
          scores = output[outputKeys[0]];
          console.log("[Worker] Using first output key:", outputKeys[0]);
        }
      }

      if (!scores || !scores.data) {
        console.warn("[Worker] No valid scores found, using fallback summarization");
        // Fallback to rule-based summarization
        const summary = fallbackSummarize(text);
        self.postMessage({
          type: "RESULT",
          summary,
          latency: performance.now() - startTime
        });
        return;
      }

      // Extract scores as array
      const scoreArray = Array.isArray(scores.data) 
        ? scores.data 
        : Array.from(scores.data);
      
      console.log("[Worker] Score array length:", scoreArray.length, "Sample scores:", scoreArray.slice(0, 5));
      
      // Get scores only for actual sentences (not padding)
      const sentenceScores = scoreArray.slice(0, sentences.length);
      console.log("[Worker] Sentence scores:", sentenceScores);
      
      // Create array of [score, sentence_index] pairs
      const scoredSentences = sentenceScores.map((score, idx) => ({
        score: score,
        index: idx,
        sentence: sentences[idx]
      }));
      
      // Sort by score (descending) and take top K
      const k = topK || 5;
      scoredSentences.sort((a, b) => b.score - a.score);
      const topSentences = scoredSentences.slice(0, Math.min(k, sentences.length));
      console.log("[Worker] Top sentences selected:", topSentences.length);
      
      // Return sentences in original order (not sorted by score)
      // This maintains conversation flow
      const summary = topSentences
        .sort((a, b) => a.index - b.index) // Sort back to original order
        .map(item => `• ${item.sentence.trim()}`)
        .filter(s => s.length > 3); // Filter out very short sentences
      
      const finalSummary = summary.length > 0 ? summary : fallbackSummarize(text);
      const latency = performance.now() - startTime;

      console.log("[Worker] Sending result:", {
        summaryLength: finalSummary.length,
        latency: latency.toFixed(2)
      });

      self.postMessage({
        type: "RESULT",
        summary: finalSummary,
        latency: latency.toFixed(2)
      });
    } catch (error) {
      console.error("[Worker] Summarization error:", error);
      console.error("[Worker] Error stack:", error.stack);
      // Fallback to rule-based summarization
      const summary = fallbackSummarize(text);
      self.postMessage({
        type: "RESULT",
        summary,
        latency: 0,
        error: error.message
      });
    }
  }
};
