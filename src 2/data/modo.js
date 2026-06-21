// modo.js — Diccionario de vocabulario por modo (Iglesia/Banda).
// Mismo patrón que i18n.js (idioma), pero para terminología de dominio.
// Plataforma única: el modo NUNCA monta un componente distinto — solo
// cambia qué palabras/textos se muestran y qué features están activas.
//
// USO: const vx = getModoTexto(accountMode, lang);  vx.evento.singular, etc.

export const MODO_TEXTOS = {
  iglesia: {
    es: {
      evento:        { singular:'Culto',   plural:'Cultos' },
      equipoPersona: { singular:'Equipo de adoración', plural:'Equipos de adoración' },
      lider:         'Líder de alabanza',
      repertorioTab: 'Cancionero',
      backstageSub:  'Cultos · Setlists · Equipos de alabanza',
    },
    en: {
      evento:        { singular:'Service', plural:'Services' },
      equipoPersona: { singular:'Worship team', plural:'Worship teams' },
      lider:         'Worship leader',
      repertorioTab: 'Songbook',
      backstageSub:  'Services · Setlists · Worship Teams',
    },
  },
  banda: {
    es: {
      evento:        { singular:'Show',  plural:'Shows' },
      equipoPersona: { singular:'Banda', plural:'Bandas' },
      lider:         'Encargado',
      repertorioTab: 'Cancionero',
      backstageSub:  'Gigs · Repertorio · Equipo técnico · Rider',
    },
    en: {
      evento:        { singular:'Gig',   plural:'Gigs' },
      equipoPersona: { singular:'Band',  plural:'Bands' },
      lider:         'Manager',
      repertorioTab: 'Songbook',
      backstageSub:  'Gigs · Repertoire · Technical crew · Rider',
    },
  },
};

// ── Flags de feature por modo ───────────────────────────────────────────
// Único punto de verdad para "esto existe solo en tal modo". Si mañana se
// agrega otra diferencia de fondo entre Iglesia/Banda, se agrega ACÁ — no
// se crea un componente nuevo ni un if disperso en otro archivo.
export const MODO_FEATURES = {
  iglesia: {
    cancioneroUniversal: true,   // banco comunitario entre iglesias
    pads:                true,   // pads ambientales por tonalidad — protagonista en worship
    click:               true,   // click/metrónomo — útil en ambos modos, sin restricción de modo
    multitracks:         true,   // multipistas — disponible en ambos modos
    monitoreo:           true,   // monitoreo OSC — disponible en ambos modos (mesa es mesa)
    premiereExclusivas:  true,   // Premiere — lanzamientos exclusivos de bandas cristianas
                                  // aliadas, antes que nadie, para clientes Pro/Premium.
                                  // Modelo de negocio de adquisición de contenido vía alianzas
                                  // con artistas/sellos cristianos — exclusivo de Iglesia,
                                  // no aplica a Banda (no tiene sentido secular).
  },
  banda: {
    cancioneroUniversal: false,  // no existe en Banda
    pads:                false,  // existe técnicamente (Vista Escenario) pero no es protagonista
    click:               true,   // click/metrónomo — útil en ambos modos, sin restricción de modo
    multitracks:         true,   // multipistas — disponible en ambos modos
    monitoreo:           true,   // monitoreo OSC — disponible en ambos modos (mesa es mesa)
    premiereExclusivas:  false,
  },
};

export function getModoTexto(accountMode, lang='es'){
  const modo = MODO_TEXTOS[accountMode] || MODO_TEXTOS.iglesia;
  return modo[lang] || modo.es;
}

export function getModoFeatures(accountMode){
  return MODO_FEATURES[accountMode] || MODO_FEATURES.iglesia;
}

// ── Catálogo CERRADO de tipos de evento por modo ────────────────────────
// Esto es lo que el usuario ve y elige al crear un evento — un menú
// desplegable de opciones preestablecidas, NUNCA un campo de texto libre.
// El modo de la cuenta determina qué catálogo se ofrece:
//  - Iglesia ve: Culto Dominical, Noche de Adoración, Ensayo, Fecha Especial
//  - Banda ve:   Gig, Festival, Ensayo, Sesión de Estudio
// "Ensayo" existe en ambos catálogos con el mismo `tipo` interno ('ensayo')
// porque la función es idéntica — solo cambia que en Iglesia comparte
// catálogo con "Culto" y en Banda con "Gig"/"Festival". El campo `tipo`
// guardado en el evento (ver eventos-schema.js) es el mismo valor interno
// sin importar el modo; lo que cambia es CUÁL lista de tipos se le muestra
// al usuario para elegir, y la etiqueta visible de cada uno.
export const TIPOS_EVENTO_POR_MODO = {
  iglesia: {
    es: [
      {tipo:'culto',    label:'Culto Dominical'},
      {tipo:'especial', label:'Noche de Adoración'},
      {tipo:'ensayo',   label:'Ensayo'},
      {tipo:'especial', label:'Fecha Especial'},
    ],
    en: [
      {tipo:'culto',    label:'Sunday Service'},
      {tipo:'especial', label:'Worship Night'},
      {tipo:'ensayo',   label:'Rehearsal'},
      {tipo:'especial', label:'Special Date'},
    ],
  },
  banda: {
    es: [
      {tipo:'gig',      label:'Show / Gig'},
      {tipo:'festival', label:'Festival'},
      {tipo:'ensayo',   label:'Ensayo'},
      {tipo:'sesion',   label:'Sesión de Estudio'},
    ],
    en: [
      {tipo:'gig',      label:'Gig'},
      {tipo:'festival', label:'Festival'},
      {tipo:'ensayo',   label:'Rehearsal'},
      {tipo:'sesion',   label:'Studio Session'},
    ],
  },
};

export function getTiposEventoDisponibles(accountMode, lang='es'){
  const modo = TIPOS_EVENTO_POR_MODO[accountMode] || TIPOS_EVENTO_POR_MODO.iglesia;
  return modo[lang] || modo.es;
}
