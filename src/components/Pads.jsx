// Pads.jsx — Vista Escenario, Pilar 1 (de 3: Pads → Click → Multitracks).
// Pad ambiental sostenido, afinado automáticamente a la tonalidad de la
// canción activa. Sin librerías externas — Web Audio API nativo.
// Gateado por plan (Pro/Premium, planActivo.vistaEscenario) Y por modo
// (MODO_FEATURES.pads — protagonista en Iglesia, existe pero no es el
// foco en Banda; igual se deja disponible para ambos si el plan alcanza).
import { useState, useRef, useEffect } from 'react';

// ── Frecuencias base (octava 3), notas naturales + sostenidos ──────────
const NOTE_FREQS = {
  'C':130.81,'C#':138.59,'Db':138.59,'D':146.83,'D#':155.56,'Eb':155.56,
  'E':164.81,'F':174.61,'F#':185.00,'Gb':185.00,'G':196.00,'G#':207.65,
  'Ab':207.65,'A':220.00,'A#':233.08,'Bb':233.08,'B':246.94,
};

function parseKey(key=''){
  const k = (key||'C').trim();
  const isMinor = k.endsWith('m') && !k.endsWith('dim');
  const root = isMinor ? k.slice(0,-1) : k;
  return { root: NOTE_FREQS[root] ? root : 'C', isMinor };
}

// Tríada simple (fundamental, tercera, quinta) a partir de semitonos
function triadFrom(rootFreq, isMinor){
  const third = rootFreq * Math.pow(2, (isMinor?3:4)/12);
  const fifth = rootFreq * Math.pow(2, 7/12);
  return [rootFreq, third, fifth, rootFreq*2]; // octava arriba para cuerpo
}

export function Pads({songKey, lang='es'}){
  const [playing,setPlaying] = useState(false);
  const [volume,setVolume] = useState(0.25);
  const ctxRef = useRef(null);
  const nodesRef = useRef([]); // {osc, gain}
  const masterGainRef = useRef(null);

  const stopPad = (immediate=false) => {
    const ctx = ctxRef.current;
    if(!ctx){ setPlaying(false); return; }
    const now = ctx.currentTime;
    nodesRef.current.forEach(({osc,gain})=>{
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + (immediate?0.05:1.2));
      osc.stop(now + (immediate?0.1:1.3));
    });
    nodesRef.current = [];
    setPlaying(false);
  };

  const startPad = () => {
    if(!ctxRef.current) ctxRef.current = new (window.AudioContext||window.webkitAudioContext)();
    const ctx = ctxRef.current;
    if(ctx.state==='suspended') ctx.resume();

    const { root, isMinor } = parseKey(songKey);
    const freqs = triadFrom(NOTE_FREQS[root], isMinor);

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    masterGainRef.current = master;

    const now = ctx.currentTime;
    master.gain.linearRampToValueAtTime(volume, now + 1.5); // attack lento, típico de pad

    const nodes = freqs.map((f,i)=>{
      const osc = ctx.createOscillator();
      osc.type = i===0 ? 'sawtooth' : 'triangle'; // fundamental con más cuerpo
      osc.frequency.value = f * (1 + (Math.random()-0.5)*0.003); // detune sutil, calidez
      const gain = ctx.createGain();
      gain.gain.value = i===0 ? 0.9 : 0.55;
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      return {osc,gain};
    });
    nodesRef.current = nodes;
    setPlaying(true);
  };

  // Si cambia la tonalidad de la canción activa mientras el pad suena,
  // retriggea suave a la nueva tonalidad (no deja sonar la tonalidad vieja
  // sobre la canción nueva).
  useEffect(()=>{
    if(playing){ stopPad(true); setTimeout(startPad, 120); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songKey]);

  useEffect(()=>{
    if(masterGainRef.current && ctxRef.current){
      masterGainRef.current.gain.linearRampToValueAtTime(volume, ctxRef.current.currentTime+0.1);
    }
  }, [volume]);

  useEffect(()=>()=>stopPad(true), []); // cleanup al desmontar

  return(
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:12,
      border:'1px solid var(--bd)',background:'var(--s1)'}}>
      <button onClick={()=>playing?stopPad():startPad()}
        style={{width:34,height:34,borderRadius:'50%',border:'none',cursor:'pointer',flexShrink:0,
          background:playing?'var(--gn)':'var(--ac)',color:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {playing?(
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
        ):(
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        )}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>
          Pad · {songKey||'—'}
        </div>
        <input type="range" min="0" max="0.6" step="0.01" value={volume}
          onChange={e=>setVolume(Number(e.target.value))}
          style={{width:'100%',accentColor:'var(--ac)'}}/>
      </div>
    </div>
  );
}
