// Constantes de datos: setlists, eventos, modos, configuración de banda

export const SETLISTS = {
  7:  [{name:'YESHUA',key:'D',bpm:130},{name:'ALABA (PRAISE)',key:'G',bpm:128},{name:'HERMOSO DIOS',key:'D',bpm:92},{name:'SIEMPRE A TIEMPO',key:'Am',bpm:76}],
  14: [{name:'TODA LENGUA TODA NACIÓN',key:'A',bpm:124},{name:'COMO EN EL CIELO',key:'D',bpm:102},{name:'LA BONDAD DE DIOS',key:'C',bpm:89},{name:'OCEANOS',key:'D',bpm:72},{name:'A TI ME RINDO',key:'G',bpm:68}],
  21: null,
  28: [{name:'AL QUE ESTÁ SENTADO EN EL TRONO',key:'G',bpm:126,docId:'1d6561eQni4DZmJ906QqdokLwvvRFeCfTRzB62dqYVCw'},{name:'SANTO POR SIEMPRE',key:'C',bpm:80},{name:'ANCLADO',key:'G',bpm:88},{name:'EN MEMORIA DE TI',key:'G',bpm:60}],
};
export const EVENTOS_ESPECIALES=[
  // Julio
  {mes:7,dia:6,tipo:'domingo',label:'Domingo 6 de Julio',setlist:[{name:'LEÓN',key:'E',bpm:120},{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'BUENO ERES TU',key:'D',bpm:94},{name:'AGNUS DEI',key:'G',bpm:65}]},
  {mes:7,dia:13,tipo:'domingo',label:'Domingo 13 de Julio',setlist:[{name:'HERMOSO NOMBRE',key:'G',bpm:84},{name:'QUE SE ABRA EL CIELO',key:'D',bpm:118},{name:'TU PROVEERÁS',key:'G',bpm:73},{name:'SEGURO ESTOY',key:'D',bpm:58}]},
  {mes:7,dia:19,tipo:'sabado',label:'Noche de Adoración',setlist:[{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'HERMOSO NOMBRE',key:'G',bpm:84},{name:'BARRO',key:'C',bpm:82},{name:'COMUNIÓN',key:'D',bpm:62},{name:'AGNUS DEI',key:'G',bpm:65}]},
  {mes:7,dia:20,tipo:'domingo',label:'Domingo 20 de Julio',setlist:[{name:'NO SOY ESCLAVO',key:'A',bpm:112},{name:'BARRO',key:'C',bpm:82},{name:'LO HARÁS OTRA VEZ',key:'G',bpm:70}]},
  {mes:7,dia:27,tipo:'domingo',label:'Domingo 27 de Julio',setlist:[{name:'TODA LENGUA TODA NACIÓN',key:'A',bpm:124},{name:'SIEMPRE YHWH',key:'G',bpm:100},{name:'MI ESPERANZA',key:'G',bpm:90},{name:'A TI ME RINDO',key:'G',bpm:68}]},
  // Agosto
  {mes:8,dia:16,tipo:'sabado',label:'Noche de Adoración',setlist:[{name:'LLEVAME A LA CRUZ',key:'G',bpm:78},{name:'ANCLADO',key:'G',bpm:88},{name:'CENTRO',key:'G',bpm:55},{name:'EN MEMORIA DE TI',key:'G',bpm:60}]},
  // Septiembre
  {mes:9,dia:7,tipo:'domingo',label:'Domingo 7 de Septiembre',setlist:[{name:'ALABA (PRAISE)',key:'G',bpm:128},{name:'COMO EN EL CIELO',key:'D',bpm:102},{name:'HERMOSO DIOS',key:'D',bpm:92},{name:'SIEMPRE A TIEMPO',key:'Am',bpm:76}]},
  {mes:9,dia:14,tipo:'domingo',label:'Domingo 14 de Septiembre',setlist:[{name:'BUENO ERES TU',key:'D',bpm:94},{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'OCEANOS',key:'D',bpm:72},{name:'COMUNIÓN',key:'D',bpm:62}]},
  {mes:9,dia:18,tipo:'especial',label:'Fiestas Patrias',setlist:[{name:'BUENO ERES TU',key:'D',bpm:94},{name:'ALABA (PRAISE)',key:'G',bpm:128},{name:'TODA LENGUA TODA NACIÓN',key:'A',bpm:124},{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'A TI ME RINDO',key:'G',bpm:68}]},
  {mes:9,dia:21,tipo:'domingo',label:'Domingo 21 de Septiembre',setlist:[{name:'YESHUA',key:'D',bpm:130},{name:'LA BONDAD DE DIOS',key:'C',bpm:89},{name:'LO HARÁS OTRA VEZ',key:'G',bpm:70},{name:'SEGURO ESTOY',key:'D',bpm:58}]},
];

