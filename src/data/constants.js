// Constantes de datos: setlists, eventos, modos, configuración de banda

export const SETLISTS = {
  7:  [{name:'YESHUA',key:'D',bpm:130},{name:'ALABA (PRAISE)',key:'G',bpm:128},{name:'HERMOSO DIOS',key:'D',bpm:92},{name:'SIEMPRE A TIEMPO',key:'Am',bpm:76}],
  14: [{name:'TODA LENGUA TODA NACIÓN',key:'A',bpm:124},{name:'COMO EN EL CIELO',key:'D',bpm:102},{name:'LA BONDAD DE DIOS',key:'C',bpm:89},{name:'OCEANOS',key:'D',bpm:72},{name:'A TI ME RINDO',key:'G',bpm:68}],
  21: null,
  28: [{name:'AL QUE ESTÁ SENTADO EN EL TRONO',key:'G',bpm:126},{name:'SANTO POR SIEMPRE',key:'C',bpm:80},{name:'ANCLADO',key:'G',bpm:88},{name:'EN MEMORIA DE TI',key:'G',bpm:60}],
};

export const EVENTOS_ESPECIALES=[
  // Julio
  {mes:7,dia:6, tipo:'domingo', label:'Domingo 6 de Julio',   setlist:[{name:'LEÓN',key:'E',bpm:120},{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'BUENO ERES TU',key:'D',bpm:94},{name:'AGNUS DEI',key:'G',bpm:65}]},
  {mes:7,dia:13,tipo:'domingo', label:'Domingo 13 de Julio',  setlist:[{name:'HERMOSO NOMBRE',key:'G',bpm:84},{name:'QUE SE ABRA EL CIELO',key:'D',bpm:118},{name:'TU PROVEERÁS',key:'G',bpm:73},{name:'SEGURO ESTOY',key:'D',bpm:58}]},
  {mes:7,dia:19,tipo:'sabado',  label:'Noche de Adoración',   setlist:[{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'HERMOSO NOMBRE',key:'G',bpm:84},{name:'BARRO',key:'C',bpm:82},{name:'COMUNIÓN',key:'D',bpm:62},{name:'AGNUS DEI',key:'G',bpm:65}]},
  {mes:7,dia:20,tipo:'domingo', label:'Domingo 20 de Julio',  setlist:[{name:'NO SOY ESCLAVO',key:'A',bpm:112},{name:'BARRO',key:'C',bpm:82},{name:'LO HARÁS OTRA VEZ',key:'G',bpm:70}]},
  {mes:7,dia:27,tipo:'domingo', label:'Domingo 27 de Julio',  setlist:[{name:'TODA LENGUA TODA NACIÓN',key:'A',bpm:124},{name:'SIEMPRE YHWH',key:'G',bpm:100},{name:'MI ESPERANZA',key:'G',bpm:90},{name:'A TI ME RINDO',key:'G',bpm:68}]},
  // Agosto
  {mes:8,dia:16,tipo:'sabado',  label:'Noche de Adoración',   setlist:[{name:'LLEVAME A LA CRUZ',key:'G',bpm:78},{name:'ANCLADO',key:'G',bpm:88},{name:'CENTRO',key:'G',bpm:55},{name:'EN MEMORIA DE TI',key:'G',bpm:60}]},
  // Septiembre
  {mes:9,dia:7, tipo:'domingo', label:'Domingo 7 de Septiembre', setlist:[{name:'ALABA (PRAISE)',key:'G',bpm:128},{name:'COMO EN EL CIELO',key:'D',bpm:102},{name:'HERMOSO DIOS',key:'D',bpm:92},{name:'SIEMPRE A TIEMPO',key:'Am',bpm:76}]},
  {mes:9,dia:14,tipo:'domingo', label:'Domingo 14 de Septiembre',setlist:[{name:'BUENO ERES TU',key:'D',bpm:94},{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'OCEANOS',key:'D',bpm:72},{name:'COMUNIÓN',key:'D',bpm:62}]},
  {mes:9,dia:18,tipo:'especial',label:'Fiestas Patrias',         setlist:[{name:'BUENO ERES TU',key:'D',bpm:94},{name:'ALABA (PRAISE)',key:'G',bpm:128},{name:'TODA LENGUA TODA NACIÓN',key:'A',bpm:124},{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'A TI ME RINDO',key:'G',bpm:68}]},
  {mes:9,dia:21,tipo:'domingo', label:'Domingo 21 de Septiembre',setlist:[{name:'YESHUA',key:'D',bpm:130},{name:'LA BONDAD DE DIOS',key:'C',bpm:89},{name:'LO HARÁS OTRA VEZ',key:'G',bpm:70},{name:'SEGURO ESTOY',key:'D',bpm:58}]},
];

