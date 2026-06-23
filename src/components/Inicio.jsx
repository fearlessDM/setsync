import { useState, useRef } from 'react';
import { getModoFeatures } from '../data/modo';

// Imágenes de Unsplash — instrumentos, maderas, metales, atriles, micrófonos
const BG_IMGS = [
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800&q=80', // guitar close
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80', // music studio
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80', // piano keys
];

const TIPS = [
  { icon:'🎛️', titulo:'Conectar Monitoreo con tu mesa', cuerpo:'SetSync puede enviar comandos a una Behringer o Midas X32/M32 en tiempo real via OSC/WebSocket. Próximamente en Configuración → Monitoreo.' },
  { icon:'🎵', titulo:'Cancionero Universal', cuerpo:'Accede a canciones compartidas por otras iglesias de la comunidad. Acordes, cifrado Nashville y transporte automático. Ve a Cancionero → Universal.' },
  { icon:'📅', titulo:'Crear y asignar un setlist', cuerpo:'Backstage → Crear setlist, elegí las canciones, asignalo a un evento y tu equipo lo verá automáticamente en Próxima Fecha.' },
  { icon:'🔔', titulo:'Notificar al equipo', cuerpo:'Desde Backstage → Notificaciones podés avisar a todo el equipo o a una formación específica.' },
  { icon:'🎹', titulo:'Pads ambientales automáticos', cuerpo:'En Vista Escenario (Pro/Premium), el pad ambiental se afina solo a la tonalidad de la canción activa.' },
];

