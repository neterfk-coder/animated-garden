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
      "auth.err.notConfirmed": "Falta confirmar tu correo: abre el enlace que te enviamos.",
      "auth.err.network": "Sin conexión con el servidor. Revisa tu internet.",
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
      "sound.toggle": "Sonido ambiental — el jardín suena según su ánimo",

      "manifesto.open": "Sobre esta obra",
      "manifesto.close": "Cerrar",
      "manifesto.tag": "Statement",
      "manifesto.title": "Jardín Semántico",
      "manifesto.lede": "Un invernadero donde no se plantan semillas: se plantan frases.",
      "manifesto.h1": "El gesto",
      "manifesto.p1": "Escribes una frase. Un sistema la mide —su ánimo, su sintaxis, su grado de abstracción— y traduce esas cifras en anatomía: la tristeza se vuelve un sauce que llora, la rabia un cactus con espinas, la serenidad un loto. No es una ilustración de tu frase: es tu frase dicha en otro idioma, el de un sistema de Lindenmayer que solo sabe crecer.",
      "manifesto.h2": "Lo que la máquina no entiende",
      "manifesto.p2": "Este jardín no comprende lo que escribes. Lo mide. Reduce un recuerdo a un número entre −1 y 1, y de esa reducción hace una planta hermosa. Ahí está la tensión que me interesa: toda tecnología que promete «entender» nuestras emociones hace exactamente esto —convertirlas en variables— y casi siempre nos oculta el procedimiento. Aquí el procedimiento es la obra. La belleza de la planta es también la evidencia del recorte.",
      "manifesto.h3": "Nadie planta la misma flor",
      "manifesto.p3": "La misma frase escrita por dos personas germina en plantas distintas: la semilla mezcla el texto con la identidad de quien lo escribe. No hay un significado universal esperando ser calculado. Hay significados situados, y el sistema lo admite.",
      "manifesto.h4": "Raíces que no sabías que tenías",
      "manifesto.p4": "Lo que escribes queda privado: solo tú ves tu frase completa; los demás ven una sola palabra, el polen. Pero bajo tierra el sistema compara todo con todo, y cuando dos desconocidos han escrito sobre lo mismo sin saberlo, sus raíces se entrelazan. Enciende la constelación y verás esos hilos cruzar el cielo. Ninguna de esas conexiones fue diseñada; ninguna sería visible sin el cálculo. Eso es lo único que este jardín no podría ser sin tecnología: un lugar donde la afinidad entre extraños se vuelve paisaje.",
      "manifesto.h5": "Cuidar lo ajeno",
      "manifesto.p5": "Puedes regar la frase de alguien a quien no conocerás nunca hasta que eche más ramas. También puedes podarla. El jardín es colectivo y frágil, como todo lo que compartimos.",

      "climate.toggle": "Clima emocional — mira cómo se siente el jardín entero",
      "climate.close": "Cerrar clima",
      "climate.tag": "Clima del jardín",
      "climate.specimens": "Especímenes",
      "climate.bonds": "Vínculos afines",
      "climate.flora": "Flora dominante",
      "climate.scaleLow": "sombrío",
      "climate.scaleHigh": "luminoso",
      "climate.hint": "Los hilos dorados unen frases de significado afín, escritas por personas distintas.",
      "climate.moodRadiant": "Jardín radiante",
      "climate.moodBright": "Jardín luminoso",
      "climate.moodCalm": "Jardín sereno",
      "climate.moodWistful": "Jardín nostálgico",
      "climate.moodSomber": "Jardín sombrío",
      "climate.empty": "El jardín aún no ha germinado.",

      "short.flor": "Flor", "short.sauce": "Sauce", "short.cactus": "Cactus",
      "short.helecho": "Helecho", "short.rosa": "Rosa", "short.girasol": "Girasol",
      "short.lavanda": "Lavanda", "short.rubi": "Rubí", "short.zafiro": "Zafiro",
      "short.ambar": "Ámbar", "short.bambu": "Bambú", "short.orquidea": "Orquídea",
      "short.hongo": "Hongo", "short.enredadera": "Enredadera",
      "short.diente": "Diente de león", "short.loto": "Loto",

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
      "auth.err.notConfirmed": "Your email isn't confirmed yet — open the link we sent you.",
      "auth.err.network": "Can't reach the server. Check your connection.",
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
      "sound.toggle": "Ambient sound — the garden plays to its mood",

      "manifesto.open": "About this work",
      "manifesto.close": "Close",
      "manifesto.tag": "Statement",
      "manifesto.title": "Semantic Garden",
      "manifesto.lede": "A greenhouse where seeds aren't planted. Sentences are.",
      "manifesto.h1": "The gesture",
      "manifesto.p1": "You write a sentence. A system measures it — its mood, its syntax, its degree of abstraction — and translates those figures into anatomy: sadness becomes a weeping willow, anger a thorned cactus, serenity a lotus. It isn't an illustration of your sentence: it is your sentence spoken in another language, that of a Lindenmayer system that only knows how to grow.",
      "manifesto.h2": "What the machine doesn't understand",
      "manifesto.p2": "This garden does not understand what you write. It measures it. It reduces a memory to a number between −1 and 1, and out of that reduction it makes a beautiful plant. That is the tension I care about: every technology that promises to \"understand\" our emotions does exactly this — turns them into variables — and almost always hides the procedure from us. Here the procedure is the work. The plant's beauty is also the evidence of what was cut away.",
      "manifesto.h3": "No one plants the same flower",
      "manifesto.p3": "The same sentence written by two people germinates into different plants: the seed mixes the text with the identity of whoever wrote it. There is no universal meaning waiting to be computed. There are situated meanings, and the system admits it.",
      "manifesto.h4": "Roots you didn't know you had",
      "manifesto.p4": "What you write stays private: only you see your full sentence; everyone else sees a single word, the pollen. But underground the system compares everything with everything, and when two strangers have written about the same thing without knowing it, their roots entwine. Turn on the constellation and you'll see those threads cross the sky. None of those connections was designed; none would be visible without computation. That is the one thing this garden could not be without technology: a place where affinity between strangers becomes landscape.",
      "manifesto.h5": "Tending what isn't yours",
      "manifesto.p5": "You can water the sentence of someone you'll never meet until it grows new branches. You can also prune it. The garden is collective and fragile, like everything we share.",

      "climate.toggle": "Emotional climate — see how the whole garden feels",
      "climate.close": "Close climate",
      "climate.tag": "Garden climate",
      "climate.specimens": "Specimens",
      "climate.bonds": "Kindred bonds",
      "climate.flora": "Dominant flora",
      "climate.scaleLow": "somber",
      "climate.scaleHigh": "radiant",
      "climate.hint": "Golden threads link sentences of kindred meaning, written by different people.",
      "climate.moodRadiant": "Radiant garden",
      "climate.moodBright": "Bright garden",
      "climate.moodCalm": "Serene garden",
      "climate.moodWistful": "Wistful garden",
      "climate.moodSomber": "Somber garden",
      "climate.empty": "The garden hasn't germinated yet.",

      "short.flor": "Flower", "short.sauce": "Willow", "short.cactus": "Cactus",
      "short.helecho": "Fern", "short.rosa": "Rose", "short.girasol": "Sunflower",
      "short.lavanda": "Lavender", "short.rubi": "Ruby", "short.zafiro": "Sapphire",
      "short.ambar": "Amber", "short.bambu": "Bamboo", "short.orquidea": "Orchid",
      "short.hongo": "Mushroom", "short.enredadera": "Vine",
      "short.diente": "Dandelion", "short.loto": "Lotus",

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
