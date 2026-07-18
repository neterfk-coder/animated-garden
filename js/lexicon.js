/* ============================================================
   LÉXICO — diccionarios en español para el análisis local.
   Funciona sin ninguna API. Si configuras la IA (Claude),
   este léxico queda como respaldo automático.
   ============================================================ */

const LEXICON = {
  positive: [
    "amor","amo","quiero","feliz","felicidad","alegría","alegre","luz","sol",
    "esperanza","sueño","sueños","bonito","bonita","hermoso","hermosa","bello",
    "bella","risa","reír","sonrisa","sonreír","abrazo","beso","paz","calma",
    "gracias","logré","gané","celebrar","fiesta","brillar","brilla","vida",
    "florecer","crecer","libre","libertad","cielo","mar","primavera","cálido",
    "dulce","suave","maravilloso","increíble","genial","perfecto","adoro",
    "encanta","ilusión","milagro","regalo","hogar","amistad","amigo","amiga",
    "juntos","siempre","ganamos","victoria","orgullo","orgullosa","orgulloso",
    "gratitud","bendición","fortuna","suerte","magia","mágico","tierno","ternura"
  ],
  negative: [
    "triste","tristeza","llorar","lloro","lágrimas","extraño","extrañar","falta",
    "duele","dolor","perdí","pérdida","adiós","despedida","solo","sola","soledad",
    "vacío","vacía","miedo","temor","oscuro","oscuridad","frío","fría","gris",
    "cansado","cansada","cansancio","agotado","agotada","nunca","jamás","olvido",
    "olvidar","ausencia","herida","roto","rota","quebrado","fin","final","muerte",
    "morir","murió","enfermo","enferma","lejos","distancia","nostalgia","melancolía",
    "pena","sufrir","sufrimiento","abandonó","abandono","silencio","invierno",
    "sombra","llueve","lluvia","gotea","apaga","desaparecer","perder","fracaso",
    "fallé","imposible","difícil","duro","dura","peor","mal","amargo","amarga"
  ],
  anger: [
    "odio","odiar","rabia","ira","furia","furioso","furiosa","enojo","enojado",
    "enojada","molesto","molesta","harto","harta","hartos","basta","injusto",
    "injusticia","maldito","maldita","mentira","mentiroso","traición","traicionó",
    "venganza","grito","gritar","romper","golpear","destruir","culpa","asco",
    "detesto","insoportable","estúpido","idiota","nunca más","jamás vuelvo"
  ],
  concrete: [
    "casa","mesa","árbol","perro","gato","café","pan","libro","calle","ciudad",
    "montaña","río","mar","piedra","flor","mano","manos","ojos","pelo","puerta",
    "ventana","cama","carro","auto","tren","avión","teléfono","celular","comida",
    "agua","fuego","tierra","cielo","luna","sol","estrella","lluvia","nieve",
    "cuerpo","cara","voz","música","canción","foto","carta","abuela","abuelo",
    "madre","padre","mamá","papá","hermano","hermana","hijo","hija","niño","niña",
    "escuela","trabajo","parque","playa","bosque","jardín","cocina","zapatos"
  ],
  abstract: [
    "tiempo","alma","destino","suerte","idea","pensamiento","memoria","recuerdo",
    "futuro","pasado","presente","eternidad","infinito","verdad","mentira","fe",
    "esperanza","libertad","justicia","razón","locura","sentido","significado",
    "existencia","conciencia","espíritu","esencia","universo","nada","todo",
    "quizás","tal vez","acaso","misterio","secreto","silencio","ausencia",
    "distancia","posibilidad","imaginación","filosofía","teoría","concepto"
  ],
  // Conectores de subordinación → complejidad sintáctica
  subordinators: [
    "que","cuando","porque","aunque","mientras","donde","como","si","pues",
    "sino","pero","para que","a pesar","sin embargo","no obstante","ya que",
    "puesto que","con tal","siempre que","antes de que","después de que"
  ],
  stopwords: [
    "el","la","los","las","un","una","unos","unas","de","del","a","al","en",
    "y","o","u","e","que","se","su","sus","mi","mis","tu","tus","es","son",
    "está","están","fue","era","ser","estar","hay","con","por","para","no",
    "sí","lo","le","les","me","te","nos","os","yo","tú","él","ella","ellos",
    "ellas","este","esta","esto","ese","esa","eso","aquel","muy","más","menos",
    "pero","como","cuando","donde","también","ya","así","entonces","porque"
  ]
};
