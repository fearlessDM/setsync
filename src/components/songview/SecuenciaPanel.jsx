import { createPortal } from 'react-dom';

const CIFRAS = ['4/4','3/4','6/8','2/4','5/4','12/8'];

const WAVE_DATA=Array.from({length:80},(_,i)=>
  Math.abs(Math.sin(i*.31)*.45+Math.sin(i*.13)*.3+Math.sin(i*.07)*.15+.1)
);

export function SecuenciaPanel({
  bottomTab, song, wrapRef,
  seqData,
  seqBpm, setSeqBpm,
  seqCifra, setSeqCifra,
  clickActivo, setClickActivo,
  startClick, stopClick,
  seqLayer, setSeqLayer,
  seqPos, setSeqPos,
  seqHighlight, setSeqHighlight,
  trackVols, setTrackVols,
  trackMutes, setTrackMutes,
}) {
    // Calcular total de compases para proporciones del mapa
    const guias=seqData?.guias;
    const totalComp=guias?guias.reduce((s,g)=>s+(g.compases||4),0):0;

    // Seek táctil en waveform
    const seekOnEl=(e,el)=>{
      const r=el.getBoundingClientRect();
      const p=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
      setSeqPos(p);
      // Highlight del bloque correspondiente
      if(guias&&totalComp){
        let acc=0,found=false;
        for(const g of guias){
          const from=acc/totalComp;
          acc+=g.compases||4;
          const to=acc/totalComp;
          if(p>=from&&p<=to){setSeqHighlight({from,to});found=true;break;}
        }
        if(!found)setSeqHighlight(null);
      }
    };

    // Navegar al bloque por idx (desde mapa)
    const gotoBloque=(i)=>{
      if(!guias||!totalComp)return;
      let acc=0;
      for(let j=0;j<i;j++) acc+=(guias[j].compases||4);
      const from=acc/totalComp;
      acc+=(guias[i].compases||4);
      const to=acc/totalComp;
      setSeqPos(from+.001);
      setSeqHighlight({from,to});
      // Scroll en letra
      const el=document.getElementById('section-'+i);
      const cont=wrapRef.current;
      if(el&&cont){const eT=el.getBoundingClientRect().top;const cT=cont.getBoundingClientRect().top;cont.scrollBy({top:eT-cT-12,behavior:'smooth'});}
      window.dispatchEvent(new CustomEvent('setsync-mapa-seek',{
        detail:{sectionIdx:i,compasInicio:acc-(guias[i].compases||4),msInicio:((acc-(guias[i].compases||4))/(totalComp))*(60000/(seqBpm||120))*4*totalComp}
      }));
    };

    const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;


  const panel = (
    <div
      onTouchStart={e=>e.stopPropagation()}
      onTouchMove={e=>e.stopPropagation()}
      style={{
      position:'fixed',bottom:54,left:0,right:0,
      background:'rgba(8,8,9,.98)',borderTop:'1px solid rgba(255,255,255,.1)',
      backdropFilter:'blur(40px)',zIndex:50,
      maxHeight:'72vh',
      transform:bottomTab==='secuencia'?'translateY(0)':'translateY(100%)',
      transition:'transform .3s cubic-bezier(.4,0,.2,1)',
      display:'flex',flexDirection:'column',
      overflow:'hidden',
    }}>

      {/* Área scrollable: mapa + waveform + controles + BPM */}
      <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none',minHeight:0}}>
      {/* ── MAPA DE ESTRUCTURA — integrado en el panel ── */}
      {guias&&guias.length>0&&(
        <div style={{display:'flex',height:34,borderBottom:'1px solid rgba(255,255,255,.06)',flexShrink:0}}>
          {guias.map((g,i)=>{
            const pct=(g.compases||4)/totalComp*100;
            let acc=0; for(let j=0;j<i;j++) acc+=(guias[j].compases||4);
            const from=acc/totalComp, to=(acc+(g.compases||4))/totalComp;
            const isActive=seqHighlight&&seqPos>=from&&seqPos<=to;
            return(
              <button key={i} onClick={()=>gotoBloque(i)}
                style={{width:`${pct}%`,border:'none',cursor:'pointer',padding:0,
                  background:isActive?`${g.color}22`:'transparent',
                  borderBottom:isActive?`2px solid ${g.color}`:'2px solid transparent',
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,
                  transition:'all .15s'}}>
                <span style={{fontSize:8,fontWeight:900,color:isActive?g.color:`${g.color}66`,
                  fontFamily:"'Lexend Giga',sans-serif",textTransform:'uppercase',lineHeight:1}}>{g.label}</span>
                <span style={{fontSize:5,color:'rgba(255,255,255,.2)',fontWeight:700}}>{g.compases||4}c</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── WAVEFORM GENERAL + SEEK ── */}
      <div style={{padding:'10px 14px 0',flexShrink:0}}>
        <div
          style={{height:44,position:'relative',cursor:'pointer',borderRadius:8,
            background:'rgba(255,255,255,.03)',overflow:'hidden',touchAction:'none'}}
          onPointerDown={e=>{
            e.preventDefault();
            const el=e.currentTarget;
            el.setPointerCapture(e.pointerId);
            seekOnEl(e,el);
            const mv=ev=>{ev.preventDefault();seekOnEl(ev,el);};
            const up=ev=>{el.releasePointerCapture(ev.pointerId);el.removeEventListener('pointermove',mv);};
            el.addEventListener('pointermove',mv,{passive:false});
            el.addEventListener('pointerup',up,{once:true});
          }}>
          {/* Barras waveform */}
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',gap:1,padding:'4px 0'}}>
            {WAVE_DATA.map((h,i)=>{
              const pr=i/WAVE_DATA.length;
              const played=pr<seqPos;
              // Highlight del bloque seleccionado
              const inHL=seqHighlight&&pr>=seqHighlight.from&&pr<=seqHighlight.to;
              // Color de sección
              let sc='rgba(255,255,255,.09)';
              if(guias&&totalComp){
                let acc=0;
                for(const g of guias){
                  const fr=acc/totalComp;
                  acc+=g.compases||4;
                  if(pr<=acc/totalComp){sc=g.color;break;}
                }
              }
              return(
                <div key={i} style={{
                  flex:1,borderRadius:1,
                  height:`${Math.max(12,h*100)}%`,
                  background: inHL
                    ? (played?sc+'ee':sc+'55')  // bloque seleccionado: más brillante
                    : (played?sc+'99':'rgba(255,255,255,.09)'),
                  transition:'background .08s',
                }}/>
              );
            })}
          </div>
          {/* Playhead */}
          <div style={{position:'absolute',top:0,bottom:0,left:`${seqPos*100}%`,
            width:2,background:'#fff',zIndex:3,boxShadow:'0 0 5px rgba(255,255,255,.8)'}}/>
        </div>
        {/* Tiempo */}
        <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
          <span style={{fontSize:8,color:'var(--tx3)'}}>{fmt(seqPos*192)}</span>
          <span style={{fontSize:8,color:'var(--tx3)'}}>3:12</span>
        </div>
      </div>

      {/* ── BARRA ÚNICA: BPM + Cifra + Controles ── */}
      <div style={{display:'flex',alignItems:'center',gap:0,
        margin:'8px 14px',padding:'8px 12px',
        background:'rgba(255,255,255,.04)',borderRadius:12,
        border:'1px solid rgba(255,255,255,.07)',flexShrink:0}}>

        {/* − BPM + */}
        <button
          style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',
            background:'rgba(255,255,255,.06)',color:'var(--tx)',cursor:'pointer',fontSize:17,fontWeight:700,
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,touchAction:'none'}}
          onPointerDown={e=>{
            e.preventDefault();
            const btn=e.currentTarget;
            const fire=()=>{const v=Math.max(40,seqBpm-1);setSeqBpm(v);if(clickActivo){stopClick();startClick(v);}};
            fire();
            btn._t=setTimeout(()=>{btn._iv=setInterval(fire,80);},400);
          }}
          onPointerUp={e=>{const b=e.currentTarget;clearTimeout(b._t);clearInterval(b._iv);}}
          onPointerLeave={e=>{const b=e.currentTarget;clearTimeout(b._t);clearInterval(b._iv);}}>−</button>

        <div style={{textAlign:'center',padding:'0 6px'}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontSize:22,
            color:clickActivo?'var(--gn)':'var(--ac)',lineHeight:1}}>{seqBpm}</div>
          <div style={{fontSize:7,color:'var(--tx3)',fontWeight:700,letterSpacing:1}}>BPM</div>
        </div>

        <button
          style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',
            background:'rgba(255,255,255,.06)',color:'var(--tx)',cursor:'pointer',fontSize:17,fontWeight:700,
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,touchAction:'none'}}
          onPointerDown={e=>{
            e.preventDefault();
            const btn=e.currentTarget;
            const fire=()=>{const v=Math.min(300,seqBpm+1);setSeqBpm(v);if(clickActivo){stopClick();startClick(v);}};
            fire();
            btn._t=setTimeout(()=>{btn._iv=setInterval(fire,80);},400);
          }}
          onPointerUp={e=>{const b=e.currentTarget;clearTimeout(b._t);clearInterval(b._iv);}}
          onPointerLeave={e=>{const b=e.currentTarget;clearTimeout(b._t);clearInterval(b._iv);}}>+</button>

        {/* Divisor */}
        <div style={{width:1,height:26,background:'rgba(255,255,255,.1)',margin:'0 10px',flexShrink:0}}/>

        {/* Cifra — sin label */}
        <div style={{position:'relative',flexShrink:0}}>
          <select value={seqCifra}
            onChange={e=>{const c=e.target.value;setSeqCifra(c);if(clickActivo){stopClick();startClick(seqBpm,c);}}}
            style={{padding:'5px 20px 5px 8px',borderRadius:8,
              border:'1px solid rgba(255,255,255,.12)',
              background:'rgba(255,255,255,.07)',color:'var(--ac)',
              fontSize:14,fontWeight:700,
              fontFamily:"'Special Gothic Expanded One',sans-serif",
              outline:'none',WebkitAppearance:'none',appearance:'none',
              cursor:'pointer',minWidth:52}}>
            {CIFRAS.map(c=><option key={c} value={c} style={{background:'#0a0a0a'}}>{c}</option>)}
          </select>
          <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"
            style={{position:'absolute',right:5,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Divisor */}
        <div style={{width:1,height:26,background:'rgba(255,255,255,.1)',margin:'0 10px',flexShrink:0}}/>

        {/* Controles: ⏮ Play ⏭ */}
        {/* Sección anterior */}
        <button onClick={()=>{
          if(!guias)return;
          let cur=0;
          for(let j=0;j<guias.length;j++){
            const to=(cur+(guias[j].compases||4))/totalComp;
            if(seqPos<to+.001){gotoBloque(Math.max(0,j-1));break;}
            cur+=guias[j].compases||4;
          }
        }} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',
          background:'rgba(255,255,255,.05)',color:'var(--tx)',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <polygon points="19 20 9 12 19 4 19 20"/>
            <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2.5"/>
          </svg>
        </button>

        {/* Play / Stop click */}
        <button onClick={()=>{const next=!clickActivo;setClickActivo(next);if(next)startClick(seqBpm);else stopClick();}}
          style={{width:44,height:44,borderRadius:'50%',border:'none',flexShrink:0,
            marginLeft:6,
            background:clickActivo?'var(--rd)':'var(--gn)',color:'#000',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',
            boxShadow:clickActivo?'0 0 16px rgba(253,128,131,.5)':'0 0 16px rgba(48,192,183,.3)'}}>
          {clickActivo
            ?<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            :<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
        </button>

        {/* Sección siguiente */}
        <button onClick={()=>{
          if(!guias)return;
          let cur=0;
          for(let j=0;j<guias.length;j++){
            const to=(cur+(guias[j].compases||4))/totalComp;
            if(seqPos<to-.001){gotoBloque(Math.min(guias.length-1,j+1));break;}
            cur+=guias[j].compases||4;
          }
        }} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',
          background:'rgba(255,255,255,.05)',color:'var(--tx)',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginLeft:6}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <polygon points="5 4 15 12 5 20 5 4"/>
            <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5"/>
          </svg>
        </button>
      </div>

      </div>{/* fin área scrollable */}
      {/* ── Multitracks FUERA del scroll para touch libre ── */}
      <div style={{flexShrink:0,padding:'0 12px 10px',borderTop:'1px solid rgba(255,255,255,.06)'}}>
      {/* ── Multitracks con faders (8+8) ── */}
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',fontFamily:"'Lexend Giga',sans-serif",flex:1}}>Multitracks</div>
          {/* Selector Capa A/B */}
          <div style={{display:'inline-flex',borderRadius:16,border:'1px solid var(--bd)',overflow:'hidden'}}>
            {['A','B'].map(l=>(
              <button key={l} onClick={()=>setSeqLayer(l)}
                style={{padding:'3px 12px',border:'none',cursor:'pointer',fontSize:8,fontWeight:700,
                  fontFamily:"'Lexend Giga',sans-serif",
                  background:seqLayer===l?'rgba(255,255,255,.12)':'transparent',
                  color:seqLayer===l?'var(--tx)':'var(--tx3)'}}>
                {l} <span style={{opacity:.5}}>{l==='A'?'1–8':'9–16'}</span>
              </button>
            ))}
          </div>
        </div>
        {seqData?.multitracks?(
          <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:5}}>
            {(seqLayer==='A'?seqData.multitracks.slice(0,8):seqData.multitracks.slice(8,16)).map((tr,li)=>{
              const i = seqLayer==='A'?li:li+8;
              const vol = trackVols[i]??80;
              const muted = trackMutes[i]??false;
              return(
                <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,
                  padding:'6px 3px 5px',borderRadius:10,overflow:'visible',
                  background:muted?'rgba(253,128,131,.08)':'rgba(255,255,255,.04)',
                  border:`1px solid ${muted?'rgba(253,128,131,.3)':'rgba(255,255,255,.07)'}`}}>
                  {/* Dot color */}
                  <div style={{width:5,height:5,borderRadius:'50%',background:muted?'rgba(253,128,131,.5)':tr.color,flexShrink:0}}/>
                  {/* Label */}
                  <div style={{fontSize:6,fontWeight:700,color:muted?'var(--tx3)':'var(--tx3)',
                    fontFamily:"'Lexend Giga',sans-serif",textAlign:'center',
                    width:'100%',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',
                    padding:'0 2px',flexShrink:0}}>{tr.label}</div>
                  {/* Fader Secuencia */}
                  <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'2px 0',overflow:'visible'}}>
                    <div className="fader-track"
                      style={{height:72}}>
                      <div className="fader-knob"
                        style={{bottom:`calc(${vol}% - 11px)`}}
                        onPointerDown={e=>{
                          e.preventDefault();
                          e.stopPropagation();
                          const knob=e.currentTarget;
                          const track=knob.parentElement;
                          knob.setPointerCapture(e.pointerId);
                          // Capturar rect UNA VEZ — no recalcular en cada move
                          const r=track.getBoundingClientRect();
                          const calc=ev=>Math.round((1-Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height)))*100);
                          setTrackVols(v=>{const n=[...v];n[i]=calc(e);return n;});
                          const move=ev=>{
                            ev.preventDefault();
                            setTrackVols(v=>{const n=[...v];n[i]=calc(ev);return n;});
                          };
                          const up=ev=>{
                            knob.releasePointerCapture(ev.pointerId);
                            knob.removeEventListener('pointermove',move);
                            knob.removeEventListener('pointerup',up);
                          };
                          knob.addEventListener('pointermove',move,{passive:false});
                          knob.addEventListener('pointerup',up,{once:true});
                        }}
                        onTouchStart={e=>e.stopPropagation()}
                      >{/* knob */}</div>
                    </div>
                  </div>
                  {/* Valor */}
                  <div style={{fontSize:7,fontWeight:700,color:muted?'var(--rd)':'var(--tx3)',
                    fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>{vol}</div>
                  {/* Mute */}
                  <button onClick={e=>{e.stopPropagation();setTrackMutes(m=>{const n=[...m];n[i]=!n[i];return n;})}}
                    style={{fontSize:6,fontWeight:900,padding:'2px 4px',borderRadius:4,border:'none',
                      cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0,
                      background:muted?'var(--rd)':'rgba(255,255,255,.08)',
                      color:muted?'#fff':'var(--tx3)'}}>
                    {muted?'MUTE':'M'}
                  </button>
                </div>
              );
            })}
          </div>
        ):(
          <div style={{padding:'16px',borderRadius:12,border:'1px dashed rgba(255,255,255,.1)',textAlign:'center'}}>
            <div style={{fontSize:12.5,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif"}}>Sin pistas para esta canción.</div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
  return createPortal(panel, document.body);
}
