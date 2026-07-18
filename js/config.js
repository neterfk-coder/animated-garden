/* ============================================================
   CONFIGURACIÓN — conecta aquí tus servicios
   ------------------------------------------------------------
   1) SUPABASE (jardín compartido entre todos los visitantes)
      - Crea un proyecto gratis en https://supabase.com
      - Ejecuta supabase/schema.sql en el SQL Editor
      - Copia Project URL y anon public key aquí abajo
      - Si dejas los placeholders, la app funciona igual en
        MODO LOCAL (guarda tus plantas solo en tu navegador).

   2) IA OPCIONAL (análisis de sentimiento con Claude)
      - No se configura aquí: se configura como variable de
        entorno ANTHROPIC_API_KEY en Vercel (ver README).
      - Sin ella, la app usa el analizador léxico local,
        que funciona sin ninguna clave.
   ============================================================ */

const CONFIG = {
  SUPABASE_URL: "TU_SUPABASE_URL",        // ej: "https://abcd1234.supabase.co"
  SUPABASE_ANON_KEY: "TU_SUPABASE_ANON_KEY",

  // Ruta del endpoint serverless de IA (Vercel). Déjalo así.
  AI_ENDPOINT: "/api/analyze",

  // Máximo de plantas visibles a la vez (las más recientes)
  MAX_PLANTS: 48,

  // Duración de la germinación en milisegundos
  GERMINATION_MS: 4200,
};

CONFIG.hasSupabase =
  CONFIG.SUPABASE_URL.startsWith("https://") &&
  !CONFIG.SUPABASE_ANON_KEY.startsWith("TU_");
