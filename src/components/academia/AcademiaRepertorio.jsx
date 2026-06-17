// AcademiaRepertorio: catálogo de repertorio de la academia con colecciones
// personalizadas creadas por el profesor. Mismo sistema que BandaRepertorio
// (Cover/Artista/Álbum) más un cuarto tipo: Instrumento — propio del contexto
// educativo (ej. "Para Guitarra", "Para Batería").
import { useState } from 'react';
import { SONG_CONTENT_BANDA } from '../../data/songs-banda';
import { SongView } from '../SongView';

export function AcademiaRepertorio({repertorio,setRepertorio,colecciones=[],setColecciones,isProfesor,onToast,onOpenSong,lang='es'}){
  // ── Estado ────────────────────────────────────────────────────────────────
  const [sortBy,setSortBy]=useState('bpm');
  const [search,setSearch]=useState('');
  const [songViewIdx,setSongViewIdx]=useState(null);

  const [colActiva,setColActiva]=useState(null); // null = ver todas
  const [showNewCol,setShowNewCol]=useState(false);
  const [newColLabel,setNewColLabel]=useState('');
  const [newColTipo,setNewColTipo]=useState('instrumento');
  const [showAddToCol,setShowAddToCol]=useState(null); // id de col para agregar

  const TIPOS_COL=[
    {id:'instrumento',label:lang==='en'?'Instrument':'Instrumento'},
    {id:'cover',       label:lang==='en'?'Cover':'Cover'},
    {id:'artista',     label:lang==='en'?'By artist':'Por artista'},
    {id:'album',       label:lang==='en'?'Album':'Álbum'},
  ];

  const filteredSorted=[...repertorio]
    .filter(c=>{
      if(colActiva){
        const col=colecciones.find(c2=>c2.id===colActiva);
        if(!col||!col.canciones.includes(c.n))return false;
      }
      if(search&&!c.n.toLowerCase().includes(search.toLowerCase())&&
        !(c.artista||'').toLowerCase().includes(search.toLowerCase()))return false;
      return true;
    })
    .sort((a,b)=>sortBy==='bpm'?a.bpm-b.bpm:a.n.localeCompare(b.n));

  // ── SongView (reutiliza el componente completo, sin restricción de permisos
  // — el profesor siempre ve todo desde Repertorio) ──────────────────────────
  if(songViewIdx!==null){
    const songsForView=filteredSorted.map(c=>({name:c.n,key:c.key,bpm:c.bpm}));
    return(
      <SongView
        songs={songsForView}
        startIdx={songViewIdx}
        onClose={()=>setSongViewIdx(null)}
        theme="dark"
        contentDB={SONG_CONTENT_BANDA}
        lang={lang}
      />
    );
  }

  // ── Agregar canciones a colección ────────────────────────────────────────
  if(showAddToCol){
    const col=colecciones.find(c=>c.id===showAddToCol);
    if(!col)return null;
    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,cursor:'pointer'}}
          onClick={()=>setShowAddToCol(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:300,color:'var(--tx3)'}}>
            {col.nombre}
          </span>
        </div>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:22,color:'var(--tx)',lineHeight:1.05,marginBottom:14}}>
          {lang==='en'?'Add songs':'Agregar canciones'}
        </div>
        {repertorio.map((c,i)=>{
          const enCol=col.canciones.includes(c.n);
          return(
            <div key={i}
              onClick={()=>setColecciones(prev=>prev.map(p=>p.id===showAddToCol?{
                ...p,canciones:enCol?p.canciones.filter(x=>x!==c.n):[...p.canciones,c.n]
              }:p))}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                borderRadius:10,marginBottom:6,cursor:'pointer',
                border:`1px solid ${enCol?'rgba(255,255,255,.4)':'var(--bd)'}`,
                background:enCol?'rgba(255,255,255,.06)':'var(--s1)'}}>
              <div style={{width:20,height:20,borderRadius:10,flexShrink:0,
                border:`2px solid ${enCol?'var(--tx)':'var(--bd)'}`,
                background:enCol?'var(--tx)':'transparent',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                {enCol&&<svg viewBox="0 0 24 24" width="11" height="11" fill="none"
                  stroke="var(--bg)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:400,color:'var(--tx)'}}>{c.n}</div>
                <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:200,color:'var(--tx3)'}}>{c.artista||'Original'} · {c.key}</div>
              </div>
            </div>
          );
        })}
        <button onClick={()=>setShowAddToCol(null)}
          style={{width:'100%',padding:'11px',borderRadius:12,border:'none',
            background:'var(--tx)',color:'var(--bg)',fontSize:13,fontWeight:700,
            cursor:'pointer',marginTop:8,fontFamily:"'Lexend Giga',sans-serif"}}>
          {lang==='en'?'Done':'Listo'}
        </button>
      </div>
    );
  }

  // ── Vista principal ──────────────────────────────────────────────────────
  return(
    <div>
      <div className="ph" style={{marginBottom:14,alignItems:'flex-start'}}>
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05}}>
            {lang==='en'?'Repertoire':'Repertorio'}
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginTop:5}}>
            {repertorio.length} {lang==='en'?'songs':'canciones'}
          </div>
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={lang==='en'?'Search songs or artists...':'Buscar canciones o artistas...'}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,
            border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx)',
            fontSize:13,boxSizing:'border-box',fontFamily:"'Lexend Giga',sans-serif"}}/>
      </div>

      <div style={{marginBottom:14}}>
        <div style={{marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
              letterSpacing:'1.5px'}}>{lang==='en'?'Collections':'Colecciones'}</div>
            {isProfesor&&(
              <button onClick={()=>setShowNewCol(v=>!v)}
                style={{fontSize:11,fontWeight:700,color:'var(--tx)',background:'transparent',
                  border:'none',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                {showNewCol?(lang==='en'?'Cancel':'Cancelar'):`+ ${lang==='en'?'New':'Nueva'}`}
              </button>
            )}
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)',lineHeight:1.4}}>
            {lang==='en'?'Group songs by instrument, cover, artist, or album.':'Agrupa canciones por instrumento, cover, artista o álbum.'}
          </div>
        </div>
        {showNewCol&&isProfesor&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s2)',marginBottom:10}}>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)',
              marginBottom:8}}>
              {lang==='en'?'Collection name':'Nombre de la colección'}
            </div>
            <input
              value={newColLabel}
              onChange={e=>setNewColLabel(e.target.value)}
              placeholder={lang==='en'?'E.g: For Guitar, Beginners, Live...':'Ej: Para Guitarra, Principiantes, En vivo...'}
              style={{width:'100%',padding:'8px 10px',borderRadius:8,
                border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx)',
                fontSize:13,fontFamily:"'Lexend Giga',sans-serif",marginBottom:8,boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap'}}>
              {TIPOS_COL.map(t=>(
                <button key={t.id} onClick={()=>setNewColTipo(t.id)}
                  style={{flex:'1 0 45%',padding:'6px 8px',borderRadius:8,fontSize:10,fontWeight:700,
                    border:`1px solid ${newColTipo===t.id?'rgba(255,255,255,.4)':'var(--bd)'}`,
                    background:newColTipo===t.id?'rgba(255,255,255,.08)':'transparent',
                    color:newColTipo===t.id?'var(--tx)':'var(--tx3)',cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={()=>{
                if(!newColLabel.trim()){onToast(lang==='en'?'Enter a name':'Ingresa un nombre');return;}
                const id='c'+Date.now();
                setColecciones(prev=>[...prev,{id,nombre:newColLabel.trim(),tipo:newColTipo,canciones:[]}]);
                setShowNewCol(false);
                setNewColLabel('');
                setShowAddToCol(id);
                onToast(`✓ ${lang==='en'?'Collection created':'Colección creada'}`);
              }}
              style={{width:'100%',padding:'9px',borderRadius:8,border:'none',
                background:'var(--tx)',color:'var(--bg)',fontSize:13,fontWeight:700,
                cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
              {lang==='en'?'Create collection':'Crear colección'}
            </button>
          </div>
        )}
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button onClick={()=>setColActiva(null)}
            style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:600,
              border:`1px solid ${colActiva===null?'rgba(255,255,255,.4)':'var(--bd)'}`,
              background:colActiva===null?'rgba(255,255,255,.08)':'transparent',
              color:colActiva===null?'var(--tx)':'var(--tx3)',
              cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif"}}>
            {lang==='en'?'All':'Todas'}
            <span style={{fontSize:9,opacity:.6,marginLeft:4}}>{repertorio.length}</span>
          </button>
          {colecciones.map(col=>(
            <div key={col.id} style={{display:'flex',alignItems:'center',gap:2}}>
              <button onClick={()=>setColActiva(colActiva===col.id?null:col.id)}
                style={{padding:'5px 12px',borderRadius:isProfesor?'20px 0 0 20px':20,
                  fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",
                  border:`1px solid ${colActiva===col.id?'rgba(255,255,255,.4)':'var(--bd)'}`,
                  borderRight:isProfesor?'none':undefined,
                  background:colActiva===col.id?'rgba(255,255,255,.08)':'transparent',
                  color:colActiva===col.id?'var(--tx)':'var(--tx3)'}}>
                {col.nombre}
                <span style={{fontSize:9,opacity:.6,marginLeft:4}}>{col.canciones.length}</span>
              </button>
              {isProfesor&&(
                <button onClick={()=>setShowAddToCol(col.id)}
                  style={{padding:'5px 7px',borderRadius:'0 20px 20px 0',
                    fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",
                    border:`1px solid ${colActiva===col.id?'rgba(255,255,255,.4)':'var(--bd)'}`,
                    background:colActiva===col.id?'rgba(255,255,255,.08)':'transparent',
                    color:'var(--tx3)'}}>
                  +
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)'}}>
          {filteredSorted.length} {filteredSorted.length===1?(lang==='en'?'song':'canción'):(lang==='en'?'songs':'canciones')}
          {colActiva&&` ${lang==='en'?'in':'en'} "${colecciones.find(c=>c.id===colActiva)?.nombre}"`}
        </div>
        <div style={{display:'flex',gap:4}}>
          {[{k:'bpm',l:'BPM'},{k:'nombre',l:'A-Z'}].map(s=>(
            <button key={s.k} onClick={()=>setSortBy(s.k)}
              style={{padding:'4px 9px',borderRadius:14,fontSize:10,fontWeight:600,
                cursor:'pointer',border:'1px solid var(--bd)',
                background:sortBy===s.k?'var(--s2)':'transparent',
                color:sortBy===s.k?'var(--tx)':'var(--tx3)',fontFamily:"'Lexend Giga',sans-serif"}}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {filteredSorted.length===0?(
        <div style={{textAlign:'center',padding:'30px 0',color:'var(--tx3)',fontSize:12,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
          {colActiva?(lang==='en'?'No songs in this collection':'No hay canciones en esta colección'):(lang==='en'?'No songs':'Sin canciones')}
        </div>
      ):(
        <div className="sg">
          {filteredSorted.map((c,i)=>(
            <div key={i} className="scard" onClick={()=>onOpenSong?onOpenSong(i):setSongViewIdx(i)}>
              <div className="scard-n">{c.n}</div>
              <div className="scard-s">
                {c.key}<span>· {c.bpm} BPM</span>
              </div>
              {c.artista&&(
                <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:9,fontWeight:200,color:'var(--tx3)'}}>{c.artista}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {isProfesor&&(
        <button onClick={()=>onToast(lang==='en'?'Load from Drive — coming soon':'Cargar desde Drive — próximamente')}
          style={{width:'100%',padding:'11px',borderRadius:12,
            border:'1px dashed var(--bd)',background:'transparent',
            color:'var(--tx3)',fontSize:11,fontWeight:600,
            cursor:'pointer',marginTop:10,fontFamily:"'Lexend Giga',sans-serif"}}>
          + {lang==='en'?'Load song from Drive':'Cargar canción desde Drive'}
        </button>
      )}
    </div>
  );
}
