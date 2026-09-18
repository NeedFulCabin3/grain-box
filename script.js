
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const dropLabel = document.getElementById('dropLabel');
const canvas = document.getElementById('waveform');
const ctx2d = canvas.getContext('2d');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');
 
const grainSizeSlider = document.getElementById('grainSize');
const densitySlider = document.getElementById('density');
const positionSlider = document.getElementById('position');
const spreadSlider = document.getElementById('spread');
const pitchSlider = document.getElementById('pitch');
const pitchSpreadSlider = document.getElementById('pitchSpread');
const envSlider = document.getElementById('envAmt');
const reverseSlider = document.getElementById('reverseChance');
const spraySlider = document.getElementById('spray');
const masterGainSlider = document.getElementById('masterGain');
 
let audioCtx = null;
let audioBuffer = null;
let masterGainNode = null;
 
let isPlaying = false;
let nextGrainTime = 0;
let schedulerTimer = null;
let currentPlayhead = 0.5; // used when spray is active, drifts around
 
const LOOKAHEAD = 0.1; // how far ahead we schedule, in seconds
const SCHEDULE_INTERVAL = 25; // ms between scheduler ticks
 
function fmt(v, d = 2) {
  return Number(v).toFixed(d);
}
 
grainSizeSlider.oninput = () => document.getElementById('grainSizeVal').textContent = grainSizeSlider.value;
densitySlider.oninput = () => document.getElementById('densityVal').textContent = densitySlider.value;
positionSlider.oninput = () => {
  document.getElementById('positionVal').textContent = fmt(positionSlider.value, 3);
  currentPlayhead = parseFloat(positionSlider.value);
  drawWaveform();
};
spreadSlider.oninput = () => document.getElementById('spreadVal').textContent = fmt(spreadSlider.value, 3);
pitchSlider.oninput = () => document.getElementById('pitchVal').textContent = pitchSlider.value;
pitchSpreadSlider.oninput = () => document.getElementById('pitchSpreadVal').textContent = pitchSpreadSlider.value;
envSlider.oninput = () => document.getElementById('envVal').textContent = envSlider.value;
reverseSlider.oninput = () => document.getElementById('reverseVal').textContent = reverseSlider.value;
spraySlider.oninput = () => document.getElementById('sprayVal').textContent = spraySlider.value;
masterGainSlider.oninput = () => {
  document.getElementById('gainVal').textContent = masterGainSlider.value;
  if (masterGainNode) masterGainNode.gain.value = parseFloat(masterGainSlider.value);
};
 
dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
  dropzone.classList.remove('dragover');
});
 
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) loadFile(file);
});
 
async function loadFile(file) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.value = parseFloat(masterGainSlider.value);
    masterGainNode.connect(audioCtx.destination);
  }
 
  dropLabel.textContent = 'loading...';
  try {
    const arrayBuf = await file.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
  } catch (err) {
    dropLabel.textContent = 'could not decode that file, try another one';
    return;
  }
 
  dropLabel.textContent = file.name;
  statusText.textContent = `loaded (${audioBuffer.duration.toFixed(2)}s)`;
  playBtn.disabled = false;
  drawWaveform();
}
 
function drawWaveform() {
  const w = canvas.width;
  const h = canvas.height;
  ctx2d.clearRect(0, 0, w, h);
 
  if (!audioBuffer) return;
 
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / w);
  const mid = h / 2;
 
  ctx2d.strokeStyle = '#6c6fff';
  ctx2d.beginPath();
  for (let x = 0; x < w; x++) {
    let min = 1.0, max = -1.0;
    for (let i = 0; i < step; i++) {
      const idx = x * step + i;
      if (idx >= data.length) break;
      const v = data[idx];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ctx2d.moveTo(x, mid + min * mid);
    ctx2d.lineTo(x, mid + max * mid);
  }
  ctx2d.stroke();
 
  const playX = currentPlayhead * w;
  ctx2d.strokeStyle = '#ff5c5c';
  ctx2d.beginPath();
  ctx2d.moveTo(playX, 0);
  ctx2d.lineTo(playX, h);
  ctx2d.stroke();
}
 
