/* ============================================================
   INTERFAZ — siembra de frases, ficha de herbario y avisos.
   ============================================================ */

const UI = (() => {
  const $ = (id) => document.getElementById(id);

  const introEl = $("intro");
  const form = $("sow-form");
  const input = $("phrase");
  const sowBtn = $("sow-btn");
  const sowText = sowBtn.querySelector(".btn__text");
  const toast = $("toast");
  const specimen = $("specimen");

  let currentMode = null;
  let lastSpecimen = null; // { plant, index } — para volver a traducir la ficha abierta

  let toastTimer = null;
  function showToast(msg, ms = 3400) {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), ms);
  }

  function updateStats(mode) {
    $("stat-plants").textContent = Garden.plants.length;
    if (mode) currentMode = mode;
    if (currentMode) {
      $("stat-mode").textContent = currentMode === "compartido" ? "◉" : "○";
      $("stat-mode-label").textContent =
        currentMode === "compartido" ? I18N.t("stat.modeShared") : I18N.t("stat.modeLocal");
    }
  }

  /* ---------- Entrada (tras iniciar sesión, registrarse o entrar como invitado) ---------- */
  function revealGarden() {
    if (document.body.classList.contains("is-entered")) return;
    introEl.classList.add("is-hidden");
    document.body.classList.add("is-entered");
    setTimeout(() => input.focus(), 900);
  }

  /* ---------- Siembra ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phrase = input.value.trim();
    if (phrase.length < 3) {
      showToast(I18N.t("toast.tooShort"));
      return;
    }
    sowBtn.disabled = true;
    sowText.removeAttribute("data-i18n");
    sowText.textContent = I18N.t("sower.busy");

    try {
      const analysis = await Semantics.analyze(phrase);
      const genome = Semantics.toGenome(phrase, analysis);
      const record = await DB.savePlant({ phrase, genome, x: 0.08 + Math.random() * 0.84 });
      const plant = Garden.addPlant(record, { mine: true, animate: true });
      updateStats();
      input.value = "";
      showToast(I18N.t("toast.germinated", {
        latin: genome.latin,
        species: I18N.t("species." + genome.species).toLowerCase(),
      }));
      setTimeout(() => openSpecimen(plant, Garden.plants.length - 1), CONFIG.GERMINATION_MS * 0.7);
    } catch (err) {
      console.error(err);
      showToast(I18N.t("toast.error"));
    } finally {
      sowBtn.disabled = false;
      sowText.setAttribute("data-i18n", "sower.idle");
      sowText.textContent = I18N.t("sower.idle");
    }
  });

  /* ---------- Ficha de herbario ---------- */
  function openSpecimen(plant, index) {
    lastSpecimen = { plant, index };
    const g = plant.genome;
    const mine = plant.mine || DB.myPlantIds.has(plant.id);

    $("sp-latin").textContent = g.latin;
    $("sp-species").textContent = I18N.t("species." + g.species) || g.species;

    const s = g.sentiment;
    $("sp-sentiment").textContent =
      s > 0.25 ? I18N.t("specimen.sentimentBright", { v: s.toFixed(2) }) :
      s < -0.25 ? I18N.t("specimen.sentimentDark", { v: s.toFixed(2) }) :
      I18N.t("specimen.sentimentCalm", { v: s.toFixed(2) });
    $("sp-complexity").textContent =
      g.complexity > 0.6 ? I18N.t("specimen.complexHigh") :
      g.complexity > 0.3 ? I18N.t("specimen.complexMid") :
      I18N.t("specimen.complexLow");
    $("sp-date").textContent = plant.created_at
      ? new Date(plant.created_at).toLocaleDateString(I18N.getLang(), { day: "numeric", month: "short" })
      : I18N.t("specimen.today");

    // Privacidad: la frase completa solo la ve quien la plantó.
    if (mine) {
      $("sp-phrase-label").textContent = I18N.t("specimen.myPhrase");
      $("sp-phrase").textContent = `«${plant.phrase}»`;
    } else {
      $("sp-phrase-label").textContent = I18N.t("specimen.pollen");
      $("sp-phrase").textContent = g.keyword || "…";
    }

    const kin = Garden.kinOf(index);
    $("sp-kin").textContent = kin > 0
      ? I18N.t(kin > 1 ? "specimen.kinMany" : "specimen.kinOne", { n: kin })
      : "";

    specimen.classList.add("is-open");
  }

  $("specimen-close").addEventListener("click", () => {
    specimen.classList.remove("is-open");
  });

  /* ---------- Clic en el jardín ---------- */
  document.getElementById("garden").addEventListener("click", (e) => {
    // con la regadera en mano, el clic riega: no abre fichas
    if (document.body.classList.contains("is-watering")) return;
    const hit = Garden.pick(e.clientX, e.clientY);
    if (hit) openSpecimen(hit.plant, hit.index);
    else specimen.classList.remove("is-open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") specimen.classList.remove("is-open");
  });

  /* ---------- Re-traducir lo que ya está en pantalla ---------- */
  I18N.onChange(() => {
    updateStats();
    if (specimen.classList.contains("is-open") && lastSpecimen) {
      openSpecimen(lastSpecimen.plant, lastSpecimen.index);
    }
  });

  return { showToast, updateStats, openSpecimen, revealGarden };
})();
