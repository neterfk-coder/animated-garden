/* ============================================================
   AUTENTICACIÓN — inicio de sesión, registro, recuperación de
   contraseña e invitado. Envuelve el cliente único SB (ver
   supabase-client.js). Sin Supabase configurado, Auth.hasBackend
   es false y solo queda disponible el modo invitado.
   ============================================================ */

const Auth = (() => {
  const GUEST_KEY = "jardin-semantico:guest";

  function isGuest() { return localStorage.getItem(GUEST_KEY) === "1"; }
  function setGuest() { localStorage.setItem(GUEST_KEY, "1"); }
  function clearGuest() { localStorage.removeItem(GUEST_KEY); }

  async function getSession() {
    if (!SB) return null;
    const { data } = await SB.auth.getSession();
    return data.session;
  }

  async function signIn(email, password) {
    if (!SB) throw new Error("Supabase no configurado");
    const { data, error } = await SB.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password) {
    if (!SB) throw new Error("Supabase no configurado");
    const { data, error } = await SB.auth.signUp({ email, password });
    if (error) throw error;
    return data; // data.session es null si el proyecto exige confirmar el correo
  }

  async function recover(email) {
    if (!SB) throw new Error("Supabase no configurado");
    const { error } = await SB.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) throw error;
  }

  async function updatePassword(password) {
    if (!SB) throw new Error("Supabase no configurado");
    const { error } = await SB.auth.updateUser({ password });
    if (error) throw error;
  }

  async function signOut() {
    if (SB) await SB.auth.signOut();
    clearGuest();
  }

  function onChange(cb) {
    window.__authEvents.forEach(({ event, session }) => cb(event, session));
    window.addEventListener("sb-auth-change", (e) => cb(e.detail.event, e.detail.session));
  }

  return {
    isGuest, setGuest, clearGuest,
    getSession, signIn, signUp, recover, updatePassword, signOut, onChange,
    get hasBackend() { return !!SB; },
  };
})();
