/* ============================================================
   INTERFAZ DE AUTENTICACIÓN — pestañas animadas de inicio de
   sesión, registro, recuperar contraseña, invitado, y el aviso
   para fijar nueva contraseña tras el enlace de recuperación.
   ============================================================ */

const AuthUI = (() => {
  const $ = (id) => document.getElementById(id);
  const authEl = $("auth");
  const tabs = [...document.querySelectorAll(".auth__tab")];
  const indicator = document.querySelector(".auth__tab-indicator");

  const panels = {
    login: $("auth-login"),
    signup: $("auth-signup"),
    recover: $("auth-recover"),
    newpass: $("auth-newpass"),
  };

  let lastSession = null;

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
    const code = err?.code || "";
    if (/Email not confirmed/i.test(msg) || code === "email_not_confirmed")
      return I18N.t("auth.err.notConfirmed");
    if (/Invalid login credentials/i.test(msg) || code === "invalid_credentials")
      return I18N.t("auth.err.invalidCredentials");
    if (/User already registered/i.test(msg) || code === "user_already_exists")
      return I18N.t("auth.err.alreadyRegistered");
    if (/Password should be at least/i.test(msg) || /weak.?password/i.test(code))
      return I18N.t("auth.err.weakPassword");
    if (/is invalid|invalid.*email|email.*invalid/i.test(msg) || code === "validation_failed")
      return I18N.t("auth.err.invalidEmail");
    // límites: por correos enviados o por el enfriamiento de seguridad
    if (/rate limit|only request this after|for security purposes|too many/i.test(msg) ||
        /rate.?limit/i.test(code))
      return I18N.t("auth.err.rateLimit");
    if (/Supabase no configurado/i.test(msg)) return I18N.t("auth.err.noBackend");
    if (/fetch|network|Failed to fetch/i.test(msg)) return I18N.t("auth.err.network");
    // deja rastro del mensaje original para depurar sin mostrarlo al usuario
    if (msg) console.warn("[auth] error sin traducir:", msg, code);
    return I18N.t("auth.err.generic");
  }

  // view: prefijo de las claves auth.<view>.submit / auth.<view>.busy
  function setBusy(form, view, busy) {
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = busy;
    if (busy) {
      btn.removeAttribute("data-i18n");
      btn.textContent = I18N.t(`auth.${view}.busy`);
    } else {
      btn.setAttribute("data-i18n", `auth.${view}.submit`);
      btn.textContent = I18N.t(`auth.${view}.submit`);
    }
  }

  function enterGarden() {
    authEl.classList.add("is-done");
    UI.revealGarden();
  }

  /* ---------- Iniciar sesión ---------- */
  panels.login.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(e.target, "login", true);
    try {
      await Auth.signIn(fd.get("email"), fd.get("password"));
      Auth.clearGuest();
      enterGarden();
    } catch (err) {
      setNote("login", translateError(err));
    } finally {
      setBusy(e.target, "login", false);
    }
  });

  /* ---------- Registro ---------- */
  panels.signup.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(e.target, "signup", true);
    try {
      const data = await Auth.signUp(fd.get("email"), fd.get("password"));
      Auth.clearGuest();
      if (data.session) {
        enterGarden();
      } else {
        setNote("signup", I18N.t("auth.signup.confirmNotice"), "ok");
      }
    } catch (err) {
      setNote("signup", translateError(err));
    } finally {
      setBusy(e.target, "signup", false);
    }
  });

  /* ---------- Recuperar contraseña ---------- */
  panels.recover.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(e.target, "recover", true);
    try {
      await Auth.recover(fd.get("email"));
      setNote("recover", I18N.t("auth.recover.sentNotice"), "ok");
    } catch (err) {
      setNote("recover", translateError(err));
    } finally {
      setBusy(e.target, "recover", false);
    }
  });

  /* ---------- Nueva contraseña (tras el enlace de recuperación) ---------- */
  panels.newpass.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(e.target, "newpass", true);
    try {
      await Auth.updatePassword(fd.get("password"));
      recovering = false;
      // limpia el token de la URL para que un recargado no reabra la recuperación
      history.replaceState(null, "", window.location.pathname + window.location.search);
      window.__recoveryLink = false;
      enterGarden();
    } catch (err) {
      setNote("newpass", translateError(err));
    } finally {
      setBusy(e.target, "newpass", false);
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
    lastSession = session;
    const label = $("user-label");
    const logoutBtn = $("logout-btn");
    if (session?.user) {
      label.textContent = session.user.email || I18N.t("account.guest");
      logoutBtn.hidden = false;
    } else if (Auth.isGuest()) {
      label.textContent = I18N.t("account.guest");
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

  I18N.onChange(() => updateAccountBadge(lastSession));

  /* ---------- Recuperación de contraseña ----------
     El enlace del correo crea sesión al cargar. Sin esta guarda, el
     arranque daría por buena esa sesión y colaría al usuario al
     jardín, dejándolo sin forma de fijar su nueva contraseña. */
  let recovering = window.__recoveryLink === true;

  function showRecovery() {
    recovering = true;
    UI.exitGarden();          // por si el jardín ya estaba a la vista
    authEl.classList.remove("is-done");
    showView("newpass");
  }

  /* ---------- Arranque ---------- */
  async function init() {
    if (!Auth.hasBackend) authEl.classList.add("auth--local");

    Auth.onChange((event, session) => {
      updateAccountBadge(session);
      if (event === "PASSWORD_RECOVERY") showRecovery();
    });

    const session = await Auth.getSession();
    updateAccountBadge(session);

    if (recovering) {
      showRecovery();
    } else if (session || Auth.isGuest()) {
      enterGarden();
    } else {
      showView("login");
    }
  }

  init();

  return { showView };
})();
