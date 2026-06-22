// Inicio.jsx — Dashboard de bienvenida. Muestra resumen del usuario,
// equipos en los que participa, tips de uso, noticias y features.
import { useState } from 'react';
import { getModoFeatures } from '../data/modo';

export function Inicio({
  mode, lang='es', userRole='superadmin',
  equipos=[], personas=[], eventos=[],
  planActivo=null, planId='lite',
  tienePremiere=false, tieneMonitoreo=false,
  onNavigate=()=>{},
}){
  const feat=getModoFeatures(mode);
  const [tipIdx,setTipIdx]=useState(0);
  const isAdmin=userRole==='superadmin'||userRole==='leader'||userRole==='encargado';

  const nombreUsuario='Daniel'; // placeholder hasta que exista auth real

  // ── Equipos donde participa el usuario ───────────────────────────────
  const misEquipos=equipos.filter(eq=>eq.miembros&&eq.miembros.length>0);

  // ── Próximo evento ────────────────────────────────────────────────────
  const hoy=new Date();
  const proximoEvento=eventos
    .filter(e=>e.fecha&&new Date(e.fecha)>=hoy)
    .sort((a,b)=>new Date(a.fecha)-new Date(b.fecha))[0]||null;

  // ── Tips rotativos ────────────────────────────────────────────────────
  const TIPS=[
    {
      icon:'🎛️',
      titulo:'Cómo conectar Monitoreo con tu mesa',
      cuerpo:'SetSync puede enviar comandos a una Behringer/Midas X32 o M32 en tiempo real a través de un puente OSC/WebSocket en tu red local. Pronto disponible en Configuración → Monitoreo.',
    },
    {
      icon:'🎵',
      titulo:'Cancionero Universal',
      cuerpo:'Accede a canciones compartidas por otras iglesias de la comunidad SetSync. Cada canción viene con acordes, cifrado Nashville y transporte automático. Disponible en Cancionero → Universal.',
    },
    {
      icon:'📅',
      titulo:'Crear y asignar un setlist',
      cuerpo:'Ve a Backstage → Crear setlist, elegí las canciones, asignalo a un evento y tu equipo lo verá automáticamente en "Próx. Fecha" antes de que empiece el culto.',
    },
    {
      icon:'🔔',
      titulo:'Notificar al equipo',
      cuerpo:'Desde Backstage → Notificaciones podés enviar un mensaje a todo el equipo o a un equipo específico. Próximamente las notificaciones push llegarán al celular aunque la app esté cerrada.',
    },
    {
      icon:'🎹',
      titulo:'Pads ambientales automáticos',
      cuerpo:'En Vista Escenario (disponible al abrir una canción en Pro/Premium), el pad se afina solo a la tonalidad de la canción activa. Perfecto para crear atmósfera durante momentos de adoración.',
    },
  ];
  const tip=TIPS[tipIdx];

  const Block=({children,onClick,cols=1})=>(
    <div onClick={onClick}
      style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:16,padding:'16px 14px',
        cursor:onClick?'pointer':'default',gridColumn:`span ${cols}`,
        transition:'border-color .15s'}}>
      {children}
    </div>
  );
  const Label=({children})=>(
    <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
      letterSpacing:'1.5px',marginBottom:8,fontFamily:"'Lexend Giga',sans-serif"}}>{children}</div>
  );

  return(
    <div style={{padding:'14px 8px 90px'}}>

      {/* ── Saludo ─────────────────────────────────────────────────── */}
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,
          fontSize:26,color:'var(--tx)',lineHeight:1.05}}>
          Hola, <span style={{color:'var(--ac)'}}>{nombreUsuario}</span> 👋
        </div>
        <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,
          color:'var(--tx3)',marginTop:4}}>
          {mode==='iglesia'?'Tu plataforma de worship está lista.':'Tu plataforma de banda está lista.'}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>

        {/* ── Próximo evento ─────────────────────────────────────── */}
        <Block cols={2} onClick={()=>onNavigate('fechas')}>
          <Label>{mode==='iglesia'?'Próximo culto':'Próximo show'}</Label>
          {proximoEvento?(
            <>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,
                fontSize:16,color:'var(--tx)',marginBottom:3}}>{proximoEvento.nombre}</div>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,color:'var(--tx3)'}}>
                {new Date(proximoEvento.fecha).toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}
                {proximoEvento.setlist?.length>0&&` · ${proximoEvento.setlist.length} canciones`}
              </div>
            </>
          ):(
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,color:'var(--tx3)'}}>
              No hay eventos próximos —{' '}
              <span style={{color:'var(--ac)',cursor:'pointer'}} onClick={e=>{e.stopPropagation();onNavigate('backstage');}}>
                crear uno
              </span>
            </div>
          )}
        </Block>

        {/* ── Mis equipos ─────────────────────────────────────────── */}
        <Block cols={2} onClick={()=>onNavigate('backstage')}>
          <Label>{isAdmin?'Mis formaciones':'Soy parte de'}</Label>
          {misEquipos.length===0?(
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,color:'var(--tx3)'}}>
              {isAdmin?'Aún no creaste ninguna formación.':'Todavía no estás asignado a ningún equipo.'}
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {misEquipos.slice(0,3).map(eq=>(
                <div key={eq.id} style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:700,
                    color:'var(--tx)',flex:1}}>{eq.name}</span>
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)'}}>
                    {eq.miembros.length} {eq.miembros.length===1?'persona':'personas'}
                  </span>
                </div>
              ))}
              {misEquipos.length>3&&(
                <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
                  +{misEquipos.length-3} más
                </div>
              )}
            </div>
          )}
        </Block>

        {/* ── Plan ───────────────────────────────────────────────── */}
        <Block onClick={()=>onNavigate('backstage')}>
          <Label>Mi plan</Label>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,
            fontSize:20,color:'var(--ac)',textTransform:'capitalize'}}>{planId}</div>
          {planActivo&&(
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)',marginTop:4}}>
              {planActivo.limiteCanciones} canciones · {planActivo.limiteMiembros===Infinity?'∞':''+planActivo.limiteMiembros} miembros
            </div>
          )}
          {planId==='lite'&&(
            <div style={{fontSize:10,color:'var(--gn)',fontFamily:"'Lexend Giga',sans-serif",marginTop:6,fontWeight:700}}>
              ↑ Mejora a Pro para desbloquear más
            </div>
          )}
        </Block>

        {/* ── Cancionero ─────────────────────────────────────────── */}
        <Block onClick={()=>onNavigate('repertorio')}>
          <Label>Cancionero</Label>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,
            fontSize:20,color:'var(--tx)'}}>Mi repertorio</div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,color:'var(--tx3)',marginTop:4}}>
            {feat.cancioneroUniversal?'+ acceso al Universal':'Agregá tus canciones'}
          </div>
        </Block>

        {/* ── Tip del día ─────────────────────────────────────────── */}
        <Block cols={2}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
            <Label>Tip de uso</Label>
            <div style={{display:'flex',gap:4}}>
              {TIPS.map((_,i)=>(
                <div key={i} onClick={()=>setTipIdx(i)}
                  style={{width:6,height:6,borderRadius:'50%',cursor:'pointer',
                    background:tipIdx===i?'var(--ac)':'var(--bd)',transition:'background .15s'}}/>
              ))}
            </div>
          </div>
          <div style={{fontSize:20,marginBottom:8}}>{tip.icon}</div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,fontSize:13,
            color:'var(--tx)',marginBottom:6}}>{tip.titulo}</div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,
            color:'var(--tx2)',lineHeight:1.6}}>{tip.cuerpo}</div>
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}>
            <button onClick={()=>setTipIdx(i=>(i+1)%TIPS.length)}
              style={{fontSize:10,fontWeight:700,color:'var(--tx3)',background:'none',
                border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              Siguiente tip →
            </button>
          </div>
        </Block>

        {/* ── SetSync Premiere ────────────────────────────────────── */}
        <Block cols={2} onClick={tienePremiere?()=>onNavigate('premiere'):undefined}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <div style={{fontSize:18}}>★</div>
            <div>
              <Label>SetSync Premiere</Label>
            </div>
            {!tienePremiere&&(
              <span style={{marginLeft:'auto',fontSize:9,fontWeight:700,padding:'2px 8px',
                borderRadius:100,background:'rgba(200,169,126,.1)',color:'var(--ac)',
                border:'1px solid rgba(200,169,126,.3)',fontFamily:"'Lexend Giga',sans-serif"}}>
                PRO / PREMIUM
              </span>
            )}
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,
            color:'var(--tx2)',lineHeight:1.6}}>
            Accede a canciones de bandas de adoración antes que nadie. SetSync negocia
            directamente con sellos y artistas para que nuestros clientes Pro/Premium tengan
            la primicia de cada lanzamiento — acordes, letra y audio, desde el día de estreno.
          </div>
          {tienePremiere&&(
            <div style={{marginTop:8,fontSize:11,fontWeight:700,color:'var(--ac)',
              fontFamily:"'Lexend Giga',sans-serif"}}>Ver estrenos disponibles →</div>
          )}
        </Block>

        {/* ── Monitoreo OSC ───────────────────────────────────────── */}
        {tieneMonitoreo&&(
          <Block cols={2} onClick={()=>onNavigate('monitoreo')}>
            <Label>Monitoreo en vivo</Label>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,
              color:'var(--tx2)',lineHeight:1.6}}>
              Controlá los niveles de monitores de tu mesa Behringer/Midas X32 o M32 directo
              desde SetSync. 16 canales en 2 capas, mute por canal. Requiere un puente
              OSC/WebSocket en la misma red WiFi que la mesa.
            </div>
            <div style={{marginTop:8,fontSize:11,fontWeight:700,color:'var(--ac)',
              fontFamily:"'Lexend Giga',sans-serif"}}>Abrir Monitoreo →</div>
          </Block>
        )}

        {/* ── Cómo funciona el Cancionero Universal ───────────────── */}
        {feat.cancioneroUniversal&&(
          <Block cols={2} onClick={()=>onNavigate('repertorio')}>
            <Label>Cancionero Universal</Label>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,
              color:'var(--tx2)',lineHeight:1.6}}>
              Un banco de canciones compartido entre las iglesias de la comunidad SetSync.
              Cada canción viene con acordes completos y cifrado Nashville. Las canciones que
              agregues a tu cancionero personal desde aquí quedan en tu cuenta y podés
              editarlas como cualquier otra canción tuya.
            </div>
            <div style={{marginTop:8,fontSize:11,fontWeight:700,color:'var(--gn)',
              fontFamily:"'Lexend Giga',sans-serif"}}>Explorar →</div>
          </Block>
        )}

        {/* ── Accesos rápidos ─────────────────────────────────────── */}
        <Block cols={2}>
          <Label>Accesos rápidos</Label>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {[
              {label:'Crear evento',view:'backstage'},
              {label:'Crear setlist',view:'backstage'},
              {label:`Ir a ${mode==='iglesia'?'Cancionero':'Cancionero'}`,view:'repertorio'},
              {label:'Ver fechas',view:'fechas'},
              {label:'Próx. Fecha',view:'misetlist'},
            ].map(a=>(
              <button key={a.label} onClick={()=>onNavigate(a.view)}
                style={{padding:'6px 12px',borderRadius:100,fontSize:11,fontWeight:700,
                  border:'1px solid var(--bd)',background:'var(--s2)',color:'var(--tx)',
                  cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                {a.label}
              </button>
            ))}
          </div>
        </Block>

      </div>
    </div>
  );
}