export const CANCIONES = [
  {n:'ALABA (PRAISE)',bpm:128,key:'G'},{n:'YESHUA',bpm:130,key:'D'},{n:'TODA LENGUA TODA NACIÓN',bpm:124,key:'A'},
  {n:'AL QUE ESTÁ SENTADO EN EL TRONO',bpm:126,key:'G'},{n:'LEÓN',bpm:120,key:'E'},{n:'QUE SE ABRA EL CIELO',bpm:118,key:'D'},
  {n:'NO SOY ESCLAVO',bpm:112,key:'A'},{n:'AMOR SIN CONDICIÓN',bpm:110,key:'D'},{n:'TODO CAMBIÓ',bpm:108,key:'G'},
  {n:'SU VENIDA',bpm:105,key:'E'},{n:'COMO EN EL CIELO',bpm:102,key:'D'},{n:'SIEMPRE YHWH',bpm:100,key:'G'},
  {n:'BUENO ERES TU',bpm:94,key:'D'},{n:'HERMOSO DIOS',bpm:92,key:'D'},{n:'MI ESPERANZA ESTÁ EN JESÚS',bpm:90,key:'G'},
  {n:'LA BONDAD DE DIOS',bpm:89,key:'C'},{n:'ANCLADO',bpm:88,key:'G'},{n:'GLORIA EN GLORIA',bpm:86,key:'D'},
  {n:'HERMOSO NOMBRE',bpm:84,key:'G'},{n:'BARRO',bpm:82,key:'C'},{n:'SANTO POR SIEMPRE',bpm:80,key:'C'},
  {n:'LLEVAME A LA CRUZ',bpm:78,key:'G'},{n:'SIEMPRE A TIEMPO',bpm:76,key:'Am'},{n:'TU PROVEERÁS',bpm:73,key:'G'},
  {n:'OCEANOS',bpm:72,key:'D'},{n:'LO HARÁS OTRA VEZ',bpm:70,key:'G'},{n:'A TI ME RINDO',bpm:68,key:'G'},
  {n:'AGNUS DEI',bpm:65,key:'G'},{n:'COMUNIÓN',bpm:62,key:'D'},{n:'EN MEMORIA DE TI',bpm:60,key:'G'},
  {n:'SEGURO ESTOY',bpm:58,key:'D'},{n:'CENTRO',bpm:55,key:'G'},{n:'LLUVIA',bpm:85,key:'A'},
  {n:'EL ESTÁ AQUÍ',bpm:82,key:'D'},{n:'GRACIAS (Majo y Dan)',bpm:100,key:'C'},{n:'GRACIAS DIOS',bpm:96,key:'G'},
  {n:'TEN FE CORAZÓN',bpm:93,key:'G'},{n:'GLORIA A CRISTO',bpm:115,key:'G'},{n:'ANHELO ESTAR EN TU PRESENCIA',bpm:66,key:'D'},
  {n:'ME RINDO TODO A TI',bpm:64,key:'C'},{n:'LA OSCURIDAD TIEMBLA ANTE CRISTO',bpm:116,key:'C'},
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
    {id:'encargado', label:'Encargado', icon:'⭐', color:'#c8a97e'},
    {id:'guitarrista', label:'Guitarrista', icon:'🎸', color:'#7b68ee'},
    {id:'bajista', label:'Bajista', icon:'🎸', color:'#5ecea0'},
    {id:'baterista', label:'Baterista', icon:'🥁', color:'#ff6b6b'},
    {id:'dj', label:'DJ', icon:'🎧', color:'#ff9f43'},
    {id:'corista1', label:'Corista 1', icon:'🎤', color:'#74b9ff'},
    {id:'corista2', label:'Corista 2', icon:'🎤', color:'#a29bfe'},
    {id:'teclado', label:'Tecladista', icon:'🎹', color:'#fd79a8'},
  ],
  equipos_trabajo: [
    {id:'roadies', label:'Roadies', icon:'🔧'},
    {id:'produccion', label:'Producción', icon:'🎬'},
    {id:'sonido', label:'Sonido', icon:'🎚'},
    {id:'visuales', label:'Visuales', icon:'💡'},
    {id:'catering', label:'Catering', icon:'🍕'},
    {id:'movilizacion', label:'Movilización', icon:'🚐'},
  ],
};

export const COVERS_DEMO = [
  {n:'ANCLADO', key:'E', bpm:88, artista:'Bethel Music', tipo:'cover'},
  {n:'OCEANOS', key:'Bm', bpm:72, artista:'Hillsong United', tipo:'cover'},
  {n:'GLORIA EN GLORIA', key:'D', bpm:86, artista:'Bethel Music', tipo:'cover'},
  {n:'TODO CAMBIÓ', key:'G', bpm:82, artista:'Maverick City Music', tipo:'cover'},
];

export const EQUIPOS_DATA=[
  {id:1,name:'Banda',color:'#8b72d4',roles:['Guitarra','Bajo','Piano','Batería','Mic 1','Libre'],miembros:[
    {id:1,name:'Belén Mella',email:'belen@iglesia.cl',role:'Mic 1'},
    {id:2,name:'Cony Saavedra',email:'cony@iglesia.cl',role:'Guitarra'},
    {id:3,name:'Florencia Gómez',email:'florencia@iglesia.cl',role:'Piano'},
    {id:4,name:'Cristian Gómez',email:'cristian@iglesia.cl',role:'Bajo'},
    {id:5,name:'Daniel Miranda',email:'daniel@iglesia.cl',role:'Batería'},
    {id:6,name:'Felipe Silva',email:'felipe@iglesia.cl',role:'Libre'},
  ]},
  {id:2,name:'Proyecciones',color:'#5ecea0',roles:['Operador','Diseño','Libre'],miembros:[
    {id:7,name:'Franco Silva',email:'franco@iglesia.cl',role:'Operador'},
    {id:8,name:'Renata',email:'renata@iglesia.cl',role:'Diseño'},
  ]},
  {id:3,name:'Sonido',color:'#ff9f0a',roles:['Ingeniero','Asistente','Libre'],miembros:[
    {id:9,name:'Carlos Cuevas',email:'carlos@iglesia.cl',role:'Ingeniero'},
    {id:10,name:'Mauro Pizarro',email:'mauro@iglesia.cl',role:'Asistente'},
  ]},
  {id:4,name:'Transmisiones',color:'#6e5fa0',roles:['Director','Streaming','Cámara','Libre'],miembros:[
    {id:11,name:'Renata V.',email:'renatav@iglesia.cl',role:'Streaming'},
  ]},
];

// Roles del modo Banda
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
