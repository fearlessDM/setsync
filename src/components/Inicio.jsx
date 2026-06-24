import { useState, useRef } from 'react';
import { getModoFeatures } from '../data/modo';

// Imágenes por modo — iglesia: escenarios de worship / banda: palcos y ensayos
const BG_IMGS_IGLESIA = [
  'https://images.unsplash.com/photo-1519677584237-752f8853252e?w=800&q=80', // luces de escenario worship
  'https://images.unsplash.com/photo-1533854775446-95c4609da544?w=800&q=80', // iglesia con luces
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', // escenario con multitud
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

export function Inicio({ mode, lang='es', userRole='superadmin', equipos=[], personas=[], eventos=[], planActivo=null, planId='lite', tienePremiere=false, tieneMonitoreo=false, onNavigate=()=>{} }){
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

  const Lbl = ({children}) => (
    <div className="lbl" style={{marginBottom:'var(--sp-xs)'}}>{children}</div>
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

        {/* Próxima fecha — full width */}
        <Card cols={2} onClick={()=>onNavigate('fechas')}>
          <Lbl>{mode==='iglesia'?'Próxima fecha':'Próximo show'}</Lbl>
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
          <Lbl>Mi plan</Lbl>
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
          <Lbl>Cancionero</Lbl>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:17,color:'var(--tx)',lineHeight:1.1}}>
            Repertorio
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)',marginTop:5}}>
            {feat.cancioneroUniversal?'+ Universal disponible':'Tus canciones'}
          </div>
        </Card>

        {/* Mis formaciones — full width */}
        <Card cols={2} onClick={()=>onNavigate('backstage')}>
          <Lbl>{isAdmin?'Mis formaciones':'Soy parte de'}</Lbl>
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
                  +{misEquipos.length-4} formaciones más
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Tips swipeables — full width */}
        <Card cols={2}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'var(--sp-sm)'}}>
            <Lbl>Tips de uso</Lbl>
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

        {/* SetSync Premiere */}
        <Card cols={2} onClick={tienePremiere?()=>onNavigate('premiere'):undefined}>
          <div style={{display:'flex',alignItems:'center',gap:'var(--sp-xs)',marginBottom:'var(--sp-sm)'}}>
            <span style={{fontSize:16,lineHeight:1}}>★</span>
            <Lbl>SetSync Premiere</Lbl>
            {!tienePremiere&&(
              <span style={{
                marginLeft:'auto',fontSize:9,fontWeight:700,
                padding:'3px 10px',borderRadius:'var(--rad-full)',
                background:'rgba(200,169,126,.1)',color:'var(--ac)',
                border:'1px solid rgba(200,169,126,.3)',
                fontFamily:"'Lexend Giga',sans-serif",
              }}>PRO / PREMIUM</span>
            )}
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx2)',lineHeight:1.7}}>
            Canciones de bandas de adoración antes que nadie. Acordes, letra y audio desde el día de estreno.
          </div>
          {tienePremiere&&(
            <div style={{marginTop:'var(--sp-xs)',fontSize:11,fontWeight:700,color:'var(--ac)',fontFamily:"'Lexend Giga',sans-serif"}}>
              Ver estrenos →
            </div>
          )}
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
          <Lbl>Accesos rápidos</Lbl>
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

      </div>
    </div>
  );
}
