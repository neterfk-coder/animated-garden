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
      if (window.Ambience) Ambience.chime(genome);
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

  /* ---------- Guardar / compartir tarjeta de herbario ---------- */
  const saveBtn = $("sp-save");
  saveBtn.addEventListener("click", async () => {
    if (!lastSpecimen) return;
    const { plant } = lastSpecimen;
    const mine = plant.mine || DB.myPlantIds.has(plant.id);
    saveBtn.disabled = true;
    saveBtn.removeAttribute("data-i18n");
    saveBtn.textContent = I18N.t("specimen.saving");
    try {
      const cardCanvas = await Garden.renderCard(plant, { mine });
      const blob = await new Promise((res) => cardCanvas.toBlob(res, "image/png"));
      const safe = (plant.genome.latin || "planta").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const fname = `jardin-semantico-${safe}.png`;
      const file = new File([blob], fname, { type: "image/png" });

      // en móvil, compartir directo si se puede; si no, descargar
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: plant.genome.latin });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
      showToast(I18N.t("specimen.saved"));
    } catch (err) {
      if (err && err.name === "AbortError") { /* el usuario canceló al compartir */ }
      else { console.error(err); showToast(I18N.t("toast.error")); }
    } finally {
      saveBtn.disabled = false;
      saveBtn.setAttribute("data-i18n", "specimen.save");
      saveBtn.textContent = I18N.t("specimen.save");
    }
  });

  /* ---------- Clic en el jardín ---------- */
  document.getElementById("garden").addEventListener("click", (e) => {
    // con la regadera o las tijeras en mano, el clic es la herramienta
    if (document.body.classList.contains("is-watering") ||
        document.body.classList.contains("is-pruning")) return;
    const hit = Garden.pick(e.clientX, e.clientY);
    if (hit) openSpecimen(hit.plant, hit.index);
    else specimen.classList.remove("is-open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") specimen.classList.remove("is-open");
  });

  /* ---------- Panel de siembra arrastrable ---------- */
  const sowerEl = $("sower");
  const sowerPanel = sowerEl.querySelector(".sower__panel");
  const SOWER_POS_KEY = "jardin-semantico:sower-pos";

  function placeSower(x, y) {
    const r = sowerEl.getBoundingClientRect();
    const nx = Math.max(8, Math.min(window.innerWidth - r.width - 8, x));
    const ny = Math.max(8, Math.min(window.innerHeight - r.height - 8, y));
    sowerEl.classList.add("is-moved");
    sowerEl.style.left = nx + "px";
    sowerEl.style.top = ny + "px";
    sowerEl.style.bottom = "auto";
    sowerEl.style.transform = "none";
  }

  let sowerDrag = null;
  sowerPanel.addEventListener("pointerdown", (e) => {
    // se arrastra desde cualquier zona del panel que no sea interactiva
    if (e.target.closest("input, button")) return;
    const r = sowerEl.getBoundingClientRect();
    sowerDrag = { ox: e.clientX - r.left, oy: e.clientY - r.top, id: e.pointerId };
    sowerEl.classList.add("is-dragging");
    sowerPanel.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  sowerPanel.addEventListener("pointermove", (e) => {
    if (!sowerDrag || e.pointerId !== sowerDrag.id) return;
    placeSower(e.clientX - sowerDrag.ox, e.clientY - sowerDrag.oy);
  });
  function endSowerDrag() {
    if (!sowerDrag) return;
    sowerDrag = null;
    sowerEl.classList.remove("is-dragging");
    const r = sowerEl.getBoundingClientRect();
    localStorage.setItem(SOWER_POS_KEY, JSON.stringify({ x: r.left, y: r.top }));
  }
  sowerPanel.addEventListener("pointerup", endSowerDrag);
  sowerPanel.addEventListener("pointercancel", endSowerDrag);

  // recuperar la posición elegida en visitas anteriores
  try {
    const saved = JSON.parse(localStorage.getItem(SOWER_POS_KEY));
    if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
      requestAnimationFrame(() => placeSower(saved.x, saved.y));
    }
  } catch { /* posición corrupta: se ignora */ }

  window.addEventListener("resize", () => {
    if (!sowerEl.classList.contains("is-moved")) return;
    const r = sowerEl.getBoundingClientRect();
    placeSower(r.left, r.top);
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
