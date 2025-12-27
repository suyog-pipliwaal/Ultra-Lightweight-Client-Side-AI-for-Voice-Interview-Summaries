const fillers = {
  SHORT_PAUSE: [
    "Let me think for a moment.",
    "That's a good question.",
    "I appreciate that.",
    "That's interesting."
  ],
  LONG_PAUSE: [
    "Thanks for your patience.",
    "Let me clarify that.",
    "That's a great point to consider.",
    "I'd like to expand on that."
  ]
};

// Generate contextual filler based on conversation topic
function getContextualFiller(type, transcript) {
  const recentText = transcript.slice(-3).join(" ").toLowerCase();
  
  // Context-aware fillers
  if (recentText.includes("experience") || recentText.includes("worked")) {
    return type === "SHORT_PAUSE" 
      ? "Let me share my experience with that."
      : "I have relevant experience in that area.";
  }
  
  if (recentText.includes("project") || recentText.includes("built")) {
    return type === "SHORT_PAUSE"
      ? "Let me think about that project."
      : "That project was particularly interesting.";
  }
  
  if (recentText.includes("team") || recentText.includes("collaborat")) {
    return type === "SHORT_PAUSE"
      ? "Working with teams is important."
      : "Collaboration was key in that situation.";
  }
  
  // Default fillers
  const options = fillers[type];
  return options[Math.floor(Math.random() * options.length)];
}

export function playFiller(type, transcript = []) {
  const text = getContextualFiller(type, transcript);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;

  speechSynthesis.cancel(); // prevent overlap
  speechSynthesis.speak(utterance);
}
