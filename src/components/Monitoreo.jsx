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
import { t as getT } from '../i18n';

const NOMBRES_DEFAULT = [
  'Voz Líder','Coro 1','Coro 2','Guitarra Ac.','Guitarra El.','Bajo','Batería','Teclado',
  'Track/Click','Pads','Aux 1','Aux 2','Aux 3','Aux 4','Aux 5','Master',
];

export function Monitoreo({lang='es', onToast=()=>{}}){
  const tx=getT(lang);
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
          <div style={{fontFamily:"var(--font-display)",fontWeight:400,fontSize:'var(--fs-2xl)',color:'var(--tx)',lineHeight:1.05}}>
            Monitoreo
          </div>
          <div style={{fontFamily:"var(--font-body)",fontWeight:300,fontSize:'var(--fs-base)',color:'var(--tx2)',lineHeight:1.5,marginTop:5}}>
            {tx.monitoringSubtitle}
          </div>
        </div>
      </div>

      <div style={{padding:'10px 12px',borderRadius:12,background:'rgba(var(--rd-rgb),.06)',border:'1px solid rgba(var(--rd-rgb),.25)',marginBottom:16}}>
        <div style={{fontSize:'var(--fs-base)',color:'var(--rd)',fontWeight:700,marginBottom:2,fontFamily:"var(--font-body)"}}>
          ⚠ {tx.notConnected}
        </div>
        <div style={{fontSize:'var(--fs-base)',fontWeight:300,color:'var(--tx2)',lineHeight:1.6,fontFamily:"var(--font-body)"}}>
          {tx.notConnectedDesc}
        </div>
      </div>

      <div style={{padding:'20px',borderRadius:14,border:'1px dashed var(--bd)',textAlign:'center',marginTop:8}}>
        <div style={{fontSize:'var(--fs-base)',fontWeight:300,color:'var(--tx2)',fontFamily:"var(--font-body)",lineHeight:1.8}}>
          {tx.monitoringComingSoon}
        </div>
      </div>
    </div>
  );
}
