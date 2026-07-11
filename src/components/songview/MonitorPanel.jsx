import { createPortal } from 'react-dom';

const FADER_NAMES=['Kick','Snare','Hi-Hat','Bass','Gtr 1','Gtr 2','Keys','Voz 1','Voz 2','Voz 3','Coros','Coros 2','Pad','Fx','Aux L','Aux R'];

const volToDB=v=>{
  if(v<=0) return '-∞';
  const db=40*Math.log10(v/75);
  if(db>=0) return '+'+db.toFixed(1);
  return db.toFixed(1);
};

const DB_MARKS=[
  {db:10,pct:100},{db:5,pct:91},{db:0,pct:75},{db:-5,pct:65},
  {db:-10,pct:55},{db:-20,pct:40},{db:-30,pct:28},{db:-50,pct:14}
];

export function MonitorPanel({
  bottomTab, showMonitor, setShowMonitor,
  monitorBus, setMonitorBus,
  monitorLayer, setMonitorLayer,
  faderVols, setFaderVols,
  faderMutes, setFaderMutes,
  mesaConectada, mesaNombre, wifiStrength,
}) {
  const h=window.innerHeight;
  const trackH=Math.max(100, h*0.32);

  const panel = (
    <div
      onTouchStart={e=>e.stopPropagation()}
      onTouchMove={e=>e.stopPropagation()}
      style={{position:'fixed',bottom:54,left:0,right:0,
        background:'rgba(6,6,14,.97)',borderTop:'2px solid rgba(var(--gn-rgb),.4)',
        backdropFilter:'blur(40px)',zIndex:200,
        transform:(bottomTab==='monitor'&&showMonitor)?'translateY(0)':'translateY(100%)',
        transition:'transform .3s cubic-bezier(.4,0,.2,1)',
        display:'flex',flexDirection:'column',
        maxHeight:'70vh',
      }}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'7px 12px',
        borderBottom:'1px solid rgba(255,255,255,.07)',flexShrink:0}}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
          stroke={mesaConectada?'var(--gn)':'var(--tx3)'} strokeWidth="2">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
        </svg>
        <div style={{flex:1,fontSize:'var(--fs-xs)',fontWeight:700,color:mesaConectada?'var(--gn)':'var(--tx3)',
          fontFamily:"var(--font-body)",textTransform:'uppercase',letterSpacing:'1px'}}>
          {mesaConectada?`Conectado · ${mesaNombre}`:'Monitor · Sin conexión'}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:3}}>
          <span style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontFamily:"var(--font-body)"}}>Bus</span>
          {[1,2,3,4].map(b=>(
            <button key={b} onClick={()=>setMonitorBus(b)}
              style={{width:20,height:20,borderRadius:5,border:'none',cursor:'pointer',
                background:monitorBus===b?'var(--gn)':'rgba(255,255,255,.08)',
                color:monitorBus===b?'#000':'var(--tx3)',fontSize:'var(--fs-2xs)',fontWeight:900}}>
              {b}
            </button>
          ))}
        </div>
        <div style={{display:'inline-flex',borderRadius:10,border:'1px solid rgba(255,255,255,.1)',overflow:'hidden'}}>
          {['A','B'].map(l=>(
            <button key={l} onClick={()=>setMonitorLayer(l)}
              style={{padding:'2px 8px',border:'none',cursor:'pointer',fontSize:'var(--fs-2xs)',fontWeight:700,
                fontFamily:"var(--font-body)",
                background:monitorLayer===l?'rgba(var(--gn-rgb),.25)':'transparent',
                color:monitorLayer===l?'var(--gn)':'var(--tx3)'}}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={()=>setShowMonitor(false)}
          style={{width:20,height:20,borderRadius:5,border:'1px solid rgba(255,255,255,.1)',
            background:'transparent',color:'var(--tx3)',cursor:'pointer',fontSize:'var(--fs-emph)',
            display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>×</button>
      </div>

      {/* Grid de 8 faders */}
      <div style={{flex:1,display:'flex',gap:2,padding:'6px 8px 8px',overflow:'hidden',minHeight:0}}>
        {Array.from({length:8},(_,li)=>{
          const ci=monitorLayer==='A'?li:li+8;
          const vol=faderVols[ci];
          const muted=faderMutes[ci];
          const dbStr=volToDB(muted?0:vol);
          const vuLit=muted?0:Math.round((vol/100)*12);
          return(
            <div key={ci} style={{
              flex:1,display:'flex',flexDirection:'column',alignItems:'center',
              gap:2,minWidth:0,padding:'4px 2px 4px',borderRadius:6,
              background:muted?'rgba(var(--rd-rgb),.06)':'rgba(255,255,255,.03)',
              border:`1px solid ${muted?'rgba(var(--rd-rgb),.2)':'rgba(255,255,255,.06)'}`,
              overflow:'visible',
            }}>
              <div style={{fontSize:'var(--fs-3xs)',fontWeight:700,
                color:muted?'var(--rd)':vol>90?'var(--rd)':vol>75?'#f59e0b':'var(--tx)',
                fontFamily:"var(--font-body)",letterSpacing:'.3px',
                flexShrink:0,textAlign:'center'}}>
                {dbStr}
              </div>
              <div style={{flex:1,display:'flex',alignItems:'stretch',gap:2,
                width:'100%',overflow:'visible',justifyContent:'center'}}>
                {/* Escala dB */}
                <div style={{position:'relative',width:10,flexShrink:0,pointerEvents:'none'}}>
                  {DB_MARKS.map(({db,pct})=>(
                    <div key={db} style={{
                      position:'absolute',right:0,bottom:`${pct}%`,
                      fontSize:'var(--fs-3xs)',color:'rgba(255,255,255,.3)',
                      fontFamily:"var(--font-body)",
                      lineHeight:1,transform:'translateY(50%)',textAlign:'right',
                    }}>{db>0?'+'+db:db}</div>
                  ))}
                </div>
                {/* Track + Knob + VU */}
                <div style={{position:'relative',display:'flex',alignItems:'center',
                  justifyContent:'center',overflow:'visible',flex:1}}>
                  <div style={{
                    position:'relative',width:48,height:trackH,
                    borderRadius:2,touchAction:'none',overflow:'visible',cursor:'ns-resize',
                  }}>
                    {/* Track line via pseudo — usamos un div real */}
                    <div style={{position:'absolute',top:0,bottom:0,left:'50%',
                      transform:'translateX(-50%)',width:5,
                      background:'rgba(255,255,255,.1)',borderRadius:3,pointerEvents:'none'}}/>
                    {/* VU meter — señal de entrada (animada independiente del fader) */}
                    <div style={{
                      position:'absolute',top:3,bottom:3,right:3,width:4,
                      display:'flex',flexDirection:'column-reverse',gap:1,
                      zIndex:1,pointerEvents:'none',
                    }}>
                      {Array.from({length:12},(_,si)=>{
                        const lit=si<vuLit;
                        const col=si>=10?'var(--rd)':si>=8?'#f59e0b':'var(--gn)';
                        return(
                          <div key={si} style={{
                            flex:1,borderRadius:.5,
                            background:lit?col:'rgba(255,255,255,.08)',
                            boxShadow:lit&&si>=8?`0 0 3px ${col}`:'none',
                          }}/>
                        );
                      })}
                    </div>
                    {/* Knob */}
                    <div style={{
                      position:'absolute',left:'50%',transform:'translateX(-50%)',
                      width:44,height:30,borderRadius:6,zIndex:2,
                      bottom:`calc(${vol}% - 15px)`,
                      background:'linear-gradient(180deg,#e0e0e0 0%,#cecece 15%,#b5b5b5 45%,#c2c2c2 55%,#d5d5d5 85%,#dfdfdf 100%)',
                      boxShadow:'0 5px 15px rgba(0,0,0,.9),0 2px 0 rgba(255,255,255,.5) inset,0 -2px 0 rgba(0,0,0,.4) inset',
                      border:'1px solid rgba(0,0,0,.5)',cursor:'grab',
                      touchAction:'none',userSelect:'none',WebkitUserSelect:'none',
                    }}
                    onPointerDown={e=>{
                      e.preventDefault();
                      e.stopPropagation();
                      const knob=e.currentTarget;
                      const track=knob.parentElement;
                      knob.setPointerCapture(e.pointerId);
                      const r=track.getBoundingClientRect();
                      const calc=ev=>Math.round((1-Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height)))*100);
                      setFaderVols(v=>{const n=[...v];n[ci]=calc(e);return n;});
                      const move=ev=>{ev.preventDefault();setFaderVols(v=>{const n=[...v];n[ci]=calc(ev);return n;});};
                      const up=ev=>{knob.releasePointerCapture(ev.pointerId);knob.removeEventListener('pointermove',move);knob.removeEventListener('pointerup',up);};
                      knob.addEventListener('pointermove',move,{passive:false});
                      knob.addEventListener('pointerup',up,{once:true});
                    }}>
                      <div style={{position:'absolute',top:'50%',left:'50%',
                        transform:'translate(-50%,-50%)',
                        width:'60%',height:2,background:'rgba(0,0,0,.4)',borderRadius:1,
                        boxShadow:'0 -5px 0 rgba(0,0,0,.3),0 5px 0 rgba(0,0,0,.3),0 -10px 0 rgba(0,0,0,.15),0 10px 0 rgba(0,0,0,.15)'}}/>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{fontSize:'var(--fs-3xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",
                fontWeight:700,flexShrink:0,letterSpacing:'.5px'}}>CH {ci+1}</div>
              <button onClick={e=>{
                e.stopPropagation();
                setFaderMutes(m=>{const n=[...m];n[ci]=!n[ci];return n;});
              }} style={{
                width:'100%',padding:'3px 0',borderRadius:4,border:'none',cursor:'pointer',
                flexShrink:0,
                background:muted?'#8B0000':'rgba(255,255,255,.06)',
                color:muted?'#ff4444':'var(--tx3)',
                fontSize:'var(--fs-3xs)',fontWeight:900,fontFamily:"var(--font-body)",
                letterSpacing:'.5px',
                boxShadow:muted?'0 0 8px rgba(255,68,68,.4)':'none',
              }}>MUTE</button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
