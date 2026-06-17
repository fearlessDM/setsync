// AcademiaFechas: gestión de clases (equivalente a BandaFechas) con setlist
// asociado al grupo de alumnos correspondiente, más evaluación/comentarios
// post-clase — pieza nueva sin equivalente en Banda/Iglesia.
import { useState } from 'react';

export function AcademiaFechas({clases,setClases,alumnos,grupos,repertorio,isProfesor,onToast,onOpenSong,lang='es'}){
  const [selClase,setSelClase]=useState(null);
  const [showEvaluar,setShowEvaluar]=useState(false);
  const [evalAlumno,setEvalAlumno]=useState('');
  const [evalComentario,setEvalComentario]=useState('');

  const mesesEs=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesesEn=['January','February','March','April','May','June','July','August','September','October','November','December'];

  const clasesOrdenadas=[...clases].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));

  // ── Detalle de una clase ─────────────────────────────────────────────────
  if(selClase){
    const c=clases.find(x=>x.id===selClase);
    if(!c)return null;
    const d=new Date(c.fecha);
    const grupo=grupos.find(g=>g.id===c.grupoId);
    const alumnosDelGrupo=grupo?alumnos.filter(a=>grupo.alumnos.includes(a.id)):[];
    const setlistConDatos=c.setlist.map(nombre=>repertorio.find(r=>r.n===nombre)).filter(Boolean);

    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}}
          onClick={()=>{setSelClase(null);setShowEvaluar(false);}}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)'}}>
            {lang==='en'?'Classes':'Clases'}
          </span>
        </div>

        <div style={{marginBottom:16}}>
          <h2 style={{margin:'0 0 4px',fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:18,color:'var(--tx)'}}>
            {c.nombre}
          </h2>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)'}}>
            {d.toLocaleDateString(lang==='en'?'en-US':'es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',marginTop:2}}>
            {c.lugar}{grupo&&` · ${grupo.nombre}`}
          </div>
        </div>

        {setlistConDatos.length>0&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
              {lang==='en'?'Setlist':'Setlist'}
            </div>
            {setlistConDatos.map((s,i)=>(
              <div key={i} onClick={()=>onOpenSong&&onOpenSong(repertorio.indexOf(s),c.grupoId)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'8px 4px',
                  borderBottom:i<setlistConDatos.length-1?'1px solid var(--bd)':'none',
                  cursor:onOpenSong?'pointer':'default'}}>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:300,color:'var(--tx3)',
                  width:20,textAlign:'right'}}>{i+1}</span>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:400,color:'var(--tx)',flex:1}}>{s.n}</span>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)'}}>{s.key}</span>
              </div>
            ))}
          </div>
        )}

        {grupo&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
              {lang==='en'?'Students in this class':'Alumnos de esta clase'}
            </div>
            {alumnosDelGrupo.map(a=>(
              <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:400,color:'var(--tx)'}}>{a.nombre}</span>
              </div>
            ))}
            {alumnosDelGrupo.length===0&&(
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,color:'var(--tx3)'}}>
                {lang==='en'?'No students assigned':'Sin alumnos asignados'}
              </div>
            )}
          </div>
        )}

        {c.notas&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>
              {lang==='en'?'Notes':'Notas'}
            </div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:300,color:'var(--tx2)',lineHeight:1.5}}>{c.notas}</div>
          </div>
        )}

        {/* ── Evaluación post-clase ────────────────────────────────────── */}
        <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
          background:'var(--s1)',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
              textTransform:'uppercase',letterSpacing:'1px'}}>
              {lang==='en'?'Assessment':'Evaluación'}
            </div>
            {isProfesor&&(
              <button onClick={()=>setShowEvaluar(v=>!v)}
                style={{fontSize:11,fontWeight:700,color:'var(--tx)',background:'transparent',
                  border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                {showEvaluar?(lang==='en'?'Cancel':'Cancelar'):`+ ${lang==='en'?'Add':'Agregar'}`}
              </button>
            )}
          </div>

          {showEvaluar&&isProfesor&&(
            <div style={{marginBottom:12}}>
              <select value={evalAlumno} onChange={e=>setEvalAlumno(e.target.value)}
                style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid var(--bd)',
                  background:'var(--s2)',color:'var(--tx)',fontSize:13,marginBottom:8,
                  fontFamily:"'Lexend Giga',sans-serif"}}>
                <option value="">— {lang==='en'?'Select student':'Seleccionar alumno'} —</option>
                {alumnosDelGrupo.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
              <textarea value={evalComentario} onChange={e=>setEvalComentario(e.target.value)}
                placeholder={lang==='en'?'Comment about this student\'s progress...':'Comentario sobre el avance del alumno...'}
                rows={3}
                style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
                  background:'var(--s2)',color:'var(--tx)',fontSize:13,resize:'none',
                  boxSizing:'border-box',lineHeight:1.5,marginBottom:8,fontFamily:"'Lexend Giga',sans-serif"}}/>
              <button onClick={()=>{
                  if(!evalAlumno||!evalComentario.trim()){
                    onToast(lang==='en'?'Select a student and write a comment':'Selecciona un alumno y escribe un comentario');return;
                  }
                  const alumno=alumnos.find(a=>a.id===Number(evalAlumno));
                  setClases(prev=>prev.map(p=>p.id!==c.id?p:{
                    ...p,evaluaciones:[...p.evaluaciones,{id:Date.now(),alumnoId:Number(evalAlumno),comentario:evalComentario.trim(),fecha:new Date().toISOString()}]
                  }));
                  setEvalAlumno('');setEvalComentario('');setShowEvaluar(false);
                  onToast(`✓ ${lang==='en'?'Assessment saved for':'Evaluación guardada para'} ${alumno?.nombre||''}`);
                }}
                style={{width:'100%',padding:'9px',borderRadius:8,border:'none',
                  background:'var(--tx)',color:'var(--bg)',fontSize:13,fontWeight:700,
                  cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                {lang==='en'?'Save assessment':'Guardar evaluación'}
              </button>
            </div>
          )}

          {c.evaluaciones.length===0?(
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:300,color:'var(--tx3)'}}>
              {lang==='en'?'No assessments yet':'Sin evaluaciones todavía'}
            </div>
          ):c.evaluaciones.map(ev=>{
            const alumno=alumnos.find(a=>a.id===ev.alumnoId);
            return(
              <div key={ev.id} style={{padding:'8px 0',borderBottom:'1px solid var(--bd)'}}>
                <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:700,color:'var(--tx)',marginBottom:3}}>
                  {alumno?.nombre||'—'}
                </div>
                <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:300,color:'var(--tx2)',lineHeight:1.4}}>
                  {ev.comentario}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Lista de clases ──────────────────────────────────────────────────────
  return(
    <div>
      <div className="ph" style={{marginBottom:16,alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05}}>
            {lang==='en'?'Classes':'Clases'}
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginTop:5}}>
            {clasesOrdenadas.length} {lang==='en'?(clasesOrdenadas.length===1?'class':'classes'):(clasesOrdenadas.length===1?'clase':'clases')} · {lang==='en'?'Tap one to view details':'Toca una para ver el detalle'}
          </div>
        </div>
        {isProfesor&&(
          <button onClick={()=>onToast(lang==='en'?'Create class — coming soon':'Crear clase — próximamente')}
            style={{padding:'8px 14px',borderRadius:100,border:'1px solid rgba(255,255,255,.15)',
              background:'rgba(255,255,255,.06)',color:'var(--tx)',fontSize:11,
              fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
            + {lang==='en'?'New':'Nueva'}
          </button>
        )}
      </div>

      {clasesOrdenadas.length===0?(
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--tx3)',fontSize:13,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
          {lang==='en'?'No classes scheduled':'Sin clases programadas'}
        </div>
      ):clasesOrdenadas.map(c=>{
        const d=new Date(c.fecha);
        const grupo=grupos.find(g=>g.id===c.grupoId);
        return(
          <div key={c.id} onClick={()=>setSelClase(c.id)}
            style={{display:'flex',gap:12,padding:'14px',
              borderRadius:14,border:'1px solid var(--bd)',
              background:'var(--s1)',marginBottom:10,cursor:'pointer'}}>
            <div style={{width:46,flexShrink:0,textAlign:'center',
              borderRight:'1px solid var(--bd)',paddingRight:12}}>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:20,color:'var(--tx)',lineHeight:1}}>
                {d.getDate()}
              </div>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:9,color:'var(--tx3)',fontWeight:300,letterSpacing:'.5px'}}>
                {['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][d.getDay()]}
              </div>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:9,color:'var(--tx3)',fontWeight:300}}>
                {(lang==='en'?mesesEn:mesesEs)[d.getMonth()].slice(0,3).toUpperCase()}
              </div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:15,color:'var(--tx)',
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {c.nombre}
              </div>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)',marginTop:2}}>
                {c.lugar}{grupo&&` · ${grupo.nombre}`}
              </div>
              <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                {c.setlist&&c.setlist.length>0&&(
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,color:'var(--tx3)',
                    padding:'2px 7px',borderRadius:10,border:'1px solid var(--bd)'}}>
                    {c.setlist.length} {lang==='en'?'songs':'canciones'}
                  </span>
                )}
                {c.evaluaciones&&c.evaluaciones.length>0&&(
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,color:'var(--tx3)',
                    padding:'2px 7px',borderRadius:10,border:'1px solid var(--bd)'}}>
                    {c.evaluaciones.length} {lang==='en'?'assessments':'evaluaciones'}
                  </span>
                )}
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2" style={{flexShrink:0,alignSelf:'center'}}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        );
      })}
    </div>
  );
}
