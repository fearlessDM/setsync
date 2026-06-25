import React, { useState, useRef, useCallback } from 'react';
import { CANCIONES } from '../data/constants';
import { getModoFeatures } from '../data/modo';

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

const FAQS = [
  {q:'¿Cómo creo mi primer setlist?', a:'Backstage → Crear setlist. Agrega canciones, ordénalas y asígnalo a una fecha. Tu equipo lo ve automáticamente en Próxima Fecha.'},
  {q:'¿Cómo funciona el Monitoreo?', a:'Conecta tu mesa X32/M32/XR18 al WiFi. En SongView → Monitor activa la conexión OSC. Cada músico controla su propio bus desde su teléfono.'},
  {q:'¿Puedo usar SetSync sin internet?', a:'Sí, en modo offline. El contenido ya descargado funciona sin red. Los cambios se sincronizan cuando vuelves a conectarte.'},
  {q:'¿Cómo convoco al equipo?', a:'Backstage → selecciona el evento → Convocar equipo. Recibirán notificación por email y pueden confirmar asistencia.'},
  {q:'¿Cómo transpongo una canción?', a:'En SongView toca el botón de nota (ej. "D") en la barra de herramientas. Ahí puedes subir/bajar semitonos y agregar capo.'},
  {q:'¿Qué es el Cancionero Universal?', a:'Una biblioteca compartida de canciones con acordes verificados. Disponible en planes Pro y Premium. Ve a Cancionero → pestaña Universal.'},
  {q:'¿Cómo funciona la Secuencia?', a:'En SongView → pestaña Secuencia encontrarás el waveform de la canción, los multitracks con faders individuales y el click sincronizado.'},
  {q:'¿Qué formatos de audio acepta Referencia?', a:'MP3, AAC, WAV, M4A. Puedes subir el audio desde tu dispositivo y hacer loop de cualquier sección para ensayar.'},
];

