// ── Sidebar.jsx — Menú lateral compartido por los 3 modos ──────────────────
import { useState } from 'react';
// Extraído del sidebar que ya existía solo para Iglesia (en App.jsx), ahora
// reutilizable para Iglesia, Banda y Academia. Pedido de Danny: los 3 modos
// necesitan el mismo sidebar en escritorio/tablet horizontal — antes solo
// Iglesia lo tenía, Banda y Academia usaban una barra inferior fija.
//
// Comportamiento responsivo (vía CSS, ver theme.css): visible en escritorio
// y tablet horizontal, oculto en tablet vertical/móvil (donde cada modo
// sigue usando su barra de navegación inferior existente, sin cambios ahí).
//
// Props:
//  - navItems: array de {id, label, icon} — icon es un componente SVG ya
//    resuelto por el padre (cada modo tiene sus propios íconos de nav).
//  - activeId: id del item activo actualmente
//  - onSelect(id): callback al hacer click en un item
//  - sbCol, setSbCol: estado de colapsado, vive en el padre (cada modo
//    puede querer persistirlo de forma independiente, o compartirlo)
//  - theme, onSetTheme: para el selector de tema simple en la base
//  - userName, userRole: chip de usuario en el footer
export function Sidebar({navItems,activeId,onSelect,sbCol,setSbCol,theme,onSetTheme,userName='Danny',userRole='Super Admin'}){
  const [themeOpen,setThemeOpen]=useState(false);

  const THEMES=[
    {id:'dark',label:'Oscuro'},
    {id:'gray',label:'Gris'},
    {id:'cream',label:'Claro'},
    {id:'bubblegum',label:'Bubblegum'},
    {id:'cosmos',label:'Cosmos'},
  ];
  const temaActual=THEMES.find(t=>t.id===theme)||THEMES[0];

  return(
    <nav className={`sb${sbCol?' col':''}`}>
      <div className="sb-top">
        {sbCol
          ?/* CERRADO: favicon centrado grande */
          <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <img src="/FAVICON SS.png" alt="SS" style={{width:44,height:44,objectFit:'contain',margin:'0 auto'}}/>
            <button className="sb-btn" onClick={()=>setSbCol(c=>!c)} style={{position:'absolute',right:6,top:10}}>
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
          :/* ABIERTO: logo horizontal a todo el ancho + botón X */
          <div style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
            <img src="/LOGO horiz blanco.png" alt="SetSync" style={{height:36,objectFit:'contain',flex:1,maxWidth:'calc(100% - 36px)'}}/>
            <button className="sb-btn" onClick={()=>setSbCol(c=>!c)} style={{flexShrink:0,width:26,height:26}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        }
      </div>
      <div className="sb-nav">
        {navItems.map(n=>(
          <div key={n.id} className={`ni${activeId===n.id?' on':''}`} onClick={()=>onSelect(n.id)}>
            <div className="ni-ic">{n.icon}</div>
            <span className="ni-lb">{n.label}</span>
            {activeId===n.id&&<div className="ni-dot"/>}
          </div>
        ))}
      </div>
      <div className="sb-foot">
        {/* Selector de tema simple — pedido explícito de Danny, "bien
            simple", en la base del sidebar. Mantiene el catálogo completo
            de temas en BackstageView (Danny confirmó querer ambos lugares
            disponibles, no reemplazar uno por el otro), pero acá es solo
            un dropdown compacto, sin la grilla visual de previews. */}
        {onSetTheme&&(
          <div style={{position:'relative',marginBottom:10}}>
            <button onClick={()=>setThemeOpen(o=>!o)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:sbCol?'center':'space-between',gap:6,padding:'7px 8px',borderRadius:8,border:'1px solid var(--bd)',background:'rgba(255,255,255,.03)',color:'var(--tx2)',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {!sbCol&&<span style={{fontSize:10,fontWeight:300,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{temaActual.label}</span>}
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" style={{flexShrink:0,transform:themeOpen?'rotate(180deg)':'none',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {themeOpen&&(
              <div style={{position:'absolute',bottom:'calc(100% + 6px)',left:sbCol?0:'auto',right:sbCol?'auto':0,minWidth:130,background:'rgba(10,10,20,.97)',border:'1px solid var(--bd)',borderRadius:10,padding:6,zIndex:50,boxShadow:'0 8px 24px rgba(0,0,0,.5)'}}>
                {THEMES.map(t=>(
                  <button key={t.id} onClick={()=>{onSetTheme(t.id);setThemeOpen(false);}}
                    style={{width:'100%',padding:'6px 8px',marginBottom:2,border:'none',borderRadius:6,background:theme===t.id?'rgba(255,255,255,.08)':'transparent',color:theme===t.id?'var(--tx)':'var(--tx2)',cursor:'pointer',textAlign:'left',fontSize:11,fontWeight:300,fontFamily:"'Lexend Giga',sans-serif",whiteSpace:'nowrap'}}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="u-chip">
          <div className="u-av">{userName.slice(0,2).toUpperCase()}</div>
          <div className="u-inf">
            <div className="u-name">{userName}</div>
            <div style={{fontSize:9,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1px',fontWeight:700,fontFamily:"'Lexend Giga',sans-serif",opacity:.7}}>{userRole}</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
