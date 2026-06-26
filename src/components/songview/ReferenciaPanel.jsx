import { createPortal } from 'react-dom';

export function ReferenciaPanel({
  bottomTab,
  refAudio, setRefAudio,
  refUrl, setRefUrl,
  refPlaying, setRefPlaying,
  refTime, setRefTime,
  refDuration, setRefDuration,
  refLoopIn, setRefLoopIn,
  refLoopOut, setRefLoopOut,
  refLooping, setRefLooping,
  refSpeed, setRefSpeed,
  refPlayerRef,
}) {
  const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  const panel = (
      <div style={{
        position:'fixed',bottom:54,left:0,right:0,
        background:'rgba(8,8,9,.98)',borderTop:'1px solid rgba(255,255,255,.08)',
        backdropFilter:'blur(40px)',zIndex:50,
        transform:bottomTab==='referencia'?'translateY(0)':'translateY(100%)',
        transition:'transform .3s cubic-bezier(.4,0,.2,1)',
        display:'flex',flexDirection:'column',
        maxHeight:'55vh',
      }}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px 8px',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--ac)" strokeWidth="1.8">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <span style={{flex:1,fontSize:10,fontWeight:900,color:'var(--tx)',textTransform:'uppercase',letterSpacing:'1px',fontFamily:"'Lexend Giga',sans-serif"}}>
            Referencia
          </span>
          {refAudio&&<span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",maxWidth:160,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{refAudio.name}</span>}
          {/* Subir audio */}
          <button onClick={()=>refInputRef.current?.click()}
            style={{padding:'4px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.07)',color:'var(--tx2)',cursor:'pointer',fontSize:9,fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
            {refAudio?'Cambiar':'Subir audio'}
          </button>
          <input ref={refInputRef} type="file" accept="audio/*" style={{display:'none'}}
            onChange={e=>{if(e.target.files[0])loadFile(e.target.files[0]);}}/>
        </div>

        {!refUrl?(
          /* Estado vacío */
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:20}}>
            <div style={{width:56,height:56,borderRadius:'50%',border:'2px dashed rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
              onClick={()=>refInputRef.current?.click()}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--tx3)" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",marginBottom:4}}>Sube un audio de referencia</div>
              <div style={{fontSize:10,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.5}}>MP3, AAC, WAV · Toca para seleccionar</div>
            </div>
          </div>
        ):(
          <div style={{flex:1,display:'flex',flexDirection:'column',padding:'10px 14px 14px',gap:10,overflow:'hidden'}}>
            {/* Audio element oculto */}
            <audio ref={refPlayerRef} src={refUrl} preload="metadata"
              onTimeUpdate={e=>{
                const t=e.target.currentTime;
                setRefTime(t);
                // Loop check
                if(refLooping&&refLoopOut!=null&&t>=refLoopOut){
                  e.target.currentTime=refLoopIn??0;
                }
              }}
              onLoadedMetadata={e=>setRefDuration(e.target.duration)}
              onEnded={()=>setRefPlaying(false)}
              style={{display:'none'}}/>

            {/* Waveform / Progress bar principal */}
            <div style={{position:'relative',height:48,borderRadius:10,background:'rgba(255,255,255,.05)',overflow:'hidden',cursor:'pointer',flexShrink:0}}
              onClick={e=>seekTo(e,e.currentTarget)}
              onPointerDown={e=>{
                e.preventDefault();
                const el=e.currentTarget;
                el.setPointerCapture(e.pointerId);
                seekTo(e,el);
                const move=ev=>{ev.preventDefault();seekTo(ev,el);};
                const up=ev=>{el.releasePointerCapture(ev.pointerId);el.removeEventListener('pointermove',move);};
                el.addEventListener('pointermove',move,{passive:false});
                el.addEventListener('pointerup',up,{once:true});
              }}>
              {/* Fondo de barras simuladas (decorativo estilo waveform) */}
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',gap:1,padding:'4px 0'}}>
                {Array.from({length:80},(_,i)=>{
                  const h=Math.sin(i*0.4)*0.3+Math.sin(i*0.13)*0.4+0.3;
                  const filled=(i/80)<pct;
                  const inLoop=inPct!=null&&outPct!=null&&(i/80*100)>=inPct&&(i/80*100)<=outPct;
                  return(
                    <div key={i} style={{
                      flex:1,borderRadius:1,
                      height:`${Math.max(15,h*100)}%`,
                      background: filled
                        ? inLoop&&refLooping?'var(--gn)':'rgba(200,169,126,.9)'
                        : inLoop?'rgba(48,192,183,.3)':'rgba(255,255,255,.12)',
                      transition:'background .1s',
                    }}/>
                  );
                })}
              </div>
              {/* Marcador In */}
              {inPct!=null&&(
                <div style={{position:'absolute',top:0,bottom:0,left:`${inPct}%`,width:2,background:'var(--gn)',zIndex:3}}>
                  <div style={{position:'absolute',top:0,left:2,fontSize:7,color:'var(--gn)',fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",background:'rgba(8,8,9,.8)',padding:'1px 3px',borderRadius:3,whiteSpace:'nowrap'}}>IN</div>
                </div>
              )}
              {/* Marcador Out */}
              {outPct!=null&&(
                <div style={{position:'absolute',top:0,bottom:0,left:`${outPct}%`,width:2,background:'var(--rd)',zIndex:3}}>
                  <div style={{position:'absolute',top:0,left:2,fontSize:7,color:'var(--rd)',fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",background:'rgba(8,8,9,.8)',padding:'1px 3px',borderRadius:3,whiteSpace:'nowrap'}}>OUT</div>
                </div>
              )}
              {/* Playhead */}
              <div style={{position:'absolute',top:0,bottom:0,left:`${pct*100}%`,width:2,background:'var(--ac)',zIndex:4,transition:'left .05s'}}/>
            </div>

            {/* Tiempos */}
            <div style={{display:'flex',justifyContent:'space-between',flexShrink:0}}>
              <span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>{fmt(refTime)}</span>
              {refLoopIn!=null&&refLoopOut!=null&&(
                <span style={{fontSize:9,color:'var(--gn)',fontWeight:700,fontFamily:"'Lexend Giga',sans-serif"}}>
                  Loop {fmt(refLoopIn)} → {fmt(refLoopOut)}
                </span>
              )}
              <span style={{fontSize:9,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>{fmt(refDuration)}</span>
            </div>

            {/* Controles principales */}
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              {/* Retroceder 5s */}
              <button onClick={()=>{if(audio){audio.currentTime=Math.max(0,audio.currentTime-5);}}}
                style={{width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.05)',color:'var(--tx2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L4 9v6h6l-2.18-2.18A6.93 6.93 0 0 1 12.5 11c3.02 0 5.6 2 6.54 4.77l1.92-.64A9 9 0 0 0 12.5 8z"/></svg>
              </button>

              {/* Play / Pause */}
              <button onClick={()=>{
                if(!audio)return;
                if(refPlaying){audio.pause();setRefPlaying(false);}
                else{
                  if(refLooping&&refLoopIn!=null&&(audio.currentTime<(refLoopIn??0)||audio.currentTime>=(refLoopOut??refDuration))){
                    audio.currentTime=refLoopIn??0;
                  }
                  audio.play();setRefPlaying(true);
                }
              }} style={{width:48,height:48,borderRadius:'50%',border:'none',background:'var(--ac)',color:'#000',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 20px rgba(255,255,255,.2)'}}>
                {refPlaying
                  ?<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  :<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                }
              </button>

              {/* Adelantar 5s */}
              <button onClick={()=>{if(audio){audio.currentTime=Math.min(refDuration,audio.currentTime+5);}}}
                style={{width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.05)',color:'var(--tx2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 9c-1.85-1.6-4.25-2.6-6.9-2.6A9 9 0 0 0 2.54 15.13l1.92.64A7 7 0 0 1 11.1 11c1.89 0 3.63.76 4.9 2L14 15h6V9l-2 2z"/></svg>
              </button>

              <div style={{flex:1}}/>

              {/* Velocidad */}
              <div style={{display:'flex',gap:3}}>
                {SPEEDS.map(s=>(
                  <button key={s} onClick={()=>{setRefSpeed(s);if(audio)audio.playbackRate=s;}}
                    style={{padding:'4px 6px',borderRadius:6,border:'none',cursor:'pointer',fontSize:9,fontWeight:700,
                      fontFamily:"'Lexend Giga',sans-serif",
                      background:refSpeed===s?'rgba(200,169,126,.25)':'rgba(255,255,255,.06)',
                      color:refSpeed===s?'var(--ac)':'var(--tx3)'}}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Loop controls */}
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <button onClick={markIn}
                style={{flex:1,padding:'6px 8px',borderRadius:8,border:`1px solid ${refLoopIn!=null?'rgba(48,192,183,.4)':'rgba(255,255,255,.1)'}`,
                  background:refLoopIn!=null?'rgba(48,192,183,.1)':'rgba(255,255,255,.05)',
                  color:refLoopIn!=null?'var(--gn)':'var(--tx3)',cursor:'pointer',fontSize:9,fontWeight:900,
                  fontFamily:"'Lexend Giga',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                <span style={{fontSize:8,letterSpacing:'.5px'}}>▶ IN</span>
                {refLoopIn!=null&&<span style={{opacity:.7}}>{fmt(refLoopIn)}</span>}
              </button>
              <button onClick={markOut}
                style={{flex:1,padding:'6px 8px',borderRadius:8,border:`1px solid ${refLoopOut!=null?'rgba(253,128,131,.4)':'rgba(255,255,255,.1)'}`,
                  background:refLoopOut!=null?'rgba(253,128,131,.1)':'rgba(255,255,255,.05)',
                  color:refLoopOut!=null?'var(--rd)':'var(--tx3)',cursor:'pointer',fontSize:9,fontWeight:900,
                  fontFamily:"'Lexend Giga',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                <span style={{fontSize:8,letterSpacing:'.5px'}}>OUT ■</span>
                {refLoopOut!=null&&<span style={{opacity:.7}}>{fmt(refLoopOut)}</span>}
              </button>
              <button onClick={()=>{
                if(refLoopIn==null||refLoopOut==null)return;
                const next=!refLooping;
                setRefLooping(next);
                if(next){
                  const a=refPlayerRef.current;
                  if(a){a.currentTime=refLoopIn??0;a.play().then(()=>setRefPlaying(true)).catch(()=>{});}
                }
              }} disabled={refLoopIn==null||refLoopOut==null}
                style={{width:60,padding:'6px 8px',borderRadius:8,
                  border:`1px solid ${refLooping?'var(--gn)':'rgba(255,255,255,.1)'}`,
                  background:refLooping?'rgba(48,192,183,.2)':'rgba(255,255,255,.05)',
                  color:refLooping?'var(--gn)':'var(--tx3)',
                  cursor:refLoopIn==null||refLoopOut==null?'not-allowed':'pointer',
                  fontSize:9,fontWeight:900,fontFamily:"'Lexend Giga',sans-serif",
                  opacity:refLoopIn==null||refLoopOut==null?.4:1,
                  boxShadow:refLooping?'0 0 8px rgba(48,192,183,.4)':'none',
                  transition:'all .2s'}}>
                {refLooping?'↻ ON':'↻'}
              </button>
              {(refLoopIn!=null||refLoopOut!=null)&&(
                <button onClick={clearLoop}
                  style={{width:30,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.05)',
                    color:'var(--tx3)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  ×
                </button>
              )}
            </div>
          </div>
        )}
      </div>
  );
  return createPortal(panel, document.body);
}
