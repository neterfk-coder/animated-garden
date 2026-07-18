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
  SUPABASE_URL: "https://rplylvzrwnhgdaskdkrn.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbHlsdnpyd25oZ2Rhc2tka3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MDQ4OTAsImV4cCI6MjA5OTk4MDg5MH0.8O_u3-qG5mNNNb40ipn8xfrPGo0gN2RuHP-ayqCL7Ec",

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
