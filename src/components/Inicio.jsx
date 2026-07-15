import React, { useState, useRef, useCallback } from 'react';
import { CANCIONES } from '../data/constants';
import { getModoFeatures } from '../data/modo';
import { PLANES_SETSYNC, TRAMOS_EQUIPO, precioTramoEquipo } from '../data/planes';
import { t as getT } from '../i18n';

const BG_IMGS_IGLESIA = [
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80',
];
const BG_IMGS_BANDA = [
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80',
];

// Cuenta Equipo — tramos y precios vienen ahora de planes.js (fuente única
// de verdad, ver TRAMOS_EQUIPO). Antes vivían hardcodeados acá con el
// modelo viejo de 5 tramos — reemplazado en la sesión de pricing v51-v57.

// Diferenciadores de SetSync — sintetizado de los documentos de estrategia
// (misma info del HTML que ya se había armado, versión condensada para
// un bloque chico al final de Inicio).
const FEATURES_MKT = [
  {icon:'layers',   title:'Todo en una pantalla',   desc:'Setlist, monitoreo y secuencias juntos — nadie más lo integra.'},
  {icon:'globe',    title:'Hecho para LatAm',        desc:'Español nativo, no traducido.'},
  {icon:'split',    title:'Iglesia y Banda',         desc:'Dos interfaces, un mismo motor.'},
  {icon:'library',  title:'Cancionero Universal',    desc:'Banco de canciones compartido entre iglesias.'},
  {icon:'wifi',     title:'Monitoreo y mezcla personal inalámbrica WiFi', desc:'Cada músico controla su propio bus desde el teléfono.'},
  {icon:'bell',     title:'Notificaciones al equipo por evento', desc:'Convoca y recuerda sin salir de la app.'},
  {icon:'activity', title:'Secuencias en vivo',      desc:'Click, mapa de estructura y multitracks sincronizados.'},
  {icon:'users',    title:'Gestión de equipos de trabajo, roles y líderes', desc:'Delega permisos por área sin perder el control.'},
  {icon:'copy',     title:'Múltiples archivos y variaciones por canción', desc:'Distintas versiones y arreglos sin duplicar tu cancionero.'},
  {icon:'mic',      title:'Grabaciones de ensayos',  desc:'Graba y revisa el ensayo directo desde tu teléfono.'},
  {icon:'calendar', title:'Calendario',              desc:'Todas tus fechas y ensayos en un solo lugar.'},
];
const FEATURES_MKT_ICONS = {
  layers: <><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>,
  globe:  <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></>,
  split:  <><path d="M6 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V3"/><line x1="12" y1="12" x2="12" y2="21"/></>,
  library:<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
  wifi:   <><path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
  bell:   <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  activity:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
  users:  <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  copy:   <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  mic:    <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>,
  calendar:<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
};

const FAQS = [
  {q:'¿Cómo creo mi primer setlist?', a:'Backstage → Crear setlist. Agrega canciones, ordénalas y asígnalo a una fecha. Tu equipo lo ve automáticamente en Próxima Fecha.'},
  {q:'¿Cómo funciona el Monitoreo?', a:'Conecta tu mesa X32/M32/XR18 al WiFi. En SongView → Monitor activa la conexión por WiFi (protocolo OSC). Cada músico controla su propio bus desde su teléfono.'},
  {q:'¿Puedo usar SetSync sin internet?', a:'Sí, en modo offline. El contenido ya descargado funciona sin red. Los cambios se sincronizan cuando vuelves a conectarte.'},
  {q:'¿Cómo convoco al equipo?', a:'Backstage → selecciona el evento → Convocar equipo. Recibirán notificación por email y pueden confirmar asistencia.'},
  {q:'¿Qué es el Cancionero Universal?', a:'Una biblioteca compartida de canciones con acordes verificados. Disponible en planes Pro y Premium. Ve a Cancionero → pestaña Universal.'},
  {q:'¿Cómo funciona la Secuencia?', a:'En SongView → pestaña Secuencia encontrarás el waveform de la canción, los multitracks con faders individuales y el click sincronizado.'},
  {q:'¿Qué formatos de audio acepta Referencia?', a:'MP3, AAC, WAV, M4A. Puedes subir el audio desde tu dispositivo y hacer loop de cualquier sección para ensayar.'},
  {q:'¿Qué es la Cuenta Equipo?', a:'Un solo pago del admin que deja a todo el equipo con acceso Premium completo, automático. Más barato que sumar planes individuales apenas son 2-3 personas. Se activa en Backstage → Planes y precios.'},
  {q:'¿Cómo agrego miembros a mi Cuenta Equipo?', a:'Backstage → Planes y precios → sección Cuenta Equipo. Se agregan por correo electrónico — si esa persona aún no tiene cuenta, queda pendiente y se vincula sola cuando se registre.'},
  {q:'¿Qué pasa si dejo de pagar la Cuenta Equipo?', a:'Hay un período de gracia antes de que el equipo baje de plan — no se corta de inmediato. Puedes ver el estado exacto en Backstage → Planes y precios.'},
];

