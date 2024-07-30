const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const SIGNAL_RUN = 0;
const SIGNAL_PAUSE = 1;
const SIGNAL_READY = 2;
const PARTICLE_COUNT = 20_000_000;
const CPU_CORES = navigator.hardwareConcurrency;
const chunkSize = Math.floor(PARTICLE_COUNT / CPU_CORES);
const workerPool = [];

const stride = 4; // x, y, dx, dy
const byte_stride = stride * 4;
const sabParticles = new SharedArrayBuffer(PARTICLE_COUNT * byte_stride);
const sabViewParticles = window.sabViewParticles = new Float32Array(sabParticles);
const sabSignals = new SharedArrayBuffer(CPU_CORES);
const sabViewSignals = new Uint8Array(sabSignals);
// dt + mouse x + mouse y + touch down + screen width + screen height
const sabSimData = new SharedArrayBuffer(4 + 4 + 4 + 4 + 4 + 4);
const sabPixels = new SharedArrayBuffer(CPU_CORES * window.innerWidth * window.innerHeight * 3);
const sabViewSimData = new Float32Array(sabSimData);
const sabViewPixels = new Uint8Array(sabPixels);

let backbuffer = new ImageData(window.innerWidth, window.innerHeight);

sabViewSimData[4] = window.innerWidth;
sabViewSimData[5] = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  backbuffer = new ImageData(canvas.width, canvas.height);
  sabViewSimData[4] = window.innerWidth;
  sabViewSimData[5] = window.innerHeight;
});
window.addEventListener('mousemove', (e) => {
  sabViewSimData[1] = e.clientX;
  sabViewSimData[2] = e.clientY;
});
window.addEventListener('mousedown', () => {
  sabViewSimData[3] = 1;
});
window.addEventListener('mouseup', () => {
  sabViewSimData[3] = 0;
})

for (let i = 0; i < PARTICLE_COUNT; i++) {
  sabViewParticles[i * stride] = Math.random() * canvas.width;
  sabViewParticles[i * stride + 1] = Math.random() * canvas.height;
  sabViewParticles[i * stride + 2] = (Math.random() * 2 - 1) * 10;
  sabViewParticles[i * stride + 3] = (Math.random() * 2 - 1) * 10;
}

function render() {
  const width = canvas.width;
  const height = canvas.height;

  const pixelStride = width * height * 3;

  for (let i = 0; i < width * height; i++) {
    let r = 0;
    let g = 0;
    let b = 0;

    for (let j = 0; j < CPU_CORES; j++) {
      const s = pixelStride * j;
      r += sabViewPixels[s + i * 3];
      g += sabViewPixels[s + i * 3 + 1];
      b += sabViewPixels[s + i * 3 + 2];
    }

    backbuffer.data[i * 4] = r;
    backbuffer.data[i * 4 + 1] = g;
    backbuffer.data[i * 4 + 2] = b;
    backbuffer.data[i * 4 + 3] = 255;
  }

  context.putImageData(backbuffer, 0, 0);
}

let lastTime = 1;
function run(currentTime) {
  const dt = Math.min(1, (currentTime - lastTime) / 1000);
  lastTime = currentTime;
  sabViewSimData[0] = dt;
  for (let i = 0; i < CPU_CORES; i++) {
    sabViewSignals[i] = SIGNAL_RUN;
  }
  render();
  requestAnimationFrame(run);
}

for (let i = 0; i < CPU_CORES; i++) {
  const worker = new Worker('./src/worker.js');
  workerPool.push(worker);
  worker.postMessage({
    sabParticles,
    sabSignals,
    id: i,
    chunkSize,
    chunkOffset: chunkSize * i,
    stride,
    sabSimData,
    sabPixels: sabPixels
  });
}

const handle = setInterval(() => {
  console.log('waiting for workers...', sabViewSignals);
  if (sabViewSignals[sabViewSignals.length - 1] !== SIGNAL_READY) {
    return;
  }
  clearInterval(handle);
  requestAnimationFrame(run);
}, 100);