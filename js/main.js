/* ============================================================
   ARRANQUE — conecta datos, carga el jardín, activa tiempo real.
   ============================================================ */

(async function main() {
  const mode = await DB.init();

  // cargar plantas existentes (sin animación de germinación)
  const existing = await DB.loadPlants();
  for (const record of existing) {
    if (!record.genome) continue;
    Garden.addPlant(record, {
      mine: DB.myPlantIds.has(record.id),
      animate: false,
    });
  }

  // si el jardín está vacío, siembra tres especímenes de muestra
  if (Garden.plants.length === 0) {
    for (const phrase of I18N.seedPhrases()) {
      const a = await Semantics.analyze(phrase);
      const genome = Semantics.toGenome(phrase, a);
      Garden.addPlant(
        { id: "seed-" + genome.seed, phrase, genome, created_at: new Date().toISOString() },
        { mine: false, animate: false }
      );
    }
  }

  // tiempo real: plantas de otros visitantes germinan en vivo
  DB.onNewPlant((record) => {
    if (!record.genome) return;
    Garden.addPlant(record, { mine: false, animate: true });
    if (window.Ambience) Ambience.chime(record.genome);
    UI.updateStats();
    UI.showToast(I18N.t("toast.someone", { latin: record.genome.latin }));
  });

  UI.updateStats(mode);
})();
