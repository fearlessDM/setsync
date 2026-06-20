// MiEvento: vista de "mi próximo evento" + recordatorio al equipo.
// Antes: MiSetlist + MiSetlistNotif dentro de AdminView.jsx.
// Queda EXCLUSIVO de Iglesia (cultura de ensayo Miércoles/Sábado no aplica
// a Banda, que ya tiene su propio flujo de notificación en Backstage).
// BUG ENCONTRADO Y CORREGIDO: generarMensaje() no existía en ningún
// archivo del repo — MiSetlistNotif rompía (ReferenceError) apenas se
// renderizaba. Se agrega la función abajo, funcional.
import { useState, useEffect } from 'react';
import { SETLISTS } from '../data/constants';
import { t as getT } from '../i18n';

function generarMensaje(activeSunday, sl, mesNombre, tipo){
  const cancionesLista = (sl||[]).map(s=>`• ${s.name} (${s.key})`).join('\n');
  const dia = tipo==='mie' ? 'miércoles' : 'sábado';
  return `¡Hola equipo! 🎶\n\nRecordatorio del culto del domingo ${activeSunday} de ${mesNombre}.\n\nSetlist:\n${cancionesLista||'(por confirmar)'}\n\nEnsayo el ${dia}. ¡Nos vemos ahí! 🙌`;
}