const TUTORIALES = [
  {
    slug:'monitoreo',
    titulo:'Conexión a Monitoreo Inalámbrico',
    icon:'🎛️',
    resumen:'Conecta SetSync a tu mesa Behringer X32, XR18 o Midas M32 para controlar el monitor de cada músico desde su teléfono.',
    contenido:`
# Conexión a Monitoreo Inalámbrico

SetSync se conecta a tu mesa digital por WiFi, usando el protocolo OSC (Open Sound Control) por debajo — en la práctica, es tu teléfono hablándole a la mesa por la misma red inalámbrica. El proceso es simple: los dispositivos (no solo teléfonos — también tablets o notebooks) deben estar conectados a la red WiFi que genera la mesa.

## ¿Qué es un bus?

Un bus de monitor es tu propia mezcla, independiente de lo que suena en las cornetas o en el in-ear del resto. Cada músico elige cuánto quiere escuchar de cada instrumento o voz — más batería, menos voz, lo que necesite — y arma esa mezcla desde su propio dispositivo, sin tener que pedirle nada al sonidista.

## Mesas compatibles
- Behringer X32 / X32 Compact / X32 Rack
- Behringer XR18 / XR16 / XR12
- Midas M32 / M32C / MR18

## Pasos de conexión

**1. Conectar la mesa al WiFi**
Conecta un router al puerto Ethernet de la mesa. La mesa creará una red o se unirá a la existente. Anota la IP de la mesa (aparece en el menú Setup → Network).

**2. Conectar los dispositivos**
Todos los músicos deben conectar su dispositivo (celular, tablet o notebook) a la misma red WiFi que genera la mesa.

**3. Activar en SetSync**
Abre una canción → pestaña Monitor → ingresa la IP de la mesa → conectar.

**4. Asignar bus**
Cada músico selecciona su bus de monitor (Bus 1, 2, 3...) y controla los niveles desde su pantalla, armando su propia mezcla.
    `
  },
  {
    slug:'secuencias',
    titulo:'Cómo Lanzar las Secuencias',
    icon:'▶️',
    resumen:'Aprende a cargar multitracks, sincronizar el click y navegar la estructura de la canción durante el ensayo o el servicio.',
    contenido:`
# Cómo Lanzar las Secuencias

La pestaña Secuencia en SongView es tu centro de control durante la ejecución de una canción con pistas.

## Qué encontrarás

**Mapa de estructura**
La barra horizontal con las secciones (Intro, V1, Coro...) te muestra exactamente dónde estás. Toca cualquier sección para saltar a ese punto.

**Waveform general**
Muestra la forma de onda de la canción completa. Al tocar una sección en el mapa, se ilumina ese segmento en el waveform. Puedes arrastrar el playhead para hacer seek.

**Controles**
- ⏮ Sección anterior
- ▶ / ⏸ Play / Pausa del click
- ⏭ Sección siguiente

**BPM y Cifra**
Ajusta el tempo y el compás. Mantén presionado − o + para cambio rápido.

**Multitracks**
8 canales por capa (A y B). Cada fader controla el volumen de una pista. Desliza el knob con el dedo para ajustar.

## Flujo recomendado
1. Carga tus archivos de audio en la pestaña Referencia
2. En Secuencia, ajusta el BPM y la cifra
3. Usa el mapa de estructura para navegar
4. Los músicos ven la misma posición en sus pantallas
    `
  },
  {
    slug:'agregar-cancion',
    titulo:'Cómo Ingresar una Canción',
    icon:'🎵',
    resumen:'Agrega canciones al cancionero con letra, acordes y toda la información necesaria para tu equipo.',
    contenido:`
# Cómo Ingresar una Canción

## Desde el Cancionero
Ve a Cancionero → botón "+" → Nueva canción.

## Datos básicos
- **Nombre**: el título de la canción
- **Artista / Autor**: quién la compuso
- **Tonalidad original**: la nota en la que está (Ej: D, Am, G)
- **BPM**: el tempo en beats por minuto
- **Compás**: 4/4, 3/4, 6/8, etc.

## Letra y acordes
El editor acepta el formato estándar de acordes sobre letra:

\`\`\`
G                    D
Mi orgullo me sacó del jardín
Em              C
Su humildad colocó el jardín en mí
\`\`\`

Los acordes se ponen en la línea inmediatamente antes de la letra. SetSync los detecta automáticamente.

## Secciones
Agrega etiquetas de sección entre corchetes:
\`\`\`
[VERSO 1]
...letra...

[CORO]
...letra...
\`\`\`

## Transposición automática
Una vez ingresada la tonalidad original, SetSync puede transponer automáticamente a cualquier otra tonalidad para cualquier músico.
    `
  },
  {
    slug:'cancionero-universal',
    titulo:'Cómo Funciona el Cancionero Universal',
    icon:'📚',
    resumen:'Accede a miles de canciones de worship con acordes verificados, compartidas por la comunidad SetSync.',
    contenido:`
# El Cancionero Universal

El Cancionero Universal es una biblioteca compartida mantenida por la comunidad de iglesias y bandas que usan SetSync.

## Qué incluye
- Canciones de worship en español e inglés
- Acordes verificados por la comunidad
- Tonalidades originales
- BPM y compás

## Cómo acceder
Cancionero → pestaña "Universal" (disponible en planes Pro y Premium).

## Buscar una canción
Usa el buscador por nombre, artista o tonalidad. Los resultados muestran la canción con su información completa.

## Agregar al cancionero propio
Toca la canción → "Agregar a mi cancionero". Aparecerá en tu biblioteca personal donde puedes editarla, ajustar los acordes y agregar notas.

## Contribuir
Si tienes una canción bien cifrada, puedes contribuirla a la comunidad desde Cancionero → tu canción → "Compartir con comunidad".

## Transposición
Como cualquier canción en SetSync, las del Universal se pueden transponer a cualquier tonalidad en tiempo real durante el ensayo o el servicio.
    `
  },
];

