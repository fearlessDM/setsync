// Componentes UI compartidos pequeños: Toast, MiniCal, DomStrip, ícono Diamante

import { useState, useEffect } from 'react';

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
        <div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{msg.text}</div>
        {msg.sub&&<div style={{fontSize:10,color:'var(--tx3)',marginTop:1}}>{msg.sub}</div>}
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
          <div style={{fontSize:8,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.5px'}}>{mn.slice(0,3)}</div>
        </div>
      )}
      {exp&&(
        <>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
            <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:11,color:'var(--tx)',textTransform:'capitalize'}}>{mn}</span>
            <span style={{fontSize:9,color:'var(--tx3)',fontWeight:700}}>{y}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'1px'}}>
            {DOWS.map(d=>(
              <div key={d} style={{fontSize:7,fontWeight:900,color:'var(--tx3)',textAlign:'center',textTransform:'uppercase',padding:'2px 0'}}>{d}</div>
            ))}
            {cells.map((d,i)=>{
              if(!d)return(<div key={`e${i}`}/>);
              const isSun=new Date(y,m,d).getDay()===0;
              const isToday=d===today;
              const hasEv=eventDays.includes(d);
              return(
                <div key={d} style={{
                  fontSize:9,textAlign:'center',padding:'3px 1px',borderRadius:3,lineHeight:1.2,position:'relative',
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
