import { t as getT, LANGS } from '../i18n';
import { PLANES_SETSYNC, TRAMOS_EQUIPO, precioTramoEquipo } from '../data/planes';
import { CANCIONES } from '../data/constants';
// BackstageView: panel completo de backstage para Iglesia — gestión de eventos,
// setlists, equipos, permisos, notificaciones y configuración de tema.
// NOTA: candidato a refactor con reducer/contexto en una sesión futura para
// dividir en sub-vistas (evento/setlist/equipos/permisos/notif/config) sin
// prop-drilling extenso, dado que comparten ~15 estados locales.
import { useState, useEffect, useRef, useCallback } from 'react';
// equipos ya no se importa directo — llega por props (equipos/setEquipos)
// para poder sincronizar con Firestore.
import { initials } from '../utils/music';
import { CustomSelect } from './common';
import { ItinerarioEditor, getItinerarioDefault } from './ItinerarioEditor';
import { getModoTexto, getModoFeatures, getTiposEventoDisponibles } from '../data/modo';
import { crearOrg, subscribeOrgsComoAdmin, subscribeMiembrosOrg, agregarMiembroOrg, quitarMiembroOrg, actualizarTramoOrg, cancelarOrg, esUltraAdmin, subscribeTodosLosOrgs, actualizarEstadoOrg } from '../firebase/firestore';

const FAQS_PLANES = [
  {q:'¿Cuál es la diferencia entre Cuenta Unitaria y Cuenta Equipo?', a:'Cuenta Unitaria da acceso solo a la persona que inició sesión (Lite, Pro o Premium). Cuenta Equipo es un solo pago del admin que deja a TODOS los miembros con acceso Premium completo, automático — no hace falta que cada uno pague su propio plan.'},
  {q:'¿Cuánto cuesta cada plan?', a:'Todo es mensual, sin plan anual. Cuenta Unitaria: Lite gratis, Pro $8, Premium $12. Cuenta Equipo: 1–10 personas $18, 11–25 $28, 26–35 $39 (incluye marca blanca), 36+ $39 más $1 por persona sobre 35.'},
  {q:'¿Por qué elegir Cuenta Equipo en vez de que cada uno pague su plan?', a:'Apenas tienes 2-3 personas que necesitan Premium, sale más barato la Cuenta Equipo que sumar planes individuales — y evita el problema de "quién paga qué". Un solo pago, todo el equipo con acceso completo.'},
  {q:'¿Cómo se agregan miembros?', a:'El admin los agrega por correo electrónico directo desde esta pantalla. No hace falta código de invitación ni link.'},
  {q:'Agregué a alguien que todavía no tiene cuenta en SetSync, ¿qué pasa?', a:'Queda como "pendiente". Apenas esa persona se registra o inicia sesión con ese mismo correo, se vincula sola — no hay que hacer nada más.'},
  {q:'¿Puedo quitar a alguien del equipo?', a:'Sí, desde la misma pantalla. Al quitarlo, esa persona vuelve a su plan individual (Lite, salvo que tenga uno pago aparte).'},
  {q:'¿El admin también cuenta como miembro del equipo?', a:'Sí, se agrega automáticamente al crear la Cuenta Equipo — no ocupa un cupo aparte del tramo.'},
  {q:'¿Puedo cambiar de tramo si el equipo crece?', a:'Sí, se ajusta desde esta misma pantalla cuando lo necesites.'},
  {q:'¿Qué pasa con los miembros si el pago falla?', a:'Hay un período de gracia antes de que baje nadie de plan — el equipo sigue con Premium completo mientras el admin regulariza el pago. Solo después de vencido ese plazo, todos los miembros vuelven a su plan individual.'},
  {q:'¿Cómo sé si mi equipo está en período de gracia?', a:'Acá mismo, el admin ve el estado del equipo (Activa / En gracia / Vencida) con la fecha límite si corresponde.'},
  {q:'¿Una persona puede pertenecer a más de un equipo a la vez?', a:'Sí. Si perteneces a dos Cuentas Equipo distintas (por ejemplo, tocas en dos bandas), basta con que una esté vigente para que tengas Premium completo.'},
  {q:'Soy miembro de un equipo, no el admin — ¿puedo agregar o quitar gente?', a:'No, solo quien contrató la Cuenta Equipo puede gestionar miembros. Vas a ver un aviso de que perteneces al equipo, sin controles de administración.'},
  {q:'¿La marca blanca viene en todos los tramos de equipo?', a:'No — viene incluida desde el tramo de 26–35 personas hacia arriba. Los tramos más chicos (1–10 y 11–25) no la incluyen.'},
  {q:'¿"Límite de miembros" en Cuenta Unitaria significa que esas personas tienen acceso?', a:'No — ese límite es solo un tope de roster/lista de contactos que puedes cargar en tu cuenta (nombres, roles). No le da acceso a nadie más a la app. Para eso necesitan su propio plan individual o formar parte de una Cuenta Equipo.'},
  {q:'¿Hay plan anual con descuento?', a:'No, por ahora todo es mensual únicamente.'},
];

