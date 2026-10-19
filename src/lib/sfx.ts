/**
 * Efek suara sederhana yang di-sintesis lewat Web Audio API.
 * Tidak butuh file aset / unduhan, jadi aman dipakai offline.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Ledakan bom: dentuman bass + desis noise yang cepat meredam. */
export function playBomb(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;

  // Dentuman bass: sinus frekuensi turun 120 → 35 Hz.
  const boom = ac.createOscillator();
  boom.type = "sine";
  boom.frequency.setValueAtTime(120, t);
  boom.frequency.exponentialRampToValueAtTime(35, t + 0.35);
  const boomGain = ac.createGain();
  boomGain.gain.setValueAtTime(0.9, t);
  boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  boom.connect(boomGain).connect(ac.destination);
  boom.start(t);
  boom.stop(t + 0.65);

  // Desis ledakan: white noise melewati lowpass yang ikut turun.
  const len = Math.floor(ac.sampleRate * 0.8);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buf;

  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(2400, t);
  lp.frequency.exponentialRampToValueAtTime(180, t + 0.6);

  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.7, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

  noise.connect(lp).connect(noiseGain).connect(ac.destination);
  noise.start(t);
  noise.stop(t + 0.8);
}

/** Mahkota: arpeggio ceria naik (do–mi–sol–do') dengan nada lembut. */
export function playCrown(): void {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  const step = 0.1;

  notes.forEach((freq, i) => {
    const t = t0 + i * step;

    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

    // Nada atas yang sedikit bergema agar terasa "kilau mahkota".
    const sparkle = ac.createOscillator();
    sparkle.type = "sine";
    sparkle.frequency.setValueAtTime(freq * 2, t);
    const sparkleGain = ac.createGain();
    sparkleGain.gain.setValueAtTime(0.0001, t);
    sparkleGain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    osc.connect(g).connect(ac.destination);
    sparkle.connect(sparkleGain).connect(ac.destination);

    osc.start(t);
    osc.stop(t + 0.55);
    sparkle.start(t);
    sparkle.stop(t + 0.45);
  });

  // Akor penutup lembut di nada dasar.
  const t = t0 + notes.length * step;
  const final = ac.createOscillator();
  final.type = "sine";
  final.frequency.setValueAtTime(1046.5, t);
  const finalGain = ac.createGain();
  finalGain.gain.setValueAtTime(0.0001, t);
  finalGain.gain.exponentialRampToValueAtTime(0.3, t + 0.03);
  finalGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  final.connect(finalGain).connect(ac.destination);
  final.start(t);
  final.stop(t + 0.75);
}
