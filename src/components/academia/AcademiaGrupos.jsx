// AcademiaGrupos: crear grupos, configurar los 3 niveles de cada grupo con
// toggles de permisos (sin niveles predefinidos fijos — el profesor arma cada
// nivel desde cero), e invitar alumnos al grupo.
import { useState } from 'react';
import { PERMISOS_DEFAULT } from './AcademiaApp';

// ── Catálogo de permisos disponibles, con etiqueta legible por idioma ──────
const PERMISOS_INFO=[
  {id:'verAcordes',          es:'Ver acordes',                en:'View chords'},
  {id:'estructuraVisible',   es:'Ver estructura (MAPA)',       en:'View structure (MAP)'},
  {id:'estructuraEditable',  es:'Editar estructura',           en:'Edit structure'},
  {id:'modoNashville',       es:'Modo Nashville',              en:'Nashville mode'},
  {id:'modoPractica',        es:'Modo Práctica',               en:'Practice mode'},
  {id:'anotacionesPropias',  es:'Anotaciones propias',         en:'Own annotations'},
  {id:'autoScroll',          es:'Auto Scroll',                 en:'Auto Scroll'},
];

export function AcademiaGrupos({grupos,setGrupos,alumnos,setAlumnos,isProfesor,onToast,lang='es'}){
  const [grupoSel,setGrupoSel]=useState(null);
  const [showNewGrupo,setShowNewGrupo]=useState(false);
  const [newGrupoNombre,setNewGrupoNombre]=useState('');
  const [nivelEditando,setNivelEditando]=useState(null); // id del nivel en edición
  const [showInvitar,setShowInvitar]=useState(false);
  const [inviteNombre,setInviteNombre]=useState('');
  const [inviteEmail,setInviteEmail]=useState('');

  const NIVELES_DEFAULT=()=>[
    {id:'n1',nombre:lang==='en'?'Level 1':'Nivel 1',permisos:{...PERMISOS_DEFAULT}},
    {id:'n2',nombre:lang==='en'?'Level 2':'Nivel 2',permisos:{...PERMISOS_DEFAULT}},
    {id:'n3',nombre:lang==='en'?'Level 3':'Nivel 3',permisos:{...PERMISOS_DEFAULT}},
  ];

  const togglePermiso=(grupoId,nivelId,permisoId)=>{
    setGrupos(prev=>prev.map(g=>g.id!==grupoId?g:{
      ...g,
      niveles:g.niveles.map(n=>n.id!==nivelId?n:{
        ...n,permisos:{...n.permisos,[permisoId]:!n.permisos[permisoId]}
      })
    }));
  };

  const renombrarNivel=(grupoId,nivelId,nombre)=>{
    setGrupos(prev=>prev.map(g=>g.id!==grupoId?g:{
      ...g,
      niveles:g.niveles.map(n=>n.id!==nivelId?n:{...n,nombre})
    }));
  };

  const cambiarNivelActivo=(grupoId,nivelId)=>{
    setGrupos(prev=>prev.map(g=>g.id!==grupoId?g:{...g,nivelActivo:nivelId}));
  };

  // ── Detalle de un grupo ──────────────────────────────────────────────────
  if(grupoSel){
    const g=grupos.find(x=>x.id===grupoSel);
    if(!g)return null;
    const alumnosDelGrupo=alumnos.filter(a=>g.alumnos.includes(a.id));
    const alumnosFuera=alumnos.filter(a=>!g.alumnos.includes(a.id));

    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}}
          onClick={()=>{setGrupoSel(null);setNivelEditando(null);setShowInvitar(false);}}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)'}}>
            {lang==='en'?'Groups':'Grupos'}
          </span>
        </div>

        <h2 style={{margin:'0 0 4px',fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:20,color:'var(--tx)'}}>
          {g.nombre}
        </h2>
        <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:300,color:'var(--tx3)',marginBottom:18}}>
          {alumnosDelGrupo.length} {lang==='en'?(alumnosDelGrupo.length===1?'student':'students'):(alumnosDelGrupo.length===1?'alumno':'alumnos')}
        </div>

        {/* ── Niveles del grupo ────────────────────────────────────────── */}
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
          textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
          {lang==='en'?'Levels':'Niveles'}
        </div>
        <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)',lineHeight:1.4,marginBottom:12}}>
          {lang==='en'
            ?'Configure what each level can see and do. There are no fixed levels — build each one from scratch.'
            :'Configura qué puede ver y hacer cada nivel. No hay niveles fijos — arma cada uno desde cero.'}
        </div>
        {g.niveles.map(n=>{
          const esActivo=g.nivelActivo===n.id;
          const enEdicion=nivelEditando===n.id;
          return(
            <div key={n.id} style={{padding:'12px',borderRadius:14,
              border:`1px solid ${esActivo?'rgba(255,255,255,.3)':'var(--bd)'}`,
              background:'var(--s1)',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:enEdicion?10:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                  {enEdicion?(
                    <input autoFocus value={n.nombre}
                      onChange={e=>renombrarNivel(g.id,n.id,e.target.value)}
                      onBlur={()=>setNivelEditando(null)}
                      style={{flex:1,padding:'5px 8px',borderRadius:6,border:'1px solid var(--bd)',
                        background:'var(--s2)',color:'var(--tx)',fontSize:13,fontWeight:700,
                        fontFamily:"'Lexend Giga',sans-serif"}}/>
                  ):(
                    <div onClick={()=>isProfesor&&setNivelEditando(n.id)}
                      style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:14,fontWeight:700,color:'var(--tx)',
                        cursor:isProfesor?'pointer':'default'}}>
                      {n.nombre}
                    </div>
                  )}
                  {esActivo&&(
                    <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:9,fontWeight:700,padding:'2px 7px',
                      borderRadius:10,background:'rgba(255,255,255,.08)',color:'var(--tx)',
                      border:'1px solid rgba(255,255,255,.15)',flexShrink:0}}>
                      {lang==='en'?'ACTIVE':'ACTIVO'}
                    </span>
                  )}
                </div>
                {isProfesor&&!esActivo&&(
                  <button onClick={()=>cambiarNivelActivo(g.id,n.id)}
                    style={{fontSize:10,fontWeight:700,color:'var(--tx3)',background:'transparent',
                      border:'1px solid var(--bd)',borderRadius:8,padding:'4px 9px',cursor:'pointer',
                      fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
                    {lang==='en'?'Set active':'Activar'}
                  </button>
                )}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:10}}>
                {PERMISOS_INFO.map(p=>(
                  <div key={p.id}
                    onClick={()=>isProfesor&&togglePermiso(g.id,n.id,p.id)}
                    style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                      cursor:isProfesor?'pointer':'default',padding:'4px 2px'}}>
                    <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:300,color:'var(--tx2)'}}>
                      {lang==='en'?p.en:p.es}
                    </span>
                    <div style={{width:34,height:18,borderRadius:10,flexShrink:0,
                      background:n.permisos[p.id]?'var(--ac)':'var(--s2)',
                      border:'1px solid var(--bd)',position:'relative',transition:'background .15s'}}>
                      <div style={{position:'absolute',top:1,
                        left:n.permisos[p.id]?17:1,width:14,height:14,borderRadius:7,
                        background:'#fff',transition:'left .15s'}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* ── Alumnos del grupo ────────────────────────────────────────── */}
        <div style={{height:1,background:'var(--bd)',margin:'18px 0 14px'}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',
            textTransform:'uppercase',letterSpacing:'1.5px'}}>
            {lang==='en'?'Students':'Alumnos'}
          </div>
          {isProfesor&&(
            <button onClick={()=>setShowInvitar(v=>!v)}
              style={{fontSize:11,fontWeight:700,color:'var(--tx)',background:'transparent',
                border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {showInvitar?(lang==='en'?'Cancel':'Cancelar'):`+ ${lang==='en'?'Invite':'Invitar'}`}
            </button>
          )}
        </div>

        {showInvitar&&isProfesor&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s2)',marginBottom:12}}>
            <input value={inviteNombre} onChange={e=>setInviteNombre(e.target.value)}
              placeholder={lang==='en'?'Student name':'Nombre del alumno'}
              style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid var(--bd)',
                background:'var(--s1)',color:'var(--tx)',fontSize:13,marginBottom:8,
                boxSizing:'border-box',fontFamily:"'Lexend Giga',sans-serif"}}/>
            <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}
              placeholder={lang==='en'?'Email':'Correo electrónico'}
              style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid var(--bd)',
                background:'var(--s1)',color:'var(--tx)',fontSize:13,marginBottom:10,
                boxSizing:'border-box',fontFamily:"'Lexend Giga',sans-serif"}}/>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,color:'var(--tx3)',
              lineHeight:1.4,marginBottom:10}}>
              {lang==='en'
                ?'The student receives an invitation to join with a Free account. Real email delivery requires the upcoming notifications backend — for now this is simulated.'
                :'El alumno recibe una invitación para unirse con una cuenta Free. El envío real de correo depende del backend de notificaciones (próximo) — por ahora esto es simulado.'}
            </div>
            <button onClick={()=>{
                if(!inviteNombre.trim()||!inviteEmail.trim()){
                  onToast(lang==='en'?'Enter name and email':'Ingresa nombre y correo');return;
                }
                const id=Date.now();
                setAlumnos(prev=>[...prev,{id,nombre:inviteNombre.trim(),email:inviteEmail.trim(),estado:'invitado'}]);
                setGrupos(prev=>prev.map(p=>p.id===g.id?{...p,alumnos:[...p.alumnos,id]}:p));
                setInviteNombre('');setInviteEmail('');setShowInvitar(false);
                onToast(`✓ ${lang==='en'?'Invitation sent to':'Invitación enviada a'} ${inviteNombre.trim()}`);
              }}
              style={{width:'100%',padding:'9px',borderRadius:8,border:'none',
                background:'var(--tx)',color:'var(--bg)',fontSize:13,fontWeight:700,
                cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {lang==='en'?'Send invitation':'Enviar invitación'}
            </button>
          </div>
        )}

        {alumnosDelGrupo.length===0?(
          <div style={{textAlign:'center',padding:'20px 0',color:'var(--tx3)',fontSize:12,
            fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
            {lang==='en'?'No students in this group yet':'Sin alumnos en este grupo todavía'}
          </div>
        ):alumnosDelGrupo.map(a=>(
          <div key={a.id} style={{display:'flex',alignItems:'center',gap:12,
            padding:'10px 12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:8}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:14,fontWeight:400,color:'var(--tx)'}}>{a.nombre}</div>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)'}}>{a.email}</div>
            </div>
            <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:9,fontWeight:700,padding:'2px 8px',
              borderRadius:10,flexShrink:0,
              background:a.estado==='activo'?'rgba(120,255,180,.1)':'rgba(255,255,255,.06)',
              color:a.estado==='activo'?'var(--gn)':'var(--tx3)',
              border:`1px solid ${a.estado==='activo'?'rgba(120,255,180,.25)':'var(--bd)'}`}}>
              {a.estado==='activo'?(lang==='en'?'ACTIVE':'ACTIVO'):(lang==='en'?'INVITED':'INVITADO')}
            </span>
            {isProfesor&&(
              <button onClick={()=>{
                  setGrupos(prev=>prev.map(p=>p.id===g.id?{...p,alumnos:p.alumnos.filter(id=>id!==a.id)}:p));
                  onToast(`${a.nombre} ${lang==='en'?'removed from group':'eliminado del grupo'}`);
                }}
                style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--tx3)',padding:4,flexShrink:0}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        ))}

        {isProfesor&&alumnosFuera.length>0&&!showInvitar&&(
          <div style={{marginTop:14}}>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)',marginBottom:8}}>
              {lang==='en'?'Add existing student to this group:':'Agregar alumno existente a este grupo:'}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {alumnosFuera.map(a=>(
                <button key={a.id}
                  onClick={()=>{
                    setGrupos(prev=>prev.map(p=>p.id===g.id?{...p,alumnos:[...p.alumnos,a.id]}:p));
                    onToast(`✓ ${a.nombre} ${lang==='en'?'added':'agregado'}`);
                  }}
                  style={{padding:'5px 11px',borderRadius:20,fontSize:11,fontWeight:600,
                    border:'1px solid var(--bd)',background:'transparent',color:'var(--tx3)',
                    cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                  + {a.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Lista de grupos ──────────────────────────────────────────────────────
  return(
    <div>
      <div className="ph" style={{marginBottom:16,alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05}}>
            {lang==='en'?'Groups':'Grupos'}
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginTop:5}}>
            {grupos.length} {lang==='en'?(grupos.length===1?'group':'groups'):(grupos.length===1?'grupo':'grupos')}
          </div>
        </div>
        {isProfesor&&(
          <button onClick={()=>setShowNewGrupo(v=>!v)}
            style={{padding:'8px 14px',borderRadius:100,border:'1px solid rgba(255,255,255,.15)',
              background:'rgba(255,255,255,.06)',color:'var(--tx)',fontSize:11,
              fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
            {showNewGrupo?(lang==='en'?'Cancel':'Cancelar'):`+ ${lang==='en'?'New':'Nuevo'}`}
          </button>
        )}
      </div>

      {showNewGrupo&&isProfesor&&(
        <div style={{padding:'14px',borderRadius:14,border:'1px solid var(--bd)',
          background:'var(--s2)',marginBottom:16}}>
          <input value={newGrupoNombre} onChange={e=>setNewGrupoNombre(e.target.value)}
            placeholder={lang==='en'?'E.g: Guitar Saturdays, Advanced Thursdays...':'Ej: Guitarra Sábados, Avanzados Jueves...'}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,marginBottom:10,
              boxSizing:'border-box',fontFamily:"'Lexend Giga',sans-serif"}}/>
          <button onClick={()=>{
              if(!newGrupoNombre.trim()){onToast(lang==='en'?'Enter a name':'Ingresa un nombre');return;}
              const id='g'+Date.now();
              setGrupos(prev=>[...prev,{id,nombre:newGrupoNombre.trim(),alumnos:[],niveles:NIVELES_DEFAULT(),nivelActivo:'n1'}]);
              setNewGrupoNombre('');setShowNewGrupo(false);
              onToast(`✓ ${lang==='en'?'Group created':'Grupo creado'}`);
            }}
            style={{width:'100%',padding:'9px',borderRadius:8,border:'none',
              background:'var(--tx)',color:'var(--bg)',fontSize:13,fontWeight:700,
              cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
            {lang==='en'?'Create group':'Crear grupo'}
          </button>
        </div>
      )}

      {grupos.length===0?(
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--tx3)',fontSize:13,
          fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
          {lang==='en'?'No groups yet':'Sin grupos todavía'}
        </div>
      ):grupos.map(g=>{
        const nivelActivo=g.niveles.find(n=>n.id===g.nivelActivo);
        return(
          <div key={g.id} onClick={()=>setGrupoSel(g.id)}
            style={{display:'flex',alignItems:'center',gap:12,padding:'14px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              marginBottom:10,cursor:'pointer'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:15,color:'var(--tx)',
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {g.nombre}
              </div>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)',marginTop:2}}>
                {g.alumnos.length} {lang==='en'?'students':'alumnos'} · {g.niveles.length} {lang==='en'?'levels':'niveles'}
              </div>
              {nivelActivo&&(
                <span style={{display:'inline-block',marginTop:6,fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,
                  padding:'2px 8px',borderRadius:10,background:'rgba(255,255,255,.06)',
                  color:'var(--tx)',border:'1px solid rgba(255,255,255,.12)'}}>
                  {lang==='en'?'Active':'Activo'}: {nivelActivo.nombre}
                </span>
              )}
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2" style={{flexShrink:0}}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        );
      })}
    </div>
  );
}
