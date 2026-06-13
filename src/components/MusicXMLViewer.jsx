// Reproductor y visor de partituras MusicXML (con Tone.js para MIDI)
import { useState, useEffect } from 'react';

export function playMusicXML(url, onEnd){
  // Cargar Tone.js dinámicamente si no está cargado
  if(!window.Tone){
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js';
    script.onload = () => _playMusicXML(url, onEnd);
    document.head.appendChild(script);
  } else {
    _playMusicXML(url, onEnd);
  }
}

export function _playMusicXML(url, onEnd){
  fetch(url)
    .then(r=>r.text())
    .then(xml=>{
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const notes = [];
      const NOTES_MAP = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11};
      let time = 0;
      const divs = doc.querySelectorAll('measure');
      divs.forEach(measure=>{
        measure.querySelectorAll('note').forEach(note=>{
          if(note.querySelector('rest')) return;
          const step  = note.querySelector('pitch step')?.textContent;
          const alter = parseInt(note.querySelector('pitch alter')?.textContent||'0');
          const octave= parseInt(note.querySelector('pitch octave')?.textContent||'4');
          const dur   = parseInt(note.querySelector('duration')?.textContent||'1');
          if(step){
            const midi = (octave+1)*12 + (NOTES_MAP[step]||0) + alter;
            notes.push({midi, time, dur: dur*0.2});
            time += dur*0.2;
          }
        });
      });
      if(!notes.length){ onEnd(); return; }
      const synth = new window.Tone.Synth({
        oscillator:{type:'triangle'},
        envelope:{attack:0.02,decay:0.1,sustain:0.5,release:0.5},
      }).toDestination();
      const part = new window.Tone.Part((t,n)=>{
        synth.triggerAttackRelease(window.Tone.Frequency(n.midi,'midi').toNote(), n.dur, t);
      }, notes.map(n=>([n.time, n])));
      part.start(0);
      window.Tone.Transport.start();
      window.__midiStop = ()=>{
        window.Tone.Transport.stop();
        part.stop();
        synth.dispose();
        onEnd();
      };
      const totalTime = notes[notes.length-1].time + notes[notes.length-1].dur + 0.5;
      setTimeout(()=>{
        window.Tone.Transport.stop();
        onEnd();
      }, totalTime * 1000);
    })
    .catch(err=>{ console.error('Error cargando partitura:', err); onEnd(); });
}

export function MusicXMLViewer({url}){
  const [content,setContent]=useState(null);
  const [error,setError]=useState(null);
  useEffect(()=>{
    fetch(url)
      .then(r=>r.text())
      .then(xml=>{
        const parser=new DOMParser();
        const doc=parser.parseFromString(xml,'text/xml');
        const title=doc.querySelector('work-title,movement-title')?.textContent||'Partitura';
        const composer=doc.querySelector('creator[type="composer"]')?.textContent||'';
        const measures=Array.from(doc.querySelectorAll('measure'));
        const parsed=measures.map(m=>{
          const notes=Array.from(m.querySelectorAll('note')).map(n=>{
            if(n.querySelector('rest'))return{type:'rest',dur:n.querySelector('type')?.textContent||'quarter'};
            return{
              type:'note',
              step:n.querySelector('pitch step')?.textContent||'',
              octave:n.querySelector('pitch octave')?.textContent||'',
              alter:n.querySelector('pitch alter')?.textContent||'0',
              dur:n.querySelector('type')?.textContent||'quarter',
            };
          });
          return{number:m.getAttribute('number'),notes};
        });
        setContent({title,composer,measures:parsed});
      })
      .catch(()=>setError('No se pudo leer el archivo MusicXML.'));
  },[url]);

  if(error)return(
    <div style={{color:'var(--rd)',fontSize:13,textAlign:'center',padding:20}}>{error}</div>
  );
  if(!content)return(
    <div style={{color:'var(--tx3)',fontSize:13,textAlign:'center',padding:20}}>Cargando partitura...</div>
  );
  return(
    <div style={{width:'100%',maxWidth:700,fontFamily:"'Lato',sans-serif"}}>
      <div style={{fontSize:20,fontWeight:900,color:'var(--tx)',marginBottom:4}}>{content.title}</div>
      {content.composer&&<div style={{fontSize:12,color:'var(--tx3)',marginBottom:20}}>{content.composer}</div>}
      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
        {content.measures.map((m,mi)=>(
          <div key={mi} style={{
            padding:'8px 10px',borderRadius:8,
            border:'1px solid var(--bd)',background:'var(--s1)',
            minWidth:80,
          }}>
            <div style={{fontSize:9,color:'var(--tx3)',marginBottom:4,
              fontWeight:700,letterSpacing:'1px'}}>C{m.number}</div>
            <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
              {m.notes.map((n,ni)=>(
                <div key={ni} style={{
                  fontSize:11,fontWeight:700,
                  color:n.type==='rest'?'var(--tx3)':'var(--ac)',
                  minWidth:16,textAlign:'center',
                }}>
                  {n.type==='rest'?'–':`${n.step}${parseInt(n.alter||0)>0?'#':parseInt(n.alter||0)<0?'b':''}${n.octave}`}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