// ── CANCIONES — repertorio del Cancionero ──────────────────────────────────
// IMPORTANTE: los nombres aquí deben coincidir EXACTAMENTE con las claves
// de SONG_CONTENT_IGLESIA en songs-iglesia.js para que SongView muestre
// el contenido. Las 5 primeras son las que tienen acordes completos.
export const CANCIONES = [
  {n:'YESHUA',                key:'D',  bpm:130, artista:'Maverick City Music'},
  {n:'TODA LENGUA TODA NACIÓN',key:'A', bpm:124, artista:'Marcos Witt'},
  {n:'ALABA (PRAISE)',        key:'G',  bpm:128, artista:'Elevation Worship'},
  {n:'LA BONDAD DE DIOS',    key:'C',  bpm:89,  artista:'Bethel Music'},
  {n:'GLORIA EN GLORIA',     key:'D',  bpm:86,  artista:'Bethel Music'},
  {n:'HERMOSO NOMBRE',       key:'G',  bpm:84,  artista:'Hillsong Worship'},
  {n:'SANTO POR SIEMPRE',    key:'C',  bpm:80,  artista:'Bethel Music'},
  {n:'AGNUS DEI',            key:'G',  bpm:65,  artista:'Michael W. Smith'},
  {n:'TODO CAMBIÓ',          key:'G',  bpm:82,  artista:'Maverick City Music'},
  {n:'GRANDE ES TU FIDELIDAD',key:'G', bpm:72,  artista:'Clásico'},
  {n:'ABBA PADRE',           key:'D',  bpm:68,  artista:'Redimi2'},
  {n:'NO HAY LUGAR MÁS ALTO',key:'C',  bpm:80,  artista:'Ingrid Rosario'},
  {n:'JESÚS ERES MI REY',    key:'E',  bpm:116, artista:'Hillsong en Español'},
];

export const MODES = {
  band:    {label:'Bandas',sub:'Para músicos y agrupaciones',events:'Show, Gig, Ensayo',tagline:'Panel de Banda'},
  worship: {label:'Iglesias',sub:'Equipos de adoración',events:'Tiempo de Adoración, Domingo',tagline:'Panel de Adoración'},
  studio:  {label:'Estudios y Academias',sub:'Educación y producción musical',events:'Sesión, Clase, Ensayo',tagline:'Panel de Estudio'},
};

export const initials = n => n.trim().split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

export const BANDA_CONFIG = {
  nombre: 'Mi Banda',
  modo: 'banda',
  roles: [
    {id:'encargado',     label:'Encargado',       icon:'⭐', color:'#c8a97e'},
    {id:'guitarrista',   label:'Guitarrista',      icon:'🎸', color:'#7b68ee'},
    {id:'bajista',       label:'Bajista',          icon:'🎸', color:'#30C0B7'},
    {id:'baterista',     label:'Baterista',        icon:'🥁', color:'#ff6b6b'},
    {id:'dj',            label:'DJ',               icon:'🎧', color:'#ff9f43'},
    {id:'corista1',      label:'Corista 1',        icon:'🎤', color:'#74b9ff'},
    {id:'corista2',      label:'Corista 2',        icon:'🎤', color:'#a29bfe'},
    {id:'teclado',       label:'Tecladista',       icon:'🎹', color:'#fd79a8'},
  ],
  equipos_trabajo: [
    {id:'roadies',     label:'Roadies',     icon:'🔧'},
    {id:'produccion',  label:'Producción',  icon:'🎬'},
    {id:'sonido',      label:'Sonido',      icon:'🎚'},
    {id:'visuales',    label:'Visuales',    icon:'💡'},
    {id:'catering',    label:'Catering',    icon:'🍕'},
    {id:'movilizacion',label:'Movilización',icon:'🚐'},
  ],
};

