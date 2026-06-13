// BackstageView: panel completo de backstage para Iglesia — gestión de eventos,
// setlists, equipos, permisos, notificaciones y configuración de tema.
// NOTA: candidato a refactor con reducer/contexto en una sesión futura para
// dividir en sub-vistas (evento/setlist/equipos/permisos/notif/config) sin
// prop-drilling extenso, dado que comparten ~15 estados locales.
import { useState, useEffect, useRef, useCallback } from 'react';
import { EQUIPOS_DATA } from '../data/constants';
import { initials } from '../utils/music';
import { ItinerarioEditor } from './ItinerarioEditor';

export function BackstageView({userRole,onToast,mode,onSetTheme,onGetTheme,pastorData={},setPastorData,eventos=[],setEventos}){
  const [bsView,setBsView]=useState(null);
  const isAdmin=userRole==='superadmin';
  const isPastor=userRole==='pastor'||isAdmin;
  const isLeader=userRole==='leader'||isAdmin||isPastor;
  const [activeEq,setActiveEq]=useState(null);
  const [nuevaBanda,setNuevaBanda]=useState('');
  const [evNombre,setEvNombre]=useState('');
  const [evTipo,setEvTipo]=useState('domingo');
  const [evFecha,setEvFecha]=useState('');
  const [evNotas,setEvNotas]=useState('');
  const [evSetlist,setEvSetlist]=useState([]);
  const [evSearch,setEvSearch]=useState('');
  const [notifDest,setNotifDest]=useState([]);
  const [notifTipo,setNotifTipo]=useState('recordatorio');
  const [notifMsg,setNotifMsg]=useState('');

  // ── Setlist Creator ──
  const [slNombre,setSlNombre]=useState('');
  const [slCanciones,setSlCanciones]=useState([]);
  const [slSearch,setSlSearch]=useState('');
  const [slEventoId,setSlEventoId]=useState('');
  const [slGuardados,setSlGuardados]=useState([]);
  // ── CREAR EVENTO ──
  if(bsView==='evento')return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Crear <span style={{color:'var(--ac)'}}>evento</span></div>
      <div style={{fontSize:12,color:'var(--tx2)',marginBottom:20}}>Configura nombre, fecha, setlist y equipo en un solo lugar</div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Nombre del evento</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
          {['Culto Dominical','Reunión Especial','Reunión de Oración','Noche de Adoración','Culto de Jóvenes','Conferencia','Aniversario'].map(op=>(
            <button key={op} onClick={()=>setEvNombre(op)}
              style={{padding:'6px 12px',borderRadius:100,border:evNombre===op?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',background:evNombre===op?'rgba(200,169,126,.12)':'var(--s2)',color:evNombre===op?'var(--ac)':'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif",transition:'all .15s'}}>
              {op}
            </button>
          ))}
        </div>
        <input className="inp" placeholder="O escribe un nombre personalizado..." value={evNombre} onChange={e=>setEvNombre(e.target.value)}/>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Fecha</div>
        <div style={{display:'flex',gap:8}}>
          <select className="inp" style={{flex:1,cursor:'pointer'}} value={evFecha.split('-')[2]||''} onChange={e=>{const d=e.target.value;setEvFecha(prev=>{const parts=prev.split('-');parts[2]=d.padStart(2,'0');return parts.join('-');});}}>
            <option value="">Día</option>
            {Array.from({length:31},(_,i)=>i+1).map(d=>(<option key={d} value={d}>{d}</option>))}
          </select>
          <select className="inp" style={{flex:1.4,cursor:'pointer'}} value={evFecha.split('-')[1]||''} onChange={e=>{const m=e.target.value;setEvFecha(prev=>{const parts=prev.split('-');parts[1]=m.padStart(2,'0');return parts.join('-');});}}>
            <option value="">Mes</option>
            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i)=>(<option key={i} value={i+1}>{m}</option>))}
          </select>
          <select className="inp" style={{flex:1,cursor:'pointer'}} value={evFecha.split('-')[0]||''} onChange={e=>{const y=e.target.value;setEvFecha(prev=>{const parts=prev.split('-');parts[0]=y;return parts.join('-');});}}>
            <option value="">Año</option>
            {['2025','2026','2027'].map(y=>(<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Setlist</div>
        <input className="inp" placeholder="Buscar canción..." value={evSearch} onChange={e=>setEvSearch(e.target.value)} style={{marginBottom:8}}/>
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
          {CANCIONES.filter(s=>s.n.toLowerCase().includes(evSearch.toLowerCase())&&!evSetlist.includes(s.n)).map(s=>(
            <div key={s.n} onClick={()=>setEvSetlist(l=>[...l,s.n])} style={{padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,.04)',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(200,169,126,.05)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{s.n}</span>
              <span style={{fontSize:10,color:'var(--ac)',fontWeight:700}}>{s.key} · {s.bpm}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Equipos convocados</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
          {EQUIPOS_DATA.map(eq=>(
            <label key={eq.id} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:100,border:'1px solid var(--bd)',background:'var(--s1)',cursor:'pointer',transition:'all .15s'}}>
              <input type="checkbox" defaultChecked onChange={()=>{}} style={{accentColor:eq.color,width:13,height:13}}/>
              <div style={{width:7,height:7,borderRadius:'50%',background:eq.color}}/>
              <span style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)'}}>{eq.miembros.length}p</span>
            </label>
          ))}
        </div>
        <div style={{borderTop:'1px solid var(--bd)',paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',marginBottom:7}}>¿Necesitas un equipo adicional?</div>
          <div style={{display:'flex',gap:8}}>
            <input className="inp" placeholder="Nombre del equipo personalizado..." id="eq-custom" style={{flex:1,fontSize:12}}/>
            <button onClick={()=>{const v=document.getElementById('eq-custom').value.trim();if(v){onToast({text:'Equipo agregado',sub:v});document.getElementById('eq-custom').value='';}}}
              style={{padding:'8px 14px',borderRadius:9,border:'1px solid rgba(200,169,126,.35)',background:'rgba(200,169,126,.08)',color:'var(--ac)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lato',sans-serif",flexShrink:0}}>
              + Agregar
            </button>
          </div>
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Itinerario</div>
        <ItinerarioEditor/>
      </div>
      <div className="card" style={{padding:14,marginBottom:18}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Notas del evento</div>
        <textarea className="inp" value={evNotas} onChange={e=>setEvNotas(e.target.value)}
          style={{minHeight:90,resize:'vertical',lineHeight:1.6,fontSize:12}}
          placeholder={"Ej: Llegar 30 min antes del ensayo. Revisar las canciones con tiempo.\nContactar a Cony para confirmar el equipo de proyecciones.\nFecha límite para cambios en el setlist: jueves en la noche."}/>
      </div>

      <div style={{display:'flex',gap:9}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>Cancelar</button>
        <button className="btn btn-p" style={{flex:2,justifyContent:'center'}}
          disabled={!evNombre.trim()&&!evFecha}
          onClick={()=>{
            const label=`${evNombre||'Nuevo evento'}`;
            const nuevoEv={id:Date.now(),nombre:label,fecha:`${evFecha.split('-')[2]||''} ${['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(evFecha.split('-')[1])||0]||''} ${evFecha.split('-')[0]||''}`.trim(),setlist:[...evSetlist]};
            setEventos(prev=>[...prev,nuevoEv]);
            onToast({text:'Evento creado',sub:`${label} · ${evSetlist.length} canciones`});
            setEvNombre('');setEvSetlist([]);setEvNotas('');setEvFecha('');
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
      <div style={{padding:'10px 8px',paddingBottom:90}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
        </div>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',lineHeight:1,marginBottom:5}}>
          Crear <span style={{color:'var(--ac)'}}>setlist</span>
        </div>
        <div style={{fontSize:12,color:'var(--tx2)',marginBottom:20}}>Arma la lista de canciones y asígnala a un evento cuando quieras</div>
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
              <button onClick={()=>setBsView('evento')} style={{fontSize:11,fontWeight:700,color:'var(--ac)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
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
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Canciones</div>
            {slCanciones.length>0&&(
              <span style={{fontSize:11,fontWeight:700,color:'var(--ac)'}}>{slCanciones.length} canciones</span>
            )}
          </div>
          {slCanciones.length>0&&(
            <div style={{marginBottom:12,borderRadius:10,border:'1px solid var(--bd)',overflow:'hidden'}}>
              {slCanciones.map((s,i)=>(
                <div key={s+i} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderBottom:i<slCanciones.length-1?'1px solid rgba(255,255,255,.05)':'none',background:i%2===0?'rgba(255,255,255,.02)':'transparent'}}>
                  <span style={{fontSize:13,fontWeight:900,color:'var(--tx3)',minWidth:22,textAlign:'right'}}>{i+1}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s}</div>
                    <div style={{fontSize:10,color:'var(--tx3)',marginTop:1}}>
                      {CANCIONES.find(c=>c.n===s)?.key} · {CANCIONES.find(c=>c.n===s)?.bpm} BPM
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:2,flexShrink:0}}>
                    <button disabled={i===0} onClick={()=>moverCancion(i,i-1)} style={{width:22,height:20,border:'1px solid var(--bd)',background:'var(--s1)',color:i===0?'var(--tx3)':'var(--tx2)',cursor:i===0?'not-allowed':'pointer',borderRadius:'4px 4px 0 0',display:'flex',alignItems:'center',justifyContent:'center',opacity:i===0?.3:1}}>
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button disabled={i===slCanciones.length-1} onClick={()=>moverCancion(i,i+1)} style={{width:22,height:20,border:'1px solid var(--bd)',borderTop:'none',background:'var(--s1)',color:i===slCanciones.length-1?'var(--tx3)':'var(--tx2)',cursor:i===slCanciones.length-1?'not-allowed':'pointer',borderRadius:'0 0 4px 4px',display:'flex',alignItems:'center',justifyContent:'center',opacity:i===slCanciones.length-1?.3:1}}>
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>
                  <button onClick={()=>setSlCanciones(prev=>prev.filter((_,j)=>j!==i))} style={{width:26,height:26,border:'1px solid rgba(255,82,82,.2)',background:'rgba(255,82,82,.06)',color:'var(--rd)',cursor:'pointer',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:15}}>×</button>
                </div>
              ))}
            </div>
          )}
          <input className="inp" placeholder="Buscar y agregar canción..." value={slSearch} onChange={e=>setSlSearch(e.target.value)} style={{marginBottom:slSearch?8:0}}/>
          {slSearch&&(
            <div style={{maxHeight:220,overflowY:'auto',borderRadius:9,border:'1px solid var(--bd)',background:'var(--s2)',marginTop:4}}>
              {CANCIONES.filter(s=>s.n.toLowerCase().includes(slSearch.toLowerCase())&&!slCanciones.includes(s.n)).slice(0,12).map(s=>(
                <div key={s.n} onClick={()=>{setSlCanciones(prev=>[...prev,s.n]);setSlSearch('');}}
                  style={{padding:'9px 12px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,.04)'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(200,169,126,.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div>
                    <div style={{fontWeight:700,fontSize:12,color:'var(--tx)'}}>{s.n}</div>
                    <div style={{fontSize:10,color:'var(--tx3)',marginTop:1}}>{s.key} · {s.bpm} BPM</div>
                  </div>
                  <div style={{width:22,height:22,borderRadius:6,background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ac)" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                </div>
              ))}
              {CANCIONES.filter(s=>s.n.toLowerCase().includes(slSearch.toLowerCase())&&!slCanciones.includes(s.n)).length===0&&(
                <div style={{padding:'12px',textAlign:'center',fontSize:12,color:'var(--tx3)'}}>No hay coincidencias</div>
              )}
            </div>
          )}
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
                  style={{padding:'4px 10px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif",flexShrink:0}}>
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
    // Listado de músicos (todos los integrantes únicos)
    const bandaEquipo=EQUIPOS_DATA.find(e=>e.name==='Banda'); const listado=(bandaEquipo?bandaEquipo.miembros:[]).filter((m,i,arr)=>arr.findIndex(x=>x.id===m.id)===i);

    return(
      <div style={{padding:'10px 8px',paddingBottom:90}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
        </div>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Gestión de <span style={{color:'var(--ac)'}}>equipos</span></div>
        <div style={{fontSize:12,color:'var(--tx2)',marginBottom:18}}>Crea equipos de trabajo y los roles dentro de cada uno. También puedes crear una nómina de músicos para cada evento o crear varias bandas desde un grupo grande de músicos.</div>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Listado de músicos · {listado.length} personas</div>
        <div className="card" style={{padding:14,marginBottom:14}}>
          <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:10}}>
            {listado.map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:100,background:'var(--s2)',border:'1px solid var(--bd)'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,rgba(139,114,212,.6),var(--ac))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                <span style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{m.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-g btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:'Agregar músico',sub:'Al listado'})}>
            <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Agregar músico
          </button>
        </div>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Formaciones · {EQUIPOS_DATA.length} equipos</div>
        {EQUIPOS_DATA.map(eq=>(
          <div key={eq.id} className="eq-card" style={{marginBottom:10}}>
            <div onClick={()=>setActiveEq(activeEq===eq.id?null:eq.id)} style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:9,cursor:'pointer'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
              <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:15,color:'var(--tx)',flex:1}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{eq.miembros.length}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2" style={{transform:activeEq===eq.id?'rotate(180deg)':'none',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {activeEq===eq.id&&(
              <div style={{borderTop:'1px solid var(--bd)'}}>
                <div style={{padding:'8px 14px',borderBottom:'1px solid var(--bd)',display:'flex',flexWrap:'wrap',gap:5,alignItems:'center'}}>
                  <span style={{fontSize:9,fontWeight:700,color:'var(--tx3)',marginRight:4}}>ROLES:</span>
                  {eq.roles.map(r=>(
                    <span key={r} style={{fontSize:10,fontWeight:700,color:eq.color,background:eq.color+'15',border:'1px solid '+eq.color+'30',padding:'2px 8px',borderRadius:100}}>{r}</span>
                  ))}
                  <button onClick={()=>onToast({text:'Nuevo rol',sub:eq.name})} style={{fontSize:10,color:'var(--tx3)',background:'var(--s2)',border:'1px dashed var(--bd)',padding:'2px 8px',borderRadius:100,cursor:'pointer',fontFamily:"'Lato',sans-serif",fontWeight:700}}>+ Rol</button>
                </div>
                {eq.miembros.map(m=>(
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,'+eq.color+'60,'+eq.color+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                    <span style={{flex:1,fontSize:12,fontWeight:700,color:'var(--tx)'}}>{m.name}</span>
                    <select defaultValue={m.role} style={{fontSize:10,color:eq.color,background:eq.color+'15',border:'1px solid '+eq.color+'30',padding:'3px 8px',borderRadius:100,cursor:'pointer',fontFamily:"'Lato',sans-serif",fontWeight:700,outline:'none'}}>
                      {eq.roles.map(r=>(<option key={r} value={r}>{r}</option>))}
                    </select>
                    <button onClick={()=>onToast({text:'Removido',sub:m.name})} style={{width:22,height:22,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
                <div style={{padding:'8px 14px'}}>
                  <select className="inp" style={{fontSize:11,cursor:'pointer'}} onChange={e=>{if(e.target.value)onToast({text:'Agregado a '+eq.name,sub:e.target.value});}} defaultValue="">
                    <option value="">Agregar persona...</option>
                    {listado.filter(m=>!eq.miembros.find(em=>em.id===m.id)).map(m=>(<option key={m.id} value={m.name}>{m.name}</option>))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="card" style={{padding:14}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>Nueva formación</div>
          <input className="inp" placeholder="Nombre de la nueva banda o equipo..." value={nuevaBanda} onChange={e=>setNuevaBanda(e.target.value)} style={{marginBottom:8}}/>
          <button className="btn btn-p btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={()=>{if(nuevaBanda.trim())onToast({text:'Formación creada',sub:nuevaBanda});setNuevaBanda('');}}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Crear formación
          </button>
        </div>
      </div>
    );
  }

    // ── DELEGAR PERMISOS ──
  if(bsView==='permisos')return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:24,color:'var(--tx)',marginBottom:6}}>Delegar Permisos</div>
      <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.6,marginBottom:18}}>Asigna líderes para que gestionen su área sin necesitar tu aprobación. </div>
      <div className="card" style={{padding:16,marginBottom:14}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:12}}>Líderes actuales</div>
        {[{av:'CS',name:'Cony Saavedra',eq:'Banda',perms:['editar setlist','convocar equipo']},{av:'MP',name:'Mauro Pizarro',eq:'Proyecciones',perms:['gestionar equipo']}].map(l=>(
          <div key={l.av} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--bd)'}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#4a3a8a,var(--ac))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#fff',flexShrink:0}}>{l.av}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>{l.name}</div>
              <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,marginTop:1}}>Líder {l.eq}</div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:4}}>
                {l.perms.map(p=>(<span key={p} style={{fontSize:9,color:'var(--tx3)',background:'var(--s2)',border:'1px solid var(--bd)',padding:'1px 6px',borderRadius:100,fontWeight:700}}>{p}</span>))}
              </div>
            </div>
            <button onClick={()=>onToast({text:'Editando permisos',sub:l.name})} style={{width:28,height:28,borderRadius:7,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:16,marginBottom:16}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:12}}>Agregar nuevo líder</div>
        <div style={{marginBottom:10}}>
          <div className="lbl" style={{marginBottom:5}}>Integrante</div>
          <select className="inp" style={{cursor:'pointer'}}>
            <option value="">Seleccionar...</option>
            {EQUIPOS_DATA.flatMap(e=>e.miembros).map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </div>
        <div style={{marginBottom:14}}>
          <div className="lbl" style={{marginBottom:8}}>Permisos</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {[{id:'setlist',label:'Editar setlist'},{id:'convocar',label:'Convocar equipo'},{id:'notif',label:'Enviar notificaciones'},{id:'itinerario',label:'Editar itinerario'}].map(p=>(
              <label key={p.id} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                <input type="checkbox" style={{width:16,height:16,accentColor:'var(--ac)',cursor:'pointer'}}/>
                <span style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{p.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn btn-p" style={{width:'100%'}} onClick={()=>onToast({text:'Líder asignado',sub:'Permisos guardados'})}>
          <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Guardar líder
        </button>
      </div>
    </div>
  );

  // ── NOTIFICACIONES ──
  if(bsView==='notif')return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:24,color:'var(--tx)',marginBottom:6}}>Notificaciones</div>
      <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.6,marginBottom:18}}>Envía mensajes directos a tu equipo. Sin WhatsApp, sin emails perdidos. </div>
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:12}}>¿A quién?</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
          {['Todo el equipo',...EQUIPOS_DATA.map(e=>e.name)].map(dest=>(
            <button key={dest} onClick={()=>setNotifDest(d=>d.includes(dest)?d.filter(x=>x!==dest):[...d,dest])} style={{padding:'6px 12px',borderRadius:100,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",border:notifDest.includes(dest)?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',background:notifDest.includes(dest)?'rgba(200,169,126,.1)':'var(--s1)',color:notifDest.includes(dest)?'var(--ac)':'var(--tx2)'}}>{dest}</button>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:12}}>Tipo de aviso</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[{id:'recordatorio',label:'Recordatorio',icon:'🔔'},{id:'cambio',label:'Cambio setlist',icon:''},{id:'urgente',label:'Urgente',icon:'⚡'},{id:'general',label:'General',icon:'💬'}].map(t=>(
            <button key={t.id} onClick={()=>setNotifTipo(t.id)} style={{padding:'10px',borderRadius:10,cursor:'pointer',textAlign:'left',border:notifTipo===t.id?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',background:notifTipo===t.id?'rgba(200,169,126,.08)':'var(--s1)',fontFamily:"'Lato',sans-serif"}}>
              <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:notifTipo===t.id?'var(--ac)':'var(--tx)'}}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:16,marginBottom:16}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:10}}>Mensaje</div>
        <textarea className="inp" placeholder="Ej: Hola equipo, este domingo llegamos a las 9:00am. ¡Los esperamos!" value={notifMsg} onChange={e=>setNotifMsg(e.target.value)} style={{minHeight:90,resize:'vertical',lineHeight:1.6,fontSize:12}}/>
      </div>
      <div style={{display:'flex',gap:9}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>Cancelar</button>
        <button className="btn btn-p" style={{flex:2}} disabled={!notifMsg.trim()||!notifDest.length} onClick={()=>{onToast({text:'Notificación enviada',sub:notifDest.join(', ')});setBsView(null);}}>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar
        </button>
      </div>
    </div>
  );

  // ── CONFIGURACIÓN ──
  if(bsView==='config')return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Ajustes</div>
      <div style={{fontSize:12,color:'var(--tx2)',marginBottom:20}}>Personaliza la app a tu estilo</div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:12}}>Mi organización</div>
        <input className="inp" placeholder="Nombre de la iglesia o banda" style={{marginBottom:8}} defaultValue="Iglesia"/>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <input className="inp" placeholder="Ciudad" style={{flex:1}}/>
          <select className="inp" style={{flex:1,cursor:'pointer'}}>
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
            <button style={{marginTop:6,padding:'4px 10px',borderRadius:7,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>Seleccionar archivo</button>
          </div>
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:12}}>Tema visual</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
          {[
            {id:'dark',      label:'Oscuro',          sub:'Alto contraste · Dorado',
              bg:'linear-gradient(135deg,#2a1a4a 0%,#07070f 100%)',
              preview:['#07070f','#c8a97e','#ede9ff']},
            {id:'gray',      label:'Gris',             sub:'Carbón · Naranja quemado',
              bg:'linear-gradient(135deg,#22232a 0%,#3a3830 60%,#e07820 100%)',
              preview:['#22232a','#e07820','#f2ede6']},
            {id:'cream',     label:'Claro',             sub:'Blanco hueso · Contraste fuerte',
              bg:'linear-gradient(135deg,#EDE8DC 0%,#d8cfc0 100%)',
              preview:['#F5F0E8','#8B4513','#0e0a06']},
            {id:'bubblegum', label:'Bubblegum Pop',     sub:'Rosa neón · Teal profundo',
              bg:'linear-gradient(135deg,#0d1f1f 0%,#062a2a 40%,#FF69B4 100%)',
              preview:['#0d1f1f','#FF69B4','#00F0FF']},
            {id:'oliva',     label:'Oliva · Mocha',     sub:'Verde oliva · Naranja fuerte',
              bg:'linear-gradient(135deg,#111a0a 0%,#1e2e0e 40%,#E8670A 85%,#8fba30 100%)',
              preview:['#161a10','#E8670A','#8fba30']},
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
                <div style={{fontSize:11,fontWeight:900,color:'var(--tx)',fontFamily:"'Lato',sans-serif"}}>{th.label}</div>
                <div style={{fontSize:9,color:'var(--tx3)',marginTop:2}}>{th.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>Daniel Miranda</div>
            <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>dmiranda@fearless.cl · Super Admin</div>
          </div>
          <button onClick={()=>onToast({text:'Cerrando sesión...',sub:'Hasta pronto'})} style={{padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,82,82,.3)',background:'rgba(255,82,82,.06)',color:'var(--rd)',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:"'Lato',sans-serif",display:'flex',alignItems:'center',gap:5}}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Cerrar sesión
          </button>
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
    return null;
  };

      const ITEMS=[
    {id:'evento',label:'Crear evento',sub:'Nuevo domingo o fecha especial',icon:'calendar',adminOnly:false},
    {id:'setlist',label:'Crear setlist',sub:slGuardados.length>0?`${slGuardados.length} setlist${slGuardados.length>1?'s':''} guardado${slGuardados.length>1?'s':''}`:eventos.length>0?`${eventos.length} evento${eventos.length>1?'s':''} disponible${eventos.length>1?'s':''}`:' Arma y asigna a un evento',icon:'music',adminOnly:false},
    {id:'equipos',label:'Gestión de equipos',sub:'Crear equipos y roles',icon:'team',adminOnly:true},
    {id:'permisos',label:'Delegar permisos',sub:'Asignar líderes',icon:'shield',adminOnly:true},
    {id:'notif',label:'Notificaciones',sub:'Avisar al equipo',icon:'bell',adminOnly:false},
    {id:'config',label:'Configuración',sub:'Ajustes y preferencias',icon:'settings',adminOnly:false},
    {id:'pastor',label:'Palabra del Pastor',sub:'Versículo y PPT del domingo',icon:'book',pastorOnly:true},
  ].filter(it=>{
    if(it.adminOnly&&!isAdmin)return false;
    if(it.pastorOnly&&!isPastor)return false;
    return true;
  });

  return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:32,color:'var(--tx)',lineHeight:1}}>Backstage</div>
          <span style={{padding:'2px 9px',borderRadius:100,fontSize:9,fontWeight:700,border:'1px solid rgba(200,169,126,.28)',background:'rgba(200,169,126,.07)',color:'var(--ac)',fontFamily:"'Lato',sans-serif",flexShrink:0,alignSelf:'center'}}>{isAdmin?'Super Admin':'Líder'}</span>
        </div>
        <div style={{fontSize:12,color:'var(--ac)',fontWeight:600,lineHeight:1.5}}>
          {isAdmin?'Crea eventos, arma setlists, gestiona tu equipo y envía comunicaciones.':'Convoca a tu equipo, envía notificaciones y coordina lo que necesites.'}
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {ITEMS.map(it=>(
          <div key={it.id} onClick={()=>setBsView(it.id)} style={{display:'flex',alignItems:'center',gap:13,padding:'14px 16px',borderRadius:14,background:'var(--s1)',border:'1px solid var(--bd)',cursor:'pointer'}}>
            <div style={{width:42,height:42,borderRadius:11,background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ItemIcon icon={it.icon}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15,color:'var(--tx)'}}>{it.label}</div>
              <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{it.sub}</div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        ))}
      </div>
    </div>
  );
}