const TUTORIALES = [
  {
    slug:'monitoreo',
    titulo:'Conexión a Monitoreo Inalámbrico',
    icon:'🎛️',
    resumen:'Conecta SetSync a tu mesa Behringer X32, XR18 o Midas M32 para controlar el monitor de cada músico desde su teléfono.',
    contenido:`
# Conexión a Monitoreo Inalámbrico

SetSync usa el protocolo OSC (Open Sound Control) para comunicarse con tu mesa digital. El proceso es simple: la mesa y los teléfonos deben estar en la misma red WiFi.

## Mesas compatibles
- Behringer X32 / X32 Compact / X32 Rack
- Behringer XR18 / XR16 / XR12
- Midas M32 / M32C / MR18

## Pasos de conexión

**1. Conectar la mesa al WiFi**
Conecta un router al puerto Ethernet de la mesa. La mesa creará una red o se unirá a la existente. Anota la IP de la mesa (aparece en el menú Setup → Network).

**2. Conectar los teléfonos**
Todos los músicos deben conectar su teléfono a la misma red WiFi de la mesa.

**3. Activar en SetSync**
Abre una canción → pestaña Monitor → ingresa la IP de la mesa → conectar.

**4. Asignar bus**
Cada músico selecciona su bus de monitor (Bus 1, 2, 3...) y controla los niveles desde su pantalla.

## Importante
La conexión OSC real requiere SetSync como app nativa (próximamente en App Store). En la versión web actual, la UI está disponible pero la señal OSC necesita el bridge de red local.
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

const EQ_COLORS = ['#30C0B7','#FD8083','#a78bfa','#f59e0b','#34d399','#60a5fa'];

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
        borderBottom:'1px solid rgba(255,255,255,.08)',padding:'12px 14px',
        display:'flex',alignItems:'center',gap:10,zIndex:1}}>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,.12)',
          background:'rgba(255,255,255,.05)',color:'var(--tx)',cursor:'pointer',fontSize:18,
          display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:15,fontWeight:400,color:'var(--tx)'}}>
          {tut.titulo}
        </div>
      </div>
      <div style={{padding:'20px 16px',maxWidth:600,margin:'0 auto'}}>
        {lines.map((line,i) => {
          if(line.startsWith('# ')) return (
            <div key={i} style={{fontFamily:"'Special Gothic Expanded One',sans-serif",
              fontSize:20,fontWeight:400,color:'var(--ac)',marginBottom:16,marginTop:i?24:0,lineHeight:1.2}}>
              {line.slice(2)}
            </div>
          );
          if(line.startsWith('## ')) return (
            <div key={i} style={{fontFamily:"'Lexend Giga',sans-serif",
              fontSize:12,fontWeight:700,color:'var(--tx)',marginBottom:8,marginTop:20,
              textTransform:'uppercase',letterSpacing:'1px'}}>
              {line.slice(3)}
            </div>
          );
          if(line.startsWith('**')&&line.endsWith('**')) return (
            <div key={i} style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:700,
              color:'var(--tx)',marginBottom:4,marginTop:10}}>
              {line.slice(2,-2)}
            </div>
          );
          if(line.startsWith('- ')) return (
            <div key={i} style={{display:'flex',gap:8,marginBottom:4}}>
              <span style={{color:'var(--ac)',flexShrink:0,marginTop:2}}>·</span>
              <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,
                color:'var(--tx2)',lineHeight:1.7}}>{line.slice(2)}</span>
            </div>
          );
          if(line.startsWith('```')||line==='\`\`\`') return null;
          if(line.trim()==='') return <div key={i} style={{height:6}}/>;
          return (
            <div key={i} style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,
              color:'var(--tx2)',lineHeight:1.8,marginBottom:4}}>{line}</div>
          );
        })}
      </div>
    </div>
  );
}

// ── Notas ─────────────────────────────────────────────────────────────────
function NotasPage({notas,onClose,onDelete,onCreate}) {
  return (
    <div style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:200,overflowY:'auto',paddingBottom:80}}>
      <div style={{position:'sticky',top:0,background:'rgba(8,8,9,.97)',
        borderBottom:'1px solid rgba(255,255,255,.08)',padding:'12px 14px',
        display:'flex',alignItems:'center',gap:10,zIndex:1}}>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,.12)',
          background:'rgba(255,255,255,.05)',color:'var(--tx)',cursor:'pointer',fontSize:18,
          display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
        <div style={{flex:1,fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:15,fontWeight:400}}>
          Ideas & Notas
        </div>
        <button onClick={onCreate}
          style={{padding:'6px 14px',borderRadius:8,border:'none',background:'var(--ac)',
            color:'#000',cursor:'pointer',fontSize:10,fontWeight:700,
            fontFamily:"'Lexend Giga',sans-serif"}}>+ Nueva</button>
      </div>
      <div style={{padding:'14px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        {notas.length===0?(
          <div style={{gridColumn:'span 3',textAlign:'center',padding:'40px 0',
            fontFamily:"'Lexend Giga',sans-serif",fontSize:12,color:'var(--tx3)'}}>
            Aún no hay notas
          </div>
        ):notas.map((n,i)=>(
          <div key={i} style={{padding:'12px 10px',borderRadius:12,
            background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',
            cursor:'pointer',position:'relative'}}>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:700,
              color:'var(--tx)',marginBottom:4,lineHeight:1.3,
              overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
              {n.texto.slice(0,40)||(n.texto.trim().split(/\n/)[0])||'Sin título'}
            </div>
            <div style={{fontSize:8,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
              {n.fecha}
            </div>
            <button onClick={e=>{e.stopPropagation();onDelete(i);}}
              style={{position:'absolute',top:6,right:6,width:18,height:18,borderRadius:4,
                border:'none',background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:12,
                display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotasBlock() {
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
      {verTodas&&<NotasPage notas={notas} onClose={()=>setVerTodas(false)}
        onDelete={borrar} onCreate={()=>{setVerTodas(false);setEditando(true);}}/>}
      <div style={{background:'var(--s1)',borderRadius:'var(--rad-lg)',padding:'var(--sp-md)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <Lbl2>Ideas & Notas</Lbl2>
          <div style={{display:'flex',gap:8}}>
            {notas.length>0&&(
              <button onClick={()=>setVerTodas(true)}
                style={{fontSize:9,fontWeight:700,color:'var(--tx3)',background:'none',
                  border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                Ver todas ({notas.length})
              </button>
            )}
            <button onClick={()=>editando?guardar():setEditando(true)}
              style={{fontSize:9,fontWeight:700,color:editando?'var(--ac)':'var(--tx3)',
                background:'none',border:'none',cursor:'pointer',
                fontFamily:"'Lexend Giga',sans-serif"}}>
              {editando?'Guardar':'+ Nueva'}
            </button>
          </div>
        </div>
        {editando ? (
          <textarea value={texto} onChange={e=>setTexto(e.target.value)}
            autoFocus
            placeholder="Escribe tu idea, nota o pendiente..."
            style={{width:'100%',minHeight:72,background:'rgba(255,255,255,.04)',
              border:'1px solid rgba(255,255,255,.12)',borderRadius:8,
              color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif",fontSize:11,
              fontWeight:300,lineHeight:1.7,padding:'8px 10px',resize:'none',outline:'none',
              boxSizing:'border-box'}}/>
        ) : ultima ? (
          <div onClick={()=>setEditando(true)} style={{cursor:'pointer'}}>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,
              color:'var(--tx2)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>
              {ultima.texto.length>120?ultima.texto.slice(0,120)+'…':ultima.texto}
            </div>
            <div style={{fontSize:8,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",marginTop:5}}>
              {ultima.fecha}
            </div>
          </div>
        ) : (
          <div onClick={()=>setEditando(true)}
            style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,
              color:'var(--tx3)',lineHeight:1.7,cursor:'pointer',minHeight:36,
              display:'flex',alignItems:'center'}}>
            Toca para agregar una nota...
          </div>
        )}
      </div>
    </>
  );
}

// Helper Lbl para NotasBlock (no usa la prop color)
const Lbl2 = ({children}) => (
  <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
    letterSpacing:'1.5px',fontFamily:"'Lexend Giga',sans-serif"}}>{children}</div>
);

export function Inicio({ mode, lang='es', userRole='superadmin', equipos=[], personas=[], eventos=[], planActivo=null, planId='lite', tieneMonitoreo=false, onNavigate=()=>{} }) {
  const feat = getModoFeatures(mode);
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
  const planLabel = {lite:'Lite',pro:'Pro',premium:'Premium'}[planId]||planId;

  // Bloques con orden arrastrable (por filas de 2)
  // Cada "row" es un índice de bloque
  const BLOCK_ROWS = [
    ['proximo'],
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
      background:'var(--s1)',borderRadius:'var(--rad-lg)',
      padding:'var(--sp-md)',cursor:onClick?'pointer':'default',
      gridColumn:`span ${cols}`,transition:'background .15s',...style,
    }}
    onPointerEnter={onClick?e=>e.currentTarget.style.background='var(--s3)':undefined}
    onPointerLeave={onClick?e=>e.currentTarget.style.background='var(--s1)':undefined}
    >{children}</div>
  );

  const Lbl = ({children}) => (
    <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
      letterSpacing:'1.5px',fontFamily:"'Lexend Giga',sans-serif",marginBottom:8}}>{children}</div>
  );

  const toggleFaq = i => setFaqsOpen(v=>({...v,[i]:!v[i]}));

  // Renderizar cada bloque por key
  const renderBlock = (key) => {
    switch(key) {

      case 'proximo': return (
        <Card cols={2} onClick={()=>onNavigate('fechas')} key="proximo">
          <Lbl>{mode==='iglesia'?'Próxima fecha':'Próximo show'}</Lbl>
          {proximoEvento ? (<>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:18,
              color:'var(--tx)',marginBottom:4,lineHeight:1.1,fontWeight:400}}>
              {proximoEvento.nombre}
            </div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,color:'var(--tx3)',fontWeight:300}}>
              {new Date(proximoEvento.fecha).toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}
              {(proximoEvento.setlist||[]).length>0&&` · ${proximoEvento.setlist.length} canciones`}
            </div>
          </>) : (
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,color:'var(--tx3)',fontWeight:300}}>
              Sin fechas próximas —{' '}
              <span style={{color:'var(--ac)',cursor:'pointer'}}
                onClick={e=>{e.stopPropagation();onNavigate('backstage');}}>crear una</span>
            </div>
          )}
        </Card>
      );

      case 'equipo': return (
        <Card cols={2} key="equipo">
          <Lbl>Mi equipo</Lbl>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {[
              {label:'Personas',val:personas.length,color:'var(--ac)',onClick:()=>onNavigate('backstage')},
              {label:'Equipos',val:misEquipos.length,color:'var(--gn)',onClick:()=>onNavigate('backstage')},
              {label:'Líderes',val:equipos.filter(e=>e.lider).length,color:'#a78bfa',onClick:()=>onNavigate('backstage')},
            ].map(({label,val,color,onClick})=>(
              <div key={label} onClick={onClick}
                style={{textAlign:'center',padding:'10px 8px',borderRadius:12,
                  background:'rgba(255,255,255,.04)',cursor:'pointer',
                  border:'1px solid rgba(255,255,255,.06)'}}>
                <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",
                  fontSize:28,color,lineHeight:1,fontWeight:400}}>{val}</div>
                <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:9,
                  color:'var(--tx3)',fontWeight:700,marginTop:4,textTransform:'uppercase',
                  letterSpacing:'1px'}}>{label}</div>
              </div>
            ))}
          </div>
        </Card>
      );

      case 'cancionero': return (
        <Card onClick={()=>onNavigate('repertorio')} key="cancionero">
          <Lbl>Cancionero</Lbl>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:32,
            color:'var(--ac)',lineHeight:1,fontWeight:400}}>{CANCIONES.length}</div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)',
            fontWeight:300,marginTop:4}}>canciones</div>
          {feat.cancioneroUniversal&&(
            <div style={{fontSize:9,color:'var(--gn)',fontFamily:"'Lexend Giga',sans-serif",
              fontWeight:700,marginTop:6}}>+ Universal ✓</div>
          )}
        </Card>
      );

      case 'plan': return (
        <Card onClick={()=>onNavigate('backstage')} key="plan">
          <Lbl>Mi plan</Lbl>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:26,
            color:'var(--ac)',lineHeight:1,fontWeight:400}}>{planLabel}</div>
          {planId==='lite'&&(
            <div style={{fontSize:9,color:'var(--gn)',fontFamily:"'Lexend Giga',sans-serif",
              fontWeight:700,marginTop:8}}>↑ Mejorar</div>
          )}
        </Card>
      );

      case 'notas': return (
        <div key="notas" style={{gridColumn:'span 2'}}>
          <NotasBlock/>
        </div>
      );

      case 'tutoriales': return (
        <Card cols={2} key="tutoriales">
          <Lbl>Tutoriales</Lbl>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {TUTORIALES.map(tut=>(
              <div key={tut.slug}
                onClick={()=>setTutorialActivo(tut)}
                style={{padding:'12px 10px',borderRadius:12,cursor:'pointer',
                  background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',
                  display:'flex',flexDirection:'column',gap:6,transition:'background .15s'}}
                onPointerEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.08)'}
                onPointerLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'}>
                <div style={{fontSize:18}}>{tut.icon}</div>
                <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:700,
                  color:'var(--tx)',lineHeight:1.3}}>{tut.titulo}</div>
                <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,
                  color:'var(--tx3)',lineHeight:1.5}}>{tut.resumen}</div>
                <div style={{fontSize:9,color:'var(--ac)',fontWeight:700,
                  fontFamily:"'Lexend Giga',sans-serif",marginTop:2}}>Ver más →</div>
              </div>
            ))}
          </div>
        </Card>
      );

      case 'faqs': return (
        <Card cols={2} key="faqs">
          <Lbl>Preguntas frecuentes</Lbl>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {FAQS.map((faq,i)=>(
              <div key={i} style={{borderBottom:i<FAQS.length-1?'1px solid rgba(255,255,255,.05)':'none'}}>
                <button onClick={()=>toggleFaq(i)}
                  style={{width:'100%',background:'none',border:'none',textAlign:'left',
                    padding:'10px 0',cursor:'pointer',display:'flex',alignItems:'center',
                    justifyContent:'space-between',gap:8}}>
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:700,
                    color:'var(--tx)',lineHeight:1.4}}>{faq.q}</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)"
                    strokeWidth="2" style={{flexShrink:0,transform:faqsOpen[i]?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {faqsOpen[i]&&(
                  <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,color:'var(--tx2)',
                    fontWeight:300,lineHeight:1.7,paddingBottom:10}}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      );

      case 'planes': return (
        <Card cols={2} key="planes">
          <Lbl>Planes SetSync</Lbl>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:4}}>
            {[
              {name:'Lite',price:'Gratis',color:'var(--tx3)',sub:'Para empezar',
                features:['1 equipo · 5 miembros','10 canciones','Setlists básicos']},
              {name:'Pro',price:'$7.90',period:'/mes',color:'var(--gn)',sub:'El más popular',
                features:['Equipos ilimitados','Cancionero completo','Monitoreo OSC','Secuencias & Click']},
              {name:'Premium',price:'$19.90',period:'/mes',color:'var(--ac)',sub:'Producción pro',
                features:['Todo en Pro +','Multitracks','Partituras','Multi-banda']},
            ].map(p=>(
              <div key={p.name} style={{padding:'10px 8px',borderRadius:12,
                border:`1px solid ${p.color}30`,background:`${p.color}08`,
                display:'flex',flexDirection:'column',gap:4}}>
                <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",
                  fontSize:13,color:p.color,fontWeight:400,marginBottom:2}}>{p.name}</div>
                {p.sub&&<div style={{fontSize:8,color:p.color,fontFamily:"'Lexend Giga',sans-serif",
                  fontWeight:700,opacity:.7,marginBottom:4,textTransform:'uppercase',
                  letterSpacing:'1px'}}>{p.sub}</div>}
                <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",
                  fontSize:18,color:'var(--tx)',lineHeight:1}}>{p.price}</div>
                {p.period&&<div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:9,
                  color:'var(--tx3)',marginBottom:4}}>{p.period}</div>}
                {p.features.map(f=>(
                  <div key={f} style={{display:'flex',alignItems:'flex-start',gap:5}}>
                    <span style={{color:p.color,fontSize:8,marginTop:2,flexShrink:0}}>✓</span>
                    <span style={{fontSize:9,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",
                      fontWeight:300,lineHeight:1.4}}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{marginTop:10,textAlign:'center'}}>
            <span style={{fontSize:10,color:'var(--gn)',fontWeight:700,cursor:'pointer',
              fontFamily:"'Lexend Giga',sans-serif"}} onClick={()=>onNavigate('backstage')}>
              Ver planes completos →
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
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,
            fontSize:26,color:'#fff',lineHeight:1.1}}>
            Hola <span style={{color:'var(--ac)'}}>{nombre}</span>
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:10,
            color:'rgba(255,255,255,.45)',marginTop:4}}>
            SetSync · {mode==='iglesia'?'Tu plataforma de worship profesional':'Tu plataforma para bandas en vivo'}
          </div>
        </div>
      </div>

      {/* Grid con bloques arrastrables */}
      <div style={{padding:'var(--sp-md) var(--pw-x,var(--sp-md))'}}>
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
      </div>
    </div>
  );
}
