import { t as getT } from '../i18n';
import { useState, useEffect, useRef } from 'react';
import { SETLISTS, EVENTOS_ESPECIALES, CANCIONES } from '../data/constants';
import { initials } from '../utils/music';
import { CustomSelect } from './common';

const MESES_CORTO =['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS_SEMANA =['D','L','M','M','J','V','S']; // 0=Dom,...,6=Sáb (getDay order)
// Para cabecera de columnas en grilla lun-dom:
const HDR = ['L','M','M','J','V','S','D'];

// ── Mini calendario ────────────────────────────────────────────────────────
export function MiniCalEvento({mes, eventos=[], onSelectDay=()=>{}, selectedDay=null, lang='es'}){
  const tx = getT(lang);
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
          <div key={i} style={{textAlign:'center', fontSize:'var(--fs-3xs)', fontWeight:900,
            color:'var(--div)', fontFamily:"var(--font-body)"}}>{d}</div>
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
                  fontSize:'var(--fs-3xs)', fontWeight: hasEv?900:400,
                  fontFamily:"var(--font-body)",
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
function BarraMeses({mesActivo, onChange, eventos=[], lang='es'}){
  const tx = getT(lang);
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
      {tx.monthsFull.map((m,i)=>{
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
              borderBottom: isActive ? '2px solid var(--ac)' : '2px solid transparent',
              borderRadius:0,
              background:'transparent',
              color: isActive ? 'var(--ac)' : 'var(--tx3)',
              fontSize:'var(--fs-base)', fontWeight: isActive ? 700 : 300,
              cursor:'pointer',
              fontFamily:"var(--font-body)",
              transition:'all .15s',
              display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            }}
          >
            {/* Nombre completo en desktop, corto en mobile (se hace via JS de width) */}
            <span className="mes-nombre-largo">{m}</span>
            <span className="mes-nombre-corto">{MESES_CORTO[i]}</span>
            {count > 0 && (
              <span style={{
                fontSize:'var(--fs-2xs)', fontWeight:700,
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
  isPast=false, pub=true, isLeader=false, tx, onOpen, onLive, badge, tieneEnsayo=false, onGoToProxFecha}){
  const [expanded, setExpanded] = useState(false);
  return(
    <div
      onClick={()=>setExpanded(v=>!v)}
      style={{
        position:'relative',
        paddingTop:14,paddingBottom:14,paddingLeft:18,paddingRight:18,
        borderRadius:'var(--rad-lg)',
        background:'var(--s1)',
        cursor:'pointer',
        transition:'all .25s',
        opacity: isPast ? 0.75 : 1,
      }}
    >
      {/* ── Fila siempre visible: título + chevron ── */}
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{
            fontFamily:"var(--font-display)",fontWeight:400,
            color:'var(--tx)',lineHeight:1.1,fontSize:'var(--fs-xl)',
          }}>{titulo}</div>
          {!expanded&&subtitulo&&(
            <div style={{fontFamily:"var(--font-body)",fontWeight:300,
              fontSize:'var(--fs-sm)',color:'var(--tx3)',marginTop:2}}>{subtitulo}</div>
          )}
        </div>
        {/* Indicador expandido/colapsado */}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2"
          style={{flexShrink:0,transform:expanded?'rotate(180deg)':'rotate(0deg)',transition:'transform .2s'}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* ── Contenido expandido ── */}
      {expanded&&(
        <div style={{marginTop:12}}>
          {tieneEnsayo&&(
            <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:8}}>
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="var(--gn)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span style={{fontSize:'var(--fs-xs)',fontWeight:700,color:'var(--gn)',fontFamily:"var(--font-body)"}}>{tx.rehearsalAssigned}</span>
            </div>
          )}
          {(lugar||hora)&&(
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10,
              padding:'7px 10px',borderRadius:'var(--rad-xs)',background:'var(--s2)'}}>
              {lugar&&(
                <div style={{display:'flex',alignItems:'center',gap:5,flex:1,minWidth:0}}>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--tx3)" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span style={{fontSize:'var(--fs-base)',color:'var(--tx2)',fontFamily:"var(--font-body)",
                    fontWeight:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lugar}</span>
                </div>
              )}
              {hora&&(
                <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--tx3)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span style={{fontSize:'var(--fs-base)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontWeight:700}}>{hora}</span>
                </div>
              )}
            </div>
          )}
          {equipos.length>0&&(
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
              {equipos.map(eq=>(
                <div key={eq.id} style={{display:'flex',alignItems:'center',gap:5,
                  padding:'3px 10px',borderRadius:'var(--rad-full)',background:eq.color+'12'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
                  <span style={{fontSize:'var(--fs-sm)',fontWeight:300,color:'var(--tx)',fontFamily:"var(--font-body)"}}>{eq.name}</span>
                </div>
              ))}
            </div>
          )}
          {/* Acciones */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
            <button onClick={e=>{e.stopPropagation();onOpen&&onOpen();}}
              style={{flex:1,padding:'8px 0',borderRadius:'var(--rad-sm)',
                background:'var(--s2)',cursor:'pointer',
                fontFamily:"var(--font-body)",fontWeight:700,fontSize:'var(--fs-base)',color:'var(--tx2)'}}>
              Ver detalles →
            </button>
            {isLeader&&setlist.length>0&&(
              <button onClick={e=>{e.stopPropagation();onLive&&onLive();}}
                style={{padding:'8px 14px',borderRadius:'var(--rad-sm)',
                  background:'rgba(94,206,160,.1)',cursor:'pointer',
                  display:'flex',alignItems:'center',gap:5,flexShrink:0,
                  fontFamily:"var(--font-body)",fontWeight:700,fontSize:'var(--fs-base)',color:'var(--gn)'}}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--gn)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                {tx.live}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────
export function AdminView({mode, activeSunday, userRole, onLive, onToast,
  onSelectDay, onOpenFecha, onAbrirFecha, onGoToProxFecha, mesNav=new Date().getMonth(), lang='es', eventos=[], onOpenSong, equipos=[], personas=[], ensayos=[]}){
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
      <BarraMeses mesActivo={mesNav} onChange={handleMesChange} eventos={eventos} lang={lang}/>

      {/* ── Header mes + mini cal ── */}
      <div style={{
        padding:'var(--sp-md) var(--pw-x,16px) var(--sp-sm)',
        display:'flex', alignItems:'flex-start', gap:'var(--sp-sm)',
      }}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"var(--font-body)",fontWeight:700,fontSize:'var(--fs-xs)',color:'var(--tx3)',
            textTransform:'uppercase',letterSpacing:'1px',marginBottom:3}}>Eventos en</div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:400,
            fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:4}}>{tx.monthsFull[mesNav]}</div>
          <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-base)',
            color:'var(--tx2)',lineHeight:1.4}}>
            {sinEventos ? 'Sin eventos este mes — navega por los meses para revisar tu agenda' : tx.navMonthsHint}
          </div>
        </div>
        <MiniCalEvento mes={mesNav} eventos={eventos} lang={lang}
          onSelectDay={d=>{setSelDay(d);if(onSelectDay)onSelectDay(d);}} selectedDay={selDay}/>
      </div>

      {/* ── Setlists (julio) ── */}
      {setlistsDelMes.length>0 && (
        <div style={{display:'flex',flexDirection:'column',gap:'var(--gap)',
          padding:'0 var(--pw-x,16px) var(--sp-md)'}}>
          {setlistsDelMes.map(([dayStr,sl])=>{
            const day = parseInt(dayStr);
            if(sl===null) return(
              <div key={day} style={{paddingTop:28,paddingBottom:28,paddingLeft:18,paddingRight:18,borderRadius:'var(--rad-lg)',
                background:'rgba(255,82,82,.08)',display:'flex',alignItems:'center',gap:'var(--sp-sm)'}}>
                <div style={{width:42,height:42,borderRadius:11,background:'rgba(255,82,82,.15)',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:'var(--fs-xl)',fontWeight:900,color:'var(--rd)'}}>–</span>
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:'var(--fs-emph)',color:'var(--tx)'}}>Dom {day}</div>
                  <div style={{fontSize:'var(--fs-base)',color:'var(--rd)',marginTop:2,fontWeight:700}}>{tx.noReunion}</div>
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
                    <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--ac)',
                      textTransform:'uppercase',letterSpacing:'1.5px',flexShrink:0}}>{tx.currentDateLbl}</span>
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
                  onOpen={()=>{setSelDay(day);if(onSelectDay)onSelectDay(day);
                    onAbrirFecha&&onAbrirFecha({origen:'legacy',id:`legacy-${day}`,nombre:`${tx.sunday} ${day}`,fechaStr:null,lugar:'Iglesia Central',hora:'10:00',setlist:sl});}}
                  onLive={()=>onOpenSong&&onOpenSong(0,sl)}
                  onGoToProxFecha={onGoToProxFecha}
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
            {setlistsDelMes.length>0&&<><div style={{flex:1,height:1,background:'var(--s3)'}}/>
            <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.eventsCreatedLbl}</span>
            <div style={{flex:1,height:1,background:'var(--s3)'}}/></>}
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
                  onOpen={()=>{onAbrirFecha&&onAbrirFecha({origen:'evento',id:ev.id,nombre:ev.nombre,fechaStr:ev.fecha,lugar:ev.lugar||'',hora:ev.hora||'',setlist:ev.setlist||[],equiposConvocados:ev.equiposConvocados||null,itinerario:ev.itinerario||null});}}
                  onLive={()=>onOpenSong&&(ev.setlist||[]).length>0&&onOpenSong(0,ev.setlist)}
                  tieneEnsayo={ensayos.some(en=>en.ref===`evento:${ev.id}`)}
                  onGoToProxFecha={onGoToProxFecha}
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
              <div style={{flex:1,height:1,background:'var(--s3)'}}/>
              <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.specialEventsLbl}</span>
              <div style={{flex:1,height:1,background:'var(--s3)'}}/>
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
                onOpen={()=>{if(onSelectDay)onSelectDay(ev.dia);
                  onAbrirFecha&&onAbrirFecha({origen:'especial',id:`especial-${i}`,nombre:ev.label,fechaStr:null,lugar:ev.lugar||'',hora:ev.hora||'',setlist:ev.setlist||[]});}}
                onLive={()=>onOpenSong&&(ev.setlist||[]).length>0&&onOpenSong(0,ev.setlist)}
                onGoToProxFecha={onGoToProxFecha}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Estado vacío ── */}
      {sinEventos && (
        <div style={{padding:'var(--sp-xl) var(--pw-x,16px)'}}>
          <div style={{padding:'40px 24px',borderRadius:'var(--rad-lg)',background:'var(--s1)',
            textAlign:'center'}}>
            <div style={{marginBottom:'var(--sp-sm)',opacity:.5,display:'flex',justifyContent:'center'}}>
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="16" rx="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="8" y1="3" x2="8" y2="7"/>
                <line x1="16" y1="3" x2="16" y2="7"/>
              </svg>
            </div>
            <div style={{fontFamily:"var(--font-display)",fontWeight:400,
              fontSize:'var(--fs-xl)',color:'var(--tx)',marginBottom:8}}>
              {tx.noEvents||tx.noEventsThisMonth}
            </div>
            <div style={{fontSize:'var(--fs-md)',color:'var(--ac)',fontWeight:600}}>
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
              <span style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-xl)',color:'var(--tx)'}}>{tx.addSong}</span>
              <button className="ib" onClick={()=>setShowPicker(false)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <input className="inp" style={{margin:'9px 13px',width:'calc(100% - 26px)'}}
              placeholder={tx.searchPlaceholder} value={pFilter} onChange={e=>setPFilter(e.target.value)}/>
            <div className="m-body">
              {CANCIONES.filter(s=>s.n.toLowerCase().includes(pFilter.toLowerCase())).map((s,i)=>(
                <div key={s.n} className={`so${sel.has(s.n)?' on':''}`}
                  onClick={()=>setSel(prev=>{const ns=new Set(prev);ns.has(s.n)?ns.delete(s.n):ns.add(s.n);return ns;})}>
                  <span style={{fontFamily:"var(--font-body)",fontSize:'var(--fs-lg)',color:'var(--tx3)',width:17,flexShrink:0}}>{i+1}</span>
                  <span className="so-n">{s.n}</span>
                  <span className="so-bpm">{s.bpm}</span>
                  <div className="so-chk">✓</div>
                </div>
              ))}
            </div>
            <div className="m-ftr">
              <button className="btn btn-g btn-sm" onClick={()=>setShowPicker(false)}>{tx.cancel}</button>
              <button className="btn btn-p btn-sm" onClick={()=>{setShowPicker(false);onToast({text:tx.updatedLbl,sub:`${sel.size} canciones`});}}>{tx.addBtn}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mensaje al equipo ──────────────────────────────────────────────────────
export const generarMensaje=(fecha,sl,diasAntes)=>{
  const resolverNombre=(item)=> typeof item==='string' ? item : (item?.cancion||item?.name||item?.n||'');
  const canciones=sl.map((s,i)=>`${i+1}. ${resolverNombre(s)}`).join('\n');
  const animos=[
    'No tocamos para impresionar, tocamos para ministrar. ¡Preparemos nuestros corazones!',
    'Somos instrumentos en manos del Señor. Que cada nota sea una ofrenda genuina.',
    '¡La presencia de Dios nos espera! Vengan listos y con el corazón disponible.',
    '¡Gracias por su fidelidad! Juntos vamos a levantar una adoración que glorifique a Dios.',
  ];
  const animo=animos[Math.floor(Math.random()*animos.length)];
  const cuando = fecha?.fechaStr ? `el ${fecha.fechaStr}` : `en ${fecha?.nombre||'el próximo evento'}`;
  const horaLinea = fecha?.hora ? `\n⏰ Hora: ${fecha.hora}${fecha.lugar?` · ${fecha.lugar}`:''}\n` : (fecha?.lugar?`\n📍 ${fecha.lugar}\n`:'');
  return `Hola equipo hermoso! 🎸\n\nLes recuerdo que ${cuando} tenemos ${fecha?.nombre||'servicio'}.\n\n📋 SETLIST:\n${canciones}\n${horaLinea}\nPor favor repasa las canciones con ${diasAntes} día${diasAntes>1?'s':''} de anticipación. 🙏\n\n${animo}\n\n¡Los esperamos! Con amor, el equipo de liderazgo.`;
};

export function MiSetlistNotif({onToast,fecha,sl,lang='es'}){
  const tx = getT(lang);
  const activeSunday=fecha; // alias interno, evita renombrar todo el resto del componente
  const [avisoActivo,setAvisoActivo]=useState(1);
  const [dias1,setDias1]=useState(3);
  const [dias2,setDias2]=useState(1);
  const diasAntes = avisoActivo===1?dias1:dias2;
  const [msg1,setMsg1]=useState('');
  const [msg2,setMsg2]=useState('');
  const msg = avisoActivo===1?msg1:msg2;
  const setMsg = avisoActivo===1?setMsg1:setMsg2;
  useEffect(()=>{setMsg1(generarMensaje(activeSunday,sl,dias1));},[dias1,activeSunday]);
  useEffect(()=>{setMsg2(generarMensaje(activeSunday,sl,dias2));},[dias2,activeSunday]);
  const [custom1,setCustom1]=useState(false);
  const [custom2,setCustom2]=useState(false);
  const custom = avisoActivo===1?custom1:custom2;
  const setCustom = avisoActivo===1?setCustom1:setCustom2;
  const [open,setOpen]=useState(false);
  if(!open)return(
    <div style={{marginBottom:'var(--sp-md)'}}>
      <div style={{background:'var(--s1)',borderRadius:'var(--rad-md)',padding:'var(--sp-md)'}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'var(--sp-xs)'}}>{tx.teamReminderLbl}</div>
        <button onClick={()=>setOpen(true)}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(200,169,126,.12)'}
          onMouseLeave={e=>e.currentTarget.style.background='rgba(200,169,126,.07)'}
          style={{width:'100%',padding:'var(--sp-md)',borderRadius:'var(--rad-md)',background:'rgba(200,169,126,.07)',cursor:'pointer',display:'flex',alignItems:'center',gap:'var(--sp-sm)',fontFamily:"var(--font-body)",transition:'all .15s'}}>
          <div style={{width:38,height:38,borderRadius:'var(--rad-sm)',background:'rgba(200,169,126,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{flex:1,textAlign:'left'}}>
            <div style={{fontWeight:900,fontSize:'var(--fs-emph)',color:'var(--ac)',marginTop:3}}>{tx.sendReminderBtn}</div>
            <div style={{fontSize:'var(--fs-base)',color:'var(--tx2)',marginTop:2}}>Aviso 1 y 2 · Info del evento + ánimo al equipo</div>
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--ac)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
  return(
    <div style={{marginBottom:'var(--sp-md)',padding:'var(--sp-md)',borderRadius:'var(--rad-md)',background:'rgba(200,169,126,.05)'}}>
      <div style={{display:'flex',alignItems:'center',gap:'var(--sp-xs)',marginBottom:'var(--sp-sm)'}}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span style={{fontWeight:900,fontSize:'var(--fs-lg)',color:'var(--tx)'}}>{tx.teamMessageLbl}</span>
        <button onClick={()=>setOpen(false)} style={{marginLeft:'auto',background:'none',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-xl)',lineHeight:1}}>×</button>
      </div>
      <div style={{display:'flex',gap:'var(--sp-xs)',marginBottom:'var(--sp-sm)'}}>
        {[1,2].map(n=>(
          <button key={n} onClick={()=>setAvisoActivo(n)} style={{flex:1,padding:8,borderRadius:'var(--rad-sm)',background:avisoActivo===n?'rgba(200,169,126,.08)':'var(--s1)',color:avisoActivo===n?'var(--ac)':'var(--tx3)',fontWeight:700,fontSize:'var(--fs-md)',cursor:'pointer',fontFamily:"var(--font-body)"}}>Aviso {n}</button>
        ))}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'var(--sp-sm)'}}>
        <span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontWeight:700,fontFamily:"var(--font-body)"}}>{tx.leadTimeLbl}</span>
        <CustomSelect value={diasAntes} onChange={v=>{const n=Number(v);if(avisoActivo===1)setDias1(n);else setDias2(n);}}
          style={{width:'auto',padding:'4px 8px',fontSize:'var(--fs-md)'}}
          options={[1,2,3,4,5,6,7].map(d=>({value:d,label:`${d} día${d>1?'s':''} antes`}))}/>
      </div>
      {!custom&&(<div style={{marginBottom:'var(--sp-xs)'}}>
        <div style={{fontSize:'var(--fs-sm)',fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>{tx.previewLbl}</div>
        <div style={{padding:'10px var(--sp-sm)',borderRadius:'var(--rad-sm)',background:'var(--s1)',fontSize:'var(--fs-base)',color:'var(--tx)',lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:160,overflowY:'auto'}}>{msg}</div>
        <button onClick={()=>setCustom(true)} style={{marginTop:8,fontSize:'var(--fs-base)',color:'var(--ac)',fontWeight:700,background:'none',cursor:'pointer',fontFamily:"var(--font-body)"}}>{tx.editMessageLbl}</button>
      </div>)}
      {custom&&(<div style={{marginBottom:'var(--sp-xs)'}}>
        <textarea className="inp" value={msg} onChange={e=>setMsg(e.target.value)} style={{minHeight:80,fontSize:'var(--fs-md)',lineHeight:1.6,resize:'vertical',marginBottom:6}}/>
        <button onClick={()=>{setCustom(false);setMsg(generarMensaje(activeSunday,sl,diasAntes));}} style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',background:'none',cursor:'pointer',fontFamily:"var(--font-body)"}}>← Regenerar automático</button>
      </div>)}
      <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontWeight:300,marginBottom:'var(--sp-sm)',display:'flex',alignItems:'center',gap:5}}>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--tx3)" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg>
        Se envía por correo y notificación dentro de la app.
      </div>
      <div style={{display:'flex',gap:'var(--sp-xs)'}}>
        <button onClick={()=>setOpen(false)} className="btn btn-g btn-sm" style={{flex:1,justifyContent:'center'}}>{tx.cancel}</button>
        <button onClick={()=>{onToast({text:tx.messageSentToast,sub:`Aviso ${avisoActivo} · correo y notificación`});setOpen(false);}} className="btn btn-p btn-sm" style={{flex:2,justifyContent:'center'}}>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar al equipo
        </button>
      </div>
    </div>
  );
}

