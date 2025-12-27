# Ultra-Lightweight-Client-Side-AI-for-Voice-Interview-Summaries

## Objective
Develop a <30MB client-side AI model that generates filler phrases and real-time summaries to enhance automated voice interviews in the browser.

## Requirements
### Constraints
* Model size ≤30MB
* Fully client-side (ONNX / WASM)
* Inference latency <50ms
### Tasks 
* Real-time summarization of conversation text
* Detect pauses in text-to-speech responses
* Insert contextual filler phrases using same TTS output
### Success Criteria
* Runs offline
* No perceivable lag
* Accurate, meaningful filler + summary generation

## Deliverable
A working web demo displaying live summary updates, filler playback, load time, and response time metrics.

---

## Getting Started

### Prerequisites

- **Node.js** (v22 or higher recommended)
- **npm** (comes with Node.js)
- **Modern web browser** with:
  - Web Speech API support (Chrome, Edge, Safari)
  - WebAssembly support
  - Microphone access

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd Ultra-Lightweight-Client-Side-AI-for-Voice-Interview-Summaries
   ```

2. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

### Running the Project

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   - The server will start on `http://localhost:5173`
   - Open this URL in your browser
   - You should see the "Ultra-Lightweight Client-Side Voice AI" interface

3. **Grant microphone permissions:**
   - When prompted, allow microphone access
   - This is required for speech recognition

4. **Start the interview:**
   - Click the "Start Interview" button
   - Wait for the model to load (you'll see "Loading model..." initially)
   - Once ready, the button will be enabled

5. **Test the application:**
   - Speak into your microphone
   - Watch the transcript appear in real-time
   - See summaries generated automatically
   - Listen for filler phrases during pauses


### Project Structure

```
frontend/
├── public/
│   └── models/
│       └── summarizer.onnx    # ONNX model (22MB)
├── src/
│   ├── audio/                 # Audio processing
│   │   ├── pauseDetector.js   # Pause detection logic
│   │   ├── speechToText.js    # Speech recognition
│   │   └── tts.js             # Text-to-speech
│   ├── summarizer/
│   │   └── workerClient.js    # Worker communication
│   ├── workers/
│   │   └── summarizer.worker.js  # ONNX inference worker
│   ├── InterviewDemo.jsx     # Main demo component
│   ├── App.jsx                # Root component
│   └── main.jsx              # Entry point
└── package.json
```

### Browser Compatibility

| Browser | Speech Recognition | TTS | WASM | Status |
|---------|-------------------|-----|------|--------|
| Chrome/Edge | ✅ | ✅ | ✅ | Fully Supported |

### Performance Notes

- **Model Load Time:** Typically 300-500ms
- **Inference Latency:** Target <50ms (varies by device)
- **Model Size:** 22MB (under 30MB requirement)


### Building for Production

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Preview the production build:**
   ```bash
   npm run preview
   ```

3. **Deploy:**
   - The `dist/` folder contains the production build
   - Deploy to any static hosting service (Vercel, Netlify, etc.)
   - Ensure the `models/` folder is included in deployment

---

## Drawbacks

- ✅ Could not figure it why workers does not work on safari
- ✅ Need to manully export the model Code is available in model_export dir. I run this code on google colab. 
- ✅ Contextual filler phrase generation
- ✅ Summary that are generated are not very good quality
- ✅ You will see two contribute in this repo both are my accouts. I have multiple accounts one github and one for bitbucket. 
