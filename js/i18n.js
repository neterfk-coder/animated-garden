/* ============================================================
   IDIOMA — diccionario ES/EN, selector flotante y aplicación de
   textos estáticos vía atributos data-i18n*. El resto de módulos
   (ui.js, auth-ui.js, main.js) llaman a I18N.t(key, vars) para
   generar textos dinámicos (toasts, ficha de herbario, errores)
   y escuchan el evento "i18n-change" para refrescar lo que ya
   está en pantalla cuando el usuario cambia de idioma.
   ============================================================ */

const I18N = (() => {
  const LANG_KEY = "jardin-semantico:lang";

  const dict = {
    es: {
      "brand.name": "Jardín Semántico",
      "brand.subtitle": "herbario vivo",
      "canvas.ariaLabel": "Jardín de plantas generadas por frases",

      "intro.eyebrow": "Invernadero colectivo · nº 001",
      "intro.title": "Jardín<br/>Semántico",
      "intro.lede": "Aquí no se plantan semillas. Se plantan frases.<br/>Escribe algo — un recuerdo, una queja, un verso — y míralo germinar.",

      "auth.localNote": "Este jardín corre en modo local: entra como invitado, sin necesidad de cuenta.",
      "auth.tab.login": "Iniciar sesión",
      "auth.tab.signup": "Registro",
      "auth.tab.recover": "Recuperar",

      "auth.field.email": "Correo",
      "auth.field.password": "Contraseña",
      "auth.field.newPassword": "Nueva contraseña",
      "auth.placeholder.email": "tu@correo.com",
      "auth.placeholder.password": "••••••••",
      "auth.placeholder.minPassword": "mínimo 6 caracteres",

      "auth.login.submit": "Entrar",
      "auth.login.busy": "Entrando…",

      "auth.signup.submit": "Crear cuenta",
      "auth.signup.busy": "Creando…",
      "auth.signup.confirmNotice": "Revisa tu correo para confirmar tu cuenta.",

      "auth.recover.note": "Te enviaremos un enlace para elegir una contraseña nueva.",
      "auth.recover.submit": "Enviar enlace",
      "auth.recover.busy": "Enviando…",
      "auth.recover.sentNotice": "Enlace enviado. Revisa tu correo.",
      "auth.recover.back": "← Volver a iniciar sesión",

      "auth.newpass.note": "Elige tu nueva contraseña para terminar de recuperar tu cuenta.",
      "auth.newpass.submit": "Guardar contraseña",
      "auth.newpass.busy": "Guardando…",

      "auth.guest": "Continuar como invitado →",

      "auth.err.invalidCredentials": "Correo o contraseña incorrectos.",
      "auth.err.alreadyRegistered": "Ya existe una cuenta con ese correo.",
      "auth.err.weakPassword": "La contraseña debe tener al menos 6 caracteres.",
      "auth.err.invalidEmail": "Ese correo no parece válido. Prueba con otro.",
      "auth.err.rateLimit": "Demasiados intentos. Espera un momento y vuelve a intentarlo.",
      "auth.err.noBackend": "Este jardín corre en modo local — entra como invitado.",
      "auth.err.generic": "Algo salió mal. Inténtalo de nuevo.",

      "account.guest": "Invitado",
      "account.logoutTitle": "Cerrar sesión",

      "stat.plants": "especímenes",
      "stat.modeShared": "jardín compartido",
      "stat.modeLocal": "jardín local",

      "sower.label": "Planta una frase",
      "sower.placeholder": "Escribe lo que estás pensando…",
      "sower.hint": "Tu frase decide la especie: su ánimo, su sintaxis y sus palabras se vuelven anatomía.",
      "sower.idle": "Germinar",
      "sower.busy": "Germinando…",
      "sower.drag": "Arrastra para mover el panel",

      "toast.tooShort": "Escribe al menos unas palabras para que germine algo.",
      "toast.germinated": "Germinó {latin} — {species}.",
      "toast.error": "Algo impidió la germinación. Inténtalo de nuevo.",
      "toast.someone": "Alguien plantó {latin} en el jardín.",

      "specimen.tag": "Ficha de herbario",
      "specimen.sentimentLabel": "Sentimiento",
      "specimen.complexityLabel": "Complejidad",
      "specimen.germinatedLabel": "Germinó",
      "specimen.today": "hoy",
      "specimen.myPhrase": "Tu frase",
      "specimen.pollen": "Polen (palabra clave)",
      "specimen.sentimentBright": "luminoso (+{v})",
      "specimen.sentimentDark": "sombrío ({v})",
      "specimen.sentimentCalm": "sereno ({v})",
      "specimen.complexHigh": "enredada",
      "specimen.complexMid": "media",
      "specimen.complexLow": "sencilla",
      "specimen.kinOne": "Sus raíces se entrelazan con {n} planta de significado afín.",
      "specimen.kinMany": "Sus raíces se entrelazan con {n} plantas de significado afín.",
      "specimen.close": "Cerrar ficha",
      "specimen.save": "Guardar tarjeta ↓",
      "specimen.saving": "Componiendo…",
      "specimen.saved": "Tarjeta de herbario guardada.",

      "water.toggle": "Regadera — riega tus plantas",
      "water.pressure": "Presión del agua",
      "prune.toggle": "Tijeras de podar — recorta tus plantas",

      "species.flor": "Flor de ánimo luminoso",
      "species.sauce": "Sauce de melancolía",
      "species.cactus": "Cactus de furia contenida",
      "species.helecho": "Helecho de pensamiento neutro",
      "species.rosa": "Rosa de amor encendido",
      "species.girasol": "Girasol de luz plena",
      "species.lavanda": "Lavanda de calma serena",
      "species.rubi": "Flor de rubí — pasión cristalizada",
      "species.zafiro": "Flor de zafiro — profundidad nocturna",
      "species.ambar": "Flor de ámbar — memoria dorada",
      "species.bambu": "Bambú de voluntad firme",
      "species.orquidea": "Orquídea de pensamiento etéreo",
      "species.hongo": "Hongo de misterio umbrío",
      "species.enredadera": "Enredadera de ideas entrelazadas",
      "species.diente": "Diente de león de deseos al viento",
      "species.loto": "Flor de loto — serenidad que renace",

      "meta.title": "Jardín Semántico — donde las palabras germinan",
      "meta.description": "Un invernadero digital colectivo donde cada frase que escribes germina en una planta única. Arte que no podría existir sin la tecnología.",
    },

    en: {
      "brand.name": "Semantic Garden",
      "brand.subtitle": "living herbarium",
      "canvas.ariaLabel": "Garden of plants generated from sentences",

      "intro.eyebrow": "Collective greenhouse · no. 001",
      "intro.title": "Semantic<br/>Garden",
      "intro.lede": "Here, seeds aren't planted. Sentences are.<br/>Write something — a memory, a complaint, a verse — and watch it germinate.",

      "auth.localNote": "This garden is running in local mode: continue as a guest, no account needed.",
      "auth.tab.login": "Log in",
      "auth.tab.signup": "Sign up",
      "auth.tab.recover": "Recover",

      "auth.field.email": "Email",
      "auth.field.password": "Password",
      "auth.field.newPassword": "New password",
      "auth.placeholder.email": "you@email.com",
      "auth.placeholder.password": "••••••••",
      "auth.placeholder.minPassword": "minimum 6 characters",

      "auth.login.submit": "Log in",
      "auth.login.busy": "Logging in…",

      "auth.signup.submit": "Create account",
      "auth.signup.busy": "Creating…",
      "auth.signup.confirmNotice": "Check your email to confirm your account.",

      "auth.recover.note": "We'll send you a link to choose a new password.",
      "auth.recover.submit": "Send link",
      "auth.recover.busy": "Sending…",
      "auth.recover.sentNotice": "Link sent. Check your email.",
      "auth.recover.back": "← Back to log in",

      "auth.newpass.note": "Choose a new password to finish recovering your account.",
      "auth.newpass.submit": "Save password",
      "auth.newpass.busy": "Saving…",

      "auth.guest": "Continue as guest →",

      "auth.err.invalidCredentials": "Incorrect email or password.",
      "auth.err.alreadyRegistered": "An account with that email already exists.",
      "auth.err.weakPassword": "Password must be at least 6 characters.",
      "auth.err.invalidEmail": "That email doesn't look valid. Try another one.",
      "auth.err.rateLimit": "Too many attempts. Wait a moment and try again.",
      "auth.err.noBackend": "This garden is running in local mode — continue as a guest.",
      "auth.err.generic": "Something went wrong. Please try again.",

      "account.guest": "Guest",
      "account.logoutTitle": "Log out",

      "stat.plants": "specimens",
      "stat.modeShared": "shared garden",
      "stat.modeLocal": "local garden",

      "sower.label": "Plant a sentence",
      "sower.placeholder": "Write what's on your mind…",
      "sower.hint": "Your sentence decides the species: its mood, syntax and words become anatomy.",
      "sower.idle": "Germinate",
      "sower.busy": "Germinating…",
      "sower.drag": "Drag to move the panel",

      "toast.tooShort": "Write at least a few words for something to germinate.",
      "toast.germinated": "{latin} germinated — {species}.",
      "toast.error": "Something stopped the germination. Try again.",
      "toast.someone": "Someone planted {latin} in the garden.",

      "specimen.tag": "Herbarium record",
      "specimen.sentimentLabel": "Mood",
      "specimen.complexityLabel": "Complexity",
      "specimen.germinatedLabel": "Germinated",
      "specimen.today": "today",
      "specimen.myPhrase": "Your sentence",
      "specimen.pollen": "Pollen (keyword)",
      "specimen.sentimentBright": "radiant (+{v})",
      "specimen.sentimentDark": "somber ({v})",
      "specimen.sentimentCalm": "calm ({v})",
      "specimen.complexHigh": "tangled",
      "specimen.complexMid": "moderate",
      "specimen.complexLow": "simple",
      "specimen.kinOne": "Its roots intertwine with {n} plant of kindred meaning.",
      "specimen.kinMany": "Its roots intertwine with {n} plants of kindred meaning.",
      "specimen.close": "Close record",
      "specimen.save": "Save card ↓",
      "specimen.saving": "Composing…",
      "specimen.saved": "Herbarium card saved.",

      "water.toggle": "Watering can — water your plants",
      "water.pressure": "Water pressure",
      "prune.toggle": "Pruning shears — trim your plants",

      "species.flor": "Flower of radiant spirit",
      "species.sauce": "Willow of melancholy",
      "species.cactus": "Cactus of contained fury",
      "species.helecho": "Fern of neutral thought",
      "species.rosa": "Rose of burning love",
      "species.girasol": "Sunflower of full light",
      "species.lavanda": "Lavender of serene calm",
      "species.rubi": "Ruby bloom — crystallized passion",
      "species.zafiro": "Sapphire bloom — nocturnal depth",
      "species.ambar": "Amber bloom — golden memory",
      "species.bambu": "Bamboo of steadfast will",
      "species.orquidea": "Orchid of ethereal thought",
      "species.hongo": "Mushroom of shadowed mystery",
      "species.enredadera": "Vine of intertwined ideas",
      "species.diente": "Dandelion of wind-borne wishes",
      "species.loto": "Lotus bloom — serenity reborn",

      "meta.title": "Semantic Garden — where words germinate",
      "meta.description": "A collective digital greenhouse where every sentence you write germinates into a unique plant. Art that couldn't exist without technology.",
    },
  };

  const seeds = {
    es: [
      "Hoy el sol entró por la ventana y me acordé de reír",
      "Te extraño, aunque nunca sepa decirlo en voz alta…",
      "¿Y si el tiempo no fuera una línea sino un jardín?",
    ],
    en: [
      "Today the sun came through the window and I remembered how to laugh",
      "I miss you, though I never know how to say it out loud…",
      "What if time weren't a line but a garden?",
    ],
  };

  function detectDefault() {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "es" || saved === "en") return saved;
    return (navigator.language || "es").toLowerCase().startsWith("en") ? "en" : "es";
  }

  let lang = detectDefault();

  function t(key, vars) {
    const table = dict[lang] || dict.es;
    let str = table[key] ?? dict.es[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, v);
      }
    }
    return str;
  }

  function seedPhrases() {
    return seeds[lang] || seeds.es;
  }

  function applyStatic(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    root.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
    });
    document.documentElement.lang = lang;
    document.title = t("meta.title");
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t("meta.description"));
  }

  function syncSwitch() {
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.lang === lang);
    });
  }

  function setLang(next) {
    if (next !== "es" && next !== "en") return;
    lang = next;
    localStorage.setItem(LANG_KEY, lang);
    applyStatic();
    syncSwitch();
    window.dispatchEvent(new CustomEvent("i18n-change", { detail: { lang } }));
  }

  function getLang() { return lang; }

  function onChange(cb) {
    window.addEventListener("i18n-change", (e) => cb(e.detail.lang));
  }

  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  applyStatic();
  syncSwitch();

  return { t, setLang, getLang, applyStatic, onChange, seedPhrases };
})();
