// BandaFechas: gestión de fechas/gigs con detalle (fecha, lugar, equipos, itinerario)
import { useState } from 'react';
import { ALL_ROLES_BANDA, ROLES_MUSICOS } from '../../data/constants';
import { t as getT } from '../../i18n';

export function BandaFechas({gigs,setGigs,members,repertorio,isEncargado,onToast,lang='es'}){
  const tx=getT(lang);
  const [selGig,setSelGig]=useState(null);
  const [mesActivo,setMesActivo]=useState(new Date().getMonth());
  const getRol=(rolId)=>ALL_ROLES_BANDA.find(r=>r.id===rolId)||{label:rolId};

  const gigsPorMes=gigs.filter(g=>new Date(g.fecha).getMonth()===mesActivo||
    gigs.length<4 // si hay pocos, mostrar todos
  ).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));

  const mesesEs=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesesEn=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const mesNombre=(lang==='en'?mesesEn:mesesEs)[mesActivo];

  // ── Detalle de un gig ────────────────────────────────────────────────────
  if(selGig){
    const g=gigs.find(x=>x.id===selGig);
    if(!g)return null;
    const d=new Date(g.fecha);
    const tipoColor={concierto:'var(--ac)',ensayo:'var(--tx2)',festival:'var(--gn)'}[g.tipo]||'var(--ac)';
    const equiposConvocados=g.equipos||[];
    const personasConvocadas=members.filter(m=>
      ROLES_MUSICOS.find(r=>r.id===m.rol)||equiposConvocados.includes(m.rol)
    );

    return(
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}}
          onClick={()=>setSelGig(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
            stroke="var(--tx3)" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)'}}>{tx.fechas}</span>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <h2 style={{margin:0,fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:18,color:'var(--tx)'}}>{g.nombre}</h2>
            <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,padding:'2px 8px',borderRadius:10,
              background:`rgba(0,0,0,.3)`,color:tipoColor,
              border:`1px solid ${tipoColor}44`,textTransform:'uppercase'}}>
              {g.tipo}
            </span>
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)'}}>
            {d.toLocaleDateString(lang==='en'?'en-US':'es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',marginTop:2}}>
            {g.lugar} · {g.ciudad}
          </div>
        </div>
        <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
          background:'var(--s1)',marginBottom:10}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
            letterSpacing:'1px',marginBottom:10}}>Equipos convocados</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {(g.equipos||[]).map(eq=>(
              <span key={eq} style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:200,padding:'4px 10px',
                borderRadius:16,background:'rgba(255,255,255,.06)',
                color:'var(--tx)',border:'1px solid rgba(255,255,255,.12)'}}>
                {getRol(eq).label||eq}
              </span>
            ))}
            {(!g.equipos||g.equipos.length===0)&&(
              <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,color:'var(--tx3)'}}>Sin definir</span>
            )}
          </div>
        </div>
        <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
          background:'var(--s1)',marginBottom:10}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
            letterSpacing:'1px',marginBottom:10}}>Personas convocadas</div>
          {personasConvocadas.map(p=>(
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',
              alignItems:'center',padding:'6px 0',
              borderBottom:'1px solid var(--bd)'}}>
              <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:400,color:'var(--tx)'}}>{p.nombre}</span>
              <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx2)'}}>{getRol(p.rol).label}</span>
            </div>
          ))}
        </div>
        {g.setlist&&g.setlist.length>0&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
              letterSpacing:'1px',marginBottom:10}}>Setlist</div>
            {g.setlist.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,
                padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:300,color:'var(--tx3)',
                  width:20,textAlign:'right'}}>{i+1}</span>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:400,color:'var(--tx)',flex:1}}>{s}</span>
              </div>
            ))}
          </div>
        )}
        {g.ensayos&&g.ensayos.length>0&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
              letterSpacing:'1px',marginBottom:10}}>Ensayos previos</div>
            {g.ensayos.map((e,i)=>{
              const ed=new Date(e.fecha);
              return(
                <div key={i} style={{display:'flex',justifyContent:'space-between',
                  alignItems:'center',padding:'6px 0',
                  borderBottom:'1px solid var(--bd)'}}>
                  <div>
                    <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:400,color:'var(--tx)'}}>{e.lugar}</div>
                    <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)'}}>
                      {ed.toLocaleDateString(lang==='en'?'en-US':'es-CL',{day:'numeric',month:'short'})} · {e.duracion}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {g.notifs&&g.notifs.length>0&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
              letterSpacing:'1px',marginBottom:10}}>Notificaciones</div>
            {g.notifs.map((n,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,
                padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
                  stroke="var(--gn)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:12,fontWeight:300,color:'var(--tx)'}}>{n}</span>
              </div>
            ))}
          </div>
        )}
        {g.notas&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:10}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:13,color:'var(--tx2)',textTransform:'uppercase',
              letterSpacing:'1px',marginBottom:8}}>Notas</div>
            <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:13,fontWeight:300,color:'var(--tx2)',lineHeight:1.5}}>{g.notas}</div>
          </div>
        )}
      </div>
    );
  }

  // ── Lista de gigs ────────────────────────────────────────────────────────
  return(
    <div>
      <div className="ph" style={{marginBottom:16,alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:200,fontSize:28,color:'var(--tx)',lineHeight:1.05}}>
            {lang==='en'?'Dates in':'Fechas en'} <span style={{color:'var(--ac)'}}>{mesNombre}</span>
          </div>
          <div style={{fontFamily:"'Lexend Giga',sans-serif",fontWeight:300,fontSize:12,color:'var(--tx3)',lineHeight:1.5,marginTop:5}}>
            {gigsPorMes.length} {lang==='en'?(gigsPorMes.length===1?'show':'shows'):(gigsPorMes.length===1?'presentación':'presentaciones')} · {lang==='en'?'Tap one to view details':'Toca una para ver el detalle'}
          </div>
        </div>
        {isEncargado&&(
          <button onClick={()=>onToast('Crear evento — próximamente')}
            style={{padding:'8px 14px',borderRadius:100,border:'1px solid rgba(255,255,255,.15)',
              background:'rgba(255,255,255,.06)',color:'var(--tx)',fontSize:11,
              fontWeight:700,cursor:'pointer',fontFamily:"'Lexend Giga',sans-serif",flexShrink:0}}>
            + Nuevo
          </button>
        )}
      </div>

      {gigs.length===0?(
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--tx3)',fontSize:13,fontFamily:"'Lexend Giga',sans-serif",fontWeight:300}}>
          {lang==='en'?'No events scheduled':'Sin eventos programados'}
        </div>
      ):gigsPorMes.map(g=>{
        const d=new Date(g.fecha);
        const tipoColor={concierto:'var(--ac)',ensayo:'var(--tx3)',festival:'var(--gn)'}[g.tipo]||'var(--ac)';
        return(
          <div key={g.id} onClick={()=>setSelGig(g.id)}
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
                {['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][d.getMonth()]}
              </div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:15,color:'var(--tx)',
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {g.nombre}
              </div>
              <div style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:11,fontWeight:300,color:'var(--tx3)',marginTop:2}}>
                {g.lugar} · {g.ciudad}
              </div>
              <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,padding:'2px 7px',borderRadius:10,
                  background:`${tipoColor}18`,color:tipoColor,
                  border:`1px solid ${tipoColor}33`}}>
                  {g.tipo.toUpperCase()}
                </span>
                {g.setlist&&g.setlist.length>0&&(
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,color:'var(--tx3)',
                    padding:'2px 7px',borderRadius:10,
                    border:'1px solid var(--bd)'}}>
                    {g.setlist.length} canciones
                  </span>
                )}
                {g.ensayos&&g.ensayos.length>0&&(
                  <span style={{fontFamily:"'Lexend Giga',sans-serif",fontSize:10,fontWeight:300,color:'var(--tx3)',
                    padding:'2px 7px',borderRadius:10,
                    border:'1px solid var(--bd)'}}>
                    {g.ensayos.length} ensayo{g.ensayos.length>1?'s':''}
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
