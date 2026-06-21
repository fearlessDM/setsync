// Fechas: vista única de eventos para Iglesia y Banda (antes: AdminView.jsx
// + BandaFechas.jsx). Opera sobre el esquema unificado de evento
// (ver data/eventos-schema.js). Vocabulario/etiquetas vía data/modo.js.
import { useState } from 'react';
import { getModoTexto, getTiposEventoDisponibles } from '../data/modo';

export function Fechas({eventos=[],setEventos=()=>{},personas=[],isAdmin,onToast,mode,lang='es',onOpenSong}){
  const vx=getModoTexto(mode,lang);
  const tipos=getTiposEventoDisponibles(mode,lang);
  const [selId,setSelId]=useState(null);
  const [mesActivo,setMesActivo]=useState(new Date().getMonth());

  const tipoLabel=(tipo)=>tipos.find(t=>t.tipo===tipo)?.label||tipo;
  const tipoColor=(tipo)=>({
    culto:'var(--ac)',especial:'var(--gn)',ensayo:'var(--tx2)',
    gig:'var(--ac)',festival:'var(--gn)',sesion:'var(--tx2)',
  }[tipo]||'var(--ac)');

  const eventosConFecha=eventos.filter(e=>!!e.fecha);
  const porMes=eventosConFecha.filter(e=>new Date(e.fecha).getMonth()===mesActivo||eventosConFecha.length<4)
    .sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));

  const mesesEs=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesesEn=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const mesNombre=(lang==='en'?mesesEn:mesesEs)[mesActivo];
  const mesActual=new Date().getMonth();

  const MonthStrip=()=>(
    <div style={{display:'flex',overflowX:'auto',gap:0,padding:'0',scrollbarWidth:'none',
      background:'rgba(8,7,14,.28)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',
      boxShadow:'inset 0 -1px 0 rgba(255,255,255,.06)',position:'sticky',top:0,zIndex:40,marginBottom:14,borderRadius:10}}>
      {(lang==='en'?mesesEn:mesesEs).map((m,i)=>{
        const count=eventosConFecha.filter(e=>new Date(e.fecha).getMonth()===i).length;
        return(
          <div key={m} onClick={()=>setMesActivo(i)}
            style={{flex:1,padding:'5px 2px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,
              margin:'3px 1px',borderRadius:5,border:'1px solid transparent',
              background:mesActivo===i?'rgba(200,169,126,.12)':i===mesActual?'rgba(200,169,126,.07)':'transparent',minWidth:32}}>
            <span style={{fontSize:8,fontWeight:mesActivo===i?700:i===mesActual?600:400,
              color:mesActivo===i?'var(--ac)':i===mesActual?'rgba(200,169,126,.65)':'var(--tx3)',
              textTransform:'uppercase',letterSpacing:'.3px'}}>{m.slice(0,3)}</span>
            {count>0?(<span style={{fontSize:8,fontWeight:700,color:mesActivo===i?'var(--ac)':'rgba(255,255,255,.4)',lineHeight:1}}>{count}</span>):null}
          </div>
        );
      })}
    </div>
  );


  // ── Detalle de un evento ─────────────────────────────────────────────
  if(selId){
    const ev=eventos.find(x=>x.id===selId);
    if(!ev)return null;
    const d=ev.fecha?new Date(ev.fecha):null;
    const personasConvocadas=personas.filter(p=>
      !ev.equiposConvocados || ev.equiposConvocados.length===0 ||
      ev.equiposConvocados.includes(p.rol) || ev.equiposConvocados.includes(p.equipoId)
    );

    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}}
          onClick={()=>setSelId(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)'}}>{vx.evento.plural}</span>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <h2 style={{margin:0,fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:18,color:'var(--tx)'}}>{ev.nombre}</h2>
            <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,padding:'2px 8px',borderRadius:10,
              background:'rgba(0,0,0,.3)',color:tipoColor(ev.tipo),
              border:`1px solid ${tipoColor(ev.tipo)}44`,textTransform:'uppercase'}}>
              {tipoLabel(ev.tipo)}
            </span>
          </div>
          {d&&(
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)'}}>
              {d.toLocaleDateString(lang==='en'?'en-US':'es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </div>
          )}
          {(ev.lugar||ev.ciudad)&&(
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',marginTop:2}}>
              {[ev.lugar,ev.ciudad].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {ev.equiposConvocados&&ev.equiposConvocados.length>0&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
              {lang==='en'?`${vx.equipoPersona.plural} convened`:`${vx.equipoPersona.plural} convocados`}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {ev.equiposConvocados.map(eq=>(
                <span key={eq} style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:200,padding:'4px 10px',
                  borderRadius:16,background:'rgba(255,255,255,.06)',color:'var(--tx)',border:'1px solid rgba(255,255,255,.12)'}}>
                  {eq}
                </span>
              ))}
            </div>
          </div>
        )}

        {personasConvocadas.length>0&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
              {lang==='en'?'People convened':'Personas convocadas'}
            </div>
            {personasConvocadas.map(p=>(
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:400,color:'var(--tx)'}}>{p.nombre}</span>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx2)'}}>{p.rol}</span>
              </div>
            ))}
          </div>
        )}

        {ev.setlist&&ev.setlist.length>0&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>Setlist</div>
            {ev.setlist.map((s,i)=>(
              <div key={i} onClick={()=>onOpenSong&&onOpenSong(i, ev.setlist)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:'1px solid var(--bd)',
                  cursor:onOpenSong?'pointer':'default'}}>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:300,color:'var(--tx3)',width:20,textAlign:'right'}}>{i+1}</span>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:400,color:'var(--tx)',flex:1}}>{s.name||s}</span>
                {s.key&&<span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)'}}>{s.key}</span>}
              </div>
            ))}
          </div>
        )}

        {ev.ensayosPrevios&&ev.ensayosPrevios.length>0&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
              {lang==='en'?'Previous rehearsals':'Ensayos previos'}
            </div>
            {ev.ensayosPrevios.map((e,i)=>{
              const ed=new Date(e.fecha);
              return(
                <div key={i} style={{padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                  <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:400,color:'var(--tx)'}}>{e.lugar}</div>
                  <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)'}}>
                    {ed.toLocaleDateString(lang==='en'?'en-US':'es-CL',{day:'numeric',month:'short'})} · {e.duracion}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {ev.notas&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>
              {lang==='en'?'Notes':'Notas'}
            </div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:300,color:'var(--tx2)',lineHeight:1.5}}>{ev.notas}</div>
          </div>
        )}
      </div>
    );
  }

  // ── Lista de eventos ─────────────────────────────────────────────────
  return(
    <div>
      <MonthStrip/>
      <div className="ph" style={{marginBottom:16,alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05}}>
            {vx.evento.plural} {lang==='en'?'in':'en'} <span style={{color:'var(--ac)'}}>{mesNombre}</span>
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginTop:5}}>
            {porMes.length} {lang==='en'?'tap one to view details':'toca uno para ver el detalle'}
          </div>
        </div>
        {isAdmin&&(
          <button onClick={()=>onToast(lang==='en'?'Create event — coming soon':'Crear evento — próximamente')}
            style={{padding:'8px 14px',borderRadius:100,border:'1px solid rgba(255,255,255,.15)',
              background:'rgba(255,255,255,.06)',color:'var(--tx)',fontSize:11,fontWeight:700,
              cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
            + {lang==='en'?'New':'Nuevo'}
          </button>
        )}
      </div>

      {porMes.length===0?(
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--tx3)',fontSize:13,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
          {lang==='en'?'No events scheduled':'Sin eventos programados'}
        </div>
      ):porMes.map(ev=>{
        const d=new Date(ev.fecha);
        return(
          <div key={ev.id} onClick={()=>setSelId(ev.id)}
            style={{display:'flex',gap:12,padding:'14px',borderRadius:14,border:'1px solid var(--bd)',
              background:'var(--s1)',marginBottom:10,cursor:'pointer'}}>
            <div style={{width:46,flexShrink:0,textAlign:'center',borderRight:'1px solid var(--bd)',paddingRight:12}}>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:20,color:'var(--tx)',lineHeight:1}}>{d.getDate()}</div>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:9,color:'var(--tx3)',fontWeight:300,letterSpacing:'.5px'}}>
                {['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][d.getDay()]}
              </div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:15,color:'var(--tx)',
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ev.nombre}</div>
              {(ev.lugar||ev.ciudad)&&(
                <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)',marginTop:2}}>
                  {[ev.lugar,ev.ciudad].filter(Boolean).join(' · ')}
                </div>
              )}
              <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,padding:'2px 7px',borderRadius:10,
                  background:`${tipoColor(ev.tipo)}18`,color:tipoColor(ev.tipo),border:`1px solid ${tipoColor(ev.tipo)}33`}}>
                  {tipoLabel(ev.tipo).toUpperCase()}
                </span>
                {ev.setlist&&ev.setlist.length>0&&(
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,color:'var(--tx3)',padding:'2px 7px',borderRadius:10,border:'1px solid var(--bd)'}}>
                    {ev.setlist.length} {lang==='en'?'songs':'canciones'}
                  </span>
                )}
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2" style={{flexShrink:0,alignSelf:'center'}}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        );
      })}
    </div>
  );
}
