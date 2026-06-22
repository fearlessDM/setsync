// eventos-schema.js — Esquema ÚNICO de evento para toda la plataforma.
// Reemplaza el modelo paralelo: SETLISTS+EVENTOS_ESPECIALES (Iglesia) vs
// gigs[] (Banda). Un solo array `eventos`, un solo componente Fechas que
// lo recorre — el `tipo` decide qué campos opcionales aplican y cómo se
// rotula en pantalla (vía modo.js, no acá).
//
// CAMPOS COMUNES (todo evento los tiene, sin importar tipo o modo):
//   id          string|number — único
//   tipo        'culto' | 'ensayo' | 'gig' | 'festival' | 'especial'
//   fecha       'YYYY-MM-DD'
//   lugar       string
//   nombre      string — título visible (ej. "Domingo 13 de Julio", "Concierto Verano")
//   setlist     [{name,key,bpm,docId?}]  — mismo shape que ya usa SongView, sin cambios
//
// CAMPOS OPCIONALES (presentes según tipo/necesidad, ausentes si no aplica):
//   ciudad        string            — relevante en gigs/festivales con gira
//   equiposConvocados []string      — ids de EQUIPOS_TRABAJO convocados (modo Banda)
//   ensayosPrevios    [{fecha,lugar,duracion}]  — sub-ensayos asociados (modo Banda)
//   notas         string            — texto libre
//   notifs        []string          — historial de notificaciones enviadas
//   docId         string            — referencia a doc externo (Iglesia, ya existía en SETLISTS)
//
// MIGRACIÓN: las funciones de abajo convierten los datos actuales (constants.js)
// al esquema nuevo SIN perder ningún dato — son la prueba de que el esquema
// flexible efectivamente cubre ambos casos reales, no solo en teoría.

export function migrarSetlistsIglesia(SETLISTS, EVENTOS_ESPECIALES){
  const eventos = [];

  // SETLISTS: { 7: [...], 14: [...], 21: null, 28: [...] } — clave = día de domingo
  Object.entries(SETLISTS).forEach(([dia, setlist])=>{
    if(!setlist) return; // 21: null = domingo sin setlist cargado aún, se omite
    eventos.push({
      id: `iglesia-domingo-${dia}`,
      tipo: 'culto',
      fecha: null, // se resuelve en runtime contra el mes activo (mismo comportamiento de hoy)
      diaDomingo: Number(dia), // se preserva el campo original para no romper AdminView todavía
      lugar: '',
      nombre: `Domingo ${dia}`,
      setlist,
    });
  });

  // EVENTOS_ESPECIALES: ya casi calzan 1:1 con el esquema nuevo
  EVENTOS_ESPECIALES.forEach((ev, i)=>{
    eventos.push({
      id: `iglesia-especial-${ev.mes}-${ev.dia}-${i}`,
      tipo: ev.tipo === 'domingo' ? 'culto' : 'especial',
      fecha: null, // mismo caso: mes/día sueltos, se resuelve contra el calendario activo
      mes: ev.mes, dia: ev.dia, // se preservan para no romper el render de meses existente
      lugar: '',
      nombre: ev.label,
      setlist: ev.setlist,
    });
  });

  return eventos;
}

export function migrarGigsBanda(gigs){
  return gigs.map(g=>({
    id: `banda-${g.id}`,
    tipo: g.tipo, // ya viene como 'concierto'|'ensayo'|'festival' — se mapea 1:1
    fecha: g.fecha,
    lugar: g.lugar,
    nombre: g.nombre,
    setlist: g.setlist.map(name=>({name})), // gigs guardaba solo nombres; setlist real se cruza con repertorio
    ciudad: g.ciudad,
    equiposConvocados: g.equipos,
    ensayosPrevios: g.ensayos,
    notas: g.notas,
    notifs: g.notifs,
  }));
}

// ── Esquema de persona, también unificado ──────────────────────────────
// Iglesia (EQUIPOS_DATA: equipos con miembros{name,email,role}) y Banda
// (members[]: {id,nombre,rol}) también eran paralelos. Esquema único:
//   id, nombre, email?, rol (id de catálogo de roles del modo), equipoId?
export function migrarPersonasIglesia(EQUIPOS_DATA){
  const personas = [];
  EQUIPOS_DATA.forEach(equipo=>{
    equipo.miembros.forEach(m=>{
      personas.push({
        id: `iglesia-${m.id}`,
        nombre: m.name,
        email: m.email,
        rol: m.role,
        equipoId: equipo.id,
        equipoNombre: equipo.name,
        equipoColor: equipo.color,
      });
    });
  });
  return personas;
}

export function migrarEquiposIglesia(EQUIPOS_DATA){
  return EQUIPOS_DATA.map(eq=>({id:String(eq.id), name:eq.name, color:eq.color, roles:[...eq.roles]}));
}

export function migrarPersonasBanda(members){
  return members.map(m=>({
    id: `banda-${m.id}`,
    nombre: m.nombre,
    email: null,
    rol: m.rol,
    equipoId: null,
    equipoNombre: null,
    equipoColor: null,
  }));
}
