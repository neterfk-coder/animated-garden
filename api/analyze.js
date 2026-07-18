/* ============================================================
   /api/analyze — función serverless (Vercel).
   Analiza la frase con Claude (API de Anthropic) y devuelve:
     { sentiment, anger, abstractness, complexity, keyword }

   Configuración: añade la variable de entorno ANTHROPIC_API_KEY
   en el panel de Vercel. Si no existe, responde 501 y el
   frontend usa automáticamente el analizador léxico local.
   ============================================================ */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(501).json({ error: "IA no configurada" });
  }

  const { phrase } = req.body || {};
  if (!phrase || typeof phrase !== "string" || phrase.length > 300) {
    return res.status(400).json({ error: "Frase inválida" });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content:
              `Analiza esta frase en español y responde SOLO con un objeto JSON válido, sin markdown ni texto adicional, con estas claves:\n` +
              `- "sentiment": número de -1 (muy negativo) a 1 (muy positivo)\n` +
              `- "anger": número de 0 a 1 (nivel de rabia o enojo)\n` +
              `- "abstractness": número de 0 (muy concreta) a 1 (muy abstracta)\n` +
              `- "complexity": número de 0 (sintaxis simple) a 1 (muy subordinada y enredada)\n` +
              `- "keyword": la palabra más significativa de la frase, en minúsculas\n\n` +
              `Frase: "${phrase.replace(/"/g, "'")}"`,
          },
        ],
      }),
    });

    if (!r.ok) throw new Error(`Anthropic API ${r.status}`);
    const data = await r.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json({
      sentiment: clamp(parsed.sentiment, -1, 1),
      anger: clamp(parsed.anger, 0, 1),
      abstractness: clamp(parsed.abstractness, 0, 1),
      complexity: clamp(parsed.complexity, 0, 1),
      keyword: String(parsed.keyword || "").slice(0, 30) || "…",
    });
  } catch (err) {
    console.error("analyze error:", err.message);
    return res.status(502).json({ error: "Fallo del análisis" });
  }
}

function clamp(v, min, max) {
  const n = Number(v);
  if (Number.isNaN(n)) return (min + max) / 2;
  return Math.max(min, Math.min(max, n));
}
