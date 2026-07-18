/* ============================================================
   L-SYSTEM — motor de crecimiento vegetal.
   Reescritura de cadenas (Lindenmayer) + intérprete tortuga.
   El genoma parametriza reglas, ángulos y tropismos:

     flor    → ramas abiertas hacia arriba, corola terminal
     sauce   → tropismo gravitatorio (las ramas caen)
     cactus  → brazos gruesos, pocas ramas, espinas
     helecho → fronda densa y regular

   Devuelve geometría precalculada (segmentos ordenados por
   longitud acumulada) para animar la germinación.
   ============================================================ */

const LSystem = (() => {

  // PRNG determinista (mulberry32): misma frase → misma planta
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Reglas por especie ---------- */
  function rules(species, rand) {
    switch (species) {
      case "flor":
        return {
          axiom: "X",
          X: () => rand() < 0.5 ? "F[+X][-X]FX" : "F[+FX][-FX]X",
          F: () => "FF",
          tropism: -0.012,           // leve empuje hacia arriba
          segLen: 1.0, width: 1.0,
        };
      case "sauce":
        return {
          axiom: "FX",
          X: () => rand() < 0.5 ? "F[++X][+X][-X]" : "F[+X][--X][-X]",
          F: () => "FF",
          tropism: 0.10,             // gravedad: las ramas lloran
          segLen: 1.05, width: 0.9,
        };
      case "cactus":
        return {
          axiom: "X",
          X: () => rand() < 0.6 ? "FF[+X]F[-X]" : "FF[+X]FX",
          F: () => "F",
          tropism: -0.04,            // brazos que suben rígidos
          segLen: 1.5, width: 3.2,
        };
      default: // helecho
        return {
          axiom: "X",
          X: () => "F[+X][-X]FX",
          F: () => "FF",
          tropism: 0.015,
          segLen: 0.85, width: 0.8,
        };
    }
  }

  /* ---------- Expansión de la cadena ---------- */
  function expand(genome, R) {
    let str = R.axiom;
    for (let i = 0; i < genome.iterations; i++) {
      let out = "";
      for (const ch of str) {
        if (ch === "X") out += R.X();
        else if (ch === "F") out += R.F();
        else out += ch;
      }
      str = out;
      if (str.length > 12000) break; // límite de seguridad
    }
    return str;
  }

  /* ---------- Intérprete tortuga ---------- */
  function build(genome) {
    const rand = rng(genome.seed);
    const R = rules(genome.species, rand);
    const str = expand(genome, R);

    const angleRad = (genome.angle * Math.PI) / 180;
    const baseLen = R.segLen * (genome.species === "cactus" ? 7 : 5.2);

    const segments = [];  // {x1,y1,x2,y2,w,depth,cum}
    const leaves = [];    // {x,y,a,depth}
    const blooms = [];    // {x,y,depth}  (corolas / puntas)
    const spines = [];    // {x,y,a}

    let x = 0, y = 0, a = -Math.PI / 2; // apunta hacia arriba
    let depth = 0;
    const stack = [];
    let cum = 0;
    let maxDepth = 1;

    for (const ch of str) {
      if (ch === "F") {
        // tropismo (gravedad o empuje solar) + ruido orgánico
        const grav = R.tropism * Math.sin(a + Math.PI / 2) * (1 + depth * 0.6);
        a += grav + (rand() - 0.5) * 0.06 * (1 + genome.complexity);

        const len = baseLen * Math.pow(0.92, depth);
        const nx = x + Math.cos(a) * len;
        const ny = y + Math.sin(a) * len;
        cum += len;
        segments.push({
          x1: x, y1: y, x2: nx, y2: ny,
          w: Math.max(0.6, R.width * (3.4 - depth * 0.55)),
          depth, cum,
        });
        maxDepth = Math.max(maxDepth, depth + 1);

        // hojas según densidad del genoma
        if (depth >= 1 && rand() < genome.leafDensity * 0.5) {
          leaves.push({ x: nx, y: ny, a: a + (rand() < 0.5 ? 1 : -1) * 0.9, depth, cum });
        }
        // espinas del cactus
        if (genome.species === "cactus" && rand() < 0.55) {
          spines.push({ x: nx, y: ny, a: a + (rand() < 0.5 ? 1 : -1) * (Math.PI / 2), cum });
        }
        x = nx; y = ny;
      }
      else if (ch === "+") a += angleRad * (0.85 + rand() * 0.3);
      else if (ch === "-") a -= angleRad * (0.85 + rand() * 0.3);
      else if (ch === "[") { stack.push({ x, y, a, depth }); depth++; }
      else if (ch === "]") {
        // punta terminal → posible corola
        if (genome.species === "flor" && rand() < 0.45) blooms.push({ x, y, depth, cum });
        if (genome.species === "helecho" && rand() < 0.2) leaves.push({ x, y, a, depth, cum });
        const s = stack.pop();
        if (s) ({ x, y, a, depth } = s);
      }
    }

    // gancho de pregunta: rizo al final del tallo más alto
    if (genome.hook && segments.length) {
      let apex = segments[0];
      for (const s of segments) if (s.y2 < apex.y2) apex = s;
      let hx = apex.x2, hy = apex.y2, ha = -Math.PI / 2;
      for (let i = 0; i < 9; i++) {
        ha += 0.42;
        const len = 4.4 - i * 0.28;
        const nx2 = hx + Math.cos(ha) * len;
        const ny2 = hy + Math.sin(ha) * len;
        cum += len;
        segments.push({ x1: hx, y1: hy, x2: nx2, y2: ny2, w: 1.2, depth: maxDepth, cum, hook: true });
        hx = nx2; hy = ny2;
      }
    }

    // caja de la planta para escalar
    let minX = 0, maxX = 0, minY = 0;
    for (const s of segments) {
      minX = Math.min(minX, s.x1, s.x2);
      maxX = Math.max(maxX, s.x1, s.x2);
      minY = Math.min(minY, s.y1, s.y2);
    }

    return {
      segments, leaves, blooms, spines,
      totalLen: cum,
      maxDepth,
      bounds: { minX, maxX, minY },
    };
  }

  return { build };
})();
