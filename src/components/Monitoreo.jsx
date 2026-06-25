// Monitoreo.jsx — Vista Escenario, Pilar Monitoreo (mezcla personal).
// SOLO LA UI. No hay conexión OSC real — eso requiere un "puente" externo
// (OSC/UDP↔WebSocket) corriendo en la red local, que todavía no existe
// (ver decisión de arquitectura, sesión 2026-06-20). Esta pantalla está
// lista para conectarse al puente el día que exista: cada cambio de fader
// ya llama a `enviarOSC(addr, value)` — hoy esa función solo deja un log
// y un toast, mañana solo hace falta que mande el mensaje real por
// WebSocket al puente.
//
// 16 canales en 2 capas de 8 (mismo límite técnico de los X32/M32: layer
// A = canales 1-8, layer B = canales 9-16).
import { useState } from 'react';

const NOMBRES_DEFAULT = [
  'Voz Líder','Coro 1','Coro 2','Guitarra Ac.','Guitarra El.','Bajo','Batería','Teclado',
  'Track/Click','Pads','Aux 1','Aux 2','Aux 3','Aux 4','Aux 5','Master',
];

export function Monitoreo({lang='es', onToast=()=>{}}){
  const [layer,setLayer] = useState('A'); // 'A' = canales 1-8, 'B' = canales 9-16
  const [canales,setCanales] = useState(()=>
    NOMBRES_DEFAULT.map((nombre,i)=>({id:i+1,nombre,nivel:i===15?0.85:0.6,muted:false}))
  );

  // ── Placeholder del puente OSC — hoy solo loguea, mañana manda el
  // mensaje real por WebSocket al bridge en la red local. La dirección
  // OSC sigue la convención X32/M32: /ch/NN/mix/fader, /ch/NN/mix/on ────
  const enviarOSC = (addr, value) => {
    console.log('[OSC stub]', addr, value);
  };

  const visibles = layer==='A' ? canales.slice(0,8) : canales.slice(8,16);

  const setNivel = (id, nivel) => {
    setCanales(prev=>prev.map(c=>c.id===id?{...c,nivel}:c));
    enviarOSC(`/ch/${String(id).padStart(2,'0')}/mix/fader`, nivel);
  };
  const toggleMute = (id) => {
    setCanales(prev=>prev.map(c=>{
      if(c.id!==id)return c;
      const muted=!c.muted;
      enviarOSC(`/ch/${String(id).padStart(2,'0')}/mix/on`, muted?0:1);
      return {...c,muted};
    }));
  };

  return(
    <div>
      <div className="ph" style={{marginBottom:14,alignItems:'flex-start'}}>
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05}}>
            Monitoreo
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginTop:5}}>
            {lang==='en'?'Personal mix — 16 channels, 2 layers of 8':'Mezcla personal — 16 canales, 2 capas de 8'}
          </div>
        </div>
      </div>

      <div style={{padding:'10px 12px',borderRadius:12,background:'rgba(253,128,131,.06)',border:'1px solid rgba(253,128,131,.25)',marginBottom:16}}>
        <div style={{fontSize:11,color:'var(--rd)',fontWeight:700,marginBottom:2,fontFamily:"'Lexend Giga',sans-serif"}}>
          ⚠ {lang==='en'?'Not connected':'Sin conexión'}
        </div>
        <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.6,fontFamily:"'Lexend Giga',sans-serif"}}>
          {lang==='en'
            ?'This UI is ready, but real-time OSC connection to the console needs a network bridge that doesn\'t exist yet. Moving faders here doesn\'t change anything on the physical mixer.'
            :'Esta UI está lista, pero la conexión OSC real con la mesa necesita un puente de red que todavía no existe. Mover estos faders no cambia nada en la mesa física.'}
        </div>
      </div>

      <div style={{padding:'20px',borderRadius:14,border:'1px dashed rgba(255,255,255,.1)',textAlign:'center',marginTop:8}}>
        <div style={{fontSize:12,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif",lineHeight:1.8}}>
          {lang==='en'
            ?'Monitor mixing will be available once the OSC bridge is connected.'
            :'La mezcla de monitoreo estará disponible una vez conectado el puente OSC.'}
        </div>
      </div>
    </div>
  );
}
