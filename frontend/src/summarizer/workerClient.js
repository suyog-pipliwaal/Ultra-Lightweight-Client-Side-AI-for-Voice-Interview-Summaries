let worker = null;
let ready = false;
let onResultCallback = null;

export function initSummarizerWorker(onReady, onResult) {
  if (worker) {
    // Already initialized
    if (ready) {
      onReady?.();
    }
    return;
  }

  worker = new Worker(
    new URL("../workers/summarizer.worker.js", import.meta.url),
    { type: "module" }
  );

  onResultCallback = onResult;

  worker.onmessage = (e) => {
    console.log("[WorkerClient] Received message:", e.data.type);
    
    if (e.data.type === "READY") {
      ready = true;
      console.log("[WorkerClient] Worker is ready");
      onReady?.();
    }

    if (e.data.type === "RESULT") {
      console.log("[WorkerClient] Received result:", {
        summaryLength: e.data.summary?.length,
        latency: e.data.latency,
        error: e.data.error
      });
      onResultCallback?.(e.data.summary, e.data.latency);
    }

    if (e.data.type === "ERROR") {
      console.error("[WorkerClient] Worker error:", e.data.error);
      ready = false;
    }
  };

  worker.onerror = (error) => {
    console.error("Worker error:", error);
    ready = false;
  };

  worker.postMessage({ type: "LOAD_MODEL" });
}

export function runSummary(text, topK = 5) {
  if (!worker || !ready) {
    console.warn("[WorkerClient] Worker not ready, cannot run summary. Ready:", ready, "Worker:", !!worker);
    return;
  }
  console.log("[WorkerClient] Sending RUN_SUMMARY, text length:", text?.length);
  worker.postMessage({ type: "RUN_SUMMARY", text, topK });
}

export function isWorkerReady() {
  return ready && worker !== null;
}
