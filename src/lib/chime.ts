/**
 * Sons curtinhos gerados na hora com a Web Audio API (sem arquivos de áudio):
 * um "plim" subindo para voltar ao foco e descendo para a pausa.
 */
let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  // Navegadores só liberam som depois de um clique; chamar no clique de "Começar" já destrava.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Chame dentro de um clique do usuário para o navegador liberar o som mais tarde. */
export function unlockAudio() {
  audio();
}

export function playChime(kind: "focus" | "break") {
  const ac = audio();
  if (!ac) return;
  const notes = kind === "focus" ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];
  notes.forEach((freq, i) => {
    const start = ac.currentTime + i * 0.16;
    for (const [mult, peak] of [
      [1, 0.16],
      [2, 0.04],
    ]) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * mult;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.3);
      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(start + 1.4);
    }
  });
}
