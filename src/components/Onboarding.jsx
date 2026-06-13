// Onboarding: flujo de bienvenida ANTIGUO — actualmente NO se usa,
// reemplazado por ModeSelector dentro de App.jsx. Se conserva por si se
// necesita reutilizar parte de su diseño/copys en el futuro.
import { useState } from 'react';

export function Onboarding({onFinish}){
  const [step,setStep]=useState(1);
  const [lang,setLang]=useState('es');
  const [mode,setMode]=useState('band');
  const SUM={band:{es:'Bandas',en:'Bands'},worship:{es:'Iglesias',en:'Churches'},studio:{es:'Estudios y Academias',en:'Studios & Academies'}};
  const EVSM={band:{es:'Show, Gig, Ensayo',en:'Show, Gig, Rehearsal'},worship:{es:'Tiempo de Adoración, Domingo',en:'Worship Time, Sunday'},studio:{es:'Sesión, Clase, Ensayo',en:'Session, Class, Rehearsal'}};
  return(
    <div className="ob-wrap">
      <div className="ob-card">
        {step===1&&(
          <div className="ob-step">
            <div className="ob-lgo">
              <div className="logo-mk"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:22,color:'var(--tx)'}}>Setlist</div>
            </div>
            <div className="ob-lbl">Paso 1 de 3 · Step 1 of 3</div>
            <div className="ob-ttl">Elige tu idioma <span style={{color:'var(--ac)'}}>/ Choose</span></div>
            <div className="ob-langs">
              {[['es','Español','Spanish'],['en','English','Inglés']].map(([l,n,s])=>(
                <div key={l} className={`ob-lang${lang===l?' on':''}`} onClick={()=>setLang(l)}>
                  <div>
                    <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:16,color:'var(--tx)'}}>{n}</div>
                    <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{s}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="ob-ft">
              <div className="ob-dots"><div className="ob-dot on"/><div className="ob-dot"/><div className="ob-dot"/></div>
              <button onClick={()=>setStep(2)} style={{width:44,height:44,borderRadius:'50%',border:'1px solid rgba(255,255,255,.25)',background:'rgba(255,255,255,.12)',color:'var(--tx)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)',transition:'all .2s'}}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>
          </div>
        )}
        {step===2&&(
          <div className="ob-step">
            <div className="ob-lbl">{lang==='en'?'Step 2 of 3':'Paso 2 de 3'}</div>
            <div className="ob-ttl">{lang==='en'?'How will you use ':'Como usarás '}<span style={{color:'var(--ac)'}}>Setlist</span></div>
            <div className="ob-modes">
              {Object.entries(MODES).map(([k,v])=>(
                <div key={k} className={`ob-mode${mode===k?' on':''}`} onClick={()=>setMode(k)}>
                  <div className="ob-mic">
                    {k==='band'&&<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
                    {k==='worship'&&<svg viewBox="0 0 24 24"><rect x="2" y="8" width="20" height="12" rx="2"/><path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/></svg>}
                    {k==='studio'&&<svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>}
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',marginBottom:2}}>{v.sub}</div>
                    <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:15,color:'var(--tx)'}}>{v.label}</div>
                    <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.4,marginTop:2}}>{v.events}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="ob-note">✦ {lang==='en'?'Personalizes event names, roles and sections for your team.':'Personaliza nombres de eventos, roles y secciones para tu equipo.'}</div>
            <div className="ob-ft">
              <div className="ob-dots"><div className="ob-dot done"/><div className="ob-dot on"/><div className="ob-dot"/></div>
              <div style={{display:'flex',gap:7}}>
                <button className="btn btn-g btn-sm" onClick={()=>setStep(1)}>{lang==='en'?'Back':'Atrás'}</button>
                <button onClick={()=>setStep(3)} style={{width:44,height:44,borderRadius:'50%',border:'1px solid rgba(255,255,255,.25)',background:'rgba(255,255,255,.12)',color:'var(--tx)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)',transition:'all .2s'}}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}
        {step===3&&(
          <div className="ob-step">
            <div className="ob-lbl">{lang==='en'?'Step 3 of 3':'Paso 3 de 3'}</div>
            <div className="ob-ttl">{lang==='en'?'All set!':'Todo listo'}</div>
            <div className="ob-sub">{lang==='en'?'Config saved. Change it in Settings.':'Configuración guardada. Cámbiala en Ajustes.'}</div>
            <div className="ob-sum">
              {[[lang==='en'?'Language':'Idioma',lang==='en'?'English':'Español'],[lang==='en'?'Mode':'Modo',SUM[mode]?.[lang]],[lang==='en'?'Events':'Eventos',EVSM[mode]?.[lang]]].map(([l,v])=>(
                <div key={l} className="ob-sr"><span style={{fontSize:11,color:"var(--tx3)",fontWeight:600,letterSpacing:".3px"}}>{l}</span><span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{v}</span></div>
              ))}
            </div>
            <div className="ob-ft">
              <div className="ob-dots"><div className="ob-dot done"/><div className="ob-dot done"/><div className="ob-dot on"/></div>
              <div style={{display:'flex',gap:7}}>
                <button className="btn btn-g btn-sm" onClick={()=>setStep(2)}>{lang==='en'?'Back':'Atrás'}</button>
                <button className="btn btn-p btn-sm" onClick={()=>onFinish(lang,mode)}>{lang==='en'?'Get started':'Empezar'} <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