canvas.addEventListener('click', e => {
  if (!audioBuffer) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pos = x / rect.width;
  positionSlider.value = pos;
  positionSlider.oninput();
});
 
function semitonesToRate(st) {
  return Math.pow(2, st / 12);
}
 
function playGrain(time, posSeconds, durationSec, playbackRate, reverse) {
  const src = audioCtx.createBufferSource();
  src.buffer = audioBuffer;
  src.playbackRate.value = playbackRate;
 
  if (reverse) {
    // easiest way to fake reverse without rebuilding buffers every grain:
    // flip the buffer once and cache it
    src.buffer = getReversedBuffer();
    posSeconds = audioBuffer.duration - posSeconds - durationSec;
    if (posSeconds < 0) posSeconds = 0;
  }
 
  const grainGain = audioCtx.createGain();
  src.connect(grainGain);
  grainGain.connect(masterGainNode);
 
  const envPercent = parseFloat(envSlider.value) / 100;
  const rampTime = Math.max(0.002, durationSec * envPercent);
 
  grainGain.gain.setValueAtTime(0, time);
  grainGain.gain.linearRampToValueAtTime(1, time + rampTime);
  grainGain.gain.setValueAtTime(1, time + durationSec - rampTime);
  grainGain.gain.linearRampToValueAtTime(0, time + durationSec);
 
  const safeStart = Math.max(0, Math.min(posSeconds, audioBuffer.duration - 0.01));
  src.start(time, safeStart, durationSec / playbackRate);
  src.stop(time + durationSec + 0.05);
}
 
let reversedBufferCache = null;
function getReversedBuffer() {
  if (reversedBufferCache) return reversedBufferCache;
  const rev = audioCtx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const src = audioBuffer.getChannelData(ch);
    const dst = rev.getChannelData(ch);
    for (let i = 0; i < src.length; i++) {
      dst[i] = src[src.length - 1 - i];
    }
  }
  reversedBufferCache = rev;
  return rev;
}
 
function scheduler() {
  while (nextGrainTime < audioCtx.currentTime + LOOKAHEAD) {
    scheduleOneGrain(nextGrainTime);
    const density = parseFloat(densitySlider.value);
    nextGrainTime += 1 / density;
 
    const sprayAmt = parseFloat(spraySlider.value);
    if (sprayAmt > 0) {
      currentPlayhead += (Math.random() - 0.5) * sprayAmt * 0.05;
      currentPlayhead = Math.max(0, Math.min(1, currentPlayhead));
    }
  }
}
 
function scheduleOneGrain(time) {
  const grainSizeMs = parseFloat(grainSizeSlider.value);
  const durationSec = grainSizeMs / 1000;
 
  const spread = parseFloat(spreadSlider.value);
  let pos = currentPlayhead + (Math.random() * 2 - 1) * spread;
  pos = Math.max(0, Math.min(1, pos));
  const posSeconds = pos * audioBuffer.duration;
 
  const basePitch = parseFloat(pitchSlider.value);
  const pitchSpread = parseFloat(pitchSpreadSlider.value);
  const pitchOffset = (Math.random() * 2 - 1) * pitchSpread;
  const rate = semitonesToRate(basePitch + pitchOffset);
 
  const reverseChance = parseFloat(reverseSlider.value) / 100;
  const reverse = Math.random() < reverseChance;
 
  playGrain(time, posSeconds, durationSec, rate, reverse);
}
 
playBtn.addEventListener('click', () => {
  if (!audioBuffer || isPlaying) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
 
  isPlaying = true;
  nextGrainTime = audioCtx.currentTime + 0.05;
  currentPlayhead = parseFloat(positionSlider.value);
  schedulerTimer = setInterval(scheduler, SCHEDULE_INTERVAL);
 
  playBtn.disabled = true;
  stopBtn.disabled = false;
  statusText.textContent = 'granulating...';
});
 
stopBtn.addEventListener('click', () => {
  isPlaying = false;
  clearInterval(schedulerTimer);
  playBtn.disabled = false;
  stopBtn.disabled = true;
  statusText.textContent = `loaded (${audioBuffer.duration.toFixed(2)}s)`;
});
 