// ── Mi Setlist ─────────────────────────────────────────────────────────────
export function MiSetlist({fecha,onOpenSong,onLive,userRole,onToast,lang='es',equipos=[],personas=[],variacionesDB={},ensayos=[],currentUser=null,onActualizarEvento=null}){
  const tx=getT(lang);
  const [eqAbierto,setEqAbierto]=useState(null);
  const [agregarEnEq,setAgregarEnEq]=useState(null);
  // fecha: {origen:'evento'|'legacy'|'especial', id, nombre, fechaStr, lugar, hora, setlist}
  // setlist puede traer 3 formatos (compatibilidad, ver App.jsx abrirSongDesdeEvento):
  //   string (legacy) | {name,key,bpm} ya resuelto | {cancion,asignaciones} (v36, nuevo)
  const f = fecha || {origen:'legacy',id:'legacy',nombre:tx.noDateLbl,fechaStr:null,lugar:'',hora:'',setlist:[]};
  const sl = f.setlist||[];

  // Ensayos reales de este evento (solo aplica a origen==='evento')
  const ensayosDelEvento = f.origen==='evento' ? ensayos.filter(en=>en.ref===`evento:${f.id}`) : [];
  // Equipos convocados: prioridad 1) campo real del evento (v40), 2) inferir
  // desde los ensayos si el evento no lo tiene (eventos viejos, legacy,
  // especiales), 3) mostrar todos como último fallback.
  const equipoIdsConvocados = f.equiposConvocados
    ? new Set(f.equiposConvocados)
    : new Set(ensayosDelEvento.flatMap(en=>en.equipos||[]));
  const equiposBase = equipoIdsConvocados.size>0 ? equipos.filter(eq=>equipoIdsConvocados.has(eq.id)) : equipos;

  // ── Equipos por evento (v93) ────────────────────────────────────────────
  // `evento.equiposOverride[equipoId] = {miembros:[...]}` permite ajustar la
  // dotación SOLO para esta fecha: quitar, agregar y cambiar roles sin
  // tocar el roster global ni tener que duplicar el equipo. Si no hay
  // override para un equipo se usa su roster global tal cual. El nombre y
  // el color del equipo NUNCA se sobrescriben — eso vive en Gestión de
  // equipos y es global por diseño.
  const esEventoReal = f.origen==='evento' && typeof onActualizarEvento==='function';
  const overrides = f.equiposOverride||{};
  const equiposAMostrar = equiposBase.map(eq=>{
    const ov = overrides[eq.id];
    return ov ? {...eq, miembros:ov.miembros||[], editadoParaEvento:true}
              : {...eq, editadoParaEvento:false};
  });

  // Puede editar: admin siempre; líder solo del equipo donde ES líder.
  // Se compara contra eq.lider (id | nombre | correo, según cómo se haya
  // guardado) y contra el rol del propio miembro dentro del equipo.
  const idUser=(currentUser?.email||'').toLowerCase().trim();
  const puedeEditarEquipo=(eq)=>{
    if(!esEventoReal) return false;
    if(userRole==='superadmin') return true;
    if(userRole!=='leader') return false;
    if(!idUser) return false;
    const lider=String(eq.lider??'').toLowerCase().trim();
    if(lider&&lider===idUser) return true;
    return (eq.miembros||[]).some(m=>
      (m.email||'').toLowerCase().trim()===idUser && /l[ií]der/i.test(m.role||''));
  };

  const guardarMiembros=(eqId,miembros)=>{
    onActualizarEvento(f.id, ev=>({...ev,
      equiposOverride:{...(ev.equiposOverride||{}), [eqId]:{miembros}}}));
  };
  const restaurarEquipo=(eqId)=>{
    onActualizarEvento(f.id, ev=>{
      const o={...(ev.equiposOverride||{})};
      delete o[eqId];
      return {...ev, equiposOverride:o};
    });
    onToast&&onToast({text:'Equipo restaurado',sub:'Vuelve a su dotación original'});
  };

  // Resuelve nombre + asignaciones (variación/persona) por ítem del setlist,
  // sin importar el formato en que venga
  const resolverItem=(item)=>{
    if(typeof item==='string') return {nombre:item,asignaciones:[]};
    if(item&&item.cancion){
      const asignaciones=(item.asignaciones||[]).map(a=>{
        const v=a.variacionId&&a.variacionId!=='original'?(variacionesDB[item.cancion]||[]).find(x=>x.id===a.variacionId):null;
        const persona=a.personaId?personas.find(p=>p.id===a.personaId):null;
        return (v||persona)?{variacion:v?.label||tx.originalLbl,persona:persona?.name||null}:null;
      }).filter(Boolean);
      return {nombre:item.cancion,key:'',bpm:'',asignaciones};
    }
    return {nombre:item.name||item.n||'',key:item.key,bpm:item.bpm,asignaciones:[]};
  };

  return(
    <div style={{padding:'var(--sp-sm) var(--pw-x,16px)',paddingBottom:90}}>
      <div style={{marginBottom:'var(--sp-md)'}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:'var(--sp-sm)',marginBottom:'var(--sp-sm)'}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-pagehead)',textTransform:'uppercase',color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
              {f.nombre}
            </div>
            <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-base)',color:'var(--tx2)',lineHeight:1.4}}>
              Tu setlist para esta fecha. Repasa con tiempo.
            </div>
          </div>
          {/* v93: las fechas legacy/especiales son solo lectura — sin "En vivo",
              porque no son eventos reales y no hay nada que sincronizar. */}
          {f.origen==='evento'&&(
            <button onClick={onLive} style={{flexShrink:0,padding:'9px 14px',borderRadius:'var(--rad-sm)',background:'rgba(var(--gn-rgb),.1)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:'var(--rd)',animation:'rp 1.2s infinite'}}/>
                <span style={{fontSize:'var(--fs-base)',fontWeight:900,color:'var(--gn)',textTransform:'uppercase',letterSpacing:'.5px'}}>{tx.live}</span>
              </div>
              <span style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontWeight:700}}>{tx.performBtn}</span>
            </button>
          )}
        </div>
        {/* Lugar y hora */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',borderRadius:'var(--rad-sm)',background:'var(--s1)',}}>
          <div style={{display:'flex',alignItems:'center',gap:6,flex:1}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span style={{fontSize:'var(--fs-md)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontWeight:300}}>{f.lugar||tx.noPlaceAssignedLbl}</span>
          </div>
          {f.hora&&(
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{fontSize:'var(--fs-md)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontWeight:700}}>{f.hora}</span>
            </div>
          )}
        </div>
      </div>

      {/* Canciones */}
      <div style={{background:'var(--s1)',borderRadius:'var(--rad-md)',marginBottom:'var(--gap)',overflow:'hidden'}}>
        <div style={{padding:'10px var(--sp-md)',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.setlistLbl}</span>
          <span style={{padding:'2px 8px',borderRadius:'var(--rad-full)',background:'rgba(94,206,160,.08)',color:'var(--gn)',fontSize:'var(--fs-xs)',fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:'var(--gn)'}}/>Publicado
          </span>
        </div>
        {sl.length===0
          ?<div style={{textAlign:'center',padding:24,color:'var(--tx3)',fontSize:'var(--fs-lg)'}}>{tx.noSetlistForDateLbl}</div>
          :sl.map((item,i)=>{
            const r=resolverItem(item);
            return(
            <div key={i} onClick={()=>onOpenSong(i)} style={{display:'flex',alignItems:'center',gap:'var(--sp-sm)',padding:'13px var(--sp-md)',borderBottom:i<sl.length-1?'1px solid var(--s1)':'none',cursor:'pointer'}}>
              <span style={{fontSize:'var(--fs-lg)',fontWeight:900,color:'var(--tx3)',minWidth:16,textAlign:'right'}}>{i+1}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:'var(--fs-base)',color:'var(--tx)'}}>{r.nombre}</div>
                <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginTop:2}}>
                  {r.key?`${r.key} · ${r.bpm} BPM`:''}
                  {r.asignaciones.length>0&&r.asignaciones.map((a,ai)=>(
                    <span key={ai} style={{color:'var(--ac)',marginLeft:r.key?6:0,background:'rgba(200,169,126,.12)',padding:'1px 6px',borderRadius:100,marginRight:4}}>
                      {a.persona?`${a.variacion} → ${a.persona}`:a.variacion}
                    </span>
                  ))}
                </div>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            );
          })}
      </div>

      {/* Ensayos de este evento */}
      {ensayosDelEvento.length>0&&(
        <div style={{background:'var(--s1)',borderRadius:'var(--rad-md)',marginBottom:'var(--gap)',overflow:'hidden'}}>
          <div style={{padding:'10px var(--sp-md)',borderBottom:'1px solid var(--bd)'}}>
            <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>
              Ensayos · {ensayosDelEvento.length}
            </span>
          </div>
          {ensayosDelEvento.map((en,i)=>(
            <div key={en.id} style={{padding:'11px var(--sp-md)',borderBottom:i<ensayosDelEvento.length-1?'1px solid var(--s1)':'none',display:'flex',alignItems:'center',gap:8}}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--gn)" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              <span style={{fontSize:'var(--fs-md)',color:'var(--tx)',flex:1}}>{en.nombre||tx.rehearsalLbl}{en.setlistNombre?` · ${en.setlistNombre}`:''}</span>
              <span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)'}}>{(en.equipos||[]).length} equipo{(en.equipos||[]).length!==1?'s':''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Equipos */}
      {equiposAMostrar.length>0&&(
        <div style={{background:'var(--s1)',borderRadius:'var(--rad-md)',marginBottom:'var(--gap)',overflow:'hidden'}}>
          <div style={{padding:'10px var(--sp-md)',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.teamsCalledLbl}</span>
            <span style={{fontSize:'var(--fs-sm)',fontWeight:700,color:'var(--tx3)'}}>{equiposAMostrar.reduce((a,e)=>a+(e.miembros||[]).length,0)} personas</span>
          </div>
          {/* Grid 2 columnas — mismo lenguaje visual que Gestión de equipos */}
          <div style={{padding:'12px var(--sp-md)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {equiposAMostrar.map(eq=>{
              const miembros=eq.miembros||[];
              const editable=puedeEditarEquipo(eq);
              const abierto=eqAbierto===eq.id;
              return(
                <div key={eq.id}
                  onClick={()=>{setEqAbierto(abierto?null:eq.id);setAgregarEnEq(null);}}
                  style={{borderRadius:14,background:'var(--s2)',overflow:'hidden',
                    cursor:'pointer',outline:abierto?`2px solid ${eq.color}60`:'none'}}>
                  <div style={{padding:'12px 12px 10px',display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:eq.color,flexShrink:0,
                      boxShadow:`0 0 8px ${eq.color}80`}}/>
                    <span style={{fontFamily:"var(--font-body)",fontWeight:900,fontSize:'var(--fs-md)',
                      color:'var(--tx)',flex:1,overflow:'hidden',textOverflow:'ellipsis',
                      whiteSpace:'nowrap'}}>{eq.name}</span>
                    <span style={{fontSize:'var(--fs-xs)',fontWeight:700,color:'var(--tx3)',flexShrink:0}}>{miembros.length}</span>
                  </div>
                  <div style={{padding:'0 10px 10px',display:'flex',flexWrap:'wrap',gap:4}}>
                    {miembros.slice(0,4).map(m=>(
                      <div key={m.id} style={{fontSize:'var(--fs-2xs)',fontWeight:700,padding:'2px 7px',
                        borderRadius:100,background:eq.color+'18',color:eq.color,
                        fontFamily:"var(--font-body)",whiteSpace:'nowrap'}}>
                        {String(m.name||'').split(' ')[0]}
                      </div>
                    ))}
                    {miembros.length>4&&(
                      <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',padding:'2px 6px',
                        fontFamily:"var(--font-body)"}}>+{miembros.length-4}</div>
                    )}
                    {miembros.length===0&&(
                      <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontStyle:'italic',
                        fontFamily:"var(--font-body)"}}>Sin miembros</div>
                    )}
                  </div>
                  {eq.editadoParaEvento&&(
                    <div style={{padding:'0 10px 10px'}}>
                      <span style={{fontSize:'8px',fontWeight:900,color:'var(--ac)',
                        textTransform:'uppercase',letterSpacing:'.5px',padding:'2px 7px',
                        borderRadius:100,background:'rgba(200,169,126,.12)',
                        fontFamily:"var(--font-body)"}}>Ajustado para esta fecha</span>
                    </div>
                  )}
                  {editable&&!abierto&&(
                    <div style={{padding:'0 10px 10px',fontSize:'var(--fs-2xs)',color:'var(--tx3)',
                      fontFamily:"var(--font-body)"}}>Tocar para editar →</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detalle / editor del equipo abierto — la dotación que se toca acá
              vale SOLO para esta fecha (no altera Gestión de equipos). */}
          {eqAbierto&&(()=>{
            const eq=equiposAMostrar.find(e=>e.id===eqAbierto);
            if(!eq) return null;
            const miembros=eq.miembros||[];
            const editable=puedeEditarEquipo(eq);
            const roles=eq.roles&&eq.roles.length?eq.roles:['General'];
            const disponibles=personas.filter(p=>!miembros.some(m=>String(m.id)===String(p.id)));
            const setMiembros=nuevos=>guardarMiembros(eq.id,nuevos);
            return(
              <div style={{margin:'0 var(--sp-md) 14px',borderRadius:14,background:'var(--s2)',
                padding:14,outline:`1px solid ${eq.color}40`}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:eq.color,
                    boxShadow:`0 0 8px ${eq.color}80`}}/>
                  <span style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-xl)',
                    color:'var(--tx)',flex:1}}>{eq.name}</span>
                  <button onClick={()=>{setEqAbierto(null);setAgregarEnEq(null);}}
                    style={{background:'none',color:'var(--tx3)',cursor:'pointer',
                      fontSize:'var(--fs-xl)',lineHeight:1}}>×</button>
                </div>

                {editable&&(
                  <div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",
                    lineHeight:1.5,marginBottom:10}}>
                    Los cambios valen solo para esta fecha. El equipo original no se toca.
                  </div>
                )}

                {miembros.length===0&&(
                  <div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontStyle:'italic',
                    padding:'6px 0 10px'}}>Nadie asignado a este equipo para esta fecha.</div>
                )}

                {miembros.map(m=>(
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0'}}>
                    {m.foto
                      ?<img src={m.foto} alt={m.name} style={{width:28,height:28,borderRadius:'50%',
                        objectFit:'cover',flexShrink:0}}/>
                      :<div style={{width:28,height:28,borderRadius:'50%',background:'var(--s3)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:'var(--fs-2xs)',fontWeight:900,color:'var(--tx2)',
                        flexShrink:0}}>{initials(m.name)}</div>}
                    <span style={{flex:1,minWidth:0,fontSize:'var(--fs-md)',fontWeight:300,color:'var(--tx)',
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</span>
                    {editable?(
                      <CustomSelect value={m.role} onChange={v=>setMiembros(miembros.map(x=>x.id===m.id?{...x,role:v}:x))}
                        style={{fontSize:'var(--fs-xs)',color:eq.color,background:eq.color+'12',
                          padding:'3px 10px',borderRadius:100,fontWeight:400,width:'auto'}}
                        options={roles.map(r=>({value:r,label:r}))}/>
                    ):(
                      <span style={{fontSize:'var(--fs-xs)',color:eq.color,fontWeight:300,flexShrink:0}}>{m.role}</span>
                    )}
                    {editable&&(
                      <button onClick={()=>setMiembros(miembros.filter(x=>x.id!==m.id))}
                        title="Quitar de esta fecha"
                        style={{width:22,height:22,borderRadius:6,background:'rgba(var(--rd-rgb),.08)',
                          color:'var(--rd)',cursor:'pointer',display:'flex',alignItems:'center',
                          justifyContent:'center',flexShrink:0}}>
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}

                {editable&&(
                  <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:8}}>
                    {agregarEnEq===eq.id?(
                      <CustomSelect value="" placeholder="Elige a quién sumar…"
                        onChange={v=>{
                          const p=personas.find(x=>String(x.id)===String(v));
                          if(!p)return;
                          setMiembros([...miembros,{id:p.id,name:p.name,email:p.email||'',
                            role:roles[0],foto:p.foto||null}]);
                          setAgregarEnEq(null);
                          onToast&&onToast({text:'Sumado a esta fecha',sub:`${p.name} · ${eq.name}`});
                        }}
                        options={disponibles.map(p=>({value:p.id,label:p.name}))}/>
                    ):(
                      <button onClick={()=>setAgregarEnEq(eq.id)}
                        disabled={disponibles.length===0}
                        style={{alignSelf:'flex-start',display:'flex',alignItems:'center',gap:6,
                          padding:'6px 12px',borderRadius:100,background:'rgba(var(--gn-rgb),.1)',
                          color:disponibles.length?'var(--gn)':'var(--tx3)',
                          cursor:disponibles.length?'pointer':'not-allowed',
                          fontSize:'var(--fs-xs)',fontWeight:700,fontFamily:"var(--font-body)"}}>
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        {disponibles.length?'Agregar a esta fecha':'No queda gente por sumar'}
                      </button>
                    )}
                    {eq.editadoParaEvento&&(
                      <button onClick={()=>{restaurarEquipo(eq.id);setAgregarEnEq(null);}}
                        style={{alignSelf:'flex-start',padding:'6px 12px',borderRadius:100,
                          background:'var(--s3)',color:'var(--tx2)',cursor:'pointer',
                          fontSize:'var(--fs-xs)',fontWeight:700,fontFamily:"var(--font-body)"}}>
                        Restaurar equipo original
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Notas del evento */}
      {f.notas&&(
        <div style={{background:'var(--s1)',borderRadius:'var(--rad-md)',marginBottom:'var(--gap)',overflow:'hidden'}}>
          <div style={{padding:'10px var(--sp-md)',borderBottom:'1px solid var(--bd)'}}>
            <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Notas del evento</span>
          </div>
          <div style={{padding:'20px var(--sp-md)',fontSize:'var(--fs-md)',color:'var(--tx2)',lineHeight:1.6,whiteSpace:'pre-wrap'}}>
            {f.notas}
          </div>
        </div>
      )}

      {/* Archivo adjunto */}
      {f.archivo&&(
        <div style={{background:'var(--s1)',borderRadius:'var(--rad-md)',marginBottom:'var(--gap)',overflow:'hidden'}}>
          <div style={{padding:'10px var(--sp-md)',borderBottom:'1px solid var(--bd)'}}>
            <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Archivo adjunto</span>
          </div>
          <div style={{padding:'19px var(--sp-md)',display:'flex',alignItems:'center',gap:8}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--gn)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span style={{fontSize:'var(--fs-md)',color:'var(--tx)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.archivo.name}</span>
          </div>
        </div>
      )}

      {userRole==='superadmin'&&<MiSetlistNotif onToast={onToast} fecha={f} sl={sl} lang={lang}/>}

      {/* Itinerario — v40: ahora viene del evento real (ItinerarioEditor en
          Crear evento), ya no es texto fijo inventado sin conexión */}
      {f.itinerario&&f.itinerario.length>0&&(
        <div style={{background:'var(--s1)',borderRadius:'var(--rad-md)',overflow:'hidden'}}>
          <div style={{padding:'10px var(--sp-md)',borderBottom:'1px solid var(--bd)'}}>
            <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.itineraryLbl}</span>
          </div>
          {f.itinerario.map((it,i)=>(
            <div key={i} style={{display:'flex',gap:'var(--sp-sm)',padding:'11px var(--sp-md)',borderBottom:i<f.itinerario.length-1?'1px solid var(--s1)':'none',alignItems:'flex-start'}}>
              <span style={{fontSize:'var(--fs-base)',fontWeight:900,color:'var(--ac)',minWidth:40,fontFamily:"'Outfit',sans-serif"}}>{it.hora}</span>
              <span style={{fontSize:'var(--fs-md)',color:'var(--tx)',fontWeight:200,lineHeight:1.4}}>{it.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Premiere ───────────────────────────────────────────────────────────────
const PREMIERES=[
  {id:1,name:'Toda La Tierra',album:'Toma Tu Lugar',sello:'Avanti Music',key:'G',bpm:128,dias:13,oficial:true,desc:'Un himno de adoración profética que invita a toda la creación a rendirse ante el Señor.'},
  {id:2,name:'Majestad',album:'Maverick City en Español',sello:'Maverick City Music',key:'D',bpm:72,dias:20,oficial:true,desc:'Nueva versión en español del clásico moderno sobre la majestad de Dios.'},
  {id:3,name:'Gloria Eterna',album:'',sello:'Red Music Latinoamérica',key:'A',bpm:118,dias:null,oficial:false,desc:'Próximamente. Red Music prepara este lanzamiento para sus iglesias asociadas.'},
];
export function PremiereView({onToast,lang='es'}){
  const tx = getT(lang);
  const [sel,setSel]=useState(null);
  const top=PREMIERES[0];
  if(sel){const p=PREMIERES.find(x=>x.id===sel);return(<div style={{padding:'0 0 90px'}}><div style={{padding:'var(--sp-md)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setSel(null)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg><span style={{fontSize:'var(--fs-lg)',fontWeight:700,color:'var(--tx2)'}}>{tx.premiereLbl}</span></div><div style={{margin:'0 var(--pw-x,16px)',padding:'var(--sp-lg)',borderRadius:'var(--rad-md)',background:'linear-gradient(135deg,rgba(200,169,126,.15),rgba(100,80,180,.1))',marginBottom:'var(--sp-md)'}}><div style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:'var(--sp-xs)'}}>{p.oficial?tx.officialChordsLbl:tx.comingSoonLbl}</div><div style={{fontFamily:"var(--font-display)",fontWeight:200,fontSize:'var(--fs-display)',color:'var(--tx)',marginBottom:4}}>{p.name}</div><div style={{fontSize:'var(--fs-lg)',color:'var(--tx2)',marginBottom:'var(--sp-sm)'}}>{p.album&&`${p.album} · `}{p.sello}</div><div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:'var(--sp-md)'}}><span style={{fontSize:'var(--fs-base)',fontWeight:700,color:'var(--ac)',background:'rgba(200,169,126,.1)',padding:'4px 10px',borderRadius:'var(--rad-full)'}}>{p.key}</span><span style={{fontSize:'var(--fs-base)',fontWeight:700,color:'var(--tx2)',background:'var(--s1)',padding:'4px 10px',borderRadius:'var(--rad-full)'}}>{p.bpm} BPM</span>{p.dias&&<span style={{fontSize:'var(--fs-base)',fontWeight:700,color:'var(--rd)',background:'rgba(255,82,82,.1)',padding:'4px 10px',borderRadius:'var(--rad-full)'}}>⚡ En {p.dias} días</span>}</div><div style={{fontSize:'var(--fs-lg)',color:'var(--tx2)',lineHeight:1.7}}>{p.desc}</div></div><div style={{padding:'0 var(--pw-x,16px)',display:'flex',flexDirection:'column',gap:'var(--sp-xs)'}}><button className="btn btn-p" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:tx.addToSetlistBtn,sub:p.name})}><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{tx.addToSetlistBtn}</button><button className="btn btn-g" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:tx.willNotifyToast,sub:tx.atPremiereOfLbl(p.name)})}><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>{tx.notifyMeBtn}</button></div></div>);}
  return(<div style={{padding:'0 0 90px'}}><div style={{margin:'var(--sp-md) var(--pw-x,16px)',borderRadius:'var(--rad-lg)',overflow:'hidden',cursor:'pointer'}} onClick={()=>setSel(top.id)}><div style={{background:'linear-gradient(135deg,rgba(10,8,20,.95),rgba(30,20,60,.92))',padding:'22px 20px 20px'}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:'var(--sp-xs)'}}><span style={{fontSize:'var(--fs-emph)'}}>★</span><span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1.5px'}}>{tx.nextPremiereLbl}</span></div><div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-2xl)',color:'var(--tx)',lineHeight:1.1,marginBottom:4}}>{top.name}</div><div style={{fontSize:'var(--fs-md)',color:'var(--tx2)',marginBottom:'var(--sp-md)'}}>{top.album} · {top.sello}</div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:'var(--fs-md)',fontWeight:700,color:'var(--rd)',background:'rgba(255,82,82,.12)',padding:'5px 12px',borderRadius:'var(--rad-full)'}}>⚡ En {top.dias} días</span><span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontWeight:700}}>🏛 247 iglesias →</span></div></div></div><div style={{padding:'0 var(--pw-x,16px)',display:'flex',flexDirection:'column',gap:'var(--sp-xs)'}}>{PREMIERES.map(p=>(<div key={p.id} onClick={()=>setSel(p.id)} style={{padding:'var(--sp-md)',borderRadius:'var(--rad-md)',background:'var(--s1)',cursor:'pointer',display:'flex',alignItems:'center',gap:'var(--sp-sm)'}}><div style={{flex:1}}><div style={{fontWeight:700,fontSize:'var(--fs-emph)',color:'var(--tx)',marginBottom:2}}>{p.name}</div><div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)'}}>{p.album||p.sello}</div><div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginTop:3}}>{p.key} · {p.bpm} BPM{p.oficial?' · ✓ Oficial':''}</div></div><div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>{p.dias?<span style={{fontSize:'var(--fs-base)',fontWeight:700,color:'var(--rd)'}}>{p.dias}d</span>:<span style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',fontWeight:700}}>{tx.shortComingSoonLbl}</span>}<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></div></div>))}</div><div style={{padding:'var(--sp-md)',marginTop:'var(--sp-xs)',borderTop:'1px solid var(--bd)'}}><div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',textAlign:'center',lineHeight:1.7}}>{tx.representLabelQuestion}<br/><span style={{color:'var(--ac)',fontWeight:700,cursor:'pointer'}} onClick={()=>onToast({text:tx.comingSoonLbl,sub:tx.labelContactLbl})}>{tx.publishHereLbl}</span></div></div></div>);
}
