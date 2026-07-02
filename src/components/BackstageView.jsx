import { t as getT, LANGS } from '../i18n';
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
import { ItinerarioEditor } from './ItinerarioEditor';
import { getModoTexto, getModoFeatures, getTiposEventoDisponibles } from '../data/modo';

export function BackstageView({userRole,onToast,mode,onSetTheme,onGetTheme,onLangChange,eventos=[],setEventos,lang="es",equipos=[],setEquipos=()=>{},persistirEquipo=()=>{},persistirEvento=()=>{},online=true,setOnline=()=>{},firebaseListo=false,planId="lite",setPlanId=()=>{},planActivo=null,tienePremiere=false,tieneMonitoreo=false,onNavigate=()=>{},ensayos=[],setEnsayos=()=>{},variacionesDB={}}){
  const tx=getT(lang);
  const vx=getModoTexto(mode,lang);
  const feat=getModoFeatures(mode);
  const tipos=getTiposEventoDisponibles(mode,lang);
  const [bsView,setBsView]=useState(null);
  const isAdmin=userRole==='superadmin';
  const isPastor=isAdmin; // Pastor eliminado como rol separado — Admin absorbe sus funciones
  const isLeader=userRole==='leader'||isAdmin;
  const [activeEq,setActiveEq]=useState(null);
  const [verMiembros,setVerMiembros]=useState(false);
  const [nuevoMiembro,setNuevoMiembro]=useState(null); // {nombre,email,equipoId} — reemplaza prompt()
  const [nuevaBanda,setNuevaBanda]=useState('');
  const [nuevosRoles,setNuevosRoles]=useState('');
  const [evNombre,setEvNombre]=useState('');
  const [evTipo,setEvTipo]=useState('domingo');
  const [evFecha,setEvFecha]=useState('');
  const [evNotas,setEvNotas]=useState('');
  const [evSetlist,setEvSetlist]=useState([]);
  const [evArchivo,setEvArchivo]=useState(null);
  const [evSearch,setEvSearch]=useState('');
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
  const [periodoPersonal,setPeriodoPersonal]=useState('mensual');
  const [periodoEquipo,setPeriodoEquipo]=useState('mensual');

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
  // ── CREAR EVENTO ──
  if(bsView==='evento')return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90,background:'var(--bg)',minHeight:'100vh',color:'var(--tx)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:20,color:'var(--tx)',lineHeight:1.1,marginBottom:5}}>Crear fecha <span style={{color:'var(--ac)'}}>o evento</span></div>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx3)',lineHeight:1.5,marginBottom:16}}>Configura nombre, fecha, setlist y equipo en un solo lugar</div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Nombre del evento</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
          {tipos.map(t=>t.label).map(op=>(
            <button key={op} onClick={()=>setEvNombre(op)}
              style={{padding:'5px 10px',borderRadius:100,border:evNombre===op?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',background:evNombre===op?'rgba(200,169,126,.12)':'var(--s2)',color:evNombre===op?'var(--ac)':'var(--tx3)',fontSize:10,fontWeight:400,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",transition:'all .15s'}}>
              {op}
            </button>
          ))}
        </div>
        <input className="inp" placeholder="O escribe un nombre personalizado..." value={evNombre} onChange={e=>setEvNombre(e.target.value)}/>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Fecha</div>
        <div style={{display:'flex',gap:8}}>
          <select className="inp" style={{flex:1,cursor:'pointer',background:'var(--s2)',color:'var(--tx)',border:'1px solid var(--bd)'}} value={evFecha.split('-')[2]||''} onChange={e=>{const d=e.target.value;setEvFecha(prev=>{const parts=prev.split('-');parts[2]=d.padStart(2,'0');return parts.join('-');});}}>
            <option value="">Día</option>
            {Array.from({length:31},(_,i)=>i+1).map(d=>(<option key={d} value={d}>{d}</option>))}
          </select>
          <select className="inp" style={{flex:1.4,cursor:'pointer',background:'var(--s1)',color:'var(--tx)'}} value={evFecha.split('-')[1]||''} onChange={e=>{const m=e.target.value;setEvFecha(prev=>{const parts=prev.split('-');parts[1]=m.padStart(2,'0');return parts.join('-');});}}>
            <option value="">Mes</option>
            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i)=>(<option key={i} value={i+1}>{m}</option>))}
          </select>
          <select className="inp" style={{flex:1,cursor:'pointer',background:'var(--s2)',color:'var(--tx)',border:'1px solid var(--bd)'}} value={evFecha.split('-')[0]||''} onChange={e=>{const y=e.target.value;setEvFecha(prev=>{const parts=prev.split('-');parts[0]=y;return parts.join('-');});}}>
            <option value="">Año</option>
            {['2026','2027','2028'].map(y=>(<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:2}}>Crea setlist</div>
        <div style={{fontSize:10,color:'var(--tx2)',fontWeight:300,marginBottom:8,fontFamily:"'Lexend Giga',sans-serif"}}>
          Selecciona las canciones del setlist
        </div>
        <input className="inp" placeholder="Buscar canción..." value={evSearch} onChange={e=>setEvSearch(e.target.value)} style={{marginBottom:10}}/>
        {evSetlist.length>0&&(
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
            {evSetlist.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 6px 6px 12px',
                borderRadius:100,background:'rgba(200,169,126,.12)',border:'1px solid rgba(200,169,126,.3)'}}>
                <span style={{fontSize:9,color:'var(--tx3)',fontWeight:400}}>{i+1}</span>
                <span style={{fontSize:11,fontWeight:400,color:'var(--tx)'}}>{s}</span>
                <button onClick={()=>setEvSetlist(l=>l.filter((_,j)=>j!==i))}
                  style={{width:16,height:16,borderRadius:'50%',border:'none',background:'rgba(255,255,255,.1)',
                    color:'var(--tx3)',cursor:'pointer',fontSize:11,lineHeight:1,display:'flex',
                    alignItems:'center',justifyContent:'center'}}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className="sg" style={{maxHeight:340,overflowY:'auto',marginBottom:0}}>
          {CANCIONES.filter(s=>s.n.toLowerCase().includes(evSearch.toLowerCase())&&!evSetlist.includes(s.n)).map(s=>(
            <div key={s.n} className="scard" onClick={()=>setEvSetlist(l=>[...l,s.n])}>
              <span className="scard-n">{s.n}</span>
              <span className="scard-s">{s.key}<span>{s.bpm} bpm</span></span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Equipos convocados</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
          {equipos.map(eq=>(
            <label key={eq.id} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:100,border:'1px solid var(--bd)',background:'var(--s1)',cursor:'pointer',transition:'all .15s'}}>
              <input type="checkbox" defaultChecked onChange={()=>{}} style={{accentColor:eq.color,width:13,height:13}}/>
              <div style={{width:7,height:7,borderRadius:'50%',background:eq.color}}/>
              <span style={{fontSize:11,fontWeight:400,color:'var(--tx)'}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)'}}>{(eq.miembros||[]).length}p</span>
            </label>
          ))}
        </div>
        <div style={{borderTop:'1px solid var(--bd)',paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',marginBottom:7}}>¿Necesitas un equipo adicional?</div>
          <div style={{display:'flex',gap:8}}>
            <input className="inp" placeholder="Nombre del equipo personalizado..." id="eq-custom" style={{flex:1,fontSize:12}}/>
            <button onClick={()=>{const v=document.getElementById('eq-custom').value.trim();if(v){onToast({text:'Equipo agregado',sub:v});document.getElementById('eq-custom').value='';}}}
              style={{padding:'8px 14px',borderRadius:9,border:'1px solid rgba(200,169,126,.35)',background:'rgba(200,169,126,.08)',color:'var(--ac)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
              + Agregar
            </button>
          </div>
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Itinerario</div>
        <ItinerarioEditor/>
      </div>
      <div className="card" style={{padding:14,marginBottom:18}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Notas del evento</div>
        <textarea className="inp" value={evNotas} onChange={e=>setEvNotas(e.target.value)}
          style={{minHeight:90,resize:'vertical',lineHeight:1.6,fontSize:12}}
          placeholder={"Ej: Llegar 30 min antes del ensayo. Revisar las canciones con tiempo.\nContactar a Cony para confirmar el equipo de proyecciones.\nFecha límite para cambios en el setlist: jueves en la noche."}/>
      </div>

      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Archivo adjunto</div>
        <div style={{fontSize:10,color:'var(--tx2)',fontWeight:300,marginBottom:10,fontFamily:"'Lexend Giga',sans-serif"}}>
          PDF, Word o audio — visible para el equipo en los detalles del evento
        </div>
        {evArchivo?(
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
            borderRadius:10,background:'rgba(48,192,183,.08)',border:'1px solid rgba(48,192,183,.25)'}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--gn)" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{flex:1,fontSize:12,fontWeight:700,color:'var(--tx)'}}>{evArchivo.name}</span>
            <button onClick={()=>setEvArchivo(null)}
              style={{background:'none',border:'none',color:'var(--rd)',cursor:'pointer',fontSize:16}}>×</button>
          </div>
        ):(
          <label style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,
            padding:'16px',borderRadius:10,border:'1px dashed rgba(255,255,255,.15)',
            cursor:'pointer',color:'var(--tx3)'}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{fontSize:11,fontWeight:700}}>Subir archivo</span>
            <input type="file" accept=".pdf,.doc,.docx,.mp3,.wav,.m4a" style={{display:'none'}}
              onChange={e=>{const f=e.target.files[0];if(f)setEvArchivo(f);}}/>
          </label>
        )}
      </div>


      <div style={{display:'flex',gap:9}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>Cancelar</button>
        <button className="btn btn-p" style={{flex:2,justifyContent:'center'}}
          disabled={!evNombre.trim()&&!evFecha}
          onClick={()=>{
            const label=`${evNombre||'Nuevo evento'}`;
            const nuevoEv={id:Date.now(),tipo:evTipo||'culto',nombre:label,fecha:evFecha,lugar:'',setlist:[...evSetlist],archivo:evArchivo?{name:evArchivo.name}:null};
            setEventos(prev=>[...prev,nuevoEv]);
            persistirEvento(nuevoEv);
            onToast({text:'Evento creado',sub:`${label} · ${evSetlist.length} canciones`});
            setEvNombre('');setEvSetlist([]);setEvNotas('');setEvFecha('');setEvArchivo(null);
            setBsView(null);
          }}>
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Crear evento
        </button>
      </div>
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
      if(!slCanciones.length){onToast({text:'Agrega al menos una canción',sub:'El setlist está vacío'});return;}
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
      onToast({text:'Setlist guardado',sub:`${slCanciones.length} canciones${slEventoId?' · Asignado al evento':''}`});
      setSlCanciones([]);setSlNombre('');setSlEventoId('');setSlSearch('');
      setBsView(null);
    };

    return(
      <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
        </div>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
          Crear <span style={{color:'var(--ac)'}}>setlist</span>
        </div>
        <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:20}}>Arma la lista de canciones y asígnala a un evento cuando quieras</div>
        <div className="card" style={{padding:14,marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Nombre del setlist</div>
          <input className="inp" placeholder="Ej: Setlist 6 de julio · Noche de adoración..." value={slNombre} onChange={e=>setSlNombre(e.target.value)}/>
        </div>
        <div className="card" style={{padding:14,marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
            Asignar a evento
            <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'var(--tx3)',fontSize:10,marginLeft:6}}>· opcional, puedes hacerlo después</span>
          </div>
          {eventos.length===0?(
            <div style={{padding:'12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.1)',textAlign:'center'}}>
              <div style={{fontSize:12,color:'var(--tx3)',marginBottom:6}}>Aún no hay eventos creados</div>
              <button onClick={()=>setBsView('evento')} style={{fontSize:11,fontWeight:700,color:'var(--ac)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                + Crear un evento primero →
              </button>
            </div>
          ):(
            <select className="inp" value={slEventoId} onChange={e=>setSlEventoId(e.target.value)} style={{cursor:'pointer'}}>
              <option value="">Sin asignar — guardar como borrador</option>
              {eventos.map(ev=>(
                <option key={ev.id} value={ev.id}>
                  {ev.nombre}{ev.fecha?' · '+ev.fecha:''}
                </option>
              ))}
            </select>
          )}
          {slEventoId&&(
            <div style={{marginTop:8,padding:'8px 12px',borderRadius:8,background:'rgba(94,206,160,.08)',border:'1px solid rgba(94,206,160,.2)',fontSize:11,color:'var(--gn)',fontWeight:700,display:'flex',alignItems:'center',gap:6}}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Setlist asignado a: {eventos.find(e=>String(e.id)===String(slEventoId))?.nombre}
            </div>
          )}
        </div>
        <div className="card" style={{padding:14,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Selecciona las canciones</div>
            {slCanciones.length>0&&(
              <span style={{fontSize:11,fontWeight:700,color:'var(--ac)'}}>{slCanciones.length}</span>
            )}
          </div>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,marginBottom:10}}>
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
                <div key={s.cancion+i} style={{padding:'10px 12px',borderRadius:12,background:'var(--s1)',border:'1px solid var(--bd)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:vars.length||personas.length?8:0}}>
                    <span style={{flex:1,minWidth:0,fontSize:12,fontWeight:700,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif",
                      overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
                      {i+1}. {s.cancion}
                      {resumenVars.length>0&&<span style={{fontWeight:400,color:'var(--gn)',fontSize:10,marginLeft:6}}>· {resumenVars.join(', ')}</span>}
                    </span>
                    <button disabled={i===0} onClick={()=>moverCancion(i,i-1)}
                      style={{width:18,height:18,border:'none',background:'rgba(255,255,255,.08)',
                        color:i===0?'rgba(255,255,255,.2)':'var(--tx2)',cursor:i===0?'not-allowed':'pointer',
                        borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button disabled={i===slCanciones.length-1} onClick={()=>moverCancion(i,i+1)}
                      style={{width:18,height:18,border:'none',background:'rgba(255,255,255,.08)',
                        color:i===slCanciones.length-1?'rgba(255,255,255,.2)':'var(--tx2)',cursor:i===slCanciones.length-1?'not-allowed':'pointer',
                        borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <button onClick={()=>setSlCanciones(prev=>prev.filter((_,j)=>j!==i))}
                      style={{width:18,height:18,borderRadius:'50%',border:'none',background:'rgba(255,255,255,.1)',
                        color:'var(--tx3)',cursor:'pointer',fontSize:12,lineHeight:1,display:'flex',
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
                            <select value={a.variacionId||'original'} onChange={e=>actualizarAsignacion(a.id,'variacionId',e.target.value)}
                              style={{flex:1,padding:'6px 8px',borderRadius:7,border:'1px solid var(--bd)',background:'var(--s2)',
                                color:'var(--tx2)',fontSize:10,fontFamily:"'Lexend Giga',sans-serif",cursor:'pointer'}}>
                              <option value="original">Original (letra/acordes)</option>
                              {vars.map(v=>(<option key={v.id} value={v.id}>{v.label}{v.tipo==='partitura'?' (partitura)':''}</option>))}
                            </select>
                          )}
                          {personas.length>0&&(
                            <select value={a.personaId||''} onChange={e=>actualizarAsignacion(a.id,'personaId',e.target.value||null)}
                              style={{flex:1,padding:'6px 8px',borderRadius:7,border:'1px solid var(--bd)',background:'var(--s2)',
                                color:'var(--tx2)',fontSize:10,fontFamily:"'Lexend Giga',sans-serif",cursor:'pointer'}}>
                              <option value="">Sin asignar</option>
                              {personas.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
                            </select>
                          )}
                          {asignaciones.length>1&&(
                            <button onClick={()=>quitarAsignacion(a.id)}
                              style={{width:20,height:20,borderRadius:'50%',border:'none',background:'rgba(255,255,255,.08)',
                                color:'var(--tx3)',cursor:'pointer',fontSize:12,lineHeight:1,display:'flex',
                                alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
                          )}
                        </div>
                      ))}
                      <button onClick={agregarAsignacion}
                        style={{alignSelf:'flex-start',display:'flex',alignItems:'center',gap:5,padding:'4px 10px',
                          borderRadius:100,border:'1px dashed rgba(255,255,255,.2)',background:'transparent',
                          color:'var(--gn)',cursor:'pointer',fontSize:9,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>
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
          <input className="inp" placeholder="Buscar canción..." value={slSearch} onChange={e=>setSlSearch(e.target.value)} style={{marginBottom:10}}/>
          <div className="sg" style={{maxHeight:340,overflowY:'auto',marginBottom:0}}>
            {CANCIONES.filter(s=>s.n.toLowerCase().includes(slSearch.toLowerCase())&&!slCanciones.some(x=>x.cancion===s.n)).map(s=>(
              <div key={s.n} className="scard" onClick={()=>{setSlCanciones(prev=>[...prev,{cancion:s.n,asignaciones:[{id:`a${Date.now()}`,variacionId:'original',personaId:null}]}]);}}>
                <span className="scard-n">{s.n}</span>
                <span className="scard-s">{s.key}<span>{s.bpm} bpm</span></span>
              </div>
            ))}
            {CANCIONES.filter(s=>s.n.toLowerCase().includes(slSearch.toLowerCase())&&!slCanciones.some(x=>x.cancion===s.n)).length===0&&(
              <div style={{padding:'12px',textAlign:'center',fontSize:12,color:'var(--tx3)',width:'100%'}}>No hay coincidencias</div>
            )}
          </div>
        </div>
        {slGuardados.length>0&&(
          <div className="card" style={{padding:14,marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>
              Setlists guardados ({slGuardados.length})
            </div>
            {slGuardados.map(sl=>(
              <div key={sl.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>{sl.nombre}</div>
                  <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>
                    {sl.canciones.length} canciones · {sl.fecha}
                    {sl.eventoId&&<span style={{color:'var(--gn)',marginLeft:6}}>· Asignado ✓</span>}
                  </div>
                </div>
                <button onClick={()=>{setSlCanciones([...sl.canciones]);setSlNombre(sl.nombre);setSlGuardados(prev=>prev.filter(x=>x.id!==sl.id));onToast({text:'Editando setlist',sub:sl.nombre});}}
                  style={{padding:'4px 10px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
                  Editar
                </button>
                <button onClick={()=>setSlGuardados(prev=>prev.filter(x=>x.id!==sl.id))}
                  style={{width:26,height:26,borderRadius:7,border:'1px solid rgba(255,82,82,.2)',background:'rgba(255,82,82,.06)',color:'var(--rd)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:15}}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{display:'flex',gap:9}}>
          <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>Cancelar</button>
          <button className="btn btn-p" style={{flex:2,justifyContent:'center'}} disabled={!slCanciones.length} onClick={guardarSetlist}>
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            {slEventoId?'Guardar y asignar al evento':'Guardar setlist'}
          </button>
        </div>
      </div>
    );
  }

  if(bsView==='equipos'){
    return(
      <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90,background:'var(--bg)',minHeight:'100vh',color:'var(--tx)'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
        </div>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:26,color:'var(--tx)',lineHeight:1.05,marginBottom:4}}>
          Gestión de <span style={{color:'var(--ac)'}}>equipos</span>
        </div>
        <div style={{fontSize:11,color:'var(--tx3)',marginBottom:20,lineHeight:1.6}}>
          Organiza tu gente en equipos de trabajo. Agrega miembros, asigna roles y gestiona la convocatoria de cada fecha.
        </div>

        {/* ── Miembros registrados ── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>
            Miembros · {personas.length} personas
          </div>
          <button
            onClick={()=>{
              if(!equipos.length){onToast({text:'Crea un equipo primero'});return;}
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
          <div style={{padding:14,borderRadius:12,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:16,
            display:'flex',flexDirection:'column',gap:10}}>
            <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Nuevo miembro</div>
            <input className="inp" placeholder="Nombre completo" value={nuevoMiembro.nombre}
              onChange={e=>setNuevoMiembro(v=>({...v,nombre:e.target.value}))} autoFocus/>
            <input className="inp" placeholder="Correo (opcional)" type="email" value={nuevoMiembro.email}
              onChange={e=>setNuevoMiembro(v=>({...v,email:e.target.value}))}/>
            {equipos.length>1&&(
              <select className="inp" value={nuevoMiembro.equipoId} style={{cursor:'pointer'}}
                onChange={e=>setNuevoMiembro(v=>({...v,equipoId:e.target.value}))}>
                {equipos.map(eq=>(<option key={eq.id} value={eq.id}>{eq.name}</option>))}
              </select>
            )}
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-g" style={{flex:1}} onClick={()=>setNuevoMiembro(null)}>Cancelar</button>
              <button className="btn btn-p" style={{flex:2,justifyContent:'center'}}
                disabled={!nuevoMiembro.nombre.trim()}
                onClick={()=>{
                  const equipo=equipos.find(e=>e.id===nuevoMiembro.equipoId)||equipos[0];
                  const nombre=nuevoMiembro.nombre.trim();
                  const nuevo={id:Date.now(),name:nombre,email:nuevoMiembro.email.trim(),role:(equipo.roles||[])[0]||'General',foto:null};
                  const upd={...equipo,miembros:[...(equipo.miembros||[]),nuevo]};
                  setEquipos(prev=>prev.map(e=>e.id===equipo.id?upd:e));
                  persistirEquipo(upd);
                  onToast({text:'Miembro agregado',sub:nombre});
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
          padding:'10px 12px',borderRadius:'var(--rad-sm)',border:'1px solid var(--bd)',background:'var(--s1)',
          cursor:'pointer',marginBottom:verMiembros?8:20,fontFamily:"'Lexend Giga',sans-serif"}}>
          <span style={{fontSize:12,fontWeight:700,color:'var(--tx)',flex:1,textAlign:'left'}}>
            Ver todos los miembros ({personas.length})
          </span>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--tx3)" strokeWidth="2"
            style={{transform:verMiembros?'rotate(180deg)':'none',transition:'transform .15s'}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {verMiembros && (
          <div style={{display:'flex',flexDirection:'column',marginBottom:20,borderRadius:'var(--rad-md)',
            border:'1px solid var(--bd)',overflow:'hidden'}}>
            {personas.map((m,i)=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',
                borderBottom:i<personas.length-1?'1px solid rgba(255,255,255,.05)':'none',background:'var(--s1)'}}>
                {m.foto
                  ?<img src={m.foto} alt={m.name} style={{width:26,height:26,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
                  :<div style={{width:26,height:26,borderRadius:'50%',background:`${colorForName(m.name)}22`,border:`1px solid ${colorForName(m.name)}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:900,color:colorForName(m.name),flexShrink:0,fontFamily:"'Lexend Giga',sans-serif"}}>{initials(m.name)}</div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:400,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                  <div style={{fontSize:10,color:'var(--tx3)',fontWeight:300,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.email?.trim()?m.email:'Sin correo registrado'}</div>
                </div>
              </div>
            ))}
            {personas.length===0&&(
              <div style={{fontSize:11,color:'var(--tx3)',fontStyle:'italic',padding:'12px'}}>Agrega tu primer miembro →</div>
            )}
          </div>
        )}

        {/* ── Equipos en grid 2 columnas ── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>
            Equipos · {equipos.length}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          {equipos.map(eq=>(
            <div key={eq.id}
              onClick={()=>setActiveEq(activeEq===eq.id?null:eq.id)}
              style={{
                borderRadius:14,background:'var(--s1)',border:'1px solid var(--bd)',
                overflow:'hidden',cursor:'pointer',
                outline:activeEq===eq.id?`2px solid ${eq.color}60`:'none',
              }}>
              {/* Card header */}
              <div style={{padding:'12px 12px 10px',display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:eq.color,flexShrink:0,boxShadow:`0 0 8px ${eq.color}80`}}/>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:900,fontSize:12,color:'var(--tx)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{eq.name}</span>
                <span style={{fontSize:9,fontWeight:700,color:'var(--tx3)',flexShrink:0}}>{(eq.miembros||[]).length}</span>
              </div>
              {/* Miembros en pills */}
              <div style={{padding:'0 10px 10px',display:'flex',flexWrap:'wrap',gap:4}}>
                {(eq.miembros||[]).slice(0,4).map(m=>(
                  <div key={m.id} style={{fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:100,
                    background:eq.color+'18',color:eq.color,border:`1px solid ${eq.color}30`,
                    fontFamily:"'Lexend Giga',sans-serif",whiteSpace:'nowrap'}}>
                    {m.name.split(' ')[0]}
                  </div>
                ))}
                {(eq.miembros||[]).length>4&&(
                  <div style={{fontSize:8,color:'var(--tx3)',padding:'2px 6px',fontFamily:"'Lexend Giga',sans-serif"}}>+{(eq.miembros||[]).length-4}</div>
                )}
                {(eq.miembros||[]).length===0&&(
                  <div style={{fontSize:8,color:'var(--tx3)',fontStyle:'italic',fontFamily:"'Lexend Giga',sans-serif"}}>Sin miembros</div>
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
            <div style={{borderRadius:14,background:'var(--s1)',border:`1px solid ${eq.color}40`,padding:14,marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:eq.color,boxShadow:`0 0 8px ${eq.color}80`}}/>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:400,fontSize:14,color:'var(--tx)',flex:1}}>{eq.name}</span>
                <button onClick={e=>{e.stopPropagation();setActiveEq(null);}} style={{background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
              </div>
              {/* Miembros del equipo */}
              {(eq.miembros||[]).map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                  {m.foto
                    ?<img src={m.foto} alt={m.name} style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
                    :<div style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,.08)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:900,color:'var(--tx2)',flexShrink:0}}>{initials(m.name)}</div>
                  }
                  <span style={{flex:1,fontSize:12,fontWeight:300,color:'var(--tx)'}}>{m.name}</span>
                  <select value={m.role} onChange={e=>{
                    const upd={...eq,miembros:(eq.miembros||[]).map(mm=>mm.id===m.id?{...mm,role:e.target.value}:mm)};
                    setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
                  }} style={{fontSize:9,color:eq.color,background:eq.color+'12',border:`1px solid ${eq.color}30`,padding:'3px 7px',borderRadius:100,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",fontWeight:400,outline:'none'}}>
                    {(eq.roles||[]).map(r=>(<option key={r} value={r}>{r}</option>))}
                  </select>
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
                    <div style={{width:22,height:22,borderRadius:6,border:'1px solid var(--bd)',background:'var(--s2)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx3)'}}>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  </label>
                  <button onClick={()=>{
                    const upd={...eq,miembros:(eq.miembros||[]).filter(mm=>mm.id!==m.id)};
                    setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
                    onToast({text:'Removido',sub:m.name});
                  }} style={{width:22,height:22,borderRadius:6,border:'1px solid rgba(253,128,131,.2)',background:'transparent',color:'var(--rd)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
              {/* Editar roles del equipo */}
              <div style={{marginTop:12,padding:'10px 0',borderTop:'1px solid rgba(255,255,255,.06)'}}>
                <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                  letterSpacing:'1.5px',marginBottom:6,fontFamily:"'Lexend Giga',sans-serif"}}>
                  Roles del equipo
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
                  {(eq.roles||['General']).map((r,ri)=>(
                    <div key={ri} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 8px 4px 10px',
                      borderRadius:100,background:eq.color+'18',border:`1px solid ${eq.color}30`}}>
                      <span style={{fontSize:10,fontWeight:700,color:eq.color,
                        fontFamily:"'Lexend Giga',sans-serif"}}>{r}</span>
                      <button onClick={()=>{
                        const upd={...eq,roles:(eq.roles||[]).filter((_,j)=>j!==ri)};
                        setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
                      }} style={{width:14,height:14,borderRadius:'50%',border:'none',
                        background:'rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',
                        fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',
                        lineHeight:1}}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:6}}>
                  <input
                    placeholder="Nuevo rol..."
                    onKeyDown={e=>{
                      if(e.key==='Enter'&&e.target.value.trim()){
                        const upd={...eq,roles:[...(eq.roles||[]),e.target.value.trim()]};
                        setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
                        e.target.value='';
                      }
                    }}
                    style={{flex:1,padding:'6px 10px',borderRadius:8,border:'1px solid var(--bd)',
                      background:'var(--s2)',color:'var(--tx)',fontSize:11,outline:'none',
                      fontFamily:"'Lexend Giga',sans-serif"}}/>
                  <div style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",
                    display:'flex',alignItems:'center'}}>↵ Enter</div>
                </div>
              </div>
              {/* Agregar miembro al equipo */}
              <select className="inp" style={{marginTop:10,fontSize:11,cursor:'pointer',background:'var(--s1)',color:'var(--tx)'}} value="" onChange={e=>{
                if(!e.target.value)return;
                const persona=personas.find(m=>String(m.id)===e.target.value);
                if(!persona)return;
                const ya=(eq.miembros||[]).find(em=>em.id===persona.id);
                const upd={...eq,miembros:ya?(eq.miembros||[]):[...(eq.miembros||[]),{id:persona.id,name:persona.name,role:(eq.roles||[])[0]||'General',foto:null}]};
                setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
                onToast({text:'Agregado a '+eq.name,sub:persona.name});
              }}>
                <option value="">Agregar miembro al equipo...</option>
                {personas.filter(m=>!(eq.miembros||[]).find(em=>em.id===m.id)).map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}
              </select>
            </div>
          );
        })()}

        {/* ── Crear nuevo equipo ── */}
        <div style={{padding:14,borderRadius:14,background:'var(--s1)',border:'1px solid var(--bd)'}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:10}}>Crear nuevo equipo</div>
          <input className="inp" placeholder="Nombre del equipo..." value={nuevaBanda} onChange={e=>setNuevaBanda(e.target.value)} style={{marginBottom:8}}/>
          <input className="inp" placeholder="Roles separados por coma (ej: Líder, Músico, Técnico)" value={nuevosRoles} onChange={e=>setNuevosRoles(e.target.value)} style={{marginBottom:8}}/>
          <div style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",marginBottom:8}}>
            Los roles se asignan a cada miembro del equipo. Se pueden editar después.
          </div>
          <button className="btn btn-p btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={()=>{
            if(!nuevaBanda.trim())return;
            const colores=['#EE227D','#30C0B7','#FD8083','#7b68ee','#5ecea0','#e07820'];
            const color=colores[equipos.length%colores.length];
            const roles=nuevosRoles.trim()
              ?nuevosRoles.split(',').map(r=>r.trim()).filter(Boolean)
              :['General','Líder'];
            const nuevoEq={id:`eq${Date.now()}`,name:nuevaBanda.trim(),color,roles,miembros:[]};
            setEquipos(prev=>[...prev,nuevoEq]);persistirEquipo(nuevoEq);
            onToast({text:'Equipo creado',sub:nuevaBanda});setNuevaBanda('');setNuevosRoles('');
          }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Crear equipo
          </button>
        </div>
      </div>
    );
  }


  // ── DELEGAR PERMISOS ──
  if(bsView==='permisos')return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90,background:'var(--bg)',minHeight:'100vh',color:'var(--tx)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:4}}>
        Delegar <span style={{color:'var(--ac)'}}>permisos</span>
      </div>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx3)',lineHeight:1.6,marginBottom:20}}>
        Asigna líderes para que gestionen su área sin necesitar tu aprobación.
      </div>

      {/* Líderes actuales */}
      {lideresActuales.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:12}}>Líderes activos</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {lideresActuales.map((l,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:12,background:'var(--s1)',border:'1px solid var(--bd)'}}>
                {/* Avatar coloreado por persona — determinístico, sin gradiente */}
                <div style={{width:36,height:36,borderRadius:10,background:`${colorForName(l.name)}22`,border:`1px solid ${colorForName(l.name)}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:colorForName(l.name),flexShrink:0,fontFamily:"'Lexend Giga',sans-serif"}}>
                  {l.av}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>{l.name}</div>
                  <div style={{fontSize:10,color:'var(--tx3)',marginBottom:6,marginTop:1}}>{l.rol}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {l.permisos.map(p=>(
                      <span key={p} style={{fontSize:9,padding:'2px 8px',borderRadius:100,border:'1px solid rgba(48,192,183,.3)',background:'rgba(48,192,183,.08)',color:'var(--gn)',fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>{p}</span>
                    ))}
                  </div>
                </div>
                <button onClick={()=>setLideresActuales(v=>v.filter((_,j)=>j!==i))}
                  style={{width:28,height:28,borderRadius:8,border:'1px solid rgba(253,128,131,.3)',background:'rgba(253,128,131,.06)',color:'var(--rd)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agregar nuevo líder */}
      <div style={{padding:'16px 14px',borderRadius:14,background:'var(--s1)',border:'1px solid var(--bd)'}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:14}}>Agregar líder</div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:9,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:6}}>Integrante</div>
          <select className="inp" style={{background:'var(--s1)',color:'var(--tx)',cursor:'pointer'}}
            value={selectedIntegrante} onChange={e=>setSelectedIntegrante(e.target.value)}>
            <option value="">Seleccionar...</option>
            {personas.filter(p=>!lideresActuales.find(l=>l.name===p.name)).map(p=>(
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:9,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Permisos</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {[
              {id:'setlist',label:'Editar setlist',desc:'Agregar, reordenar y publicar canciones'},
              {id:'convocar',label:'Convocar equipo',desc:'Invitar y confirmar asistencia de miembros'},
              {id:'notif',label:'Enviar notificaciones',desc:'Avisar al equipo por push y email'},
              {id:'itinerario',label:'Editar itinerario',desc:'Modificar horarios del evento'},
              {id:'equipos',label:'Gestionar equipos',desc:'Agregar y remover miembros de su área'},
              {id:'pastor',label:'Palabra del pastor',desc:'Editar versículo y notas del mensaje'},
              {id:'backstage_view',label:'Ver Backstage',desc:'Acceso de solo lectura a todos los eventos'},
            ].map(perm=>{
              const isOn=selectedPermisos.includes(perm.id);
              return(
                <label key={perm.id}
                  onClick={()=>setSelectedPermisos(prev=>isOn?prev.filter(x=>x!==perm.id):[...prev,perm.id])}
                  style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',
                    padding:'9px 10px',borderRadius:8,
                    border:`1px solid ${isOn?'rgba(48,192,183,.3)':'transparent'}`,
                    background:isOn?'rgba(48,192,183,.06)':'transparent',
                    transition:'all .15s'}}>
                  <div style={{width:18,height:18,borderRadius:5,
                    border:`2px solid ${isOn?'var(--gn)':'var(--bd)'}`,
                    background:isOn?'var(--gn)':'var(--s2)',
                    flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                    transition:'all .15s'}}>
                    {isOn&&<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:isOn?'var(--tx)':'var(--tx2)'}}>{perm.label}</div>
                    <div style={{fontSize:9,color:'var(--tx3)',marginTop:1,fontFamily:"'Lexend Giga',sans-serif"}}>{perm.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        <button className="btn btn-live" style={{width:'100%',justifyContent:'center'}}
          onClick={()=>{
            const p=personas.find(x=>String(x.id)===selectedIntegrante);
            if(!p){onToast({text:'Selecciona un integrante',sub:''});return;}
            if(selectedPermisos.length===0){onToast({text:'Selecciona al menos un permiso',sub:''});return;}
            setLideresActuales(prev=>[...prev,{name:p.name,av:p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),rol:'Líder',permisos:selectedPermisos.map(id=>id.replace('_',' '))}]);
            setSelectedPermisos([]);setSelectedIntegrante('');
            onToast({text:'Líder agregado',sub:p.name});
          }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          Guardar líder
        </button>
      </div>
    </div>
  );

  if(bsView==='notif')return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:6}}>Notificaciones</div>
      <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.6,marginBottom:18}}>Envía mensajes directos a tu equipo. Sin WhatsApp, sin emails perdidos. </div>
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:12}}>¿A quién?</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
          {['Todo el equipo',...equipos.map(e=>e.name)].map(dest=>(
            <button key={dest} onClick={()=>setNotifDest(d=>d.includes(dest)?d.filter(x=>x!==dest):[...d,dest])} style={{padding:'6px 12px',borderRadius:100,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",border:notifDest.includes(dest)?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',background:notifDest.includes(dest)?'rgba(200,169,126,.1)':'var(--s1)',color:notifDest.includes(dest)?'var(--ac)':'var(--tx2)'}}>{dest}</button>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:12}}>Tipo de aviso</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[{id:'recordatorio',label:'Recordatorio',color:'#c8a97e',icon:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>},
            {id:'cambio',label:'Cambio setlist',color:'#30C0B7',icon:<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>},
            {id:'urgente',label:'Urgente',color:'#FD8083',icon:<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>},
            {id:'general',label:'General',color:'#7dd3c0',icon:<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}].map(t=>(
            <button key={t.id} onClick={()=>setNotifTipo(t.id)} style={{padding:'10px',borderRadius:10,cursor:'pointer',textAlign:'left',border:notifTipo===t.id?`1px solid ${t.color}80`:'1px solid var(--bd)',background:notifTipo===t.id?`${t.color}14`:'var(--s1)',fontFamily:"'Lexend Giga',sans-serif"}}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={t.color} strokeWidth="1.8" style={{marginBottom:6,display:'block'}}>{t.icon}</svg>
              <div style={{fontSize:12,fontWeight:700,color:notifTipo===t.id?t.color:'var(--tx)'}}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:16,marginBottom:16}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:10}}>Mensaje</div>
        <textarea className="inp" placeholder="Ej: Hola equipo, este domingo llegamos a las 9:00am. ¡Los esperamos!" value={notifMsg} onChange={e=>setNotifMsg(e.target.value)} style={{minHeight:90,resize:'vertical',lineHeight:1.6,fontSize:12}}/>
      </div>
      <button onClick={()=>setNotifCorreo(v=>!v)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:10,marginBottom:16,cursor:'pointer',border:notifCorreo?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',background:notifCorreo?'rgba(200,169,126,.08)':'var(--s1)'}}>
        <div style={{width:18,height:18,borderRadius:5,border:notifCorreo?'1px solid var(--ac)':'1px solid var(--bd)',background:notifCorreo?'var(--ac)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {notifCorreo&&<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--bg)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={notifCorreo?'var(--ac)':'var(--tx3)'} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg>
        <span style={{fontSize:12,fontWeight:700,color:notifCorreo?'var(--ac)':'var(--tx2)',textAlign:'left',flex:1}}>También agregar por correo</span>
      </button>
      <div style={{display:'flex',gap:9}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>Cancelar</button>
        <button className="btn btn-p" style={{flex:2}} disabled={!notifMsg.trim()||!notifDest.length} onClick={()=>{onToast({text:'Notificación enviada',sub:notifCorreo?`${notifDest.join(', ')} · app y correo`:notifDest.join(', ')});setBsView(null);}}>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar
        </button>
      </div>
    </div>
  );

  // ── PERSONALIZACIÓN ──
  if(bsView==='personalizar')return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:20,color:'var(--tx)',lineHeight:1.1,marginBottom:5}}>Personalización</div>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,color:'var(--tx3)',lineHeight:1.5,marginBottom:16}}>Logo, tema visual e idioma a tu estilo</div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Mi organización</div>
        <input className="inp" placeholder="Nombre de la iglesia o banda" style={{marginBottom:8}} defaultValue="Iglesia"/>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <input className="inp" placeholder="Ciudad" style={{flex:1}}/>
          <select className="inp" style={{flex:1,cursor:'pointer',background:'var(--s2)',color:'var(--tx)',border:'1px solid var(--bd)'}}>
            {['Chile','Argentina','Colombia','México','Perú','España','Venezuela','Ecuador','Bolivia','Uruguay','Paraguay','Costa Rica','Guatemala'].map(p=>(<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8,marginTop:4}}>Logotipo</div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:56,height:56,borderRadius:12,border:'1px dashed rgba(200,169,126,.4)',background:'rgba(200,169,126,.05)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,cursor:'pointer',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--tx3)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9l4-4 4 4 4-4 4 4"/><circle cx="8.5" cy="14.5" r="2"/><path d="M21 15l-5-5-5 6"/></svg>
            <span style={{fontSize:7,color:'var(--tx3)',fontWeight:700}}>Logo</span>
          </div>
          <div>
            <div style={{fontSize:12,color:'var(--tx2)',lineHeight:1.6}}>PNG o SVG · 512×512px recomendado</div>
            <button style={{marginTop:6,padding:'4px 10px',borderRadius:7,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>Seleccionar archivo</button>
          </div>
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Tema visual</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
          {[
            {id:'dark',      label:'Oscuro',           sub:'Gris/violeta · Rosa neón',
              bg:'linear-gradient(135deg,#0f0f0f 0%,#1a0a1f 100%)',
              preview:['#0f0f0f','#EE227D','#30C0B7']},
            {id:'gray',      label:'Gris',             sub:'Carbón · Naranja quemado',
              bg:'linear-gradient(135deg,#22232a 0%,#3a3830 60%,#e07820 100%)',
              preview:['#22232a','#e07820','#f2ede6']},
            {id:'cream',     label:'Claro',            sub:'Blanco hueso · Contraste fuerte',
              bg:'linear-gradient(135deg,#EDE8DC 0%,#d8cfc0 100%)',
              preview:['#F5F0E8','#D4500A','#1a1208']},
            {id:'bubblegum', label:'Bubblegum Pop',    sub:'Rosa neón · Teal profundo',
              bg:'linear-gradient(135deg,#0d1f1f 0%,#062a2a 40%,#FF69B4 100%)',
              preview:['#0d1f1f','#FF69B4','#00F0FF']},
            {id:'cosmos',    label:'Cosmos',           sub:'Azul marino · Violeta eléctrico',
              bg:'linear-gradient(135deg,#07081a 0%,#0d0a2e 50%,#a78bfa 100%)',
              preview:['#07081a','#a78bfa','#34d399']},
          ].map(th=>(
            <div key={th.id} onClick={()=>{onSetTheme(th.id);onToast({text:'Tema aplicado',sub:th.label});}}
              style={{borderRadius:12,cursor:'pointer',overflow:'hidden',transition:'all .2s',
                      border:onGetTheme()===th.id?'2px solid var(--ac)':'1px solid var(--bd)',
                      boxShadow:onGetTheme()===th.id?'0 0 0 1px var(--ac),0 4px 20px rgba(0,0,0,.4)':'none'}}>
              <div style={{height:64,background:th.bg,position:'relative',display:'flex',alignItems:'flex-end',padding:'0 8px 8px'}}>
                <div style={{display:'flex',gap:4}}>
                  {th.preview.map((c,i)=>(
                    <div key={i} style={{width:16,height:16,borderRadius:3,background:c,
                                         border:'1px solid rgba(255,255,255,.25)',
                                         boxShadow:'0 1px 4px rgba(0,0,0,.4)'}}/>
                  ))}
                </div>
                {onGetTheme()===th.id&&(
                  <div style={{position:'absolute',top:6,right:6,width:20,height:20,borderRadius:'50%',
                               background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',
                               display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </div>
              <div style={{padding:'8px 10px',background:'var(--s1)'}}>
                <div style={{fontSize:11,fontWeight:900,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>{th.label}</div>
                <div style={{fontSize:9,color:'var(--tx3)',marginTop:2}}>{th.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Idioma</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {LANGS.map(l=>(
            <button key={l.code} onClick={()=>onLangChange&&onLangChange(l.code)}
              style={{padding:'9px 6px',borderRadius:10,
                border:`1px solid ${lang===l.code?'rgba(200,169,126,.4)':'var(--bd)'}`,
                background:lang===l.code?'rgba(200,169,126,.1)':'transparent',
                color:lang===l.code?'var(--ac)':'var(--tx3)',
                fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",
                display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:14}}>{l.flag}</span>
              <span style={{lineHeight:1.2}}>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {(tienePremiere||tieneMonitoreo)&&(
        <div className="card" style={{padding:14,marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:12}}>
            Features Pro/Premium
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {tienePremiere&&(
              <button onClick={()=>{setBsView(null);onNavigate('premiere');}}
                style={{padding:'10px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',
                  color:'var(--tx)',fontSize:12,fontWeight:700,cursor:'pointer',textAlign:'left',
                  fontFamily:"'Lexend Giga',sans-serif"}}>
                ★ Premiere — Estrenos exclusivos
              </button>
            )}
            {tieneMonitoreo&&(
              <button onClick={()=>{setBsView(null);onNavigate('monitoreo');}}
                style={{padding:'10px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',
                  color:'var(--tx)',fontSize:12,fontWeight:700,cursor:'pointer',textAlign:'left',
                  fontFamily:"'Lexend Giga',sans-serif"}}>
                ⊟ Monitoreo — Mezcla en vivo (UI)
              </button>
            )}
          </div>
        </div>
      )}

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
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
        Palabra del <span style={{color:'var(--ac)'}}>Pastor</span>
      </div>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:20}}>Versículo y notas para el domingo</div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <div style={{width:24,height:24,borderRadius:7,background:'rgba(200,169,126,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#c8a97e" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Versículo del domingo</div>
        </div>
        <input className="inp" placeholder="Ej: Juan 3:16" style={{marginBottom:8}}
          value={pastorVersiculo||''} onChange={e=>setPastorVersiculo(e.target.value)}/>
        <textarea className="inp" placeholder="Escribe el texto del versículo aquí..."
          rows={4} style={{width:'100%',resize:'vertical',fontFamily:"'Lexend Giga',sans-serif",fontSize:13,lineHeight:1.6}}
          value={pastorTexto||''} onChange={e=>setPastorTexto(e.target.value)}/>
      </div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <div style={{width:24,height:24,borderRadius:7,background:'rgba(48,192,183,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#30C0B7" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
          </div>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Notas del mensaje</div>
        </div>
        <textarea className="inp" placeholder="Título del mensaje, puntos principales, notas para el equipo..."
          rows={5} style={{width:'100%',resize:'vertical',fontFamily:"'Lexend Giga',sans-serif",fontSize:13,lineHeight:1.6}}
          value={pastorNotas||''} onChange={e=>setPastorNotas(e.target.value)}/>
      </div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <div style={{width:24,height:24,borderRadius:7,background:'rgba(253,128,131,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#FD8083" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Archivos para multimedia</div>
        </div>
        <div style={{fontSize:11,color:'var(--tx2)',marginBottom:12,lineHeight:1.6}}>PPT, imágenes o PDF que el equipo de proyecciones necesita para el servicio.</div>
        <label style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:10,border:'1px dashed rgba(253,128,131,.3)',background:'rgba(253,128,131,.04)',cursor:'pointer',transition:'all .2s'}}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(253,128,131,.08)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(253,128,131,.04)'}>
          <input type="file" accept=".ppt,.pptx,.pdf,.jpg,.jpeg,.png,.gif" multiple style={{display:'none'}}
            onChange={e=>{
              const files=Array.from(e.target.files||[]);
              if(files.length) onToast({text:`${files.length} archivo${files.length>1?'s':''} listo${files.length>1?'s':''}`,sub:'El equipo multimedia puede verlo'});
            }}/>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FD8083" strokeWidth="1.8">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'#FD8083'}}>Subir archivos</div>
            <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>PPT · PDF · Imágenes</div>
          </div>
        </label>
      </div>
      <div style={{display:'flex',gap:8,marginTop:4}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>Cancelar</button>
        <button className="btn btn-p" style={{flex:2}} onClick={()=>{onToast({text:'Guardado',sub:'Palabra del Pastor actualizada'});setBsView(null);}}>
          Guardar
        </button>
      </div>
    </div>
  );

  // ── PLANES Y PRECIOS ──
  if(bsView==='planes'){
    const PLANES_PERSONAL=[
      {id:'lite',name:'Lite',mensual:0,anual:0,color:'var(--tx3)',sub:'Para empezar',
        desc:'Ideal si recién estás probando SetSync o tienes un equipo muy chico. Gestionas tu música sin invitar a nadie más.',
        features:['Solo tú, sin invitados','10 canciones en tu cancionero','Setlists básicos para tus fechas']},
      {id:'pro',name:'Pro',mensual:7.90,anual:5.53,color:'var(--gn)',sub:'El más popular',
        desc:'Para el líder que ya arma equipo. Invita hasta 5 personas para que vean setlists, acordes y se sumen a la convocatoria.',
        features:['Tú + hasta 5 invitados','Cancionero completo, sin límite de canciones','Monitoreo por WiFi para tu mesa X32/M32/XR18','Secuencias & Click sincronizado']},
      {id:'premium',name:'Premium',mensual:19.90,anual:13.93,color:'var(--ac)',sub:'Producción pro',
        desc:'Cuando necesitas producción completa: multitracks, partituras y varias bandas o equipos bajo tu misma cuenta.',
        features:['Tú + hasta 15 invitados','Todo lo de Pro','Multitracks para tus secuencias','Partituras (MusicXML/PDF)','Gestiona varias bandas o equipos']},
    ];
    const PLANES_EQUIPO=[
      {id:'eq-1-10',name:'1–10 personas',mensual:4.90,anual:3.43,color:'var(--gn)',sub:'Equipos chicos',
        desc:'Toda tu iglesia o banda con Pro completo, cada persona con su propia sesión.',
        features:['Hasta 10 miembros con acceso completo','Cancionero, monitoreo por WiFi y secuencias','Precio por persona, no por cuenta']},
      {id:'eq-11-25',name:'11–25 personas',mensual:3.90,anual:2.73,color:'var(--ac)',sub:'Equipos medianos',
        desc:'Para congregaciones o bandas con varios equipos rotativos (alabanza, proyección, sonido).',
        features:['Hasta 25 miembros con acceso completo','Todo lo del tramo anterior','Precio por persona más bajo']},
      {id:'eq-26-40',name:'26–40 personas',mensual:2.90,anual:2.03,color:'#a78bfa',sub:'Equipos grandes',
        desc:'Multi-equipo, multi-servicio: varios grupos trabajando en paralelo bajo una sola organización.',
        features:['Hasta 40 miembros con acceso completo','Todo lo del tramo anterior','Ideal para múltiples sedes o servicios']},
      {id:'eq-40+',name:'40+ personas',mensual:1.50,anual:1.05,color:'var(--tx3)',sub:'Redes y multi-sede',
        desc:'Para redes de iglesias o productoras con muchos equipos. Hablamos directo para ajustar el trato.',
        features:['Miembros ilimitados','Todo lo de los tramos anteriores','Soporte prioritario y onboarding asistido']},
    ];
    const BloquePlanes=({planes,periodo,setPeriodo,activo,onElegir})=>(
      <>
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {['mensual','anual'].map(p=>(
            <button key={p} onClick={()=>setPeriodo(p)} style={{flex:1,padding:9,borderRadius:'var(--rad-sm)',
              border:periodo===p?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',
              background:periodo===p?'rgba(200,169,126,.08)':'var(--s1)',
              color:periodo===p?'var(--ac)':'var(--tx3)',fontWeight:700,fontSize:11,cursor:'pointer',
              fontFamily:"'Lexend Giga',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
              {p==='mensual'?'Mensual':'Anual'}
              {p==='anual'&&<span style={{fontSize:8,color:'var(--gn)',fontWeight:900}}>−30%</span>}
            </button>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {planes.map(p=>(
            <div key={p.id} className="card" style={{padding:14,
              border:activo===p.id?`1px solid ${p.color}`:'1px solid var(--bd)',
              background:activo===p.id?`${p.color}0c`:'var(--s1)'}}>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
                <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:16,color:p.color,fontWeight:400}}>{p.name}</div>
                <div style={{textAlign:'right'}}>
                  <span style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:18,color:'var(--tx)'}}>
                    {p[periodo]===0?'Gratis':`$${p[periodo].toFixed(2)}`}
                  </span>
                  {p[periodo]>0&&<span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}> USD/mes</span>}
                </div>
              </div>
              <div style={{fontSize:9,color:p.color,fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,opacity:.75,textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>{p.sub}</div>
              <div style={{fontSize:11,color:'var(--tx2)',lineHeight:1.6,marginBottom:10,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>{p.desc}</div>
              <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:10}}>
                {p.features.map(f=>(
                  <div key={f} style={{display:'flex',alignItems:'flex-start',gap:6}}>
                    <span style={{color:p.color,fontSize:10,marginTop:1,flexShrink:0}}>✓</span>
                    <span style={{fontSize:11,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,lineHeight:1.5}}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>onElegir(p)} disabled={activo===p.id}
                style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'none',cursor:activo===p.id?'default':'pointer',
                  background:activo===p.id?'rgba(255,255,255,.06)':`${p.color}20`,color:activo===p.id?'var(--tx3)':p.color,
                  fontSize:11,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>
                {activo===p.id?'Plan actual':'Elegir'}
              </button>
            </div>
          ))}
        </div>
      </>
    );
    return(
      <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
        </div>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
          Planes <span style={{color:'var(--ac)'}}>y precios</span>
        </div>
        <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:22}}>
          SetSync tiene dos formas de pagar: por tu cuenta personal (tú invitas gente con límite) o por equipo (todos con acceso completo, precio por persona).
        </div>

        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:4}}>Cuenta personal</div>
        <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,lineHeight:1.5,marginBottom:12}}>
          Tú administras la cuenta y decides a quién invitar, con un tope de invitados que crece según el plan.
        </div>
        <div style={{marginBottom:28}}>
          <BloquePlanes planes={PLANES_PERSONAL} periodo={periodoPersonal} setPeriodo={setPeriodoPersonal}
            activo={planId} onElegir={p=>{setPlanId(p.id);onToast({text:'Plan actualizado',sub:p.name});}}/>
        </div>

        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:4}}>Cuenta equipo</div>
        <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,lineHeight:1.5,marginBottom:12}}>
          Todos los miembros quedan con funciones completas (Cancionero, monitoreo por WiFi, multitracks y partituras). El precio es por persona y baja mientras más grande es el equipo — te conviene desde que ya todos necesitan Pro.
        </div>
        <BloquePlanes planes={PLANES_EQUIPO} periodo={periodoEquipo} setPeriodo={setPeriodoEquipo}
          activo={null} onElegir={p=>onToast({text:'Solicitud enviada',sub:`Cotización para ${p.name}`})}/>
      </div>
    );
  }

  // ── CREAR ENSAYO ──
  if(bsView==='ensayo'){
    const ensayosDelEvento = ensRef ? ensayos.filter(e=>e.ref===ensRef) : [];
    const duplicarEnsayo = (en) => {
      const copia={...en,id:`ens${Date.now()}`,nombre:`${en.nombre||'Ensayo'} (copia)`};
      setEnsayos(prev=>[...prev,copia]);
      onToast({text:'Ensayo duplicado',sub:copia.nombre});
    };
    return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
        Crear <span style={{color:'var(--ac)'}}>ensayo</span>
      </div>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:20}}>Agenda un ensayo y convoca a los equipos que necesitas</div>

      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Asignar a</div>
        <select className="inp" value={ensRef} onChange={e=>setEnsRef(e.target.value)} style={{cursor:'pointer',background:'var(--s2)',color:'var(--tx)',border:'1px solid var(--bd)'}}>
          <option value="">Sin asignar — ensayo libre</option>
          {eventos.map(ev=>(<option key={`ev-${ev.id}`} value={`evento:${ev.id}`}>{ev.nombre} · {ev.fecha}</option>))}
        </select>
      </div>

      {ensayosDelEvento.length>0&&(
        <div className="card" style={{padding:14,marginBottom:14,border:'1px solid rgba(200,169,126,.28)',background:'rgba(200,169,126,.05)'}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
            Ya hay {ensayosDelEvento.length} ensayo{ensayosDelEvento.length>1?'s':''} para este evento
          </div>
          {ensayosDelEvento.map(en=>(
            <div key={en.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0'}}>
              <span style={{flex:1,fontSize:12,color:'var(--tx)'}}>{en.nombre||'Ensayo'}</span>
              <button onClick={()=>duplicarEnsayo(en)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>Duplicar</button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Setlist a ensayar</div>
        <select className="inp" value={ensSetlistId} onChange={e=>setEnsSetlistId(e.target.value)} style={{cursor:'pointer',background:'var(--s2)',color:'var(--tx)',border:'1px solid var(--bd)'}}>
          <option value="">Sin setlist asignado</option>
          {slGuardados.map(sl=>(<option key={sl.id} value={sl.id}>{sl.nombre} · {sl.canciones.length} canciones</option>))}
        </select>
      </div>

      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Convocar equipos</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {equipos.map(eq=>{
            const activo=ensEquipos.includes(eq.id);
            return(
              <button key={eq.id} onClick={()=>setEnsEquipos(v=>activo?v.filter(x=>x!==eq.id):[...v,eq.id])}
                style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:100,cursor:'pointer',
                  border:activo?`1px solid ${eq.color}80`:'1px solid var(--bd)',background:activo?`${eq.color}12`:'var(--s1)'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:eq.color}}/>
                <span style={{fontSize:11,fontWeight:400,color:'var(--tx)'}}>{eq.name}</span>
                <span style={{fontSize:10,color:'var(--tx3)'}}>{(eq.miembros||[]).length}p</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Notas del ensayo</div>
        <textarea className="inp" value={ensNotas} onChange={e=>setEnsNotas(e.target.value)}
          style={{minHeight:70,resize:'vertical',lineHeight:1.6,fontSize:12}}
          placeholder="Ej: Repasar bloque de adoración, foco en transiciones."/>
      </div>

      <div className="card" style={{padding:14,marginBottom:18}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Archivo adjunto</div>
        {ensArchivo?(
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
            borderRadius:10,background:'rgba(48,192,183,.08)',border:'1px solid rgba(48,192,183,.25)'}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--gn)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span style={{flex:1,fontSize:12,color:'var(--tx)'}}>{ensArchivo}</span>
            <button onClick={()=>setEnsArchivo(null)} style={{background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',fontSize:16}}>×</button>
          </div>
        ):(
          <label style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:10,border:'1px dashed rgba(255,255,255,.2)',background:'rgba(255,255,255,.03)',cursor:'pointer'}}>
            <input type="file" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)setEnsArchivo(f.name);}}/>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--ac)'}}>Subir archivo</div>
              <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>PDF, Word o audio para el equipo</div>
            </div>
          </label>
        )}
      </div>

      <div style={{display:'flex',gap:9}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>Cancelar</button>
        <button className="btn btn-p" style={{flex:2,justifyContent:'center'}} disabled={!ensEquipos.length}
          onClick={()=>{
            const sl=slGuardados.find(s=>s.id===ensSetlistId);
            const nuevo={id:`ens${Date.now()}`,ref:ensRef,setlistId:ensSetlistId,setlistNombre:sl?.nombre||'',equipos:[...ensEquipos],archivo:ensArchivo,notas:ensNotas,nombre:'Ensayo'};
            setEnsayos(prev=>[...prev,nuevo]);
            onToast({text:'Ensayo creado',sub:`${ensEquipos.length} equipo${ensEquipos.length>1?'s':''} convocado${ensEquipos.length>1?'s':''}`});
            setEnsRef('');setEnsSetlistId('');setEnsEquipos([]);setEnsArchivo(null);setEnsNotas('');setBsView(null);
          }}>
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Crear ensayo
        </button>
      </div>
    </div>
    );
  }

  const ITEMS=[
    {id:'evento',label:`Crear ${vx.evento.singular.toLowerCase()}`,sub:'Configura setlist, equipos y convocatoria',icon:'calendar',color:'#c8a97e',adminOnly:false},
    {id:'setlist',label:'Crear setlist',sub:'Arma el orden de canciones para el evento',icon:'music',color:'#30C0B7',adminOnly:false},
    {id:'ensayo',label:'Crear ensayo',sub:'Asigna fecha o setlist, convoca equipos y sube archivos',icon:'mic',color:'#FD8083',adminOnly:false},
    {id:'equipos',label:'Gestión de equipos',sub:'Miembros, equipos y roles',icon:'team',color:'#30C0B7',adminOnly:true},
    {id:'permisos',label:'Delegar permisos',sub:'Dar acceso a líderes de área',icon:'shield',color:'#c8a97e',adminOnly:true},
    {id:'notif',label:'Notificaciones',sub:'Convoca y recuerda al equipo',icon:'bell',color:'#FD8083',adminOnly:false},
    {id:'personalizar',label:'Personalización',sub:'Logo, tema visual e idioma',icon:'settings',color:'#7dd3c0',adminOnly:false},
    ...(feat.cancioneroUniversal?[{id:'pastor',label:'Palabra del Pastor',sub:'Versículo, notas y archivos para multimedia',icon:'book',color:'#e0a458',adminOnly:true}]:[]),
    {id:'planes',label:'Planes y precios',sub:'Compara y mejora tu plan SetSync',icon:'star',color:'#c8a97e',adminOnly:true},
  ].filter(it=>{
    if(it.adminOnly&&!isAdmin)return false;
    return true;
  });

  const ITEM_ICONS={
    calendar:<path d="M3 10h18M8 3v4M16 3v4M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>,
    music:<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    mic:<><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></>,
    team:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    shield:<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>,
    bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    book:<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    star:<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  };

  return(
    <div style={{padding:'var(--pw-y,10px) var(--pw-x,14px)',paddingBottom:90}}>
      <div style={{marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05}}>Backstage</div>
          <span style={{padding:'2px 9px',borderRadius:100,fontSize:9,fontWeight:700,border:'1px solid rgba(200,169,126,.28)',background:'rgba(200,169,126,.07)',color:'var(--ac)',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0,alignSelf:'center'}}>{isAdmin?'Super Admin':'Líder'}</span>
        </div>
        <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:4}}>Panel de control del equipo</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {ITEMS.map(it=>(
          <button key={it.id} onClick={()=>setBsView(it.id)}
            style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:14,padding:'18px 16px',cursor:'pointer',textAlign:'left',transition:'all .18s',display:'flex',flexDirection:'column',gap:10}}>
            <div style={{width:32,height:32,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',background:`${it.color}1c`}}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={it.color} strokeWidth="1.8">{ITEM_ICONS[it.icon]}</svg>
            </div>
            <div>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,color:'var(--tx)',lineHeight:1.1,fontSize:15,marginBottom:5}}>{it.label}</div>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:10,color:'var(--tx3)',lineHeight:1.5}}>{it.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Sesión, Plan y Conexión — siempre visibles abajo ── */}
      <div style={{marginTop:20,display:'flex',flexDirection:'column',gap:8}}>

        {/* Sesión */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'12px 14px',borderRadius:12,background:'var(--s1)',
          border:'1px solid var(--bd)'}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>
              Daniel Miranda
            </div>
            <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",marginTop:2}}>
              dmiranda@fearless.cl · Super Admin
            </div>
          </div>
          <button onClick={()=>onToast({text:'Cerrando sesión...',sub:'Hasta pronto'})}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid rgba(253,128,131,.3)',
              background:'rgba(253,128,131,.06)',color:'var(--rd)',cursor:'pointer',
              fontSize:10,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",
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
          border:'1px solid var(--bd)'}}>
          <div>
            <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
              letterSpacing:'1.5px',fontFamily:"'Lexend Giga',sans-serif",marginBottom:3}}>Plan actual</div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--ac)',fontFamily:"'Lexend Giga',sans-serif",
              textTransform:'capitalize'}}>{planId}</div>
          </div>
          <button onClick={()=>{}}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid rgba(48,192,183,.3)',
              background:'rgba(48,192,183,.07)',color:'var(--gn)',cursor:'pointer',
              fontSize:10,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>
            Mejorar plan
          </button>
        </div>

        {/* Firebase / conexión */}
        {firebaseListo&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'10px 14px',borderRadius:12,background:'var(--s1)',
            border:'1px solid var(--bd)'}}>
            <div>
              <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
                letterSpacing:'1.5px',fontFamily:"'Lexend Giga',sans-serif",marginBottom:3}}>Sincronización</div>
              <div style={{fontSize:11,color:online?'var(--gn)':'var(--tx3)',
                fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
                {online?'En línea · Firebase activo':'Sin conexión · modo local'}
              </div>
            </div>
            <button onClick={()=>setOnline(o=>!o)}
              style={{width:40,height:22,borderRadius:11,border:'none',cursor:'pointer',flexShrink:0,
                background:online?'var(--gn)':'rgba(255,255,255,.1)',position:'relative',transition:'background .2s'}}>
              <div style={{position:'absolute',top:2,left:online?20:2,width:18,height:18,borderRadius:9,
                background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
