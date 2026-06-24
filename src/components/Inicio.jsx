import React, { useState, useRef } from 'react';
import { getModoFeatures } from '../data/modo';

// Imágenes por modo — iglesia: escenarios de worship / banda: palcos y ensayos
const BG_IMGS_IGLESIA = [
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80', // crowd hands raised worship
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', // concert stage backlit
  'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80', // worship stage lights
];
const BG_IMGS_BANDA = [
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80',
];

const TIPS = [
  { icon:'🎛️', titulo:'Conectar Monitoreo con tu mesa', cuerpo:'SetSync puede enviar comandos a una Behringer o Midas X32/M32 en tiempo real via OSC/WebSocket. Próximamente en Configuración → Monitoreo.' },
  { icon:'🎵', titulo:'Cancionero Universal', cuerpo:'Accede a canciones compartidas por otras iglesias de la comunidad. Acordes, cifrado Nashville y transporte automático. Ve a Cancionero → Universal.' },
  { icon:'📅', titulo:'Crear y asignar un setlist', cuerpo:'Backstage → Crear setlist, elegí las canciones, asignalo a un evento y tu equipo lo verá automáticamente en Próxima Fecha.' },
  { icon:'🔔', titulo:'Notificar al equipo', cuerpo:'Desde Backstage → Notificaciones podés avisar a todo el equipo o a una formación específica.' },
  { icon:'🎹', titulo:'Pads ambientales automáticos', cuerpo:'En Vista Escenario (Pro/Premium), el pad ambiental se afina solo a la tonalidad de la canción activa.' },
];

// Colores por formación (cycling)
const EQ_COLORS = ['#30C0B7','#FD8083','#a78bfa','#f59e0b','#34d399','#60a5fa'];

