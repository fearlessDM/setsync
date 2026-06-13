// AdminView: panel de administración con calendario de eventos, generación de
// mensajes/notificaciones, mi setlist y estrenos.
import { useState, useEffect, useRef } from 'react';
import { SETLISTS, EVENTOS_ESPECIALES, CANCIONES, EQUIPOS_DATA } from '../data/constants';
import { initials } from '../utils/music';

export function MiniCalEvento({mes}){
  const now=new Date();
  const year=now.getFullYear();
  const month=mes!==undefined?mes:now.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const rawFirst=new Date(year,month,1).getDay(); const firstDay=rawFirst===0?6:rawFirst-1;
  const isCurrentMonth=month===now.getMonth();
  const setlistDays=isCurrentMonth?new Set(Object.entries(SETLISTS).filter(([,v])=>v!==null).map(([d])=>parseInt(d))):new Set();
  const especiales=new Set(EVENTOS_ESPECIALES.filter(e=>e.mes===month+1).map(e=>e.dia));
  const eventDays=new Set([...setlistDays,...especiales]);
  const today=isCurrentMonth?now.getDate():0;

  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  while(cells.length%7!==0)cells.push(null);
  const rows=[];
  for(let i=0;i<cells.length;i+=7)rows.push(cells.slice(i,i+7));

  return(
    <div style={{flexShrink:0,display:'flex',flexDirection:'column',gap:1,minWidth:140}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1,marginBottom:2}}>
        {['L','M','M','J','V','S','D'].map((d,i)=>(
          <div key={i} style={{textAlign:'center',fontSize:6,fontWeight:900,color:'rgba(255,255,255,.22)',fontFamily:"'Lato',sans-serif"}}>{d}</div>
        ))}
      </div>
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:0}}>
          {row.map((d,ci)=>{
            if(!d)return(<div key={ci} style={{height:11}}/>);
            const hasEv=eventDays.has(d);
            const isToday=d===today;
            return(
              <div key={ci} style={{height:11,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{
                  fontSize:7,fontWeight:hasEv?900:400,
                  fontFamily:"'Lato',sans-serif",
                  color:hasEv?'var(--ac)':isToday?'rgba(255,255,255,.8)':'var(--tx3)',
                  textDecoration:isToday&&!hasEv?'underline':'none',
                  lineHeight:1
                }}>{d}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AdminView({mode,activeSunday,userRole,onRehearsal,onToast,onSelectDay,mesNav=new Date().getMonth()}){
  const [selDay,setSelDay]=useState(activeSunday);
  const [showPicker,setShowPicker]=useState(false);
  const [pFilter,setPFilter]=useState('');
  const [sel,setSel]=useState(new Set());
  const [published,setPublished]=useState(selDay===14||selDay===7);
  const isAdmin=userRole==='superadmin';
  const isLeader=userRole==='leader'||isAdmin;
  const MESES_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNombre=MESES_ES[new Date().getMonth()];

  // Días con evento este mes
  const diasEvento=Object.entries(SETLISTS)
    .filter(entry=>entry[1]!==null)
    .map(entry=>({day:parseInt(entry[0]),sl:entry[1]}));

  const selSl=SETLISTS[selDay]||[];
  const today=new Date().getDate();
  const todayMonth=new Date().getMonth()+1;
  // Determinar el próximo evento (primer domingo/evento del mes actual desde hoy en adelante)
  const allDays=Object.keys(SETLISTS).map(Number).sort((a,b)=>a-b);
  const nextDay=allDays.find(d=>d>=today&&SETLISTS[d]!==null);

  return(
    <div style={{padding:'0 0 90px'}}>
      <div style={{padding:'12px 8px 10px',display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:32,color:'var(--tx)',lineHeight:1}}>
            Eventos <span style={{color:'var(--ac)'}}>{['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][mesNav]}</span>
          </div>
          <div style={{fontSize:12,color:'var(--ac)',fontWeight:600,marginTop:5}}>
            {mesNav===new Date().getMonth()?`${diasEvento.filter(e=>e.sl).length} domingos · Toca uno para ver el detalle`:'Eventos del mes seleccionado'}
          </div>
        </div>
        <MiniCalEvento mes={mesNav}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10,padding:'0 8px 14px'}}>
        {mesNav===new Date().getMonth()&&Object.entries(SETLISTS).map(([dayStr,sl])=>{
          const day=parseInt(dayStr);
          const isNull=sl===null;
          const isActive=day===selDay;
          const pub=day<=14;
          if(isNull)return(
            <div key={day} style={{padding:'14px 16px',borderRadius:16,background:'rgba(255,82,82,.04)',border:'1px solid rgba(255,82,82,.15)',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:42,height:42,borderRadius:11,background:'rgba(255,82,82,.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:18,fontWeight:900,color:'rgba(255,82,82,.5)'}}>–</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:'var(--tx2)'}}>Dom {day}</div>
                <div style={{fontSize:11,color:'rgba(255,82,82,.7)',marginTop:2,fontWeight:700}}>Sin reunión</div>
              </div>
            </div>
          );
          const isNext=day===nextDay&&todayMonth===new Date().getMonth()+1;
          return(
            <div key={day}>
              {isNext&&day>today&&(
                <div style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0'}}>
                  <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(200,169,126,.4))'}}/>
                  <span style={{fontSize:9,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1.5px',flexShrink:0}}>Próximo evento</span>
                  <div style={{flex:1,height:1,background:'linear-gradient(270deg,transparent,rgba(200,169,126,.4))'}}/>
                </div>
              )}
            <div onClick={()=>{setSelDay(day);if(onSelectDay)onSelectDay(day);}} style={{padding:isNext?'20px 16px':isActive?'18px 16px':'12px 14px',borderRadius:16,background:isNext?'rgba(200,169,126,.1)':isActive?'rgba(200,169,126,.07)':'var(--s1)',border:isNext?'1px solid rgba(200,169,126,.5)':isActive?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',cursor:'pointer',transition:'all .2s',opacity:(day<today&&!isActive)?0.55:1}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:900,fontSize:isNext?28:isActive?22:17,color:'var(--tx)',fontFamily:"'Lato',sans-serif",transition:'font-size .2s'}}>Domingo {day}</div>
                  <div style={{fontSize:13,color:'var(--tx3)',marginTop:4,fontWeight:700}}>{sl.length} {sl.length===1?'canción':'canciones'}</div>
                </div>
                <span style={{padding:'4px 10px',borderRadius:100,fontSize:9,fontWeight:700,border:pub?'1px solid rgba(94,206,160,.35)':'1px solid rgba(255,200,100,.25)',background:pub?'rgba(94,206,160,.08)':'rgba(255,200,100,.06)',color:pub?'var(--gn)':'rgba(255,200,100,.8)',flexShrink:0}}>{pub?'✓ Publicado':'Borrador'}</span>
                {isLeader&&(
                  <button onClick={e=>{e.stopPropagation();onRehearsal();}} style={{padding:'7px 12px',borderRadius:10,border:'1px solid rgba(200,169,126,.3)',background:'rgba(94,206,160,.1)',cursor:'pointer',display:'flex',alignItems:'center',gap:5,flexShrink:0,fontFamily:"'Lato',sans-serif",fontWeight:700,fontSize:11,color:'var(--gn)',border:'1px solid rgba(94,206,160,.35)'}}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--gn)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    Modo Ensayo
                  </button>
                )}
              </div>
              <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:2}}>
                {EQUIPOS_DATA.map(eq=>(
                  <div key={eq.id} style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:100,background:eq.color+'12',border:'1px solid '+eq.color+'30'}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
                    <span style={{fontSize:10,fontWeight:700,color:'var(--tx)',fontFamily:"'Lato',sans-serif"}}>{eq.name}</span>
                    <span style={{fontSize:9,fontWeight:900,color:eq.color,marginLeft:2,display:'flex',alignItems:'center',gap:1}}>
                      {eq.miembros.length}
                      <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke={eq.color} strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </span>
                  </div>
                ))}
              </div>

            </div>
            </div>
          );
        })}

      </div>
      {mesNav!==new Date().getMonth()&&(
        <div style={{display:'flex',flexDirection:'column',gap:10,padding:'0 8px 14px'}}>
          {EVENTOS_ESPECIALES.filter(ev=>ev.mes===mesNav+1).length===0?(
            <div style={{padding:'32px 20px',borderRadius:16,background:'var(--s1)',border:'1px solid var(--bd)',textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:10}}>📭</div>
              <div style={{fontWeight:700,fontSize:15,color:'var(--tx)',marginBottom:6}}>Sin eventos ingresados</div>
              <div style={{fontSize:12,color:'var(--ac)',fontWeight:600}}>Crea un evento en Backstage para este mes</div>
            </div>
          ):(
            EVENTOS_ESPECIALES.filter(ev=>ev.mes===mesNav+1).map((ev,i)=>(
              <div key={i} style={{padding:'18px 16px',borderRadius:16,background:'var(--s1)',border:'1px solid rgba(200,169,126,.3)',cursor:'pointer'}} onClick={()=>onSelectDay&&onSelectDay(ev.dia)}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:900,fontSize:18,color:'var(--tx)',fontFamily:"'Lato',sans-serif"}}>{ev.label}</div>
                    <div style={{fontSize:12,color:'var(--ac)',marginTop:3,fontWeight:600,textTransform:'capitalize'}}>{ev.tipo} · {ev.setlist.length} canciones</div>
                  </div>
                  <span style={{padding:'4px 10px',borderRadius:100,fontSize:9,fontWeight:700,border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.08)',color:'var(--ac)',display:'none'}}>Especial</span>
                  {isLeader&&<button onClick={e=>{e.stopPropagation();onRehearsal();}} style={{padding:'6px 10px',borderRadius:9,border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.08)',cursor:'pointer',fontSize:10,fontWeight:700,color:'var(--ac)',fontFamily:"'Lato',sans-serif",display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    Modo Ensayo
                  </button>}
                </div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
                  {ev.setlist.map((s,j)=>(<span key={j} style={{fontSize:9,fontWeight:700,color:'var(--tx3)',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.07)',padding:'2px 7px',borderRadius:100}}>{s.name.split(' ').slice(0,3).join(' ')}</span>))}
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {EQUIPOS_DATA.map(eq=>(
                    <div key={eq.id} style={{display:'flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:100,background:eq.color+'12',border:'1px solid '+eq.color+'25'}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:eq.color}}/>
                      <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.6)'}}>{eq.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {mesNav===new Date().getMonth()&&EVENTOS_ESPECIALES.filter(ev=>ev.mes===mesNav+1).length>0&&(
        <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0'}}>
            <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
            <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Eventos especiales</span>
            <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
          </div>
          {EVENTOS_ESPECIALES.filter(ev=>ev.mes===mesNav+1).map((ev,i)=>(
            <div key={i} style={{padding:'14px 16px',borderRadius:16,background:'var(--s1)',border:'1px solid rgba(200,169,126,.25)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:900,fontSize:16,color:'var(--tx)',fontFamily:"'Lato',sans-serif"}}>{ev.label}</div>
                  <div style={{fontSize:11,color:'var(--ac)',marginTop:2,fontWeight:700,textTransform:'capitalize'}}>{ev.tipo} · {ev.setlist.length} canciones</div>
                </div>
                <span style={{padding:'3px 9px',borderRadius:100,fontSize:9,fontWeight:700,border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.08)',color:'var(--ac)',flexShrink:0,display:'none'}}>Especial</span>
              </div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {ev.setlist.map((s,j)=>(<span key={j} style={{fontSize:9,fontWeight:700,color:'var(--tx3)',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',padding:'2px 7px',borderRadius:100}}>{s.name.split(' ').slice(0,3).join(' ')}</span>))}
              </div>
            </div>
          ))}
        </div>
      )}
      {showPicker&&(
        <div className="mov" onClick={e=>e.target===e.currentTarget&&setShowPicker(false)}>
          <div className="modal">
            <div className="m-hdr">
              <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:19,color:'var(--tx)'}}>Agregar canción</span>
              <button className="ib" onClick={()=>setShowPicker(false)}><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <input className="inp" style={{margin:'9px 13px',width:'calc(100% - 26px)'}} placeholder="Buscar..." value={pFilter} onChange={e=>setPFilter(e.target.value)}/>
            <div className="m-body">
              {CANCIONES.filter(s=>s.n.toLowerCase().includes(pFilter.toLowerCase())).map((s,i)=>(
                <div key={s.n} className={`so${sel.has(s.n)?' on':''}`} onClick={()=>setSel(prev=>{const ns=new Set(prev);ns.has(s.n)?ns.delete(s.n):ns.add(s.n);return ns;})}>
                  <span style={{fontFamily:"'Lato',sans-serif",fontSize:13,color:'var(--tx3)',width:17,flexShrink:0}}>{i+1}</span>
                  <span className="so-n">{s.n}</span>
                  <span className="so-bpm">{s.bpm}</span>
                  <div className="so-chk">✓</div>
                </div>
              ))}
            </div>
            <div className="m-ftr">
              <button className="btn btn-g btn-sm" onClick={()=>setShowPicker(false)}>Cancelar</button>
              <button className="btn btn-p btn-sm" onClick={()=>{setShowPicker(false);onToast({text:'Actualizado',sub:`${sel.size} canciones`});}}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NOTIFICACIÓN PRÓX FECHA ──────────────────────────
// Mensajes generados dinámicamente con info del evento
export const generarMensaje=(activeSunday,sl,mesNombre,tipo)=>{
  const canciones=sl.map((s,i)=>`${i+1}. ${s.name} (${s.key} - ${s.bpm} BPM)`).join('\n');
  const dias=tipo==='mie'?'este miércoles':'este sábado';
  const animos=[
    'No tocamos para impresionar, tocamos para ministrar. ¡Preparemos nuestros corazones!',
    'Somos instrumentos en manos del Señor. Que cada nota sea una ofrenda genuina.',
    '¡La presencia de Dios nos espera! Vengan listos y con el corazón disponible.',
    '¡Gracias por su fidelidad! Juntos vamos a levantar una adoración que glorifique a Dios.',
  ];
  const animo=animos[Math.floor(Math.random()*animos.length)];
  return `Hola equipo hermoso! 🎸

Les recuerdo que este domingo ${activeSunday} de ${mesNombre} tenemos servicio.

📋 SETLIST:
${canciones}

⏰ Llegada: 8:30 AM | Ensayo: 9:00 AM | Servicio: 10:00 AM

Por favor repasa las canciones con tiempo antes del ${dias}. 🙏

${animo}

¡Los esperamos! Con amor, el equipo de liderazgo.`;
};
export function MiSetlistNotif({onToast,activeSunday,sl,mesNombre}){
  const [msg,setMsg]=useState('');
  const [tipo,setTipo]=useState('mie');
  useEffect(()=>{setMsg(generarMensaje(activeSunday,sl,mesNombre,tipo));},[tipo,activeSunday]);
  const [custom,setCustom]=useState(false);
  const [open,setOpen]=useState(false);
  if(!open)return(
    <div style={{marginBottom:14}}>
      <div style={{borderTop:'1px solid var(--bd)',paddingTop:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Recordatorio al equipo</div>
        <button onClick={()=>setOpen(true)} style={{width:'100%',padding:'14px 16px',borderRadius:14,border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.07)',cursor:'pointer',display:'flex',alignItems:'center',gap:12,fontFamily:"'Lato',sans-serif",transition:'all .15s'}}>
          <div style={{width:38,height:38,borderRadius:10,background:'rgba(200,169,126,.12)',border:'1px solid rgba(200,169,126,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{flex:1,textAlign:'left'}}>
            <div style={{fontWeight:900,fontSize:14,color:'var(--ac)'}}>Enviar recordatorio</div>
            <div style={{fontSize:11,color:'var(--tx2)',marginTop:2}}>Mié y Sáb · Info del evento + ánimo al equipo</div>
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--ac)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
  return(
    <div style={{marginBottom:14,padding:'14px',borderRadius:14,border:'1px solid rgba(200,169,126,.28)',background:'rgba(200,169,126,.05)'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span style={{fontWeight:900,fontSize:13,color:'var(--tx)'}}>Mensaje al equipo</span>
        <button onClick={()=>setOpen(false)} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[['mie','Miércoles'],['sab','Sábado']].map(([t,l])=>(
          <button key={t} onClick={()=>setTipo(t)} style={{flex:1,padding:'8px',borderRadius:9,border:tipo===t?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',background:tipo===t?'rgba(200,169,126,.08)':'var(--s1)',color:tipo===t?'var(--ac)':'var(--tx3)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
            {l}
          </button>
        ))}
      </div>
      {!custom&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>Vista previa del mensaje</div>
          <div style={{padding:'10px 12px',borderRadius:9,background:'var(--s1)',border:'1px solid var(--bd)',fontSize:11,color:'var(--tx)',lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:160,overflowY:'auto'}}>{msg}</div>
          <button onClick={()=>setCustom(true)} style={{marginTop:8,fontSize:11,color:'var(--ac)',fontWeight:700,background:'none',border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>Editar mensaje</button>
        </div>
      )}
      {custom&&(
        <div style={{marginBottom:10}}>
          <textarea className="inp" value={msg} onChange={e=>setMsg(e.target.value)} style={{minHeight:80,fontSize:12,lineHeight:1.6,resize:'vertical',marginBottom:6}}/>
          <button onClick={()=>{setCustom(false);setMsg(generarMensaje(activeSunday,sl,mesNombre,tipo));}} style={{fontSize:11,color:'var(--tx3)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>← Regenerar automático</button>
        </div>
      )}
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setOpen(false)} className="btn btn-g btn-sm" style={{flex:1,justifyContent:'center'}}>Cancelar</button>
        <button onClick={()=>{onToast({text:'Mensaje enviado',sub:'Todo el equipo notificado'});setOpen(false);}} className="btn btn-p btn-sm" style={{flex:2,justifyContent:'center'}}>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar al equipo
        </button>
      </div>
    </div>
  );
}

export function MiSetlist({activeSunday,onOpenSong,onLive,userRole,onToast}){
  const sl=SETLISTS[activeSunday]||[];
  const MESES_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNombre=MESES_ES[new Date().getMonth()];
  const ITINERARIO=[
    {hora:'08:30',label:'Llegada y preparación técnica'},
    {hora:'09:00',label:'Prueba de sonido'},
    {hora:'09:30',label:'Ensayo con el equipo'},
    {hora:'10:00',label:'Inicio del servicio'},
    {hora:'10:05',label:'Bloque de adoración (4 canciones)'},
    {hora:'10:30',label:'Mensaje'},
    {hora:'11:00',label:'Cierre y oración'},
  ];

  return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Dom <span style={{color:'var(--ac)'}}>{activeSunday} {mesNombre}</span></div>
            <div style={{fontSize:12,color:'var(--tx2)'}}>Tu setlist para este domingo. Repasa las canciones con tiempo.</div>
          </div>
          <button onClick={onLive} style={{flexShrink:0,padding:'9px 14px',borderRadius:12,border:'1px solid rgba(255,82,82,.35)',background:'rgba(255,82,82,.1)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'var(--rd)',animation:'rp 1.2s infinite'}}/>
              <span style={{fontSize:11,fontWeight:900,color:'var(--rd)',textTransform:'uppercase',letterSpacing:'.5px'}}>En Vivo</span>
            </div>
            <span style={{fontSize:8,color:'var(--tx3)',fontWeight:700}}>Interpretar</span>
          </button>
        </div>
        <div style={{display:'flex',gap:8,marginTop:10}}>
          <span style={{padding:'5px 12px',borderRadius:100,border:'1px solid rgba(94,206,160,.4)',background:'rgba(94,206,160,.1)',color:'var(--gn)',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:5}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Publicado
          </span>
          
        </div>
      </div>
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:16,marginBottom:14,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Canciones</span>
          <span style={{padding:'2px 8px',borderRadius:100,border:'1px solid rgba(94,206,160,.4)',background:'rgba(94,206,160,.08)',color:'var(--gn)',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:'var(--gn)'}}/>Publicado
          </span>
        </div>
        {sl.length===0
          ?<div style={{textAlign:'center',padding:'24px',color:'var(--tx3)',fontSize:13}}>Sin setlist para este domingo</div>
          :sl.map((s,i)=>(
            <div key={i} onClick={()=>onOpenSong(i)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:i<sl.length-1?'1px solid rgba(255,255,255,.05)':'none',cursor:'pointer'}}>
              <span style={{fontSize:13,fontWeight:900,color:'var(--tx3)',minWidth:16,textAlign:'right'}}>{i+1}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:'var(--tx)'}}>{s.name}</div>
                <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>Guitarra · {s.key} · {s.bpm} BPM</div>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))
        }
      </div>
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:16,marginBottom:14,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Equipos convocados</span>
          <span style={{fontSize:10,fontWeight:700,color:'var(--tx3)'}}>{EQUIPOS_DATA.reduce((a,e)=>a+e.miembros.length,0)} personas</span>
        </div>
        {EQUIPOS_DATA.map(eq=>(
          <div key={eq.id} style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
            <div style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
              <span style={{fontWeight:900,fontSize:12,color:'var(--tx)',flex:1}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{eq.miembros.length}</span>
            </div>
            <div style={{padding:'0 14px 8px',display:'flex',flexWrap:'wrap',gap:5}}>
              {eq.miembros.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:100,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)'}}>
                  <div style={{width:16,height:16,borderRadius:'50%',background:'linear-gradient(135deg,'+eq.color+'60,'+eq.color+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                  <span style={{fontSize:10,fontWeight:700,color:'var(--tx)'}}>{m.name.split(' ')[0]}</span>
                  <span style={{fontSize:9,color:eq.color,fontWeight:700}}>{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {userRole==='superadmin'&&(
        <MiSetlistNotif onToast={onToast} activeSunday={activeSunday} sl={sl} mesNombre={mesNombre}/>
      )}
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Itinerario del domingo</span>
        </div>
        {ITINERARIO.map((it,i)=>(
          <div key={i} style={{display:'flex',gap:12,padding:'10px 14px',borderBottom:i<ITINERARIO.length-1?'1px solid rgba(255,255,255,.04)':'none',alignItems:'flex-start'}}>
            <span style={{fontSize:11,fontWeight:900,color:'var(--ac)',minWidth:40,fontFamily:"'Source Code Pro',monospace"}}>{it.hora}</span>
            <span style={{fontSize:12,color:'var(--tx)',fontWeight:600,lineHeight:1.4}}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PREMIERE ─────────────────────────────────────────
const PREMIERES=[
  {id:1,name:'Toda La Tierra',album:'Toma Tu Lugar',sello:'Avanti Music',key:'G',bpm:128,dias:13,oficial:true,
   desc:'Un himno de adoración profética que invita a toda la creación a rendirse ante el Señor.'},
  {id:2,name:'Majestad',album:'Maverick City en Español',sello:'Maverick City Music',key:'D',bpm:72,dias:20,oficial:true,
   desc:'Nueva versión en español del clásico moderno sobre la majestad de Dios.'},
  {id:3,name:'Gloria Eterna',album:'',sello:'Red Music Latinoamérica',key:'A',bpm:118,dias:null,oficial:false,
   desc:'Próximamente. Red Music prepara este lanzamiento para sus iglesias asociadas.'},
];

export function PremiereView({onToast}){
  const [sel,setSel]=useState(null);
  const top=PREMIERES[0];

  if(sel){
    const p=PREMIERES.find(x=>x.id===sel);
    return(
      <div style={{padding:'0 0 90px'}}>
        <div style={{padding:'16px',display:'flex',alignItems:'center',gap:10,marginBottom:4,cursor:'pointer'}} onClick={()=>setSel(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Premiere</span>
        </div>
        <div style={{margin:'0 16px',padding:'18px',borderRadius:16,background:'linear-gradient(135deg,rgba(200,169,126,.15),rgba(100,80,180,.1))',border:'1px solid rgba(200,169,126,.3)',marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:8}}>
            {p.oficial?'✓ Cifrado oficial':'Próximamente'}
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',marginBottom:4}}>{p.name}</div>
          <div style={{fontSize:13,color:'var(--tx2)',marginBottom:12}}>{p.album&&`${p.album} · `}{p.sello}</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
            <span style={{fontSize:11,fontWeight:700,color:'var(--ac)',background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.25)',padding:'4px 10px',borderRadius:100}}>{p.key}</span>
            <span style={{fontSize:11,fontWeight:700,color:'var(--tx2)',background:'var(--s1)',border:'1px solid var(--bd)',padding:'4px 10px',borderRadius:100}}>{p.bpm} BPM</span>
            {p.dias&&<span style={{fontSize:11,fontWeight:700,color:'var(--rd)',background:'rgba(255,82,82,.1)',border:'1px solid rgba(255,82,82,.28)',padding:'4px 10px',borderRadius:100}}>⚡ En {p.dias} días</span>}
          </div>
          <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.7}}>{p.desc}</div>
        </div>
        <div style={{padding:'0 8px',display:'flex',flexDirection:'column',gap:10}}>
          <button className="btn btn-p" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:'Agregado al setlist',sub:p.name})}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar al setlist
          </button>
          <button className="btn btn-g" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:'Te notificaremos',sub:`Al estreno de ${p.name}`})}>
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Notificarme
          </button>
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:'0 0 90px'}}>
      <div style={{margin:'16px 16px 14px',borderRadius:18,overflow:'hidden',border:'1px solid rgba(200,169,126,.25)',position:'relative',cursor:'pointer'}} onClick={()=>setSel(top.id)}>
        <div style={{background:'linear-gradient(135deg,rgba(10,8,20,.95),rgba(30,20,60,.92))',padding:'22px 20px 20px'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
            <span style={{fontSize:14}}>★</span>
            <span style={{fontSize:9,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'2px'}}>Próximo estreno</span>
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:26,color:'var(--tx)',lineHeight:1.1,marginBottom:4}}>{top.name}</div>
          <div style={{fontSize:12,color:'var(--tx2)',marginBottom:14}}>{top.album} · {top.sello}</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:12,fontWeight:700,color:'var(--rd)',background:'rgba(255,82,82,.12)',border:'1px solid rgba(255,82,82,.3)',padding:'5px 12px',borderRadius:100}}>⚡ En {top.dias} días</span>
            <span style={{fontSize:11,color:'var(--tx3)',fontWeight:700,cursor:'pointer'}}>🏛 247 iglesias →</span>
          </div>
        </div>
      </div>
      <div style={{padding:'0 8px',display:'flex',flexDirection:'column',gap:8}}>
        {PREMIERES.map(p=>(
          <div key={p.id} onClick={()=>setSel(p.id)} style={{padding:'14px 16px',borderRadius:14,background:'var(--s1)',border:'1px solid var(--bd)',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15,color:'var(--tx)',marginBottom:2}}>{p.name}</div>
              <div style={{fontSize:11,color:'var(--tx3)'}}>{p.album||p.sello}</div>
              <div style={{fontSize:10,color:'var(--tx3)',marginTop:3}}>{p.key} · {p.bpm} BPM{p.oficial?' · ✓ Oficial':''}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
              {p.dias?<span style={{fontSize:11,fontWeight:700,color:'var(--rd)'}}>{p.dias}d</span>:<span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>PRÓX.</span>}
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        ))}
      </div>

      <div style={{padding:'16px',marginTop:8,borderTop:'1px solid var(--bd)'}}>
        <div style={{fontSize:11,color:'var(--tx3)',textAlign:'center',lineHeight:1.7}}>¿Representas un sello o artista?<br/>
          <span style={{color:'var(--ac)',fontWeight:700,cursor:'pointer'}} onClick={()=>onToast({text:'Próximamente',sub:'Contacto con sellos'})}>Publica aquí tus estrenos →</span>
        </div>
      </div>
    </div>
  );
}