const EQ_COLORS = ['var(--gn)','var(--rd)','#a78bfa','#f59e0b','#34d399','#60a5fa'];

// ── Bloque arrastrable por filas ─────────────────────────────────────────
function useDragRows(initialOrder) {
  const [order, setOrder] = useState(initialOrder);
  const dragging = useRef(null);
  const dragOver = useRef(null);

  const onDragStart = (idx) => { dragging.current = idx; };
  const onDragEnter = (idx) => { dragOver.current = idx; };
  const onDragEnd = () => {
    if(dragging.current===null||dragOver.current===null||dragging.current===dragOver.current) {
      dragging.current=null; dragOver.current=null; return;
    }
    const newOrder = [...order];
    const [removed] = newOrder.splice(dragging.current, 1);
    newOrder.splice(dragOver.current, 0, removed);
    setOrder(newOrder);
    dragging.current=null; dragOver.current=null;
  };

  return { order, onDragStart, onDragEnter, onDragEnd };
}

// ── Tutorial page ─────────────────────────────────────────────────────────
function TutorialPage({ tut, onClose }) {
  const lines = tut.contenido.trim().split('\n');
  return (
    <div style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:200,overflowY:'auto',
      paddingBottom:80}}>
      <div style={{position:'sticky',top:0,background:'rgba(8,8,9,.97)',
        borderBottom:'1px solid var(--s3)',padding:'12px 14px',
        display:'flex',alignItems:'center',gap:10,zIndex:1}}>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:'1px solid var(--bd)',
          background:'var(--s1)',color:'var(--tx)',cursor:'pointer',fontSize:'var(--fs-xl)',
          display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
        <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-2xl)',fontWeight:400,color:'var(--tx)'}}>
          {tut.titulo}
        </div>
      </div>
      <div style={{padding:'20px 16px',maxWidth:600,margin:'0 auto'}}>
        {lines.map((line,i) => {
          if(line.startsWith('# ')) return (
            <div key={i} style={{fontFamily:"var(--font-display)",
              fontSize:'var(--fs-2xl)',fontWeight:400,color:'var(--ac)',marginBottom:16,marginTop:i?24:0,lineHeight:1.2}}>
              {line.slice(2)}
            </div>
          );
          if(line.startsWith('## ')) return (
            <div key={i} style={{fontFamily:"var(--font-body)",
              fontSize:'var(--fs-md)',fontWeight:700,color:'var(--tx)',marginBottom:8,marginTop:20,
              textTransform:'uppercase',letterSpacing:'1px'}}>
              {line.slice(3)}
            </div>
          );
          if(line.startsWith('**')&&line.endsWith('**')) return (
            <div key={i} style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-md)',fontWeight:700,
              color:'var(--tx)',marginBottom:4,marginTop:10}}>
              {line.slice(2,-2)}
            </div>
          );
          if(line.startsWith('- ')) return (
            <div key={i} style={{display:'flex',gap:8,marginBottom:4}}>
              <span style={{color:'var(--ac)',flexShrink:0,marginTop:2}}>·</span>
              <span style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-base)',fontWeight:300,
                color:'var(--tx2)',lineHeight:1.7}}>{line.slice(2)}</span>
            </div>
          );
          if(line.startsWith('```')||line==='\`\`\`') return null;
          if(line.trim()==='') return <div key={i} style={{height:6}}/>;
          return (
            <div key={i} style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-base)',fontWeight:300,
              color:'var(--tx2)',lineHeight:1.8,marginBottom:4}}>{line}</div>
          );
        })}
      </div>
    </div>
  );
}

