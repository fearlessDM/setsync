import { useState } from 'react';
import { registrarse, iniciarSesion, iniciarSesionConGoogle } from '../firebase/auth';
import { t as getT } from '../i18n';

// Login.jsx — Primera pantalla real de autenticación de SetSync. Antes la
// app nunca pedía iniciar sesión (generaba un accountId silencioso por
// dispositivo) — ahora que Auth está conectado de verdad, esto reemplaza
// esa identidad fantasma por una cuenta real.
export function Login({onToast, lang='es'}){
  const tx=getT(lang);
  const [modo,setModo]=useState('entrar'); // 'entrar' | 'crear'
  const [nombre,setNombre]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [cargando,setCargando]=useState(false);
  const [error,setError]=useState(null);

  const submit=async(e)=>{
    e.preventDefault();
    setError(null);
    if(!email.trim()||!password){ setError(tx.errorFillFields); return; }
    setCargando(true);
    try{
      if(modo==='crear') await registrarse(nombre,email,password);
      else await iniciarSesion(email,password);
      // onAuthChange en App.jsx toma el relevo desde acá — no hace falta
      // hacer nada más, el listener detecta la sesión y navega solo.
    }catch(err){
      setError(err.message);
    }finally{
      setCargando(false);
    }
  };

  const conGoogle=async()=>{
    setError(null);
    setCargando(true);
    try{ await iniciarSesionConGoogle(); }
    catch(err){ setError(err.message); }
    finally{ setCargando(false); }
  };

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',padding:24}}>
      <div className="login-form-in" style={{width:'100%',maxWidth:360}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <img src="/FAVICON SS.png" alt="SetSync" style={{width:64,height:64,objectFit:'contain',marginBottom:12}}/>
          <div style={{fontSize:'var(--fs-base)',color:'var(--tx2)',fontFamily:"var(--font-body)",fontWeight:300}}>
            {modo==='entrar'?tx.signInToContinue:tx.createYourAccount}
          </div>
        </div>

        <div style={{display:'flex',gap:6,marginBottom:20,background:'var(--s1)',borderRadius:12,padding:4}}>
          <button onClick={()=>{setModo('entrar');setError(null);}}
            style={{flex:1,padding:'9px 0',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)",
              transition:'background .15s,color .15s',
              background:modo==='entrar'?'var(--bd)':'transparent',
              color:modo==='entrar'?'var(--tx)':'var(--tx3)'}}>
            {tx.signIn}
          </button>
          <button onClick={()=>{setModo('crear');setError(null);}}
            style={{flex:1,padding:'9px 0',borderRadius:9,border:'none',cursor:'pointer',
              fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)",
              transition:'background .15s,color .15s',
              background:modo==='crear'?'var(--bd)':'transparent',
              color:modo==='crear'?'var(--tx)':'var(--tx3)'}}>
            {tx.createAccount}
          </button>
        </div>

        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:10}}>
          {modo==='crear'&&(
            <input placeholder={tx.yourName} value={nombre} onChange={e=>setNombre(e.target.value)}
              style={{padding:'12px 14px',borderRadius:10,border:'1px solid var(--bd)',
                background:'var(--s1)',color:'var(--tx)',fontSize:'var(--fs-lg)',fontFamily:"var(--font-body)"}}/>
          )}
          <input type="email" placeholder={tx.emailPlaceholder} value={email} onChange={e=>setEmail(e.target.value)}
            style={{padding:'12px 14px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:'var(--fs-lg)',fontFamily:"var(--font-body)"}}/>
          <input type="password" placeholder={tx.passwordPlaceholder} value={password} onChange={e=>setPassword(e.target.value)}
            style={{padding:'12px 14px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:'var(--fs-lg)',fontFamily:"var(--font-body)"}}/>

          {error&&(
            <div style={{fontSize:'var(--fs-base)',color:'var(--rd)',fontFamily:"var(--font-body)",
              lineHeight:1.5,padding:'8px 10px',background:'rgba(var(--rd-rgb),.08)',borderRadius:8}}>
              {error}
            </div>
          )}

          <button type="submit" disabled={cargando} className="btn btn-ac"
            style={{padding:'13px 0',borderRadius:10,border:'none',
              fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)",marginTop:4}}>
            {cargando?tx.oneMoment:modo==='entrar'?tx.signIn:tx.createAccount}
          </button>
        </form>

        <div style={{display:'flex',alignItems:'center',gap:10,margin:'18px 0'}}>
          <div style={{flex:1,height:1,background:'var(--s3)'}}/>
          <span style={{fontSize:'var(--fs-2xs)',color:'var(--tx3)',fontFamily:"var(--font-body)",fontWeight:700}}>{tx.or}</span>
          <div style={{flex:1,height:1,background:'var(--s3)'}}/>
        </div>

        <button onClick={conGoogle} disabled={cargando} className="btn btn-g"
          style={{width:'100%',padding:'12px 0',borderRadius:10,border:'1px solid var(--bd2)',
            color:'var(--tx)',fontSize:'var(--fs-base)',fontWeight:700,fontFamily:"var(--font-body)",
            display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {tx.continueWithGoogle}
        </button>

        <div style={{textAlign:'center',marginTop:24,fontSize:'var(--fs-2xs)',fontWeight:700,color:'var(--tx3)',
          fontFamily:"var(--font-body)",lineHeight:1.6}}>
          {tx.loginDisclaimer1}<br/>
          {tx.loginDisclaimer2}
        </div>
      </div>
    </div>
  );
}
