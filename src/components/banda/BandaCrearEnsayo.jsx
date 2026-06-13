// BandaCrearEnsayo: formulario de creación de ensayo (fecha, lugar, equipos, setlist, itinerario)
import { useState } from 'react';
import { ALL_ROLES_BANDA } from '../../data/constants';

export function BandaCrearEnsayo({gigs,repertorio,members,onSave,onToast}){
  const FONT="'Lato',sans-serif";
  const [fecha,setFecha]=useState('');
  const [hora,setHora]=useState('');
  const [lugar,setLugar]=useState('');
  const [direccion,setDireccion]=useState('');
  const [eventoId,setEventoId]=useState('');
  const [duracion,setDuracion]=useState('2h');
  const [equiposConv,setEquiposConv]=useState([]);
  const [setlistSel,setSetlistSel]=useState([]);
  const [itinerario,setItinerario]=useState([
    {id:1,hora:'',accion:'Llegada y montaje'},
    {id:2,hora:'',accion:'Soundcheck'},
    {id:3,hora:'',accion:'Ensayo general'},
    {id:4,hora:'',accion:'Cierre'},
  ]);
  const [notas,setNotas]=useState('');

  const ALL_ROLES=[...ROLES_MUSICOS,...EQUIPOS_TRABAJO];
  const getRol=(id)=>ALL_ROLES.find(r=>r.id===id)||{label:id};

  const toggleEquipo=(rolId)=>setEquiposConv(prev=>
    prev.includes(rolId)?prev.filter(x=>x!==rolId):[...prev,rolId]
  );
  const toggleCancion=(n)=>setSetlistSel(prev=>
    prev.includes(n)?prev.filter(x=>x!==n):[...prev,n]
  );

  const addItinerario=()=>setItinerario(prev=>[...prev,{id:Date.now(),hora:'',accion:''}]);
  const updItinerario=(id,field,val)=>setItinerario(prev=>
    prev.map(i=>i.id===id?{...i,[field]:val}:i)
  );
  const delItinerario=(id)=>setItinerario(prev=>prev.filter(i=>i.id!==id));

  const handleSave=()=>{
    if(!fecha){onToast('Selecciona una fecha');return;}
    if(!lugar.trim()){onToast('Ingresa el lugar');return;}
    onSave({
      fecha,hora,lugar,direccion,eventoId,duracion,
      equipos:equiposConv,setlist:setlistSel,
      itinerario:itinerario.filter(i=>i.accion.trim()),
      notas,
    });
  };

  const SEP=({label})=>(
    <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
      letterSpacing:'1.5px',marginTop:20,marginBottom:10,fontFamily:FONT}}>
      {label}
    </div>
  );

  return(
    <div>
      <div style={{fontSize:20,fontWeight:900,color:'var(--tx)',fontFamily:FONT,marginBottom:4}}>
        Crear Ensayo
      </div>
      <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT,marginBottom:18,lineHeight:1.4}}>
        Programa un ensayo, convoca equipos y conéctalo con un evento.
      </div>
      <SEP label="Fecha y hora"/>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <div style={{flex:2}}>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT,marginBottom:4}}>Fecha</div>
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,
              border:'1px solid var(--bd)',background:'var(--s1)',
              color:'var(--tx)',fontSize:13,fontFamily:FONT,boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT,marginBottom:4}}>Hora</div>
          <input type="time" value={hora} onChange={e=>setHora(e.target.value)}
            style={{width:'100%',padding:'9px 8px',borderRadius:10,
              border:'1px solid var(--bd)',background:'var(--s1)',
              color:'var(--tx)',fontSize:13,boxSizing:'border-box'}}/>
        </div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <div style={{flex:2}}>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT,marginBottom:4}}>Duración</div>
          <select value={duracion} onChange={e=>setDuracion(e.target.value)}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,
              border:'1px solid var(--bd)',background:'var(--s1)',
              color:'var(--tx)',fontSize:13,fontFamily:FONT}}>
            {['1h','1.5h','2h','2.5h','3h','4h','5h'].map(d=>(
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>
      <SEP label="Ubicación"/>
      <input value={lugar} onChange={e=>setLugar(e.target.value)}
        placeholder="Sala de ensayo, estudio..."
        style={{width:'100%',padding:'9px 12px',borderRadius:10,
          border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,fontFamily:FONT,
          marginBottom:8,boxSizing:'border-box'}}/>
      <input value={direccion} onChange={e=>setDireccion(e.target.value)}
        placeholder="Dirección completa (opcional)"
        style={{width:'100%',padding:'9px 12px',borderRadius:10,
          border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,fontFamily:FONT,
          boxSizing:'border-box'}}/>
      <SEP label="Conectar con evento"/>
      <select value={eventoId} onChange={e=>setEventoId(e.target.value)}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,
          border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,fontFamily:FONT}}>
        <option value="">— Sin evento asignado —</option>
        {gigs.filter(g=>g.tipo!=='ensayo').map(g=>(
          <option key={g.id} value={g.id}>{g.nombre} · {g.ciudad}</option>
        ))}
      </select>
      <SEP label="Equipos convocados"/>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:4}}>
        {ROLES_MUSICOS.map(r=>(
          <button key={r.id} onClick={()=>toggleEquipo(r.id)}
            style={{padding:'5px 10px',borderRadius:16,fontSize:11,fontWeight:700,
              fontFamily:FONT,cursor:'pointer',
              border:`1px solid ${equiposConv.includes(r.id)?'var(--ac)':'var(--bd)'}`,
              background:equiposConv.includes(r.id)?'rgba(200,169,126,.12)':'transparent',
              color:equiposConv.includes(r.id)?'var(--ac)':'var(--tx3)'}}>
            {r.label}
          </button>
        ))}
      </div>
      <div style={{height:1,background:'var(--bd)',margin:'8px 0'}}/>
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {EQUIPOS_TRABAJO.map(r=>(
          <button key={r.id} onClick={()=>toggleEquipo(r.id)}
            style={{padding:'5px 10px',borderRadius:16,fontSize:11,fontWeight:700,
              fontFamily:FONT,cursor:'pointer',
              border:`1px solid ${equiposConv.includes(r.id)?'var(--ac)':'var(--bd)'}`,
              background:equiposConv.includes(r.id)?'rgba(200,169,126,.12)':'transparent',
              color:equiposConv.includes(r.id)?'var(--ac)':'var(--tx3)'}}>
            {r.label}
          </button>
        ))}
      </div>
      <SEP label="Setlist a ensayar"/>
      {repertorio.map((c,i)=>{
        const sel=setlistSel.includes(c.n);
        return(
          <div key={i} onClick={()=>toggleCancion(c.n)}
            style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',
              borderRadius:10,marginBottom:5,cursor:'pointer',
              border:`1px solid ${sel?'var(--ac)':'var(--bd)'}`,
              background:sel?'rgba(200,169,126,.07)':'var(--s1)'}}>
            <div style={{width:18,height:18,borderRadius:9,flexShrink:0,
              border:`2px solid ${sel?'var(--ac)':'var(--bd)'}`,
              background:sel?'var(--ac)':'transparent',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              {sel&&<svg viewBox="0 0 24 24" width="10" height="10" fill="none"
                stroke="var(--bg)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--tx)',fontFamily:FONT}}>{c.n}</div>
              <div style={{fontSize:10,color:'var(--tx3)'}}>{c.key} · {c.bpm} BPM</div>
            </div>
          </div>
        );
      })}
      <SEP label="Itinerario del ensayo"/>
      {itinerario.map((item,i)=>(
        <div key={item.id} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
          <input value={item.hora} onChange={e=>updItinerario(item.id,'hora',e.target.value)}
            type="time"
            style={{width:80,padding:'7px 8px',borderRadius:8,
              border:'1px solid var(--bd)',background:'var(--s1)',
              color:'var(--tx)',fontSize:12,flexShrink:0}}/>
          <input value={item.accion} onChange={e=>updItinerario(item.id,'accion',e.target.value)}
            placeholder={`Acción ${i+1}`}
            style={{flex:1,padding:'7px 10px',borderRadius:8,
              border:'1px solid var(--bd)',background:'var(--s1)',
              color:'var(--tx)',fontSize:13,fontFamily:FONT}}/>
          <button onClick={()=>delItinerario(item.id)}
            style={{background:'transparent',border:'none',cursor:'pointer',
              color:'var(--tx3)',padding:4,flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
      <button onClick={addItinerario}
        style={{width:'100%',padding:'8px',borderRadius:8,
          border:'1px dashed var(--bd)',background:'transparent',
          color:'var(--tx3)',fontSize:12,fontWeight:700,
          cursor:'pointer',fontFamily:FONT,marginBottom:4}}>
        + Agregar acción
      </button>
      <SEP label="Notas adicionales"/>
      <textarea value={notas} onChange={e=>setNotas(e.target.value)}
        placeholder="Indicaciones, qué llevar, notas especiales..."
        rows={3}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,
          border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,fontFamily:FONT,
          resize:'none',boxSizing:'border-box',lineHeight:1.5}}/>
      <button onClick={handleSave}
        style={{width:'100%',padding:'13px',borderRadius:12,border:'none',
          background:'var(--ac)',color:'var(--bg)',fontSize:14,fontWeight:900,
          fontFamily:FONT,cursor:'pointer',marginTop:20,
          display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
          stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Crear Ensayo
      </button>
    </div>
  );
}
