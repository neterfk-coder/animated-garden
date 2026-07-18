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
    const seeds = [
      "Hoy el sol entró por la ventana y me acordé de reír",
      "Te extraño, aunque nunca sepa decirlo en voz alta…",
      "¿Y si el tiempo no fuera una línea sino un jardín?",
    ];
    for (const phrase of seeds) {
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
    UI.updateStats();
    UI.showToast(`Alguien plantó ${record.genome.latin} en el jardín.`);
  });

  UI.updateStats(mode);
})();