export function Inicio({ mode, lang='es', userRole='superadmin', equipos=[], personas=[], eventos=[], planActivo=null, planId='lite', tienePremiere=false, tieneMonitoreo=false, onNavigate=()=>{} }){
  const feat = getModoFeatures(mode);
  const [tipIdx, setTipIdx] = useState(0);
  const [bgIdx] = useState(()=>Math.floor(Math.random()*BG_IMGS.length));
  const tipsRef = useRef(null);
  const isAdmin = userRole==='superadmin'||userRole==='leader';
  const nombre = 'Daniel';

  const hoy = new Date();
  const proximoEvento = eventos.filter(e=>e.fecha&&new Date(e.fecha)>=hoy).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha))[0]||null;
  const misEquipos = equipos.filter(eq=>(eq.miembros||[]).length>0);

  const swipeTip = (dir) => setTipIdx(i=>(i+dir+TIPS.length)%TIPS.length);

  // Touch swipe for tips
  const touchStart = useRef(null);
  const onTouchStart = e => touchStart.current = e.touches[0].clientX;
  const onTouchEnd = e => {
    if(!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if(Math.abs(dx)>40) swipeTip(dx<0?1:-1);
    touchStart.current = null;
  };

  const G = ({children, cols=1, onClick}) => (
    <div onClick={onClick} style={{
      background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:18,padding:'16px 15px',
      cursor:onClick?'pointer':'default',gridColumn:`span ${cols}`,
      transition:'border-color .2s',
    }}>{children}</div>
  );

  const Lbl = ({children}) => (
    <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
      letterSpacing:'1.5px',marginBottom:8,fontFamily:"'Lexend Giga',sans-serif"}}>{children}</div>
  );

  return (
    <div style={{paddingBottom:90}}>

      {/* ── Hero con imagen de fondo ───────────────────────────── */}
      <div style={{position:'relative',height:200,overflow:'hidden',marginBottom:0}}>
        <img src={BG_IMGS[bgIdx]} alt="" style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.35) saturate(.8)'}} loading="lazy"/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 30%,var(--bg) 100%)'}}/>
        <div style={{position:'absolute',inset:0,padding:'20px 16px',display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'#fff',lineHeight:1.05}}>
            Hola, <span style={{color:'var(--ac)'}}>{nombre}</span>
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'rgba(255,255,255,.6)',marginTop:4}}>
            {mode==='iglesia'?'Tu plataforma de worship':'Tu plataforma de banda'} · SetSync
          </div>
        </div>
      </div>

      {/* ── Descripción breve ────────────────────────────────────── */}
      <div style={{padding:'16px 16px 4px'}}>
        <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx2)',lineHeight:1.7,
          padding:'12px 14px',background:'var(--s1)',borderRadius:14,border:'1px solid var(--bd)'}}>
          SetSync centraliza setlists, equipos, repertorio y la experiencia en escenario de tu{' '}
          {mode==='iglesia'?'equipo de adoración':'banda'} — todo en un solo lugar, en tiempo real.
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,padding:'12px 16px'}}>

        {/* Próxima fecha */}
        <G cols={2} onClick={()=>onNavigate('fechas')}>
          <Lbl>{mode==='iglesia'?'Próxima fecha':'Próximo show'}</Lbl>
          {proximoEvento ? (
            <>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:16,color:'var(--tx)',marginBottom:3}}>{proximoEvento.nombre}</div>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,color:'var(--tx3)'}}>
                {new Date(proximoEvento.fecha).toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}
                {(proximoEvento.setlist||[]).length>0&&` · ${proximoEvento.setlist.length} canciones`}
              </div>
            </>
          ) : (
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,color:'var(--tx3)'}}>
              No hay fechas próximas —{' '}
              <span style={{color:'var(--ac)',cursor:'pointer'}} onClick={e=>{e.stopPropagation();onNavigate('backstage');}}>crear una</span>
            </div>
          )}
        </G>

        {/* Mis equipos */}
        <G cols={2} onClick={()=>onNavigate('backstage')}>
          <Lbl>{isAdmin?'Mis formaciones':'Soy parte de'}</Lbl>
          {misEquipos.length===0 ? (
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,color:'var(--tx3)'}}>
              {isAdmin?'Aún no creaste ninguna formación.':'No estás asignado a ningún equipo aún.'}
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {misEquipos.slice(0,3).map(eq=>(
                <div key={eq.id} style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:700,color:'var(--tx)',flex:1}}>{eq.name}</span>
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)'}}>{(eq.miembros||[]).length}p</span>
                </div>
              ))}
              {misEquipos.length>3&&<div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>+{misEquipos.length-3} más</div>}
            </div>
          )}
        </G>

        {/* Plan */}
        <G onClick={()=>onNavigate('backstage')}>
          <Lbl>Mi plan</Lbl>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:20,color:'var(--ac)',textTransform:'capitalize'}}>{planId}</div>
          {planActivo&&<div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)',marginTop:4}}>{planActivo.limiteCanciones} canciones</div>}
          {planId==='lite'&&<div style={{fontSize:10,color:'var(--gn)',fontFamily:"'Lexend Giga',sans-serif",marginTop:6,fontWeight:700}}>↑ Mejorar plan</div>}
        </G>

        {/* Cancionero */}
        <G onClick={()=>onNavigate('repertorio')}>
          <Lbl>Cancionero</Lbl>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:16,color:'var(--tx)'}}>Repertorio</div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)',marginTop:4}}>
            {feat.cancioneroUniversal?'+ Universal disponible':'Tus canciones'}
          </div>
        </G>

        {/* Tips — swipeable */}
        <G cols={2}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <Lbl>Tips de uso</Lbl>
            <div style={{display:'flex',gap:4}}>
              {TIPS.map((_,i)=>(
                <div key={i} onClick={()=>setTipIdx(i)} style={{width:i===tipIdx?16:6,height:6,borderRadius:3,cursor:'pointer',background:i===tipIdx?'var(--ac)':'var(--bd)',transition:'all .2s'}}/>
              ))}
            </div>
          </div>
          <div style={{overflow:'hidden'}}
            onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div style={{display:'flex',gap:20,fontSize:20,marginBottom:8}}>{TIPS[tipIdx].icon}</div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,fontSize:13,color:'var(--tx)',marginBottom:6}}>{TIPS[tipIdx].titulo}</div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx2)',lineHeight:1.6}}>{TIPS[tipIdx].cuerpo}</div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:12}}>
              <button onClick={()=>swipeTip(-1)} style={{fontSize:10,fontWeight:700,color:'var(--tx3)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>← Anterior</button>
              <button onClick={()=>swipeTip(1)} style={{fontSize:10,fontWeight:700,color:'var(--tx3)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>Siguiente →</button>
            </div>
          </div>
        </G>

        {/* SetSync Premiere */}
        <G cols={2} onClick={tienePremiere?()=>onNavigate('premiere'):undefined}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <span style={{fontSize:18}}>★</span>
            <Lbl>SetSync Premiere</Lbl>
            {!tienePremiere&&<span style={{marginLeft:'auto',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:100,background:'rgba(200,169,126,.1)',color:'var(--ac)',border:'1px solid rgba(200,169,126,.3)',fontFamily:"'Lexend Giga',sans-serif"}}>PRO/PREMIUM</span>}
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx2)',lineHeight:1.6}}>
            Canciones de bandas de adoración antes que nadie. Acordes, letra y audio desde el día de estreno — disponible para clientes Pro y Premium.
          </div>
          {tienePremiere&&<div style={{marginTop:8,fontSize:11,fontWeight:700,color:'var(--ac)',fontFamily:"'Lexend Giga',sans-serif"}}>Ver estrenos →</div>}
        </G>

        {/* Monitoreo */}
        {tieneMonitoreo&&(
          <G cols={2} onClick={()=>onNavigate('monitoreo')}>
            <Lbl>Monitoreo en vivo</Lbl>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx2)',lineHeight:1.6}}>
              Controlá los niveles de tu mesa Behringer/Midas X32 o M32 directo desde SetSync. Disponible dentro de cualquier canción en Vista Escenario.
            </div>
            <div style={{marginTop:8,fontSize:11,fontWeight:700,color:'var(--gn)',fontFamily:"'Lexend Giga',sans-serif"}}>Abrir Monitoreo →</div>
          </G>
        )}

        {/* Accesos rápidos */}
        <G cols={2}>
          <Lbl>Accesos rápidos</Lbl>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {[
              {label:'Ver fechas',view:'fechas'},
              {label:'Próxima fecha',view:'misetlist'},
              {label:'Cancionero',view:'repertorio'},
              {label:'Backstage',view:'backstage'},
            ].map(a=>(
              <button key={a.label} onClick={()=>onNavigate(a.view)}
                style={{padding:'7px 14px',borderRadius:100,fontSize:11,fontWeight:700,
                  border:'1px solid var(--bd)',background:'var(--s2)',color:'var(--tx)',
                  cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                {a.label}
              </button>
            ))}
          </div>
        </G>

      </div>
    </div>
  );
}
