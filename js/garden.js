/* ============================================================
   JARDÍN — motor de render y atmósfera.
     · germinación animada (crecimiento progresivo)
     · viento (vaivén por altura)
     · ciclo día/noche del invernadero
     · polen flotante
     · goteo (frases con puntos suspensivos…)
     · raíces entrelazadas entre plantas de significado afín
   ============================================================ */

const Garden = (() => {
  const canvas = document.getElementById("garden");
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0, dpr = 1, groundY = 0;
  let plants = [];        // {id, phrase, genome, geo, x, phase, bornAt, mine}
  let kinLinks = [];      // {a, b, strength}
  let pollen = [];
  let drops = [];
  let startTime = performance.now();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Paleta según ánimo ---------- */
  function stemColor(g, light) {
    let r, gr, b;
    if (g.species === "cactus")      { r = 96;  gr = 122; b = 88;  }
    else if (g.sentiment > 0.25)     { r = 122; gr = 158; b = 118; }
    else if (g.sentiment < -0.25)    { r = 104; gr = 112; b = 148; } // violeta pizarra
    else                             { r = 111; gr = 146; b = 126; }
    const L = 0.75 + light * 0.35;
    return `rgb(${(r*L)|0}, ${(gr*L)|0}, ${(b*L)|0})`;
  }
  function leafColor(g, alpha) {
    if (g.sentiment > 0.25)  return `rgba(158, 196, 142, ${alpha})`;
    if (g.sentiment < -0.25) return `rgba(133, 142, 178, ${alpha})`;
    return `rgba(127, 169, 142, ${alpha})`;
  }
  function bloomColor(g) {
    // pétalos: cálidos si la alegría es alta, ámbar si es serena
    return g.sentiment > 0.55 ? "rgba(214, 138, 152, 0.9)" : "rgba(227, 199, 102, 0.9)";
  }

  /* ---------- Tamaño ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H * 0.8;
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

  /* ---------- Viento ---------- */
  function sway(p, px, py, t) {
    if (reduceMotion) return px;
    const heightFactor = Math.max(0, (groundY - py)) / H;
    const w = Math.sin(t * 0.0011 + p.phase + (groundY - py) * 0.012);
    return px + w * 7 * heightFactor * (1 + p.genome.complexity * 0.5);
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

  function drawGround(light) {
    const g = ctx.createLinearGradient(0, groundY - 20, 0, H);
    g.addColorStop(0, "rgba(18, 32, 26, 0)");
    g.addColorStop(0.25, "rgba(16, 27, 21, 0.9)");
    g.addColorStop(1, "rgb(8, 13, 10)");
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY - 20, W, H - groundY + 20);

    ctx.strokeStyle = `rgba(216, 228, 214, ${0.10 + light * 0.05})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();
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

  /* ---------- Dibujar una planta ---------- */
  function easeOutCubic(u) { return 1 - Math.pow(1 - u, 3); }

  function drawPlant(p, t, light) {
    const { baseX, baseY, scale } = plantTransform(p);
    const age = t - p.bornAt;
    const growth = easeOutCubic(Math.min(1, age / CONFIG.GERMINATION_MS));
    const budget = p.geo.totalLen * growth;
    if (budget <= 0) return;

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
      ctx.rotate(l.a + (reduceMotion ? 0 : Math.sin(t * 0.0013 + l.x) * 0.08));
      ctx.beginPath();
      const L = 5.5 * scale * 0.9;
      ctx.ellipse(L * 0.6, 0, L, L * 0.36, 0, 0, Math.PI * 2);
      ctx.fillStyle = leafColor(p.genome, p.genome.leafAlpha * (0.7 + light * 0.3));
      ctx.fill();
      ctx.restore();
    }

    // espinas (cactus)
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

    // corolas (flor)
    for (const b of p.geo.blooms) {
      if (b.cum > budget) continue;
      const bx = sway(p, baseX + b.x * scale, baseY + b.y * scale, t);
      const by = baseY + b.y * scale;
      const R = 3.2 + p.genome.sentiment * 2.2;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + t * 0.0002;
        ctx.beginPath();
        ctx.ellipse(bx + Math.cos(a) * R, by + Math.sin(a) * R, R * 0.9, R * 0.5, a, 0, Math.PI * 2);
        ctx.fillStyle = bloomColor(p.genome);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(bx, by, R * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(201, 162, 39, 0.95)";
      ctx.fill();
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
      g.y -= g.s;
      g.x += Math.sin(t * 0.0007 + g.p) * 0.3;
      if (g.y < -6) { g.y = H + 6; g.x = Math.random() * W; }
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawDrops() {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy += 0.05; d.y += d.vy; d.life -= 0.012;
      if (d.life <= 0 || d.y > groundY + 6) { drops.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = d.color + (0.6 * d.life) + ")";
      ctx.fill();
    }
  }

  /* ---------- Bucle ---------- */
  function frame(now) {
    const t = now;
    const light = skyLight(t - startTime);
    drawSky(light);
    drawRoots(t);
    drawGround(light);
    for (const p of plants) drawPlant(p, t, light);
    drawDrops();
    drawPollen(t, light);
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

  return { addPlant, pick, kinOf, recomputeKinship, get plants() { return plants; } };
})();
