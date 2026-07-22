/* ============================================================
   JARDÍN — motor de render y atmósfera.
     · germinación animada (crecimiento progresivo)
     · viento del oeste: todo se mece hacia la izquierda
     · estelas de viento, pétalos y semillas que vuelan
     · ciclo día/noche del invernadero
     · polen flotante
     · goteo (frases con puntos suspensivos…)
     · raíces entrelazadas entre plantas de significado afín
     · 15 especies con corolas propias (rosas, gemas, vilanos…)
   ============================================================ */

const Garden = (() => {
  const canvas = document.getElementById("garden");
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0, dpr = 1, groundY = 0;
  let plants = [];        // {id, phrase, genome, geo, x, phase, bornAt, mine}
  let kinLinks = [];      // {a, b, strength}
  let pollen = [];
  let drops = [];
  let petals = [];        // pétalos y semillas arrastrados por el viento
  let gusts = [];         // estelas visibles de viento
  let grass = [];         // briznas de pasto en dos capas
  let bees = [];          // abejas recolectoras
  let startTime = performance.now();
  let windNow = -0.7;     // negativo = hacia la izquierda
  let gustNow = 0;        // 0..1, intensidad de la corriente de aire marcada
  let airCurrents = [];   // estelas elegantes de la corriente, con parallax
  let lastGustCycle = -1;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Corriente de aire marcada, cada 5 s ---------- */
  const GUST_PERIOD = 5000;    // cadencia de la corriente
  const GUST_DURATION = 2200;  // cuánto dura cada pasada
  const GUST_STRENGTH = 2.0;   // empuje extra hacia la izquierda en su punto álgido

  function gustEnvelope(elapsed) {
    const cyclePos = elapsed % GUST_PERIOD;
    // media onda de seno: sube y baja con suavidad, sin golpes secos
    return cyclePos < GUST_DURATION ? Math.sin(Math.PI * (cyclePos / GUST_DURATION)) : 0;
  }

  function spawnAirCurrents(t) {
    if (reduceMotion) return;
    for (let depth = 0; depth < 3; depth++) {
      const n = 2 + depth;
      for (let i = 0; i < n; i++) {
        airCurrents.push({
          x: W + Math.random() * 240,
          y: H * (0.1 + Math.random() * 0.62),
          len: 100 + Math.random() * 150 - depth * 22,
          speed: 2.4 + depth * 1.15 + Math.random() * 0.7,
          amp: 7 + Math.random() * 11,
          ph: Math.random() * Math.PI * 2,
          depth,
          spawnT: t,
        });
      }
    }
  }

  function drawAirCurrents(t) {
    for (let i = airCurrents.length - 1; i >= 0; i--) {
      const c = airCurrents[i];
      c.x -= c.speed;
      const age = t - c.spawnT;
      if (c.x < -c.len - 60 || age > GUST_DURATION + 900) { airCurrents.splice(i, 1); continue; }

      const alpha = (0.11 + c.depth * 0.075) * gustNow;
      if (alpha < 0.004) continue;

      const wob = Math.sin(t * 0.0026 + c.ph) * c.amp * 0.3;
      const x2 = c.x - c.len, y2 = c.y + wob;
      const midX = (c.x + x2) / 2, midY = c.y + wob * 1.7;

      // halo suave detrás, luego el hilo nítido encima — se lee como
      // una corriente de aire visible, no una simple línea
      for (const [w, a] of [[3.6 + c.depth, alpha * 0.4], [1 + c.depth * 0.55, alpha]]) {
        const grad = ctx.createLinearGradient(c.x, c.y, x2, y2);
        grad.addColorStop(0, "rgba(224, 236, 222, 0)");
        grad.addColorStop(0.32, `rgba(224, 236, 222, ${a})`);
        grad.addColorStop(0.68, `rgba(224, 236, 222, ${a})`);
        grad.addColorStop(1, "rgba(224, 236, 222, 0)");
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        ctx.strokeStyle = grad;
        ctx.lineWidth = w;
        ctx.stroke();
      }
    }
  }

  /* ---------- Viento del oeste ---------- */
  function windField(t) {
    // brisa constante + ráfagas lentas de fondo; siempre sopla a la izquierda
    const slow = Math.sin(t * 0.00021);
    const gust = Math.sin(t * 0.00063 + 1.7) * Math.sin(t * 0.00017 + 0.4);
    const base = -(0.55 + Math.max(0, slow) * 0.5 + Math.max(0, gust) * 0.9);

    // corriente marcada, con cadencia fija de 5 s
    const elapsed = t - startTime;
    gustNow = gustEnvelope(elapsed);
    const cycle = Math.floor(elapsed / GUST_PERIOD);
    if (cycle !== lastGustCycle) { lastGustCycle = cycle; spawnAirCurrents(t); }

    return base - gustNow * GUST_STRENGTH;
  }

  /* ---------- Paleta según especie y ánimo ---------- */
  const SPECIES_TINT = {
    cactus:     [96, 122, 88],
    bambu:      [122, 148, 74],
    girasol:    [104, 142, 84],
    hongo:      [186, 176, 152],
    diente:     [128, 152, 118],
    rubi:       [122, 84, 96],
    zafiro:     [84, 96, 138],
    ambar:      [138, 116, 74],
    rosa:       [110, 140, 104],
    lavanda:    [112, 138, 118],
    orquidea:   [118, 134, 112],
    enredadera: [100, 136, 96],
    loto:       [96, 140, 110],
  };
  function stemColor(g, light) {
    let r, gr, b;
    const tint = SPECIES_TINT[g.species];
    if (tint)                        { [r, gr, b] = tint; }
    else if (g.sentiment > 0.25)     { r = 122; gr = 158; b = 118; }
    else if (g.sentiment < -0.25)    { r = 104; gr = 112; b = 148; } // violeta pizarra
    else                             { r = 111; gr = 146; b = 126; }
    const L = 0.75 + light * 0.35;
    return `rgb(${(r*L)|0}, ${(gr*L)|0}, ${(b*L)|0})`;
  }
  function leafColor(g, alpha) {
    if (g.species === "lavanda") return `rgba(148, 162, 178, ${alpha})`;
    if (g.species === "loto")    return `rgba(110, 162, 128, ${alpha})`;
    if (g.sentiment > 0.25)  return `rgba(158, 196, 142, ${alpha})`;
    if (g.sentiment < -0.25) return `rgba(133, 142, 178, ${alpha})`;
    return `rgba(127, 169, 142, ${alpha})`;
  }
  function bloomColor(g) {
    // pétalos: cálidos si la alegría es alta, ámbar si es serena
    return g.sentiment > 0.55 ? "rgba(214, 138, 152, 0.9)" : "rgba(227, 199, 102, 0.9)";
  }

  /* ---------- Estilo de corola ---------- */
  const STYLE_BY_SPECIES = {
    flor: "petal", rosa: "rose", girasol: "sun", lavanda: "spike",
    rubi: "gem", zafiro: "gem", ambar: "gem", orquidea: "orchid",
    diente: "puff", hongo: "cap", enredadera: "petal", loto: "lotus",
  };
  function styleOf(g) {
    return g.bloomStyle || STYLE_BY_SPECIES[g.species] || "petal";
  }
  const GEM_RGB = {
    rubi:   [214, 68, 104],
    zafiro: [96, 128, 224],
    ambar:  [228, 168, 62],
  };
  function petalRGBA(style, g) {
    switch (style) {
      case "rose":   return "rgba(206, 88, 118,";
      case "orchid": return "rgba(224, 178, 208,";
      case "sun":    return "rgba(232, 190, 60,";
      default:
        return g.sentiment > 0.55 ? "rgba(214, 138, 152," : "rgba(227, 199, 102,";
    }
  }

  /* ---------- Tamaño ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H * 0.8;
    seedGrass();
  }

  /* ---------- Pasto ---------- */
  function seedGrass() {
    const n = Math.floor(W / 4.5);
    grass = Array.from({ length: n }, () => ({
      x: Math.random() * W,
      yOff: Math.random() * (H - groundY) * 0.45,
      h: 6 + Math.random() * 14,
      tone: Math.random(),
      ph: Math.random() * Math.PI * 2,
      layer: Math.random() < 0.45 ? 0 : 1, // 0 = fondo (más oscuro)
    }));
  }

  window.addEventListener("resize", resize);
  resize();

  /* ---------- Polen ---------- */
  function seedPollen() {
    pollen = Array.from({ length: reduceMotion ? 0 : 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.6 + Math.random() * 1.6,
      s: 0.15 + Math.random() * 0.5,
      p: Math.random() * Math.PI * 2,
    }));
  }
  seedPollen();

  /* ---------- Estelas de viento ---------- */
  function seedGusts() {
    gusts = Array.from({ length: reduceMotion ? 0 : 7 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.7,
      len: 60 + Math.random() * 130,
      sp: 1.4 + Math.random() * 2.2,
      a: 0.05 + Math.random() * 0.06,
      ph: Math.random() * Math.PI * 2,
    }));
  }
  seedGusts();

  /* ---------- Afinidad semántica (raíces) ---------- */
  function bagOfWords(phrase) {
    const stop = new Set(LEXICON.stopwords);
    const bag = new Map();
    for (const t of Semantics.tokenize(phrase)) {
      if (stop.has(t) || t.length < 3) continue;
      bag.set(t, (bag.get(t) || 0) + 1);
    }
    return bag;
  }
  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (const [, v] of a) na += v * v;
    for (const [, v] of b) nb += v * v;
    for (const [k, v] of a) if (b.has(k)) dot += v * b.get(k);
    if (!na || !nb) return 0;
    return dot / Math.sqrt(na * nb);
  }
  function recomputeKinship() {
    kinLinks = [];
    const bags = plants.map(p => bagOfWords(p.phrase || p.genome.keyword || ""));
    for (let i = 0; i < plants.length; i++) {
      for (let j = i + 1; j < plants.length; j++) {
        const s = cosine(bags[i], bags[j]);
        if (s > 0.28) kinLinks.push({ a: i, b: j, strength: s });
      }
    }
  }
  function kinOf(index) {
    return kinLinks.filter(l => l.a === index || l.b === index).length;
  }

  /* ---------- Añadir planta ---------- */
  function addPlant(record, { mine = false, animate = true } = {}) {
    const genome = record.genome;
    const geo = LSystem.build(genome);
    const plant = {
      id: record.id,
      phrase: record.phrase,
      created_at: record.created_at,
      genome, geo,
      x: typeof record.x === "number" ? record.x : 0.08 + Math.random() * 0.84,
      phase: Math.random() * Math.PI * 2,
      bornAt: animate ? performance.now() : performance.now() - CONFIG.GERMINATION_MS,
      mine,
    };
    plants.push(plant);
    if (plants.length > CONFIG.MAX_PLANTS) plants.shift();
    recomputeKinship();
    return plant;
  }

  /* ---------- Escala de una planta ---------- */
  function plantTransform(p) {
    const desired = H * 0.16 + p.genome.height * H * 0.30;
    const raw = Math.max(24, -p.geo.bounds.minY);
    const scale = desired / raw;
    return { baseX: p.x * W, baseY: groundY, scale };
  }

  /* ---------- Vaivén: brisa + arqueo hacia la izquierda ---------- */
  // lx, ly: coordenadas LOCALES (sin escalar, espacio del genoma) del
  // punto que se está dibujando — permiten que la sacudida del agua
  // se sienta solo donde de verdad cayó la gota, no en toda la planta.
  const IMPACT_LIFE = 1400;     // ms que dura la sacudida de un impacto
  const IMPACT_RADIUS = 20;     // alcance del impacto en unidades locales

  function sway(p, px, py, t, lx = 0, ly = 0) {
    if (reduceMotion) return px;
    const heightFactor = Math.max(0, (groundY - py)) / H;
    const flutter = Math.sin(t * 0.0011 + p.phase + (groundY - py) * 0.012);
    const bend = windNow * 16 * Math.pow(heightFactor, 1.25) * (1 + p.genome.complexity * 0.5);

    // sacudida localizada: cada gota que golpeó la planta deja una
    // pequeña onda que se atenúa con la distancia (al punto exacto
    // del impacto) y con el tiempo transcurrido.
    let shake = 0;
    if (p.impacts && p.impacts.length) {
      for (const imp of p.impacts) {
        const age = t - imp.t0;
        if (age < 0 || age > IMPACT_LIFE) continue;
        const dx = lx - imp.lx, dy = ly - imp.ly;
        const dist2 = dx * dx + dy * dy;
        const spatial = Math.exp(-dist2 / (2 * IMPACT_RADIUS * IMPACT_RADIUS));
        if (spatial < 0.02) continue;
        const timeFalloff = 1 - age / IMPACT_LIFE;
        // ondulación lenta y delicada, no un temblor rápido
        shake += Math.sin(age * 0.016 + dist2 * 0.002) * imp.amp * spatial * timeFalloff * timeFalloff;
      }
    }
    return px + bend + shake + flutter * 5 * heightFactor * (1 - windNow * 0.5);
  }

  /* ---------- Ciclo día/noche del invernadero ---------- */
  function skyLight(t) {
    // ciclo de 100 s: 0 = noche cerrada, 1 = amanecer verdoso
    return 0.5 + 0.5 * Math.sin((t / 100000) * Math.PI * 2);
  }

  function drawSky(light) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const topR = 7 + light * 8, topG = 13 + light * 20, topB = 10 + light * 16;
    g.addColorStop(0, `rgb(${topR|0}, ${topG|0}, ${topB|0})`);
    g.addColorStop(1, `rgb(${10 + light*6|0}, ${18 + light*10|0}, ${14 + light*8|0})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // luna / lámpara del invernadero
    const mx = W * 0.82, my = H * 0.16;
    const halo = ctx.createRadialGradient(mx, my, 4, mx, my, 130);
    halo.addColorStop(0, `rgba(227, 199, 102, ${0.20 + light * 0.10})`);
    halo.addColorStop(1, "rgba(227, 199, 102, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(mx - 140, my - 140, 280, 280);
    ctx.beginPath();
    ctx.arc(mx, my, 13, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230, 224, 196, ${0.55 + light * 0.3})`;
    ctx.fill();
  }

  function drawGusts(t, light) {
    for (const g of gusts) {
      g.x += windNow * g.sp;
      if (g.x < -g.len - 20) {
        g.x = W + 20;
        g.y = Math.random() * H * 0.7;
        g.len = 60 + Math.random() * 130;
      }
      const bow = Math.sin(t * 0.001 + g.ph) * 8;
      ctx.beginPath();
      ctx.moveTo(g.x + g.len, g.y);
      ctx.quadraticCurveTo(g.x + g.len * 0.5, g.y + bow, g.x, g.y + bow * 0.4);
      ctx.strokeStyle = `rgba(216, 228, 214, ${g.a * (0.5 + light * 0.5) * Math.min(1, -windNow)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawGround(light) {
    // pradera: banda de verde profundo que se funde con la tierra
    const g = ctx.createLinearGradient(0, groundY - 24, 0, H);
    g.addColorStop(0, "rgba(24, 46, 30, 0)");
    g.addColorStop(0.18, `rgba(22, 44, 28, ${0.85 + light * 0.1})`);
    g.addColorStop(0.55, "rgba(14, 30, 19, 0.96)");
    g.addColorStop(1, "rgb(7, 14, 9)");
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY - 24, W, H - groundY + 24);

    // resplandor suave del horizonte del prado
    const glow = ctx.createLinearGradient(0, groundY - 14, 0, groundY + 10);
    glow.addColorStop(0, "rgba(110, 158, 104, 0)");
    glow.addColorStop(0.5, `rgba(110, 158, 104, ${0.07 + light * 0.06})`);
    glow.addColorStop(1, "rgba(110, 158, 104, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, groundY - 14, W, 24);
  }

  function drawGrass(layer, t, light) {
    for (const b of grass) {
      if (b.layer !== layer) continue;
      const y0 = groundY + 2 + b.yOff;
      const bend = reduceMotion ? 0
        : windNow * (b.h * 0.42) + Math.sin(t * 0.0016 + b.ph) * 1.6;
      const dark = b.layer === 0;
      const g1 = dark ? 56 + b.tone * 18 : 84 + b.tone * 26;
      const g2 = dark ? 88 + b.tone * 22 : 132 + b.tone * 30;
      const g3 = dark ? 60 + b.tone * 14 : 86 + b.tone * 22;
      const alpha = (dark ? 0.5 : 0.72) * (0.65 + light * 0.35);
      ctx.beginPath();
      ctx.moveTo(b.x, y0);
      ctx.quadraticCurveTo(b.x + bend * 0.3, y0 - b.h * 0.6, b.x + bend, y0 - b.h);
      ctx.strokeStyle = `rgba(${g1|0}, ${g2|0}, ${g3|0}, ${alpha})`;
      ctx.lineWidth = dark ? 1 : 1.25;
      ctx.stroke();
    }
  }

  /* ---------- Raíces afines ---------- */
  function drawRoots(t) {
    for (const link of kinLinks) {
      const pa = plants[link.a], pb = plants[link.b];
      if (!pa || !pb) continue;
      const A = plantTransform(pa), B = plantTransform(pb);
      const midX = (A.baseX + B.baseX) / 2;
      const dip = 26 + Math.abs(A.baseX - B.baseX) * 0.06
                + Math.sin(t * 0.0006 + link.a) * 4;
      ctx.beginPath();
      ctx.moveTo(A.baseX, groundY + 4);
      ctx.quadraticCurveTo(midX, groundY + dip, B.baseX, groundY + 4);
      ctx.strokeStyle = `rgba(123, 134, 176, ${0.14 + link.strength * 0.3})`;
      ctx.lineWidth = 1 + link.strength * 1.6;
      ctx.stroke();
    }
  }

  /* ---------- Corolas por estilo ---------- */
  function drawBloom(p, b, bx, by, t) {
    const g = p.genome;
    const style = styleOf(g);
    const R = (b.big ? 6.4 : 3.2) + Math.max(0, g.sentiment) * 2.2;

    switch (style) {
      case "rose": {
        // dos coronas de pétalos apretados + botón dorado
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + t * 0.00015;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(a) * R, by + Math.sin(a) * R, R * 0.95, R * 0.55, a, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(206, 88, 118, 0.9)";
          ctx.fill();
        }
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 - t * 0.0002;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(a) * R * 0.45, by + Math.sin(a) * R * 0.45, R * 0.6, R * 0.4, a, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(168, 58, 92, 0.95)";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(bx, by, R * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(201, 162, 39, 0.95)";
        ctx.fill();
        break;
      }

      case "sun": {
        // girasol: rayos dorados alrededor de un disco oscuro
        const R2 = b.big ? 10 : 6;
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2 + t * 0.0001;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(a) * R2, by + Math.sin(a) * R2, R2 * 0.85, R2 * 0.3, a, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(232, 190, 60, 0.92)";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(bx, by, R2 * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(96, 66, 38, 0.98)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx - R2 * 0.2, by - R2 * 0.2, R2 * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(140, 100, 54, 0.9)";
        ctx.fill();
        break;
      }

      case "gem": {
        // flor-gema facetada con destello pulsante
        const [gr, gg, gb] = GEM_RGB[g.species] || [200, 200, 200];
        const s = R * 1.1;
        ctx.beginPath();
        ctx.moveTo(bx, by - s * 1.4);
        ctx.lineTo(bx + s * 0.9, by - s * 0.2);
        ctx.lineTo(bx + s * 0.5, by + s * 0.8);
        ctx.lineTo(bx - s * 0.5, by + s * 0.8);
        ctx.lineTo(bx - s * 0.9, by - s * 0.2);
        ctx.closePath();
        ctx.fillStyle = `rgba(${gr}, ${gg}, ${gb}, 0.88)`;
        ctx.fill();
        // facetas
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.9, by - s * 0.2);
        ctx.lineTo(bx + s * 0.9, by - s * 0.2);
        ctx.moveTo(bx, by - s * 1.4);
        ctx.lineTo(bx, by + s * 0.8);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // destello
        const tw = 0.5 + 0.5 * Math.sin(t * 0.004 + bx * 0.3);
        ctx.beginPath();
        ctx.arc(bx - s * 0.3, by - s * 0.55, 1.3 + tw, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + tw * 0.45})`;
        ctx.fill();
        break;
      }

      case "spike": {
        // espiga de lavanda: racimo de florecitas violetas
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + b.x;
          const rr = 1.4 + (k % 3) * 1.6;
          ctx.beginPath();
          ctx.arc(bx + Math.cos(a) * rr, by + Math.sin(a) * rr * 1.6 - 2, 1.7, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(150, 122, 196, 0.9)";
          ctx.fill();
        }
        break;
      }

      case "orchid": {
        // tres pétalos anchos y un labelo más intenso
        for (const rot of [-0.7, 0, 0.7]) {
          ctx.beginPath();
          ctx.ellipse(bx + rot * R * 0.7, by - R * 0.3, R * 0.8, R * 0.45, rot, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(224, 178, 208, 0.92)";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(bx, by + R * 0.4, R * 0.5, R * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(186, 92, 148, 0.95)";
        ctx.fill();
        break;
      }

      case "puff": {
        // vilano de diente de león: esfera de semillas al viento
        const R2 = b.big ? 11 : 7;
        ctx.strokeStyle = "rgba(226, 232, 222, 0.5)";
        ctx.lineWidth = 0.7;
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const ex = bx + Math.cos(a) * R2, ey = by + Math.sin(a) * R2;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(ex, ey, 0.9, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(236, 240, 232, 0.85)";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(216, 228, 214, 0.9)";
        ctx.fill();
        break;
      }

      case "lotus": {
        // flor de loto: tres coronas de pétalos apuntados y corazón dorado
        const R2 = b.big ? 9.5 : 6.5;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + t * 0.00008;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(a) * R2 * 0.75, by + Math.sin(a) * R2 * 0.75,
                      R2 * 0.75, R2 * 0.26, a, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(232, 168, 190, 0.85)";
          ctx.fill();
        }
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 - t * 0.0001 + 0.5;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(a) * R2 * 0.45, by + Math.sin(a) * R2 * 0.45,
                      R2 * 0.55, R2 * 0.24, a, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(214, 124, 160, 0.9)";
          ctx.fill();
        }
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + 0.8;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(a) * R2 * 0.2, by + Math.sin(a) * R2 * 0.2,
                      R2 * 0.32, R2 * 0.18, a, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(244, 214, 226, 0.95)";
          ctx.fill();
        }
        // receptáculo dorado con semillas
        ctx.beginPath();
        ctx.arc(bx, by, R2 * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(201, 162, 39, 0.95)";
        ctx.fill();
        ctx.fillStyle = "rgba(120, 94, 26, 0.9)";
        for (const [ox, oy] of [[-1.2, -0.6], [1.1, -0.4], [0, 1.1]]) {
          ctx.beginPath();
          ctx.arc(bx + ox * R2 * 0.1, by + oy * R2 * 0.1, R2 * 0.05 + 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case "cap": {
        // sombrero de hongo con motas claras
        const w = b.big ? 15 : 9, h = w * 0.6;
        ctx.beginPath();
        ctx.ellipse(bx, by, w, h, 0, Math.PI, Math.PI * 2);
        ctx.fillStyle = "rgba(192, 96, 82, 0.95)";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx, by, w, h * 0.22, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(226, 214, 192, 0.85)";
        ctx.fill();
        for (const [ox, oy, r] of [[-w*0.4, -h*0.45, 1.6], [w*0.25, -h*0.6, 1.3], [w*0.05, -h*0.25, 1.1]]) {
          ctx.beginPath();
          ctx.arc(bx + ox, by + oy, r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(232, 220, 200, 0.8)";
          ctx.fill();
        }
        break;
      }

      default: {
        // corola clásica de cinco pétalos
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 + t * 0.0002;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(a) * R, by + Math.sin(a) * R, R * 0.9, R * 0.5, a, 0, Math.PI * 2);
          ctx.fillStyle = bloomColor(g);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(bx, by, R * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(201, 162, 39, 0.95)";
        ctx.fill();
      }
    }
  }

  /* ---------- Dibujar una planta ---------- */
  function easeOutCubic(u) { return 1 - Math.pow(1 - u, 3); }

  function drawPlant(p, t, light) {
    const { baseX, baseY, scale } = plantTransform(p);
    const age = t - p.bornAt;
    const growth = easeOutCubic(Math.min(1, age / CONFIG.GERMINATION_MS));
    const budget = p.geo.totalLen * growth;
    if (budget <= 0) return;

    // planta recién regada: reluce, sus hojas sueltan destellos de agua
    // y hace la fotosíntesis — motas de luz verde-dorada suben del follaje
    const watered = p.wateredUntil && t < p.wateredUntil;
    if (watered) {
      light = Math.min(1, light + 0.25);
      if (!reduceMotion && p.geo.leaves.length && Math.random() < 0.08 && splashes.length < 80) {
        const l = p.geo.leaves[(Math.random() * p.geo.leaves.length) | 0];
        splashes.push({
          glint: true,
          x: baseX + l.x * scale + (Math.random() - 0.5) * 4,
          y: baseY + l.y * scale,
          vy: -0.12, life: 0.9,
        });
      }
      if (!reduceMotion && p.geo.leaves.length && Math.random() < 0.05 && motes.length < 80) {
        const l = p.geo.leaves[(Math.random() * p.geo.leaves.length) | 0];
        motes.push({
          x: baseX + l.x * scale,
          y: baseY + l.y * scale,
          vy: -(0.2 + Math.random() * 0.3),
          ph: Math.random() * Math.PI * 2,
          r: 0.8 + Math.random() * 0.9,
          life: 1,
        });
      }
    }

    ctx.lineCap = "round";

    // tallos
    for (const s of p.geo.segments) {
      if (s.cum > budget + 0.001) {
        // segmento parcial (el brote que está creciendo ahora mismo)
        const prev = s.cum - Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        if (prev >= budget) continue;
        const f = (budget - prev) / (s.cum - prev);
        const x2 = s.x1 + (s.x2 - s.x1) * f;
        const y2 = s.y1 + (s.y2 - s.y1) * f;
        strokeSeg(p, s, x2, y2, baseX, baseY, scale, t, light);
        continue;
      }
      strokeSeg(p, s, s.x2, s.y2, baseX, baseY, scale, t, light);
    }

    // hojas
    for (const l of p.geo.leaves) {
      if (l.cum > budget) continue;
      const lx = baseX + l.x * scale, ly = baseY + l.y * scale;
      const sx = sway(p, lx, ly, t, l.x, l.y);
      ctx.save();
      ctx.translate(sx, ly);
      ctx.rotate(l.a + (reduceMotion ? 0 : Math.sin(t * 0.0013 + l.x) * 0.08 + windNow * 0.10));
      ctx.beginPath();
      const isLoto = p.genome.species === "loto";
      const L = 5.5 * scale * (isLoto ? 1.45 : 0.9);
      ctx.ellipse(L * 0.6, 0, L, L * (isLoto ? 0.62 : 0.36), 0, 0, Math.PI * 2);
      ctx.fillStyle = leafColor(p.genome, p.genome.leafAlpha * (0.7 + light * 0.3));
      ctx.fill();
      if (isLoto) {
        // hendidura del nenúfar
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(L * 1.2, 0);
        ctx.strokeStyle = `rgba(16, 30, 22, ${0.35 * p.genome.leafAlpha})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
      ctx.restore();
    }

    // espinas (cactus y rosal)
    for (const sp of p.geo.spines) {
      if (sp.cum > budget) continue;
      const sx = sway(p, baseX + sp.x * scale, baseY + sp.y * scale, t, sp.x, sp.y);
      const sy = baseY + sp.y * scale;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(sp.a) * 4.5, sy + Math.sin(sp.a) * 4.5);
      ctx.strokeStyle = "rgba(216, 228, 214, 0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // corolas según el estilo de la especie
    const style = styleOf(p.genome);
    for (const b of p.geo.blooms) {
      if (b.cum > budget) continue;
      const bx = sway(p, baseX + b.x * scale, baseY + b.y * scale, t, b.x, b.y);
      const by = baseY + b.y * scale;
      drawBloom(p, b, bx, by, t);

      // el viento arranca pétalos y semillas de vez en cuando —
      // y bastante más cuando pasa una corriente de aire marcada
      if (!reduceMotion && growth >= 1 && petals.length < 40) {
        if (style === "puff" && Math.random() < 0.006 + gustNow * 0.05) {
          petals.push({
            x: bx, y: by, sp: 1.6 + Math.random() * 1.2,
            vy: -0.12 + Math.random() * 0.2, rot: 0, vr: 0,
            ph: Math.random() * Math.PI * 2, life: 1, seed: true,
          });
        } else if (["petal", "rose", "orchid", "sun"].includes(style) &&
                   Math.random() < (watered ? 0.012 : 0.0028) + gustNow * 0.012) {
          petals.push({
            x: bx, y: by, sp: 1.1 + Math.random() * 1.1,
            vy: 0.16 + Math.random() * 0.22,
            rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.12,
            ph: Math.random() * Math.PI * 2, life: 1,
            col: petalRGBA(style, p.genome),
          });
        }
      }
    }

    // goteo (…): lágrimas que caen del ápice
    if (p.genome.drips && !reduceMotion && growth >= 1 && Math.random() < 0.02) {
      const apex = p.geo.segments.reduce((m, s) => (s.y2 < m.y2 ? s : m), p.geo.segments[0]);
      drops.push({
        x: baseX + apex.x2 * scale,
        y: baseY + apex.y2 * scale,
        vy: 0.3, r: 1.6, life: 1,
        color: p.genome.sentiment < 0 ? "rgba(133,142,178," : "rgba(127,169,142,",
      });
    }

    // halo de germinación
    if (growth < 1) {
      ctx.beginPath();
      ctx.arc(baseX, baseY, 14 + growth * 26, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(227, 199, 102, ${0.35 * (1 - growth)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function strokeSeg(p, s, x2raw, y2raw, baseX, baseY, scale, t, light) {
    const x1 = sway(p, baseX + s.x1 * scale, baseY + s.y1 * scale, t, s.x1, s.y1);
    const y1 = baseY + s.y1 * scale;
    const x2 = sway(p, baseX + x2raw * scale, baseY + y2raw * scale, t, x2raw, y2raw);
    const y2 = baseY + y2raw * scale;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = s.hook ? "rgba(227, 199, 102, 0.85)" : stemColor(p.genome, light);
    ctx.lineWidth = Math.max(0.7, s.w * scale * 0.5);
    ctx.stroke();
  }

  /* ---------- Partículas ---------- */
  function drawPollen(t, light) {
    ctx.fillStyle = `rgba(227, 199, 102, ${0.20 + light * 0.15})`;
    for (const g of pollen) {
      g.y -= g.s * 0.6;
      g.x += windNow * (0.5 + g.s) + Math.sin(t * 0.0007 + g.p) * 0.3;
      if (g.y < -6) { g.y = H + 6; g.x = Math.random() * W; }
      if (g.x < -6) { g.x = W + 6; g.y = Math.random() * H; }
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDrops() {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy += 0.05; d.y += d.vy; d.x += windNow * 0.5; d.life -= 0.012;
      if (d.life <= 0 || d.y > groundY + 6) { drops.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = d.color + (0.6 * d.life) + ")";
      ctx.fill();
    }
  }

  function drawPetals(t) {
    for (let i = petals.length - 1; i >= 0; i--) {
      const pt = petals[i];
      pt.x += windNow * pt.sp;
      pt.y += pt.vy + Math.sin(t * 0.002 + pt.ph) * 0.35;
      pt.rot += pt.vr;
      pt.life -= pt.seed ? 0.002 : 0.0035;
      if (pt.life <= 0 || pt.x < -30 || pt.y > groundY + 24) { petals.splice(i, 1); continue; }
      const alpha = Math.min(1, pt.life * 2);

      if (pt.seed) {
        // semilla de diente de león: mota con su paracaídas
        ctx.strokeStyle = `rgba(226, 232, 222, ${0.5 * alpha})`;
        ctx.lineWidth = 0.7;
        for (const da of [-0.5, 0, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(pt.x + Math.sin(da) * 4, pt.y - Math.cos(da) * 5);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236, 240, 232, ${0.85 * alpha})`;
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.1, 1.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = pt.col + (0.85 * alpha) + ")";
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /* ---------- Abejas recolectoras ---------- */
  function bloomWorldPos(p, b, t) {
    const { baseX, baseY, scale } = plantTransform(p);
    return {
      x: sway(p, baseX + b.x * scale, baseY + b.y * scale, t, b.x, b.y),
      y: baseY + b.y * scale,
    };
  }

  function floweringPlants() {
    const now = performance.now();
    return plants.filter(p =>
      p.geo.blooms.length > 0 && now - p.bornAt >= CONFIG.GERMINATION_MS
    );
  }

  function pickFlower() {
    const candidates = floweringPlants();
    if (!candidates.length) return null;
    const p = candidates[(Math.random() * candidates.length) | 0];
    const b = p.geo.blooms[(Math.random() * p.geo.blooms.length) | 0];
    return { p, b };
  }

  function updateBees(t) {
    if (reduceMotion) return;

    // población: hasta 4 abejas si hay flores abiertas
    const want = Math.min(4, floweringPlants().length ? 2 + (plants.length >> 3) : 0);
    while (bees.length < want) {
      const target = pickFlower();
      if (!target) break;
      bees.push({
        x: Math.random() * W, y: groundY - 80 - Math.random() * 120,
        vx: 0, vy: 0, target, state: "fly",
        hoverT: 0, orbit: Math.random() * Math.PI * 2,
        ph: Math.random() * Math.PI * 2,
      });
    }
    if (bees.length > want) bees.length = want;

    for (const bee of bees) {
      // si su flor desapareció del jardín, busca otra
      if (!bee.target || !plants.includes(bee.target.p)) {
        bee.target = pickFlower();
        if (!bee.target) continue;
      }
      const goal = bloomWorldPos(bee.target.p, bee.target.b, t);

      if (bee.state === "fly") {
        const dx = goal.x - bee.x, dy = goal.y - bee.y;
        const d = Math.hypot(dx, dy) || 1;
        bee.vx += (dx / d) * 0.055 + windNow * 0.006;
        bee.vy += (dy / d) * 0.055 + Math.sin(t * 0.004 + bee.ph) * 0.02;
        const sp = Math.hypot(bee.vx, bee.vy);
        if (sp > 1.7) { bee.vx *= 1.7 / sp; bee.vy *= 1.7 / sp; }
        bee.x += bee.vx; bee.y += bee.vy;
        if (d < 14) { bee.state = "hover"; bee.hoverT = 140 + Math.random() * 220; }
      } else {
        // revolotea alrededor de la corola mientras "recolecta"
        bee.orbit += 0.055 + Math.sin(t * 0.001 + bee.ph) * 0.01;
        const r = 9 + Math.sin(t * 0.0023 + bee.ph) * 3;
        const hx = goal.x + Math.cos(bee.orbit) * r;
        const hy = goal.y + Math.sin(bee.orbit * 1.3) * r * 0.55 - 3;
        bee.vx = (hx - bee.x) * 0.16;
        bee.vy = (hy - bee.y) * 0.16;
        bee.x += bee.vx; bee.y += bee.vy;
        if (--bee.hoverT <= 0) { bee.target = pickFlower(); bee.state = "fly"; }
      }
    }
  }

  function drawBees(t) {
    for (const bee of bees) {
      const tilt = Math.max(-0.5, Math.min(0.5, bee.vx * 0.18));
      ctx.save();
      ctx.translate(bee.x, bee.y);
      ctx.rotate(tilt);

      // alas batientes (translúcidas)
      const flap = Math.sin(t * 0.09 + bee.ph) * 0.85;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.rotate(flap * side * 0.5 - side * 0.5);
        ctx.beginPath();
        ctx.ellipse(side * 1.0, -3.0, 3.0, 1.4, side * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(222, 232, 226, 0.45)";
        ctx.fill();
        ctx.restore();
      }

      // cuerpo dorado con franjas
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.0, 2.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(226, 182, 68, 0.95)";
      ctx.fill();
      ctx.strokeStyle = "rgba(42, 34, 16, 0.85)";
      ctx.lineWidth = 1.1;
      for (const sx of [-1.3, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(sx, -2.1);
        ctx.lineTo(sx, 2.1);
        ctx.stroke();
      }
      // cabeza
      ctx.beginPath();
      ctx.arc(3.7, 0, 1.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(42, 34, 16, 0.95)";
      ctx.fill();
      ctx.restore();

      // chispa de polen al recolectar
      if (bee.state === "hover" && Math.random() < 0.05) {
        ctx.beginPath();
        ctx.arc(bee.x + (Math.random() - 0.5) * 6, bee.y + 3 + Math.random() * 3, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(227, 199, 102, 0.7)";
        ctx.fill();
      }
    }
  }

  /* ---------- Regadera con manguera ---------- */
  const watering = {
    active: false, spraying: false,
    x: 0, y: 0, tx: 0, ty: 0,   // posición suavizada y objetivo (cursor)
    pressure: 0.6, tilt: -0.12,
  };
  let water = [];      // gotas del chorro
  let splashes = [];   // salpicaduras, ondas y destellos en hojas
  let clings = [];     // gotas adheridas que resbalan por las plantas
  let motes = [];      // motas de fotosíntesis: luz que sube del follaje

  /* ---------- Tijeras de podar ---------- */
  const pruner = {
    active: false,
    x: 0, y: 0, tx: 0, ty: 0,
    snipT: -1e9,   // instante del último tijeretazo (anima el cierre)
  };
  let fallenBranches = [];   // ramas podadas: caen como una pieza entera y se posan

  const watererEl = document.getElementById("waterer");
  const waterToggle = document.getElementById("water-toggle");
  const waterSlider = document.getElementById("water-pressure");
  const pruneToggle = document.getElementById("prune-toggle");

  // una sola herramienta en mano a la vez
  function setTool(name) {
    watering.active = name === "water";
    pruner.active = name === "prune";
    watering.spraying = false;
    waterToggle.classList.toggle("is-on", watering.active);
    waterToggle.setAttribute("aria-pressed", String(watering.active));
    watererEl.classList.toggle("is-on", watering.active);
    pruneToggle.classList.toggle("is-on", pruner.active);
    pruneToggle.setAttribute("aria-pressed", String(pruner.active));
    document.body.classList.toggle("is-watering", watering.active);
    document.body.classList.toggle("is-pruning", pruner.active);
    if (watering.active) {
      watering.x = watering.tx = W * 0.6;
      watering.y = watering.ty = H * 0.42;
    }
    if (pruner.active) {
      pruner.x = pruner.tx = W * 0.5;
      pruner.y = pruner.ty = H * 0.45;
    }
  }

  if (waterToggle && waterSlider && pruneToggle) {
    const syncSlider = () => {
      watering.pressure = waterSlider.value / 100;
      const pct = waterSlider.value;
      waterSlider.style.background =
        `linear-gradient(90deg, rgba(201,162,39,0.85) ${pct}%, rgba(216,228,214,0.15) ${pct}%)`;
    };
    waterSlider.addEventListener("input", syncSlider);
    syncSlider();

    waterToggle.addEventListener("click", () => setTool(watering.active ? null : "water"));
    pruneToggle.addEventListener("click", () => setTool(pruner.active ? null : "prune"));

    window.addEventListener("mousemove", (e) => {
      watering.tx = e.clientX; watering.ty = e.clientY;
      pruner.tx = e.clientX; pruner.ty = e.clientY;
    });
    canvas.addEventListener("mousedown", (e) => {
      if (watering.active) { watering.spraying = true; e.preventDefault(); }
      else if (pruner.active) { snip(performance.now()); e.preventDefault(); }
    });
    window.addEventListener("mouseup", () => { watering.spraying = false; });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && (watering.active || pruner.active)) setTool(null);
    });

    // táctil
    canvas.addEventListener("touchstart", (e) => {
      if (!watering.active && !pruner.active) return;
      const t0 = e.touches[0];
      watering.tx = pruner.tx = t0.clientX;
      watering.ty = pruner.ty = t0.clientY;
      if (watering.active) watering.spraying = true;
      else { pruner.x = pruner.tx; pruner.y = pruner.ty; snip(performance.now()); }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      if (!watering.active && !pruner.active) return;
      const t0 = e.touches[0];
      watering.tx = pruner.tx = t0.clientX;
      watering.ty = pruner.ty = t0.clientY;
      e.preventDefault();
    }, { passive: false });
    window.addEventListener("touchend", () => { watering.spraying = false; });
  }

  function spoutTip() {
    // punta de la alcachofa, rotada según la inclinación de la regadera
    const ox = -27, oy = -11;
    const c = Math.cos(watering.tilt), s = Math.sin(watering.tilt);
    return { x: watering.x + ox * c - oy * s, y: watering.y + ox * s + oy * c };
  }

  function updateWatering(t) {
    if (!watering.active) return;

    // la regadera persigue al cursor con inercia elegante
    watering.x += (watering.tx - watering.x) * 0.14;
    watering.y += (watering.ty - watering.y) * 0.14;
    const targetTilt = watering.spraying
      ? -(0.34 + watering.pressure * 0.34)
      : -0.12;
    watering.tilt += (targetTilt - watering.tilt) * 0.09;

    // brotar agua
    if (watering.spraying && water.length < 320) {
      const tip = spoutTip();
      const n = 2 + Math.round(watering.pressure * 8);
      for (let i = 0; i < n; i++) {
        const dir = Math.PI - (0.16 + (1 - watering.pressure) * 0.5)
                  + (Math.random() - 0.5) * 0.16;
        const sp = 2.2 + watering.pressure * 6.5 + Math.random() * 0.8;
        water.push({
          x: tip.x + (Math.random() - 0.5) * 3,
          y: tip.y + (Math.random() - 0.5) * 3,
          px: tip.x, py: tip.y,
          vx: Math.cos(dir) * sp,
          vy: Math.sin(dir) * sp,
          life: 1,
        });
      }
    }
  }

  /* Acumula tiempo efectivo de riego y dispara el florecimiento.
     cap limita cuánto crédito da un impacto aislado; las gotas del
     mismo frame no suman doble. */
  function feedPlant(p, t, cap) {
    const last = p._hitAt || 0;
    const dt = t - last;
    if (dt < 1) return;
    p.wetMs = (p.wetMs || 0) + Math.min(cap, dt);
    p._hitAt = t;
    if ((p.flourish || 0) < 2 && p.wetMs >= 3800 * ((p.flourish || 0) + 1)) {
      flourish(p, t);
    }
  }

  function wetPlantsNear(xImpact, t) {
    for (const p of plants) {
      if (Math.abs(p.x * W - xImpact) < 36) {
        p.wateredUntil = t + 5200;
        feedPlant(p, t, 150);  // regar la base también alimenta
      }
    }
  }

  /* ---------- Al mojarse, caen algunos pétalos ---------- */
  function shedPetal(p, baseX, baseY, scale) {
    if (!p.geo.blooms.length || petals.length >= 40) return;
    const style = styleOf(p.genome);
    if (!["petal", "rose", "orchid", "sun", "spike"].includes(style)) return;
    const b = p.geo.blooms[(Math.random() * p.geo.blooms.length) | 0];
    petals.push({
      x: baseX + b.x * scale, y: baseY + b.y * scale,
      sp: 0.5 + Math.random() * 0.5,             // cae, más que volar
      vy: 0.35 + Math.random() * 0.2,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.08,
      ph: Math.random() * Math.PI * 2, life: 1,
      col: petalRGBA(style, p.genome),
    });
  }

  /* ---------- Florecimiento: el agua hace crecer la planta ----------
     Con suficiente riego la planta da un estirón: una iteración más
     del L-system (más ramas), más hojas y algo de altura, con una
     animación de brote y semillas doradas que se van con el viento. */
  function flourish(p, t) {
    p.flourish = (p.flourish || 0) + 1;
    const g = p.genome;
    g.iterations = Math.min(5, (g.iterations || 3) + 1);
    g.height = Math.min(1.0, g.height * 1.06 + 0.02);
    g.leafDensity = Math.min(1, g.leafDensity + 0.12);
    p.geo = LSystem.build(g);
    p.bornAt = t - CONFIG.GERMINATION_MS * 0.45;  // rebrota ante tus ojos

    const { baseX, baseY, scale } = plantTransform(p);
    // aro de luz en la tierra
    splashes.push({ ripple: true, x: baseX, y: groundY + 2, r: 6, life: 0.8 });
    // bocanada de motas de fotosíntesis alrededor de la copa
    const top = baseY + p.geo.bounds.minY * scale;
    for (let k = 0; k < 14 && motes.length < 80; k++) {
      motes.push({
        x: baseX + (Math.random() - 0.5) * 70,
        y: top + Math.random() * (baseY - top) * 0.7,
        vy: -(0.25 + Math.random() * 0.4),
        ph: Math.random() * Math.PI * 2,
        r: 0.9 + Math.random() * 1.1,
        life: 1,
      });
    }
    // semillas doradas que viajan con el viento
    for (let k = 0; k < 5 && petals.length < 40; k++) {
      petals.push({
        x: baseX + (Math.random() - 0.5) * 40,
        y: top + Math.random() * 30,
        sp: 1.3 + Math.random() * 1.0,
        vy: -0.05 + Math.random() * 0.15,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.1,
        ph: Math.random() * Math.PI * 2, life: 1,
        col: "rgba(227, 199, 102,",
      });
    }
  }

  function drawMotes(t) {
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.y += m.vy;
      m.x += Math.sin(t * 0.0016 + m.ph) * 0.3 + windNow * 0.15;
      m.life -= 0.006;
      if (m.life <= 0) { motes.splice(i, 1); continue; }
      const a = m.life * (0.4 + 0.3 * Math.sin(t * 0.008 + m.ph));
      // halo suave + núcleo brillante: luz de fotosíntesis
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 2.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(190, 224, 150, ${a * 0.18})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226, 240, 190, ${a})`;
      ctx.fill();
    }
  }

  /* ---------- ¿La gota tocó una planta? ----------
     Prefiltra por caja envolvente y luego mide contra hojas
     (círculos) y tallos (cápsulas), muestreados uno de cada dos. */
  function splashOnPlant(d) {
    for (const p of plants) {
      const { baseX, baseY, scale } = plantTransform(p);
      const bb = p.geo.bounds;
      if (d.x < baseX + bb.minX * scale - 8 || d.x > baseX + bb.maxX * scale + 8) continue;
      if (d.y > baseY - 2 || d.y < baseY + bb.minY * scale - 8) continue;

      const lx = (d.x - baseX) / scale, ly = (d.y - baseY) / scale;
      const leaves = p.geo.leaves;
      for (let i = 0; i < leaves.length; i += 2) {
        const l = leaves[i];
        const dx = lx - l.x, dy = ly - l.y;
        if (dx * dx + dy * dy < 30) return { p, baseX, baseY, scale };
      }
      const segs = p.geo.segments;
      for (let i = 0; i < segs.length; i += 2) {
        const s = segs[i];
        const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
        const len2 = vx * vx + vy * vy || 1;
        let u = ((lx - s.x1) * vx + (ly - s.y1) * vy) / len2;
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        const dx = lx - (s.x1 + vx * u), dy = ly - (s.y1 + vy * u);
        const rr = 1.3 + s.w * 0.3;
        if (dx * dx + dy * dy < rr * rr) return { p, baseX, baseY, scale };
      }
    }
    return null;
  }

  function drawWater(t) {
    // chorro
    ctx.lineCap = "round";
    for (let i = water.length - 1; i >= 0; i--) {
      const d = water[i];
      d.px = d.x; d.py = d.y;
      d.vx += windNow * 0.008;  // chorro estable, fácil de apuntar
      d.vy += 0.085;
      d.x += d.vx; d.y += d.vy;
      d.life -= 0.006;

      // choque contra una planta: la moja, la sacude, y la gota
      // rebota o se queda adherida resbalando por ella
      if ((d.bounces || 0) < 2 && d.vy > 0.4) {
        const hit = splashOnPlant(d);
        if (hit) {
          const p = hit.p;
          p.wateredUntil = t + 5200;

          // sacudida localizada y delicada: solo el punto del golpe
          // (y lo que quede cerca, ver IMPACT_RADIUS) se mece un poco
          if (!p.impacts) p.impacts = [];
          p.impacts.push({
            lx: (d.x - hit.baseX) / hit.scale,
            ly: (d.y - hit.baseY) / hit.scale,
            t0: t,
            amp: 1.0 + Math.random() * 0.6,
          });
          if (p.impacts.length > 14) p.impacts.splice(0, p.impacts.length - 14);

          // el riego alimenta la planta: se acumula TIEMPO efectivo de
          // riego (no gotas, para que dé igual si la planta es fina o
          // frondosa) y con suficiente agua florece con más ramas
          feedPlant(p, t, 200);
          if (Math.random() < 0.05) shedPetal(p, hit.baseX, hit.baseY, hit.scale);

          if (Math.random() < 0.3 && clings.length < 70) {
            clings.push({
              p,
              lx: (d.x - hit.baseX) / hit.scale,
              ly: (d.y - hit.baseY) / hit.scale,
              r: 0.9 + Math.random() * 0.7,
              life: 1,
              slide: (0.004 + Math.random() * 0.006) / hit.scale,
            });
            water.splice(i, 1);
            continue;
          }
          d.bounces = (d.bounces || 0) + 1;
          d.vy = -Math.abs(d.vy) * (0.25 + Math.random() * 0.25);
          d.vx = d.vx * 0.3 + (Math.random() - 0.5) * 1.6 + windNow * 0.4;
          d.life *= 0.8;
          if (splashes.length < 90) {
            splashes.push({
              x: d.x, y: d.y,
              vx: (Math.random() - 0.5) * 1.5,
              vy: -(0.4 + Math.random()),
              life: 0.5,
            });
          }
        }
      }

      if (d.y >= groundY + 2) {
        // salpicadura + onda en el suelo, y las plantas cercanas se riegan
        wetPlantsNear(d.x, t);
        for (let k = 0; k < 2; k++) {
          splashes.push({
            x: d.x, y: groundY,
            vx: (Math.random() - 0.5) * 2 + windNow * 0.5,
            vy: -(0.7 + Math.random() * 1.5),
            life: 0.6,
          });
        }
        if (Math.random() < 0.4) {
          splashes.push({ ripple: true, x: d.x, y: groundY + 2, r: 1.5, life: 0.55 });
        }
        water.splice(i, 1);
        continue;
      }
      if (d.life <= 0 || d.x < -30) { water.splice(i, 1); continue; }

      ctx.beginPath();
      ctx.moveTo(d.px, d.py);
      ctx.lineTo(d.x, d.y);
      ctx.strokeStyle = `rgba(150, 205, 220, ${0.6 * d.life})`;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }

    // salpicaduras, ondas y destellos
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.life -= 0.02;
      if (s.life <= 0) { splashes.splice(i, 1); continue; }

      if (s.ripple) {
        s.r += 0.7;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r, s.r * 0.28, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(150, 205, 220, ${0.35 * s.life})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      } else if (s.glint) {
        s.y += s.vy;
        const tw = 0.5 + 0.5 * Math.sin(t * 0.02 + s.x);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196, 232, 240, ${0.7 * s.life * tw})`;
        ctx.fill();
      } else {
        s.vy += 0.09;
        s.x += s.vx; s.y += s.vy;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 205, 220, ${0.65 * s.life})`;
        ctx.fill();
      }
    }
  }

  /* ---------- Poda ---------- */
  const PRUNER_ROT = 0.55;   // las hojas apuntan arriba-izquierda

  function prunerTip() {
    const c = Math.cos(PRUNER_ROT), s = Math.sin(PRUNER_ROT);
    return { x: pruner.x - 20 * c, y: pruner.y - 20 * s };
  }

  function snip(t) {
    pruner.snipT = t;
    const tip = prunerTip();

    // planta cuya caja envolvente contiene la punta, la más cercana
    let best = null, bestD = 1e9;
    for (const p of plants) {
      const { baseX, baseY, scale } = plantTransform(p);
      const bb = p.geo.bounds;
      if (tip.x < baseX + bb.minX * scale - 10 || tip.x > baseX + bb.maxX * scale + 10) continue;
      if (tip.y < baseY + bb.minY * scale - 10 || tip.y > baseY + 4) continue;
      const d = Math.abs(tip.x - baseX);
      if (d < bestD) { bestD = d; best = { p, baseX, baseY, scale }; }
    }
    if (!best) return;

    const { p, baseX, baseY, scale } = best;
    cutFrom(p, (tip.x - baseX) / scale, (tip.y - baseY) / scale, 34 / scale,
            baseX, baseY, scale, t);
  }

  // corta todo lo que quede dentro de un radio del punto de corte —
  // se desprende como una rama entera y coherente, no motas sueltas.
  function cutFrom(p, lx, ly, R, baseX, baseY, scale, t) {
    const R2 = R * R;
    const geo = p.geo;

    const near = (o, extra = 0) => {
      const dx = o.x - lx, dy = o.y - ly;
      return dx * dx + dy * dy < R2 + extra;
    };

    const cutSegs = [], cutLeaves = [], cutBlooms = [], cutSpines = [];
    geo.segments = geo.segments.filter((s) => {
      const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
      if (near({ x: mx, y: my })) { cutSegs.push(s); return false; }
      return true;
    });
    geo.leaves = geo.leaves.filter((l) => {
      if (near(l, 12)) { cutLeaves.push(l); return false; }
      return true;
    });
    geo.blooms = geo.blooms.filter((b) => {
      if (near(b, 12)) { cutBlooms.push(b); return false; }
      return true;
    });
    geo.spines = geo.spines.filter((sp) => {
      if (near(sp, 12)) { cutSpines.push(sp); return false; }
      return true;
    });

    if (!cutSegs.length && !cutLeaves.length && !cutBlooms.length && !cutSpines.length) return;

    // la pieza cortada guarda sus formas relativas al punto de corte
    // (pivote), para caer y girar como un objeto rígido
    fallenBranches.push({
      genome: p.genome,
      scale,
      x: baseX + lx * scale, y: baseY + ly * scale,
      rot: 0,
      vx: (Math.random() - 0.5) * 0.35 + windNow * 0.5,
      vy: 0.12 + Math.random() * 0.12,
      vr: (Math.random() - 0.5) * 0.045,
      landed: false, restT: 0, life: 1,
      segments: cutSegs.map((s) => ({
        x1: s.x1 - lx, y1: s.y1 - ly, x2: s.x2 - lx, y2: s.y2 - ly, w: s.w, hook: s.hook,
      })),
      leaves: cutLeaves.map((l) => ({ x: l.x - lx, y: l.y - ly, a: l.a })),
      blooms: cutBlooms.map((b) => ({ x: b.x - lx, y: b.y - ly, big: b.big })),
      spines: cutSpines.map((sp) => ({ x: sp.x - lx, y: sp.y - ly, a: sp.a })),
    });
    if (fallenBranches.length > 6) fallenBranches.shift();

    // la planta acusa el tijeretazo con una ondulación suave
    if (!p.impacts) p.impacts = [];
    p.impacts.push({ lx, ly, t0: t, amp: 1.2 });
    if (p.impacts.length > 14) p.impacts.splice(0, p.impacts.length - 14);
  }

  function fallenWorldPoint(fb, lx, ly) {
    const sx = lx * fb.scale, sy = ly * fb.scale;
    const c = Math.cos(fb.rot), s = Math.sin(fb.rot);
    return { x: fb.x + sx * c - sy * s, y: fb.y + sx * s + sy * c };
  }

  const REST_MS = 5000;   // cuánto queda tendida en el pasto antes de desvanecerse

  function drawFallenBranches(t) {
    for (let i = fallenBranches.length - 1; i >= 0; i--) {
      const fb = fallenBranches[i];

      if (!fb.landed) {
        fb.vy += 0.045;
        fb.x += fb.vx + windNow * 0.12;
        fb.y += fb.vy;
        fb.rot += fb.vr;
        fb.vr *= 0.994;

        let lowest = -1e9;
        for (const s of fb.segments) lowest = Math.max(lowest, fallenWorldPoint(fb, s.x1, s.y1).y, fallenWorldPoint(fb, s.x2, s.y2).y);
        for (const l of fb.leaves) lowest = Math.max(lowest, fallenWorldPoint(fb, l.x, l.y).y);
        for (const b of fb.blooms) lowest = Math.max(lowest, fallenWorldPoint(fb, b.x, b.y).y);
        if (lowest === -1e9) lowest = fb.y;

        if (lowest >= groundY) {
          fb.y -= lowest - groundY;   // apoya la pieza justo sobre el pasto
          fb.vy = 0; fb.vx *= 0.35; fb.vr *= 0.25;
          fb.landed = true;
          splashes.push({ ripple: true, x: fb.x, y: groundY + 2, r: 3, life: 0.5 });
        }
      } else {
        fb.x += fb.vx; fb.vx *= 0.8;
        fb.rot += fb.vr; fb.vr *= 0.8;
        fb.restT += 16.7;
        if (fb.restT > REST_MS) fb.life -= 0.012;
      }

      if (fb.life <= 0) { fallenBranches.splice(i, 1); continue; }
      const a = Math.min(1, fb.life * 1.4);
      const g = fb.genome, fakeP = { genome: g };

      ctx.save();
      ctx.globalAlpha = a;
      ctx.lineCap = "round";
      for (const s of fb.segments) {
        const p1 = fallenWorldPoint(fb, s.x1, s.y1), p2 = fallenWorldPoint(fb, s.x2, s.y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = s.hook ? "rgba(227, 199, 102, 0.85)" : stemColor(g, 0.55);
        ctx.lineWidth = Math.max(0.7, s.w * fb.scale * 0.5);
        ctx.stroke();
      }
      for (const l of fb.leaves) {
        const wp = fallenWorldPoint(fb, l.x, l.y);
        ctx.save();
        ctx.translate(wp.x, wp.y);
        ctx.rotate(l.a + fb.rot);
        const L = 5.5 * fb.scale * (g.species === "loto" ? 1.45 : 0.9);
        ctx.beginPath();
        ctx.ellipse(L * 0.6, 0, L, L * (g.species === "loto" ? 0.62 : 0.36), 0, 0, Math.PI * 2);
        ctx.fillStyle = leafColor(g, g.leafAlpha * 0.85);
        ctx.fill();
        ctx.restore();
      }
      for (const sp of fb.spines) {
        const wp = fallenWorldPoint(fb, sp.x, sp.y);
        ctx.beginPath();
        ctx.moveTo(wp.x, wp.y);
        ctx.lineTo(wp.x + Math.cos(sp.a + fb.rot) * 4.5, wp.y + Math.sin(sp.a + fb.rot) * 4.5);
        ctx.strokeStyle = "rgba(216, 228, 214, 0.55)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (const b of fb.blooms) {
        const wp = fallenWorldPoint(fb, b.x, b.y);
        drawBloom(fakeP, b, wp.x, wp.y, t);
      }
      ctx.restore();
    }
  }

  function drawPruner(t) {
    if (!pruner.active) return;
    pruner.x += (pruner.tx - pruner.x) * 0.2;
    pruner.y += (pruner.ty - pruner.y) * 0.2;

    // apertura de las hojas: se cierran de golpe al cortar y se reabren
    const since = t - pruner.snipT;
    let open = 0.42;
    if (since < 90) open = 0.42 * (since / 90) * 0.2;
    else if (since < 240) open = 0.42 * ((since - 90) / 150);

    ctx.save();
    ctx.translate(pruner.x, pruner.y);
    ctx.rotate(PRUNER_ROT);   // filo hacia arriba-izquierda, mangos abajo-derecha

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * open * 0.5);
      // hoja de acero con canto oscuro para destacar sobre el follaje
      ctx.beginPath();
      ctx.ellipse(-12, 0, 13, 2.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(208, 220, 214, 0.97)";
      ctx.fill();
      ctx.strokeStyle = "rgba(10, 18, 14, 0.8)";
      ctx.lineWidth = 0.9;
      ctx.stroke();
      // brillo del filo
      ctx.beginPath();
      ctx.moveTo(-23, side * 0.7);
      ctx.lineTo(-4, side * 0.3);
      ctx.strokeStyle = "rgba(244, 250, 246, 0.75)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // mango de latón (anillo)
      ctx.beginPath();
      ctx.arc(9.5, side * 3.8, 4.6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(201, 162, 39, 0.95)";
      ctx.lineWidth = 2.1;
      ctx.stroke();
      ctx.restore();
    }
    // tornillo del pivote
    ctx.beginPath();
    ctx.arc(0, 0, 1.7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(201, 162, 39, 0.95)";
    ctx.fill();
    ctx.restore();
  }

  function drawClings(t) {
    for (let i = clings.length - 1; i >= 0; i--) {
      const c = clings[i];
      if (!plants.includes(c.p)) { clings.splice(i, 1); continue; }
      const { baseX, baseY, scale } = plantTransform(c.p);
      c.ly += c.slide;   // resbala lentamente hacia abajo
      c.life -= 0.0035;
      const x = sway(c.p, baseX + c.lx * scale, baseY + c.ly * scale, t, c.lx, c.ly);
      const y = baseY + c.ly * scale;

      if (y >= groundY) {
        splashes.push({ ripple: true, x, y: groundY + 2, r: 1, life: 0.4 });
        clings.splice(i, 1);
        continue;
      }
      if (c.life <= 0) { clings.splice(i, 1); continue; }
      if (Math.random() < 0.004) {
        // la gota se desprende y cae
        drops.push({ x, y, vy: 0.2, r: 1.3, life: 0.9, color: "rgba(150,205,220," });
        clings.splice(i, 1);
        continue;
      }

      // gota adherida con su reflejo
      ctx.beginPath();
      ctx.arc(x, y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(158, 208, 224, ${0.55 * c.life})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - c.r * 0.3, y - c.r * 0.3, c.r * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240, 250, 252, ${0.5 * c.life})`;
      ctx.fill();
    }
  }

  function drawWateringCan(t) {
    if (!watering.active) return;
    const { x, y } = watering;

    // manguera: entra desde la esquina inferior derecha con caída natural
    const ax = W + 30, ay = H - 8;
    const dist = Math.hypot(ax - x, ay - y);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(
      ax - dist * 0.16, ay - 46 + Math.sin(t * 0.001) * 6,
      x + 76 + Math.sin(t * 0.0013) * 8, y + Math.min(150, dist * 0.35),
      x + 15, y + 5
    );
    ctx.strokeStyle = "rgba(24, 40, 30, 0.95)";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = "rgba(127, 169, 142, 0.3)";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // abrazadera de latón donde la manguera entra a la regadera
    ctx.beginPath();
    ctx.arc(x + 14, y + 4, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(201, 162, 39, 0.9)";
    ctx.fill();

    // cuerpo de la regadera
    ctx.save();
    ctx.translate(x, y);
    if (watering.spraying) {
      ctx.translate((Math.random() - 0.5) * watering.pressure * 1.2,
                    (Math.random() - 0.5) * watering.pressure * 0.8);
    }
    ctx.rotate(watering.tilt);

    // cuerpo
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 9.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(16, 30, 22, 0.96)";
    ctx.fill();
    ctx.strokeStyle = "rgba(201, 162, 39, 0.75)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // asa superior
    ctx.beginPath();
    ctx.arc(1, -9, 7.5, Math.PI, 0);
    ctx.strokeStyle = "rgba(201, 162, 39, 0.8)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // pico
    ctx.beginPath();
    ctx.moveTo(-11, -3);
    ctx.lineTo(-25, -10);
    ctx.strokeStyle = "rgba(20, 36, 27, 0.98)";
    ctx.lineWidth = 4.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(201, 162, 39, 0.4)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // alcachofa (la boquilla de ducha)
    ctx.beginPath();
    ctx.arc(-27, -11, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(201, 162, 39, 0.92)";
    ctx.fill();
    ctx.fillStyle = "rgba(16, 30, 22, 0.9)";
    for (const [dx, dy] of [[-1.2, -0.6], [0.4, 0.8], [1.1, -0.9]]) {
      ctx.beginPath();
      ctx.arc(-27 + dx, -11 + dy, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // brillo del cuerpo
    ctx.beginPath();
    ctx.ellipse(-4, -3.5, 5, 2.2, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(216, 228, 214, 0.08)";
    ctx.fill();

    ctx.restore();
  }

  /* ---------- Bucle ---------- */
  function frame(now) {
    const t = now;
    windNow = reduceMotion ? 0 : windField(t);
    const light = skyLight(t - startTime);
    drawSky(light);
    drawGusts(t, light);
    drawRoots(t);
    drawGround(light);
    drawGrass(0, t, light);                    // pasto de fondo
    for (const p of plants) drawPlant(p, t, light);
    drawGrass(1, t, light);                    // pasto delantero
    drawClings(t);
    drawDrops();
    drawMotes(t);
    drawPetals(t);
    updateBees(t);
    drawBees(t);
    drawPollen(t, light);
    drawFallenBranches(t);
    drawAirCurrents(t);
    updateWatering(t);
    drawWater(t);
    drawWateringCan(t);
    drawPruner(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- Selección con clic ---------- */
  function pick(clientX, clientY) {
    let best = null, bestD = 64;
    plants.forEach((p, i) => {
      const { baseX } = plantTransform(p);
      const d = Math.abs(clientX - baseX);
      if (d < bestD && clientY > H * 0.18) { bestD = d; best = { plant: p, index: i }; }
    });
    return best;
  }

  return {
    addPlant, pick, kinOf, recomputeKinship,
    get plants() { return plants; },
    get bees() { return bees; },
    get watering() { return watering; },
    get waterCount() { return water.length; },
    get pruner() { return pruner; },
    get fallenBranches() { return fallenBranches; },
    get gustNow() { return gustNow; },
    get airCurrents() { return airCurrents; },
  };
})();
