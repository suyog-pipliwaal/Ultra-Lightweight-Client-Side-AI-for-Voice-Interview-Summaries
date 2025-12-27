import { useEffect, useRef, useState } from "react";
import { detectPause } from "./audio/pauseDetector";
import { playFiller } from "./audio/tts";
import { runSummarizer } from "./summarizer/runSummarizer";
import { measure } from "./metrics/perf";
import { createSpeechRecognizer } from "./audio/speechToText";

export default function InterviewDemo() {
  const [transcript, setTranscript] = useState([]);
  const [summary, setSummary] = useState([]);
  const [latency, setLatency] = useState(0);
  const [listening, setListening] = useState(false);
  useEffect(() => {
    import("./summarizer/onnxSummarizer").then(m => m.loadSummarizer());
  }, []);
  const timestampsRef = useRef([]);
  const recognizerRef = useRef(null);

  const startListening = () => {
    if (recognizerRef.current) return;

    recognizerRef.current = createSpeechRecognizer(
      (text, now) => {
        timestampsRef.current.push(now);

        setTranscript(t => [...t, text]);

        const pause = detectPause(timestampsRef.current);
        if (pause) playFiller(pause);

        const start = performance.now();

        runSummarizer([...transcript, text].join(". ")).then(result => {
              setSummary(result);
              setLatency((performance.now() - start).toFixed(2));
        });
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
      <button onClick={listening ? stopListening : startListening}>
        {listening ? "Stop Interview" : "Start Interview"}
      </button>

      <Panel title="Live Transcript">
        {transcript.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </Panel>

      <Panel title="Live Summary">
        {summary.map((s, i) => (
          <p key={i}>{s}</p>
        ))}
        <small>Update latency: {latency} ms</small>
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
    marginTop: "20px"
  },
  panel: {
    marginTop: "16px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    background: "#fafafa"
  }
};
