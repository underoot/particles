const SIGNAL_RUN = 0;
const SIGNAL_PAUSE = 1;
const SIGNAL_READY = 2;

console.log('worker created');

let sabParticles;
let sabSignals;
let id;
let chunkSize;
let chunkOffset;
let stride;
let sabSimData;
let sabPixels;

onmessage = (event) => {
  if (event.data.id) {
    sabParticles = event.data.sabParticles;
    sabSignals = event.data.sabSignals;
    id = event.data.id;
    chunkSize = event.data.chunkSize;
    chunkOffset = event.data.chunkOffset;
    stride = event.data.stride;
    sabSimData = event.data.sabSimData;
    sabPixels = event.data.sabPixels;
  }

  const particlesView = new Float32Array(sabParticles);
  const signalsView = new Uint8Array(sabSignals);
  const simDataView = new Float32Array(sabSimData);
  const pixelsView = new Uint8Array(sabPixels);
  const dt = () => simDataView[0];
  const input = () => [simDataView[1], simDataView[2], !!simDataView[3], simDataView[4], simDataView[5]];
  signalsView[id] = SIGNAL_READY;

  const delta = dt();
  const decay = 1 / (1 + delta);
  const [mx, my, isTouch, width, height] = input();


  const buffStride = width * height * 3
  pixelsView.fill(0, buffStride * id, buffStride * id + buffStride);
  for (let i = chunkOffset; i < chunkOffset + chunkSize; i++) {
    let x = particlesView[i * stride];
    let y = particlesView[i * stride + 1];
    let dx = particlesView[i * stride + 2] * decay;
    let dy = particlesView[i * stride + 3] * decay;

    if (isTouch) {
      const tx = mx - x;
      const ty = my - y;
      const dist = Math.sqrt((tx ** 2) + (ty ** 2));
      const dirX = tx / dist;
      const dirY = ty / dist;
      const force = 3 * Math.min(1920, 25830000 / (dist ** 2));
      dx += dirX * force * delta;
      dy += dirY * force * delta;
    }

    x += dx * delta;
    y += dy * delta;

    particlesView[i * stride] = x;
    particlesView[i * stride + 1] = y;
    particlesView[i * stride + 2] = dx;
    particlesView[i * stride + 3] = dy;

    if (x < 0 || x >= width) continue;
    if (y < 0 || y >= height) continue;
    const pixelIndex = ((y | 0) * width + (x | 0)) * 3;
    const rx = x / width;
    const ry = y / height;

    pixelsView[buffStride * id + pixelIndex] += 25 + 50 * rx; // R;
    pixelsView[buffStride * id + pixelIndex + 1] += 40 + 50 * ry; // G
    pixelsView[buffStride * id + pixelIndex + 2] += 65 + 50 * (1 - rx); // B
  }

  self.postMessage({ id: SIGNAL_READY });
}