export const COVERS_DEMO = [
  {n:'ANCLADO',         key:'E',  bpm:88,  artista:'Bethel Music',   tipo:'cover'},
  {n:'OCEANOS',         key:'Bm', bpm:72,  artista:'Hillsong United',tipo:'cover'},
  {n:'GLORIA EN GLORIA',key:'D',  bpm:86,  artista:'Bethel Music',   tipo:'cover'},
  {n:'TODO CAMBIÓ',     key:'G',  bpm:82,  artista:'Maverick City',  tipo:'cover'},
];

export const EQUIPOS_DATA=[
  {id:1,name:'Banda',color:'#EE227D',roles:['Guitarra','Bajo','Piano','Batería','Mic 1','Libre'],miembros:[
    {id:1,name:'Belén Mella',    email:'belen@iglesia.cl',    role:'Mic 1'},
    {id:2,name:'Cony Saavedra',  email:'cony@iglesia.cl',     role:'Guitarra'},
    {id:3,name:'Florencia Gómez',email:'florencia@iglesia.cl',role:'Piano'},
    {id:4,name:'Cristian Gómez', email:'cristian@iglesia.cl', role:'Bajo'},
    {id:5,name:'Daniel Miranda', email:'daniel@iglesia.cl',   role:'Batería'},
    {id:6,name:'Felipe Silva',   email:'felipe@iglesia.cl',   role:'Libre'},
  ]},
  {id:2,name:'Proyecciones',color:'#30C0B7',roles:['Operador','Diseño','Libre'],miembros:[
    {id:7,name:'Franco Silva',email:'franco@iglesia.cl',role:'Operador'},
    {id:8,name:'Renata',      email:'renata@iglesia.cl', role:'Diseño'},
  ]},
  {id:3,name:'Sonido',color:'#FD8083',roles:['Ingeniero','Asistente','Libre'],miembros:[
    {id:9, name:'Carlos Cuevas',email:'carlos@iglesia.cl',role:'Ingeniero'},
    {id:10,name:'Mauro Pizarro',email:'mauro@iglesia.cl', role:'Asistente'},
  ]},
  {id:4,name:'Transmisiones',color:'#852467',roles:['Director','Streaming','Cámara','Libre'],miembros:[
    {id:11,name:'Renata V.',email:'renatav@iglesia.cl',role:'Streaming'},
  ]},
];

export const ROLES_MUSICOS=[
  {id:'encargado',     label:'Encargado'},
  {id:'guitarrista_e', label:'Guitarra Eléctrica'},
  {id:'guitarrista_a', label:'Guitarra Acústica'},
  {id:'bajista',       label:'Bajista'},
  {id:'baterista',     label:'Batería'},
  {id:'dj',            label:'DJ'},
  {id:'corista1',      label:'Corista 1'},
  {id:'corista2',      label:'Corista 2'},
  {id:'teclado',       label:'Tecladista'},
];
export const EQUIPOS_TRABAJO=[
  {id:'roadies',     label:'Roadies'},
  {id:'produccion',  label:'Producción'},
  {id:'sonido',      label:'Sonido'},
  {id:'visuales',    label:'Visuales'},
  {id:'catering',    label:'Catering'},
  {id:'movilizacion',label:'Movilización'},
];
export const ALL_ROLES_BANDA=[...ROLES_MUSICOS,...EQUIPOS_TRABAJO];
