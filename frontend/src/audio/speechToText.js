export function createSpeechRecognizer(onResult, onPause) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech Recognition not supported in this browser");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  let lastResultTime = Date.now();

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const text = result[0].transcript.trim();

    const now = Date.now();
    const gap = now - lastResultTime;
    lastResultTime = now;

    onResult(text, now, gap);
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e);
  };

  return recognition;
}
