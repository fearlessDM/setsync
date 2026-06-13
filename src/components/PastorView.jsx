// PastorView: panel del Pastor (versículo, PPT, notificaciones al equipo).
// NOTA: Pendiente fusión con AdminView según Paso 3 del plan (eliminar rol Pastor).
import { useState, useEffect, useRef } from 'react';

export function PastorView({pastorData,setPastorData,eventos,onToast,onBack}){
  const [selEv,setSelEv]=useState('');
  const [versiculo,setVersiculo]=useState('');
  const [referencia,setReferencia]=useState('');
  const [comentario,setComentario]=useState('');
  const [pptName,setPptName]=useState('');
  const [saved,setSaved]=useState(false);
  const [notifDest,setNotifDest]=useState([]);
  const [notifMsg,setNotifMsg]=useState('');

  // Cargar datos del evento seleccionado
  React.useEffect(()=>{
    if(!selEv)return;
    const d=pastorData[selEv]||{};
    setVersiculo(d.versiculo||'');
    setReferencia(d.referencia||'');
    setComentario(d.comentario||'');
    setPptName(d.pptName||'');
    setSaved(false);
  },[selEv]);

  const handleSave=()=>{
    if(!selEv){onToast('Selecciona un evento primero');return;}
    setPastorData(prev=>({
      ...prev,
      [selEv]:{versiculo,referencia,comentario,pptName}
    }));
    setSaved(true);
    onToast('✓ Palabra del Pastor guardada');
  };

  const handlePPT=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    setPptName(file.name);
    onToast(`📎 ${file.name} listo para compartir`);
  };

  const FONT="'Lato',sans-serif";
  const domingos=eventos.filter(ev=>ev.tipo==='domingo'||ev.tipo==='especial'||!ev.tipo);

  return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}} onClick={onBack}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)',fontFamily:FONT}}>Backstage</span>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <span style={{fontSize:20}}>✝</span>
        <div>
          <div style={{fontSize:16,fontWeight:900,color:'var(--tx)',fontFamily:FONT}}>Palabra del Pastor</div>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT}}>Versículo y dirección para el equipo</div>
        </div>
      </div>

      <div style={{height:1,background:'var(--bd)',margin:'14px 0'}}/>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
          Evento
        </div>
        <select
          value={selEv}
          onChange={e=>setSelEv(e.target.value)}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',fontSize:13,fontFamily:FONT,fontWeight:700}}>
          <option value="">— Selecciona el domingo o evento —</option>
          {domingos.map((ev,i)=>(
            <option key={i} value={ev.id||i}>{ev.nombre||`Domingo ${ev.fecha||''}`}</option>
          ))}
          {domingos.length===0&&[7,14,21,28].map(d=>(
            <option key={d} value={`dom-${d}`}>Domingo {d} Junio</option>
          ))}
        </select>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
          Versículo central
        </div>
        <textarea
          value={versiculo}
          onChange={e=>{setVersiculo(e.target.value);setSaved(false);}}
          placeholder="Escribe el versículo aquí..."
          rows={3}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',fontSize:14,fontFamily:FONT,
            resize:'none',boxSizing:'border-box',lineHeight:1.5}}
        />
        <input
          value={referencia}
          onChange={e=>{setReferencia(e.target.value);setSaved(false);}}
          placeholder="Referencia (ej: Juan 3:16)"
          style={{width:'100%',padding:'8px 12px',borderRadius:10,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',fontSize:13,fontFamily:FONT,
            marginTop:6,boxSizing:'border-box'}}
        />
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
          Dirección para el equipo
        </div>
        <textarea
          value={comentario}
          onChange={e=>{setComentario(e.target.value);setSaved(false);}}
          placeholder="Mensaje al líder de alabanza, tema de la semana, énfasis pastoral..."
          rows={4}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',fontSize:13,fontFamily:FONT,
            resize:'none',boxSizing:'border-box',lineHeight:1.5}}
        />
      </div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
          Presentación (PPT)
        </div>
        <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
          borderRadius:10,border:'1px dashed var(--bd)',background:'var(--s2)',cursor:'pointer'}}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--ac)',fontFamily:FONT}}>
              {pptName||'Subir presentación'}
            </div>
            <div style={{fontSize:10,color:'var(--tx3)',fontFamily:FONT}}>
              {pptName?'Toca para cambiar':'PPT, PPTX, PDF'}
            </div>
          </div>
          <input type="file" accept=".ppt,.pptx,.pdf" onChange={handlePPT} style={{display:'none'}}/>
        </label>
        {pptName&&(
          <div style={{marginTop:8,padding:'8px 12px',borderRadius:8,background:'rgba(94,206,160,.08)',
            border:'1px solid rgba(94,206,160,.2)',display:'flex',alignItems:'center',gap:8}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--gn)" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{fontSize:12,color:'var(--gn)',fontFamily:FONT,fontWeight:700}}>{pptName}</span>
            <span style={{fontSize:10,color:'var(--tx3)',fontFamily:FONT,marginLeft:'auto'}}>Listo para equipo</span>
          </div>
        )}
      </div>
      <button
        onClick={handleSave}
        style={{width:'100%',padding:'12px',borderRadius:12,border:'none',
          background:saved?'rgba(94,206,160,.15)':'var(--ac)',
          color:saved?'var(--gn)':'#fff',
          fontSize:14,fontWeight:900,fontFamily:FONT,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        {saved?(
          <><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Guardado</>
        ):(
          <><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Publicar para el equipo</>
        )}
      </button>
      <div style={{marginBottom:14}}>
        <div style={{height:1,background:'var(--bd)',margin:'16px 0 14px'}}/>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,
          textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
          📢 Enviar mensaje al equipo
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
          {['Todo el equipo','Solo líderes','Banda','Proyecciones','Sonido'].map(dest=>(
            <button
              key={dest}
              onClick={()=>setNotifDest(prev=>prev.includes(dest)?prev.filter(d=>d!==dest):[...prev,dest])}
              style={{
                padding:'5px 10px',borderRadius:20,fontSize:11,fontWeight:700,
                fontFamily:FONT,cursor:'pointer',border:'1px solid',
                background:notifDest.includes(dest)?'var(--ac)':'transparent',
                color:notifDest.includes(dest)?'#fff':'var(--tx3)',
                borderColor:notifDest.includes(dest)?'var(--ac)':'var(--bd)',
              }}>
              {dest}
            </button>
          ))}
        </div>
        <textarea
          value={notifMsg}
          onChange={e=>setNotifMsg(e.target.value)}
          placeholder="Ej: '¡Buenos días equipo! El domingo predicaré sobre la gracia. Busquemos canciones que hablen de gracia y misericordia 🙌'"
          rows={3}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',fontSize:13,fontFamily:FONT,
            resize:'none',boxSizing:'border-box',lineHeight:1.5,marginBottom:8}}
        />
        <button
          onClick={()=>{
            if(!notifMsg.trim()){onToast('Escribe un mensaje primero');return;}
            if(!notifDest.length){onToast('Selecciona a quién enviar');return;}
            onToast(`✓ Mensaje enviado a: ${notifDest.join(', ')}`);
            setNotifMsg('');
            setNotifDest([]);
          }}
          style={{width:'100%',padding:'10px',borderRadius:10,border:'none',
            background:'rgba(123,104,238,.15)',color:'#7b68ee',
            fontSize:13,fontWeight:800,fontFamily:FONT,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:6,
            border:'1px solid rgba(123,104,238,.3)'}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          Enviar mensaje
        </button>
      </div>
      {(versiculo||comentario)&&(
        <div style={{marginTop:20,padding:'14px',borderRadius:12,
          background:'var(--s1)',border:'1px solid var(--bd)'}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,
            textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
            Vista previa — lo que verá el líder
          </div>
          {versiculo&&(
            <div style={{marginBottom:8}}>
              <div style={{fontSize:14,fontStyle:'italic',color:'var(--tx)',fontFamily:FONT,lineHeight:1.5}}>
                "{versiculo}"
              </div>
              {referencia&&(
                <div style={{fontSize:12,color:'var(--ac)',fontFamily:FONT,fontWeight:700,marginTop:4}}>
                  — {referencia}
                </div>
              )}
            </div>
          )}
          {comentario&&(
            <div style={{fontSize:12,color:'var(--tx2)',fontFamily:FONT,lineHeight:1.5,
              borderTop:versiculo?'1px solid var(--bd)':'none',paddingTop:versiculo?8:0}}>
              {comentario}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