export function Inicio({ mode, lang='es', userRole='superadmin', equipos=[], personas=[], eventos=[], planActivo=null, planId='lite', tieneMonitoreo=false, onNavigate=()=>{} }){
  const feat = getModoFeatures(mode);
  const [tipIdx, setTipIdx] = useState(0);
  const BG_IMGS = mode==='iglesia' ? BG_IMGS_IGLESIA : BG_IMGS_BANDA;
  const [bgIdx] = useState(()=>Math.floor(Math.random()*3));
  const isAdmin = userRole==='superadmin'||userRole==='leader';
  const nombre = 'Daniel';

  const hoy = new Date();
  const proximoEvento = eventos.filter(e=>e.fecha&&new Date(e.fecha)>=hoy).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha))[0]||null;
  const misEquipos = equipos.filter(eq=>(eq.miembros||[]).length>0);

  const swipeTip = (dir) => setTipIdx(i=>(i+dir+TIPS.length)%TIPS.length);
  const touchStart = useRef(null);
  const onTouchStart = e => touchStart.current = e.touches[0].clientX;
  const onTouchEnd = e => {
    if(!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if(Math.abs(dx)>40) swipeTip(dx<0?1:-1);
    touchStart.current = null;
  };

  // Card base con tokens CSS
  const Card = ({children, cols=1, onClick, style={}}) => (
    <div
      onClick={onClick}
      style={{
        background:'var(--s1)',
        border:'1px solid var(--bd)',
        borderRadius:'var(--rad-lg)',
        padding:'var(--sp-md) var(--sp-md)',
        cursor:onClick?'pointer':'default',
        gridColumn:`span ${cols}`,
        transition:'border-color .2s, background .15s',
        ...style,
      }}
      onMouseEnter={onClick?e=>{e.currentTarget.style.borderColor='var(--bd2)';e.currentTarget.style.background='var(--s3)'}:undefined}
      onMouseLeave={onClick?e=>{e.currentTarget.style.borderColor='var(--bd)';e.currentTarget.style.background='var(--s1)'}:undefined}
    >{children}</div>
  );

  const Lbl = ({children, color}) => (
    <div className="lbl" style={{marginBottom:'var(--sp-xs)',color:color||'var(--tx3)'}}>{children}</div>
  );

  const planLabel = { lite:'Lite', pro:'Pro', premium:'Premium' }[planId] || planId;

  return (
    <div style={{paddingBottom:90}}>

      {/* ── Hero ── */}
      <div style={{position:'relative',height:210,overflow:'hidden',marginBottom:0}}>
        <img
          src={BG_IMGS[bgIdx % BG_IMGS.length]} alt=""
          style={{width:'100%',height:'100%',objectFit:'cover',filter:'brightness(.3) saturate(.7)'}}
          loading="lazy"
        />
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 20%,var(--bg) 100%)'}}/>
        <div style={{position:'absolute',inset:0,padding:'var(--sp-lg) var(--sp-md)',display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'#fff',lineHeight:1.1}}>
            Hola, <span style={{color:'var(--ac)'}}>{nombre}</span>
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'rgba(255,255,255,.55)',marginTop:5}}>
            {mode==='iglesia'?'Tu plataforma de worship':'Tu plataforma de banda'} · SetSync
          </div>
        </div>
      </div>

      {/* ── Grid principal ── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'1fr 1fr',
        gap:'var(--gap)',
        padding:'var(--sp-md) var(--pw-x,var(--sp-md))',
      }}>

        {/* ── Hero marketing — primera impresión ── */}
        <Card cols={2}>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,fontSize:13,color:'var(--ac)',marginBottom:8,letterSpacing:'.3px'}}>
            Todo lo que necesitas, en una sola pantalla.
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx2)',lineHeight:1.9}}>
            SetSync es tu centro de operaciones para tocar en vivo — letras, acordes, monitoreo en tiempo real, click y secuencias sincronizadas. Gestiona equipos, crea setlists, convoca músicos y lleva el control de cada fecha desde el backstage hasta el escenario.
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:12}}>
            {['🎛 Monitoreo OSC','🎵 Setlists','📅 Fechas','🎹 Secuencias','👥 Equipos','📜 Letras & Acordes','💬 Chat de equipo'].map(t=>(
              <span key={t} style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:'var(--rad-full)',background:'rgba(255,255,255,.06)',border:'1px solid var(--bd)',color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>{t}</span>
            ))}
          </div>
        </Card>

        {/* Próxima fecha — full width */}
        <Card cols={2} onClick={()=>onNavigate('fechas')}>
          <Lbl color="var(--ac)">{mode==='iglesia'?'Próxima fecha':'Próximo show'}</Lbl>
          {proximoEvento ? (
            <>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:17,color:'var(--tx)',marginBottom:4,lineHeight:1.1}}>
                {proximoEvento.nombre}
              </div>
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
        </Card>

        {/* Plan */}
        <Card onClick={()=>onNavigate('backstage')}>
          <Lbl color="var(--ac)">Mi plan</Lbl>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:22,color:'var(--ac)',lineHeight:1}}>
            {planLabel}
          </div>
          {planActivo&&<div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)',marginTop:5}}>{planActivo.limiteCanciones} canciones</div>}
          {planId==='lite'&&(
            <div style={{fontSize:10,color:'var(--gn)',fontFamily:"'Lexend Giga',sans-serif",marginTop:7,fontWeight:700}}>
              ↑ Mejorar plan
            </div>
          )}
        </Card>

        {/* Cancionero */}
        <Card onClick={()=>onNavigate('repertorio')}>
          <Lbl color="var(--ac)">Cancionero</Lbl>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:17,color:'var(--tx)',lineHeight:1.1}}>
            Repertorio
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)',marginTop:5}}>
            {feat.cancioneroUniversal?'+ Universal disponible':'Tus canciones'}
          </div>
        </Card>

        {/* Mis equipos — full width */}
        <Card cols={2} onClick={()=>onNavigate('backstage')}>
          <Lbl>{isAdmin?'Mis equipos':'Soy parte de'}</Lbl>
          {misEquipos.length===0 ? (
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,color:'var(--tx3)'}}>
              {isAdmin?'Aún no creaste ninguna formación — ':<>No estás asignado a ningún equipo aún</>}
              {isAdmin&&<span style={{color:'var(--ac)',cursor:'pointer'}} onClick={e=>{e.stopPropagation();onNavigate('backstage');}}>crear una</span>}
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'var(--sp-xs)'}}>
              {misEquipos.slice(0,4).map((eq,i)=>(
                <div key={eq.id} style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:eq.color||EQ_COLORS[i%EQ_COLORS.length],flexShrink:0}}/>
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:700,color:'var(--tx)',flex:1}}>{eq.name}</span>
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)'}}>
                    {(eq.miembros||[]).length} {(eq.miembros||[]).length===1?'persona':'personas'}
                  </span>
                </div>
              ))}
              {misEquipos.length>4&&(
                <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
                  +{misEquipos.length-4} equipos más
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Tips swipeables — full width */}
        <Card cols={2}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--sp-sm)'}}>
            <Lbl color="var(--tx3)">Tips de uso</Lbl>
            <div style={{display:'flex',gap:5}}>
              {TIPS.map((_,i)=>(
                <div
                  key={i}
                  onClick={()=>setTipIdx(i)}
                  style={{
                    width:i===tipIdx?18:6,height:6,borderRadius:3,cursor:'pointer',
                    background:i===tipIdx?'var(--ac)':'var(--bd)',transition:'all .25s',
                  }}
                />
              ))}
            </div>
          </div>
          <div
            style={{overflow:'hidden'}}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div style={{fontSize:22,marginBottom:'var(--sp-xs)'}}>{TIPS[tipIdx].icon}</div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,fontSize:13,color:'var(--tx)',marginBottom:6,lineHeight:1.3}}>
              {TIPS[tipIdx].titulo}
            </div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx2)',lineHeight:1.7}}>
              {TIPS[tipIdx].cuerpo}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:'var(--sp-sm)'}}>
              <button onClick={()=>swipeTip(-1)} style={{fontSize:10,fontWeight:700,color:'var(--tx3)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>← Anterior</button>
              <button onClick={()=>swipeTip(1)} style={{fontSize:10,fontWeight:700,color:'var(--tx3)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>Siguiente →</button>
            </div>
          </div>
        </Card>
{/* Monitoreo — solo si tiene acceso */}
        {tieneMonitoreo&&(
          <Card cols={2} onClick={()=>onNavigate('monitoreo')}>
            <div style={{display:'flex',alignItems:'center',gap:'var(--sp-xs)',marginBottom:'var(--sp-xs)'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--gn)',boxShadow:'0 0 8px var(--gn)'}}/>
              <Lbl>Monitoreo en vivo</Lbl>
            </div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx2)',lineHeight:1.7}}>
              Controlá los niveles de tu mesa Behringer/Midas X32 o M32 directo desde SetSync.
            </div>
            <div style={{marginTop:'var(--sp-xs)',fontSize:11,fontWeight:700,color:'var(--gn)',fontFamily:"'Lexend Giga',sans-serif"}}>
              Abrir Monitoreo →
            </div>
          </Card>
        )}

        {/* Accesos rápidos */}
        <Card cols={2}>
          <Lbl color="var(--ac)">Accesos rápidos</Lbl>
          <div style={{display:'flex',flexWrap:'wrap',gap:'var(--sp-xs)'}}>
            {[
              {label:'Ver fechas',view:'fechas'},
              {label:'Próxima fecha',view:'misetlist'},
              {label:'Cancionero',view:'repertorio'},
              {label:'Backstage',view:'backstage'},
            ].map(a=>(
              <button
                key={a.label}
                onClick={()=>onNavigate(a.view)}
                style={{
                  padding:'7px 15px',borderRadius:'var(--rad-full)',
                  fontSize:11,fontWeight:700,
                  border:'1px solid var(--bd)',background:'var(--s2)',
                  color:'var(--tx)',cursor:'pointer',
                  fontFamily:"'Lexend Giga',sans-serif",
                  transition:'all .15s',
                }}
                onMouseEnter={e=>{e.target.style.background='var(--s3)';e.target.style.borderColor='var(--bd2)';}}
                onMouseLeave={e=>{e.target.style.background='var(--s2)';e.target.style.borderColor='var(--bd)';}}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Card>

        {/* ── Planes ── */}
        <Card cols={2}>
          <Lbl color="var(--ac)">Planes SetSync</Lbl>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:4}}>
            {[
              {name:'Lite',price:'Gratis',color:'var(--tx3)',features:['1 equipo','10 canciones','Setlists básicos']},
              {name:'Pro',price:'$7.90/mo',color:'var(--gn)',features:['Equipos ilimitados','Cancionero completo','Monitoreo OSC','Notificaciones']},
              {name:'Premium',price:'$19.90/mo',color:'var(--ac)',features:['Todo Pro +','Secuencias','Multitracks','Soporte prioritario']},
            ].map(p=>(
              <div key={p.name} style={{padding:'10px 8px',borderRadius:12,border:`1px solid ${p.color}30`,background:`${p.color}08`,display:'flex',flexDirection:'column',gap:4}}>
                <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:15,color:p.color,fontWeight:400}}>{p.name}</div>
                <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:700,color:'var(--tx)',marginBottom:4}}>{p.price}</div>
                {p.features.map(f=>(
                  <div key={f} style={{display:'flex',alignItems:'flex-start',gap:5}}>
                    <span style={{color:p.color,fontSize:8,marginTop:2,flexShrink:0}}>✓</span>
                    <span style={{fontSize:9,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.4}}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{marginTop:10,textAlign:'center'}}>
            <span style={{fontSize:10,color:'var(--gn)',fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}} onClick={()=>onNavigate('backstage')}>
              Ver planes completos y mejorar →
            </span>
          </div>
        </Card>

        {/* ── FAQ / Tutoriales ── */}
        <Card cols={2}>
          <Lbl color="var(--ac)">Tutoriales & Preguntas frecuentes</Lbl>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {[
              {q:'¿Cómo creo mi primer setlist?',a:'Ve a Backstage → Crear setlist. Agrega canciones y asígnalo a una fecha.'},
              {q:'¿Cómo funciona el Monitoreo?',a:'Conecta tu mesa X32/M32 a la misma red WiFi. En Vista Escenario → Monitor activa la conexión OSC.'},
              {q:'¿Puedo usar SetSync sin internet?',a:'Sí, en modo offline. Los cambios se sincronizan automáticamente cuando vuelves a conectarte.'},
              {q:'¿Cómo convoco al equipo?',a:'En Backstage → Notificaciones selecciona el evento y tu equipo recibe un aviso.'},
            ].map((faq,i)=>{
              const [open,setOpen]=React.useState(false);
              return(
                <div key={i} style={{borderBottom:i<3?'1px solid rgba(255,255,255,.05)':'none'}}>
                  <button onClick={()=>setOpen(v=>!v)} style={{width:'100%',background:'none',border:'none',textAlign:'left',padding:'10px 0',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                    <span style={{fontSize:12,fontWeight:700,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.4}}>{faq.q}</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2" style={{flexShrink:0,transform:open?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  {open&&<div style={{fontSize:11,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.7,paddingBottom:10}}>{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </div>
  );
}
