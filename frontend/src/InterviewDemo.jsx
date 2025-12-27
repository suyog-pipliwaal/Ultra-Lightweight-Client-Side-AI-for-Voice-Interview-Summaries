import { useEffect, useRef, useState } from "react";
import { detectPause } from "./audio/pauseDetector";
import { playFiller } from "./audio/tts";
import { createSpeechRecognizer } from "./audio/speechToText";
import { initSummarizerWorker, runSummary, isWorkerReady } from "./summarizer/workerClient";

export default function InterviewDemo() {
  const [transcript, setTranscript] = useState([]);
  const [summary, setSummary] = useState([]);
  const [latency, setLatency] = useState(0);
  const [loadTime, setLoadTime] = useState(null);
  const [listening, setListening] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const timestampsRef = useRef([]);
  const recognizerRef = useRef(null);
  const transcriptRef = useRef([]); // Keep ref for latest transcript
  const loadStartRef = useRef(null);

  // Initialize worker and track load time
  useEffect(() => {
    loadStartRef.current = performance.now();
    
    initSummarizerWorker(
      () => {
        // Worker is ready
        const loadEnd = performance.now();
        const loadTimeMs = (loadEnd - loadStartRef.current).toFixed(2);
        setLoadTime(loadTimeMs);
        setModelReady(true);
        console.log(`✓ Summarizer worker ready (load time: ${loadTimeMs}ms)`);
      },
      (result, resultLatency) => {
        // Handle summary result
        setSummary(Array.isArray(result) ? result : [result]);
        if (resultLatency) {
          setLatency(resultLatency);
        }
      }
    );
  }, []);

  const startListening = () => {
    if (recognizerRef.current) return;

    recognizerRef.current = createSpeechRecognizer(
      (text, now) => {
        // Skip if text is empty
        if (!text || text.trim().length === 0) {
          console.log("[InterviewDemo] Empty text received, skipping");
          return;
        }

        timestampsRef.current.push(now);

        // Update both state and ref
        setTranscript(t => {
          const updated = [...t, text];
          transcriptRef.current = updated;
          return updated;
        });

        // Build the full text from current ref + new text
        // This ensures we always have the latest transcript
        const currentTranscript = transcriptRef.current || [];
        const fullTranscript = [...currentTranscript, text];
        const fullText = fullTranscript.join(". ");
        
        // Update the ref immediately for next time
        transcriptRef.current = fullTranscript;
        
        console.log("[InterviewDemo] Transcript updated, full text length:", fullText.length, "sentences:", fullTranscript.length);

        const pause = detectPause(timestampsRef.current);
        if (pause) playFiller(pause, fullTranscript);

        // Run summarization in worker (non-blocking)
        // Only run if we have meaningful text
        if (fullText.trim().length > 10) {
          if (isWorkerReady()) {
            console.log("[InterviewDemo] Calling runSummary with text length:", fullText.length);
            runSummary(fullText, 5); // topK = 5
          } else {
            console.warn("[InterviewDemo] Worker not ready, skipping summarization");
          }
        } else {
          console.log("[InterviewDemo] Text too short, skipping summarization");
        }
      }
    );

    recognizerRef.current.start();
    setListening(true);
  };

  const stopListening = () => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setListening(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button 
          onClick={listening ? stopListening : startListening}
          disabled={!modelReady}
          style={styles.button}
        >
          {listening ? "Stop Interview" : "Start Interview"}
        </button>
        {!modelReady && <span style={styles.loading}>Loading model...</span>}
      </div>

      <Panel title="Performance Metrics">
        <div style={styles.metrics}>
          <div><strong>Model Load Time:</strong> {loadTime ? `${loadTime} ms` : "Loading..."}</div>
          <div><strong>Inference Latency:</strong> {latency ? `${latency} ms` : "N/A"}</div>
          {latency && parseFloat(latency) > 50 && (
            <div style={styles.warning}>⚠️ Latency exceeds 50ms target</div>
          )}
        </div>
      </Panel>

      <Panel title="Live Transcript">
        {transcript.length === 0 ? (
          <p style={styles.empty}>No transcript yet. Start the interview to begin.</p>
        ) : (
          transcript.map((t, i) => (
            <p key={i} style={styles.transcriptItem}>{t}</p>
          ))
        )}
      </Panel>

      <Panel title="Live Summary">
        {summary.length === 0 ? (
          <p style={styles.empty}>Summary will appear here as the conversation progresses.</p>
        ) : (
          summary.map((s, i) => (
            <p key={i} style={styles.summaryItem}>{s}</p>
          ))
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={styles.panel}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    maxWidth: "1200px",
    margin: "20px auto 0"
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px"
  },
  button: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
    borderRadius: "8px",
    border: "1px solid #646cff",
    backgroundColor: "#646cff",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  loading: {
    color: "#666",
    fontStyle: "italic"
  },
  panel: {
    marginTop: "16px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    background: "#fafafa"
  },
  metrics: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "14px"
  },
  warning: {
    color: "#ff6b6b",
    fontWeight: "600"
  },
  empty: {
    color: "#999",
    fontStyle: "italic"
  },
  transcriptItem: {
    margin: "8px 0",
    padding: "8px",
    background: "white",
    borderRadius: "4px"
  },
  summaryItem: {
    margin: "8px 0",
    padding: "8px",
    background: "#e8f4f8",
    borderRadius: "4px",
    fontWeight: "500"
  }
};
