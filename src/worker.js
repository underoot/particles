const SIGNAL_RUN = 0;
const SIGNAL_PAUSE = 1;
const SIGNAL_READY = 2;

console.log('worker created');

onmessage = (event) => {
  const {
    sabParticles,
    sabSignals,
    id,
    chunkSize,
    chunkOffset,
    stride,
    sabSimData
  } = event.data;

  const particlesView = new Float32Array(sabParticles);
  const signalsView = new Uint8Array(sabSignals);
  const simDataView = new Float32Array(sabSimData);
  const dt = () => simDataView[0];
  signalsView[id] = SIGNAL_READY;

  console.log(`worker init ${id}`);

  setInterval(() => {
    if (signalsView[id] !== SIGNAL_RUN) return;
    const delta = dt();
    for (let i = chunkOffset; i < chunkOffset + chunkSize; i++) {
      particlesView[i * stride] += particlesView[i * stride + 2] * delta * 3;
      particlesView[i * stride + 1] += particlesView[i * stride + 3] * delta * 3;
    }

    signalsView[id] = SIGNAL_READY;
  }, 1);
}