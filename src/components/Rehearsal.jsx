// Rehearsal: vista de "Tiempo en Vivo" para ensayo/presentación con
// transposición, acordes, dibujo/anotaciones y selección por integrante.
import { useState, useEffect, useRef } from 'react';
import { renderSongContent } from './SongView';
import { tpKey } from '../utils/music';
import { Toast } from './common';

export function Rehearsal({songs,onClose,onToast}){
  const [idx,setIdx]=useState(0);
  const [selMember,setSelMember]=useState('todos');
  const [showChords,setShowChords]=useState(true);
  const [tpOff,setTpOff]=useState(0);
  const [showAnnoBar,setShowAnnoBar]=useState(false);
  const [tool,setTool]=useState('draw');
  const [color,setColor]=useState('#ff3b30');
  const [toast,setToast]=useState(null);
  const [capoR,setCapoR]=useState(0);
  const [showCapoR,setShowCapoR]=useState(false);
  const cvRef=useRef(null);
  const wrapRef=useRef(null);
  const strokes=useRef({});
  const drawing=useRef(false);
  const cur=useRef(null);

  const song=songs[idx];
  const curKey=tpKey(song.key,tpOff);
  // Solo miembros de la Banda
  const banda=EQUIPOS_DATA.find(e=>e.name==='Banda');
  const miembros=banda?banda.miembros:[];

  useEffect(()=>{setTpOff(0);},[idx]);
  useEffect(()=>{
    const cv=cvRef.current,w=wrapRef.current;
    if(!cv||!w)return;
    const resize=()=>{cv.width=w.clientWidth;cv.height=w.clientHeight;redrawAll();};
    resize();
    const ro=new ResizeObserver(resize);
    ro.observe(w);
    return()=>ro.disconnect();
  },[idx,selMember]);

  const key=`${idx}-${selMember}`;
  const getStrokes=()=>strokes.current[key]||(strokes.current[key]=[]);
  const getP=e=>{const r=cvRef.current.getBoundingClientRect();const s=e.touches?e.touches[0]:e;return{x:s.clientX-r.left,y:s.clientY-r.top};};
  const applyS=s=>{const ctx=cvRef.current.getContext('2d');if((s?.type||tool)==='erase'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=20;}else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=s?.color||color;ctx.lineWidth=s?.sz||4;}ctx.lineCap='round';ctx.lineJoin='round';};
  const redrawAll=()=>{const cv=cvRef.current;if(!cv)return;const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);getStrokes().forEach(s=>{if(s.pts.length<2)return;ctx.beginPath();applyS(s);ctx.moveTo(s.pts[0].x,s.pts[0].y);s.pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();});ctx.globalCompositeOperation='source-over';};
  const startD=e=>{if(!showAnnoBar||tool==='text')return;drawing.current=true;const p=getP(e);cur.current={type:tool,color,sz:4,pts:[p]};const ctx=cvRef.current.getContext('2d');ctx.beginPath();ctx.moveTo(p.x,p.y);applyS();};
  const moveD=e=>{if(!drawing.current||!cur.current)return;const p=getP(e);cur.current.pts.push(p);const ctx=cvRef.current.getContext('2d');ctx.lineTo(p.x,p.y);ctx.stroke();};
  const endD=()=>{if(!drawing.current)return;drawing.current=false;if(cur.current?.pts.length>1)getStrokes().push(cur.current);cur.current=null;const ctx=cvRef.current.getContext('2d');ctx.globalCompositeOperation='source-over';};
  const doTp=s=>{setTpOff(t=>t+s);};
  const COLS=['#ff3b30','#0a84ff','#30d158','#ffd60a','#bf5af2'];

  const nav=d=>{const n=idx+d;if(n<0||n>=songs.length)return;setIdx(n);setTpOff(0);};

  return(
    <div style={{position:'fixed',inset:0,zIndex:100,background:'var(--bg)',display:'flex',flexDirection:'column'}}>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      <div className="sv-hdr">
        <div className="sv-back" onClick={onClose}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"var(--font-body)",fontWeight:900,fontSize:'var(--fs-xl)',color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
          <div style={{fontSize:'var(--fs-sm)',color:'var(--ac)',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>{curKey} · {song.bpm} BPM{tpOff!==0?` · ${tpOff>0?'+':''}${tpOff}st`:''}</div>
        </div>
        <div style={{display:'flex',gap:3,alignItems:'center',flexShrink:0}}>
          {songs.map((_,i)=>(<div key={i} style={{height:4,borderRadius:2,background:i<idx?'var(--gn)':i===idx?'var(--ac)':'var(--bd)',width:i===idx?18:8,transition:'all .3s'}}/>))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:100,background:'rgba(255,82,82,.1)',flexShrink:0}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'var(--rd)',animation:'rp 1.2s infinite'}}/>
          <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--rd)',textTransform:'uppercase',letterSpacing:'.5px'}}>En Vivo</span>
        </div>
        <button onClick={onClose} style={{width:28,height:28,borderRadius:8,background:'var(--s1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'var(--fs-xl)',flexShrink:0}}>×</button>
      </div>
      <div style={{display:'flex',gap:5,padding:'6px 10px',overflowX:'auto',scrollbarWidth:'none',borderBottom:'1px solid var(--bd)',flexShrink:0}}>
        <button onClick={()=>setSelMember('todos')} style={{flexShrink:0,padding:'4px 11px',borderRadius:100,background:selMember==='todos'?'rgba(200,169,126,.1)':'transparent',color:selMember==='todos'?'var(--ac)':'var(--tx3)',fontSize:'var(--fs-sm)',fontWeight:700,cursor:'pointer',fontFamily:"var(--font-body)"}}>Todos</button>
        {miembros.map(m=>(
          <button key={m.id} onClick={()=>setSelMember(m.id)} style={{flexShrink:0,padding:'4px 11px',borderRadius:100,background:selMember===m.id?'rgba(200,169,126,.1)':'transparent',color:selMember===m.id?'var(--ac)':'var(--tx3)',fontSize:'var(--fs-sm)',fontWeight:700,cursor:'pointer',fontFamily:"var(--font-body)"}}>
            {m.name.split(' ')[0]}
          </button>
        ))}
        {selMember!=='todos'&&<span style={{fontSize:'var(--fs-sm)',color:'rgba(200,169,126,.6)',fontWeight:700,display:'flex',alignItems:'center',marginLeft:4}}>👁 {miembros.find(m=>m.id===selMember)?.name}</span>}
      </div>
      <div style={{borderBottom:'1px solid var(--bd)',background:'rgba(5,5,14,.92)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px'}}>
          <button onClick={()=>setShowAnnoBar(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:7,background:showAnnoBar?'rgba(200,169,126,.1)':'var(--s1)',color:showAnnoBar?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)",flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Anotar
            <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:showAnnoBar?'rotate(180deg)':'none',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div style={{flex:1}}/>
          <button onClick={()=>setShowChords(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,background:!showChords?'rgba(200,169,126,.1)':'var(--s1)',color:!showChords?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)"}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            {showChords?'Solo letra':'Con acordes'}
          </button>
          <button onClick={()=>onToast({text:'Anotaciones guardadas',sub:selMember==='todos'?'Todos':miembros.find(m=>m.id===selMember)?.name})} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,background:'rgba(94,206,160,.07)',color:'var(--gn)',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)"}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Guardar
          </button>
        </div>
        {showAnnoBar&&(
          <div style={{display:'flex',alignItems:'center',gap:3,padding:'0 10px 5px',overflowX:'auto',scrollbarWidth:'none'}}>
            {[['draw','Lápiz'],['erase','Borrar']].map(([t,l])=>(
              <button key={t} onClick={()=>setTool(t)} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:6,background:tool===t?'var(--s3)':'transparent',color:tool===t?'var(--tx)':'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)",flexShrink:0}}>{l}</button>
            ))}
            <div style={{width:1,height:16,background:'var(--bd)',margin:'0 3px'}}/>
            {COLS.map(c=>(<button key={c} onClick={()=>setColor(c)} style={{width:18,height:18,borderRadius:'50%',background:c,cursor:'pointer',flexShrink:0}}/>))}
          </div>
        )}
      </div>
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={cvRef} style={{position:'absolute',inset:0,zIndex:2,touchAction:'none',pointerEvents:showAnnoBar&&tool!=='text'?'all':'none',cursor:tool==='erase'?'cell':'crosshair'}}
          onMouseDown={startD} onMouseMove={moveD} onMouseUp={endD} onMouseLeave={endD}
          onTouchStart={e=>{e.preventDefault();startD(e);}} onTouchMove={e=>{e.preventDefault();moveD(e);}} onTouchEnd={e=>{e.preventDefault();endD();}}
        />
        <div ref={wrapRef} className="sv-content" style={{position:'absolute',inset:0,overflowY:'auto',scrollbarWidth:'none',background:svBg,padding:'10px 60px 10px 10px',display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
          <div style={{width:'100%'}}>
            {renderSongContent(getSongContent(song),tpOff,showChords,editMode,selectedChord,(c)=>setSelectedChord(c),(li,ci,dir)=>handleMoveChord(li,ci,dir))}
          </div>
        </div>
        <div style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',zIndex:3,display:'flex',flexDirection:'column',alignItems:'center',gap:0,borderRadius:14,background:'rgba(8,8,20,.88)',backdropFilter:'blur(12px)',overflow:'hidden',width:50}}>
          <button onClick={()=>doTp(1)} style={{width:'100%',padding:'8px 0',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)'}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            <span style={{fontSize:'var(--fs-xs)',fontWeight:900,color:'var(--tx3)',letterSpacing:'.5px'}}>#</span>
          </button>
          <div style={{width:'100%',padding:'8px 0',textAlign:'center',borderBottom:'1px solid var(--bd)'}}>
            <div style={{fontFamily:"var(--font-body)",fontWeight:900,fontSize:'var(--fs-2xl)',color:'var(--ac)',lineHeight:1}}>{curKey}</div>
            {tpOff!==0&&<div style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontWeight:700,marginTop:2}}>{tpOff>0?'+':''}{tpOff}</div>}
          </div>
          <button onClick={()=>doTp(-1)} style={{width:'100%',padding:'8px 0',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)'}}>
            <span style={{fontSize:'var(--fs-sm)',fontWeight:900,color:'var(--tx3)',fontStyle:'italic'}}>b</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div style={{borderTop:'1px solid var(--bd)',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:4}}>
            <span style={{fontSize:'var(--fs-3xs)',fontWeight:900,textTransform:'uppercase',letterSpacing:'1px',color:'var(--tx3)',marginBottom:3}}>CAPO</span>
            {[0,1,2,3,4,5,6].map(c=>(
              <button key={c} onClick={()=>setCapoR(c)} style={{width:38,height:22,background:capoR===c?'rgba(200,169,126,.2)':'transparent',color:capoR===c?'var(--ac)':'var(--tx3)',fontSize:'var(--fs-sm)',fontWeight:capoR===c?900:400,cursor:'pointer',fontFamily:"var(--font-body)",borderRadius:5,transition:'all .1s'}}>
                {c===0?'—':c}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="sv-nav">
        <button className="nb" disabled={idx===0} onClick={()=>nav(-1)}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Anterior
        </button>
        <div className="sv-ni">
          <div style={{fontFamily:"var(--font-body)",fontWeight:900,fontSize:'var(--fs-lg)',color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
          <div style={{fontSize:'var(--fs-xs)',color:'var(--tx3)',marginTop:1,fontWeight:700}}>Canción {idx+1} de {songs.length}</div>
        </div>
        <button className="nb p" onClick={()=>{if(idx===songs.length-1){onClose();onToast({text:'Finalizado',sub:songs.length+' canciones'});}else nav(1);}}>
          {idx===songs.length-1?'Finalizar':'Siguiente'}<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
}

