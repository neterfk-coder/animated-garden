# 🌿 Jardín Semántico

**Un invernadero digital colectivo donde no se plantan semillas: se plantan frases.**

Escribe algo — un recuerdo, una queja, un verso — y germina frente a ti una planta única cuya anatomía completa deriva del *significado* de lo que escribiste. Las plantas de todos los visitantes conviven en el mismo jardín, y las que hablan de cosas afines **entrelazan sus raíces** sin que sus autores lo sepan.

> Proyecto para **Hack The Arts 2026** — tema: *«Crea arte que no podría existir sin la tecnología»*.

---

## 🧬 Cómo el lenguaje se vuelve anatomía

| Rasgo lingüístico | Rasgo vegetal |
|---|---|
| **Sentimiento y temas** (amor, sol, calma, pasión, mar, memoria, zen…) | Especie: 16 especies — rosa, girasol, lavanda, flor de loto, flores-gema de rubí / zafiro / ámbar, bambú, orquídea, hongo, enredadera, diente de león, flor, sauce llorón, cactus con espinas, helecho |
| **Complejidad sintáctica** (subordinadas, comas) | Ramificación y torsión del tallo |
| **Concreción vs. abstracción** de las palabras | Densidad y opacidad de las hojas |
| **Longitud** de la frase | Altura de la planta |
| **¿Pregunta?** | El tallo se curva en gancho dorado |
| **Puntos suspensivos…** | La planta gotea lágrimas |
| **¡Exclamación!** | Ángulos más enérgicos |
| **Afinidad semántica** entre frases de distintas personas | Raíces que se entrelazan bajo tierra |

La misma frase produce siempre la misma planta (la semilla del generador se deriva del texto). El crecimiento es un **L-system** (sistema de Lindenmayer) real: reescritura de cadenas + intérprete tortuga con tropismos (la gravedad hace llorar al sauce, la luz endereza al cactus).

## 🖱️ Cómo se usa

1. Entra al jardín y escribe una frase en el panel inferior.
2. Pulsa **Germinar** y mira crecer tu planta (≈4 segundos).
3. Haz clic en cualquier planta para abrir su **ficha de herbario**: nombre latinizado, especie, sentimiento y fecha.
4. **Privacidad**: la frase completa solo la ve quien la plantó; el resto de visitantes solo ve una palabra clave («el polen»).
5. Si el jardín está conectado a Supabase, verás germinar en vivo las plantas de otros visitantes.

---

## 🚀 Puesta en marcha

### Probar en local (sin configurar nada)

```bash
npx serve .
# o cualquier servidor estático; abre http://localhost:3000
```

Funciona de inmediato en **modo local** (tus plantas se guardan en tu navegador).

### 1) Conectar Supabase (jardín compartido) — 5 minutos

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
3. Ve a **Project Settings → API** y copia:
   - **Project URL**
   - **anon public key**
4. Pégalos en [`js/config.js`](js/config.js):

```js
SUPABASE_URL: "https://tuproyecto.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",
```

Listo. El indicador de la esquina superior derecha cambiará a **◉ jardín compartido** y los INSERTs llegan en tiempo real a todos los visitantes conectados.

### 2) Desplegar en Vercel — 3 minutos

1. Sube este repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **New Project** → importa el repo → **Deploy** (no necesita build).
3. *(Opcional, para el análisis con IA)* En **Settings → Environment Variables** añade:
   - `GROQ_API_KEY` = tu clave de [console.groq.com](https://console.groq.com)

Con la clave, `/api/analyze` analiza cada frase con **Groq** (sentimiento, rabia, abstracción, complejidad, palabra clave). **Sin la clave, la app funciona igual** con el analizador léxico local en español (`js/lexicon.js` + `js/semantics.js`).

### Alternativa: desplegar en Render

Incluido [`render.yaml`](render.yaml). En [render.com](https://render.com) → **New → Static Site** → conecta el repo. *(Nota: como sitio estático, Render no ejecuta `/api/analyze`; la app usa automáticamente el analizador local.)*

---

## 🗂️ Estructura

```
jardin-semantico/
├── index.html            # página única
├── css/styles.css        # sistema de diseño "invernadero nocturno"
├── js/
│   ├── config.js         # ← pega aquí tus claves de Supabase
│   ├── lexicon.js        # diccionarios en español (análisis sin API)
│   ├── semantics.js      # frase → genoma (con IA opcional + respaldo local)
│   ├── lsystem.js        # L-system: genoma → geometría vegetal
│   ├── db.js             # Supabase + modo local automático
│   ├── garden.js         # render: viento, día/noche, estrellas, polen, raíces, abejas, mariposas
│   ├── ui.js             # siembra, ficha de herbario, avisos
│   └── main.js           # arranque
├── api/analyze.js        # serverless Vercel → API de Groq (opcional)
├── supabase/schema.sql   # tabla + RLS + realtime, listo para pegar
├── vercel.json
├── render.yaml
└── .env.example
```

## 🛠️ Tecnologías

- **HTML / CSS / JavaScript** puro (sin build, sin frameworks) — Canvas 2D.
- **L-systems (sistemas de Lindenmayer)** con reglas estocásticas deterministas y tropismos.
- **PRNG mulberry32** para germinación reproducible (misma frase → misma planta).
- **Supabase** (Postgres + RLS + Realtime) para el jardín compartido.
- **API de Groq (Llama)** *(opcional)* para el análisis semántico.
- **Vercel** (hosting + serverless) o **Render** (estático).

## 🙏 Atribuciones

- [Supabase JS v2](https://github.com/supabase/supabase-js) — cliente de base de datos (CDN jsDelivr), licencia MIT.
- Tipografías de [Google Fonts](https://fonts.google.com): **Italiana** (Santiago Orozco, OFL), **Figtree** (Erik Kennedy, OFL), **Spline Sans Mono** (SharpType/Google, OFL).
- **API de Groq (Llama)** — análisis de sentimiento opcional.
- Los L-systems se basan en el trabajo clásico de Aristid Lindenmayer y el libro *The Algorithmic Beauty of Plants* (Prusinkiewicz & Lindenmayer, 1990); la implementación es propia.
- Todo el código restante fue escrito durante el período oficial del hackathon. Se utilizó asistencia de IA (Claude, de Anthropic) en el desarrollo, declarado conforme a las reglas del evento.

## 📄 Licencia

MIT