// ── Notas ─────────────────────────────────────────────────────────────────
function NotasPage({notas,onClose,onDelete,onCreate,lang='es'}) {
  const tx = getT(lang);
  return (
    <div style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:200,overflowY:'auto',paddingBottom:80}}>
      <div style={{position:'sticky',top:0,background:'rgba(8,8,9,.97)',
        borderBottom:'1px solid var(--s3)',padding:'12px 14px',
        display:'flex',alignItems:'center',gap:10,zIndex:1}}>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:'1px solid var(--bd)',
          background:'var(--s1)',color:'var(--tx)',cursor:'pointer',fontSize:'var(--fs-xl)',
          display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
        <div style={{flex:1,fontFamily:"var(--font-display)",fontSize:'var(--fs-2xl)',fontWeight:400}}>
          {tx.ideasNotesLbl}
        </div>
        <button onClick={onCreate}
          style={{padding:'6px 14px',borderRadius:8,border:'none',background:'var(--ac)',
            color:'#000',cursor:'pointer',fontSize:'var(--fs-sm)',fontWeight:700,
            fontFamily:"var(--font-body)"}}>{tx.newNoteBtn}</button>
      </div>
      <div style={{padding:'14px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        {notas.length===0?(
          <div style={{gridColumn:'span 3',textAlign:'center',padding:'40px 0',
            fontFamily:"var(--font-body)",fontSize:'var(--fs-subtitle)',color:'var(--tx2)'}}>
            {tx.noNotesYet}
          </div>
        ):notas.map((n,i)=>(
          <div key={i} style={{padding:'12px 10px',borderRadius:12,
            background:'var(--s1)',border:'1px solid var(--s3)',
            cursor:'pointer',position:'relative'}}>
            <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-sm)',fontWeight:700,
              color:'var(--tx)',marginBottom:4,lineHeight:1.3,
              overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
              {n.texto.slice(0,40)||(n.texto.trim().split(/\n/)[0])||tx.noTitleNote}
            </div>
            <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontFamily:"var(--font-body)"}}>
              {n.fecha}
            </div>
            <button onClick={e=>{e.stopPropagation();onDelete(i);}}
              style={{position:'absolute',top:6,right:6,width:18,height:18,borderRadius:4,
                border:'none',background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-md)',
                display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotasBlock({lang='es'}) {
  const tx = getT(lang);
  const HOY = new Date().toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'});
  const [notas, setNotas] = useState([]);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');
  const [verTodas, setVerTodas] = useState(false);
  const ultima = notas[notas.length-1];

  const guardar = () => {
    if(!texto.trim()){setEditando(false);return;}
    setNotas(v=>[...v,{texto:texto.trim(),fecha:HOY}]);
    setTexto('');setEditando(false);
  };
  const borrar = (i) => setNotas(v=>v.filter((_,j)=>j!==i));

  return (
    <>
      {verTodas&&<NotasPage notas={notas} onClose={()=>setVerTodas(false)} lang={lang}
        onDelete={borrar} onCreate={()=>{setVerTodas(false);setEditando(true);}}/>}
      <div style={{background:'var(--s1)',borderRadius:'var(--rad-lg)',padding:'var(--sp-md)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <Lbl2>{tx.ideasNotesLbl}</Lbl2>
          <div style={{display:'flex',gap:8}}>
            {notas.length>0&&(
              <button onClick={()=>setVerTodas(true)}
                style={{fontSize:'var(--fs-xs)',fontWeight:700,color:'var(--tx3)',background:'none',
                  border:'none',cursor:'pointer',fontFamily:"var(--font-body)"}}>
                {tx.seeAllLbl(notas.length)}
              </button>
            )}
            <button onClick={()=>editando?guardar():setEditando(true)}
              style={{fontSize:'var(--fs-xs)',fontWeight:700,color:editando?'var(--ac)':'var(--tx3)',
                background:'none',border:'none',cursor:'pointer',
                fontFamily:"var(--font-body)"}}>
              {editando?tx.saveNoteBtn:tx.newNoteBtn}
            </button>
          </div>
        </div>
        {editando ? (
          <textarea value={texto} onChange={e=>setTexto(e.target.value)}
            autoFocus
            placeholder={tx.writeNotePlaceholder}
            style={{width:'100%',minHeight:72,background:'var(--s1)',
              border:'1px solid var(--bd)',borderRadius:8,
              color:'var(--tx)',fontFamily:"var(--font-body)",fontSize:'var(--fs-base)',
              fontWeight:300,lineHeight:1.7,padding:'8px 10px',resize:'none',outline:'none',
              boxSizing:'border-box'}}/>
        ) : ultima ? (
          <div onClick={()=>setEditando(true)} style={{cursor:'pointer'}}>
            <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-base)',fontWeight:300,
              color:'var(--tx2)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>
              {ultima.texto.length>120?ultima.texto.slice(0,120)+'…':ultima.texto}
            </div>
            <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",marginTop:5}}>
              {ultima.fecha}
            </div>
          </div>
        ) : (
          <div onClick={()=>setEditando(true)}
            style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-base)',fontWeight:300,
              color:'var(--tx3)',lineHeight:1.7,cursor:'pointer',minHeight:36,
              display:'flex',alignItems:'center'}}>
            {tx.tapToAddNote}
          </div>
        )}
      </div>
    </>
  );
}