export function MiSetlistNotif({onToast,activeSunday,sl,mesNombre}){
  const [msg,setMsg]=useState('');
  const [tipo,setTipo]=useState('mie');
  useEffect(()=>{setMsg(generarMensaje(activeSunday,sl,mesNombre,tipo));},[tipo,activeSunday]);
  const [custom,setCustom]=useState(false);
  const [open,setOpen]=useState(false);
  if(!open)return(
    <div style={{marginBottom:14}}>
      <div style={{borderTop:'1px solid var(--bd)',paddingTop:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Recordatorio al equipo</div>
        <button onClick={()=>setOpen(true)} style={{width:'100%',padding:'14px 16px',borderRadius:14,border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.07)',cursor:'pointer',display:'flex',alignItems:'center',gap:12,fontFamily:"'Lexend Giga',sans-serif",transition:'all .15s'}}>
          <div style={{width:38,height:38,borderRadius:10,background:'rgba(200,169,126,.12)',border:'1px solid rgba(200,169,126,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{flex:1,textAlign:'left'}}>
            <div style={{fontWeight:900,fontSize:14,color:'var(--ac)'}}>Enviar recordatorio</div>
            <div style={{fontSize:11,color:'var(--tx2)',marginTop:2}}>Mié y Sáb · Info del evento + ánimo al equipo</div>
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--ac)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
  return(
    <div style={{marginBottom:14,padding:'14px',borderRadius:14,border:'1px solid rgba(200,169,126,.28)',background:'rgba(200,169,126,.05)'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span style={{fontWeight:900,fontSize:13,color:'var(--tx)'}}>Mensaje al equipo</span>
        <button onClick={()=>setOpen(false)} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[['mie','Miércoles'],['sab','Sábado']].map(([t,l])=>(
          <button key={t} onClick={()=>setTipo(t)} style={{flex:1,padding:'8px',borderRadius:9,border:tipo===t?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',background:tipo===t?'rgba(200,169,126,.08)':'var(--s1)',color:tipo===t?'var(--ac)':'var(--tx3)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
            {l}
          </button>
        ))}
      </div>
      {!custom&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>Vista previa del mensaje</div>
          <div style={{padding:'10px 12px',borderRadius:9,background:'var(--s1)',border:'1px solid var(--bd)',fontSize:11,color:'var(--tx)',lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:160,overflowY:'auto'}}>{msg}</div>
          <button onClick={()=>setCustom(true)} style={{marginTop:8,fontSize:11,color:'var(--ac)',fontWeight:700,background:'none',border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>Editar mensaje</button>
        </div>
      )}
      {custom&&(
        <div style={{marginBottom:10}}>
          <textarea className="inp" value={msg} onChange={e=>setMsg(e.target.value)} style={{minHeight:80,fontSize:12,lineHeight:1.6,resize:'vertical',marginBottom:6}}/>
          <button onClick={()=>{setCustom(false);setMsg(generarMensaje(activeSunday,sl,mesNombre,tipo));}} style={{fontSize:11,color:'var(--tx3)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>← Regenerar automático</button>
        </div>
      )}
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setOpen(false)} className="btn btn-g btn-sm" style={{flex:1,justifyContent:'center'}}>Cancelar</button>
        <button onClick={()=>{onToast({text:'Mensaje enviado',sub:'Todo el equipo notificado'});setOpen(false);}} className="btn btn-p btn-sm" style={{flex:2,justifyContent:'center'}}>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar al equipo
        </button>
      </div>
    </div>
  );
}


export function MiEvento({activeSunday,onOpenSong,onLive,userRole,onToast,lang='es'}){
  const tx=getT(lang);
  const sl=SETLISTS[activeSunday]||[];
  const MESES_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNombre=MESES_ES[new Date().getMonth()];
  const ITINERARIO=[
    {hora:'08:30',label:'Llegada y preparación técnica'},
    {hora:'09:00',label:'Prueba de sonido'},
    {hora:'09:30',label:lang==='en'?'Team rehearsal':'Ensayo con el equipo'},
    {hora:'10:00',label:'Inicio del servicio'},
    {hora:'10:05',label:'Bloque de adoración (4 canciones)'},
    {hora:'10:30',label:'Mensaje'},
    {hora:'11:00',label:'Cierre y oración'},
  ];

  return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>Dom <span style={{color:'var(--ac)'}}>{activeSunday} {mesNombre}</span></div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5}}>Tu setlist para este domingo. Repasa las canciones con tiempo.</div>
          </div>
          <button onClick={onLive} style={{flexShrink:0,padding:'9px 14px',borderRadius:12,border:'1px solid rgba(48,192,183,.35)',background:'rgba(48,192,183,.1)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'var(--rd)',animation:'rp 1.2s infinite'}}/>
              <span style={{fontSize:11,fontWeight:900,color:'var(--gn)',textTransform:'uppercase',letterSpacing:'.5px'}}>{tx.live}</span>
            </div>
            <span style={{fontSize:8,color:'var(--tx3)',fontWeight:700}}>Interpretar</span>
          </button>
        </div>
        <div style={{display:'flex',gap:8,marginTop:10}}>
          <span style={{padding:'5px 12px',borderRadius:100,border:'1px solid rgba(94,206,160,.4)',background:'rgba(94,206,160,.1)',color:'var(--gn)',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:5}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Publicado
          </span>
          
        </div>
      </div>
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:16,marginBottom:14,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Canciones</span>
          <span style={{padding:'2px 8px',borderRadius:100,border:'1px solid rgba(94,206,160,.4)',background:'rgba(94,206,160,.08)',color:'var(--gn)',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:'var(--gn)'}}/>Publicado
          </span>
        </div>
        {sl.length===0
          ?<div style={{textAlign:'center',padding:'24px',color:'var(--tx3)',fontSize:13}}>Sin setlist para este domingo</div>
          :sl.map((s,i)=>(
            <div key={i} onClick={()=>onOpenSong(i)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:i<sl.length-1?'1px solid rgba(255,255,255,.05)':'none',cursor:'pointer'}}>
              <span style={{fontSize:13,fontWeight:900,color:'var(--tx3)',minWidth:16,textAlign:'right'}}>{i+1}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:'var(--tx)'}}>{s.name}</div>
                <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>Guitarra · {s.key} · {s.bpm} BPM</div>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))
        }
      </div>
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:16,marginBottom:14,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Equipos convocados</span>
          <span style={{fontSize:10,fontWeight:700,color:'var(--tx3)'}}>{EQUIPOS_DATA.reduce((a,e)=>a+e.miembros.length,0)} personas</span>
        </div>
        {EQUIPOS_DATA.map(eq=>(
          <div key={eq.id} style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
            <div style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
              <span style={{fontWeight:900,fontSize:12,color:'var(--tx)',flex:1}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{eq.miembros.length}</span>
            </div>
            <div style={{padding:'0 14px 8px',display:'flex',flexWrap:'wrap',gap:5}}>
              {eq.miembros.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:100,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)'}}>
                  <div style={{width:16,height:16,borderRadius:'50%',background:'linear-gradient(135deg,'+eq.color+'60,'+eq.color+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                  <span style={{fontSize:10,fontWeight:700,color:'var(--tx)'}}>{m.name.split(' ')[0]}</span>
                  <span style={{fontSize:9,color:eq.color,fontWeight:700}}>{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {userRole==='superadmin'&&(
        <MiSetlistNotif onToast={onToast} activeSunday={activeSunday} sl={sl} mesNombre={mesNombre}/>
      )}
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Itinerario del domingo</span>
        </div>
        {ITINERARIO.map((it,i)=>(
          <div key={i} style={{display:'flex',gap:12,padding:'10px 14px',borderBottom:i<ITINERARIO.length-1?'1px solid rgba(255,255,255,.04)':'none',alignItems:'flex-start'}}>
            <span style={{fontSize:11,fontWeight:900,color:'var(--ac)',minWidth:40,fontFamily:"'Outfit',sans-serif"}}>{it.hora}</span>
            <span style={{fontSize:12,color:'var(--tx)',fontWeight:600,lineHeight:1.4}}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PREMIERE ─────────────────────────────────────────
