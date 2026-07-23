/* ============================================================
   CLIMA EMOCIONAL COLECTIVO — hace visible lo que el jardín
   siente como conjunto: el ánimo medio de todas las frases, los
   vínculos de significado afín entre desconocidos y la flora
   dominante. Al abrirlo, el jardín dibuja su constelación.
   ============================================================ */

const Climate = (() => {
  const $ = (id) => document.getElementById(id);
  const panel = $("climate");
  const toggleBtn = $("climate-toggle");
  let open = false;
  let timer = null;

  function moodKey(avg) {
    if (avg > 0.45) return "climate.moodRadiant";
    if (avg > 0.15) return "climate.moodBright";
    if (avg > -0.15) return "climate.moodCalm";
    if (avg > -0.45) return "climate.moodWistful";
    return "climate.moodSomber";
  }

  function render() {
    const c = Garden.climate();
    $("cl-word").textContent = c.count ? I18N.t(moodKey(c.avg)) : I18N.t("climate.empty");
    // marcador del medidor: -1..1 → 0..100 %
    $("cl-marker").style.left = `${((c.avg + 1) / 2) * 100}%`;
    $("cl-count").textContent = c.count;
    $("cl-bonds").textContent = c.bonds;

    const wrap = $("cl-species");
    const top = c.species.slice(0, 5);
    const max = top.length ? top[0][1] : 1;
    wrap.innerHTML = "";
    for (const [sp, n] of top) {
      const row = document.createElement("div");
      row.className = "climate__row";
      const name = document.createElement("span");
      name.className = "climate__row-name";
      name.textContent = I18N.t("short." + sp);
      const bar = document.createElement("div");
      bar.className = "climate__bar";
      const fill = document.createElement("span");
      fill.style.width = `${Math.round((n / max) * 100)}%`;
      bar.appendChild(fill);
      const num = document.createElement("span");
      num.className = "climate__row-n";
      num.textContent = n;
      row.append(name, bar, num);
      wrap.appendChild(row);
    }
  }

  function setOpen(v) {
    open = v;
    panel.classList.toggle("is-open", open);
    toggleBtn.classList.toggle("is-on", open);
    toggleBtn.setAttribute("aria-pressed", String(open));
    Garden.constellation = open;
    clearInterval(timer);
    if (open) { render(); timer = setInterval(render, 1500); }
  }

  toggleBtn.addEventListener("click", () => setOpen(!open));
  $("climate-close").addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) setOpen(false); });
  I18N.onChange(() => { if (open) render(); });

  return { get open() { return open; }, setOpen };
})();
