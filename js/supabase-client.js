/* ============================================================
   CLIENTE ÚNICO DE SUPABASE — lo comparten auth.js y db.js para
   que la sesión de autenticación y las consultas a datos vivan
   en el mismo cliente. Si no hay credenciales en config.js,
   SB queda en null y toda la app cae a modo local/invitado.
   ============================================================ */

const SB = (CONFIG.hasSupabase && window.supabase)
  ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  : null;

/* Los eventos de auth (incluida la recuperación de contraseña,
   que llega por la URL nada más cargar la página) se capturan
   aquí mismo, en el mismo script donde se crea el cliente, para
   que ningún listener que se registre después se los pierda. */
window.__authEvents = [];
if (SB) {
  SB.auth.onAuthStateChange((event, session) => {
    window.__authEvents.push({ event, session });
    window.dispatchEvent(new CustomEvent("sb-auth-change", { detail: { event, session } }));
  });
}
