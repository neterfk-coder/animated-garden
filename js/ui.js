/* ============================================================
   INTERFAZ — siembra de frases, ficha de herbario y avisos.
   ============================================================ */

const UI = (() => {
  const $ = (id) => document.getElementById(id);

  const introEl = $("intro");
  const form = $("sow-form");
  const input = $("phrase");
  const sowBtn = $("sow-btn");
  const toast = $("toast");
  const specimen = $("specimen");

  const SPECIES_LABEL = {
    flor:    "Flor de ánimo luminoso",
    sauce:   "Sauce de melancolía",
    cactus:  "Cactus de furia contenida",
    helecho: "Helecho de pensamiento neutro",
  };

  let toastTimer = null;
  function showToast(msg, ms = 3400) {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), ms);
  }

  function updateStats(mode) {
    $("stat-plants").textContent = Garden.plants.length;
    if (mode) {
      $("stat-mode").textContent = mode === "compartido" ? "◉" : "○";
      $("stat-mode-label").textContent = mode === "compartido" ? "jardín compartido" : "jardín local";
    }
  }

  /* ---------- Entrada ---------- */
  $("enter-btn").addEventListener("click", () => {
    introEl.classList.add("is-hidden");
    document.body.classList.add("is-entered");
    setTimeout(() => input.focus(), 900);
  });

  /* ---------- Siembra ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phrase = input.value.trim();
    if (phrase.length < 3) {
      showToast("Escribe al menos unas palabras para que germine algo.");
      return;
    }
    sowBtn.disabled = true;
    sowBtn.querySelector(".btn__text").textContent = "Germinando…";

    try {
      const analysis = await Semantics.analyze(phrase);
      const genome = Semantics.toGenome(phrase, analysis);
      const record = await DB.savePlant({ phrase, genome, x: 0.08 + Math.random() * 0.84 });
      const plant = Garden.addPlant(record, { mine: true, animate: true });
      updateStats();
      input.value = "";
      showToast(`Germinó ${genome.latin} — ${SPECIES_LABEL[genome.species].toLowerCase()}.`);
      setTimeout(() => openSpecimen(plant, Garden.plants.length - 1), CONFIG.GERMINATION_MS * 0.7);
    } catch (err) {
      console.error(err);
      showToast("Algo impidió la germinación. Inténtalo de nuevo.");
    } finally {
      sowBtn.disabled = false;
      sowBtn.querySelector(".btn__text").textContent = "Germinar";
    }
  });

  /* ---------- Ficha de herbario ---------- */
  function openSpecimen(plant, index) {
    const g = plant.genome;
    const mine = plant.mine || DB.myPlantIds.has(plant.id);

    $("sp-latin").textContent = g.latin;
    $("sp-species").textContent = SPECIES_LABEL[g.species] || g.species;

    const s = g.sentiment;
    $("sp-sentiment").textContent =
      s > 0.25 ? `luminoso (+${s.toFixed(2)})` :
      s < -0.25 ? `sombrío (${s.toFixed(2)})` :
      `sereno (${s.toFixed(2)})`;
    $("sp-complexity").textContent =
      g.complexity > 0.6 ? "enredada" : g.complexity > 0.3 ? "media" : "sencilla";
    $("sp-date").textContent = plant.created_at
      ? new Date(plant.created_at).toLocaleDateString("es", { day: "numeric", month: "short" })
      : "hoy";

    // Privacidad: la frase completa solo la ve quien la plantó.
    if (mine) {
      $("sp-phrase-label").textContent = "Tu frase";
      $("sp-phrase").textContent = `«${plant.phrase}»`;
    } else {
      $("sp-phrase-label").textContent = "Polen (palabra clave)";
      $("sp-phrase").textContent = g.keyword || "…";
    }

    const kin = Garden.kinOf(index);
    $("sp-kin").textContent = kin > 0
      ? `Sus raíces se entrelazan con ${kin} planta${kin > 1 ? "s" : ""} de significado afín.`
      : "";

    specimen.classList.add("is-open");
  }

  $("specimen-close").addEventListener("click", () => {
    specimen.classList.remove("is-open");
  });

  /* ---------- Clic en el jardín ---------- */
  document.getElementById("garden").addEventListener("click", (e) => {
    const hit = Garden.pick(e.clientX, e.clientY);
    if (hit) openSpecimen(hit.plant, hit.index);
    else specimen.classList.remove("is-open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") specimen.classList.remove("is-open");
  });

  return { showToast, updateStats, openSpecimen };
})();
