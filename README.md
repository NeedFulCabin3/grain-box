# Grain Box

An in-browser granular synthesis sandbox that chops local audio buffers into micro-grains, re-ordering, pitching, and scheduling them in real time using low-level Web Audio API interfaces.

## Overview
Working with audio in the browser usually means playing back static files. `grain-box` gives you granular control over sound files by turning raw array buffers into dynamic synthesis sources. You drag in a sound file, click the generated waveform, and tweak parameters like grain size, density, pitch spread, envelope shaping, and position drift on the fly.

## How It Works
1. **Decode**: Drop an audio sample to extract its PCM data via `AudioContext.decodeAudioData()`.
2. **Render**: The HTML5 Canvas draws a complete amplitude peak representation of channel 0.
3. **Schedule**: A tick timer running every 25ms checks a 100ms lookahead window against `audioCtx.currentTime`.
4. **Trigger**: Each grain creates an `AudioBufferSourceNode` paired with a temporary `GainNode` for micro-ramping, preventing pop and click artifacts.

## Key Features
* **Lookahead Scheduler**: Prevents audio dropouts by scheduling nodes slightly ahead of execution time.
* **Non-Destructive Reverse**: Reverses sample buffers once on demand and caches them in memory.
* **Envelope Generation**: Custom linear gain ramps apply attack and release stages dynamically per grain.
* **Jitter & Spray Math**: Introduces randomized variations for grain position, pitch offset, and drift over time.
* **Waveform Scrubbing**: Visual representation allowing instant position adjustments via direct canvas clicks.

## Tech Stack Breakdown
* **HTML5 / CSS3**: UI layout utilizing custom ranges and canvas bindings.
* **JavaScript (ES6+)**: Core scheduling loops, state handling, and mathematical transformations.
* **Web Audio API**: `AudioContext`, `AudioBuffer`, `AudioBufferSourceNode`, and `GainNode`.

## Prerequisites & Quick Start

Since this engine runs in standard modern browsers, no local build tools or dependencies are necessary.

### Option 1: GitHub Codespaces
1. Click **Code** > **Codespaces** > **Create codespace on main**.
2. Run a lightweight static server using Python:
   ```bash
   python3 -m http.server 8000
   ```
3. Open the forwarded port in your browser tab to test.

### Option 2: Local Web Server
1. Download or clone this repository using the GitHub web UI interface.
2. Serve the directory with any static file server:
  ```text
  python -m http.server 8000
  ```
3. Open http://localhost:8000 in Google Chrome or Firefox.

## Repository Structure

```text
├── .github/
│   └── workflows/
│       └── validate-frontend.yml  # Lints HTML/JS files on push
├── .gitignore                     # Ignores local OS and editor artifacts
├── LICENSE                        # MIT License text
├── README.md                      # Project documentation
├── index.html                     # Application UI layout and control bindings
├── script.js                      # Core audio scheduling logic and canvas engine
└── style.css                      # UI layout rules and custom slider styling
```

## Roadmap

[ ] Add exponential gain envelope modes (sine, hanning, parabolic).

[ ] Multi-channel audio output support for stereo field grain distribution.

[ ] MIDI control support via WebMIDI API for hardware slider mappings.