export function BackstageView({userRole,onToast,mode,onSetTheme,onGetTheme,onLangChange,eventos=[],setEventos,lang="es",equipos=[],setEquipos=()=>{},persistirEquipo=()=>{},persistirEvento=()=>{},online=true,setOnline=()=>{},firebaseListo=false,planId="lite",setPlanId=()=>{},planActivo=null,viaEquipo=false,orgPrincipal=null,orgsDelUsuario=[],tienePremiere=false,tieneMonitoreo=false,onNavigate=()=>{},ensayos=[],setEnsayos=()=>{},persistirEnsayo=()=>{},variacionesDB={},currentUser=null,onCerrarSesion=()=>{},navResetKey=0}){
  const tx=getT(lang);
  const vx=getModoTexto(mode,lang);
  const feat=getModoFeatures(mode);
  const tipos=getTiposEventoDisponibles(mode,lang);
  const [bsView,setBsView]=useState(null);
  const [helpOpen,setHelpOpen]=useState(false);
  // Volver a Backstage home al re-tocar el botón del nav, aunque ya
  // estuvieras adentro de una subpágina — no solo con la flecha atrás.
  useEffect(()=>{ if(navResetKey>0) setBsView(null); },[navResetKey]);
  const isAdmin=userRole==='superadmin';
  const isPastor=isAdmin; // Pastor eliminado como rol separado — Admin absorbe sus funciones
  const isLeader=userRole==='leader'||isAdmin;
  // ── Cuenta Equipo (v90) — org(es) donde ESTE usuario es admin, y los
  // miembros del primero (hoy soportamos gestionar uno a la vez desde
  // esta pantalla; ver planes.js/firestore.js para el soporte multi-org
  // ya presente en el modelo de datos). No confundir con `equipos` de
  // más abajo (roster interno con roles).
  const [misOrgsAdmin,setMisOrgsAdmin]=useState([]);
  useEffect(()=>{
    if(!currentUser?.uid) return;
    return subscribeOrgsComoAdmin(currentUser.uid, setMisOrgsAdmin);
  },[currentUser?.uid]);
  // v91: antes solo se mostraba misOrgsAdmin[0] — si alguna vez administras
  // más de un equipo, los demás quedaban invisibles en esta pantalla. Ahora
  // se puede elegir cuál ver/gestionar (el selector solo aparece si hay
  // más de uno; con uno solo, comportamiento idéntico a antes).
  const [orgAdminSeleccionadoId,setOrgAdminSeleccionadoId]=useState(null);
  const orgQueAdministro = misOrgsAdmin.find(o=>o.id===orgAdminSeleccionadoId) || misOrgsAdmin[0] || null;
  const [miembrosOrgAdmin,setMiembrosOrgAdmin]=useState([]);
  useEffect(()=>{
    if(!orgQueAdministro?.id){ setMiembrosOrgAdmin([]); return; }
    return subscribeMiembrosOrg(orgQueAdministro.id, setMiembrosOrgAdmin);
  },[orgQueAdministro?.id]);
  const [emailNuevoMiembro,setEmailNuevoMiembro]=useState('');
  const [creandoOrg,setCreandoOrg]=useState(false);
  // ── Cambiar tramo / cancelar (v91) — self-service del propio admin del
  // equipo, sobre orgQueAdministro. Cambiar tramo lo puede hacer cualquier
  // admin de org (no toca estado, solo tramoId — permitido por Rules).
  // Cancelar SÍ toca estado, pero solo a 'cancelada' (nunca a 'activa'/
  // 'gracia' — reactivar queda reservado al Ultra Admin, ver más abajo).
  const [tramoSeleccion,setTramoSeleccion]=useState('');
  const [confirmandoCancelar,setConfirmandoCancelar]=useState(false);
  const [cancelandoOrg,setCancelandoOrg]=useState(false);
  // ── Ultra Admin (v91) — SOLO Danny. Ver esUltraAdmin() en firestore.js.
  const esDueñoPlataforma = esUltraAdmin(currentUser?.uid);
  const [todosLosOrgs,setTodosLosOrgs]=useState([]);
  useEffect(()=>{
    if(!esDueñoPlataforma) return;
    return subscribeTodosLosOrgs(setTodosLosOrgs);
  },[esDueñoPlataforma]);
  const [uaEdicion,setUaEdicion]=useState({}); // {[orgId]: {estado, fechaLimiteGracia, tramoId}} — borrador antes de guardar
  const [uaGuardando,setUaGuardando]=useState(null); // orgId en vuelo
  const [faqPlanesOpen,setFaqPlanesOpen]=useState(false);
  const [faqPlanesAbiertas,setFaqPlanesAbiertas]=useState({});
  const [activeEq,setActiveEq]=useState(null);
  const [verMiembros,setVerMiembros]=useState(false);
  const [nuevoMiembro,setNuevoMiembro]=useState(null); // {nombre,email,equipoId} — reemplaza prompt()
  const [nuevaBanda,setNuevaBanda]=useState('');
  const [nuevosRoles,setNuevosRoles]=useState('');
  const [evNombre,setEvNombre]=useState('');
  const [evTipo,setEvTipo]=useState('domingo');
  const [evFecha,setEvFecha]=useState('');
  const [evLugar,setEvLugar]=useState('');
  const [evHora,setEvHora]=useState('');
  const [evNotas,setEvNotas]=useState('');
  const [evSetlist,setEvSetlist]=useState([]); // {cancion,asignaciones:[{id,variacionId,personaId}]}[] — v40, antes strings planos
  const [evArchivo,setEvArchivo]=useState(null);
  const [evSearch,setEvSearch]=useState('');
  const [evEquipos,setEvEquipos]=useState(null); // null=todavía no inicializado; se llena con todos los equipos al entrar
  const [evItinerario,setEvItinerario]=useState(getItinerarioDefault(lang));
  const [evNuevoEquipo,setEvNuevoEquipo]=useState('');
  // Por defecto, todos los equipos están convocados — el admin puede
  // destildar los que no correspondan. Se inicializa una sola vez (o
  // cuando aparece un equipo nuevo que evEquipos todavía no conoce).
  useEffect(()=>{
    setEvEquipos(prev=>{
      if(prev===null) return equipos.map(e=>e.id);
      const idsConocidos=new Set(prev);
      const nuevos=equipos.map(e=>e.id).filter(id=>!idsConocidos.has(id));
      return nuevos.length ? [...prev,...nuevos] : prev;
    });
  },[equipos]);
  const [notifDest,setNotifDest]=useState([]);
  const [notifTipo,setNotifTipo]=useState('recordatorio');
  const [notifMsg,setNotifMsg]=useState('');
  const [notifCorreo,setNotifCorreo]=useState(false);

  // ── Crear ensayo ──
  const [ensRef,setEnsRef]=useState('');
  const [ensSetlistId,setEnsSetlistId]=useState('');
  const [ensEquipos,setEnsEquipos]=useState([]);
  const [ensArchivo,setEnsArchivo]=useState(null);
  const [ensNotas,setEnsNotas]=useState('');
  // ── Planes y precios ──

  // ── Setlist Creator ──
  const [slNombre,setSlNombre]=useState('');
  const [slCanciones,setSlCanciones]=useState([]);
  const [slSearch,setSlSearch]=useState('');
  const [slEventoId,setSlEventoId]=useState('');
  const [slGuardados,setSlGuardados]=useState([]);
  // ── Estados Pastor ──
  const [pastorVersiculo,setPastorVersiculo]=useState('');
  const [pastorTexto,setPastorTexto]=useState('');
  const [pastorNotas,setPastorNotas]=useState('');
  const [selectedPermisos,setSelectedPermisos]=useState([]);
  const [orgPais,setOrgPais]=useState('Chile');
  const [selectedIntegrante,setSelectedIntegrante]=useState('');
  const [lideresActuales,setLideresActuales]=useState([
    {name:'Cony Saavedra',av:'CS',rol:'Líder Banda',permisos:['editar setlist','convocar equipo']},
    {name:'Mauro Pizarro',av:'MP',rol:'Líder Proyecciones',permisos:['gestionar equipo']},
  ]);
  const personas=equipos.flatMap(eq=>(eq.miembros||[]));
  // Paleta de acento (misma familia que usa el resto de la app: mint/gold/
  // rojo) para dar variedad de color a avatares sin usar gradientes —
  // determinístico por nombre, no random, así cada persona mantiene su
  // color entre renders.
  const AVATAR_PALETTE=['#30C0B7','#c8a97e','#FD8083','#7dd3c0','#e0a458'];
  const colorForName=(name='')=>{
    let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0;
    return AVATAR_PALETTE[h%AVATAR_PALETTE.length];
  };

  // ── Tutoriales del bot\u00f3n de ayuda "i" ──────────────────────────────────
  const TUTORIALES_HELP={
    evento:{
      titulo:'Cómo crear un evento',
      pasos:[
        'Elige el tipo de evento (Domingo, Ensayo, Especial) o escribe un nombre propio.',
        'Selecciona la fecha, lugar y hora.',
        'Agrega las canciones al setlist — puedes asignar variaciones o instrumentos distintos a cada persona.',
        'Marca qué equipos quedan convocados para esta fecha.',
        'Arma el itinerario con los horarios del día si lo necesitas.',
        'Agrega notas para el equipo y adjunta un archivo si hace falta (PDF, Word o audio).',
        'Toca "Crear evento" para publicarlo — tu equipo lo verá automáticamente en Próxima Fecha.',
      ],
    },
    equipos:{
      titulo:'Cómo gestionar equipos, roles y personas',
      pasos:[
        'Para agregar una persona nueva: botón "Agregar miembro" arriba de la lista, completa nombre y correo (opcional).',
        'Para crear un equipo nuevo: al final de la pantalla, escribe el nombre y los roles separados por coma (ej: Líder, Músico, Técnico).',
        'Toca cualquier equipo para ver su detalle — ahí puedes agregar/quitar miembros, cambiar su rol, o subir foto de perfil.',
        'Los roles de un equipo se editan en su detalle: escribe uno nuevo y presiona Enter, o toca la × para quitar uno existente.',
        'Una persona puede pertenecer a más de un equipo a la vez — se agrega desde el selector "Agregar miembro al equipo" en cada detalle.',
      ],
    },
    notif:{
      titulo:'Cómo enviar notificaciones',
      pasos:[
        'Elige a quién va dirigida: todo el equipo, o un equipo específico.',
        'Selecciona el tipo de alerta: recordatorio, cambio de setlist, urgente o general — esto define el color e ícono que verán.',
        'Escribe el mensaje.',
        'Si quieres que también llegue por correo electrónico (no solo dentro de la app), activa esa opción antes de enviar.',
        'Toca "Enviar" — el equipo lo recibe al instante.',
      ],
    },
    ensayo:{
      titulo:'Cómo crear un ensayo',
      pasos:[
        'Opcional: asigna el ensayo a un evento existente para tenerlos vinculados.',
        'Elige qué setlist vas a repasar (de los que ya guardaste desde Crear setlist).',
        'Marca qué equipos quedan convocados a este ensayo.',
        'Agrega notas de foco (ej: "repasar transiciones del bloque de adoración") y adjunta un archivo si lo necesitas.',
        'Toca "Crear ensayo" — si ya había ensayos para el mismo evento, puedes duplicar uno existente en vez de partir de cero.',
      ],
    },
    permisos:{
      titulo:'Cómo delegar permisos',
      pasos:[
        'Selecciona a la persona del equipo que va a recibir permisos de líder.',
        'Marca los permisos específicos que va a tener: editar setlist, convocar equipo, enviar notificaciones, editar itinerario, gestionar equipos, palabra del pastor, o ver Backstage.',
        'Toca "Guardar líder" — la persona queda con acceso solo a lo que marcaste, sin necesitar tu aprobación cada vez.',
        'Puedes quitarle el acceso en cualquier momento desde la lista de "Líderes actuales", tocando la × junto a su nombre.',
      ],
    },
    backstage:{
      titulo:'Qué es Backstage',
      pasos:[
        'Backstage es el panel de control de tu equipo — desde acá administras todo lo que no ve el resto de los músicos.',
        'Crear fecha/setlist/ensayo: arma los eventos y el contenido que tu equipo va a usar.',
        'Gestión de equipos: quiénes son, en qué equipo están, y qué rol cumplen.',
        'Delegar permisos: da acceso de líder a otras personas sin que dependan de ti para todo.',
        'Notificaciones: avisa a tu equipo directo desde la app.',
        'Personalización: logo, tema visual e idioma de tu cuenta.',
        'Cada pantalla tiene su propio botón de ayuda "i" con instrucciones específicas.',
      ],
    },
  };
  const HelpBtn=()=>(
    <button className="help-btn" onClick={()=>setHelpOpen(true)} aria-label="Ayuda">i</button>
  );
  const HelpModal=()=>{
    const t=TUTORIALES_HELP[helpOpen];
    if(!t)return null;
    return(
      <div className="help-ov" onClick={()=>setHelpOpen(false)}>
        <div className="help-modal" onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-title2)',textTransform:'uppercase',color:'var(--tx)'}}>{t.titulo}</div>
            <button onClick={()=>setHelpOpen(false)} style={{width:26,height:26,borderRadius:'50%',background:'var(--s2)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'var(--fs-lg)'}}>×</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {t.pasos.map((p,i)=>(
              <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <div style={{width:20,height:20,borderRadius:'50%',background:'var(--gn)',color:'var(--btn-c)',fontSize:'var(--fs-xs)',fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{i+1}</div>
                <div style={{fontSize:'var(--fs-md)',color:'var(--tx2)',fontWeight:300,lineHeight:1.5,fontFamily:"var(--font-body)"}}>{p}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── CREAR EVENTO ──
  if(bsView==='evento')return(
    <div style={{position:'relative',padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90,background:'var(--bg)',minHeight:'100vh',color:'var(--tx)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
        <button className="help-btn" onClick={()=>setHelpOpen('evento')} aria-label="Ayuda">i</button>
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
        </div>
      </div>
      <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.1,marginBottom:3}}>{tx.createDateLbl} <span style={{color:'var(--ac)'}}>o evento</span></div>
      <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4,marginBottom:16}}>{tx.createDateSub}</div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.eventNameLbl}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
          {tipos.map(t=>t.label).map(op=>(
            <button key={op} onClick={()=>setEvNombre(op)}
              style={{padding:'5px 10px',borderRadius:100,background:evNombre===op?'rgba(200,169,126,.12)':'var(--s2)',color:evNombre===op?'var(--ac)':'var(--tx3)',fontSize:'var(--fs-sm)',fontWeight:400,cursor:'pointer',fontFamily:"var(--font-body)",transition:'all .15s'}}>
              {op}
            </button>
          ))}
        </div>
        <input className="inp" placeholder={tx.orCustomNamePlaceholder} value={evNombre} onChange={e=>setEvNombre(e.target.value)}/>
      </div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.dateFieldLbl}</div>
        <div style={{display:'flex',gap:8}}>
          <CustomSelect style={{flex:1}} placeholder={tx.dayLbl}
            value={Number(evFecha.split('-')[2])||''}
            onChange={d=>setEvFecha(prev=>{const parts=prev.split('-');parts[2]=String(d).padStart(2,'0');return parts.join('-');})}
            options={Array.from({length:31},(_,i)=>i+1).map(d=>({value:d,label:String(d)}))}/>
          <CustomSelect style={{flex:1.4}} placeholder={tx.monthPlaceholderLbl}
            value={Number(evFecha.split('-')[1])||''}
            onChange={m=>setEvFecha(prev=>{const parts=prev.split('-');parts[1]=String(m).padStart(2,'0');return parts.join('-');})}
            options={tx.monthsFull.map((m,i)=>({value:i+1,label:m}))}/>
          <CustomSelect style={{flex:1}} placeholder={tx.yearLbl}
            value={evFecha.split('-')[0]||''}
            onChange={y=>setEvFecha(prev=>{const parts=prev.split('-');parts[0]=String(y);return parts.join('-');})}
            options={['2026','2027','2028'].map(y=>({value:y,label:y}))}/>
        </div>
      </div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.placeAndTimeLbl}</div>
        <div style={{display:'flex',gap:8}}>
          <input className="inp" placeholder="Lugar (ej: Iglesia Central)" style={{flex:2}}
            value={evLugar} onChange={e=>setEvLugar(e.target.value)}/>
          <input className="inp" type="time" style={{flex:1,cursor:'pointer'}}
            value={evHora} onChange={e=>setEvHora(e.target.value)}/>
        </div>
      </div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:2}}>{tx.selectSongsLbl}</div>
        <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontWeight:300,marginBottom:10}}>
          También puedes asignar diferentes variaciones de la canción a cada persona
        </div>
        {evSetlist.length>0&&(
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
            {evSetlist.map((s,i)=>{
              const vars=variacionesDB[s.cancion]||[];
              const asignaciones=s.asignaciones||[{id:`ea${i}`,variacionId:'original',personaId:null}];
              const actualizarAsignacion=(aId,campo,valor)=>{
                setEvSetlist(prev=>prev.map((x,j)=>j!==i?x:{...x,
                  asignaciones:(x.asignaciones||asignaciones).map(a=>a.id===aId?{...a,[campo]:valor}:a)}));
              };
              const agregarAsignacion=()=>{
                setEvSetlist(prev=>prev.map((x,j)=>j!==i?x:{...x,
                  asignaciones:[...(x.asignaciones||asignaciones),{id:`ea${Date.now()}${j}`,variacionId:'original',personaId:null}]}));
              };
              const quitarAsignacion=(aId)=>{
                setEvSetlist(prev=>prev.map((x,j)=>j!==i?x:{...x,
                  asignaciones:(x.asignaciones||asignaciones).filter(a=>a.id!==aId)}));
              };
              return(
              <div key={s.cancion+i} style={{padding:'10px 12px',borderRadius:12,background:'var(--s1)',}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:vars.length||personas.length?8:0}}>
                  <span style={{flex:1,minWidth:0,fontSize:'var(--fs-md)',fontWeight:700,color:'var(--tx)',fontFamily:"var(--font-body)",
                    overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{i+1}. {s.cancion}</span>
                  <button onClick={()=>setEvSetlist(l=>l.filter((_,j)=>j!==i))}
                    style={{width:18,height:18,borderRadius:'50%',background:'var(--bd)',
                      color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-md)',lineHeight:1,display:'flex',
                      alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
                </div>
                {(vars.length>0||personas.length>0)&&(
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {asignaciones.map(a=>(
                      <div key={a.id} style={{display:'flex',gap:6,alignItems:'center'}}>
                        {vars.length>0&&(
                          <CustomSelect value={a.variacionId||'original'} onChange={v=>actualizarAsignacion(a.id,'variacionId',v)}
                            style={{flex:1,padding:'6px 8px',fontSize:'var(--fs-sm)'}}
                            options={[{value:'original',label:'Original (letra/acordes)'},...vars.map(v=>({value:v.id,label:`${v.label}${v.tipo==='partitura'?' (partitura)':''}`}))]}/>
                        )}
                        {personas.length>0&&(
                          <CustomSelect value={a.personaId||''} onChange={v=>actualizarAsignacion(a.id,'personaId',v||null)}
                            style={{flex:1,padding:'6px 8px',fontSize:'var(--fs-sm)'}} placeholder={tx.notAssignedLbl}
                            options={personas.map(p=>({value:p.id,label:p.name}))}/>
                        )}
                        {asignaciones.length>1&&(
                          <button onClick={()=>quitarAsignacion(a.id)}
                            style={{width:20,height:20,borderRadius:'50%',background:'var(--s3)',
                              color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-md)',lineHeight:1,display:'flex',
                              alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
                        )}
                      </div>
                    ))}
                    <button onClick={agregarAsignacion}
                      style={{alignSelf:'flex-start',display:'flex',alignItems:'center',gap:5,padding:'4px 10px',
                        borderRadius:100,background:'transparent',
                        color:'var(--gn)',cursor:'pointer',fontSize:'var(--fs-xs)',fontWeight:700,fontFamily:"var(--font-body)"}}>
                      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Asignar otra variación
                    </button>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
        <input className="inp" placeholder={tx.searchSongPlaceholder} value={evSearch} onChange={e=>setEvSearch(e.target.value)} style={{marginBottom:10}}/>
        <div className="sg" style={{maxHeight:340,overflowY:'auto',marginBottom:0}}>
          {CANCIONES.filter(s=>s.n.toLowerCase().includes(evSearch.toLowerCase())&&!evSetlist.some(x=>x.cancion===s.n)).map(s=>(
            <div key={s.n} className="scard" onClick={()=>setEvSetlist(l=>[...l,{cancion:s.n,asignaciones:[{id:`ea${Date.now()}`,variacionId:'original',personaId:null}]}])}>
              <span className="scard-n">{s.n}</span>
              <span className="scard-s">{s.key}<span>{s.bpm} bpm</span></span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.teamsCalledLbl}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
          {equipos.map(eq=>{
            const marcado=(evEquipos||[]).includes(eq.id);
            return(
            <label key={eq.id} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:100,background:'var(--s1)',cursor:'pointer',transition:'all .15s',opacity:marcado?1:.5}}>
              <input type="checkbox" checked={marcado}
                onChange={()=>setEvEquipos(prev=>marcado?(prev||[]).filter(id=>id!==eq.id):[...(prev||[]),eq.id])}
                style={{accentColor:eq.color,width:13,height:13}}/>
              <div style={{width:7,height:7,borderRadius:'50%',background:eq.color}}/>
              <span style={{fontSize:'var(--fs-base)',fontWeight:400,color:'var(--tx)'}}>{eq.name}</span>
              <span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)'}}>{(eq.miembros||[]).length}p</span>
            </label>
            );
          })}
        </div>
        <div style={{borderTop:'1px solid var(--bd)',paddingTop:10}}>
          <div style={{fontSize:'var(--fs-sm)',fontWeight:700,color:'var(--tx3)',marginBottom:7}}>¿Necesitas un equipo adicional?</div>
          <div style={{display:'flex',gap:8}}>
            <input className="inp" placeholder={tx.customTeamNamePlaceholder} style={{flex:1,fontSize:'var(--fs-md)'}}
              value={evNuevoEquipo} onChange={e=>setEvNuevoEquipo(e.target.value)}/>
            <button onClick={()=>{
              const v=evNuevoEquipo.trim();
              if(!v)return;
              const nuevoEquipo={id:Date.now(),name:v,color:'var(--gn)',roles:[],miembros:[]};
              setEquipos(prev=>[...prev,nuevoEquipo]);
              persistirEquipo(nuevoEquipo);
              setEvEquipos(prev=>[...(prev||[]),nuevoEquipo.id]);
              onToast({text:tx.teamAddedToast,sub:v});
              setEvNuevoEquipo('');
            }}
              style={{padding:'8px 14px',borderRadius:9,background:'rgba(200,169,126,.08)',color:'var(--ac)',fontWeight:700,fontSize:'var(--fs-md)',cursor:'pointer',fontFamily:"var(--font-body)",flexShrink:0}}>
              + Agregar
            </button>
          </div>
        </div>
      </div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.itineraryLbl}</div>
        <ItinerarioEditor items={evItinerario} onChange={setEvItinerario} lang={lang}/>
      </div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:18}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.eventNotesLbl}</div>
        <textarea className="inp" value={evNotas} onChange={e=>setEvNotas(e.target.value)}
          style={{minHeight:90,resize:'vertical',lineHeight:1.6,fontSize:'var(--fs-md)'}}
          placeholder={"Ej: Llegar 30 min antes del ensayo. Revisar las canciones con tiempo.\nContactar a Cony para confirmar el equipo de proyecciones.\nFecha límite para cambios en el setlist: jueves en la noche."}/>
      </div>

      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.attachedFileLbl}</div>
        <div style={{fontSize:'var(--fs-sm)',color:'var(--tx2)',fontWeight:300,marginBottom:10,fontFamily:"var(--font-body)"}}>
          PDF, Word o audio — visible para el equipo en los detalles del evento
        </div>
        {evArchivo?(
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
            borderRadius:10,background:'rgba(var(--gn-rgb),.08)',}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--gn)" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{flex:1,fontSize:'var(--fs-md)',fontWeight:700,color:'var(--tx)'}}>{evArchivo.name}</span>
            <button onClick={()=>setEvArchivo(null)}
              style={{background:'none',color:'var(--rd)',cursor:'pointer',fontSize:'var(--fs-xl)'}}>×</button>
          </div>
        ):(
          <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            padding:'16px',borderRadius:10,cursor:'pointer',color:'var(--tx3)'}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{fontSize:'var(--fs-base)',fontWeight:700}}>{tx.uploadFileLbl}</span>
            <input type="file" accept=".pdf,.doc,.docx,.mp3,.wav,.m4a" style={{display:'none'}}
              onChange={e=>{const f=e.target.files[0];if(f)setEvArchivo(f);}}/>
          </label>
        )}
      </div>


      <div style={{display:'flex',gap:9}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>{tx.cancel}</button>
        <button className="btn btn-p" style={{flex:2,justifyContent:'center'}}
          disabled={!evNombre.trim()&&!evFecha}
          onClick={()=>{
            const label=`${evNombre||tx.newEventDefault}`;
            const nuevoEv={id:Date.now(),tipo:evTipo||'culto',nombre:label,fecha:evFecha,
              lugar:evLugar,hora:evHora,setlist:[...evSetlist],
              equiposConvocados:evEquipos||equipos.map(e=>e.id),
              itinerario:[...evItinerario],
              notas:evNotas||null,
              archivo:evArchivo?{name:evArchivo.name}:null};
            setEventos(prev=>[...prev,nuevoEv]);
            persistirEvento(nuevoEv);
            onToast({text:tx.eventCreatedToast,sub:`${label} · ${evSetlist.length} canciones`});
            setEvNombre('');setEvSetlist([]);setEvNotas('');setEvFecha('');setEvArchivo(null);
            setEvLugar('');setEvHora('');setEvEquipos(equipos.map(e=>e.id));setEvItinerario(getItinerarioDefault(lang));
            setBsView(null);
          }}>
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Crear evento
        </button>
      </div>
      {helpOpen==='evento'&&<HelpModal/>}
    </div>
  );

    // VISTA: CREAR SETLIST
    if(bsView==='setlist'){

    const moverCancion=(from,to)=>{
      const arr=[...slCanciones];
      const [item]=arr.splice(from,1);
      arr.splice(to,0,item);
      setSlCanciones(arr);
    };

    const guardarSetlist=()=>{
      if(!slCanciones.length){onToast({text:tx.addAtLeastOneSong,sub:tx.setlistEmptyToast});return;}
      const nuevo={
        id:Date.now(),
        nombre:slNombre||`Setlist ${new Date().toLocaleDateString('es-CL')}`,
        canciones:[...slCanciones],
        eventoId:slEventoId||null,
        fecha:new Date().toLocaleDateString('es-CL'),
      };
      setSlGuardados(prev=>[...prev,nuevo]);
      // Si hay evento asignado, actualizar eventos
      if(slEventoId){
        setEventos(prev=>prev.map(ev=>ev.id===parseInt(slEventoId)?{...ev,setlist:slCanciones}:ev));
      }
      onToast({text:tx.setlistSavedToast,sub:`${slCanciones.length} canciones${slEventoId?' · Asignado al evento':''}`});
      setSlCanciones([]);setSlNombre('');setSlEventoId('');setSlSearch('');
      setBsView(null);
    };

    return(
      <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
        </div>
        <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:3}}>
          Crear <span style={{color:'var(--ac)'}}>setlist</span>
        </div>
        <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4,marginBottom:20}}>Arma la lista de canciones y asígnala a un evento cuando quieras</div>
        <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:12}}>
          <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.setlistNameLbl}</div>
          <input className="inp" placeholder="Ej: Setlist 6 de julio · Noche de adoración..." value={slNombre} onChange={e=>setSlNombre(e.target.value)}/>
        </div>
        <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:12}}>
          <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
            Asignar a evento
            <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'var(--tx2)',fontSize:'var(--fs-subtitle)',marginLeft:6}}>· opcional, puedes hacerlo después</span>
          </div>
          {eventos.length===0?(
            <div style={{padding:'12px',borderRadius:10,background:'var(--s1)',textAlign:'center'}}>
              <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:6}}>{tx.noEventsYetLbl}</div>
              <button onClick={()=>setBsView('evento')} style={{fontSize:'var(--fs-base)',fontWeight:700,color:'var(--ac)',background:'none',cursor:'pointer',fontFamily:"var(--font-body)"}}>
                + Crear un evento primero →
              </button>
            </div>
          ):(
            <CustomSelect value={slEventoId} onChange={setSlEventoId}
              placeholder="Sin asignar — guardar como borrador"
              options={eventos.map(ev=>({value:ev.id,label:`${ev.nombre}${ev.fecha?' · '+ev.fecha:''}`}))}/>
          )}
          {slEventoId&&(
            <div style={{marginTop:8,padding:'8px 12px',borderRadius:8,background:'rgba(94,206,160,.08)',fontSize:'var(--fs-base)',color:'var(--gn)',fontWeight:700,display:'flex',alignItems:'center',gap:6}}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Setlist asignado a: {eventos.find(e=>String(e.id)===String(slEventoId))?.nombre}
            </div>
          )}
        </div>
        <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.selectSongsLbl}</div>
            {slCanciones.length>0&&(
              <span style={{fontSize:'var(--fs-base)',fontWeight:700,color:'var(--ac)'}}>{slCanciones.length}</span>
            )}
          </div>
          <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontWeight:300,marginBottom:10}}>
            También puedes asignar diferentes variaciones de la canción a cada persona
          </div>
          {slCanciones.length>0&&(
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
              {slCanciones.map((s,i)=>{
                const vars=variacionesDB[s.cancion]||[];
                const asignaciones=s.asignaciones||[{id:`a${i}`,variacionId:'original',personaId:null}];
                const resumenVars=asignaciones.map(a=>vars.find(v=>v.id===a.variacionId)?.label).filter(Boolean);
                const actualizarAsignacion=(aId,campo,valor)=>{
                  setSlCanciones(prev=>prev.map((x,j)=>j!==i?x:{...x,
                    asignaciones:(x.asignaciones||asignaciones).map(a=>a.id===aId?{...a,[campo]:valor}:a)}));
                };
                const agregarAsignacion=()=>{
                  setSlCanciones(prev=>prev.map((x,j)=>j!==i?x:{...x,
                    asignaciones:[...(x.asignaciones||asignaciones),{id:`a${Date.now()}${j}`,variacionId:'original',personaId:null}]}));
                };
                const quitarAsignacion=(aId)=>{
                  setSlCanciones(prev=>prev.map((x,j)=>j!==i?x:{...x,
                    asignaciones:(x.asignaciones||asignaciones).filter(a=>a.id!==aId)}));
                };
                return(
                <div key={s.cancion+i} style={{padding:'10px 12px',borderRadius:12,background:'var(--s1)',}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:vars.length||personas.length?8:0}}>
                    <span style={{flex:1,minWidth:0,fontSize:'var(--fs-md)',fontWeight:700,color:'var(--tx)',fontFamily:"var(--font-body)",
                      overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
                      {i+1}. {s.cancion}
                      {resumenVars.length>0&&<span style={{fontWeight:400,color:'var(--gn)',fontSize:'var(--fs-sm)',marginLeft:6}}>· {resumenVars.join(', ')}</span>}
                    </span>
                    <button disabled={i===0} onClick={()=>moverCancion(i,i-1)}
                      style={{width:18,height:18,background:'var(--s3)',
                        color:i===0?'var(--div)':'var(--tx2)',cursor:i===0?'not-allowed':'pointer',
                        borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button disabled={i===slCanciones.length-1} onClick={()=>moverCancion(i,i+1)}
                      style={{width:18,height:18,background:'var(--s3)',
                        color:i===slCanciones.length-1?'var(--div)':'var(--tx2)',cursor:i===slCanciones.length-1?'not-allowed':'pointer',
                        borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <button onClick={()=>setSlCanciones(prev=>prev.filter((_,j)=>j!==i))}
                      style={{width:18,height:18,borderRadius:'50%',background:'var(--bd)',
                        color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-md)',lineHeight:1,display:'flex',
                        alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
                  </div>
                  {/* Asignaciones: qué variación/partitura toca cada persona — puede haber
                      varias por canción (v36-ampliación: botón + para repartir a más de una
                      persona, ej. Piano a Ana y Bajo a Luis en la misma canción) */}
                  {(vars.length>0||personas.length>0)&&(
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {asignaciones.map(a=>(
                        <div key={a.id} style={{display:'flex',gap:6,alignItems:'center'}}>
                          {vars.length>0&&(
                            <CustomSelect value={a.variacionId||'original'} onChange={v=>actualizarAsignacion(a.id,'variacionId',v)}
                              style={{flex:1,padding:'6px 8px',fontSize:'var(--fs-sm)'}}
                              options={[{value:'original',label:'Original (letra/acordes)'},...vars.map(v=>({value:v.id,label:`${v.label}${v.tipo==='partitura'?' (partitura)':''}`}))]}/>
                          )}
                          {personas.length>0&&(
                            <CustomSelect value={a.personaId||''} onChange={v=>actualizarAsignacion(a.id,'personaId',v||null)}
                              style={{flex:1,padding:'6px 8px',fontSize:'var(--fs-sm)'}} placeholder={tx.notAssignedLbl}
                              options={personas.map(p=>({value:p.id,label:p.name}))}/>
                          )}
                          {asignaciones.length>1&&(
                            <button onClick={()=>quitarAsignacion(a.id)}
                              style={{width:20,height:20,borderRadius:'50%',background:'var(--s3)',
                                color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-md)',lineHeight:1,display:'flex',
                                alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
                          )}
                        </div>
                      ))}
                      <button onClick={agregarAsignacion}
                        style={{alignSelf:'flex-start',display:'flex',alignItems:'center',gap:5,padding:'4px 10px',
                          borderRadius:100,background:'transparent',
                          color:'var(--gn)',cursor:'pointer',fontSize:'var(--fs-xs)',fontWeight:700,fontFamily:"var(--font-body)"}}>
                        <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Asignar otra variación
                      </button>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
          <input className="inp" placeholder={tx.searchSongPlaceholder} value={slSearch} onChange={e=>setSlSearch(e.target.value)} style={{marginBottom:10}}/>
          <div className="sg" style={{maxHeight:340,overflowY:'auto',marginBottom:0}}>
            {CANCIONES.filter(s=>s.n.toLowerCase().includes(slSearch.toLowerCase())&&!slCanciones.some(x=>x.cancion===s.n)).map(s=>(
              <div key={s.n} className="scard" onClick={()=>{setSlCanciones(prev=>[...prev,{cancion:s.n,asignaciones:[{id:`a${Date.now()}`,variacionId:'original',personaId:null}]}]);}}>
                <span className="scard-n">{s.n}</span>
                <span className="scard-s">{s.key}<span>{s.bpm} bpm</span></span>
              </div>
            ))}
            {CANCIONES.filter(s=>s.n.toLowerCase().includes(slSearch.toLowerCase())&&!slCanciones.some(x=>x.cancion===s.n)).length===0&&(
              <div style={{padding:'12px',textAlign:'center',fontSize:'var(--fs-subtitle)',color:'var(--tx2)',width:'100%'}}>{tx.noMatchesLbl}</div>
            )}
          </div>
        </div>
        {slGuardados.length>0&&(
          <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:12}}>
            <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>
              Setlists guardados ({slGuardados.length})
            </div>
            {slGuardados.map(sl=>(
              <div key={sl.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--s1)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:'var(--fs-lg)',color:'var(--tx)'}}>{sl.nombre}</div>
                  <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginTop:2}}>
                    {sl.canciones.length} canciones · {sl.fecha}
                    {sl.eventoId&&<span style={{color:'var(--gn)',marginLeft:6}}>· Asignado ✓</span>}
                  </div>
                </div>
                <button onClick={()=>{setSlCanciones([...sl.canciones]);setSlNombre(sl.nombre);setSlGuardados(prev=>prev.filter(x=>x.id!==sl.id));onToast({text:tx.editingSetlistLbl,sub:sl.nombre});}}
                  style={{padding:'4px 10px',borderRadius:8,background:'var(--s1)',color:'var(--tx2)',fontSize:'var(--fs-subtitle)',fontWeight:700,cursor:'pointer',fontFamily:"var(--font-body)",flexShrink:0}}>
                  Editar
                </button>
                <button onClick={()=>setSlGuardados(prev=>prev.filter(x=>x.id!==sl.id))}
                  style={{width:26,height:26,borderRadius:7,background:'rgba(255,82,82,.06)',color:'var(--rd)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'var(--fs-emph)'}}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{display:'flex',gap:9}}>
          <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>{tx.cancel}</button>
          <button className="btn btn-p" style={{flex:2,justifyContent:'center'}} disabled={!slCanciones.length} onClick={guardarSetlist}>
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            {slEventoId?tx.saveAndAssignBtn:tx.saveSetlistBtn}
          </button>
        </div>
      </div>
    );
  }

  if(bsView==='equipos'){
    return(
      <div style={{position:'relative',padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90,background:'var(--bg)',minHeight:'100vh',color:'var(--tx)'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <button className="help-btn" onClick={()=>setHelpOpen('equipos')} aria-label="Ayuda">i</button>
          <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setBsView(null)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
          </div>
        </div>
        <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:2}}>
          Gestión de <span style={{color:'var(--ac)'}}>equipos</span>
        </div>
        <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:20,lineHeight:1.5}}>
          Organiza tu gente en equipos de trabajo. Agrega miembros, asigna roles y gestiona la convocatoria de cada fecha.
        </div>

        {/* ── Miembros registrados ── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>
            Miembros · {personas.length} personas
          </div>
          <button
            onClick={()=>{
              if(!equipos.length){onToast({text:tx.createTeamFirstToast});return;}
              setNuevoMiembro({nombre:'',email:'',equipoId:equipos[0].id});
            }}
            className="btn btn-g btn-xs">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Agregar miembro
          </button>
        </div>

        {/* Formulario real de nuevo miembro — reemplaza el prompt() de antes */}
        {nuevoMiembro&&(
          <div style={{padding:14,borderRadius:12,background:'var(--s1)',marginBottom:16,
            display:'flex',flexDirection:'column',gap:10}}>
            <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.newMemberLbl}</div>
            <input className="inp" placeholder={tx.fullNamePlaceholder} value={nuevoMiembro.nombre}
              onChange={e=>setNuevoMiembro(v=>({...v,nombre:e.target.value}))} autoFocus/>
            <input className="inp" placeholder="Correo (opcional)" type="email" value={nuevoMiembro.email}
              onChange={e=>setNuevoMiembro(v=>({...v,email:e.target.value}))}/>
            {equipos.length>1&&(
              <CustomSelect value={nuevoMiembro.equipoId}
                onChange={v=>setNuevoMiembro(vv=>({...vv,equipoId:v}))}
                options={equipos.map(eq=>({value:eq.id,label:eq.name}))}/>
            )}
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-g" style={{flex:1}} onClick={()=>setNuevoMiembro(null)}>{tx.cancel}</button>
              <button className="btn btn-p" style={{flex:2,justifyContent:'center'}}
                disabled={!nuevoMiembro.nombre.trim()}
                onClick={()=>{
                  const equipo=equipos.find(e=>e.id===nuevoMiembro.equipoId)||equipos[0];
                  const nombre=nuevoMiembro.nombre.trim();
                  const nuevo={id:Date.now(),name:nombre,email:nuevoMiembro.email.trim(),role:(equipo.roles||[])[0]||tx.generalLbl,foto:null};
                  const upd={...equipo,miembros:[...(equipo.miembros||[]),nuevo]};
                  setEquipos(prev=>prev.map(e=>e.id===equipo.id?upd:e));
                  persistirEquipo(upd);
                  onToast({text:tx.memberAddedToast,sub:nombre});
                  setNuevoMiembro(null);
                }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Lista desplegable de miembros con nombre completo y correo */}
        <button onClick={()=>setVerMiembros(v=>!v)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,
          padding:'10px 12px',borderRadius:'var(--rad-sm)',background:'var(--s1)',
          cursor:'pointer',marginBottom:verMiembros?8:20,fontFamily:"var(--font-body)"}}>
          <span style={{fontSize:'10px',fontWeight:400,color:'var(--tx)',flex:1,textAlign:'left'}}>
            Ver todos los miembros ({personas.length})
          </span>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--tx3)" strokeWidth="2"
            style={{transform:verMiembros?'rotate(180deg)':'none',transition:'transform .15s'}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {verMiembros && (
          <div style={{display:'flex',flexDirection:'column',marginBottom:20,borderRadius:'var(--rad-md)',
            overflow:'hidden'}}>
            {personas.map((m,i)=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',
                borderBottom:i<personas.length-1?'1px solid var(--s1)':'none',background:'var(--s1)'}}>
                {m.foto&&<img src={m.foto} alt={m.name} style={{width:26,height:26,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'var(--fs-md)',fontWeight:400,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                  <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontWeight:300,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.email?.trim()?m.email:tx.noEmailRegistered}</div>
                </div>
              </div>
            ))}
            {personas.length===0&&(
              <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontStyle:'italic',padding:'12px'}}>Agrega tu primer miembro →</div>
            )}
          </div>
        )}

        {/* ── Equipos en grid 2 columnas ── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>
            Equipos · {equipos.length}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          {equipos.map((eq,i)=>(
            <div key={eq.id}
              onClick={()=>setActiveEq(activeEq===eq.id?null:eq.id)}
              className="press-glow block-entry"
              style={{
                borderRadius:14,background:'var(--s1)',overflow:'hidden',cursor:'pointer',
                outline:activeEq===eq.id?`2px solid ${eq.color}60`:'none','--i':i,
              }}>
              {/* Card header */}
              <div style={{padding:'12px 12px 10px',display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:eq.color,flexShrink:0,boxShadow:`0 0 8px ${eq.color}80`}}/>
                <span style={{fontFamily:"var(--font-body)",fontWeight:900,fontSize:'var(--fs-md)',color:'var(--tx)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{eq.name}</span>
                <span style={{fontSize:'var(--fs-xs)',fontWeight:700,color:'var(--tx3)',flexShrink:0}}>{(eq.miembros||[]).length}</span>
              </div>
              {/* Miembros en pills */}
              <div style={{padding:'0 10px 10px',display:'flex',flexWrap:'wrap',gap:4}}>
                {(eq.miembros||[]).slice(0,4).map(m=>(
                  <div key={m.id} style={{fontSize:'var(--fs-2xs)',fontWeight:700,padding:'2px 7px',borderRadius:100,
                    background:eq.color+'18',color:eq.color,fontFamily:"var(--font-body)",whiteSpace:'nowrap'}}>
                    {m.name.split(' ')[0]}
                  </div>
                ))}
                {(eq.miembros||[]).length>4&&(
                  <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',padding:'2px 6px',fontFamily:"var(--font-body)"}}>+{(eq.miembros||[]).length-4}</div>
                )}
                {(eq.miembros||[]).length===0&&(
                  <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontStyle:'italic',fontFamily:"var(--font-body)"}}>{tx.noMembersLbl}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Detalle del equipo activo ── */}
        {activeEq&&(()=>{
          const eq=equipos.find(e=>e.id===activeEq);
          if(!eq)return null;
          return(
            <div style={{borderRadius:14,background:'var(--s1)',padding:14,marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:eq.color,boxShadow:`0 0 8px ${eq.color}80`}}/>
                <span style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-xl)',color:'var(--tx)',flex:1}}>{eq.name}</span>
                <button onClick={e=>{e.stopPropagation();setActiveEq(null);}} style={{background:'none',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-xl)',lineHeight:1}}>×</button>
              </div>
              {/* Miembros del equipo */}
              {(eq.miembros||[]).map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid var(--s1)'}}>
                  {m.foto&&<img src={m.foto} alt={m.name} style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>}
                  <span style={{flex:1,fontSize:'var(--fs-md)',fontWeight:300,color:'var(--tx)'}}>{m.name}</span>
                  <CustomSelect value={m.role} onChange={v=>{
                    const upd={...eq,miembros:(eq.miembros||[]).map(mm=>mm.id===m.id?{...mm,role:v}:mm)};
                    setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
                  }} style={{fontSize:'var(--fs-xs)',color:eq.color,background:eq.color+'12',padding:'3px 10px',borderRadius:100,fontWeight:400,width:'auto'}}
                    options={(eq.roles||[]).map(r=>({value:r,label:r}))}/>
                  <label title="Cambiar foto" style={{cursor:'pointer',flexShrink:0}}>
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{
                      const file=e.target.files?.[0];
                      if(!file)return;
                      const reader=new FileReader();
                      reader.onload=ev=>{
                        const upd={...eq,miembros:(eq.miembros||[]).map(mm=>mm.id===m.id?{...mm,foto:ev.target.result}:mm)};
                        setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));
                      };
                      reader.readAsDataURL(file);
                    }}/>
                    <div style={{width:22,height:22,borderRadius:6,background:'var(--s2)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx3)'}}>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  </label>
                  <button onClick={()=>{
                    const upd={...eq,miembros:(eq.miembros||[]).filter(mm=>mm.id!==m.id)};
                    setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
                    onToast({text:tx.removedToast,sub:m.name});
                  }} style={{width:22,height:22,borderRadius:6,background:'transparent',color:'var(--rd)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
              {/* Editar roles del equipo */}
              <div style={{marginTop:12,padding:'10px 0',borderTop:'1px solid var(--s3)'}}>
                <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                  letterSpacing:'1.5px',marginBottom:6,fontFamily:"var(--font-body)"}}>
                  Roles del equipo
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
                  {(eq.roles||[tx.generalLbl]).map((r,ri)=>(
                    <div key={ri} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 8px 4px 10px',
                      borderRadius:100,background:eq.color+'18',}}>
                      <span style={{fontSize:'var(--fs-sm)',fontWeight:700,color:eq.color,
                        fontFamily:"var(--font-body)"}}>{r}</span>
                      <button onClick={()=>{
                        const upd={...eq,roles:(eq.roles||[]).filter((_,j)=>j!==ri)};
                        setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
                      }} style={{width:14,height:14,borderRadius:'50%',background:'var(--bd)',color:'var(--tx3)',cursor:'pointer',
                        fontSize:'var(--fs-sm)',display:'flex',alignItems:'center',justifyContent:'center',
                        lineHeight:1}}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:6}}>
                  <input
                    placeholder={tx.newRolePlaceholder}
                    onKeyDown={e=>{
                      if(e.key==='Enter'&&e.target.value.trim()){
                        const upd={...eq,roles:[...(eq.roles||[]),e.target.value.trim()]};
                        setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
                        e.target.value='';
                      }
                    }}
                    style={{flex:1,padding:'6px 10px',borderRadius:8,background:'var(--s2)',color:'var(--tx)',fontSize:'var(--fs-base)',outline:'none',
                      fontFamily:"var(--font-body)"}}/>
                  <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",
                    display:'flex',alignItems:'center'}}>↵ Enter</div>
                </div>
              </div>
              {/* Agregar miembro al equipo */}
              <CustomSelect style={{marginTop:10,fontSize:'var(--fs-base)'}} value="" placeholder={tx.addMemberToTeamPlaceholder} onChange={v=>{
                if(!v)return;
                const persona=personas.find(m=>String(m.id)===String(v));
                if(!persona)return;
                const ya=(eq.miembros||[]).find(em=>em.id===persona.id);
                const upd={...eq,miembros:ya?(eq.miembros||[]):[...(eq.miembros||[]),{id:persona.id,name:persona.name,role:(eq.roles||[])[0]||tx.generalLbl,foto:null}]};
                setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
                onToast({text:tx.addedToToast(eq.name),sub:persona.name});
              }}
                options={personas.filter(m=>!(eq.miembros||[]).find(em=>em.id===m.id)).map(m=>({value:m.id,label:m.name}))}/>
            </div>
          );
        })()}

        {/* ── Crear nuevo equipo ── */}
        <div style={{padding:14,borderRadius:14,background:'var(--s1)',}}>
          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:10}}>{tx.createNewTeamLbl}</div>
          <input className="inp" placeholder={tx.teamNamePlaceholder} value={nuevaBanda} onChange={e=>setNuevaBanda(e.target.value)} style={{marginBottom:8}}/>
          <input className="inp" placeholder="Roles separados por coma (ej: Líder, Músico, Técnico)" value={nuevosRoles} onChange={e=>setNuevosRoles(e.target.value)} style={{marginBottom:8}}/>
          <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",marginBottom:8}}>
            Los roles se asignan a cada miembro del equipo. Se pueden editar después.
          </div>
          <button className="btn btn-p btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={()=>{
            if(!nuevaBanda.trim())return;
            const colores=['#EE227D','#30C0B7','#FD8083','#7b68ee','#5ecea0','#e07820'];
            const color=colores[equipos.length%colores.length];
            const roles=nuevosRoles.trim()
              ?nuevosRoles.split(',').map(r=>r.trim()).filter(Boolean)
              :[tx.generalLbl,tx.leaderLbl];
            const nuevoEq={id:`eq${Date.now()}`,name:nuevaBanda.trim(),color,roles,miembros:[]};
            setEquipos(prev=>[...prev,nuevoEq]);persistirEquipo(nuevoEq);
            onToast({text:tx.teamCreatedToast,sub:nuevaBanda});setNuevaBanda('');setNuevosRoles('');
          }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Crear equipo
          </button>
        </div>
        {helpOpen==='equipos'&&<HelpModal/>}
      </div>
    );
  }


  // ── DELEGAR PERMISOS ──
  if(bsView==='permisos')return(
    <div style={{position:'relative',padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90,background:'var(--bg)',minHeight:'100vh',color:'var(--tx)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
        <button className="help-btn" onClick={()=>setHelpOpen('permisos')} aria-label="Ayuda">i</button>
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
        </div>
      </div>
      <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:2}}>
        Delegar <span style={{color:'var(--ac)'}}>permisos</span>
      </div>
      <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.5,marginBottom:20}}>
        Asigna líderes para que gestionen su área sin necesitar tu aprobación.
      </div>

      {/* Líderes actuales */}
      {lideresActuales.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:12}}>{tx.activeLeadersLbl}</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {lideresActuales.map((l,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:12,background:'var(--s1)',}}>
                {/* Avatar coloreado por persona — determinístico, sin gradiente */}
                <div style={{width:36,height:36,borderRadius:10,background:`${colorForName(l.name)}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'var(--fs-base)',fontWeight:900,color:colorForName(l.name),flexShrink:0,fontFamily:"var(--font-body)"}}>
                  {l.av}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:'var(--fs-lg)',color:'var(--tx)'}}>{l.name}</div>
                  <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginBottom:6,marginTop:1}}>{l.rol}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {l.permisos.map(p=>(
                      <span key={p} style={{fontSize:'var(--fs-xs)',padding:'2px 8px',borderRadius:100,background:'rgba(var(--gn-rgb),.08)',color:'var(--gn)',fontWeight:700,fontFamily:"var(--font-body)"}}>{p}</span>
                    ))}
                  </div>
                </div>
                <button onClick={()=>setLideresActuales(v=>v.filter((_,j)=>j!==i))}
                  style={{width:28,height:28,borderRadius:8,background:'rgba(var(--rd-rgb),.06)',color:'var(--rd)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agregar nuevo líder */}
      <div style={{padding:'16px 14px',borderRadius:14,background:'var(--s1)',}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:14}}>{tx.addLeaderLbl}</div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:'var(--fs-xs)',fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:6}}>{tx.memberFieldLbl}</div>
          <CustomSelect value={selectedIntegrante} onChange={setSelectedIntegrante}
            placeholder={tx.selectPlaceholderLbl}
            options={personas.filter(p=>!lideresActuales.find(l=>l.name===p.name)).map(p=>({value:p.id,label:p.name}))}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:'var(--fs-xs)',fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>{tx.permissionsLbl}</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {[
              {id:'setlist',label:tx.permEditSetlist,desc:tx.permEditSetlistDesc},
              {id:'convocar',label:tx.permCallTeam,desc:tx.permCallTeamDesc},
              {id:'notif',label:tx.permSendNotif,desc:tx.permSendNotifDesc},
              {id:'itinerario',label:tx.permEditItinerary,desc:tx.permEditItineraryDesc},
              {id:'equipos',label:tx.permManageTeams,desc:tx.permManageTeamsDesc},
              {id:'pastor',label:tx.permPastorWord,desc:tx.permPastorWordDesc},
              {id:'backstage_view',label:tx.permViewBackstage,desc:tx.permViewBackstageDesc},
            ].map(perm=>{
              const isOn=selectedPermisos.includes(perm.id);
              return(
                <label key={perm.id}
                  onClick={()=>setSelectedPermisos(prev=>isOn?prev.filter(x=>x!==perm.id):[...prev,perm.id])}
                  style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',
                    padding:'9px 10px',borderRadius:8,
                    background:isOn?'rgba(var(--gn-rgb),.06)':'transparent',
                    transition:'all .15s'}}>
                  <div style={{width:18,height:18,borderRadius:5,
                    background:isOn?'var(--gn)':'var(--s2)',
                    flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                    transition:'all .15s'}}>
                    {isOn&&<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'var(--fs-md)',fontWeight:700,color:isOn?'var(--tx)':'var(--tx2)'}}>{perm.label}</div>
                    <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',marginTop:1,fontFamily:"var(--font-body)"}}>{perm.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        <button className="btn btn-live" style={{width:'100%',justifyContent:'center'}}
          onClick={()=>{
            const p=personas.find(x=>String(x.id)===selectedIntegrante);
            if(!p){onToast({text:tx.selectMemberToast,sub:''});return;}
            if(selectedPermisos.length===0){onToast({text:tx.selectAtLeastOnePermToast,sub:''});return;}
            setLideresActuales(prev=>[...prev,{name:p.name,av:p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),rol:tx.leaderLbl,permisos:selectedPermisos.map(id=>id.replace('_',' '))}]);
            setSelectedPermisos([]);setSelectedIntegrante('');
            onToast({text:tx.leaderAddedToast,sub:p.name});
          }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          Guardar líder
        </button>
      </div>
      {helpOpen==='permisos'&&<HelpModal/>}
    </div>
  );

  if(bsView==='notif')return(
    <div style={{position:'relative',padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
        <button className="help-btn" onClick={()=>setHelpOpen('notif')} aria-label="Ayuda">i</button>
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
        </div>
      </div>
      <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:4}}>{tx.notificationsTitleLbl}</div>
      <div style={{fontSize:'var(--fs-lg)',color:'var(--tx2)',lineHeight:1.5,marginBottom:18}}>Envía mensajes directos a tu equipo. Sin WhatsApp, sin emails perdidos. </div>
      <div className="card" style={{paddingTop:28,paddingBottom:28,paddingLeft:24,paddingRight:24,marginBottom:12}}>
        <div style={{fontWeight:900,fontSize:'var(--fs-emph)',color:'var(--tx)',marginBottom:12}}>¿A quién?</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
          {[tx.wholeTeamLbl,...equipos.map(e=>e.name)].map(dest=>(
            <button key={dest} onClick={()=>setNotifDest(d=>d.includes(dest)?d.filter(x=>x!==dest):[...d,dest])} style={{padding:'6px 12px',borderRadius:100,cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)",background:notifDest.includes(dest)?'rgba(200,169,126,.1)':'var(--s1)',color:notifDest.includes(dest)?'var(--ac)':'var(--tx2)'}}>{dest}</button>
          ))}
        </div>
      </div>
      <div className="card" style={{paddingTop:28,paddingBottom:28,paddingLeft:24,paddingRight:24,marginBottom:12}}>
        <div style={{fontWeight:900,fontSize:'var(--fs-emph)',color:'var(--tx)',marginBottom:12}}>{tx.alertTypeLbl}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[{id:'recordatorio',label:tx.reminderLbl,color:'#c8a97e',icon:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>},
            {id:'cambio',label:tx.setlistChangeLbl,color:'var(--gn)',icon:<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>},
            {id:'urgente',label:tx.urgentLbl,color:'var(--rd)',icon:<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>},
            {id:'general',label:tx.generalLbl,color:'#7dd3c0',icon:<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}].map(t=>(
            <button key={t.id} onClick={()=>setNotifTipo(t.id)} style={{padding:'10px',borderRadius:10,cursor:'pointer',textAlign:'left',background:notifTipo===t.id?`${t.color}14`:'var(--s1)',fontFamily:"var(--font-body)"}}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={t.color} strokeWidth="1.8" style={{marginBottom:6,display:'block'}}>{t.icon}</svg>
              <div style={{fontSize:'var(--fs-md)',fontWeight:700,color:notifTipo===t.id?t.color:'var(--tx)'}}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{paddingTop:28,paddingBottom:28,paddingLeft:24,paddingRight:24,marginBottom:16}}>
        <div style={{fontWeight:900,fontSize:'var(--fs-emph)',color:'var(--tx)',marginBottom:10}}>{tx.messageLbl}</div>
        <textarea className="inp" placeholder="Ej: Hola equipo, este domingo llegamos a las 9:00am. ¡Los esperamos!" value={notifMsg} onChange={e=>setNotifMsg(e.target.value)} style={{minHeight:90,resize:'vertical',lineHeight:1.6,fontSize:'var(--fs-md)'}}/>
      </div>
      <button onClick={()=>setNotifCorreo(v=>!v)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:10,marginBottom:16,cursor:'pointer',background:notifCorreo?'rgba(200,169,126,.08)':'var(--s1)'}}>
        <div style={{width:18,height:18,borderRadius:5,background:notifCorreo?'var(--ac)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {notifCorreo&&<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--bg)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={notifCorreo?'var(--ac)':'var(--tx3)'} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg>
        <span style={{fontSize:'var(--fs-md)',fontWeight:700,color:notifCorreo?'var(--ac)':'var(--tx2)',textAlign:'left',flex:1}}>{tx.alsoAddByEmailLbl}</span>
      </button>
      <div style={{display:'flex',gap:9}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>{tx.cancel}</button>
        <button className="btn btn-p" style={{flex:2}} disabled={!notifMsg.trim()||!notifDest.length} onClick={()=>{onToast({text:tx.notifSentToast,sub:notifCorreo?`${notifDest.join(', ')} · app y correo`:notifDest.join(', ')});setBsView(null);}}>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar
        </button>
      </div>
      {helpOpen==='notif'&&<HelpModal/>}
    </div>
  );

  // ── PERSONALIZACIÓN ──
  if(bsView==='personalizar')return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
      </div>
      <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.1,marginBottom:3}}>{tx.navPersonalizationLbl}</div>
      <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4,marginBottom:16}}>{tx.personalizationSubLbl}</div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:12}}>
        <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>{tx.myOrgLbl}</div>
        <input className="inp" placeholder={tx.orgNamePlaceholder} style={{marginBottom:8}} defaultValue="Iglesia"/>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <input className="inp" placeholder={tx.cityPlaceholder} style={{flex:1}}/>
          <CustomSelect value={orgPais} onChange={setOrgPais} style={{flex:1}}
            options={tx.countriesList.map(p=>({value:p,label:p}))}/>
        </div>
        <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8,marginTop:4}}>{tx.logoFieldLbl}</div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:56,height:56,borderRadius:12,background:'rgba(200,169,126,.05)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,cursor:'pointer',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--tx3)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9l4-4 4 4 4-4 4 4"/><circle cx="8.5" cy="14.5" r="2"/><path d="M21 15l-5-5-5 6"/></svg>
            <span style={{fontSize:'var(--fs-3xs)',color:'var(--tx3)',fontWeight:700}}>{tx.logoFieldLbl}</span>
          </div>
          <div>
            <div style={{fontSize:'var(--fs-md)',color:'var(--tx2)',lineHeight:1.6}}>PNG o SVG · 512×512px recomendado</div>
            <button style={{marginTop:6,padding:'4px 10px',borderRadius:7,background:'var(--s1)',color:'var(--tx2)',fontSize:'var(--fs-subtitle)',fontWeight:700,cursor:'pointer',fontFamily:"var(--font-body)"}}>{tx.selectFileBtn}</button>
          </div>
        </div>
      </div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:12}}>
        <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>{tx.visualThemeLbl}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
          {[
            {id:'grafite',  label:tx.themeGrafiteLbl,  sub:tx.themeGrafiteSub,
              bg:'linear-gradient(135deg,#1F1F1F 0%,#161616 100%)',
              preview:['#1F1F1F','#AFFA01','#2D5BFF']},
            {id:'abyssal', label:tx.themeAbyssalLbl, sub:tx.themeAbyssalSub,
              bg:'linear-gradient(135deg,#1B2632 0%,#141c26 100%)',
              preview:['#1B2632','#FFB162','#A35139']},
            {id:'brasa', label:tx.themeBrasaLbl, sub:tx.themeBrasaSub,
              bg:'linear-gradient(135deg,#161616 0%,#0f0f0f 100%)',
              preview:['#161616','#FFE7D0','#FC6E20']},
            {id:'midnight', label:tx.themeMidnightLbl, sub:tx.themeMidnightSub,
              bg:'linear-gradient(135deg,#1F2D33 0%,#182228 100%)',
              preview:['#1F2D33','#F56E0F','#FEBE10']},
            {id:'blue-lava', label:tx.themeBlueLavaLbl, sub:tx.themeBlueLavaSub,
              bg:'linear-gradient(135deg,#EEE9DF 0%,#e2ddd1 100%)',
              preview:['#EEE9DF','#2C3B4D','#F56E0F']},
          ].map(th=>(
            <div key={th.id} onClick={()=>{onSetTheme(th.id);onToast({text:tx.themeAppliedToast,sub:th.label});}}
              style={{borderRadius:12,cursor:'pointer',overflow:'hidden',transition:'all .2s',
                      boxShadow:onGetTheme()===th.id?'0 0 0 2px var(--ac),0 4px 20px rgba(0,0,0,.4)':'none'}}>
              <div style={{height:64,background:th.bg,position:'relative',display:'flex',alignItems:'flex-end',padding:'0 8px 8px'}}>
                <div style={{display:'flex',gap:4}}>
                  {th.preview.map((c,i)=>(
                    <div key={i} style={{width:16,height:16,borderRadius:3,background:c,
                                         boxShadow:'0 1px 4px rgba(0,0,0,.4)'}}/>
                  ))}
                </div>
                {onGetTheme()===th.id&&(
                  <div style={{position:'absolute',top:6,right:6,width:20,height:20,borderRadius:'50%',
                               background:'var(--ov-modal)',backdropFilter:'blur(4px)',
                               display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </div>
              <div style={{padding:'8px 10px',background:'var(--s1)'}}>
                <div style={{fontSize:'var(--fs-base)',fontWeight:900,color:'var(--tx)',fontFamily:"var(--font-body)"}}>{th.label}</div>
                <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',marginTop:2}}>{th.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:12}}>
        <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>{tx.languageLbl}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {LANGS.map(l=>(
            <button key={l.code} onClick={()=>onLangChange&&onLangChange(l.code)}
              style={{padding:'9px 6px',borderRadius:10,
                background:lang===l.code?'rgba(200,169,126,.1)':'transparent',
                color:lang===l.code?'var(--ac)':'var(--tx3)',
                fontSize:'var(--fs-sm)',fontWeight:700,cursor:'pointer',fontFamily:"var(--font-body)",
                display:'flex',alignItems:'center',gap:6}}>
              <span style={{lineHeight:1.2}}>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );

    // ── MENÚ PRINCIPAL BACKSTAGE ──
  const ItemIcon=({icon})=>{
    const props={viewBox:"0 0 24 24",width:18,height:18,fill:"none",stroke:"var(--ac)",strokeWidth:1.8};
    if(icon==='calendar')return(<svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    if(icon==='music')return(<svg {...props}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>);
    if(icon==='team')return(<svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    if(icon==='shield')return(<svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>);
    if(icon==='bell')return(<svg {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>);
    if(icon==='settings')return(<svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
    if(icon==='book')return(<svg {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>);
    return null;
  };

  // ── PALABRA DEL PASTOR ──
  if(bsView==='pastor')return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
      </div>
      <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:3}}>
        Palabra del <span style={{color:'var(--ac)'}}>{tx.pastorScreenTitleLbl}</span>
      </div>
      <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4,marginBottom:20}}>{tx.pastorSubLbl}</div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <div style={{width:24,height:24,borderRadius:7,background:'rgba(200,169,126,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#c8a97e" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.sundayVerseLbl}</div>
        </div>
        <input className="inp" placeholder="Ej: Juan 3:16" style={{marginBottom:8}}
          value={pastorVersiculo||''} onChange={e=>setPastorVersiculo(e.target.value)}/>
        <textarea className="inp" placeholder={tx.versePlaceholder}
          rows={4} style={{width:'100%',resize:'vertical',fontFamily:"var(--font-body)",fontSize:'var(--fs-lg)',lineHeight:1.6}}
          value={pastorTexto||''} onChange={e=>setPastorTexto(e.target.value)}/>
      </div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <div style={{width:24,height:24,borderRadius:7,background:'rgba(var(--gn-rgb),.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--gn)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
          </div>
          <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.messageNotesLbl}</div>
        </div>
        <textarea className="inp" placeholder="Título del mensaje, puntos principales, notas para el equipo..."
          rows={5} style={{width:'100%',resize:'vertical',fontFamily:"var(--font-body)",fontSize:'var(--fs-lg)',lineHeight:1.6}}
          value={pastorNotas||''} onChange={e=>setPastorNotas(e.target.value)}/>
      </div>
      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <div style={{width:24,height:24,borderRadius:7,background:'rgba(var(--rd-rgb),.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--rd)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.mediaFilesLbl}</div>
        </div>
        <div style={{fontSize:'var(--fs-base)',color:'var(--tx2)',marginBottom:12,lineHeight:1.6}}>PPT, imágenes o PDF que el equipo de proyecciones necesita para el servicio.</div>
        <label style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:10,background:'rgba(var(--rd-rgb),.04)',cursor:'pointer',transition:'all .2s'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(var(--rd-rgb),.08)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(var(--rd-rgb),.04)'}>
          <input type="file" accept=".ppt,.pptx,.pdf,.jpg,.jpeg,.png,.gif" multiple style={{display:'none'}}
            onChange={e=>{
              const files=Array.from(e.target.files||[]);
              if(files.length) onToast({text:`${files.length} archivo${files.length>1?'s':''} listo${files.length>1?'s':''}`,sub:tx.mediaTeamCanSeeIt});
            }}/>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--rd)" strokeWidth="1.8">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div>
            <div style={{fontSize:'var(--fs-md)',fontWeight:700,color:'var(--rd)'}}>{tx.uploadFilesLbl}</div>
            <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginTop:2}}>PPT · PDF · Imágenes</div>
          </div>
        </label>
      </div>
      <div style={{display:'flex',gap:8,marginTop:4}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>{tx.cancel}</button>
        <button className="btn btn-p" style={{flex:2}} onClick={()=>{onToast({text:tx.savedToast,sub:tx.pastorWordUpdatedToast});setBsView(null);}}>
          Guardar
        </button>
      </div>
    </div>
  );

  // ── PLANES Y PRECIOS ──
  if(bsView==='planes'){
    const PLANES_PERSONAL=[
      {id:'lite',name:PLANES_SETSYNC.lite.label,mensual:PLANES_SETSYNC.lite.precioMensual,color:'#ffffff',sub:tx.liteSub,
        desc:tx.litePersonalDesc, features:tx.litePersonalFeatures},
      {id:'pro',name:PLANES_SETSYNC.pro.label,mensual:PLANES_SETSYNC.pro.precioMensual,color:'var(--gn)',sub:tx.proSub,
        desc:tx.proPersonalDesc, features:tx.proPersonalFeatures},
      {id:'premium',name:PLANES_SETSYNC.premium.label,mensual:PLANES_SETSYNC.premium.precioMensual,color:'#c8a97e',sub:tx.premiumSub,
        desc:tx.premiumPersonalDesc, features:tx.premiumPersonalFeatures},
    ];
    const BloquePlanes=({planes,activo,onElegir})=>(
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {planes.map(p=>(
          <div key={p.id} className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,
            background:activo===p.id?`${p.color}0c`:'var(--s1)'}}>
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-xl)',color:p.color,fontWeight:400}}>{p.name}</div>
              <div style={{textAlign:'right'}}>
                <span style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-xl)',color:'var(--tx)'}}>
                  {p.mensual===0?tx.freeLbl:`$${p.mensual}`}
                </span>
                {p.mensual>0&&<span style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)"}}> {tx.perMonthLbl}</span>}
              </div>
            </div>
            <div style={{fontSize:'var(--fs-xs)',color:p.color,fontFamily:"var(--font-body)",fontWeight:700,opacity:.75,textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>{p.sub}</div>
            <div style={{fontSize:'var(--fs-base)',color:'var(--tx2)',lineHeight:1.6,marginBottom:10,fontFamily:"var(--font-body)",fontWeight:300}}>{p.desc}</div>
            <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:10}}>
              {p.features.map(f=>(
                <div key={f} style={{display:'flex',alignItems:'flex-start',gap:6}}>
                  <span style={{color:p.color,fontSize:'var(--fs-sm)',marginTop:1,flexShrink:0}}>✓</span>
                  <span style={{fontSize:'var(--fs-base)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontWeight:300,lineHeight:1.5}}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>onElegir(p)} disabled={activo===p.id}
              style={{width:'100%',padding:'8px 10px',borderRadius:8,cursor:activo===p.id?'default':'pointer',
                background:activo===p.id?'var(--s3)':`${p.color}20`,color:activo===p.id?'var(--tx3)':p.color,
                fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)"}}>
              {activo===p.id?tx.currentPlanBtn:tx.chooseBtn}
            </button>
          </div>
        ))}
      </div>
    );
    return(
      <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
        </div>
        <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:3}}>
          {tx.plansAndPricesTitle}
        </div>
        <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4,marginBottom:14}}>
          {tx.plansIntro}
        </div>
        <button onClick={()=>setFaqPlanesOpen(v=>!v)}
          style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:100,
            background:faqPlanesOpen?'var(--s2)':'var(--s1)',cursor:'pointer',marginBottom:22}}>
          <span style={{fontSize:'var(--fs-base)'}}>❓</span>
          <span style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-base)',fontWeight:700,color:'var(--tx2)'}}>Preguntas frecuentes</span>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--tx3)" strokeWidth="2"
            style={{transform:faqPlanesOpen?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {faqPlanesOpen && (
          <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:22,background:'var(--s1)'}}>
            {FAQS_PLANES.map((faq,i)=>(
              <div key={i} style={{borderBottom:i<FAQS_PLANES.length-1?'1px solid var(--s2)':'none'}}>
                <button onClick={()=>setFaqPlanesAbiertas(v=>({...v,[i]:!v[i]}))}
                  style={{width:'100%',background:'none',textAlign:'left',
                    padding:'10px 0',cursor:'pointer',display:'flex',alignItems:'center',
                    justifyContent:'space-between',gap:8}}>
                  <span style={{fontFamily:"var(--font-body)",fontSize:'10px',fontWeight:400,
                    color:'var(--tx)',lineHeight:1.4}}>{faq.q}</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)"
                    strokeWidth="2" style={{flexShrink:0,transform:faqPlanesAbiertas[i]?'rotate(180deg)':'rotate(0)',transition:'transform .2s'}}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {faqPlanesAbiertas[i]&&(
                  <div style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-base)',color:'var(--tx2)',
                    fontWeight:300,lineHeight:1.7,paddingBottom:10}}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:4}}>{tx.personalAccountLbl}</div>
        <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontWeight:300,lineHeight:1.5,marginBottom:12}}>
          {tx.personalAccountDesc}
        </div>
        <div>
          <BloquePlanes planes={PLANES_PERSONAL}
            activo={viaEquipo?null:planId}
            onElegir={p=>{setPlanId(p.id);onToast({text:tx.planUpdatedToast,sub:p.name});}}/>
        </div>
      </div>
    );
  }

  // ── CUENTA EQUIPO (v92) — antes vivía adentro de Planes y Precios; ahora
  // es su propio bloque de Backstage, con fondo verde para diferenciarse
  // del resto (pedido explícito de Danny). Acá se administra el equipo
  // YA activo (miembros, tramo, cancelar) o se activa uno nuevo si todavía
  // no existe — todo lo de pagos/facturación de Cuenta Equipo vive acá.
  if(bsView==='cuentaequipo'){
    const numPersonasEquipo = personas.length||1;
    const coloresEquipo={'eq-1-10':'var(--gn)','eq-11-25':'var(--ac)','eq-26-35':'#a78bfa','eq-36+':'var(--tx3)'};
    const PLANES_EQUIPO=TRAMOS_EQUIPO.map(t=>({
      id:t.id,
      name:t.label,
      mensual:precioTramoEquipo(t.id,numPersonasEquipo),
      esDesde:t.id==='eq-36+',
      color:coloresEquipo[t.id],
      sub:tx.teamSub,
      desc:tx.teamAccountDesc,
      features:t.marcaBlanca?[...tx.teamFeaturesBase,tx.whiteLabelIncluded]:tx.teamFeaturesBase,
    }));
    const BloquePlanesEquipo=({planes,activo,onElegir})=>(
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {planes.map(p=>(
          <div key={p.id} className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,
            background:activo===p.id?`${p.color}0c`:'var(--s1)'}}>
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-xl)',color:p.color,fontWeight:400}}>{p.name}</div>
              <div style={{textAlign:'right'}}>
                <span style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-xl)',color:'var(--tx)'}}>
                  {p.esDesde?tx.fromLbl+' ':''}${p.mensual}
                </span>
                <span style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)"}}> {tx.perMonthLbl}</span>
              </div>
            </div>
            <div style={{fontSize:'var(--fs-xs)',color:p.color,fontFamily:"var(--font-body)",fontWeight:700,opacity:.75,textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>{p.sub}</div>
            <div style={{fontSize:'var(--fs-base)',color:'var(--tx2)',lineHeight:1.6,marginBottom:10,fontFamily:"var(--font-body)",fontWeight:300}}>{p.desc}</div>
            <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:10}}>
              {p.features.map(f=>(
                <div key={f} style={{display:'flex',alignItems:'flex-start',gap:6}}>
                  <span style={{color:p.color,fontSize:'var(--fs-sm)',marginTop:1,flexShrink:0}}>✓</span>
                  <span style={{fontSize:'var(--fs-base)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontWeight:300,lineHeight:1.5}}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>onElegir(p)}
              style={{width:'100%',padding:'8px 10px',borderRadius:8,cursor:'pointer',
                background:`${p.color}20`,color:p.color,
                fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)"}}>
              {tx.activateBtn}
            </button>
          </div>
        ))}
      </div>
    );
    return(
      <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90,background:'var(--bg)',minHeight:'100vh',color:'var(--tx)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
        </div>
        <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:3}}>
          Cuenta <span style={{color:'var(--gn)'}}>Equipo</span>
        </div>
        <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4,marginBottom:18}}>
          {tx.teamAccountDesc}
        </div>

        {misOrgsAdmin.length>1&&(
          <div style={{marginBottom:10}}>
            <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
              Administras {misOrgsAdmin.length} equipos
            </div>
            <CustomSelect value={orgQueAdministro?.id} onChange={setOrgAdminSeleccionadoId}
              options={misOrgsAdmin.map(o=>({value:o.id,label:`${TRAMOS_EQUIPO.find(t=>t.id===o.tramoId)?.label||o.tramoId} · ${o.estado}`}))}/>
          </div>
        )}
        {orgQueAdministro ? (
          // Soy admin de un equipo real (Firestore) — gestión completa.
          <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,background:'var(--s1)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:'var(--fs-xl)',color:'var(--gn)',fontWeight:400}}>
                {TRAMOS_EQUIPO.find(t=>t.id===orgQueAdministro.tramoId)?.label||orgQueAdministro.tramoId}
              </div>
              <span style={{fontSize:'var(--fs-2xs)',fontWeight:900,textTransform:'uppercase',letterSpacing:'1px',
                padding:'3px 9px',borderRadius:100,
                color:orgQueAdministro.estado==='activa'?'var(--gn)':orgQueAdministro.estado==='gracia'?'#f5a623':'#e5484d',
                background:orgQueAdministro.estado==='activa'?'rgba(var(--gn-rgb),.12)':orgQueAdministro.estado==='gracia'?'#f5a62320':'#e5484d20'}}>
                {orgQueAdministro.estado==='activa'?'Activa':orgQueAdministro.estado==='gracia'?'En gracia':'Vencida'}
              </span>
            </div>
            {orgQueAdministro.estado==='gracia'&&orgQueAdministro.fechaLimiteGracia&&(
              <div style={{fontSize:'var(--fs-xs)',color:'#f5a623',fontFamily:"var(--font-body)",marginBottom:10}}>
                Regulariza el pago antes del {new Date(orgQueAdministro.fechaLimiteGracia).toLocaleDateString('es-CL')}, o el equipo vuelve a plan individual.
              </div>
            )}
            <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
              Miembros ({miembrosOrgAdmin.length})
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:10}}>
              {miembrosOrgAdmin.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:8,background:'var(--s2)'}}>
                  <div style={{flex:1,minWidth:0,fontSize:'var(--fs-base)',color:'var(--tx)',fontFamily:"var(--font-body)",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.email}</div>
                  <span style={{fontSize:'var(--fs-3xs)',fontWeight:700,color:m.estado==='activo'?'var(--gn)':'var(--tx3)',
                    textTransform:'uppercase',letterSpacing:'.5px',flexShrink:0}}>{m.estado==='activo'?'Activo':'Pendiente'}</span>
                  {m.uid!==orgQueAdministro.adminUid&&(
                    <button onClick={()=>quitarMiembroOrg(m.id)}
                      style={{background:'none',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-sm)',padding:2,flexShrink:0}}>✕</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:6}}>
              <input value={emailNuevoMiembro} onChange={e=>setEmailNuevoMiembro(e.target.value)}
                placeholder="correo@ejemplo.com" type="email"
                style={{flex:1,padding:'8px 10px',borderRadius:8,background:'var(--bg)',color:'var(--tx)',fontSize:'var(--fs-base)',fontFamily:"var(--font-body)"}}/>
              <button onClick={()=>{
                  const email=emailNuevoMiembro.trim();
                  if(!email||!email.includes('@')) return;
                  agregarMiembroOrg(orgQueAdministro.id, email);
                  setEmailNuevoMiembro('');
                  onToast({text:'Miembro agregado',sub:email});
                }}
                style={{padding:'8px 14px',borderRadius:8,background:'var(--gn)',color:'#04120f',fontWeight:700,fontSize:'var(--fs-base)',fontFamily:"var(--font-body)",cursor:'pointer'}}>
                Agregar
              </button>
            </div>

            {/* ── Cambiar tramo (v91) — self-service, solo toca tramoId ── */}
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--s3)'}}>
              <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
                Cambiar tramo
              </div>
              <div style={{display:'flex',gap:6}}>
                <CustomSelect value={tramoSeleccion||orgQueAdministro.tramoId} onChange={setTramoSeleccion}
                  style={{flex:1,fontSize:'var(--fs-base)'}}
                  options={TRAMOS_EQUIPO.map(t=>({value:t.id,label:`${t.label} · $${precioTramoEquipo(t.id,miembrosOrgAdmin.length||1)}/mes`}))}/>
                <button
                  disabled={!tramoSeleccion||tramoSeleccion===orgQueAdministro.tramoId}
                  onClick={async()=>{
                    await actualizarTramoOrg(orgQueAdministro.id, tramoSeleccion);
                    onToast({text:'Tramo actualizado',sub:TRAMOS_EQUIPO.find(t=>t.id===tramoSeleccion)?.label});
                    setTramoSeleccion('');
                  }}
                  style={{padding:'8px 14px',borderRadius:8,background:(!tramoSeleccion||tramoSeleccion===orgQueAdministro.tramoId)?'var(--s2)':'var(--gn)',
                    color:(!tramoSeleccion||tramoSeleccion===orgQueAdministro.tramoId)?'var(--tx3)':'#04120f',
                    fontWeight:700,fontSize:'var(--fs-base)',fontFamily:"var(--font-body)",
                    cursor:(!tramoSeleccion||tramoSeleccion===orgQueAdministro.tramoId)?'default':'pointer',flexShrink:0}}>
                  Guardar
                </button>
              </div>
              <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",marginTop:6,lineHeight:1.5}}>
                El nuevo precio aplica desde el próximo cobro. No necesitas avisarnos — se ajusta solo.
              </div>
            </div>

            {/* ── Cancelar Cuenta Equipo (v91) — solo pasa a 'cancelada',      ── */}
            {/* nunca reactiva por sí sola. Confirmación en 2 pasos, sin      */}
            {/* window.confirm() nativo (consistente con el resto de la app). */}
            <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--s3)'}}>
              {!confirmandoCancelar ? (
                <button onClick={()=>setConfirmandoCancelar(true)}
                  style={{background:'none',color:'var(--rd)',fontSize:'var(--fs-xs)',
                    fontWeight:700,cursor:'pointer',fontFamily:"var(--font-body)",padding:0,opacity:.75}}>
                  Cancelar Cuenta Equipo
                </button>
              ):(
                <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(var(--rd-rgb),.06)'}}>
                  <div style={{fontSize:'var(--fs-base)',color:'var(--tx)',fontFamily:"var(--font-body)",fontWeight:700,marginBottom:2}}>
                    ¿Seguro que quieres cancelar?
                  </div>
                  <div style={{fontSize:'var(--fs-xs)',color:'var(--tx2)',fontFamily:"var(--font-body)",lineHeight:1.5,marginBottom:10}}>
                    Todos los miembros ({miembrosOrgAdmin.length}) vuelven a su plan individual de inmediato. Puedes volver a activar una Cuenta Equipo cuando quieras.
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>setConfirmandoCancelar(false)} disabled={cancelandoOrg}
                      style={{flex:1,padding:'7px 0',borderRadius:8,background:'var(--s1)',color:'var(--tx2)',fontWeight:700,fontSize:'var(--fs-base)',fontFamily:"var(--font-body)",cursor:'pointer'}}>
                      No, mantener
                    </button>
                    <button disabled={cancelandoOrg}
                      onClick={async()=>{
                        setCancelandoOrg(true);
                        await cancelarOrg(orgQueAdministro.id);
                        setCancelandoOrg(false);
                        setConfirmandoCancelar(false);
                        onToast({text:'Cuenta Equipo cancelada',sub:'Los miembros vuelven a su plan individual'});
                      }}
                      style={{flex:1,padding:'7px 0',borderRadius:8,background:'var(--rd)',color:'#fff',fontWeight:700,fontSize:'var(--fs-base)',fontFamily:"var(--font-body)",cursor:'pointer'}}>
                      {cancelandoOrg?'Cancelando…':'Sí, cancelar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : viaEquipo ? (
          // Pertenezco a un equipo, pero no soy el admin — sin controles.
          <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,background:'var(--s1)'}}>
            <div style={{fontSize:'var(--fs-base)',color:'var(--tx2)',fontFamily:"var(--font-body)",lineHeight:1.6}}>
              Ya formas parte de una Cuenta Equipo — tienes acceso Premium completo. Solo quien la contrató puede agregar o quitar miembros.
            </div>
          </div>
        ) : (
          // Sin equipo todavía — activar crea el org real en Firestore.
          <BloquePlanesEquipo planes={PLANES_EQUIPO}
            activo={null}
            onElegir={async p=>{
              if(creandoOrg) return;
              if(!currentUser?.uid){ onToast({text:'Inicia sesión para activar la Cuenta Equipo'}); return; }
              setCreandoOrg(true);
              await crearOrg({adminUid:currentUser.uid, adminEmail:currentUser.email, tramoId:p.id});
              setCreandoOrg(false);
              onToast({text:tx.teamActivatedToast,sub:p.name});
            }}/>
        )}
      </div>
    );
  }

  // ── ULTRA ADMIN (v91) — SOLO Danny. Gate doble: el ítem de menú que
  // lleva acá ni siquiera se renderiza para nadie más (ver ITEMS más
  // abajo), y esto es una segunda capa por si alguien fuerza bsView vía
  // devtools — sin ser el dueño, subscribeTodosLosOrgs igual vuelve vacío
  // porque Firestore Rules rechaza la lectura para cualquier otro uid.
  if(bsView==='ultraadmin'){
    if(!esDueñoPlataforma)return(
      <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
        </div>
        <div style={{fontSize:'var(--fs-lg)',color:'var(--tx2)'}}>No autorizado.</div>
      </div>
    );
    const setEdicion=(orgId,campo,valor)=>setUaEdicion(prev=>({...prev,[orgId]:{...prev[orgId],[campo]:valor}}));
    const valorEdicion=(org,campo)=> uaEdicion[org.id]?.[campo] ?? org[campo] ?? '';
    return(
      <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90,background:'var(--bg)',minHeight:'100vh',color:'var(--tx)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
        </div>
        <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:3}}>
          Ultra <span style={{color:'var(--ac)'}}>Admin</span>
        </div>
        <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4,marginBottom:18}}>
          Todos los equipos de la plataforma ({todosLosOrgs.length}). Mientras no haya pasarela de pago, confirma acá manualmente cuando alguien te transfiera.
        </div>

        {todosLosOrgs.length===0&&(
          <div style={{padding:20,textAlign:'center',color:'var(--tx3)',fontFamily:"var(--font-body)"}}>Sin equipos creados todavía.</div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {todosLosOrgs.map(org=>{
            const estadoColor=org.estado==='activa'?'var(--gn)':org.estado==='gracia'?'#f5a623':'var(--tx3)';
            const dirty = uaEdicion[org.id] && Object.keys(uaEdicion[org.id]).length>0;
            return(
              <div key={org.id} className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{fontSize:'var(--fs-2xs)',fontWeight:900,textTransform:'uppercase',letterSpacing:'1px',
                    padding:'3px 9px',borderRadius:100,color:estadoColor,background:`${estadoColor}20`,flexShrink:0}}>
                    {org.estado}
                  </span>
                  <span style={{fontSize:'var(--fs-base)',fontWeight:700,color:'var(--tx)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{org.adminUid}</span>
                  <span style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',flexShrink:0}}>{TRAMOS_EQUIPO.find(t=>t.id===org.tramoId)?.label||org.tramoId}</span>
                </div>
                <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                  <CustomSelect value={valorEdicion(org,'estado')} onChange={v=>setEdicion(org.id,'estado',v)}
                    style={{flex:'1 1 140px',fontSize:'var(--fs-sm)'}}
                    options={[{value:'activa',label:'Activa'},{value:'gracia',label:'En gracia'},{value:'vencida',label:'Vencida'},{value:'cancelada',label:'Cancelada'}]}/>
                  <CustomSelect value={valorEdicion(org,'tramoId')} onChange={v=>setEdicion(org.id,'tramoId',v)}
                    style={{flex:'1 1 140px',fontSize:'var(--fs-sm)'}}
                    options={TRAMOS_EQUIPO.map(t=>({value:t.id,label:t.label}))}/>
                  {valorEdicion(org,'estado')==='gracia'&&(
                    <input type="date" value={valorEdicion(org,'fechaLimiteGracia')?new Date(valorEdicion(org,'fechaLimiteGracia')).toISOString().slice(0,10):''}
                      onChange={e=>setEdicion(org.id,'fechaLimiteGracia', e.target.value?new Date(e.target.value+'T00:00:00').getTime():null)}
                      style={{flex:'1 1 140px',padding:'6px 8px',borderRadius:8,background:'var(--s2)',color:'var(--tx)',fontSize:'var(--fs-sm)',fontFamily:"var(--font-body)"}}/>
                  )}
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button disabled={!dirty||uaGuardando===org.id}
                    onClick={async()=>{
                      setUaGuardando(org.id);
                      const edicion=uaEdicion[org.id]||{};
                      if('estado' in edicion || 'fechaLimiteGracia' in edicion){
                        await actualizarEstadoOrg(org.id, edicion.estado??org.estado, edicion.estado==='gracia'?(edicion.fechaLimiteGracia??org.fechaLimiteGracia??null):null);
                      }
                      if('tramoId' in edicion){
                        await actualizarTramoOrg(org.id, edicion.tramoId);
                      }
                      setUaEdicion(prev=>{const next={...prev};delete next[org.id];return next;});
                      setUaGuardando(null);
                      onToast({text:'Equipo actualizado',sub:org.adminUid});
                    }}
                    style={{padding:'6px 14px',borderRadius:8,background:(!dirty||uaGuardando===org.id)?'var(--s3)':'var(--ac)',
                      color:(!dirty||uaGuardando===org.id)?'var(--tx3)':'#fff',
                      fontWeight:700,fontSize:'var(--fs-sm)',fontFamily:"var(--font-body)",
                      cursor:(!dirty||uaGuardando===org.id)?'default':'pointer'}}>
                    {uaGuardando===org.id?'Guardando…':'Guardar cambios'}
                  </button>
                  {dirty&&uaGuardando!==org.id&&(
                    <button onClick={()=>setUaEdicion(prev=>{const next={...prev};delete next[org.id];return next;})}
                      style={{background:'none',color:'var(--tx3)',fontSize:'var(--fs-sm)',cursor:'pointer',fontFamily:"var(--font-body)"}}>
                      Deshacer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── CREAR ENSAYO ──
  if(bsView==='ensayo'){
    const ensayosDelEvento = ensRef ? ensayos.filter(e=>e.ref===ensRef) : [];
    const duplicarEnsayo = (en) => {
      const copia={...en,id:`ens${Date.now()}`,nombre:`${en.nombre||tx.rehearsalLbl} (copia)`};
      setEnsayos(prev=>[...prev,copia]);
      persistirEnsayo(copia);
      onToast({text:tx.rehearsalDuplicatedToast,sub:copia.nombre});
    };
    return(
    <div style={{position:'relative',padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
        <button className="help-btn" onClick={()=>setHelpOpen('ensayo')} aria-label="Ayuda">i</button>
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.backstage}</span>
        </div>
      </div>
      <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:3}}>
        Crear <span style={{color:'var(--ac)'}}>ensayo</span>
      </div>
      <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4,marginBottom:20}}>{tx.rehearsalSubLbl}</div>

      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>{tx.assignToLbl}</div>
        <CustomSelect value={ensRef} onChange={setEnsRef}
          placeholder="Sin asignar — ensayo libre"
          options={eventos.map(ev=>({value:`evento:${ev.id}`,label:`${ev.nombre} · ${ev.fecha}`}))}/>
      </div>

      {ensayosDelEvento.length>0&&(
        <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14,background:'rgba(200,169,126,.05)'}}>
          <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
            Ya hay {ensayosDelEvento.length} ensayo{ensayosDelEvento.length>1?'s':''} para este evento
          </div>
          {ensayosDelEvento.map(en=>(
            <div key={en.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0'}}>
              <span style={{flex:1,fontSize:'var(--fs-md)',color:'var(--tx)'}}>{en.nombre||tx.rehearsalLbl}</span>
              <button onClick={()=>duplicarEnsayo(en)} style={{padding:'4px 10px',borderRadius:8,background:'var(--s1)',color:'var(--tx2)',fontSize:'var(--fs-subtitle)',fontWeight:700,cursor:'pointer',fontFamily:"var(--font-body)"}}>{tx.duplicateBtn}</button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>{tx.rehearsalSetlistLbl}</div>
        <CustomSelect value={ensSetlistId} onChange={setEnsSetlistId}
          placeholder={tx.noSetlistAssignedLbl}
          options={slGuardados.map(sl=>({value:sl.id,label:`${sl.nombre} · ${sl.canciones.length} canciones`}))}/>
      </div>

      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.callTeamsLbl}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {equipos.map(eq=>{
            const activo=ensEquipos.includes(eq.id);
            return(
              <button key={eq.id} onClick={()=>setEnsEquipos(v=>activo?v.filter(x=>x!==eq.id):[...v,eq.id])}
                style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:100,cursor:'pointer',
                  background:activo?`${eq.color}12`:'var(--s1)'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:eq.color}}/>
                <span style={{fontSize:'var(--fs-base)',fontWeight:400,color:'var(--tx)'}}>{eq.name}</span>
                <span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)'}}>{(eq.miembros||[]).length}p</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:14}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.rehearsalNotesLbl}</div>
        <textarea className="inp" value={ensNotas} onChange={e=>setEnsNotas(e.target.value)}
          style={{minHeight:70,resize:'vertical',lineHeight:1.6,fontSize:'var(--fs-md)'}}
          placeholder="Ej: Repasar bloque de adoración, foco en transiciones."/>
      </div>

      <div className="card" style={{paddingTop:26,paddingBottom:26,paddingLeft:22,paddingRight:22,marginBottom:18}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>{tx.attachedFileLbl}</div>
        {ensArchivo?(
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
            borderRadius:10,background:'rgba(var(--gn-rgb),.08)',}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--gn)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span style={{flex:1,fontSize:'var(--fs-md)',color:'var(--tx)'}}>{ensArchivo}</span>
            <button onClick={()=>setEnsArchivo(null)} style={{background:'none',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-xl)'}}>×</button>
          </div>
        ):(
          <label style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:10,background:'var(--s1)',cursor:'pointer'}}>
            <input type="file" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)setEnsArchivo(f.name);}}/>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div>
              <div style={{fontSize:'var(--fs-md)',fontWeight:700,color:'var(--ac)'}}>{tx.uploadFileLbl}</div>
              <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginTop:2}}>PDF, Word o audio para el equipo</div>
            </div>
          </label>
        )}
      </div>

      <div style={{display:'flex',gap:9}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>{tx.cancel}</button>
        <button className="btn btn-p" style={{flex:2,justifyContent:'center'}} disabled={!ensEquipos.length}
          onClick={()=>{
            const sl=slGuardados.find(s=>s.id===ensSetlistId);
            const nuevo={id:`ens${Date.now()}`,ref:ensRef,setlistId:ensSetlistId,setlistNombre:sl?.nombre||'',equipos:[...ensEquipos],archivo:ensArchivo,notas:ensNotas,nombre:tx.rehearsalLbl};
            setEnsayos(prev=>[...prev,nuevo]);
            persistirEnsayo(nuevo);
            onToast({text:tx.rehearsalCreatedToast,sub:`${ensEquipos.length} equipo${ensEquipos.length>1?'s':''} convocado${ensEquipos.length>1?'s':''}`});
            setEnsRef('');setEnsSetlistId('');setEnsEquipos([]);setEnsArchivo(null);setEnsNotas('');setBsView(null);
          }}>
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Crear ensayo
        </button>
      </div>
      {helpOpen==='ensayo'&&<HelpModal/>}
    </div>
    );
  }

  const ITEMS=[
    {id:'evento',label:`Crear ${vx.evento.singular.toLowerCase()}`,sub:tx.navCreateEventSub,icon:'calendar',color:'#c8a97e',adminOnly:false,img:'/backstage/evento.jpg'},
    {id:'setlist',label:tx.navCreateSetlistLbl,sub:tx.navCreateSetlistSub,icon:'music',color:'var(--gn)',adminOnly:false,img:'/backstage/setlist.jpg'},
    {id:'ensayo',label:tx.navCreateRehearsalLbl,sub:tx.navCreateRehearsalSub,icon:'mic',color:'var(--rd)',adminOnly:false,img:'/backstage/ensayo.jpg'},
    {id:'equipos',label:tx.navTeamManagementLbl,sub:tx.navTeamManagementSub,icon:'team',color:'var(--gn)',adminOnly:true,img:'/backstage/equipos.jpg'},
    {id:'permisos',label:tx.navDelegatePermissionsLbl,sub:tx.navDelegatePermissionsSub,icon:'shield',color:'#c8a97e',adminOnly:true,img:'/backstage/permisos.jpg'},
    {id:'notif',label:tx.navNotificationsLbl,sub:tx.navNotificationsSub,icon:'bell',color:'var(--rd)',adminOnly:false,img:'/backstage/notif.jpg'},
    {id:'personalizar',label:tx.navPersonalizationLbl,sub:tx.navPersonalizationSub,icon:'settings',color:'#7dd3c0',adminOnly:false,img:'/backstage/personalizar.jpg'},
    ...(feat.cancioneroUniversal?[{id:'pastor',label:tx.navPastorWordLbl,sub:tx.navPastorWordSub,icon:'book',color:'#e0a458',adminOnly:true,img:'/backstage/pastor.jpg'}]:[]),
    {id:'cuentaequipo',label:'Cuenta Equipo',sub:'Administra tu equipo y pagos',icon:'team',color:'var(--gn)',adminOnly:false,img:'/backstage/cuentaequipo.jpg',
      bg:'rgba(var(--gn-rgb),.16)',bgGradient:'linear-gradient(115deg,transparent 32%,rgba(var(--gn-rgb),.16) 86%)'},
    {id:'planes',label:tx.navPlansLbl,sub:tx.navPlansSub,icon:'star',color:'#c8a97e',adminOnly:true,img:'/backstage/planes.jpg'},
    // Ultra Admin (v91): ni siquiera entra al array si no eres el dueño de
    // la plataforma — no es un simple "oculto por CSS", el ítem no existe.
    ...(esDueñoPlataforma?[{id:'ultraadmin',label:'Ultra Admin',sub:'Todos los equipos de la plataforma',icon:'shield',color:'var(--rd)',adminOnly:false,img:'/backstage/planes.jpg'}]:[]),
  ].filter(it=>{
    if(it.adminOnly&&!isAdmin)return false;
    return true;
  });

  // ITEM_ICONS eliminado — los bloques ahora usan imagen de fondo (it.img)
  // en vez del icono de color chico.

  return(
    <div style={{position:'relative',padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div style={{marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
          <button className="help-btn" onClick={()=>setHelpOpen('backstage')} aria-label="Ayuda">i</button>
          <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05}}>{tx.backstage}</div>
          <span style={{padding:'2px 9px',borderRadius:100,fontSize:'var(--fs-xs)',fontWeight:700,background:'rgba(200,169,126,.07)',color:'var(--ac)',fontFamily:"var(--font-body)",flexShrink:0,alignSelf:'center'}}>{isAdmin?tx.superAdminLbl:tx.leaderLbl}</span>
        </div>
        <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-subtitle)',color:'var(--tx2)',lineHeight:1.4,marginBottom:4}}>{tx.teamControlPanelLbl}</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {ITEMS.map((it,i)=>(
          <button key={it.id} onClick={()=>setBsView(it.id)}
            className="press-glow block-entry"
            style={{position:'relative',overflow:'hidden',background:it.bg||'var(--s1)',
              borderRadius:14,padding:'18px 16px',cursor:'pointer',textAlign:'left',transition:'all .18s',display:'flex',flexDirection:'column',gap:10,minHeight:104,'--i':i}}>
            {/* Imagen de fondo del bloque — sube el archivo con este mismo
                nombre a /public/backstage/ y aparece sola; hasta entonces
                el bloque queda plano y limpio sin romper nada. */}
            <img src={it.img} alt="" aria-hidden="true"
              onError={e=>{e.currentTarget.style.display='none';}}
              style={{position:'absolute',left:'-16%',bottom:'-24%',width:'78%',height:'92%',
                objectFit:'cover',opacity:.22,transform:'rotate(-13deg)',borderRadius:10,
                pointerEvents:'none'}}/>
            <div style={{position:'absolute',inset:0,
              background:it.bgGradient||'linear-gradient(115deg,transparent 32%,var(--s1) 86%)',
              pointerEvents:'none'}}/>
            <div style={{position:'relative'}}>
              <div style={{fontFamily:"var(--font-display)",fontWeight:400,color:'var(--tx)',lineHeight:1.1,fontSize:'var(--fs-xl)',marginBottom:5}}>{it.label}</div>
              <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-base)',color:'var(--tx2)',lineHeight:1.5}}>{it.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Sesión, Plan y Conexión — siempre visibles abajo ── */}
      <div style={{marginTop:20,display:'flex',flexDirection:'column',gap:8}}>

        {/* Sesión */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'12px 14px',borderRadius:12,background:'var(--s1)',
          }}>
          <div>
            <div style={{fontSize:'var(--fs-md)',fontWeight:700,color:'var(--tx)',fontFamily:"var(--font-body)"}}>
              Daniel Miranda
            </div>
            <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontFamily:"var(--font-body)",marginTop:2}}>
              dmiranda@fearless.cl · Super Admin
            </div>
          </div>
          <button onClick={()=>onToast({text:tx.closingSessionLbl,sub:tx.seeYouSoonLbl})}
            style={{padding:'6px 12px',borderRadius:8,background:'rgba(var(--rd-rgb),.06)',color:'var(--rd)',cursor:'pointer',
              fontSize:'var(--fs-sm)',fontWeight:700,fontFamily:"var(--font-body)",
              display:'flex',alignItems:'center',gap:5}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        </div>

        {/* Plan actual */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'10px 14px',borderRadius:12,background:'var(--s1)',
          }}>
          <div>
            <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
              letterSpacing:'1.5px',fontFamily:"var(--font-body)",marginBottom:3}}>{tx.currentPlanBtn}</div>
            <div style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--ac)',fontFamily:"var(--font-body)",
              textTransform:'capitalize'}}>{viaEquipo?'Premium':planId}</div>
          </div>
          <button onClick={()=>{}}
            style={{padding:'6px 12px',borderRadius:8,background:'rgba(var(--gn-rgb),.07)',color:'var(--gn)',cursor:'pointer',
              fontSize:'var(--fs-sm)',fontWeight:700,fontFamily:"var(--font-body)"}}>
            Mejorar plan
          </button>
        </div>

        {/* Firebase / conexión */}
        {firebaseListo&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'10px 14px',borderRadius:12,background:'var(--s1)',
            }}>
            <div>
              <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                letterSpacing:'1.5px',fontFamily:"var(--font-body)",marginBottom:3}}>{tx.syncLbl}</div>
              <div style={{fontSize:'var(--fs-base)',color:online?'var(--gn)':'var(--tx3)',
                fontFamily:"var(--font-body)",fontWeight:300}}>
                {online?'En línea · Firebase activo':'Sin conexión · modo local'}
              </div>
            </div>
            <button onClick={()=>setOnline(o=>!o)}
              style={{width:40,height:22,borderRadius:11,cursor:'pointer',flexShrink:0,
                background:online?'var(--gn)':'var(--bd)',position:'relative',transition:'background .2s'}}>
              <div style={{position:'absolute',top:2,left:online?20:2,width:18,height:18,borderRadius:9,
                background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
            </button>
          </div>
        )}
      </div>
      {helpOpen==='backstage'&&<HelpModal/>}
    </div>
  );
}
