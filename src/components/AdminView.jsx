import { t as getT } from '../i18n';
import { useState, useEffect, useRef } from 'react';
import { SETLISTS, EVENTOS_ESPECIALES, CANCIONES } from '../data/constants';
import { initials } from '../utils/music';

const MESES_CORTO =['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_LARGO =['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA =['D','L','M','M','J','V','S']; // 0=Dom,...,6=Sáb (getDay order)
// Para cabecera de columnas en grilla lun-dom:
const HDR = ['L','M','M','J','V','S','D'];

// ── Mini calendario ────────────────────────────────────────────────────────
export function MiniCalEvento({mes, eventos=[], onSelectDay=()=>{}, selectedDay=null}){
  const now   = new Date();
  const year  = now.getFullYear();
  const month = mes !== undefined ? mes : now.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon-based: 0(Sun)→6, 1(Mon)→0, ...
  const firstCol = firstDow === 0 ? 6 : firstDow - 1;

  // Días con evento
  const isCurrentMonth = month === now.getMonth();
  const setlistDays = isCurrentMonth
    ? new Set(Object.entries(SETLISTS).filter(([,v])=>v!==null).map(([d])=>parseInt(d)))
    : new Set();
  const especiales = new Set(
    EVENTOS_ESPECIALES.filter(e=>e.mes===month+1).map(e=>e.dia)
  );
  const eventosDays = new Set(
    eventos
      .filter(e=>e.fecha && new Date(e.fecha).getFullYear()===year && new Date(e.fecha).getMonth()===month)
      .map(e=>new Date(e.fecha).getDate())
  );
  const eventDays = new Set([...setlistDays, ...especiales, ...eventosDays]);
  const today = isCurrentMonth ? now.getDate() : 0;

  const cells = [];
  for(let i=0; i<firstCol; i++) cells.push(null);
  for(let d=1; d<=daysInMonth; d++) cells.push(d);
  while(cells.length % 7 !== 0) cells.push(null);
  const rows = [];
  for(let i=0; i<cells.length; i+=7) rows.push(cells.slice(i,i+7));

  return(
    <div style={{flexShrink:0, display:'flex', flexDirection:'column', gap:1, minWidth:140}}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, marginBottom:2}}>
        {HDR.map((d,i)=>(
          <div key={i} style={{textAlign:'center', fontSize:6, fontWeight:900,
            color:'rgba(255,255,255,.22)', fontFamily:"'Lexend Giga',sans-serif"}}>{d}</div>
        ))}
      </div>
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:0}}>
          {row.map((d,ci)=>{
            if(!d) return <div key={ci} style={{height:11}}/>;
            const hasEv  = eventDays.has(d);
            const isToday= d === today;
            const isSel  = d === selectedDay;
            return(
              <div key={ci}
                onClick={()=>hasEv && onSelectDay(d)}
                style={{height:11, display:'flex', alignItems:'center', justifyContent:'center',
                  cursor: hasEv ? 'pointer' : 'default'}}>
                <span style={{
                  fontSize:7, fontWeight: hasEv?900:400,
                  fontFamily:"'Lexend Giga',sans-serif",
                  color: isSel?'var(--bg)' : hasEv?'var(--ac)' : isToday?'rgba(255,255,255,.8)':'var(--tx3)',
                  background: isSel?'var(--ac)':'transparent',
                  borderRadius: isSel?'50%':'0',
                  width: isSel?10:undefined, height: isSel?10:undefined,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  textDecoration: isToday&&!hasEv&&!isSel?'underline':'none',
                  lineHeight:1,
                }}>{d}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Barra de meses ─────────────────────────────────────────────────────────
function BarraMeses({mesActivo, onChange, eventos=[]}){
  const scrollRef = useRef(null);

  // Contar eventos por mes (EVENTOS_ESPECIALES + SETLISTS en julio + eventos Firestore)
  const contarEventos = (mesIdx) => {
    const mesNum = mesIdx + 1; // 1-based
    let count = EVENTOS_ESPECIALES.filter(e=>e.mes===mesNum).length;
    if(mesIdx === 6) { // julio — tiene SETLISTS además
      count += Object.values(SETLISTS).filter(v=>v!==null).length;
    }
    count += eventos.filter(ev=>{
      if(!ev.fecha) return false;
      return new Date(ev.fecha).getMonth() === mesIdx;
    }).length;
    return count;
  };

  useEffect(()=>{
    const el = scrollRef.current;
    if(!el) return;
    const btn = el.querySelector(`[data-mes="${mesActivo}"]`);
    if(btn) btn.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
  },[mesActivo]);

  return(
    <div ref={scrollRef} style={{
      display:'flex', gap:0,
      overflowX:'auto', scrollbarWidth:'none',
      WebkitOverflowScrolling:'touch',
      borderBottom:'1px solid var(--bd)',
    }}>
      {MESES_LARGO.map((m,i)=>{
        const isActive = i === mesActivo;
        const count    = contarEventos(i);
        return(
          <button
            key={i}
            data-mes={i}
            onClick={()=>onChange(i)}
            style={{
              flexShrink:0,
              // Desktop: equal width to fill screen. Mobile: compact
              flex:'1 0 auto',
              minWidth: 0,
              padding:'10px 4px 9px',
              border:'none',
              borderBottom: isActive ? '2px solid var(--ac)' : '2px solid transparent',
              borderRadius:0,
              background:'transparent',
              color: isActive ? 'var(--ac)' : 'var(--tx3)',
              fontSize:11, fontWeight: isActive ? 700 : 300,
              cursor:'pointer',
              fontFamily:"'Lexend Giga',sans-serif",
              transition:'all .15s',
              display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            }}
          >
            {/* Nombre completo en desktop, corto en mobile (se hace via JS de width) */}
            <span className="mes-nombre-largo">{m}</span>
            <span className="mes-nombre-corto">{MESES_CORTO[i]}</span>
            {count > 0 && (
              <span style={{
                fontSize:8, fontWeight:700,
                color: isActive ? 'var(--ac)' : 'var(--gn)',
                lineHeight:1,
                opacity: isActive ? 1 : 0.7,
              }}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Tarjeta de fecha ───────────────────────────────────────────────────────
function TarjetaFecha({titulo, subtitulo, lugar, hora, setlist=[], equipos=[], isNext=false,
  isPast=false, pub=true, isLeader=false, tx, onOpen, onLive, badge}){
  return(
    <div
      onClick={onOpen}
      style={{
        padding:'20px 18px',
        borderRadius:'var(--rad-lg)',
        background: isNext ? 'rgba(255,255,255,.05)' : 'var(--s1)',
        border: isNext ? '1px solid rgba(255,255,255,.18)' : '1px solid var(--bd)',
        cursor: onOpen ? 'pointer' : 'default',
        transition:'all .2s',
        opacity: isPast ? 0.85 : 1,
      }}
    >
      {/* ── Fila superior: título + badge + botón live ── */}
      <div style={{display:'flex', alignItems:'flex-start', gap:12, marginBottom: isPast?0:10}}>
        <div style={{flex:1}}>
          <div style={{
            fontFamily:"'Special Gothic Expanded One',sans-serif", fontWeight:400,
            color:'var(--tx)', lineHeight:1.1, fontSize:19, marginBottom: isPast?0:4,
          }}>{titulo}</div>
          {!isPast && subtitulo && (
            <div style={{fontFamily:"'Lexend Giga',sans-serif", fontWeight:300,
              fontSize:11, color:'var(--tx3)', lineHeight:1.5}}>{subtitulo}</div>
          )}
        </div>
        {!isPast && badge && (
          <span style={{
            padding:'4px 11px', borderRadius:'var(--rad-full)', fontSize:9, fontWeight:700,
            border: pub
              ? '1px solid rgba(94,206,160,.35)' : '1px solid rgba(255,200,100,.25)',
            background: pub ? 'rgba(94,206,160,.08)' : 'rgba(255,200,100,.06)',
            color: pub ? 'var(--gn)' : 'rgba(255,200,100,.8)',
            flexShrink:0, whiteSpace:'nowrap',
          }}>{badge}</span>
        )}
        {!isPast && isLeader && setlist.length > 0 && (
          <button
            onClick={e=>{e.stopPropagation(); onLive && onLive();}}
            style={{
              padding:'8px 13px', borderRadius:'var(--rad-sm)',
              border:'1px solid rgba(94,206,160,.35)', background:'rgba(94,206,160,.1)',
              cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0,
              fontFamily:"'Lexend Giga',sans-serif", fontWeight:700, fontSize:11, color:'var(--gn)',
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--gn)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
            {tx.live}
          </button>
        )}
      </div>

      {/* ── Lugar y hora ── */}
      {!isPast && (lugar || hora) && (
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          marginBottom: equipos.length > 0 ? 12 : 0,
          padding:'7px 10px',
          borderRadius:'var(--rad-xs)',
          background:'rgba(255,255,255,.03)',
          border:'1px solid rgba(255,255,255,.05)',
        }}>
          {lugar && (
            <div style={{display:'flex', alignItems:'center', gap:5, flex:1, minWidth:0}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--tx3)" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span style={{fontSize:11, color:'var(--tx2)', fontFamily:"'Lexend Giga',sans-serif",
                fontWeight:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{lugar}</span>
            </div>
          )}
          {hora && (
            <div style={{display:'flex', alignItems:'center', gap:5, flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--tx3)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{fontSize:11, color:'var(--tx2)', fontFamily:"'Lexend Giga',sans-serif",
                fontWeight:700}}>{hora}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Chips de equipos ── */}
      {!isPast && equipos.length > 0 && (
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          {equipos.map(eq=>(
            <div key={eq.id} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'3px 10px', borderRadius:'var(--rad-full)',
              background: eq.color+'12', border:'1px solid '+eq.color+'30',
            }}>
              <div style={{width:6, height:6, borderRadius:'50%', background:eq.color, flexShrink:0}}/>
              <span style={{fontSize:10, fontWeight:300, color:'var(--tx)', fontFamily:"'Lexend Giga',sans-serif"}}>{eq.name}</span>
              <span style={{fontSize:9, fontWeight:900, color:eq.color, display:'flex', alignItems:'center', gap:1}}>
                {(eq.miembros||[]).length}
                <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke={eq.color} strokeWidth="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────
export function AdminView({mode, activeSunday, userRole, onLive, onToast,
  onSelectDay, onOpenFecha, mesNav=new Date().getMonth(), lang='es', eventos=[], onOpenSong, equipos=[]}){
  const tx = getT(lang);
  const [selDay, setSelDay] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pFilter, setPFilter] = useState('');
  const [sel, setSel] = useState(new Set());
  const isLeader = userRole==='leader' || userRole==='superadmin';

  const today      = new Date().getDate();
  const todayMonth = new Date().getMonth() + 1;
  const allDays    = Object.keys(SETLISTS).map(Number).sort((a,b)=>a-b);
  const nextDay    = allDays.find(d => d>=today && SETLISTS[d]!==null);

  const handleMesChange = (m) => {
    if(onSelectDay) onSelectDay(selDay, m);
  };

  const esJulio        = mesNav === 6;
  const setlistsDelMes = esJulio ? Object.entries(SETLISTS) : [];
  const eventosDelMes  = eventos
    .filter(ev => ev.fecha && new Date(ev.fecha).getMonth()===mesNav)
    .sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));
  const especialesDelMes = EVENTOS_ESPECIALES.filter(ev=>ev.mes===mesNav+1);

  const sinEventos = setlistsDelMes.length===0 && eventosDelMes.length===0 && especialesDelMes.length===0;

  return(
    <div style={{paddingBottom:90}}>

      {/* ── Barra de meses ── */}
      <BarraMeses mesActivo={mesNav} onChange={handleMesChange} eventos={eventos}/>

      {/* ── Header mes + mini cal ── */}
      <div style={{
        padding:'var(--sp-md) var(--pw-x,16px) var(--sp-sm)',
        display:'flex', alignItems:'flex-start', gap:'var(--sp-sm)',
      }}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,
            fontSize:24,color:'var(--tx)',lineHeight:1.05,marginBottom:4}}>{MESES_LARGO[mesNav]}</div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:11,
            color:'var(--tx2)',lineHeight:1.5}}>
            {sinEventos ? 'Sin eventos este mes — navega por los meses para revisar tu agenda' : 'Navega por los meses y revisa los próximos eventos agendados'}
          </div>
        </div>
        <MiniCalEvento mes={mesNav} eventos={eventos}
          onSelectDay={d=>{setSelDay(d);if(onSelectDay)onSelectDay(d);}} selectedDay={selDay}/>
      </div>

      {/* ── Setlists (julio) ── */}
      {setlistsDelMes.length>0 && (
        <div style={{display:'flex',flexDirection:'column',gap:'var(--gap)',
          padding:'0 var(--pw-x,16px) var(--sp-md)'}}>
          {setlistsDelMes.map(([dayStr,sl])=>{
            const day = parseInt(dayStr);
            if(sl===null) return(
              <div key={day} style={{padding:'20px 18px',borderRadius:'var(--rad-lg)',
                background:'rgba(255,82,82,.04)',border:'1px solid rgba(255,82,82,.15)',
                display:'flex',alignItems:'center',gap:'var(--sp-sm)'}}>
                <div style={{width:42,height:42,borderRadius:11,background:'rgba(255,82,82,.08)',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:18,fontWeight:900,color:'rgba(255,82,82,.5)'}}>–</span>
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:'var(--tx2)'}}>Dom {day}</div>
                  <div style={{fontSize:11,color:'rgba(255,82,82,.7)',marginTop:2,fontWeight:700}}>{tx.noReunion}</div>
                </div>
              </div>
            );
            const isNext = day===nextDay && todayMonth===new Date().getMonth()+1;
            const isPast = day < today && !isNext;
            const pub    = day <= 12;
            return(
              <div key={day}>
                {isNext && day>today && (
                  <div style={{display:'flex',alignItems:'center',gap:'var(--sp-xs)',
                    margin:'4px 0 var(--sp-xs)'}}>
                    <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(200,169,126,.4))'}}/>
                    <span style={{fontSize:9,fontWeight:900,color:'var(--ac)',
                      textTransform:'uppercase',letterSpacing:'1.5px',flexShrink:0}}>Fecha actual</span>
                    <div style={{flex:1,height:1,background:'linear-gradient(270deg,transparent,rgba(200,169,126,.4))'}}/>
                  </div>
                )}
                <TarjetaFecha
                  titulo={`${tx.sunday} ${day}`}
                  subtitulo={`Setlist · ${sl.length} ${sl.length===1?tx.song:tx.songs}`}
                  lugar="Iglesia Central"
                  hora="10:00"
                  setlist={sl}
                  equipos={equipos}
                  isNext={isNext}
                  isPast={isPast}
                  pub={pub}
                  badge={pub ? tx.published : tx.draft}
                  isLeader={isLeader}
                  tx={tx}
                  onOpen={()=>{setSelDay(day);if(onSelectDay)onSelectDay(day);if(onOpenFecha)onOpenFecha(day,mesNav);}}
                  onLive={()=>onOpenSong&&onOpenSong(0,sl)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Eventos Firestore ── */}
      {eventosDelMes.length>0 && (
        <div style={{padding:'0 var(--pw-x,16px) var(--sp-md)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'var(--sp-xs)',
            marginBottom:'var(--gap)',paddingTop:setlistsDelMes.length>0?'var(--sp-xs)':0}}>
            {setlistsDelMes.length>0&&<><div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
            <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Eventos creados</span>
            <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/></>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'var(--gap)'}}>
            {eventosDelMes.map(ev=>{
              const d=new Date(ev.fecha);
              return(
                <TarjetaFecha
                  key={ev.id}
                  titulo={ev.nombre}
                  subtitulo={`Setlist · ${(ev.setlist||[]).length} canciones`}
                  lugar={ev.lugar||''}
                  hora={ev.hora||''}
                  setlist={ev.setlist||[]}
                  equipos={equipos}
                  isLeader={isLeader}
                  tx={tx}
                  onOpen={()=>{if(onOpenFecha)onOpenFecha(ev.dia||new Date(ev.fecha).getDate(),mesNav);}}
                  onLive={()=>onOpenSong&&(ev.setlist||[]).length>0&&onOpenSong(0,ev.setlist)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Eventos especiales ── */}
      {especialesDelMes.length>0 && (
        <div style={{padding:'0 var(--pw-x,16px) var(--sp-md)'}}>
          {(setlistsDelMes.length>0||eventosDelMes.length>0)&&(
            <div style={{display:'flex',alignItems:'center',gap:'var(--sp-xs)',
              marginBottom:'var(--gap)'}}>
              <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
              <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Eventos especiales</span>
              <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:'var(--gap)'}}>
            {especialesDelMes.map((ev,i)=>(
              <TarjetaFecha
                key={i}
                titulo={ev.label}
                subtitulo={`Setlist · ${(ev.setlist||[]).length} canciones`}
                lugar={ev.lugar||''}
                hora={ev.hora||''}
                setlist={ev.setlist||[]}
                equipos={equipos}
                isLeader={isLeader}
                tx={tx}
                onOpen={()=>{if(onSelectDay)onSelectDay(ev.dia);if(onOpenFecha)onOpenFecha(ev.dia,mesNav);}}
                onLive={()=>onOpenSong&&(ev.setlist||[]).length>0&&onOpenSong(0,ev.setlist)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Estado vacío ── */}
      {sinEventos && (
        <div style={{padding:'var(--sp-xl) var(--pw-x,16px)'}}>
          <div style={{padding:'40px 24px',borderRadius:'var(--rad-lg)',background:'var(--s1)',
            border:'1px solid var(--bd)',textAlign:'center'}}>
            <div style={{fontSize:36,marginBottom:'var(--sp-sm)'}}>📭</div>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,
              fontSize:17,color:'var(--tx)',marginBottom:8}}>
              {tx.noEvents||'Sin eventos este mes'}
            </div>
            <div style={{fontSize:12,color:'var(--ac)',fontWeight:600}}>
              {tx.noEventsSub||'Crea un evento desde Backstage'}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal picker canciones ── */}
      {showPicker&&(
        <div className="mov" onClick={e=>e.target===e.currentTarget&&setShowPicker(false)}>
          <div className="modal">
            <div className="m-hdr">
              <span style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:19,color:'var(--tx)'}}>Agregar canción</span>
              <button className="ib" onClick={()=>setShowPicker(false)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <input className="inp" style={{margin:'9px 13px',width:'calc(100% - 26px)'}}
              placeholder="Buscar..." value={pFilter} onChange={e=>setPFilter(e.target.value)}/>
            <div className="m-body">
              {CANCIONES.filter(s=>s.n.toLowerCase().includes(pFilter.toLowerCase())).map((s,i)=>(
                <div key={s.n} className={`so${sel.has(s.n)?' on':''}`}
                  onClick={()=>setSel(prev=>{const ns=new Set(prev);ns.has(s.n)?ns.delete(s.n):ns.add(s.n);return ns;})}>
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,color:'var(--tx3)',width:17,flexShrink:0}}>{i+1}</span>
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

// ── Mensaje al equipo ──────────────────────────────────────────────────────
export const generarMensaje=(activeSunday,sl,mesNombre,diasAntes)=>{
  const canciones=sl.map((s,i)=>`${i+1}. ${s.name} (${s.key} - ${s.bpm} BPM)`).join('\n');
  const animos=[
    'No tocamos para impresionar, tocamos para ministrar. ¡Preparemos nuestros corazones!',
    'Somos instrumentos en manos del Señor. Que cada nota sea una ofrenda genuina.',
    '¡La presencia de Dios nos espera! Vengan listos y con el corazón disponible.',
    '¡Gracias por su fidelidad! Juntos vamos a levantar una adoración que glorifique a Dios.',
  ];
  const animo=animos[Math.floor(Math.random()*animos.length)];
  return `Hola equipo hermoso! 🎸\n\nLes recuerdo que este domingo ${activeSunday} de ${mesNombre} tenemos servicio.\n\n📋 SETLIST:\n${canciones}\n\n⏰ Llegada: 8:30 AM | Ensayo: 9:00 AM | Servicio: 10:00 AM\n\nPor favor repasa las canciones con ${diasAntes} día${diasAntes>1?'s':''} de anticipación. 🙏\n\n${animo}\n\n¡Los esperamos! Con amor, el equipo de liderazgo.`;
};

export function MiSetlistNotif({onToast,activeSunday,sl,mesNombre}){
  const [avisoActivo,setAvisoActivo]=useState(1);
  const [dias1,setDias1]=useState(3);
  const [dias2,setDias2]=useState(1);
  const diasAntes = avisoActivo===1?dias1:dias2;
  const [msg1,setMsg1]=useState('');
  const [msg2,setMsg2]=useState('');
  const msg = avisoActivo===1?msg1:msg2;
  const setMsg = avisoActivo===1?setMsg1:setMsg2;
  useEffect(()=>{setMsg1(generarMensaje(activeSunday,sl,mesNombre,dias1));},[dias1,activeSunday]);
  useEffect(()=>{setMsg2(generarMensaje(activeSunday,sl,mesNombre,dias2));},[dias2,activeSunday]);
  const [custom1,setCustom1]=useState(false);
  const [custom2,setCustom2]=useState(false);
  const custom = avisoActivo===1?custom1:custom2;
  const setCustom = avisoActivo===1?setCustom1:setCustom2;
  const [open,setOpen]=useState(false);
  if(!open)return(
    <div style={{marginBottom:'var(--sp-md)'}}>
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:'var(--rad-md)',padding:'var(--sp-md)'}}>
        <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'var(--sp-xs)'}}>Recordatorio al equipo</div>
        <button onClick={()=>setOpen(true)} style={{width:'100%',padding:'var(--sp-md)',borderRadius:'var(--rad-md)',border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.07)',cursor:'pointer',display:'flex',alignItems:'center',gap:'var(--sp-sm)',fontFamily:"'Lexend Giga',sans-serif",transition:'all .15s'}}>
          <div style={{width:38,height:38,borderRadius:'var(--rad-sm)',background:'rgba(200,169,126,.12)',border:'1px solid rgba(200,169,126,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{flex:1,textAlign:'left'}}>
            <div style={{fontWeight:900,fontSize:14,color:'var(--ac)'}}>Enviar recordatorio</div>
            <div style={{fontSize:11,color:'var(--tx2)',marginTop:2}}>Aviso 1 y 2 · Info del evento + ánimo al equipo</div>
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--ac)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
  return(
    <div style={{marginBottom:'var(--sp-md)',padding:'var(--sp-md)',borderRadius:'var(--rad-md)',border:'1px solid rgba(200,169,126,.28)',background:'rgba(200,169,126,.05)'}}>
      <div style={{display:'flex',alignItems:'center',gap:'var(--sp-xs)',marginBottom:'var(--sp-sm)'}}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span style={{fontWeight:900,fontSize:13,color:'var(--tx)'}}>Mensaje al equipo</span>
        <button onClick={()=>setOpen(false)} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>
      </div>
      <div style={{display:'flex',gap:'var(--sp-xs)',marginBottom:'var(--sp-sm)'}}>
        {[1,2].map(n=>(
          <button key={n} onClick={()=>setAvisoActivo(n)} style={{flex:1,padding:8,borderRadius:'var(--rad-sm)',border:avisoActivo===n?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',background:avisoActivo===n?'rgba(200,169,126,.08)':'var(--s1)',color:avisoActivo===n?'var(--ac)':'var(--tx3)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>Aviso {n}</button>
        ))}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'var(--sp-sm)'}}>
        <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>Anticipación:</span>
        <select value={diasAntes} onChange={e=>{const v=Number(e.target.value);if(avisoActivo===1)setDias1(v);else setDias2(v);}}
          className="inp" style={{width:'auto',padding:'4px 8px',fontSize:12}}>
          {[1,2,3,4,5,6,7].map(d=>(<option key={d} value={d}>{d} día{d>1?'s':''} antes</option>))}
        </select>
      </div>
      {!custom&&(<div style={{marginBottom:'var(--sp-xs)'}}>
        <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>Vista previa</div>
        <div style={{padding:'10px var(--sp-sm)',borderRadius:'var(--rad-sm)',background:'var(--s1)',border:'1px solid var(--bd)',fontSize:11,color:'var(--tx)',lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:160,overflowY:'auto'}}>{msg}</div>
        <button onClick={()=>setCustom(true)} style={{marginTop:8,fontSize:11,color:'var(--ac)',fontWeight:700,background:'none',border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>Editar mensaje</button>
      </div>)}
      {custom&&(<div style={{marginBottom:'var(--sp-xs)'}}>
        <textarea className="inp" value={msg} onChange={e=>setMsg(e.target.value)} style={{minHeight:80,fontSize:12,lineHeight:1.6,resize:'vertical',marginBottom:6}}/>
        <button onClick={()=>{setCustom(false);setMsg(generarMensaje(activeSunday,sl,mesNombre,diasAntes));}} style={{fontSize:11,color:'var(--tx3)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>← Regenerar automático</button>
      </div>)}
      <div style={{fontSize:10,color:'var(--tx3)',fontWeight:300,marginBottom:'var(--sp-sm)',display:'flex',alignItems:'center',gap:5}}>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--tx3)" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg>
        Se envía por correo y notificación dentro de la app.
      </div>
      <div style={{display:'flex',gap:'var(--sp-xs)'}}>
        <button onClick={()=>setOpen(false)} className="btn btn-g btn-sm" style={{flex:1,justifyContent:'center'}}>Cancelar</button>
        <button onClick={()=>{onToast({text:'Mensaje enviado',sub:`Aviso ${avisoActivo} · correo y notificación`});setOpen(false);}} className="btn btn-p btn-sm" style={{flex:2,justifyContent:'center'}}>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar al equipo
        </button>
      </div>
    </div>
  );
}

// ── Mi Setlist ─────────────────────────────────────────────────────────────
export function MiSetlist({activeSunday,onOpenSong,onLive,userRole,onToast,lang='es',equipos=[]}){
  const tx=getT(lang);
  const sl=SETLISTS[activeSunday]||[];
  const MESES_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNombre=MESES_ES[new Date().getMonth()];
  // Buscar lugar/hora del evento activo en EVENTOS_ESPECIALES
  const evEspecial = EVENTOS_ESPECIALES.find(e=>e.dia===activeSunday&&e.mes===7);
  const lugar = evEspecial?.lugar || 'Iglesia Central';
  const hora  = evEspecial?.hora  || '10:00';

  const ITINERARIO=[
    {hora:'08:30',label:'Llegada y preparación técnica'},
    {hora:'09:00',label:'Prueba de sonido'},
    {hora:'09:30',label:lang==='en'?'Team rehearsal':'Ensayo con el equipo'},
    {hora:'10:00',label:'Inicio del servicio'},
    {hora:'10:05',label:'Bloque de adoración (4 canciones)'},
    {hora:'10:30',label:'Mensaje'},
    {hora:'11:00',label:'Cierre y oración'},
  ];

  return(
    <div style={{padding:'var(--sp-sm) var(--pw-x,16px)',paddingBottom:90}}>
      <div style={{marginBottom:'var(--sp-md)'}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:'var(--sp-sm)',marginBottom:'var(--sp-sm)'}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
              Dom <span style={{color:'var(--ac)'}}>{activeSunday} {mesNombre}</span>
            </div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5}}>
              Tu setlist para este domingo. Repasa con tiempo.
            </div>
          </div>
          <button onClick={onLive} style={{flexShrink:0,padding:'9px 14px',borderRadius:'var(--rad-sm)',border:'1px solid rgba(48,192,183,.35)',background:'rgba(48,192,183,.1)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'var(--rd)',animation:'rp 1.2s infinite'}}/>
              <span style={{fontSize:11,fontWeight:900,color:'var(--gn)',textTransform:'uppercase',letterSpacing:'.5px'}}>{tx.live}</span>
            </div>
            <span style={{fontSize:8,color:'var(--tx3)',fontWeight:700}}>Interpretar</span>
          </button>
        </div>
        {/* Lugar y hora del próximo domingo */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderRadius:'var(--rad-sm)',background:'var(--s1)',border:'1px solid var(--bd)'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,flex:1}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span style={{fontSize:12,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>{lugar}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{fontSize:12,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",fontWeight:700}}>{hora}</span>
          </div>
        </div>
      </div>

      {/* Canciones */}
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:'var(--rad-md)',marginBottom:'var(--gap)',overflow:'hidden'}}>
        <div style={{padding:'10px var(--sp-md)',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Setlist</span>
          <span style={{padding:'2px 8px',borderRadius:'var(--rad-full)',border:'1px solid rgba(94,206,160,.4)',background:'rgba(94,206,160,.08)',color:'var(--gn)',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:'var(--gn)'}}/>Publicado
          </span>
        </div>
        {sl.length===0
          ?<div style={{textAlign:'center',padding:24,color:'var(--tx3)',fontSize:13}}>Sin setlist para este domingo</div>
          :sl.map((s,i)=>(
            <div key={i} onClick={()=>onOpenSong(i)} style={{display:'flex',alignItems:'center',gap:'var(--sp-sm)',padding:'13px var(--sp-md)',borderBottom:i<sl.length-1?'1px solid rgba(255,255,255,.05)':'none',cursor:'pointer'}}>
              <span style={{fontSize:13,fontWeight:900,color:'var(--tx3)',minWidth:16,textAlign:'right'}}>{i+1}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:'var(--tx)'}}>{s.name}</div>
                <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>{s.key} · {s.bpm} BPM</div>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
      </div>

      {/* Equipos */}
      {equipos.length>0&&(
        <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:'var(--rad-md)',marginBottom:'var(--gap)',overflow:'hidden'}}>
          <div style={{padding:'10px var(--sp-md)',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Equipos convocados</span>
            <span style={{fontSize:10,fontWeight:700,color:'var(--tx3)'}}>{equipos.reduce((a,e)=>a+(e.miembros||[]).length,0)} personas</span>
          </div>
          {equipos.map(eq=>(
            <div key={eq.id} style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
              <div style={{padding:'8px var(--sp-md)',display:'flex',alignItems:'center',gap:'var(--sp-xs)'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
                <span style={{fontWeight:900,fontSize:12,color:'var(--tx)',flex:1}}>{eq.name}</span>
                <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{(eq.miembros||[]).length}</span>
              </div>
              <div style={{padding:'0 var(--sp-md) var(--sp-xs)',display:'flex',flexWrap:'wrap',gap:5}}>
                {(eq.miembros||[]).map(m=>(
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:'var(--rad-full)',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)'}}>
                    <div style={{width:16,height:16,borderRadius:'50%',background:'linear-gradient(135deg,'+eq.color+'60,'+eq.color+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                    <span style={{fontSize:10,fontWeight:400,color:'var(--tx)'}}>{m.name.split(' ')[0]}</span>
                    <span style={{fontSize:9,color:eq.color,fontWeight:300}}>{m.role}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {userRole==='superadmin'&&<MiSetlistNotif onToast={onToast} activeSunday={activeSunday} sl={sl} mesNombre={mesNombre}/>}

      {/* Itinerario */}
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:'var(--rad-md)',overflow:'hidden'}}>
        <div style={{padding:'10px var(--sp-md)',borderBottom:'1px solid var(--bd)'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Itinerario</span>
        </div>
        {ITINERARIO.map((it,i)=>(
          <div key={i} style={{display:'flex',gap:'var(--sp-sm)',padding:'11px var(--sp-md)',borderBottom:i<ITINERARIO.length-1?'1px solid rgba(255,255,255,.04)':'none',alignItems:'flex-start'}}>
            <span style={{fontSize:11,fontWeight:900,color:'var(--ac)',minWidth:40,fontFamily:"'Outfit',sans-serif"}}>{it.hora}</span>
            <span style={{fontSize:12,color:'var(--tx)',fontWeight:200,lineHeight:1.4}}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Premiere ───────────────────────────────────────────────────────────────
const PREMIERES=[
  {id:1,name:'Toda La Tierra',album:'Toma Tu Lugar',sello:'Avanti Music',key:'G',bpm:128,dias:13,oficial:true,desc:'Un himno de adoración profética que invita a toda la creación a rendirse ante el Señor.'},
  {id:2,name:'Majestad',album:'Maverick City en Español',sello:'Maverick City Music',key:'D',bpm:72,dias:20,oficial:true,desc:'Nueva versión en español del clásico moderno sobre la majestad de Dios.'},
  {id:3,name:'Gloria Eterna',album:'',sello:'Red Music Latinoamérica',key:'A',bpm:118,dias:null,oficial:false,desc:'Próximamente. Red Music prepara este lanzamiento para sus iglesias asociadas.'},
];
export function PremiereView({onToast}){
  const [sel,setSel]=useState(null);
  const top=PREMIERES[0];
  if(sel){const p=PREMIERES.find(x=>x.id===sel);return(<div style={{padding:'0 0 90px'}}><div style={{padding:'var(--sp-md)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setSel(null)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Premiere</span></div><div style={{margin:'0 var(--pw-x,16px)',padding:'var(--sp-lg)',borderRadius:'var(--rad-md)',background:'linear-gradient(135deg,rgba(200,169,126,.15),rgba(100,80,180,.1))',border:'1px solid rgba(200,169,126,.3)',marginBottom:'var(--sp-md)'}}><div style={{fontSize:10,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'var(--sp-xs)'}}>{p.oficial?'✓ Cifrado oficial':'Próximamente'}</div><div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',marginBottom:4}}>{p.name}</div><div style={{fontSize:13,color:'var(--tx2)',marginBottom:'var(--sp-sm)'}}>{p.album&&`${p.album} · `}{p.sello}</div><div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:'var(--sp-md)'}}><span style={{fontSize:11,fontWeight:700,color:'var(--ac)',background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.25)',padding:'4px 10px',borderRadius:'var(--rad-full)'}}>{p.key}</span><span style={{fontSize:11,fontWeight:700,color:'var(--tx2)',background:'var(--s1)',border:'1px solid var(--bd)',padding:'4px 10px',borderRadius:'var(--rad-full)'}}>{p.bpm} BPM</span>{p.dias&&<span style={{fontSize:11,fontWeight:700,color:'var(--rd)',background:'rgba(255,82,82,.1)',border:'1px solid rgba(255,82,82,.28)',padding:'4px 10px',borderRadius:'var(--rad-full)'}}>⚡ En {p.dias} días</span>}</div><div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.7}}>{p.desc}</div></div><div style={{padding:'0 var(--pw-x,16px)',display:'flex',flexDirection:'column',gap:'var(--sp-xs)'}}><button className="btn btn-p" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:'Agregado al setlist',sub:p.name})}><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Agregar al setlist</button><button className="btn btn-g" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:'Te notificaremos',sub:`Al estreno de ${p.name}`})}><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>Notificarme</button></div></div>);}
  return(<div style={{padding:'0 0 90px'}}><div style={{margin:'var(--sp-md) var(--pw-x,16px)',borderRadius:'var(--rad-lg)',overflow:'hidden',border:'1px solid rgba(200,169,126,.25)',cursor:'pointer'}} onClick={()=>setSel(top.id)}><div style={{background:'linear-gradient(135deg,rgba(10,8,20,.95),rgba(30,20,60,.92))',padding:'22px 20px 20px'}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:'var(--sp-xs)'}}><span style={{fontSize:14}}>★</span><span style={{fontSize:9,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'2px'}}>Próximo estreno</span></div><div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:26,color:'var(--tx)',lineHeight:1.1,marginBottom:4}}>{top.name}</div><div style={{fontSize:12,color:'var(--tx2)',marginBottom:'var(--sp-md)'}}>{top.album} · {top.sello}</div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:12,fontWeight:700,color:'var(--rd)',background:'rgba(255,82,82,.12)',border:'1px solid rgba(255,82,82,.3)',padding:'5px 12px',borderRadius:'var(--rad-full)'}}>⚡ En {top.dias} días</span><span style={{fontSize:11,color:'var(--tx3)',fontWeight:700}}>🏛 247 iglesias →</span></div></div></div><div style={{padding:'0 var(--pw-x,16px)',display:'flex',flexDirection:'column',gap:'var(--sp-xs)'}}>{PREMIERES.map(p=>(<div key={p.id} onClick={()=>setSel(p.id)} style={{padding:'var(--sp-md)',borderRadius:'var(--rad-md)',background:'var(--s1)',border:'1px solid var(--bd)',cursor:'pointer',display:'flex',alignItems:'center',gap:'var(--sp-sm)'}}><div style={{flex:1}}><div style={{fontWeight:700,fontSize:15,color:'var(--tx)',marginBottom:2}}>{p.name}</div><div style={{fontSize:11,color:'var(--tx3)'}}>{p.album||p.sello}</div><div style={{fontSize:10,color:'var(--tx3)',marginTop:3}}>{p.key} · {p.bpm} BPM{p.oficial?' · ✓ Oficial':''}</div></div><div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>{p.dias?<span style={{fontSize:11,fontWeight:700,color:'var(--rd)'}}>{p.dias}d</span>:<span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>PRÓX.</span>}<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></div></div>))}</div><div style={{padding:'var(--sp-md)',marginTop:'var(--sp-xs)',borderTop:'1px solid var(--bd)'}}><div style={{fontSize:11,color:'var(--tx3)',textAlign:'center',lineHeight:1.7}}>¿Representas un sello o artista?<br/><span style={{color:'var(--ac)',fontWeight:700,cursor:'pointer'}} onClick={()=>onToast({text:'Próximamente',sub:'Contacto con sellos'})}>Publica aquí tus estrenos →</span></div></div></div>);
}
