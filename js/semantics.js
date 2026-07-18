/* ============================================================
   SEMÁNTICA — convierte una frase en el GENOMA de una planta.
   Cada rasgo lingüístico controla un rasgo anatómico:

     sentimiento      → especie (flor / sauce / cactus / helecho)
     complejidad      → ramificación y torsión
     concreción       → densidad y opacidad de hojas
     longitud         → altura
     ¿pregunta?       → tallo en gancho
     ...suspensivos   → goteo de partículas
     ¡exclamación!    → energía angular

   Intenta primero la IA (Claude vía /api/analyze); si no está
   disponible, usa el analizador léxico local. Siempre funciona.
   ============================================================ */

const Semantics = (() => {

  function tokenize(phrase) {
    return phrase
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, m => m) // conserva tildes
      .replace(/[.,;:!?¡¿"«»()\-—]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function countMatches(tokens, list) {
    const set = new Set(list);
    return tokens.filter(t => set.has(t)).length;
  }

  /* ---------- Analizador local (léxico) ---------- */
  function analyzeLocal(phrase) {
    const tokens = tokenize(phrase);
    const n = Math.max(tokens.length, 1);

    const pos = countMatches(tokens, LEXICON.positive);
    const neg = countMatches(tokens, LEXICON.negative);
    const ang = countMatches(tokens, LEXICON.anger);
    const conc = countMatches(tokens, LEXICON.concrete);
    const abst = countMatches(tokens, LEXICON.abstract);
    const subs = countMatches(tokens, LEXICON.subordinators);
    const commas = (phrase.match(/,/g) || []).length;

    // sentimiento en [-1, 1]
    let sentiment = (pos - neg - ang * 1.4) / Math.sqrt(n);
    sentiment = Math.max(-1, Math.min(1, sentiment));

    const anger = Math.min(1, (ang * 2) / Math.sqrt(n));
    const abstractness = Math.min(1, Math.max(0,
      0.5 + (abst - conc) / Math.max(conc + abst, 1) * 0.5));
    const complexity = Math.min(1, (subs + commas) / 6 + Math.min(n, 30) / 60);

    // palabra clave: la palabra significativa más larga
    const keyword = tokens
      .filter(t => !LEXICON.stopwords.includes(t) && t.length > 2)
      .sort((a, b) => b.length - a.length)[0] || tokens[0] || "…";

    return { sentiment, anger, abstractness, complexity, keyword, source: "léxico local" };
  }

  /* ---------- Analizador con IA (opcional) ---------- */
  async function analyzeAI(phrase) {
    const res = await fetch(CONFIG.AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrase }),
    });
    if (!res.ok) throw new Error("IA no disponible");
    const data = await res.json();
    if (typeof data.sentiment !== "number") throw new Error("Respuesta inválida");
    return { ...data, source: "IA (Claude)" };
  }

  /* ---------- Análisis principal ---------- */
  async function analyze(phrase) {
    try {
      return await analyzeAI(phrase);
    } catch {
      return analyzeLocal(phrase);
    }
  }

  /* ---------- Especie según el ánimo ---------- */
  function pickSpecies(a) {
    if (a.anger > 0.35 || (a.sentiment < -0.3 && a.anger > 0.15)) return "cactus";
    if (a.sentiment > 0.25) return "flor";
    if (a.sentiment < -0.25) return "sauce";
    return "helecho";
  }

  /* ---------- Nombre latinizado (herbario) ---------- */
  function latinName(keyword, species) {
    const genus = {
      flor:   "Floralis",
      sauce:  "Salix",
      cactus: "Spinosa",
      helecho:"Filix",
    }[species];
    let epithet = keyword
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/gi, "")
      .toLowerCase();
    if (!epithet) epithet = "anonyma";
    const suffix = /[aeiou]$/.test(epithet) ? "e" : "is";
    return `${genus} ${epithet}${suffix}`;
  }

  /* ---------- Frase → GENOMA ---------- */
  function toGenome(phrase, a) {
    const species = pickSpecies(a);
    const len = Math.min(phrase.trim().length, 180);
    const hasQuestion = /[?¿]/.test(phrase);
    const hasEllipsis = /\.\.\.|…/.test(phrase);
    const hasExclaim  = /[!¡]/.test(phrase);

    // semilla determinista a partir de la frase (misma frase → misma planta)
    let seed = 0;
    for (let i = 0; i < phrase.length; i++) {
      seed = (seed * 31 + phrase.charCodeAt(i)) >>> 0;
    }

    return {
      species,
      seed,
      keyword: a.keyword,
      latin: latinName(a.keyword, species),
      sentiment: +a.sentiment.toFixed(3),
      anger: +(a.anger || 0).toFixed(3),
      abstractness: +a.abstractness.toFixed(3),
      complexity: +a.complexity.toFixed(3),
      height: 0.45 + (len / 180) * 0.55,          // 0.45–1.0
      iterations: 3 + Math.round(a.complexity), // 3–4 niveles L-system
      angle: 16 + a.complexity * 22 + (hasExclaim ? 8 : 0),
      leafDensity: 0.35 + (1 - a.abstractness) * 0.65,
      leafAlpha: 0.35 + (1 - a.abstractness) * 0.55,
      hook: hasQuestion,
      drips: hasEllipsis,
      exclaim: hasExclaim,
      aiSource: a.source,
    };
  }

  return { analyze, toGenome, tokenize };
})();
