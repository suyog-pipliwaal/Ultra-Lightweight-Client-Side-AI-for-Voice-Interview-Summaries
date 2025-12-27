const fillers = {
  SHORT_PAUSE: [
    "Let me think for a moment.",
    "That's a good question."
  ],
  LONG_PAUSE: [
    "Thanks for your patience.",
    "Let me clarify that."
  ]
};

export function playFiller(type) {
  const options = fillers[type];
  if (!options) return;

  const text = options[Math.floor(Math.random() * options.length)];

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;

  speechSynthesis.cancel(); // prevent overlap
  speechSynthesis.speak(utterance);
}
