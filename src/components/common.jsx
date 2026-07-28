// Componentes UI compartidos pequeños: Toast, MiniCal, DomStrip, ícono Diamante

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ── CustomSelect ─────────────────────────────────────────────────────────
// Reemplazo de <select> nativo con estilo 100% SetSync — ningún selector
// nativo del sistema operativo (que no se puede restylear en iOS/Android).
// API: value, onChange(value) [recibe el valor directo, no un evento],
// options=[{value,label}], placeholder opcional, style/className para el
// botón visible.
// El menú se renderiza con createPortal en document.body (misma técnica ya
// usada para el dropdown de notación en SongView) para no quedar recortado
// por contenedores con overflow — el mismo bug que ya se resolvió antes.
export function CustomSelect({value,onChange,options,placeholder='',style={},disabled=false}){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState(null);
  const btnRef=useRef(null);
  const menuRef=useRef(null);

  useEffect(()=>{
    if(!open)return;
    // Cierra el menú si la PÁGINA se mueve (así no queda flotando lejos
    // del botón), pero no si el scroll viene de la propia lista de
    // opciones — el listener usa capture:true y por eso también recibía
    // el scroll interno del menú (portal a document.body), cerrando el
    // selector apenas se intentaba desplazar la lista larga (ej. Día,
    // 31 opciones).
    const close=(e)=>{
      if(menuRef.current&&menuRef.current.contains(e.target))return;
      setOpen(false);
    };
    window.addEventListener('scroll',close,true);
    window.addEventListener('resize',close);
    return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);};
  },[open]);

  const current=options.find(o=>String(o.value)===String(value));

  const toggle=()=>{
    if(disabled)return;
    if(!open){
      const r=btnRef.current.getBoundingClientRect();
      const maxH=260;
      const spaceBelow=window.innerHeight-r.bottom;
      const openUp=spaceBelow<Math.min(maxH,options.length*36+8)&&r.top>spaceBelow;
      setPos({
        left:r.left,width:r.width,
        top:openUp?null:r.bottom+4,
        bottom:openUp?window.innerHeight-r.top+4:null,
        maxHeight:Math.min(maxH,openUp?r.top-12:window.innerHeight-r.bottom-12),
      });
    }
    setOpen(o=>!o);
  };

  return(
    <>
      <button ref={btnRef} type="button" onClick={toggle} disabled={disabled}
        style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6,
          borderRadius:8,background:'var(--s3)',color:'var(--tx)',
          fontSize:'var(--fs-md)',fontWeight:700,fontFamily:"var(--font-body)",
          padding:'6px 10px',cursor:disabled?'default':'pointer',opacity:disabled?.5:1,
          width:'100%',boxSizing:'border-box',...style}}>
        <span style={{overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',flex:1,textAlign:'left'}}>
          {current?current.label:(placeholder||'—')}
        </span>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" style={{flexShrink:0,transform:open?'rotate(180deg)':'none',transition:'transform .15s'}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open&&pos&&createPortal(
        <>
          <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:998}}/>
          <div ref={menuRef} style={{position:'fixed',left:pos.left,width:pos.width,
            top:pos.top??undefined,bottom:pos.bottom??undefined,
            maxHeight:pos.maxHeight,overflowY:'auto',zIndex:999,
            background:'#17171b',borderRadius:10,
            boxShadow:'0 12px 32px rgba(0,0,0,.5)',padding:4}}>
            {options.map(o=>(
              <div key={o.value} onClick={()=>{onChange(o.value);setOpen(false);}}
                style={{padding:'8px 10px',borderRadius:6,cursor:'pointer',fontSize:'var(--fs-md)',fontWeight:700,
                  fontFamily:"var(--font-body)",
                  background:String(o.value)===String(value)?'rgba(var(--gn-rgb),.15)':'transparent',
                  color:String(o.value)===String(value)?'var(--gn)':'var(--tx2)'}}>
                {o.label}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ── EquipoCard / EquipoDetallePanel ─────────────────────────────────────
// Extraídos de Backstage/Gestión de equipos para reusar EXACTAMENTE el
// mismo diseño en cualquier otro lugar donde haya que elegir/editar
// equipos (hoy: Crear evento → "Equipos convocados"). Un solo componente,
// una sola fuente de verdad visual — si se ajusta acá, se ajusta en
// todos lados a la vez.

// Tile de equipo para el grid 2 columnas. `convocado`/`onToggleConvocado`
// son opcionales — si vienen, se agrega un checkbox de convocatoria que
// no interfiere con el click de abrir/cerrar el panel de detalle.
export function EquipoCard({eq,active,onClick,tx,convocado,onToggleConvocado}){
  const hasConvocatoria=typeof convocado==='boolean';
  return(
    <div onClick={onClick}
      style={{borderRadius:14,background:'var(--s1)',overflow:'hidden',cursor:'pointer',
        outline:active?`2px solid ${eq.color}60`:'none',
        opacity:hasConvocatoria&&!convocado?.55:1,transition:'opacity .15s'}}>
      <div style={{padding:'12px 12px 10px',display:'flex',alignItems:'center',gap:8}}>
        {hasConvocatoria&&(
          <input type="checkbox" checked={convocado}
            onClick={e=>e.stopPropagation()}
            onChange={onToggleConvocado}
            style={{accentColor:eq.color,width:14,height:14,flexShrink:0}}/>
        )}
        <div style={{width:10,height:10,borderRadius:'50%',background:eq.color,flexShrink:0,boxShadow:`0 0 8px ${eq.color}80`}}/>
        <span style={{fontFamily:"var(--font-body)",fontWeight:900,fontSize:'var(--fs-md)',color:'var(--tx)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{eq.name}</span>
        <span style={{fontSize:'var(--fs-xs)',fontWeight:700,color:'var(--tx3)',flexShrink:0}}>{(eq.miembros||[]).length}</span>
      </div>
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
  );
}

// Panel de edición completa (miembros, roles, foto) — mismo bloque que
// ya existía en Gestión de equipos, ahora reusable.
export function EquipoDetallePanel({eq,personas,setEquipos,persistirEquipo,onToast,tx,onClose}){
  return(
    <div style={{borderRadius:14,background:'var(--s1)',padding:14,marginBottom:14}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:eq.color,boxShadow:`0 0 8px ${eq.color}80`}}/>
        <span style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-xl)',color:'var(--tx)',flex:1}}>{eq.name}</span>
        <button onClick={e=>{e.stopPropagation();onClose();}} style={{background:'none',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-xl)',lineHeight:1}}>×</button>
      </div>
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
      <div style={{marginTop:12,padding:'10px 0',borderTop:'1px solid var(--s3)'}}>
        <div style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',
          letterSpacing:'1.5px',marginBottom:6,fontFamily:"var(--font-body)"}}>
          Roles del equipo
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
          {(eq.roles||[tx.generalLbl]).map((r,ri)=>(
            <div key={ri} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 8px 4px 10px',
              borderRadius:100,background:eq.color+'18'}}>
              <span style={{fontSize:'var(--fs-sm)',fontWeight:700,color:eq.color,fontFamily:"var(--font-body)"}}>{r}</span>
              <button onClick={()=>{
                const upd={...eq,roles:(eq.roles||[]).filter((_,j)=>j!==ri)};
                setEquipos(prev=>prev.map(x=>x.id===eq.id?upd:x));persistirEquipo(upd);
              }} style={{width:14,height:14,borderRadius:'50%',background:'var(--bd)',color:'var(--tx3)',cursor:'pointer',
                fontSize:'var(--fs-sm)',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>×</button>
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
          <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",display:'flex',alignItems:'center'}}>↵ Enter</div>
        </div>
      </div>
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
}

export const Di = ({sz=10,c='currentColor'}) => (
  <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 9 12 22 2 9"/>
    <line x1="2" y1="9" x2="22" y2="9"/>
  </svg>
);

export function Toast({msg,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[msg]);
  if(!msg)return null;
  return(
    <div className="toast">
      <div className="t-ic"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div>
        <div style={{fontSize:'var(--fs-md)',fontWeight:700,color:'var(--tx)'}}>{msg.text}</div>
        {msg.sub&&<div style={{fontSize:'var(--fs-subtitle)',color:'var(--tx2)',marginTop:1}}>{msg.sub}</div>}
      </div>
    </div>
  );
}

export function MiniCal({eventDays=[]}){
  const [exp,setExp]=useState(false);
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  const mn=now.toLocaleString('es',{month:'long'});
  const firstDay=new Date(y,m,1).getDay();
  const dim=new Date(y,m+1,0).getDate();
  const today=now.getDate();
  const DOWS=['D','L','M','M','J','V','S'];
  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=dim;d++)cells.push(d);

  return(
    <div className={`mcal${exp?' exp':''}`} onClick={()=>setExp(e=>!e)}>
      {!exp&&(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'3px 0'}}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <div style={{fontSize:'var(--fs-2xs)',fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.5px'}}>{mn.slice(0,3)}</div>
        </div>
      )}
      {exp&&(
        <>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
            <span style={{fontFamily:"var(--font-body)",fontWeight:900,fontSize:'var(--fs-base)',color:'var(--tx)',textTransform:'capitalize'}}>{mn}</span>
            <span style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',fontWeight:700}}>{y}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'1px'}}>
            {DOWS.map(d=>(
              <div key={d} style={{fontSize:'var(--fs-3xs)',fontWeight:900,color:'var(--tx3)',textAlign:'center',textTransform:'uppercase',padding:'2px 0'}}>{d}</div>
            ))}
            {cells.map((d,i)=>{
              if(!d)return(<div key={`e${i}`}/>);
              const isSun=new Date(y,m,d).getDay()===0;
              const isToday=d===today;
              const hasEv=eventDays.includes(d);
              return(
                <div key={d} style={{
                  fontSize:'var(--fs-xs)',textAlign:'center',padding:'3px 1px',borderRadius:3,lineHeight:1.2,position:'relative',
                  color:isToday?'var(--ac)':isSun?'var(--ac)':'var(--tx2)',
                  fontWeight:isToday||hasEv?700:400,
                  background:isToday?'rgba(200,169,126,.2)':'transparent',
                  opacity:isSun&&!hasEv?.6:1,
                }}>
                  {d}
                  {hasEv&&<span style={{position:'absolute',bottom:1,left:'50%',transform:'translateX(-50%)',width:3,height:3,borderRadius:'50%',background:'var(--ac)',display:'block'}}/>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// DOM STRIP

export function DomStrip({activeSunday,onSelect,onToast}){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  const est=['pub','pub','sin','pub'];
  const lib=[false,false,false,true];
  let c=0;
  const sundays=[];
  for(let d=1;d<=31;d++){
    const dt=new Date(y,m,d);
    if(dt.getMonth()!==m)break;
    if(dt.getDay()===0){sundays.push({day:d,mes:dt.toLocaleString('es',{month:'short'}),estado:est[c]||'pub',libre:lib[c]||false});c++;}
  }
  const eventDays=sundays.filter(s=>s.estado!=='sin').map(s=>s.day);

  return(
    <div className="sc-row">
      <div className="dom-strip">
        {sundays.map((d,i)=>{
          const isOn=activeSunday===d.day;
          let cls='dc';
          if(isOn)cls+=' on';
          if(d.estado==='pub'&&!isOn)cls+=' pub';
          if(d.estado==='sin')cls+=' sin';
          if(d.libre)cls+=' lib';
          return(
            <div key={i} className={cls} onClick={()=>{onSelect(d.day);onToast(d.estado==='sin'?{text:'Sin reunión',sub:`Dom ${d.day}`}:d.libre?{text:'No citado',sub:`Dom ${d.day}`}:{text:`Dom ${d.day}`,sub:d.mes});}}>
              <span className="dc-d">{d.day}</span>
              <span className="dc-m">{d.mes}</span>
              <span className="dc-dot"/>
              {d.estado==='sin'&&<span className="dc-badge sin">Sin reunión</span>}
              {d.libre&&d.estado!=='sin'&&<span className="dc-badge lib">No citado</span>}
            </div>
          );
        })}
      </div>
      <MiniCal eventDays={eventDays}/>
    </div>
  );
}
