// Backstage: pantalla inicial única de gestión para Iglesia y Banda (antes:
// BackstageView.jsx + BandaBackstage.jsx). Menú base compartido + items
// feature-flagged por modo (ver data/modo.js MODO_FEATURES).
import { useState } from 'react';
import { getModoTexto, getModoFeatures, getTiposEventoDisponibles } from '../data/modo';
import { ItinerarioEditor } from './ItinerarioEditor';

export function Backstage({
  personas=[],setPersonas=()=>{},
  equipos=[],setEquipos=()=>{}, // equipos formales (Banda/Sonido/etc), portado de BackstageView.jsx
  eventos=[],setEventos=()=>{},
  isAdmin,onToast,mode,lang='es',
  rolesDisponibles=[],
  planActivo=null,planId='lite',setPlanId=()=>{}, // capa de planes (Fase 1)
  persistirPersona=()=>{},online=true,setOnline=()=>{},firebaseListo=false,onCrearInvitacion=async()=>null, // Firebase (Fase 2)
  theme='dark',setTheme=()=>{}, // selector de tema — portado del BackstageView.jsx original de Iglesia
  repertorio=[], // para el constructor de setlist real
  persistirEquipo=()=>{},
}){
  const vx=getModoTexto(mode,lang);
  const feat=getModoFeatures(mode);
  const tipos=getTiposEventoDisponibles(mode,lang);
  const [bsView,setBsView]=useState(null);
  const [subView,setSubView]=useState(null);
  const [nuevoNombre,setNuevoNombre]=useState('');
  const [nuevoRol,setNuevoRol]=useState(rolesDisponibles[0]?.id||'');
  const [palabraTexto,setPalabraTexto]=useState('');
  const [activeEq,setActiveEq]=useState(null);
  const [nuevaFormacion,setNuevaFormacion]=useState('');
  // ── Constructor de setlist — portado del BackstageView.jsx original ──
  const [slNombre,setSlNombre]=useState('');
  const [slEventoId,setSlEventoId]=useState('');
  const [slCanciones,setSlCanciones]=useState([]);
  const [slSearch,setSlSearch]=useState('');
  const [slGuardados,setSlGuardados]=useState([]);
  // ── Crear evento — portado del BackstageView.jsx original ────────────
  const [evNombre,setEvNombre]=useState('');
  const [evTipo,setEvTipo]=useState(null);
  const [evFecha,setEvFecha]=useState(''); // YYYY-MM-DD, input type=date nativo
  const [evLugar,setEvLugar]=useState('');
  const [evSetlist,setEvSetlist]=useState([]);
  const [evSearch,setEvSearch]=useState('');
  const [evEquiposConvocados,setEvEquiposConvocados]=useState([]);
  const [evNotas,setEvNotas]=useState('');

  const MENU=[
    {id:'evento', label:lang==='en'?`Create ${vx.evento.singular}`:`Crear ${vx.evento.singular}`,
      sub:tipos.map(t=>t.label).join(', ')},
    {id:'setlist', label:lang==='en'?'Create setlist':'Crear setlist', sub:lang==='en'?'Build and assign to an event':'Arma y asigna a un evento'},
    ...(feat.cancioneroUniversal?[{id:'palabra',label:lang==='en'?'Word for the team':'Palabra para el equipo',
      sub:lang==='en'?'Verse and notes':'Versículo y notas',adminOnly:true}]:[]),
    {id:'equipos', label:lang==='en'?'Manage teams':'Gestión de equipos', sub:vx.equipoPersona.plural, adminOnly:true},
    {id:'notif',   label:lang==='en'?'Notifications':'Notificaciones',  sub:lang==='en'?'Notify the team':'Avisar al equipo'},
    {id:'config',  label:lang==='en'?'Settings':'Configuración',        sub:lang==='en'?'Account settings':'Ajustes de la cuenta'},
  ];

  // ── Crear evento (portado, adaptado: fecha ISO real con <input
  // type=date> en vez de 3 selects, tipos por modo en vez de hardcodeado
  // "Culto Dominical", equipos convocados del nuevo estado `equipos`) ──
  if(bsView==='evento')return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
        {lang==='en'?'Create':'Crear'} <span style={{color:'var(--ac)'}}>{vx.evento.singular.toLowerCase()}</span>
      </div>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:18}}>
        {lang==='en'?'Set name, date, setlist and team in one place':'Configura nombre, fecha, setlist y equipo en un solo lugar'}
      </div>

      <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>
          {lang==='en'?'Type':'Tipo'}
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
          {tipos.map(t=>(
            <button key={t.label} onClick={()=>{setEvTipo(t.tipo);if(!evNombre)setEvNombre(t.label);}}
              style={{padding:'6px 12px',borderRadius:100,
                border:evTipo===t.tipo?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',
                background:evTipo===t.tipo?'rgba(200,169,126,.12)':'var(--s2)',
                color:evTipo===t.tipo?'var(--ac)':'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {t.label}
            </button>
          ))}
        </div>
        <input value={evNombre} onChange={e=>setEvNombre(e.target.value)}
          placeholder={lang==='en'?'Or type a custom name...':'O escribe un nombre personalizado...'}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s2)',
            color:'var(--tx)',fontSize:13,boxSizing:'border-box',marginBottom:8,fontFamily:"'Lexend Giga',sans-serif"}}/>
        <input value={evLugar} onChange={e=>setEvLugar(e.target.value)}
          placeholder={lang==='en'?'Place':'Lugar'}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s2)',
            color:'var(--tx)',fontSize:13,boxSizing:'border-box',fontFamily:"'Lexend Giga',sans-serif"}}/>
      </div>

      <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>
          {lang==='en'?'Date':'Fecha'}
        </div>
        <input type="date" value={evFecha} onChange={e=>setEvFecha(e.target.value)}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s2)',
            color:'var(--tx)',fontSize:13,boxSizing:'border-box',fontFamily:"'Lexend Giga',sans-serif",colorScheme:'dark'}}/>
      </div>

      <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Setlist</div>
        <input value={evSearch} onChange={e=>setEvSearch(e.target.value)}
          placeholder={lang==='en'?'Search song...':'Buscar canción...'}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s2)',
            color:'var(--tx)',fontSize:13,boxSizing:'border-box',marginBottom:8,fontFamily:"'Lexend Giga',sans-serif"}}/>
        {evSetlist.length>0&&(
          <div style={{marginBottom:8}}>
            {evSetlist.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                <span style={{fontSize:11,color:'var(--tx3)',fontWeight:700,minWidth:16}}>{i+1}</span>
                <span style={{flex:1,fontSize:12,fontWeight:700,color:'var(--tx)'}}>{s}</span>
                <button onClick={()=>setEvSetlist(l=>l.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'var(--rd)',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{maxHeight:200,overflowY:'auto'}}>
          {repertorio.filter(s=>s.n.toLowerCase().includes(evSearch.toLowerCase())&&!evSetlist.includes(s.n)).map(s=>(
            <div key={s.n} onClick={()=>setEvSetlist(l=>[...l,s.n])}
              style={{padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,.04)',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{s.n}</span>
              <span style={{fontSize:10,color:'var(--ac)',fontWeight:700}}>{s.key} · {s.bpm}</span>
            </div>
          ))}
        </div>
      </div>

      {equipos.length>0&&(
        <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>
            {lang==='en'?'Teams convened':'Equipos convocados'}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {equipos.map(eq=>{
              const isOn=evEquiposConvocados.includes(eq.id);
              return(
                <label key={eq.id} onClick={()=>setEvEquiposConvocados(prev=>isOn?prev.filter(x=>x!==eq.id):[...prev,eq.id])}
                  style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:100,
                    border:isOn?'1px solid '+eq.color+'80':'1px solid var(--bd)',
                    background:isOn?eq.color+'12':'var(--s2)',cursor:'pointer'}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:eq.color}}/>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{eq.name}</span>
                  <span style={{fontSize:10,color:'var(--tx3)'}}>{personas.filter(p=>p.equipoId===eq.id).length}p</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>
          {lang==='en'?'Itinerary':'Itinerario'}
        </div>
        <ItinerarioEditor/>
      </div>

      <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:16}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>
          {lang==='en'?'Event notes':'Notas del evento'}
        </div>
        <textarea value={evNotas} onChange={e=>setEvNotas(e.target.value)}
          placeholder={lang==='en'?'E.g: Arrive 30 min before rehearsal...':'Ej: Llegar 30 min antes del ensayo. Revisar las canciones con tiempo.'}
          style={{width:'100%',minHeight:90,padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s2)',
            color:'var(--tx)',fontSize:12,resize:'vertical',boxSizing:'border-box',lineHeight:1.6,fontFamily:"'Lexend Giga',sans-serif"}}/>
      </div>

      <div style={{display:'flex',gap:9}}>
        <button onClick={()=>setBsView(null)}
          style={{flex:1,padding:'11px',borderRadius:12,border:'1px solid var(--bd)',background:'transparent',
            color:'var(--tx3)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
          {lang==='en'?'Cancel':'Cancelar'}
        </button>
        <button disabled={!evNombre.trim()&&!evFecha}
          onClick={()=>{
            const nuevoEv={
              id:Date.now(), tipo:evTipo||tipos[0]?.tipo||'culto',
              fecha:evFecha||null, lugar:evLugar, nombre:evNombre.trim()||(lang==='en'?'New event':'Nuevo evento'),
              setlist:evSetlist.map(n=>{const c=repertorio.find(r=>r.n===n);return {name:n,key:c?.key,bpm:c?.bpm};}),
              equiposConvocados:evEquiposConvocados, notas:evNotas,
            };
            setEventos(prev=>[...prev,nuevoEv]);
            persistirEvento(nuevoEv);
            onToast({text:lang==='en'?'Event created':'Evento creado',sub:`${nuevoEv.nombre} · ${evSetlist.length} ${lang==='en'?'songs':'canciones'}`});
            setEvNombre('');setEvTipo(null);setEvFecha('');setEvLugar('');setEvSetlist([]);setEvNotas('');setEvEquiposConvocados([]);
            setBsView(null);
          }}
          style={{flex:2,padding:'11px',borderRadius:12,border:'none',background:'var(--ac)',color:'var(--bg)',
            fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",
            display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:(!evNombre.trim()&&!evFecha)?.5:1}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {lang==='en'?'Create event':'Crear evento'}
        </button>
      </div>
    </div>
  );

  // ── Constructor de setlist (portado, adaptado al esquema único de
  // eventos: guarda objetos {name,key,bpm} en ev.setlist, no strings) ──
  if(bsView==='setlist'){
    const moverCancion=(from,to)=>{
      const arr=[...slCanciones];
      const [item]=arr.splice(from,1);
      arr.splice(to,0,item);
      setSlCanciones(arr);
    };
    const guardarSetlist=()=>{
      if(!slCanciones.length){onToast(lang==='en'?'Add at least one song':'Agrega al menos una canción');return;}
      const setlistObjs = slCanciones.map(n=>{
        const c=repertorio.find(r=>r.n===n);
        return {name:n, key:c?.key, bpm:c?.bpm};
      });
      const nuevo={id:Date.now(),nombre:slNombre||`Setlist ${new Date().toLocaleDateString('es-CL')}`,
        canciones:[...slCanciones],eventoId:slEventoId||null,fecha:new Date().toLocaleDateString('es-CL')};
      setSlGuardados(prev=>[...prev,nuevo]);
      if(slEventoId){
        setEventos(prev=>prev.map(ev=>String(ev.id)===String(slEventoId)?{...ev,setlist:setlistObjs}:ev));
      }
      onToast({text:lang==='en'?'Setlist saved':'Setlist guardado',sub:`${slCanciones.length} ${lang==='en'?'songs':'canciones'}${slEventoId?(lang==='en'?' · Assigned to event':' · Asignado al evento'):''}`});
      setSlCanciones([]);setSlNombre('');setSlEventoId('');setSlSearch('');
      setBsView(null);
    };

    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
        </div>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
          {lang==='en'?'Create':'Crear'} <span style={{color:'var(--ac)'}}>setlist</span>
        </div>
        <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:18}}>
          {lang==='en'?`Build the song list and assign it to a ${vx.evento.singular.toLowerCase()} whenever you want`:`Arma la lista de canciones y asígnala a un ${vx.evento.singular.toLowerCase()} cuando quieras`}
        </div>

        <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
            {lang==='en'?'Setlist name':'Nombre del setlist'}
          </div>
          <input value={slNombre} onChange={e=>setSlNombre(e.target.value)}
            placeholder={lang==='en'?'E.g: July 6th · Worship Night...':'Ej: Setlist 6 de julio · Noche de adoración...'}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s2)',
              color:'var(--tx)',fontSize:13,boxSizing:'border-box',fontFamily:"'Lexend Giga',sans-serif"}}/>
        </div>

        <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
            {lang==='en'?'Assign to event':'Asignar a evento'}
            <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'var(--tx3)',fontSize:10,marginLeft:6}}>
              · {lang==='en'?'optional, you can do it later':'opcional, puedes hacerlo después'}
            </span>
          </div>
          {eventos.length===0?(
            <div style={{padding:12,borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.1)',textAlign:'center'}}>
              <div style={{fontSize:12,color:'var(--tx3)',marginBottom:6}}>{lang==='en'?'No events yet':'Aún no hay eventos creados'}</div>
              <button onClick={()=>setBsView('evento')} style={{fontSize:11,fontWeight:700,color:'var(--ac)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                + {lang==='en'?'Create an event first →':'Crear un evento primero →'}
              </button>
            </div>
          ):(
            <select value={slEventoId} onChange={e=>setSlEventoId(e.target.value)}
              style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s2)',
                color:'var(--tx)',fontSize:13,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              <option value="">{lang==='en'?'Unassigned — save as draft':'Sin asignar — guardar como borrador'}</option>
              {eventos.map(ev=>(<option key={ev.id} value={ev.id}>{ev.nombre}{ev.fecha?' · '+ev.fecha:''}</option>))}
            </select>
          )}
          {slEventoId&&(
            <div style={{marginTop:8,padding:'8px 12px',borderRadius:8,background:'rgba(94,206,160,.08)',border:'1px solid rgba(94,206,160,.2)',
              fontSize:11,color:'var(--gn)',fontWeight:700,display:'flex',alignItems:'center',gap:6}}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              {lang==='en'?'Assigned to:':'Asignado a:'} {eventos.find(e=>String(e.id)===String(slEventoId))?.nombre}
            </div>
          )}
        </div>

        <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>
              {lang==='en'?'Songs':'Canciones'}
            </div>
            {slCanciones.length>0&&<span style={{fontSize:11,fontWeight:700,color:'var(--ac)'}}>{slCanciones.length}</span>}
          </div>
          {slCanciones.length>0&&(
            <div style={{marginBottom:12,borderRadius:10,border:'1px solid var(--bd)',overflow:'hidden'}}>
              {slCanciones.map((s,i)=>{
                const c=repertorio.find(r=>r.n===s);
                return(
                  <div key={s+i} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',
                    borderBottom:i<slCanciones.length-1?'1px solid rgba(255,255,255,.05)':'none',
                    background:i%2===0?'rgba(255,255,255,.02)':'transparent'}}>
                    <span style={{fontSize:13,fontWeight:900,color:'var(--tx3)',minWidth:22,textAlign:'right'}}>{i+1}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:13,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s}</div>
                      <div style={{fontSize:10,color:'var(--tx3)',marginTop:1}}>{c?.key} · {c?.bpm} BPM</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:2,flexShrink:0}}>
                      <button disabled={i===0} onClick={()=>moverCancion(i,i-1)}
                        style={{width:22,height:20,border:'1px solid var(--bd)',background:'var(--s2)',
                          color:i===0?'var(--tx3)':'var(--tx2)',cursor:i===0?'not-allowed':'pointer',borderRadius:'4px 4px 0 0',
                          display:'flex',alignItems:'center',justifyContent:'center',opacity:i===0?.3:1}}>
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <button disabled={i===slCanciones.length-1} onClick={()=>moverCancion(i,i+1)}
                        style={{width:22,height:20,border:'1px solid var(--bd)',borderTop:'none',background:'var(--s2)',
                          color:i===slCanciones.length-1?'var(--tx3)':'var(--tx2)',cursor:i===slCanciones.length-1?'not-allowed':'pointer',
                          borderRadius:'0 0 4px 4px',display:'flex',alignItems:'center',justifyContent:'center',opacity:i===slCanciones.length-1?.3:1}}>
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>
                    <button onClick={()=>setSlCanciones(prev=>prev.filter((_,j)=>j!==i))}
                      style={{width:26,height:26,border:'1px solid rgba(255,82,82,.2)',background:'rgba(255,82,82,.06)',
                        color:'var(--rd)',cursor:'pointer',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:15}}>×</button>
                  </div>
                );
              })}
            </div>
          )}
          <input value={slSearch} onChange={e=>setSlSearch(e.target.value)}
            placeholder={lang==='en'?'Search and add song...':'Buscar y agregar canción...'}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s2)',
              color:'var(--tx)',fontSize:13,boxSizing:'border-box',marginBottom:slSearch?8:0,fontFamily:"'Lexend Giga',sans-serif"}}/>
          {slSearch&&(
            <div style={{maxHeight:220,overflowY:'auto',borderRadius:9,border:'1px solid var(--bd)',background:'var(--s2)'}}>
              {repertorio.filter(s=>s.n.toLowerCase().includes(slSearch.toLowerCase())&&!slCanciones.includes(s.n)).slice(0,12).map(s=>(
                <div key={s.n} onClick={()=>{setSlCanciones(prev=>[...prev,s.n]);setSlSearch('');}}
                  style={{padding:'9px 12px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',
                    borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:12,color:'var(--tx)'}}>{s.n}</div>
                    <div style={{fontSize:10,color:'var(--tx3)',marginTop:1}}>{s.key} · {s.bpm} BPM</div>
                  </div>
                  <div style={{width:22,height:22,borderRadius:6,background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.25)',
                    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ac)" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                </div>
              ))}
              {repertorio.filter(s=>s.n.toLowerCase().includes(slSearch.toLowerCase())&&!slCanciones.includes(s.n)).length===0&&(
                <div style={{padding:12,textAlign:'center',fontSize:12,color:'var(--tx3)'}}>{lang==='en'?'No matches':'No hay coincidencias'}</div>
              )}
            </div>
          )}
        </div>

        {slGuardados.length>0&&(
          <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>
              {lang==='en'?'Saved setlists':'Setlists guardados'} ({slGuardados.length})
            </div>
            {slGuardados.map(sl=>(
              <div key={sl.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>{sl.nombre}</div>
                  <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>
                    {sl.canciones.length} {lang==='en'?'songs':'canciones'} · {sl.fecha}
                    {sl.eventoId&&<span style={{color:'var(--gn)',marginLeft:6}}>· {lang==='en'?'Assigned':'Asignado'} ✓</span>}
                  </div>
                </div>
                <button onClick={()=>{setSlCanciones([...sl.canciones]);setSlNombre(sl.nombre);setSlGuardados(prev=>prev.filter(x=>x.id!==sl.id));}}
                  style={{padding:'4px 10px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s2)',color:'var(--tx3)',
                    fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
                  {lang==='en'?'Edit':'Editar'}
                </button>
                <button onClick={()=>setSlGuardados(prev=>prev.filter(x=>x.id!==sl.id))}
                  style={{width:26,height:26,borderRadius:7,border:'1px solid rgba(255,82,82,.2)',background:'rgba(255,82,82,.06)',
                    color:'var(--rd)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:15}}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{display:'flex',gap:9}}>
          <button onClick={()=>setBsView(null)}
            style={{flex:1,padding:'11px',borderRadius:12,border:'1px solid var(--bd)',background:'transparent',
              color:'var(--tx3)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
            {lang==='en'?'Cancel':'Cancelar'}
          </button>
          <button disabled={!slCanciones.length} onClick={guardarSetlist}
            style={{flex:2,padding:'11px',borderRadius:12,border:'none',background:'var(--ac)',color:'var(--bg)',
              fontSize:13,fontWeight:800,cursor:slCanciones.length?'pointer':'not-allowed',opacity:slCanciones.length?1:.5,
              fontFamily:"'Lexend Giga',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            {slEventoId?(lang==='en'?'Save and assign to event':'Guardar y asignar al evento'):(lang==='en'?'Save setlist':'Guardar setlist')}
          </button>
        </div>
      </div>
    );
  }

  // ── Gestión de equipo (unificada) ────────────────────────────────────
  if(bsView==='equipos')return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}}
        onClick={()=>{setBsView(null);setSubView(null);setActiveEq(null);}}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:6}}>
        {lang==='en'?'Manage':'Gestión de'} <span style={{color:'var(--ac)'}}>{vx.equipoPersona.plural.toLowerCase()}</span>
      </div>
      <div style={{fontSize:12,color:'var(--tx2)',marginBottom:18,fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.5}}>
        {lang==='en'
          ?'Create work teams and roles within each one. You can also keep a general roster of people for any event.'
          :'Crea equipos de trabajo y los roles dentro de cada uno. También puedes mantener una nómina general de personas para cualquier evento.'}
      </div>

      <div className="ph">
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>
          {lang==='en'?`Roster · ${personas.length} people`:`Listado · ${personas.length} personas`}
        </div>
        {isAdmin&&(
          <button onClick={()=>setSubView(v=>v==='agregar'?null:'agregar')}
            style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,
              border:'1px solid var(--ac)',background:'rgba(200,169,126,.08)',color:'var(--ac)',
              cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
            + {lang==='en'?'Person':'Persona'}
          </button>
        )}
      </div>

      {subView==='agregar'&&isAdmin&&(
        <div style={{padding:'14px',borderRadius:14,border:'1px solid var(--bd)',background:'var(--s2)',marginBottom:16}}>
          <input value={nuevoNombre} onChange={e=>setNuevoNombre(e.target.value)}
            placeholder={lang==='en'?'Name':'Nombre'}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,marginBottom:8,boxSizing:'border-box',
              fontFamily:"'Lexend Giga',sans-serif"}}/>
          {rolesDisponibles.length>0&&(
            <select value={nuevoRol} onChange={e=>setNuevoRol(e.target.value)}
              style={{width:'100%',padding:'8px 10px',borderRadius:10,border:'1px solid var(--bd)',
                background:'var(--s1)',color:'var(--tx)',fontSize:13,marginBottom:8,
                fontFamily:"'Lexend Giga',sans-serif"}}>
              {rolesDisponibles.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          )}
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setSubView(null);setNuevoNombre('');}}
              style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid var(--bd)',background:'transparent',
                color:'var(--tx3)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {lang==='en'?'Cancel':'Cancelar'}
            </button>
            <button onClick={()=>{
                if(!nuevoNombre.trim()){onToast(lang==='en'?'Enter a name':'Ingresa un nombre');return;}
                if(planActivo&&personas.length>=planActivo.limiteMiembros){
                  onToast(lang==='en'?`Limit reached: ${planActivo.limiteMiembros} members on plan ${planActivo.label}`:`Límite alcanzado: ${planActivo.limiteMiembros} miembros en plan ${planActivo.label}`);
                  return;
                }
                const nueva={id:`p${Date.now()}`,nombre:nuevoNombre.trim(),rol:nuevoRol,email:null,equipoId:null};
                setPersonas(prev=>[...prev,nueva]);
                persistirPersona(nueva);
                setNuevoNombre('');setSubView(null);
                onToast(`✓ ${nuevoNombre.trim()} ${lang==='en'?'added':'agregado'}`);
              }}
              style={{flex:2,padding:'9px',borderRadius:10,border:'none',background:'var(--ac)',color:'var(--bg)',
                fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {lang==='en'?'Add':'Agregar'}
            </button>
          </div>
        </div>
      )}

      {personas.map(p=>(
        <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:12,
          border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:400,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>{p.nombre}</div>
            <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
              {rolesDisponibles.find(r=>r.id===p.rol)?.label||p.rol}{p.equipoNombre?` · ${p.equipoNombre}`:''}
            </div>
          </div>
          {isAdmin&&(
            <button onClick={()=>{setPersonas(prev=>prev.filter(x=>x.id!==p.id));onToast(`${p.nombre} ${lang==='en'?'removed':'eliminado'}`);}}
              style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--tx3)',padding:4,flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      ))}

      <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',margin:'20px 0 8px'}}>
        {lang==='en'?`Formations · ${equipos.length} teams`:`Formaciones · ${equipos.length} equipos`}
      </div>
      {equipos.map(eq=>{
        const miembrosEq = personas.filter(p=>p.equipoId===eq.id);
        return(
          <div key={eq.id} style={{borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:10,overflow:'hidden'}}>
            <div onClick={()=>setActiveEq(activeEq===eq.id?null:eq.id)}
              style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:9,cursor:'pointer'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
              <span style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:900,fontSize:15,color:'var(--tx)',flex:1}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{miembrosEq.length}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2"
                style={{transform:activeEq===eq.id?'rotate(180deg)':'none',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {activeEq===eq.id&&(
              <div style={{borderTop:'1px solid var(--bd)'}}>
                <div style={{padding:'8px 14px',borderBottom:'1px solid var(--bd)',display:'flex',flexWrap:'wrap',gap:5,alignItems:'center'}}>
                  <span style={{fontSize:9,fontWeight:700,color:'var(--tx3)',marginRight:4}}>{lang==='en'?'ROLES:':'ROLES:'}</span>
                  {eq.roles.map(r=>(
                    <span key={r} style={{fontSize:10,fontWeight:700,color:eq.color,background:eq.color+'15',
                      border:'1px solid '+eq.color+'30',padding:'2px 8px',borderRadius:100}}>{r}</span>
                  ))}
                  <button onClick={()=>{
                      const rol=prompt(lang==='en'?'New role name:':'Nombre del rol nuevo:');
                      if(rol&&rol.trim()){const upd={...eq,roles:[...eq.roles,rol.trim()]};setEquipos(prev=>prev.map(e=>e.id===eq.id?upd:e));persistirEquipo(upd);}
                    }}
                    style={{fontSize:10,color:'var(--tx3)',background:'var(--s2)',border:'1px dashed var(--bd)',
                      padding:'2px 8px',borderRadius:100,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",fontWeight:700}}>
                    + {lang==='en'?'Role':'Rol'}
                  </button>
                </div>
                {miembrosEq.map(m=>(
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                    <span style={{flex:1,fontSize:12,fontWeight:700,color:'var(--tx)'}}>{m.nombre}</span>
                    <select value={m.rol} onChange={e=>{const upd={...m,rol:e.target.value};setPersonas(prev=>prev.map(p=>p.id===m.id?upd:p));persistirPersona(upd);}}
                      style={{fontSize:10,color:eq.color,background:eq.color+'15',border:'1px solid '+eq.color+'30',
                        padding:'3px 8px',borderRadius:100,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",fontWeight:700,outline:'none'}}>
                      {eq.roles.map(r=>(<option key={r} value={r}>{r}</option>))}
                    </select>
                    <button onClick={()=>{const upd={...m,equipoId:null,equipoNombre:null,equipoColor:null};setPersonas(prev=>prev.map(p=>p.id===m.id?upd:p));persistirPersona(upd);}}
                      style={{width:22,height:22,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx3)',
                        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
                <div style={{padding:'8px 14px'}}>
                  <select style={{width:'100%',fontSize:11,cursor:'pointer',padding:'7px 10px',borderRadius:8,
                      border:'1px solid var(--bd)',background:'var(--s2)',color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}
                    defaultValue="" onChange={e=>{
                      if(!e.target.value)return;
                      setPersonas(prev=>prev.map(p=>{if(p.id!==e.target.value)return p;const upd={...p,equipoId:eq.id,equipoNombre:eq.name,equipoColor:eq.color,rol:eq.roles[0]||p.rol};persistirPersona(upd);return upd;}));
                      onToast(`✓ ${lang==='en'?'Added to':'Agregado a'} ${eq.name}`);
                      e.target.value='';
                    }}>
                    <option value="">{lang==='en'?'Add person...':'Agregar persona...'}</option>
                    {personas.filter(p=>p.equipoId!==eq.id).map(p=>(<option key={p.id} value={p.id}>{p.nombre}</option>))}
                  </select>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {isAdmin&&(
        <div style={{padding:14,borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',marginTop:6}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
            {lang==='en'?'New formation':'Nueva formación'}
          </div>
          <input value={nuevaFormacion} onChange={e=>setNuevaFormacion(e.target.value)}
            placeholder={lang==='en'?'New team or band name...':'Nombre del nuevo equipo o banda...'}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s2)',
              color:'var(--tx)',fontSize:13,marginBottom:8,boxSizing:'border-box',fontFamily:"'Lexend Giga',sans-serif"}}/>
          <button onClick={()=>{
              if(!nuevaFormacion.trim())return;
              const colores=['#EE227D','#30C0B7','#FD8083','#7b68ee','#5ecea0','#e07820'];
              const color=colores[equipos.length%colores.length];
              const nuevoEq={id:`eq${Date.now()}`,name:nuevaFormacion.trim(),color,roles:['General']};setEquipos(prev=>[...prev,nuevoEq]);persistirEquipo(nuevoEq);
              onToast(`✓ ${lang==='en'?'Formation created':'Formación creada'}`);
              setNuevaFormacion('');
            }}
            style={{width:'100%',padding:'9px',borderRadius:8,border:'none',background:'var(--tx)',color:'var(--bg)',
              fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
            + {lang==='en'?'Create formation':'Crear formación'}
          </button>
        </div>
      )}
    </div>
  );

  // ── Palabra para el equipo (solo Iglesia, vía feature flag) ──────────
  if(bsView==='palabra'&&feat.cancioneroUniversal)return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>
      <h2 style={{margin:'0 0 16px',fontSize:20,fontWeight:400,color:'var(--tx)',fontFamily:"'Special Gothic Expanded One',sans-serif"}}>
        {lang==='en'?'Word for the team':'Palabra para el equipo'}
      </h2>
      <textarea value={palabraTexto} onChange={e=>setPalabraTexto(e.target.value)}
        placeholder={lang==='en'?'Verse, message, notes...':'Versículo, mensaje, notas...'} rows={6}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,resize:'none',boxSizing:'border-box',lineHeight:1.5,marginBottom:8,
          fontFamily:"'Lexend Giga',sans-serif"}}/>
      <button onClick={()=>{onToast(lang==='en'?'Saved':'Guardado');setBsView(null);}}
        style={{width:'100%',padding:'11px',borderRadius:12,border:'none',background:'var(--ac)',color:'var(--bg)',
          fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
        {lang==='en'?'Save':'Guardar'}
      </button>
    </div>
  );

  // ── Configuración (incluye selector de plan — temporal hasta que haya
  // cobro real conectado; el plan es siempre del usuario individual) ────
  if(bsView==='config')return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>
      <h2 style={{margin:'0 0 16px',fontSize:20,fontWeight:400,color:'var(--tx)',fontFamily:"'Special Gothic Expanded One',sans-serif"}}>
        {lang==='en'?'Settings':'Configuración'}
      </h2>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
        textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
        {lang==='en'?'Plan':'Plan'}
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        {['lite','pro','premium'].map(p=>(
          <button key={p} onClick={()=>{setPlanId(p);onToast(`✓ Plan ${p}`);}}
            style={{flex:'1 0 28%',padding:'10px 8px',borderRadius:10,fontSize:12,fontWeight:700,
              border:`1px solid ${planId===p?'rgba(200,169,126,.5)':'var(--bd)'}`,
              background:planId===p?'rgba(200,169,126,.1)':'transparent',
              color:planId===p?'var(--ac)':'var(--tx3)',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",textTransform:'capitalize'}}>
            {p}
          </button>
        ))}
      </div>
      {planActivo&&(
        <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',background:'var(--s1)',fontSize:11,
          color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.8}}>
          {lang==='en'?'Songs':'Canciones'}: {personas.length>0?'':''}{planActivo.limiteCanciones}{lang==='en'?' max':' máx'}<br/>
          {lang==='en'?'Members':'Miembros'}: {planActivo.limiteMiembros===Infinity?(lang==='en'?'Unlimited':'Ilimitados'):planActivo.limiteMiembros}<br/>
          {vx.lider}: {planActivo.cancioneroUniversal||planActivo.premiereExclusivas?'✓':'—'}
        </div>
      )}
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,color:'var(--tx3)',lineHeight:1.4,marginTop:10,marginBottom:18}}>
        {lang==='en'?'Plan switcher is temporary, for testing — real billing not connected yet.':'Selector de plan temporal, para pruebas — el cobro real todavía no está conectado.'}
      </div>

      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
        textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
        {lang==='en'?'Sync':'Sincronización'}
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',
        borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:10}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>
            {firebaseListo?(online?(lang==='en'?'Online':'En línea'):(lang==='en'?'Offline':'Sin conexión')):(lang==='en'?'Local only':'Solo local')}
          </div>
          <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
            {firebaseListo
              ?(lang==='en'?'Toggle to pause sync without closing the app':'Apágalo para pausar el sync sin cerrar la app')
              :(lang==='en'?'Firebase not configured yet':'Firebase todavía no está configurado')}
          </div>
        </div>
        {firebaseListo&&(
          <button onClick={()=>setOnline(o=>!o)}
            style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',flexShrink:0,
              background:online?'var(--gn)':'var(--bd)',position:'relative'}}>
            <div style={{position:'absolute',top:2,left:online?22:2,width:20,height:20,borderRadius:10,background:'#fff',transition:'left .15s'}}/>
          </button>
        )}
      </div>

      {firebaseListo&&(
        <>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
            textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
            {lang==='en'?'Invite to team':'Invitar al equipo'}
          </div>
          <button onClick={async()=>{
              const codigo=await onCrearInvitacion();
              if(codigo) onToast({text:lang==='en'?'Invite code':'Código de invitación',sub:codigo});
              else onToast(lang==='en'?'Could not create invite':'No se pudo crear la invitación');
            }}
            style={{width:'100%',padding:'10px',borderRadius:10,border:'1px solid var(--bd)',background:'transparent',
              color:'var(--tx)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
            {lang==='en'?'Generate invite code':'Generar código de invitación'}
          </button>
        </>
      )}

      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
        textTransform:'uppercase',letterSpacing:'1px',margin:'18px 0 10px'}}>
        {lang==='en'?'Visual theme':'Tema visual'}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:10}}>
        {[
          {id:'dark',      label:'Oscuro',        sub:'Negro · Blanco',
            bg:'linear-gradient(135deg,#080809 0%,#1a0a1f 100%)', preview:['#080809','#ffffff','#30C0B7']},
          {id:'gray',      label:'Gris',          sub:'Carbón · Naranja',
            bg:'linear-gradient(135deg,#22232a 0%,#3a3830 60%,#e07820 100%)', preview:['#22232a','#e07820','#f2ede6']},
          {id:'cream',     label:'Claro',         sub:'Hueso · Contraste',
            bg:'linear-gradient(135deg,#EDE8DC 0%,#d8cfc0 100%)', preview:['#F5F0E8','#D4500A','#1a1208']},
          {id:'bubblegum', label:'Bubblegum Pop', sub:'Rosa · Teal',
            bg:'linear-gradient(135deg,#0d1f1f 0%,#062a2a 40%,#FF69B4 100%)', preview:['#0d1f1f','#FF69B4','#00F0FF']},
          {id:'cosmos',    label:'Cosmos',        sub:'Marino · Violeta',
            bg:'linear-gradient(135deg,#07081a 0%,#0d0a2e 50%,#a78bfa 100%)', preview:['#07081a','#a78bfa','#34d399']},
        ].map(th=>(
          <div key={th.id} onClick={()=>{setTheme(th.id);onToast({text:lang==='en'?'Theme applied':'Tema aplicado',sub:th.label});}}
            style={{borderRadius:12,cursor:'pointer',overflow:'hidden',
              border:theme===th.id?'2px solid var(--ac)':'1px solid var(--bd)'}}>
            <div style={{height:50,background:th.bg,position:'relative',display:'flex',alignItems:'flex-end',padding:'0 7px 7px'}}>
              <div style={{display:'flex',gap:3}}>
                {th.preview.map((c,i)=>(
                  <div key={i} style={{width:13,height:13,borderRadius:3,background:c,border:'1px solid rgba(255,255,255,.25)'}}/>
                ))}
              </div>
              {theme===th.id&&(
                <div style={{position:'absolute',top:5,right:5,width:16,height:16,borderRadius:'50%',
                  background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </div>
            <div style={{padding:'6px 8px',background:'var(--s1)'}}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>{th.label}</div>
              <div style={{fontSize:8,color:'var(--tx3)',marginTop:1}}>{th.sub}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );


  if(bsView==='notif')return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>
      <h2 style={{margin:'0 0 16px',fontSize:20,fontWeight:400,color:'var(--tx)',fontFamily:"'Special Gothic Expanded One',sans-serif"}}>
        {lang==='en'?'Notifications':'Notificaciones'}
      </h2>
      <textarea placeholder={lang==='en'?`Message for your ${vx.equipoPersona.singular.toLowerCase()}...`:`Mensaje para tu ${vx.equipoPersona.singular.toLowerCase()}...`}
        rows={4}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,resize:'none',boxSizing:'border-box',lineHeight:1.5,marginBottom:8,
          fontFamily:"'Lexend Giga',sans-serif"}}/>
      <button onClick={()=>{onToast(`✓ ${lang==='en'?'Notification sent':'Notificación enviada'}`);setBsView(null);}}
        style={{width:'100%',padding:'11px',borderRadius:12,border:'none',background:'var(--ac)',color:'var(--bg)',
          fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
        {lang==='en'?'Send':'Enviar'}
      </button>
    </div>
  );

  // ── Home Backstage ───────────────────────────────────────────────────
  return(
    <div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
        Backstage
      </div>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:20}}>
        {lang==='en'?'Management panel':'Panel de gestión'}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {MENU.map(item=>(
          <button key={item.id}
            onClick={()=>['equipos','notif','palabra','config','setlist'].includes(item.id)?setBsView(item.id):onToast(`${item.label} — ${lang==='en'?'coming soon':'próximamente'}`)}
            style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:14,padding:'20px 16px',cursor:'pointer',
              textAlign:'left',transition:'all .18s',display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:15,color:'var(--tx)',lineHeight:1.15}}>{item.label}</div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:200,fontSize:10,color:'var(--tx3)',lineHeight:1.4}}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
