/* ============================================================
   DATOS — jardín compartido con Supabase.
   Si no has puesto tus credenciales en js/config.js todavía,
   entra en MODO LOCAL automáticamente (localStorage): la app
   funciona igual, pero cada visitante ve solo su jardín.

   API:
     DB.init()                → conecta y devuelve el modo
     DB.loadPlants()          → últimas plantas
     DB.savePlant(plant)      → guarda y devuelve con id
     DB.onNewPlant(callback)  → tiempo real (solo Supabase)
     DB.myPlantIds            → Set de ids sembradas por mí
   ============================================================ */

const DB = (() => {
  let client = null;
  let mode = "local";
  const LS_KEY = "jardin-semantico:plants";
  const LS_MINE = "jardin-semantico:mine";

  const myPlantIds = new Set(
    JSON.parse(localStorage.getItem(LS_MINE) || "[]")
  );

  function rememberMine(id) {
    myPlantIds.add(id);
    localStorage.setItem(LS_MINE, JSON.stringify([...myPlantIds]));
  }

  async function init() {
    if (CONFIG.hasSupabase && window.supabase) {
      try {
        client = window.supabase.createClient(
          CONFIG.SUPABASE_URL,
          CONFIG.SUPABASE_ANON_KEY
        );
        // prueba de conexión
        const { error } = await client.from("plants").select("id").limit(1);
        if (error) throw error;
        mode = "compartido";
      } catch (e) {
        console.warn("Supabase no disponible, usando modo local:", e.message);
        client = null;
        mode = "local";
      }
    }
    return mode;
  }

  /* ---------- Cargar ---------- */
  async function loadPlants() {
    if (client) {
      const { data, error } = await client
        .from("plants")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(CONFIG.MAX_PLANTS);
      if (error) { console.warn(error); return []; }
      return (data || []).reverse();
    }
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch { return []; }
  }

  /* ---------- Guardar ---------- */
  async function savePlant(plant) {
    if (client) {
      const { data, error } = await client
        .from("plants")
        .insert({
          phrase: plant.phrase,
          keyword: plant.genome.keyword,
          species: plant.genome.species,
          sentiment: plant.genome.sentiment,
          genome: plant.genome,
          x: plant.x,
        })
        .select()
        .single();
      if (error) { console.warn(error); return saveLocal(plant); }
      rememberMine(data.id);
      return { ...plant, id: data.id, created_at: data.created_at };
    }
    return saveLocal(plant);
  }

  function saveLocal(plant) {
    const id = "local-" + Date.now() + "-" + Math.floor(Math.random() * 1e6);
    const saved = { ...plant, id, created_at: new Date().toISOString() };
    let all = [];
    try { all = JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch {}
    all.push(saved);
    if (all.length > CONFIG.MAX_PLANTS) all = all.slice(-CONFIG.MAX_PLANTS);
    localStorage.setItem(LS_KEY, JSON.stringify(all));
    rememberMine(id);
    return saved;
  }

  /* ---------- Tiempo real ---------- */
  function onNewPlant(callback) {
    if (!client) return;
    client
      .channel("garden")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "plants" },
        (payload) => {
          if (!myPlantIds.has(payload.new.id)) callback(payload.new);
        }
      )
      .subscribe();
  }

  return { init, loadPlants, savePlant, onNewPlant, myPlantIds, get mode() { return mode; } };
})();
