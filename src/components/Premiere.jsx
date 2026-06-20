// Premiere: estrenos exclusivos de bandas/sellos cristianos aliados,
// antes que nadie, para clientes Pro/Premium. Feature EXCLUSIVA de Iglesia
// (modelo de negocio vía alianzas con artistas/sellos — no aplica a Banda,
// gateada por MODO_FEATURES.premiereExclusivas en data/modo.js).
// PENDIENTE (fuera de este alcance): el gating real por plan Pro/Premium
// todavía no está cableado — hoy el flag solo controla visibilidad por
// modo. Cuando se implemente la capa de planes (Fase 1 del roadmap),
// agregar acá la verificación de plan del usuario.
import { useState } from 'react';

const PREMIERES=[
  {id:1,name:'Toda La Tierra',album:'Toma Tu Lugar',sello:'Avanti Music',key:'G',bpm:128,dias:13,oficial:true,
   desc:'Un himno de adoración profética que invita a toda la creación a rendirse ante el Señor.'},
  {id:2,name:'Majestad',album:'Maverick City en Español',sello:'Maverick City Music',key:'D',bpm:72,dias:20,oficial:true,
   desc:'Nueva versión en español del clásico moderno sobre la majestad de Dios.'},
  {id:3,name:'Gloria Eterna',album:'',sello:'Red Music Latinoamérica',key:'A',bpm:118,dias:null,oficial:false,
   desc:'Próximamente. Red Music prepara este lanzamiento para sus iglesias asociadas.'},
];

export function Premiere({onToast}){
  const [sel,setSel]=useState(null);
  const top=PREMIERES[0];

  if(sel){
    const p=PREMIERES.find(x=>x.id===sel);
    return(
      <div style={{padding:'0 0 90px'}}>
        <div style={{padding:'16px',display:'flex',alignItems:'center',gap:10,marginBottom:4,cursor:'pointer'}} onClick={()=>setSel(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Premiere</span>
        </div>
        <div style={{margin:'0 16px',padding:'18px',borderRadius:16,background:'linear-gradient(135deg,rgba(200,169,126,.15),rgba(100,80,180,.1))',border:'1px solid rgba(200,169,126,.3)',marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:8}}>
            {p.oficial?'✓ Cifrado oficial':'Próximamente'}
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',marginBottom:4}}>{p.name}</div>
          <div style={{fontSize:13,color:'var(--tx2)',marginBottom:12}}>{p.album&&`${p.album} · `}{p.sello}</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
            <span style={{fontSize:11,fontWeight:700,color:'var(--ac)',background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.25)',padding:'4px 10px',borderRadius:100}}>{p.key}</span>
            <span style={{fontSize:11,fontWeight:700,color:'var(--tx2)',background:'var(--s1)',border:'1px solid var(--bd)',padding:'4px 10px',borderRadius:100}}>{p.bpm} BPM</span>
            {p.dias&&<span style={{fontSize:11,fontWeight:700,color:'var(--rd)',background:'rgba(255,82,82,.1)',border:'1px solid rgba(255,82,82,.28)',padding:'4px 10px',borderRadius:100}}>⚡ En {p.dias} días</span>}
          </div>
          <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.7}}>{p.desc}</div>
        </div>
        <div style={{padding:'0 8px',display:'flex',flexDirection:'column',gap:10}}>
          <button className="btn btn-p" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:'Agregado al setlist',sub:p.name})}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar al setlist
          </button>
          <button className="btn btn-g" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:'Te notificaremos',sub:`Al estreno de ${p.name}`})}>
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Notificarme
          </button>
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:'0 0 90px'}}>
      <div style={{margin:'16px 16px 14px',borderRadius:18,overflow:'hidden',border:'1px solid rgba(200,169,126,.25)',position:'relative',cursor:'pointer'}} onClick={()=>setSel(top.id)}>
        <div style={{background:'linear-gradient(135deg,rgba(10,8,20,.95),rgba(30,20,60,.92))',padding:'22px 20px 20px'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
            <span style={{fontSize:14}}>★</span>
            <span style={{fontSize:9,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'2px'}}>Próximo estreno</span>
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:26,color:'var(--tx)',lineHeight:1.1,marginBottom:4}}>{top.name}</div>
          <div style={{fontSize:12,color:'var(--tx2)',marginBottom:14}}>{top.album} · {top.sello}</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:12,fontWeight:700,color:'var(--rd)',background:'rgba(255,82,82,.12)',border:'1px solid rgba(255,82,82,.3)',padding:'5px 12px',borderRadius:100}}>⚡ En {top.dias} días</span>
            <span style={{fontSize:11,color:'var(--tx3)',fontWeight:700,cursor:'pointer'}}>🏛 247 iglesias →</span>
          </div>
        </div>
      </div>
      <div style={{padding:'0 8px',display:'flex',flexDirection:'column',gap:8}}>
        {PREMIERES.map(p=>(
          <div key={p.id} onClick={()=>setSel(p.id)} style={{padding:'14px 16px',borderRadius:14,background:'var(--s1)',border:'1px solid var(--bd)',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15,color:'var(--tx)',marginBottom:2}}>{p.name}</div>
              <div style={{fontSize:11,color:'var(--tx3)'}}>{p.album||p.sello}</div>
              <div style={{fontSize:10,color:'var(--tx3)',marginTop:3}}>{p.key} · {p.bpm} BPM{p.oficial?' · ✓ Oficial':''}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
              {p.dias?<span style={{fontSize:11,fontWeight:700,color:'var(--rd)'}}>{p.dias}d</span>:<span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>PRÓX.</span>}
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        ))}
      </div>

      <div style={{padding:'16px',marginTop:8,borderTop:'1px solid var(--bd)'}}>
        <div style={{fontSize:11,color:'var(--tx3)',textAlign:'center',lineHeight:1.7}}>¿Representas un sello o artista?<br/>
          <span style={{color:'var(--ac)',fontWeight:700,cursor:'pointer'}} onClick={()=>onToast({text:'Próximamente',sub:'Contacto con sellos'})}>Publica aquí tus estrenos →</span>
        </div>
      </div>
    </div>
  );
}
