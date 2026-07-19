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
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Viento del oeste ---------- */
  function windField(t) {
    // brisa constante + ráfagas lentas; siempre sopla a la izquierda
    const slow = Math.sin(t * 0.00021);
    const gust = Math.sin(t * 0.00063 + 1.7) * Math.sin(t * 0.00017 + 0.4);
    return -(0.55 + Math.max(0, slow) * 0.5 + Math.max(0, gust) * 0.9);
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
    diente: "puff", hongo: "cap", enredadera: "petal",
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
  function sway(p, px, py, t) {
    if (reduceMotion) return px;
    const heightFactor = Math.max(0, (groundY - py)) / H;
    const flutter = Math.sin(t * 0.0011 + p.phase + (groundY - py) * 0.012);
    const bend = windNow * 16 * Math.pow(heightFactor, 1.25) * (1 + p.genome.complexity * 0.5);
    // sacudida al recibir el agua de la regadera (decae sola)
    let shake = 0;
    if (p.shakeUntil && t < p.shakeUntil) {
      const k = (p.shakeUntil - t) / 650;
      shake = Math.sin(t * 0.055 + p.phase * 9) * (p.shakeAmp || 1.5) * k * 3 * heightFactor;
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

    // planta recién regada: reluce, y sus hojas sueltan destellos de agua
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
      const sx = sway(p, lx, ly, t);
      ctx.save();
      ctx.translate(sx, ly);
      ctx.rotate(l.a + (reduceMotion ? 0 : Math.sin(t * 0.0013 + l.x) * 0.08 + windNow * 0.10));
      ctx.beginPath();
      const L = 5.5 * scale * 0.9;
      ctx.ellipse(L * 0.6, 0, L, L * 0.36, 0, 0, Math.PI * 2);
      ctx.fillStyle = leafColor(p.genome, p.genome.leafAlpha * (0.7 + light * 0.3));
      ctx.fill();
      ctx.restore();
    }

    // espinas (cactus y rosal)
    for (const sp of p.geo.spines) {
      if (sp.cum > budget) continue;
      const sx = sway(p, baseX + sp.x * scale, baseY + sp.y * scale, t);
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
      const bx = sway(p, baseX + b.x * scale, baseY + b.y * scale, t);
      const by = baseY + b.y * scale;
      drawBloom(p, b, bx, by, t);

      // el viento arranca pétalos y semillas de vez en cuando
      if (!reduceMotion && growth >= 1 && petals.length < 40) {
        if (style === "puff" && Math.random() < 0.006) {
          petals.push({
            x: bx, y: by, sp: 1.6 + Math.random() * 1.2,
            vy: -0.12 + Math.random() * 0.2, rot: 0, vr: 0,
            ph: Math.random() * Math.PI * 2, life: 1, seed: true,
          });
        } else if (["petal", "rose", "orchid", "sun"].includes(style) && Math.random() < 0.0028) {
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
    const x1 = sway(p, baseX + s.x1 * scale, baseY + s.y1 * scale, t);
    const y1 = baseY + s.y1 * scale;
    const x2 = sway(p, baseX + x2raw * scale, baseY + y2raw * scale, t);
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
      x: sway(p, baseX + b.x * scale, baseY + b.y * scale, t),
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

  const watererEl = document.getElementById("waterer");
  const waterToggle = document.getElementById("water-toggle");
  const waterSlider = document.getElementById("water-pressure");

  if (waterToggle && waterSlider) {
    const syncSlider = () => {
      watering.pressure = waterSlider.value / 100;
      const pct = waterSlider.value;
      waterSlider.style.background =
        `linear-gradient(90deg, rgba(201,162,39,0.85) ${pct}%, rgba(216,228,214,0.15) ${pct}%)`;
    };
    waterSlider.addEventListener("input", syncSlider);
    syncSlider();

    waterToggle.addEventListener("click", () => {
      watering.active = !watering.active;
      watering.spraying = false;
      waterToggle.classList.toggle("is-on", watering.active);
      waterToggle.setAttribute("aria-pressed", String(watering.active));
      watererEl.classList.toggle("is-on", watering.active);
      document.body.classList.toggle("is-watering", watering.active);
      if (watering.active) {
        watering.x = watering.tx = W * 0.6;
        watering.y = watering.ty = H * 0.42;
      }
    });

    window.addEventListener("mousemove", (e) => {
      watering.tx = e.clientX; watering.ty = e.clientY;
    });
    canvas.addEventListener("mousedown", (e) => {
      if (watering.active) { watering.spraying = true; e.preventDefault(); }
    });
    window.addEventListener("mouseup", () => { watering.spraying = false; });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && watering.active) waterToggle.click();
    });

    // táctil
    canvas.addEventListener("touchstart", (e) => {
      if (!watering.active) return;
      const t0 = e.touches[0];
      watering.tx = t0.clientX; watering.ty = t0.clientY;
      watering.spraying = true;
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener("touchmove", (e) => {
      if (!watering.active) return;
      const t0 = e.touches[0];
      watering.tx = t0.clientX; watering.ty = t0.clientY;
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

  function wetPlantsNear(xImpact, t) {
    for (const p of plants) {
      if (Math.abs(p.x * W - xImpact) < 36) p.wateredUntil = t + 5200;
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
      d.vx += windNow * 0.015;
      d.vy += 0.085;
      d.x += d.vx; d.y += d.vy;
      d.life -= 0.006;

      // choque contra una planta: la moja, la sacude, y la gota
      // rebota o se queda adherida resbalando por ella
      if ((d.bounces || 0) < 2 && d.vy > 0.4) {
        const hit = splashOnPlant(d);
        if (hit) {
          const p = hit.p;
          if (t > (p.shakeUntil || 0)) p.shakeAmp = 0;
          p.shakeAmp = Math.min(3.4, (p.shakeAmp || 0) + 0.5);
          p.shakeUntil = t + 650;
          p.wateredUntil = t + 5200;

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

  function drawClings(t) {
    for (let i = clings.length - 1; i >= 0; i--) {
      const c = clings[i];
      if (!plants.includes(c.p)) { clings.splice(i, 1); continue; }
      const { baseX, baseY, scale } = plantTransform(c.p);
      c.ly += c.slide;   // resbala lentamente hacia abajo
      c.life -= 0.0035;
      const x = sway(c.p, baseX + c.lx * scale, baseY + c.ly * scale, t);
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
    drawPetals(t);
    updateBees(t);
    drawBees(t);
    drawPollen(t, light);
    updateWatering(t);
    drawWater(t);
    drawWateringCan(t);
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
  };
})();
