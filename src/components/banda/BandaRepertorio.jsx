// BandaRepertorio: catálogo de repertorio de la banda con colecciones/agrupaciones
import { useState } from 'react';
import { COVERS_DEMO } from '../../data/constants';

export function BandaRepertorio({repertorio,setRepertorio,gigs,isEncargado,onToast,onOpenSong}){
  const FONT="'Lato',sans-serif";

  // ── Estado ────────────────────────────────────────────────────────────────
  const [sortBy,setSortBy]=useState('bpm');
  const [search,setSearch]=useState('');
  const [songView,setSongView]=useState(null);
  const [showSetlist,setShowSetlist]=useState(false);
  const [setlistCanciones,setSetlistCanciones]=useState([]);
  const [setlistGig,setSetlistGig]=useState('');
  const [editedSongs,setEditedSongs]=useState({});

  // Colecciones — array de {id, label, canciones:[]}
  const [colecciones,setColecciones]=useState([]);
  const [colActiva,setColActiva]=useState(null); // null = ver todas
  const [showNewCol,setShowNewCol]=useState(false);
  const [newColLabel,setNewColLabel]=useState('');
  const [showAddToCol,setShowAddToCol]=useState(null); // id de col para agregar

  const SUGERENCIAS=['Álbum 1','Covers','Originales','Rock','Pop','Baladas',
    'En vivo','Acústico','Festival','Por artista'];

  const getSongContent=(n)=>editedSongs[n]||SONG_CONTENT_BANDA[n]||null;

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

  // ── SongView ─────────────────────────────────────────────────────────────
  if(songView!==null){
    const song=filteredSorted[songView];
    if(!song)return null;
    return(
      <div style={{position:'fixed',inset:0,zIndex:200,background:'var(--bg)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
          borderBottom:'1px solid var(--bd)',background:'var(--bg)',
          position:'sticky',top:0,zIndex:5}}>
          <button onClick={()=>setSongView(null)}
            style={{background:'transparent',border:'none',cursor:'pointer',
              color:'var(--tx3)',padding:4,display:'flex',alignItems:'center'}}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:900,color:'var(--tx)',fontFamily:FONT,
              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.n}</div>
            <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,
              textTransform:'uppercase',letterSpacing:'1px'}}>
              {song.key} · {song.bpm} BPM
            </div>
          </div>
        </div>
        <div style={{overflowY:'auto',height:'calc(100vh - 55px)',padding:'10px 8px 80px'}}>
          {renderSongContent(getSongContent(song.n),0,true)}
        </div>
        <div style={{position:'fixed',bottom:0,left:0,right:0,
          background:'var(--bg)',borderTop:'1px solid var(--bd)',
          display:'flex',alignItems:'center',padding:'8px 12px 16px',gap:8}}>
          <button disabled={songView===0} onClick={()=>setSongView(v=>v-1)}
            style={{padding:'8px 14px',borderRadius:10,border:'1px solid var(--bd)',
              background:'transparent',color:songView===0?'var(--tx3)':'var(--tx)',
              cursor:songView===0?'default':'pointer',fontSize:12,fontWeight:700,fontFamily:FONT}}>
            ← Anterior
          </button>
          <div style={{flex:1,textAlign:'center',fontSize:11,color:'var(--tx3)',fontFamily:FONT}}>
            {songView+1} / {filteredSorted.length}
          </div>
          <button disabled={songView>=filteredSorted.length-1} onClick={()=>setSongView(v=>v+1)}
            style={{padding:'8px 14px',borderRadius:10,border:'1px solid var(--bd)',
              background:'transparent',
              color:songView>=filteredSorted.length-1?'var(--tx3)':'var(--tx)',
              cursor:songView>=filteredSorted.length-1?'default':'pointer',
              fontSize:12,fontWeight:700,fontFamily:FONT}}>
            Siguiente →
          </button>
        </div>
      </div>
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
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx3)',fontFamily:FONT}}>
            {col.label}
          </span>
        </div>
        <div style={{fontSize:20,fontWeight:900,color:'var(--tx)',fontFamily:FONT,marginBottom:14}}>
          Agregar canciones
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
                border:`1px solid ${enCol?'var(--ac)':'var(--bd)'}`,
                background:enCol?'rgba(200,169,126,.07)':'var(--s1)'}}>
              <div style={{width:20,height:20,borderRadius:10,flexShrink:0,
                border:`2px solid ${enCol?'var(--ac)':'var(--bd)'}`,
                background:enCol?'var(--ac)':'transparent',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                {enCol&&<svg viewBox="0 0 24 24" width="11" height="11" fill="none"
                  stroke="var(--bg)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--tx)',fontFamily:FONT}}>{c.n}</div>
                <div style={{fontSize:10,color:'var(--tx3)'}}>{c.artista||'Original'} · {c.key}</div>
              </div>
            </div>
          );
        })}
        <button onClick={()=>setShowAddToCol(null)}
          style={{width:'100%',padding:'11px',borderRadius:12,border:'none',
            background:'var(--ac)',color:'var(--bg)',fontSize:13,fontWeight:800,
            cursor:'pointer',marginTop:8,fontFamily:FONT}}>
          Listo
        </button>
      </div>
    );
  }

  // ── Crear Setlist ────────────────────────────────────────────────────────
  if(showSetlist) return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,cursor:'pointer'}}
        onClick={()=>setShowSetlist(false)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx3)',fontFamily:FONT}}>Repertorio</span>
      </div>
      <div style={{fontSize:20,fontWeight:900,color:'var(--tx)',fontFamily:FONT,marginBottom:14}}>
        Crear Setlist
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',
          letterSpacing:'1px',marginBottom:6}}>Asignar a evento</div>
        <select value={setlistGig} onChange={e=>setSetlistGig(e.target.value)}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,
            border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx)',fontSize:13}}>
          <option value="">— Seleccionar gig —</option>
          {gigs.map(g=><option key={g.id} value={g.id}>{g.nombre} · {g.ciudad}</option>)}
        </select>
      </div>
      <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',
        letterSpacing:'1px',marginBottom:8}}>Canciones ({setlistCanciones.length})</div>
      {repertorio.map((c,i)=>{
        const inSet=setlistCanciones.some(s=>s.n===c.n);
        return(
          <div key={i} onClick={()=>setSetlistCanciones(prev=>
            inSet?prev.filter(s=>s.n!==c.n):[...prev,c]
          )} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
            borderRadius:10,marginBottom:6,cursor:'pointer',
            border:`1px solid ${inSet?'var(--ac)':'var(--bd)'}`,
            background:inSet?'rgba(200,169,126,.07)':'var(--s1)'}}>
            <div style={{width:20,height:20,borderRadius:10,flexShrink:0,
              border:`2px solid ${inSet?'var(--ac)':'var(--bd)'}`,
              background:inSet?'var(--ac)':'transparent',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              {inSet&&<svg viewBox="0 0 24 24" width="11" height="11" fill="none"
                stroke="var(--bg)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--tx)',fontFamily:FONT}}>{c.n}</div>
              <div style={{fontSize:10,color:'var(--tx3)'}}>{c.key} · {c.bpm} BPM</div>
            </div>
          </div>
        );
      })}
      <button onClick={()=>{
        if(!setlistCanciones.length){onToast('Agrega al menos una canción');return;}
        onToast('✓ Setlist guardado');setShowSetlist(false);
      }} style={{width:'100%',padding:'12px',borderRadius:12,border:'none',
        background:'var(--ac)',color:'var(--bg)',fontSize:14,fontWeight:800,
        cursor:'pointer',marginTop:12,fontFamily:FONT}}>
        Guardar Setlist
      </button>
    </div>
  );

  // ── Vista principal ───────────────────────────────────────────────────────
  return(
    <div>
      <div className="ph" style={{marginBottom:12}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:900,color:'var(--tx)',fontFamily:FONT}}>
          Repertorio
        </h2>
        <div style={{display:'flex',gap:6}}>
          {isEncargado&&(
            <button onClick={()=>setShowSetlist(true)}
              style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--ac)',
                background:'rgba(200,169,126,.08)',color:'var(--ac)',
                fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:FONT}}>
              + Setlist
            </button>
          )}
        </div>
      </div>
      <div style={{position:'relative',marginBottom:12}}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--tx3)"
          strokeWidth="2" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Buscar por nombre o artista..."
          style={{width:'100%',padding:'8px 12px 8px 28px',borderRadius:10,
            border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx)',
            fontSize:13,boxSizing:'border-box',fontFamily:FONT}}/>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',
              letterSpacing:'1.5px'}}>Colecciones</div>
          {isEncargado&&(
            <button onClick={()=>setShowNewCol(v=>!v)}
              style={{fontSize:11,fontWeight:700,color:'var(--ac)',background:'transparent',
                border:'none',cursor:'pointer',fontFamily:FONT}}>
              {showNewCol?'Cancelar':'+ Nueva'}
            </button>
          )}
          </div>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT,lineHeight:1.4}}>
            Agrupa canciones por álbum, estilo, artista o lo que necesites.
          </div>
        </div>
        {showNewCol&&isEncargado&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s2)',marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',
              marginBottom:8,fontFamily:FONT}}>
              Nombre de la colección
            </div>
            <input
              value={newColLabel}
              onChange={e=>setNewColLabel(e.target.value)}
              placeholder="Ej: Álbum, Rock, Covers..."
              style={{width:'100%',padding:'8px 10px',borderRadius:8,
                border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx)',
                fontSize:13,fontFamily:FONT,marginBottom:8,boxSizing:'border-box'}}/>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
              {SUGERENCIAS.filter(s=>!colecciones.find(c=>c.label===s)).slice(0,6).map(s=>(
                <button key={s} onClick={()=>setNewColLabel(s)}
                  style={{padding:'3px 9px',borderRadius:14,fontSize:11,fontWeight:700,
                    border:'1px solid var(--bd)',background:'transparent',
                    color:'var(--tx3)',cursor:'pointer',fontFamily:FONT}}>
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={()=>{
                if(!newColLabel.trim()){onToast('Ingresa un nombre');return;}
                const id='c'+Date.now();
                setColecciones(prev=>[...prev,{id,label:newColLabel.trim(),canciones:[]}]);
                setShowNewCol(false);
                setNewColLabel('');
                setShowAddToCol(id);
                onToast(`✓ Colección "${newColLabel}" creada`);
              }}
              style={{width:'100%',padding:'9px',borderRadius:8,border:'none',
                background:'var(--ac)',color:'var(--bg)',fontSize:13,fontWeight:700,
                cursor:'pointer',fontFamily:FONT}}>
              Crear colección
            </button>
          </div>
        )}
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button onClick={()=>setColActiva(null)}
            style={{padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700,
              border:`1px solid ${colActiva===null?'var(--ac)':'var(--bd)'}`,
              background:colActiva===null?'rgba(200,169,126,.12)':'transparent',
              color:colActiva===null?'var(--ac)':'var(--tx3)',
              cursor:'pointer',fontFamily:FONT}}>
            Todas
            <span style={{fontSize:10,opacity:.6,marginLeft:4}}>{repertorio.length}</span>
          </button>
          {colecciones.map(col=>(
            <div key={col.id} style={{display:'flex',alignItems:'center',gap:2}}>
              <button onClick={()=>setColActiva(colActiva===col.id?null:col.id)}
                style={{padding:'5px 12px',borderRadius:'20px 0 0 20px',
                  fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:FONT,
                  border:`1px solid ${colActiva===col.id?'var(--ac)':'var(--bd)'}`,
                  borderRight:'none',
                  background:colActiva===col.id?'rgba(200,169,126,.12)':'transparent',
                  color:colActiva===col.id?'var(--ac)':'var(--tx3)'}}>
                {col.label}
                <span style={{fontSize:10,opacity:.6,marginLeft:4}}>{col.canciones.length}</span>
              </button>
              {isEncargado&&(
                <button onClick={()=>setShowAddToCol(col.id)}
                  style={{padding:'5px 7px',borderRadius:'0 20px 20px 0',
                    fontSize:11,fontWeight:700,cursor:'pointer',
                    border:`1px solid ${colActiva===col.id?'var(--ac)':'var(--bd)'}`,
                    background:colActiva===col.id?'rgba(200,169,126,.12)':'transparent',
                    color:'var(--tx3)'}}>
                  +
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT}}>
          {filteredSorted.length} {filteredSorted.length===1?'canción':'canciones'}
          {colActiva&&` en "${colecciones.find(c=>c.id===colActiva)?.label}"`}
        </div>
        <div style={{display:'flex',gap:4}}>
          {[{k:'bpm',l:'BPM'},{k:'nombre',l:'A-Z'}].map(s=>(
            <button key={s.k} onClick={()=>setSortBy(s.k)}
              style={{padding:'4px 9px',borderRadius:14,fontSize:11,fontWeight:700,
                cursor:'pointer',border:'1px solid var(--bd)',
                background:sortBy===s.k?'var(--s2)':'transparent',
                color:sortBy===s.k?'var(--tx)':'var(--tx3)',fontFamily:FONT}}>
              {s.l}
            </button>
          ))}
        </div>
      </div>
      {filteredSorted.length===0?(
        <div style={{textAlign:'center',padding:'30px 0',color:'var(--tx3)',fontSize:13,fontFamily:FONT}}>
          {colActiva?'No hay canciones en esta colección':'Sin canciones'}
        </div>
      ):filteredSorted.map((c,i)=>(
        <div key={i} onClick={()=>setSongView(i)}
          style={{display:'flex',alignItems:'center',gap:12,padding:'11px 12px',
            borderRadius:12,border:'1px solid var(--bd)',background:'var(--s1)',
            marginBottom:7,cursor:'pointer'}}>
          <div style={{width:36,textAlign:'center',flexShrink:0}}>
            <div style={{fontSize:13,fontWeight:900,color:'var(--ac)',
              lineHeight:1,fontFamily:FONT}}>{c.bpm}</div>
            <div style={{fontSize:9,color:'var(--tx3)'}}>BPM</div>
          </div>
          <div style={{width:1,height:30,background:'var(--bd)',flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',fontFamily:FONT,
              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.n}</div>
            <div style={{fontSize:11,color:'var(--tx3)',marginTop:1}}>
              {c.artista||'Original'} · {c.key}
            </div>
          </div>
          <div style={{display:'flex',gap:3,flexShrink:0}}>
            {colecciones.filter(col=>col.canciones.includes(c.n)).slice(0,2).map(col=>(
              <span key={col.id} style={{fontSize:9,fontWeight:700,padding:'2px 6px',
                borderRadius:10,background:'rgba(200,169,126,.1)',color:'var(--ac)',
                border:'1px solid rgba(200,169,126,.2)',fontFamily:FONT,
                whiteSpace:'nowrap'}}>
                {col.label}
              </span>
            ))}
          </div>
          {SONG_CONTENT_BANDA[c.n]&&(
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
              stroke="var(--ac)" strokeWidth="2" style={{flexShrink:0}}>
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/>
            </svg>
          )}
        </div>
      ))}

      {isEncargado&&(
        <button onClick={()=>onToast('Cargar desde Drive — próximamente')}
          style={{width:'100%',padding:'11px',borderRadius:12,
            border:'1px dashed var(--bd)',background:'transparent',
            color:'var(--tx3)',fontSize:12,fontWeight:700,
            cursor:'pointer',marginTop:4,fontFamily:FONT}}>
          + Cargar canción desde Drive
        </button>
      )}
    </div>
  );
}

