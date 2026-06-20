// Backstage: pantalla inicial única de gestión para Iglesia y Banda (antes:
// BackstageView.jsx + BandaBackstage.jsx). Menú base compartido + items
// feature-flagged por modo (ver data/modo.js MODO_FEATURES).
import { useState } from 'react';
import { getModoTexto, getModoFeatures, getTiposEventoDisponibles } from '../data/modo';

export function Backstage({
  personas=[],setPersonas=()=>{},
  eventos=[],setEventos=()=>{},
  isAdmin,onToast,mode,lang='es',
  rolesDisponibles=[], // catálogo de roles a ofrecer en el form de "agregar persona", según modo
}){
  const vx=getModoTexto(mode,lang);
  const feat=getModoFeatures(mode);
  const tipos=getTiposEventoDisponibles(mode,lang);
  const [bsView,setBsView]=useState(null);
  const [subView,setSubView]=useState(null);
  const [nuevoNombre,setNuevoNombre]=useState('');
  const [nuevoRol,setNuevoRol]=useState(rolesDisponibles[0]?.id||'');
  const [palabraTexto,setPalabraTexto]=useState('');

  const MENU=[
    {id:'evento', label:lang==='en'?`Create ${vx.evento.singular}`:`Crear ${vx.evento.singular}`,
      sub:tipos.map(t=>t.label).join(', ')},
    ...(feat.cancioneroUniversal?[{id:'palabra',label:lang==='en'?'Word for the team':'Palabra para el equipo',
      sub:lang==='en'?'Verse and notes':'Versículo y notas',adminOnly:true}]:[]),
    {id:'equipo',  label:lang==='en'?'Manage team':'Gestión de Equipo', sub:vx.equipoPersona.plural},
    {id:'notif',   label:lang==='en'?'Notifications':'Notificaciones',  sub:lang==='en'?'Notify the team':'Avisar al equipo'},
    {id:'config',  label:lang==='en'?'Settings':'Configuración',        sub:lang==='en'?'Account settings':'Ajustes de la cuenta'},
  ];

  // ── Gestión de equipo (unificada) ────────────────────────────────────
  if(bsView==='equipo')return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}}
        onClick={()=>{setBsView(null);setSubView(null);}}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>
      <div className="ph">
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:400,color:'var(--tx)',fontFamily:"'Special Gothic Expanded One',sans-serif"}}>
            {lang==='en'?'Manage team':'Gestión de Equipo'}
          </h2>
          <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{personas.length} {vx.equipoPersona.plural.toLowerCase()}</div>
        </div>
        {isAdmin&&(
          <button onClick={()=>setSubView(v=>v==='agregar'?null:'agregar')}
            style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,
              border:'1px solid var(--ac)',background:'rgba(200,169,126,.08)',color:'var(--ac)',
              cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
            + {lang==='en'?'Person':'Persona'}
          </button>
        )}
      </div>

      {subView==='agregar'&&isAdmin&&(
        <div style={{padding:'14px',borderRadius:14,border:'1px solid var(--bd)',background:'var(--s2)',marginBottom:16}}>
          <input value={nuevoNombre} onChange={e=>setNuevoNombre(e.target.value)}
            placeholder={lang==='en'?'Name':'Nombre'}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,marginBottom:8,boxSizing:'border-box',
              fontFamily:"'Lexend Giga',sans-serif"}}/>
          {rolesDisponibles.length>0&&(
            <select value={nuevoRol} onChange={e=>setNuevoRol(e.target.value)}
              style={{width:'100%',padding:'8px 10px',borderRadius:10,border:'1px solid var(--bd)',
                background:'var(--s1)',color:'var(--tx)',fontSize:13,marginBottom:8,
                fontFamily:"'Lexend Giga',sans-serif"}}>
              {rolesDisponibles.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          )}
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setSubView(null);setNuevoNombre('');}}
              style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid var(--bd)',background:'transparent',
                color:'var(--tx3)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {lang==='en'?'Cancel':'Cancelar'}
            </button>
            <button onClick={()=>{
                if(!nuevoNombre.trim()){onToast(lang==='en'?'Enter a name':'Ingresa un nombre');return;}
                setPersonas(prev=>[...prev,{id:`p${Date.now()}`,nombre:nuevoNombre.trim(),rol:nuevoRol,email:null,equipoId:null}]);
                setNuevoNombre('');setSubView(null);
                onToast(`✓ ${nuevoNombre.trim()} ${lang==='en'?'added':'agregado'}`);
              }}
              style={{flex:2,padding:'9px',borderRadius:10,border:'none',background:'var(--ac)',color:'var(--bg)',
                fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {lang==='en'?'Add':'Agregar'}
            </button>
          </div>
        </div>
      )}

      {personas.map(p=>(
        <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:12,
          border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:400,color:'var(--tx)',fontFamily:"'Lexend Giga',sans-serif"}}>{p.nombre}</div>
            <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
              {rolesDisponibles.find(r=>r.id===p.rol)?.label||p.rol}{p.equipoNombre?` · ${p.equipoNombre}`:''}
            </div>
          </div>
          {isAdmin&&(
            <button onClick={()=>{setPersonas(prev=>prev.filter(x=>x.id!==p.id));onToast(`${p.nombre} ${lang==='en'?'removed':'eliminado'}`);}}
              style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--tx3)',padding:4,flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );

  // ── Palabra para el equipo (solo Iglesia, vía feature flag) ──────────
  if(bsView==='palabra'&&feat.cancioneroUniversal)return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>
      <h2 style={{margin:'0 0 16px',fontSize:20,fontWeight:400,color:'var(--tx)',fontFamily:"'Special Gothic Expanded One',sans-serif"}}>
        {lang==='en'?'Word for the team':'Palabra para el equipo'}
      </h2>
      <textarea value={palabraTexto} onChange={e=>setPalabraTexto(e.target.value)}
        placeholder={lang==='en'?'Verse, message, notes...':'Versículo, mensaje, notas...'} rows={6}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,resize:'none',boxSizing:'border-box',lineHeight:1.5,marginBottom:8,
          fontFamily:"'Lexend Giga',sans-serif"}}/>
      <button onClick={()=>{onToast(lang==='en'?'Saved':'Guardado');setBsView(null);}}
        style={{width:'100%',padding:'11px',borderRadius:12,border:'none',background:'var(--ac)',color:'var(--bg)',
          fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
        {lang==='en'?'Save':'Guardar'}
      </button>
    </div>
  );

  // ── Notificaciones (unificada) ───────────────────────────────────────
  if(bsView==='notif')return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:12,fontWeight:300,color:'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>Backstage</span>
      </div>
      <h2 style={{margin:'0 0 16px',fontSize:20,fontWeight:400,color:'var(--tx)',fontFamily:"'Special Gothic Expanded One',sans-serif"}}>
        {lang==='en'?'Notifications':'Notificaciones'}
      </h2>
      <textarea placeholder={lang==='en'?`Message for your ${vx.equipoPersona.singular.toLowerCase()}...`:`Mensaje para tu ${vx.equipoPersona.singular.toLowerCase()}...`}
        rows={4}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,resize:'none',boxSizing:'border-box',lineHeight:1.5,marginBottom:8,
          fontFamily:"'Lexend Giga',sans-serif"}}/>
      <button onClick={()=>{onToast(`✓ ${lang==='en'?'Notification sent':'Notificación enviada'}`);setBsView(null);}}
        style={{width:'100%',padding:'11px',borderRadius:12,border:'none',background:'var(--ac)',color:'var(--bg)',
          fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
        {lang==='en'?'Send':'Enviar'}
      </button>
    </div>
  );

  // ── Home Backstage ───────────────────────────────────────────────────
  return(
    <div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05,marginBottom:5}}>
        Backstage
      </div>
      <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginBottom:20}}>
        {lang==='en'?'Management panel':'Panel de gestión'}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {MENU.map(item=>(
          <button key={item.id}
            onClick={()=>['equipo','notif','palabra'].includes(item.id)?setBsView(item.id):onToast(`${item.label} — ${lang==='en'?'coming soon':'próximamente'}`)}
            style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:14,padding:'20px 16px',cursor:'pointer',
              textAlign:'left',transition:'all .18s',display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:15,color:'var(--tx)',lineHeight:1.15}}>{item.label}</div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:200,fontSize:10,color:'var(--tx3)',lineHeight:1.4}}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