// Helper Lbl para NotasBlock (no usa la prop color)
const Lbl2 = ({children}) => (
  <div style={{fontFamily:"var(--font-display)",fontWeight:400,
    fontSize:'var(--fs-xl)',color:'var(--tx)'}}>{children}</div>
);

const NOTIFICACIONES_DEMO = [
  {icon:'✅',color:'var(--gn)',texto:'Cony confirmó asistencia al ensayo del jueves',tiempo:'Hace 20 min',leida:false},
  {icon:'📎',color:'#a78bfa',texto:'Daniel subió una partitura para "Gloria en Gloria"',tiempo:'Hace 2 h',leida:false},
  {icon:'💬',color:'#e07820',texto:'Nuevo mensaje en el equipo de alabanza',tiempo:'Ayer',leida:true},
  {icon:'📅',color:'#5ecea0',texto:'Se creó el evento "Culto Domingo 12"',tiempo:'Ayer',leida:true},
];

export function Inicio({ mode, lang='es', userRole='superadmin', equipos=[], personas=[], eventos=[], planActivo=null, planId='lite', viaEquipo=false, orgPrincipal=null, tieneMonitoreo=false, onNavigate=()=>{}, ensayos=[] }) {
  const feat = getModoFeatures(mode);
  const tx = getT(lang);
  const BG_IMGS = mode==='iglesia' ? BG_IMGS_IGLESIA : BG_IMGS_BANDA;
  const [bgIdx] = useState(()=>Math.floor(Math.random()*3));
  const isAdmin = userRole==='superadmin'||userRole==='leader';
  const nombre = 'Daniel';
  const [tutorialActivo, setTutorialActivo] = useState(null);
  const [faqsOpen, setFaqsOpen] = useState({});

  const hoy = new Date();
  const proximoEvento = eventos.filter(e=>e.fecha&&new Date(e.fecha)>=hoy)
    .sort((a,b)=>new Date(a.fecha)-new Date(b.fecha))[0]||null;
  const misEquipos = equipos.filter(eq=>(eq.miembros||[]).length>0);
  const planLabel = viaEquipo ? 'Premium' : ({lite:'Lite',pro:'Pro',premium:'Premium'}[planId]||planId);

  // Bloques con orden arrastrable (por filas de 2)
  // Cada "row" es un índice de bloque
  const BLOCK_ROWS = [
    ['proximo'],
    ['notificaciones'],
    ['equipo'],
    ['cancionero','plan'],
    ['notas'],
    ['tutoriales'],
    ['faqs'],
    ['planes'],
  ];
  const { order, onDragStart, onDragEnter, onDragEnd } = useDragRows(BLOCK_ROWS.map((_,i)=>i));

  const Card = ({children, cols=1, onClick, style={}}) => (
    <div onClick={onClick} style={{
      position:'relative',
      background:'var(--s1)',borderRadius:'var(--rad-lg)',
      padding:'var(--sp-md)',cursor:onClick?'pointer':'default',
      gridColumn:`span ${cols}`,transition:'background .15s',...style,
    }}
    onPointerEnter={onClick?e=>e.currentTarget.style.background='var(--s3)':undefined}
    onPointerLeave={onClick?e=>e.currentTarget.style.background='var(--s1)':undefined}
    >
      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="var(--tx3)" strokeWidth="2"
        style={{position:'absolute',top:8,right:8,opacity:.3,pointerEvents:'none'}}>
        <circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/>
        <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
        <circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>
      </svg>
      {children}
    </div>
  );

  const Lbl = ({children}) => (
    <div style={{fontFamily:"var(--font-display)",fontWeight:400,
      fontSize:'var(--fs-xl)',color:'var(--tx)',marginBottom:2}}>{children}</div>
  );

  const toggleFaq = i => setFaqsOpen(v=>({...v,[i]:!v[i]}));

  // Renderizar cada bloque por key
  const renderBlock = (key) => {
    switch(key) {

      case 'proximo': return (
        <Card cols={2} onClick={()=>onNavigate('fechas')} key="proximo">
          <Lbl>{mode==='iglesia'?tx.nextDateCard:tx.nextShowCard}</Lbl>
          {proximoEvento ? (<>
            <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-xl)',
              color:'var(--tx)',marginBottom:4,lineHeight:1.1,fontWeight:400}}>
              {proximoEvento.nombre}
            </div>
            <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontWeight:300}}>
              {new Date(proximoEvento.fecha).toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}
              {(proximoEvento.setlist||[]).length>0&&` · ${proximoEvento.setlist.length} canciones`}
            </div>
            {ensayos.some(en=>en.ref===`evento:${proximoEvento.id}`)&&(
              <div style={{display:'flex',alignItems:'center',gap:4,marginTop:5}}>
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="var(--gn)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{fontSize:'var(--fs-xs)',fontWeight:700,color:'var(--gn)',fontFamily:"var(--font-body)"}}>{tx.rehearsalAssigned}</span>
              </div>
            )}
          </>) : (
            <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontWeight:300}}>
              {tx.noUpcomingDates}{' '}
              <span style={{color:'var(--ac)',cursor:'pointer'}}
                onClick={e=>{e.stopPropagation();onNavigate('backstage');}}>{tx.createOne}</span>
            </div>
          )}
        </Card>
      );

      case 'equipo': return (
        <Card cols={2} key="equipo">
          <Lbl>{tx.myTeamLbl}</Lbl>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {[
              {label:tx.peopleLbl,val:personas.length,color:'var(--ac)',onClick:()=>onNavigate('backstage')},
              {label:tx.teams,val:misEquipos.length,color:'var(--gn)',onClick:()=>onNavigate('backstage')},
              {label:tx.leadersLbl,val:equipos.filter(e=>e.lider).length,color:'#a78bfa',onClick:()=>onNavigate('backstage')},
            ].map(({label,val,color,onClick})=>(
              <div key={label} onClick={onClick}
                style={{textAlign:'center',padding:'10px 8px',borderRadius:12,
                  background:'var(--s1)',cursor:'pointer',
                  border:'1px solid var(--s3)'}}>
                <div style={{fontFamily:"var(--font-display)",
                  fontSize:'var(--fs-display)',color,lineHeight:1,fontWeight:400}}>{val}</div>
                <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-xs)',
                  color:'var(--tx3)',fontWeight:700,marginTop:4,textTransform:'uppercase',
                  letterSpacing:'1px'}}>{label}</div>
              </div>
            ))}
          </div>
        </Card>
      );

      case 'cancionero': return (
        <Card onClick={()=>onNavigate('repertorio')} key="cancionero">
          <Lbl>{tx.songsCardLbl}</Lbl>
          <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-3xl)',
            color:'var(--ac)',lineHeight:1,fontWeight:400}}>{CANCIONES.length}</div>
          <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-subtitle)',color:'var(--tx2)',
            fontWeight:300,marginTop:4}}>{tx.songs}</div>
          {feat.cancioneroUniversal&&(
            <div style={{fontSize:'var(--fs-xs)',color:'var(--gn)',fontFamily:"var(--font-body)",
              fontWeight:700,marginTop:6}}>{tx.universalCheck}</div>
          )}
        </Card>
      );

      case 'plan': return (
        <Card onClick={()=>onNavigate('backstage')} key="plan">
          <Lbl>{tx.myPlanLbl}</Lbl>
          <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-3xl)',
            color:'var(--ac)',lineHeight:1,fontWeight:400}}>{planLabel}</div>
          {planId==='lite'&&(
            <div style={{fontSize:'var(--fs-xs)',color:'var(--gn)',fontFamily:"var(--font-body)",
              fontWeight:700,marginTop:8}}>{tx.upgradeLbl}</div>
          )}
        </Card>
      );

      case 'notificaciones': return (
        <Card cols={2} key="notificaciones">
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="1.8">
              <path d="M4 4h13l3 3v13H4z"/><path d="M17 4v6h6"/>
            </svg>
            <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
              letterSpacing:'1.5px',fontFamily:"var(--font-body)"}}>{tx.lastNotifications}</span>
          </div>
          {NOTIFICACIONES_DEMO.length===0?(
            <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-base)',fontWeight:300,
              color:'var(--tx3)',padding:'8px 0'}}>
              {tx.noNotificationsYet}
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {NOTIFICACIONES_DEMO.map((n,i)=>(
                <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',
                  padding:'9px 0',borderBottom:i<NOTIFICACIONES_DEMO.length-1?'1px solid var(--s1)':'none'}}>
                  <div style={{width:26,height:26,borderRadius:8,flexShrink:0,
                    background:`${n.color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontSize:'var(--fs-md)'}}>{n.icon}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"var(--font-body)",fontSize:'10px',fontWeight:400,
                      color:'var(--tx)',lineHeight:1.4}}>{n.texto}</div>
                    <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",marginTop:2}}>
                      {n.tiempo}
                    </div>
                  </div>
                  {!n.leida&&(
                    <div style={{width:7,height:7,borderRadius:'50%',background:n.color,flexShrink:0,marginTop:4}}/>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      );

      case 'notas': return (
        <div key="notas" style={{gridColumn:'span 2'}}>
          <NotasBlock lang={lang}/>
        </div>
      );

      case 'tutoriales': return (
        <Card cols={2} key="tutoriales">
          <Lbl>{tx.tutorialsLbl}</Lbl>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {TUTORIALES.map(tut=>(
              <div key={tut.slug}
                onClick={()=>setTutorialActivo(tut)}
                style={{padding:'12px 10px',borderRadius:12,cursor:'pointer',
                  background:'var(--s1)',border:'1px solid var(--s3)',
                  display:'flex',flexDirection:'column',gap:6,transition:'background .15s'}}
                onPointerEnter={e=>e.currentTarget.style.background='var(--s3)'}
                onPointerLeave={e=>e.currentTarget.style.background='var(--s1)'}>
                <div style={{fontSize:'var(--fs-xl)'}}>{tut.icon}</div>
                <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-base)',fontWeight:700,
                  color:'var(--tx)',lineHeight:1.3}}>{tut.titulo}</div>
                <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-sm)',fontWeight:300,
                  color:'var(--tx3)',lineHeight:1.5}}>{tut.resumen}</div>
                <div style={{fontSize:'var(--fs-xs)',color:'var(--ac)',fontWeight:700,
                  fontFamily:"var(--font-body)",marginTop:2}}>{tx.seeMoreLbl}</div>
              </div>
            ))}
          </div>
        </Card>
      );

      case 'faqs': return (
        <Card cols={2} key="faqs">
          <Lbl>{tx.faqLbl}</Lbl>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {FAQS.map((faq,i)=>(
              <div key={i} style={{borderBottom:i<FAQS.length-1?'1px solid var(--s1)':'none'}}>
                <button onClick={()=>toggleFaq(i)}
                  style={{width:'100%',background:'none',border:'none',textAlign:'left',
                    padding:'10px 0',cursor:'pointer',display:'flex',alignItems:'center',
                    justifyContent:'space-between',gap:8}}>
                  <span style={{fontFamily:"var(--font-body)",fontSize:'10px',fontWeight:400,
                    color:'var(--tx)',lineHeight:1.4}}>{faq.q}</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)"
                    strokeWidth="2" style={{flexShrink:0,transform:faqsOpen[i]?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {faqsOpen[i]&&(
                  <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-base)',color:'var(--tx2)',
                    fontWeight:300,lineHeight:1.7,paddingBottom:10}}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      );

      case 'planes': return (
        <Card cols={2} key="planes">
          <Lbl>{tx.plansSetSyncLbl}</Lbl>

          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
            letterSpacing:'1px',fontFamily:"var(--font-body)",marginBottom:6}}>{tx.personalPlansLbl}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:14}}>
            {Object.values(PLANES_SETSYNC).map(p=>{
              const isCurrent = !viaEquipo && planId===p.id;
              return (
                <div key={p.id} style={{padding:'10px 6px',borderRadius:10,textAlign:'center',
                  background:isCurrent?'rgba(var(--gn-rgb),.1)':'var(--s1)',
                  border:isCurrent?'1px solid rgba(var(--gn-rgb),.35)':'1px solid var(--s3)'}}>
                  <div style={{fontSize:'var(--fs-2xs)',fontWeight:900,color:isCurrent?'var(--gn)':'var(--tx3)',
                    textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5,
                    fontFamily:"var(--font-body)"}}>{p.label}</div>
                  <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-emph)',
                    color:'var(--tx)',fontWeight:400}}>
                    {p.precioMensual===0?tx.freeLbl:`$${p.precioMensual}`}
                  </div>
                  {p.precioMensual>0&&<div style={{fontSize:'var(--fs-3xs)',color:'var(--tx3)',marginTop:1}}>/mes</div>}
                  {isCurrent&&<div style={{fontSize:'var(--fs-3xs)',color:'var(--gn)',fontWeight:700,marginTop:4}}>{tx.yourPlanLbl}</div>}
                </div>
              );
            })}
          </div>

          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
            letterSpacing:'1px',fontFamily:"var(--font-body)",marginBottom:6}}>{tx.teamPlansPerPersonLbl}</div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {TRAMOS_EQUIPO.map(t=>{
              const isCurrentTramo = viaEquipo && orgPrincipal?.tramoId===t.id;
              const precio = t.id==='eq-36+'
                ? `${tx.fromLbl} $${precioTramoEquipo(t.id,36)}`
                : `$${t.precioBase}`;
              return (
                <div key={t.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'8px 12px',borderRadius:10,
                  background:isCurrentTramo?'rgba(var(--gn-rgb),.1)':'var(--s1)',
                  border:isCurrentTramo?'1px solid rgba(var(--gn-rgb),.35)':'1px solid var(--s3)'}}>
                  <div>
                    <span style={{fontSize:'var(--fs-base)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontWeight:400}}>{t.label}</span>
                    {t.marcaBlanca&&<div style={{fontSize:'var(--fs-2xs)',color:'var(--gn)',fontFamily:"var(--font-body)",marginTop:1}}>{tx.whiteLabelIncluded}</div>}
                    {isCurrentTramo&&<div style={{fontSize:'var(--fs-2xs)',color:'var(--gn)',fontWeight:700,fontFamily:"var(--font-body)",marginTop:1}}>{tx.yourPlanLbl}</div>}
                  </div>
                  <span style={{fontSize:'var(--fs-md)',color:'var(--tx)',fontFamily:"var(--font-body)",fontWeight:700,flexShrink:0}}>{precio}</span>
                </div>
              );
            })}
          </div>

          <div style={{marginTop:12,textAlign:'center'}}>
            <span style={{fontSize:'var(--fs-sm)',color:'var(--gn)',fontWeight:700,cursor:'pointer',
              fontFamily:"var(--font-body)"}} onClick={()=>onNavigate('backstage')}>
              {tx.viewFullPlansLbl}
            </span>
          </div>
        </Card>
      );

      default: return null;
    }
  };

  return (
    <div style={{paddingBottom:90}}>
      {/* Tutorial overlay */}
      {tutorialActivo&&(
        <TutorialPage tut={tutorialActivo} onClose={()=>setTutorialActivo(null)}/>
      )}

      {/* Hero */}
      <div style={{position:'relative',height:200,overflow:'hidden'}}>
        <img src={BG_IMGS[bgIdx%BG_IMGS.length]} alt=""
          style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.28) saturate(.6)'}}
          loading="lazy"/>
        <div style={{position:'absolute',inset:0,
          background:'linear-gradient(180deg,transparent 20%,var(--bg) 100%)'}}/>
        <div style={{position:'absolute',inset:0,padding:'var(--sp-lg) var(--sp-md)',
          display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
          <div style={{fontFamily:"var(--font-display)",fontWeight:200,
            fontSize:'var(--fs-display)',color:'#fff',lineHeight:1.1}}>
            Hola <span style={{color:'var(--ac)'}}>{nombre}</span>
          </div>
          <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-base)',
            color:'rgba(255,255,255,.45)',marginTop:4}}>
            SetSync · {mode==='iglesia'?tx.footerTaglineIglesia:tx.footerTaglineBanda}
          </div>
        </div>
      </div>

      {/* Grid con bloques arrastrables */}
      <div style={{padding:'var(--sp-md) var(--pw-x,var(--sp-md))'}}>
        {/* Indicador de que los bloques se pueden arrastrar/reordenar */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,opacity:.5}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--tx3)" strokeWidth="2">
            <circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/>
            <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
            <circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>
          </svg>
          <span style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",fontWeight:300}}>
            Mantén presionado y arrastra para reordenar
          </span>
        </div>
        {order.map((rowIdx,dragIdx)=>{
          const keys = BLOCK_ROWS[rowIdx];
          return (
            <div key={rowIdx}
              draggable
              onDragStart={()=>onDragStart(dragIdx)}
              onDragEnter={()=>onDragEnter(dragIdx)}
              onDragEnd={onDragEnd}
              style={{
                display:'grid',
                gridTemplateColumns:'1fr 1fr',
                gap:'var(--gap,10px)',
                marginBottom:'var(--gap,10px)',
                cursor:'grab',
              }}>
              {keys.map(key=>renderBlock(key))}
            </div>
          );
        })}

        {/* ── Bloque marketero — fijo al final, fuera del reordenamiento ── */}
        <div style={{marginTop:4,padding:'var(--sp-md)',borderRadius:'var(--rad-lg)',
          background:'var(--s1)',border:'1px solid rgba(var(--gn-rgb),.15)'}}>
          <div style={{fontFamily:"var(--font-display)",fontWeight:400,
            fontSize:'var(--fs-xl)',color:'var(--tx)',marginBottom:2}}>Por qué SetSync es el mejor</div>
          <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-base)',
            color:'var(--tx2)',marginBottom:12,lineHeight:1.5}}>
            La única pantalla que un músico necesita en el escenario.
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {FEATURES_MKT.map(f=>(
              <div key={f.title} style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <div style={{width:26,height:26,borderRadius:8,flexShrink:0,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  background:'rgba(var(--gn-rgb),.1)'}}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--gn)" strokeWidth="1.8">
                    {FEATURES_MKT_ICONS[f.icon]}
                  </svg>
                </div>
                <div style={{flex:1,paddingTop:2}}>
                  <div style={{fontSize:'10px',fontWeight:400,color:'var(--tx)',
                    fontFamily:"var(--font-body)",marginBottom:1}}>{f.title}</div>
                  <div style={{fontSize:'var(--fs-sm)',fontWeight:300,color:'var(--tx3)',
                    fontFamily:"var(--font-body)",lineHeight:1.4}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
