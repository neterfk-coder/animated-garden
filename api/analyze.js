/* ============================================================
   /api/analyze — función serverless (Vercel).
   Analiza la frase con Groq (modelos Llama) y devuelve:
     { sentiment, anger, abstractness, complexity, keyword }

   Configuración: añade la variable de entorno GROQ_API_KEY
   en el panel de Vercel. Si no existe, responde 501 y el
   frontend usa automáticamente el analizador léxico local.
   ============================================================ */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(501).json({ error: "IA no configurada" });
  }

  const { phrase } = req.body || {};
  if (!phrase || typeof phrase !== "string" || phrase.length > 300) {
    return res.status(400).json({ error: "Frase inválida" });
  }

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 200,
        response_format: { type: "json_object" },
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

    if (!r.ok) throw new Error(`Groq API ${r.status}`);
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content || "";
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
