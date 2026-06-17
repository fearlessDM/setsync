// AcademiaBackstage: vista inicial del modo Academia, menú grid + gestión
// general de alumnos (equivalente a la gestión de equipo en BandaBackstage).
import { useState } from 'react';

export function AcademiaBackstage({alumnos,setAlumnos,grupos,setGrupos,clases,setClases,repertorio=[],isProfesor,onToast,lang='es'}){
  const [bsView,setBsView]=useState(null);
  const [subView,setSubView]=useState(null); // 'agregar'
  const [nuevoNombre,setNuevoNombre]=useState('');
  const [nuevoEmail,setNuevoEmail]=useState('');

  const MENU=[
    {id:'clase',    label:lang==='en'?'Create Class':'Crear Clase',          sub:lang==='en'?'Date, place, group and setlist':'Fecha, lugar, grupo y setlist'},
    {id:'grupo',    label:lang==='en'?'Create Group':'Crear Grupo',          sub:lang==='en'?'Levels and permissions':'Niveles y permisos'},
    {id:'alumnos',  label:lang==='en'?'Manage Students':'Gestión de Alumnos',sub:lang==='en'?'Invite and remove':'Invitar y eliminar'},
    {id:'notif',    label:lang==='en'?'Notifications':'Notificaciones',      sub:lang==='en'?'Notify your students':'Avisar a tus alumnos'},
    {id:'config',   label:lang==='en'?'Settings':'Configuración',           sub:lang==='en'?'Academy settings':'Ajustes de la academia'},
  ];

  // ── Gestión de alumnos ───────────────────────────────────────────────────
  if(bsView==='alumnos') return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}}
        onClick={()=>{setBsView(null);setSubView(null);}}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>

      <div className="ph">
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:400,color:'var(--tx)',
            fontFamily:"'Special Gothic Expanded One',sans-serif"}}>
            {lang==='en'?'Manage Students':'Gestión de Alumnos'}
          </h2>
          <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>
            {alumnos.length} {lang==='en'?'students':'alumnos'} · {grupos.length} {lang==='en'?'groups':'grupos'}
          </div>
        </div>
        {isProfesor&&(
          <button onClick={()=>setSubView(v=>v==='agregar'?null:'agregar')}
            style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,
              border:'1px solid var(--ac)',background:'rgba(200,169,126,.08)',
              color:'var(--ac)',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
            + {lang==='en'?'Student':'Alumno'}
          </button>
        )}
      </div>

      {subView==='agregar'&&isProfesor&&(
        <div style={{padding:'14px',borderRadius:14,border:'1px solid var(--bd)',
          background:'var(--s2)',marginBottom:16}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
            letterSpacing:'1px',marginBottom:10}}>
            {lang==='en'?'New student':'Nuevo alumno'}
          </div>
          <input value={nuevoNombre} onChange={e=>setNuevoNombre(e.target.value)}
            placeholder={lang==='en'?'Name':'Nombre'}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,
              marginBottom:8,boxSizing:'border-box',fontFamily:"'Lexend Giga',sans-serif"}}/>
          <input value={nuevoEmail} onChange={e=>setNuevoEmail(e.target.value)}
            placeholder={lang==='en'?'Email':'Correo electrónico'}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,
              marginBottom:8,boxSizing:'border-box',fontFamily:"'Lexend Giga',sans-serif"}}/>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setSubView(null);setNuevoNombre('');setNuevoEmail('');}}
              style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid var(--bd)',
                background:'transparent',color:'var(--tx3)',fontSize:13,
                fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {lang==='en'?'Cancel':'Cancelar'}
            </button>
            <button onClick={()=>{
                if(!nuevoNombre.trim()||!nuevoEmail.trim()){
                  onToast(lang==='en'?'Enter name and email':'Ingresa nombre y correo');return;
                }
                setAlumnos(prev=>[...prev,{id:Date.now(),nombre:nuevoNombre.trim(),email:nuevoEmail.trim(),estado:'invitado'}]);
                setNuevoNombre('');setNuevoEmail('');setSubView(null);
                onToast(`✓ ${nuevoNombre.trim()} ${lang==='en'?'invited':'invitado'}`);
              }} style={{flex:2,padding:'9px',borderRadius:10,border:'none',
                background:'var(--ac)',color:'var(--bg)',fontSize:13,fontWeight:700,
                cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {lang==='en'?'Invite':'Invitar'}
            </button>
          </div>
        </div>
      )}

      {alumnos.map(a=>{
        const gruposDelAlumno=grupos.filter(g=>g.alumnos.includes(a.id));
        return(
          <div key={a.id} style={{display:'flex',alignItems:'center',gap:12,
            padding:'10px 12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:8}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:400,color:'var(--tx)',
                fontFamily:"'Lexend Giga',sans-serif"}}>{a.nombre}</div>
              <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>{a.email}</div>
              {gruposDelAlumno.length>0&&(
                <div style={{fontSize:10,color:'var(--tx2)',fontFamily:"'Lexend Giga',sans-serif",marginTop:3}}>
                  {gruposDelAlumno.map(g=>g.nombre).join(', ')}
                </div>
              )}
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
                  setAlumnos(prev=>prev.filter(x=>x.id!==a.id));
                  setGrupos(prev=>prev.map(g=>({...g,alumnos:g.alumnos.filter(id=>id!==a.id)})));
                  onToast(`${a.nombre} ${lang==='en'?'removed':'eliminado'}`);
                }}
                style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--tx3)',padding:4,flexShrink:0}}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Notificaciones ───────────────────────────────────────────────────────
  if(bsView==='notif') return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}}
        onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>
      <h2 style={{margin:'0 0 16px',fontSize:20,fontWeight:900,color:'var(--tx)',fontFamily:"'Special Gothic Expanded One',sans-serif"}}>
        {lang==='en'?'Notifications':'Notificaciones'}
      </h2>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
        {[lang==='en'?'All students':'Todos los alumnos',...grupos.map(g=>g.nombre)].map(dest=>(
          <button key={dest}
            style={{padding:'5px 10px',borderRadius:20,fontSize:11,fontWeight:700,
              cursor:'pointer',border:'1px solid var(--bd)',
              background:'transparent',color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
            {dest}
          </button>
        ))}
      </div>
      <textarea placeholder={lang==='en'?'Message for your students...':'Mensaje para tus alumnos...'}
        rows={4}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
          background:'var(--s1)',color:'var(--tx)',fontSize:13,
          resize:'none',boxSizing:'border-box',lineHeight:1.5,marginBottom:8,fontFamily:"'Lexend Giga',sans-serif"}}/>
      <button onClick={()=>{onToast(`✓ ${lang==='en'?'Notification sent':'Notificación enviada'}`);setBsView(null);}}
        style={{width:'100%',padding:'11px',borderRadius:12,border:'none',
          background:'var(--ac)',color:'var(--bg)',fontSize:13,fontWeight:800,
          cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
        {lang==='en'?'Send message':'Enviar mensaje'}
      </button>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,color:'var(--tx3)',
        lineHeight:1.4,marginTop:10}}>
        {lang==='en'
          ?'Real push/email delivery requires the upcoming Firebase backend — for now this is simulated.'
          :'El envío real (push/correo) depende del backend de Firebase (próximo) — por ahora esto es simulado.'}
      </div>
    </div>
  );

  // ── Home Backstage ────────────────────────────────────────────────────────
  return(
    <div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
        Backstage
      </div>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:20}}>
        {lang==='en'?'Academy management panel':'Panel de gestión de la academia'}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {MENU.map(item=>(
          <button key={item.id}
            onClick={()=>['alumnos','notif'].includes(item.id)?setBsView(item.id):onToast(`${item.label} — ${lang==='en'?'coming soon':'próximamente'}`)}
            style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:14,padding:'20px 16px',cursor:'pointer',textAlign:'left',transition:'all .18s',display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:15,color:'var(--tx)',lineHeight:1.15}}>{item.label}</div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:200,fontSize:10,color:'var(--tx3)',lineHeight:1.4}}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
