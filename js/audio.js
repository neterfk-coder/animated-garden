/* ============================================================
   AMBIENTE SONORO — paisaje generativo con Web Audio.
     · pad de cuerdas cuyo acorde refleja el ÁNIMO COLECTIVO
       del jardín (media de sentimientos): mayor si es alegre,
       menor si es melancólico, suspendido si es neutro.
     · viento: ruido filtrado que sube con las ráfagas y al regar.
     · tañido suave al germinar cada planta (nota según su ánimo).
   El sonido arranca solo tras un gesto del usuario (política de
   autoplay). Estado on/off recordado en localStorage.
   ============================================================ */

const Ambience = (() => {
  const KEY = "jardin-semantico:sound";
  const MASTER = 0.55;

  let actx = null, master = null, pad = [], padFilter = null;
  let windGain = null, windFilter = null;
  let built = false;
  let enabled = localStorage.getItem(KEY) === "1";
  let tickTimer = null;

  const A2 = 110; // la grave de referencia
  function currentMoodChord() {
    const ps = (window.Garden && Garden.plants) || [];
    let avg = 0;
    if (ps.length) avg = ps.reduce((s, p) => s + (p.genome.sentiment || 0), 0) / ps.length;
    // raíz que sube un poco con el ánimo positivo
    const root = A2 * Math.pow(2, (avg * 3 + 3) / 12); // ~A2..C3 aprox
    let ratios;
    if (avg > 0.15) ratios = [1, 5 / 4, 3 / 2, 2];        // mayor, luminoso
    else if (avg < -0.15) ratios = [1, 6 / 5, 3 / 2, 9 / 5]; // menor, melancólico
    else ratios = [1, 9 / 8, 3 / 2, 2];                   // suspendido, sereno
    return ratios.map((r) => root * r);
  }

  function build() {
    if (built) return;
    built = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();

    master = actx.createGain();
    master.gain.value = 0;
    master.connect(actx.destination);

    // ---- pad ----
    padFilter = actx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 640;
    padFilter.Q.value = 0.6;
    const padOut = actx.createGain();
    padOut.gain.value = 0.09;
    padFilter.connect(padOut);
    padOut.connect(master);

    const chord = currentMoodChord();
    pad = chord.map((f, i) => {
      const o = actx.createOscillator();
      o.type = i === 0 ? "sine" : "triangle";
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 7;
      const g = actx.createGain();
      g.gain.value = 0.55 / chord.length;
      // respiración lenta del acorde
      const lfo = actx.createOscillator();
      lfo.frequency.value = 0.045 + Math.random() * 0.06;
      const lg = actx.createGain();
      lg.gain.value = 0.22 / chord.length;
      lfo.connect(lg); lg.connect(g.gain); lfo.start();
      o.connect(g); g.connect(padFilter); o.start();
      return { o, g };
    });

    // ---- viento (ruido filtrado) ----
    const buf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = actx.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    windFilter = actx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 480;
    windFilter.Q.value = 0.7;
    windGain = actx.createGain();
    windGain.gain.value = 0.0;
    noise.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
    noise.start();

    tickTimer = setInterval(tick, 200);
  }

  // adapta pad y viento al estado del jardín
  let moodRetuneAt = 0;
  function tick() {
    if (!actx || actx.state !== "running") return;
    const now = actx.currentTime;

    // reafinar el acorde al ánimo colectivo cada ~8 s, con glissando suave
    if (performance.now() > moodRetuneAt && pad.length) {
      moodRetuneAt = performance.now() + 8000;
      const chord = currentMoodChord();
      pad.forEach((v, i) => {
        if (chord[i]) v.o.frequency.linearRampToValueAtTime(chord[i], now + 3.5);
      });
    }

    // viento: base + ráfaga + regar
    const gust = (window.Garden && Garden.gustNow) || 0;
    const wind = Math.abs((window.Garden && Garden.windNow) || 0);
    const watering = window.Garden && Garden.watering && Garden.watering.spraying;
    const target = 0.02 + gust * 0.12 + (wind - 0.55) * 0.05 + (watering ? 0.14 : 0);
    windGain.gain.setTargetAtTime(Math.max(0, target), now, 0.4);
    windFilter.frequency.setTargetAtTime(420 + gust * 520 + (watering ? 700 : 0), now, 0.5);
  }

  function fadeTo(v, secs) {
    if (!master) return;
    const now = actx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(v, now + secs);
  }

  async function enable() {
    build();
    if (!actx) return;
    if (actx.state === "suspended") { try { await actx.resume(); } catch {} }
    enabled = true;
    localStorage.setItem(KEY, "1");
    fadeTo(MASTER, 1.4);
    document.dispatchEvent(new CustomEvent("sound-change", { detail: { on: true } }));
  }
  function disable() {
    enabled = false;
    localStorage.setItem(KEY, "0");
    fadeTo(0, 0.8);
    document.dispatchEvent(new CustomEvent("sound-change", { detail: { on: false } }));
  }
  function toggle() { enabled ? disable() : enable(); }

  /* tañido al germinar: campana suave afinada al ánimo de la planta */
  function chime(genome) {
    if (!enabled || !actx || actx.state !== "running") return;
    const now = actx.currentTime;
    const s = genome ? genome.sentiment : 0;
    // pentatónica: notas más agudas y alegres si el ánimo es positivo
    const scale = [0, 2, 4, 7, 9, 12];
    const deg = scale[Math.max(0, Math.min(scale.length - 1, Math.round((s + 1) / 2 * (scale.length - 1))))];
    const base = 440 * Math.pow(2, (deg - 3) / 12);
    for (const [mult, gain, dur] of [[1, 0.14, 2.2], [2, 0.05, 1.6], [3, 0.025, 1.1]]) {
      const o = actx.createOscillator();
      o.type = "sine";
      o.frequency.value = base * mult;
      const g = actx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g); g.connect(master);
      o.start(now); o.stop(now + dur + 0.1);
    }
  }

  // reanudar el contexto si el navegador lo suspende tras un gesto
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && enabled && actx && actx.state === "suspended") actx.resume().catch(() => {});
  });

  /* ---------- Botón e integración con la interfaz ---------- */
  function syncButton() {
    const btn = document.getElementById("sound-toggle");
    if (!btn) return;
    btn.classList.toggle("is-on", enabled);
    btn.classList.toggle("is-off", !enabled);
    btn.setAttribute("aria-pressed", String(enabled));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("sound-toggle");
    if (btn) btn.addEventListener("click", () => { toggle(); syncButton(); });
    syncButton();
  });
  document.addEventListener("sound-change", syncButton);

  // si el usuario lo tenía activado, reanuda al primer gesto (autoplay)
  if (localStorage.getItem(KEY) === "1") {
    const once = () => { enable().then(syncButton); window.removeEventListener("pointerdown", once); };
    window.addEventListener("pointerdown", once, { once: true });
  }

  return {
    toggle, enable, disable, chime,
    get on() { return enabled; },
    get wanted() { return localStorage.getItem(KEY) === "1"; },
    get state() { return actx ? actx.state : "none"; },
    get level() { return master ? master.gain.value : 0; },
  };
})();
