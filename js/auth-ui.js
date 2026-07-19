/* ============================================================
   INTERFAZ DE AUTENTICACIÓN — pestañas animadas de inicio de
   sesión, registro, recuperar contraseña, invitado, y el aviso
   para fijar nueva contraseña tras el enlace de recuperación.
   ============================================================ */

const AuthUI = (() => {
  const $ = (id) => document.getElementById(id);
  const authEl = $("auth");
  const tabsWrap = document.querySelector(".auth__tabs");
  const tabs = [...document.querySelectorAll(".auth__tab")];
  const indicator = document.querySelector(".auth__tab-indicator");

  const panels = {
    login: $("auth-login"),
    signup: $("auth-signup"),
    recover: $("auth-recover"),
    newpass: $("auth-newpass"),
  };

  function moveIndicator(tab) {
    indicator.style.width = tab.offsetWidth + "px";
    indicator.style.transform = `translateX(${tab.offsetLeft}px)`;
  }

  function showView(view) {
    tabs.forEach((t) => {
      const active = t.dataset.view === view;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    Object.entries(panels).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle("is-active", key === view);
      const err = el.querySelector(".auth__error");
      if (err) { err.textContent = ""; err.removeAttribute("style"); }
    });
    const activeTab = tabs.find((t) => t.dataset.view === view);
    if (activeTab) moveIndicator(activeTab);
    authEl.classList.toggle("is-recovering", view === "newpass");
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));
  authEl.querySelectorAll(".auth__back").forEach((btn) =>
    btn.addEventListener("click", () => showView(btn.dataset.goto))
  );

  window.addEventListener("resize", () => {
    const active = tabs.find((t) => t.classList.contains("is-active"));
    if (active) moveIndicator(active);
  });

  function setNote(view, msg, tone) {
    const el = authEl.querySelector(`.auth__error[data-for="${view}"]`);
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = tone === "ok" ? "var(--verdigris)" : "";
  }

  function translateError(err) {
    const msg = err?.message || "";
    if (/Invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
    if (/User already registered/i.test(msg)) return "Ya existe una cuenta con ese correo.";
    if (/Password should be at least/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres.";
    if (/is invalid/i.test(msg)) return "Ese correo no parece válido. Prueba con otro.";
    if (/rate limit/i.test(msg)) return "Demasiados intentos. Espera un momento y vuelve a intentarlo.";
    if (/Supabase no configurado/i.test(msg)) return "Este jardín corre en modo local — entra como invitado.";
    return "Algo salió mal. Inténtalo de nuevo.";
  }

  function setBusy(form, busy, busyLabel, idleLabel) {
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = busy;
    btn.textContent = busy ? busyLabel : idleLabel;
  }

  function enterGarden() {
    authEl.classList.add("is-done");
    UI.revealGarden();
  }

  /* ---------- Iniciar sesión ---------- */
  panels.login.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(e.target, true, "Entrando…", "Entrar");
    try {
      await Auth.signIn(fd.get("email"), fd.get("password"));
      Auth.clearGuest();
      enterGarden();
    } catch (err) {
      setNote("login", translateError(err));
    } finally {
      setBusy(e.target, false, "Entrando…", "Entrar");
    }
  });

  /* ---------- Registro ---------- */
  panels.signup.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(e.target, true, "Creando…", "Crear cuenta");
    try {
      const data = await Auth.signUp(fd.get("email"), fd.get("password"));
      Auth.clearGuest();
      if (data.session) {
        enterGarden();
      } else {
        setNote("signup", "Revisa tu correo para confirmar tu cuenta.", "ok");
      }
    } catch (err) {
      setNote("signup", translateError(err));
    } finally {
      setBusy(e.target, false, "Creando…", "Crear cuenta");
    }
  });

  /* ---------- Recuperar contraseña ---------- */
  panels.recover.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(e.target, true, "Enviando…", "Enviar enlace");
    try {
      await Auth.recover(fd.get("email"));
      setNote("recover", "Enlace enviado. Revisa tu correo.", "ok");
    } catch (err) {
      setNote("recover", translateError(err));
    } finally {
      setBusy(e.target, false, "Enviando…", "Enviar enlace");
    }
  });

  /* ---------- Nueva contraseña (tras el enlace de recuperación) ---------- */
  panels.newpass.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(e.target, true, "Guardando…", "Guardar contraseña");
    try {
      await Auth.updatePassword(fd.get("password"));
      enterGarden();
    } catch (err) {
      setNote("newpass", translateError(err));
    } finally {
      setBusy(e.target, false, "Guardando…", "Guardar contraseña");
    }
  });

  /* ---------- Invitado ---------- */
  $("auth-guest").addEventListener("click", () => {
    Auth.setGuest();
    updateAccountBadge(null);
    enterGarden();
  });

  /* ---------- Insignia de cuenta + cerrar sesión ---------- */
  function updateAccountBadge(session) {
    const label = $("user-label");
    const logoutBtn = $("logout-btn");
    if (session?.user) {
      label.textContent = session.user.email || "Mi cuenta";
      logoutBtn.hidden = false;
    } else if (Auth.isGuest()) {
      label.textContent = "Invitado";
      logoutBtn.hidden = false;
    } else {
      label.textContent = "";
      logoutBtn.hidden = true;
    }
  }

  $("logout-btn").addEventListener("click", async () => {
    await Auth.signOut();
    location.reload();
  });

  /* ---------- Arranque ---------- */
  async function init() {
    if (!Auth.hasBackend) authEl.classList.add("auth--local");

    Auth.onChange((event, session) => {
      updateAccountBadge(session);
      if (event === "PASSWORD_RECOVERY") showView("newpass");
    });

    const session = await Auth.getSession();
    updateAccountBadge(session);

    if (session || Auth.isGuest()) {
      enterGarden();
    } else {
      showView("login");
    }
  }

  init();

  return { showView };
})();
