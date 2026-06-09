const { useState, useEffect, useRef, useCallback } = React;

const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ENHAR = {'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb','Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'};

// EVENTOS: key = día del mes · tipo: 'domingo'|'especial'|'sabado'
const SETLISTS = {
  7:  [{name:'YESHUA',key:'D',bpm:130},{name:'ALABA (PRAISE)',key:'G',bpm:128},{name:'HERMOSO DIOS',key:'D',bpm:92},{name:'SIEMPRE A TIEMPO',key:'Am',bpm:76}],
  14: [{name:'TODA LENGUA TODA NACIÓN',key:'A',bpm:124},{name:'COMO EN EL CIELO',key:'D',bpm:102},{name:'LA BONDAD DE DIOS',key:'C',bpm:89},{name:'OCEANOS',key:'D',bpm:72},{name:'A TI ME RINDO',key:'G',bpm:68}],
  21: null,
  28: [{name:'AL QUE ESTÁ SENTADO EN EL TRONO',key:'G',bpm:126,docId:'1d6561eQni4DZmJ906QqdokLwvvRFeCfTRzB62dqYVCw'},{name:'SANTO POR SIEMPRE',key:'C',bpm:80},{name:'ANCLADO',key:'G',bpm:88},{name:'EN MEMORIA DE TI',key:'G',bpm:60}],
};
const EVENTOS_ESPECIALES=[
  // Julio
  {mes:7,dia:6,tipo:'domingo',label:'Domingo 6 de Julio',setlist:[{name:'LEÓN',key:'E',bpm:120},{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'BUENO ERES TU',key:'D',bpm:94},{name:'AGNUS DEI',key:'G',bpm:65}]},
  {mes:7,dia:13,tipo:'domingo',label:'Domingo 13 de Julio',setlist:[{name:'HERMOSO NOMBRE',key:'G',bpm:84},{name:'QUE SE ABRA EL CIELO',key:'D',bpm:118},{name:'TU PROVEERÁS',key:'G',bpm:73},{name:'SEGURO ESTOY',key:'D',bpm:58}]},
  {mes:7,dia:19,tipo:'sabado',label:'Noche de Adoración',setlist:[{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'HERMOSO NOMBRE',key:'G',bpm:84},{name:'BARRO',key:'C',bpm:82},{name:'COMUNIÓN',key:'D',bpm:62},{name:'AGNUS DEI',key:'G',bpm:65}]},
  {mes:7,dia:20,tipo:'domingo',label:'Domingo 20 de Julio',setlist:[{name:'NO SOY ESCLAVO',key:'A',bpm:112},{name:'BARRO',key:'C',bpm:82},{name:'LO HARÁS OTRA VEZ',key:'G',bpm:70}]},
  {mes:7,dia:27,tipo:'domingo',label:'Domingo 27 de Julio',setlist:[{name:'TODA LENGUA TODA NACIÓN',key:'A',bpm:124},{name:'SIEMPRE YHWH',key:'G',bpm:100},{name:'MI ESPERANZA',key:'G',bpm:90},{name:'A TI ME RINDO',key:'G',bpm:68}]},
  // Agosto
  {mes:8,dia:16,tipo:'sabado',label:'Noche de Adoración',setlist:[{name:'LLEVAME A LA CRUZ',key:'G',bpm:78},{name:'ANCLADO',key:'G',bpm:88},{name:'CENTRO',key:'G',bpm:55},{name:'EN MEMORIA DE TI',key:'G',bpm:60}]},
  // Septiembre
  {mes:9,dia:7,tipo:'domingo',label:'Domingo 7 de Septiembre',setlist:[{name:'ALABA (PRAISE)',key:'G',bpm:128},{name:'COMO EN EL CIELO',key:'D',bpm:102},{name:'HERMOSO DIOS',key:'D',bpm:92},{name:'SIEMPRE A TIEMPO',key:'Am',bpm:76}]},
  {mes:9,dia:14,tipo:'domingo',label:'Domingo 14 de Septiembre',setlist:[{name:'BUENO ERES TU',key:'D',bpm:94},{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'OCEANOS',key:'D',bpm:72},{name:'COMUNIÓN',key:'D',bpm:62}]},
  {mes:9,dia:18,tipo:'especial',label:'Fiestas Patrias',setlist:[{name:'BUENO ERES TU',key:'D',bpm:94},{name:'ALABA (PRAISE)',key:'G',bpm:128},{name:'TODA LENGUA TODA NACIÓN',key:'A',bpm:124},{name:'GLORIA EN GLORIA',key:'D',bpm:86},{name:'A TI ME RINDO',key:'G',bpm:68}]},
  {mes:9,dia:21,tipo:'domingo',label:'Domingo 21 de Septiembre',setlist:[{name:'YESHUA',key:'D',bpm:130},{name:'LA BONDAD DE DIOS',key:'C',bpm:89},{name:'LO HARÁS OTRA VEZ',key:'G',bpm:70},{name:'SEGURO ESTOY',key:'D',bpm:58}]},
];

const CANCIONES = [
  {n:'ALABA (PRAISE)',bpm:128,key:'G'},{n:'YESHUA',bpm:130,key:'D'},{n:'TODA LENGUA TODA NACIÓN',bpm:124,key:'A'},
  {n:'AL QUE ESTÁ SENTADO EN EL TRONO',bpm:126,key:'G'},{n:'LEÓN',bpm:120,key:'E'},{n:'QUE SE ABRA EL CIELO',bpm:118,key:'D'},
  {n:'NO SOY ESCLAVO',bpm:112,key:'A'},{n:'AMOR SIN CONDICIÓN',bpm:110,key:'D'},{n:'TODO CAMBIÓ',bpm:108,key:'G'},
  {n:'SU VENIDA',bpm:105,key:'E'},{n:'COMO EN EL CIELO',bpm:102,key:'D'},{n:'SIEMPRE YHWH',bpm:100,key:'G'},
  {n:'BUENO ERES TU',bpm:94,key:'D'},{n:'HERMOSO DIOS',bpm:92,key:'D'},{n:'MI ESPERANZA ESTÁ EN JESÚS',bpm:90,key:'G'},
  {n:'LA BONDAD DE DIOS',bpm:89,key:'C'},{n:'ANCLADO',bpm:88,key:'G'},{n:'GLORIA EN GLORIA',bpm:86,key:'D'},
  {n:'HERMOSO NOMBRE',bpm:84,key:'G'},{n:'BARRO',bpm:82,key:'C'},{n:'SANTO POR SIEMPRE',bpm:80,key:'C'},
  {n:'LLEVAME A LA CRUZ',bpm:78,key:'G'},{n:'SIEMPRE A TIEMPO',bpm:76,key:'Am'},{n:'TU PROVEERÁS',bpm:73,key:'G'},
  {n:'OCEANOS',bpm:72,key:'D'},{n:'LO HARÁS OTRA VEZ',bpm:70,key:'G'},{n:'A TI ME RINDO',bpm:68,key:'G'},
  {n:'AGNUS DEI',bpm:65,key:'G'},{n:'COMUNIÓN',bpm:62,key:'D'},{n:'EN MEMORIA DE TI',bpm:60,key:'G'},
  {n:'SEGURO ESTOY',bpm:58,key:'D'},{n:'CENTRO',bpm:55,key:'G'},{n:'LLUVIA',bpm:85,key:'A'},
  {n:'EL ESTÁ AQUÍ',bpm:82,key:'D'},{n:'GRACIAS (Majo y Dan)',bpm:100,key:'C'},{n:'GRACIAS DIOS',bpm:96,key:'G'},
  {n:'TEN FE CORAZÓN',bpm:93,key:'G'},{n:'GLORIA A CRISTO',bpm:115,key:'G'},{n:'ANHELO ESTAR EN TU PRESENCIA',bpm:66,key:'D'},
  {n:'ME RINDO TODO A TI',bpm:64,key:'C'},{n:'LA OSCURIDAD TIEMBLA ANTE CRISTO',bpm:116,key:'C'},
];

const MODES = {
  band:    {label:'Bandas',sub:'Para músicos y agrupaciones',events:'Show, Gig, Ensayo',tagline:'Panel de Banda'},
  worship: {label:'Iglesias',sub:'Equipos de adoración',events:'Tiempo de Adoración, Domingo',tagline:'Panel de Adoración'},
  studio:  {label:'Estudios y Academias',sub:'Educación y producción musical',events:'Sesión, Clase, Ensayo',tagline:'Panel de Estudio'},
};

const initials = n => n.trim().split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const tpKey = (key, steps) => {
  const root = key.replace(/m$|maj.*|sus.*|add.*|dim.*|aug.*/, '');
  const suf = key.slice(root.length);
  const base = ENHAR[root] || root;
  const idx = CHROMATIC.indexOf(base);
  if (idx < 0) return key;
  return CHROMATIC[(idx + steps + 12) % 12] + suf;
};

// CSS

// ── MODO BANDA ──────────────────────────────────────────────────────────────
const BANDA_CONFIG = {
  nombre: 'Mi Banda',
  modo: 'banda',
  roles: [
    {id:'encargado', label:'Encargado', icon:'⭐', color:'#c8a97e'},
    {id:'guitarrista', label:'Guitarrista', icon:'🎸', color:'#7b68ee'},
    {id:'bajista', label:'Bajista', icon:'🎸', color:'#5ecea0'},
    {id:'baterista', label:'Baterista', icon:'🥁', color:'#ff6b6b'},
    {id:'dj', label:'DJ', icon:'🎧', color:'#ff9f43'},
    {id:'corista1', label:'Corista 1', icon:'🎤', color:'#74b9ff'},
    {id:'corista2', label:'Corista 2', icon:'🎤', color:'#a29bfe'},
    {id:'teclado', label:'Tecladista', icon:'🎹', color:'#fd79a8'},
  ],
  equipos_trabajo: [
    {id:'roadies', label:'Roadies', icon:'🔧'},
    {id:'produccion', label:'Producción', icon:'🎬'},
    {id:'sonido', label:'Sonido', icon:'🎚'},
    {id:'visuales', label:'Visuales', icon:'💡'},
    {id:'catering', label:'Catering', icon:'🍕'},
    {id:'movilizacion', label:'Movilización', icon:'🚐'},
  ],
};

const COVERS_DEMO = [
  {n:'ANCLADO', key:'E', bpm:88, artista:'Bethel Music', tipo:'cover'},
  {n:'OCEANOS', key:'Bm', bpm:72, artista:'Hillsong United', tipo:'cover'},
  {n:'GLORIA EN GLORIA', key:'D', bpm:86, artista:'Bethel Music', tipo:'cover'},
  {n:'TODO CAMBIÓ', key:'G', bpm:82, artista:'Maverick City Music', tipo:'cover'},
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@500;700;900&family=Lato:wght@300;400;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
--bg:#07070f;--s1:rgba(255,255,255,0.055);--s2:rgba(255,255,255,0.03);--s3:rgba(255,255,255,0.09);
--bd:rgba(255,255,255,0.09);--bd2:rgba(255,255,255,0.15);
--ac:#c8a97e;--tx:#ede9ff;--tx2:#9e9ab6;--tx3:#5a566e;
--gn:#5ecea0;--rd:#ff5252;--btn-c:#07070f;
}
[data-theme=cream]{
--bg:#f0ebe0;--s1:rgba(0,0,0,0.04);--s2:rgba(0,0,0,0.02);--s3:rgba(0,0,0,0.07);
--bd:rgba(0,0,0,0.1);--bd2:rgba(0,0,0,0.18);
--ac:#7a5c3a;--tx:#1a1208;--tx2:#5a4a30;--tx3:#a09070;
--gn:#3a7a50;--rd:#c04040;--btn-c:#fffdf7;
}
[data-theme=gray]{
--bg:#28282f;--s1:rgba(255,255,255,0.07);--s2:rgba(255,255,255,0.04);--s3:rgba(255,255,255,0.11);
--bd:rgba(255,255,255,0.11);--bd2:rgba(255,255,255,0.18);
--ac:#e07820;--tx:#f0ede8;--tx2:#aaa49e;--tx3:#70685e;
--gn:#5ecea0;--rd:#ff5252;--btn-c:#fff;
}
body{background:var(--bg);color:var(--tx);font-family:'Lato',sans-serif;min-height:100vh;overflow-x:hidden;transition:background .3s,color .3s;}
#root{min-height:100vh;}
.bg-fx{position:fixed;inset:0;pointer-events:none;z-index:0;
background:radial-gradient(ellipse 80% 55% at 15% -5%,rgba(139,114,212,.15) 0%,transparent 55%),
radial-gradient(ellipse 65% 45% at 85% 105%,rgba(200,169,126,.12) 0%,transparent 50%);}
[data-theme=cream] .bg-fx,[data-theme=gray] .bg-fx{opacity:.3;}
/* ── GLASS ── */
.card{background:var(--s1);backdrop-filter:blur(22px) saturate(180%);border:1px solid var(--bd);border-radius:14px;position:relative;overflow:hidden;}
.card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.04) 0%,transparent 55%);pointer-events:none;border-radius:inherit;}
.card-hdr{padding:12px 16px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;}
.card-body{padding:13px 16px;}
/* ── TYPE ── */
.ff{font-family:'Lato',sans-serif;font-weight:900;}
.title{font-family:'Lato',sans-serif;font-weight:900;font-size:clamp(28px,4vw,40px);color:var(--tx);line-height:1.05;}
.ac{color:var(--ac);}
.lbl{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:var(--tx3);}
/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:100px;border:none;cursor:pointer;font-family:'Lato',sans-serif;font-size:12px;font-weight:700;transition:all .2s;letter-spacing:.2px;}
.btn svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;flex-shrink:0;}
.btn-p{background:var(--ac);color:var(--btn-c);}
.btn-p:hover{opacity:.88;}
.btn-g{background:var(--s1);color:var(--tx2);border:1px solid var(--bd);}
.btn-g:hover{background:var(--s3);color:var(--tx);}
.btn-s{background:rgba(200,169,126,.1);color:var(--ac);border:1px solid rgba(200,169,126,.22);}
.btn-s:hover{background:rgba(200,169,126,.18);}
.btn-sm{padding:5px 12px;font-size:11px;}
.btn-xs{padding:3px 8px;font-size:10px;}
.btn:disabled{opacity:.25;pointer-events:none;}
.ib{width:26px;height:26px;border-radius:7px;border:1px solid var(--bd);background:var(--s1);color:var(--tx3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.ib svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:1.8;}
.ib:hover{background:var(--s3);color:var(--tx);}
.ib.del:hover{background:rgba(255,82,82,.1);color:var(--rd);border-color:rgba(255,82,82,.35);}
/* ── INPUT ── */
.inp{background:rgba(255,255,255,.05);border:1px solid var(--bd);border-radius:9px;padding:8px 12px;color:var(--tx);font-family:'Lato',sans-serif;font-size:13px;outline:none;transition:all .2s;width:100%;}
.inp:focus{border-color:rgba(200,169,126,.45);box-shadow:0 0 0 3px rgba(200,169,126,.1);}
.inp::placeholder{color:var(--tx3);}
[data-theme=cream] .inp,[data-theme=gray] .inp{background:rgba(0,0,0,.04);}
/* ── BADGE ── */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:100px;font-size:10px;font-weight:700;}
.bdot{width:4px;height:4px;border-radius:50%;background:currentColor;}
.b-draft{background:rgba(90,86,110,.25);color:var(--tx3);border:1px solid rgba(90,86,110,.3);}
.b-pub{background:rgba(94,206,160,.1);color:var(--gn);border:1px solid rgba(94,206,160,.22);}
/* ── SIDEBAR ── */
.sb{position:fixed;left:0;top:0;bottom:0;width:218px;background:rgba(6,6,14,.88);backdrop-filter:blur(30px) saturate(200%);border-right:1px solid var(--bd);display:flex;flex-direction:column;z-index:20;transition:width .25s cubic-bezier(.4,0,.2,1);overflow:hidden;}
[data-theme=cream] .sb{background:rgba(236,230,218,.9);}
[data-theme=gray] .sb{background:rgba(26,26,34,.9);}
.sb.col{width:58px;}
.sb-top{display:flex;align-items:flex-start;padding:17px 13px 14px;border-bottom:1px solid var(--bd);gap:9px;min-height:74px;}
.logo-mk{width:38px;height:38px;flex-shrink:0;background:linear-gradient(135deg,#4a3a8a,var(--ac));border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(100,80,180,.3);}
.logo-mk svg{width:17px;height:17px;stroke:#fff;fill:none;stroke-width:1.5;}
.logo-txt{flex:1;overflow:hidden;transition:opacity .2s;}
.logo-txt h1{font-family:'Lato',sans-serif;font-weight:900;font-size:19px;color:var(--tx);white-space:nowrap;}
.logo-txt span{font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:2px;font-weight:700;white-space:nowrap;}
.sb.col .logo-txt,.sb.col .th-sw{opacity:0;pointer-events:none;}
.sb-r{display:flex;flex-direction:column;align-items:flex-end;gap:7px;flex-shrink:0;}
.sb-btn{width:22px;height:22px;border-radius:5px;border:1px solid var(--bd);background:var(--s1);color:var(--tx3);cursor:pointer;display:flex;align-items:center;justify-content:center;}
.sb-btn:hover{background:var(--s3);color:var(--tx);}
.sb-btn svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:1.8;}
.th-sw{display:flex;gap:5px;align-items:center;}
.th-btn{width:14px;height:14px;border-radius:50%;border:1.5px solid transparent;cursor:pointer;transition:all .18s;}
.th-btn:hover{transform:scale(1.15);border-color:rgba(255,255,255,.35);}
.th-btn.on{border-color:rgba(255,255,255,.9);box-shadow:0 0 0 1px rgba(255,255,255,.25);}
[data-theme=cream] .th-btn.on,[data-theme=gray] .th-btn.on{border-color:var(--tx2);}
.nav-sec{padding:11px 8px;flex:1;overflow:hidden;}
.nav-grp{font-size:8px;text-transform:uppercase;letter-spacing:2px;color:var(--tx3);padding:0 8px;margin-bottom:3px;font-weight:700;white-space:nowrap;transition:opacity .2s;}
.sb.col .nav-grp{opacity:0;}
.ni{display:flex;align-items:center;gap:8px;padding:8px;border-radius:9px;cursor:pointer;color:var(--tx2);transition:all .15s;margin-bottom:1px;white-space:nowrap;overflow:hidden;border:1px solid transparent;}
.ni:hover{background:var(--s1);color:var(--tx);}
.ni.on{background:linear-gradient(135deg,rgba(200,169,126,.1),rgba(100,80,180,.07));color:var(--tx);border-color:rgba(200,169,126,.14);}
.ni.on .ni-dot{background:var(--ac);box-shadow:0 0 6px var(--ac);}
.ni-dot{width:4px;height:4px;border-radius:50%;background:var(--tx3);flex-shrink:0;transition:all .2s;}
.ni-ic{width:19px;height:19px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.ni-ic svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.6;}
.ni-lb{font-size:12px;transition:opacity .2s;flex:1;}
.sb.col .ni-lb,.sb.col .ni-dot{opacity:0;}
.sb-foot{padding:11px 11px;border-top:1px solid var(--bd);}
.u-chip{display:flex;align-items:center;gap:8px;overflow:hidden;}
.u-av{width:28px;height:28px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#4a3a8a,var(--ac));display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;color:#fff;letter-spacing:-.5px;}
.u-inf{flex:1;min-width:0;overflow:hidden;transition:opacity .2s;}
.sb.col .u-inf{opacity:0;}
/* ── MAIN ── */
.main{margin-left:218px;transition:margin-left .25s cubic-bezier(.4,0,.2,1);min-height:100vh;position:relative;z-index:1;}
.main.col{margin-left:58px;}
.pw{padding:10px 8px 90px;}
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;}
.ph-btns{display:flex;gap:7px;margin-top:4px;flex-wrap:wrap;}
.two{display:grid;grid-template-columns:1fr 282px;gap:13px;align-items:start;}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:16px;}
.sc{background:var(--s1);backdrop-filter:blur(20px);border:1px solid var(--bd);border-radius:13px;padding:13px 15px;position:relative;overflow:hidden;}
.sc::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);}
.sc-n{font-family:'Lato',sans-serif;font-weight:900;font-size:32px;color:var(--tx);line-height:1;}
/* ── DOM STRIP + CAL ── */
.sc-row{display:flex;gap:10px;align-items:flex-start;margin-bottom:18px;}
.sc-row .dom-strip{flex:1;margin-bottom:0;}
.dom-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:3px;scrollbar-width:none;}
.dom-strip::-webkit-scrollbar{display:none;}
.dc{flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding:8px 12px 7px;border-radius:11px;border:1px solid var(--bd);background:var(--s1);backdrop-filter:blur(14px);cursor:pointer;transition:all .2s;min-width:63px;}
.dc:hover{background:var(--s3);transform:translateY(-1px);border-color:var(--bd2);}
.dc.on{border-color:rgba(200,169,126,.4);background:linear-gradient(135deg,rgba(200,169,126,.1),rgba(100,80,180,.06));box-shadow:0 4px 18px rgba(200,169,126,.1);}
.dc.sin{background:rgba(255,82,82,.06);border-color:rgba(255,82,82,.2);}
.dc.lib{background:rgba(94,206,160,.06);border-color:rgba(94,206,160,.2);}
.dc-d{font-family:'Lato',sans-serif;font-weight:900;font-size:20px;color:var(--tx);line-height:1;}
.dc.sin .dc-d{color:var(--rd);}
.dc.on .dc-d{color:var(--ac);}
.dc-m{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;color:var(--tx3);font-weight:700;margin-top:2px;}
.dc-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.12);margin-top:4px;}
.dc.on .dc-dot,.dc.pub .dc-dot{background:var(--ac);box-shadow:0 0 6px var(--ac);}
.dc.pub:not(.on) .dc-dot{background:var(--gn);}
.dc-badge{font-size:7px;padding:2px 6px;border-radius:100px;white-space:nowrap;font-weight:700;margin-top:3px;}
.dc-badge.lib{background:rgba(94,206,160,.12);color:var(--gn);border:1px solid rgba(94,206,160,.22);}
.dc-badge.sin{background:rgba(255,82,82,.1);color:var(--rd);border:1px solid rgba(255,82,82,.22);}
/* mini calendar */
.mcal{flex-shrink:0;width:40px;background:var(--s1);backdrop-filter:blur(14px);border:1px solid var(--bd);border-radius:10px;padding:7px 5px;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);overflow:hidden;}
.mcal.exp{width:182px;border-radius:12px;padding:10px 11px;}
/* ── SETLIST ── */
.sl-i{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;background:rgba(255,255,255,.03);border:1px solid transparent;transition:all .15s;margin-bottom:4px;}
.sl-i:hover{background:rgba(255,255,255,.06);border-color:var(--bd);}
.sl-i.cl{cursor:pointer;}
.sl-n{font-family:'Lato',sans-serif;font-weight:900;font-size:16px;color:var(--tx3);width:17px;text-align:center;flex-shrink:0;}
.sl-info{flex:1;min-width:0;}
.sl-name{font-weight:700;color:var(--tx);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sl-meta{font-size:10px;color:var(--tx3);margin-top:1px;}
.sl-bpm{font-size:10px;color:var(--ac);font-weight:700;flex-shrink:0;opacity:.8;}
.sl-acts{display:flex;gap:4px;opacity:0;transition:opacity .15s;}
.sl-i:hover .sl-acts{opacity:1;}
.dh{color:var(--tx3);cursor:grab;font-size:9px;opacity:.3;}
.add-a{border:1px dashed rgba(255,255,255,.1);border-radius:9px;padding:9px;text-align:center;cursor:pointer;color:var(--tx3);font-size:12px;margin-top:5px;display:flex;align-items:center;justify-content:center;gap:6px;font-weight:700;transition:all .15s;}
.add-a svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2;}
.add-a:hover{border-color:rgba(200,169,126,.35);color:var(--ac);background:rgba(200,169,126,.04);}
[data-theme=cream] .add-a{border-color:rgba(0,0,0,.15);}
/* ── TEAM ── */
.mr{display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);}
.mr:last-child{border-bottom:none;}
[data-theme=cream] .mr,[data-theme=gray] .mr{border-bottom-color:rgba(0,0,0,.06);}
.m-av{width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:900;color:#fff;letter-spacing:-.5px;}
.m-nm{flex:1;font-size:12px;font-weight:700;color:var(--tx);}
.r-sel{background:rgba(255,255,255,.05);border:1px solid var(--bd);border-radius:5px;color:var(--tx);font-family:'Lato',sans-serif;font-size:10px;padding:3px 5px;cursor:pointer;outline:none;}
[data-theme=cream] .r-sel,[data-theme=gray] .r-sel{background:rgba(0,0,0,.04);}
/* ── PUB PANEL ── */
.pub{background:linear-gradient(135deg,rgba(200,169,126,.07),rgba(100,80,180,.04));border:1px solid rgba(200,169,126,.14);border-radius:13px;padding:13px 15px;margin-top:11px;backdrop-filter:blur(12px);}
.nlist{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:9px;}
.nc{display:flex;align-items:center;gap:4px;padding:3px 7px;border-radius:100px;background:rgba(255,255,255,.05);border:1px solid var(--bd);font-size:10px;color:var(--tx2);font-weight:700;}
.nc-av{width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#4a3a8a,var(--ac));font-size:6px;font-weight:900;color:#fff;display:flex;align-items:center;justify-content:center;}
/* ── CANCIONERO BPM ── */
.bpm-sec{margin-bottom:20px;border-radius:13px;padding:15px;border:1px solid var(--bd);position:relative;overflow:hidden;}
.bpm-sec::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;}
.bpm-sec.fast::before{background:radial-gradient(ellipse at top left,rgba(255,82,82,.06),transparent 65%);}
.bpm-sec.mid::before{background:radial-gradient(ellipse at top left,rgba(200,169,126,.05),transparent 65%);}
.bpm-sec.slow::before{background:radial-gradient(ellipse at top left,rgba(94,206,160,.05),transparent 65%);}
.bpm-bar{width:100%;height:2px;border-radius:2px;margin-bottom:11px;opacity:.5;}
.bpm-bar.fast{background:linear-gradient(90deg,var(--rd),#ff8c00);}
.bpm-bar.mid{background:linear-gradient(90deg,var(--ac),#a07840);}
.bpm-bar.slow{background:linear-gradient(90deg,#4a3a8a,var(--gn));}
.sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:6px;}
.scard{background:var(--s1);border:1px solid var(--bd);border-radius:9px;padding:10px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.scard::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.04) 0%,transparent 60%);pointer-events:none;}
.scard:hover{border-color:rgba(200,169,126,.3);transform:translateY(-2px);box-shadow:0 8px 26px rgba(0,0,0,.3);}
.scard-bpm{position:absolute;top:6px;right:6px;font-size:9px;font-weight:900;color:var(--ac);background:rgba(200,169,126,.1);border-radius:4px;padding:2px 5px;border:1px solid rgba(200,169,126,.15);}
.scard-n{font-weight:700;color:var(--tx);font-size:11px;line-height:1.4;}
.scard-s{font-size:9px;color:var(--tx3);margin-top:3px;text-transform:uppercase;letter-spacing:1px;font-weight:700;}
/* ── EQUIPOS ── */
.eq-card{background:var(--s1);backdrop-filter:blur(20px);border:1px solid var(--bd);border-radius:14px;overflow:hidden;position:relative;}
.eq-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent);}
/* ── BACKSTAGE ── */
.bs{background:linear-gradient(135deg,rgba(100,80,180,.08),rgba(200,169,126,.04));border:1px solid rgba(100,80,180,.2);border-radius:13px;padding:15px;margin-bottom:15px;}
.bs-hdr{display:flex;align-items:center;gap:8px;margin-bottom:13px;}
/* ── MODAL ── */
.mov{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(10px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fi .18s ease;}
@keyframes fi{from{opacity:0}to{opacity:1}}
.modal{background:rgba(8,8,20,.9);backdrop-filter:blur(36px) saturate(200%);border:1px solid var(--bd2);border-radius:18px;width:100%;max-width:455px;max-height:84vh;display:flex;flex-direction:column;box-shadow:0 28px 60px rgba(0,0,0,.55);animation:su .2s ease;}
[data-theme=cream] .modal{background:rgba(240,234,222,.96);}
[data-theme=gray] .modal{background:rgba(24,24,30,.96);}
@keyframes su{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.m-hdr{padding:17px 19px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;}
.m-body{padding:0 10px 10px;overflow-y:auto;flex:1;}
.m-ftr{padding:11px 17px;border-top:1px solid var(--bd);display:flex;justify-content:flex-end;gap:7px;}
.so{display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;transition:background .1s;}
.so:hover{background:rgba(255,255,255,.05);}
.so.on{background:rgba(200,169,126,.08);}
.so-n{font-size:13px;font-weight:700;color:var(--tx);flex:1;}
.so-bpm{font-size:10px;color:var(--ac);font-weight:900;opacity:.7;}
.so-chk{width:16px;height:16px;border-radius:50%;border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;font-size:9px;color:transparent;transition:all .15s;}
.so.on .so-chk{background:var(--ac);border-color:var(--ac);color:var(--btn-c);}
/* ── SONG VIEW ── */
.sv{position:fixed;inset:0;background:rgba(4,4,12,.97);z-index:50;display:flex;flex-direction:column;animation:slr .3s cubic-bezier(.4,0,.2,1);}
.sv-hdr{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--bd);background:rgba(6,6,18,.85);flex-shrink:0;}
.sv-back{width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.07);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
.sv-back svg{width:13px;height:13px;stroke:var(--tx2);fill:none;stroke-width:2;}
.sv-back:hover{background:rgba(255,255,255,.12);}
/* toolbar 1 */
.sv-tb1{display:flex;align-items:center;gap:3px;padding:0 8px;border-bottom:1px solid var(--bd);background:rgba(6,6,18,.8);flex-shrink:0;height:44px;}
.sv-t{width:34px;height:34px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--tx3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
.sv-t svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.8;}
.sv-t:hover{background:rgba(255,255,255,.07);color:var(--tx);border-color:var(--bd);}
.sv-t.on{background:rgba(200,169,126,.1);color:var(--ac);border-color:rgba(200,169,126,.3);}
.sv-t-del:hover{color:var(--rd);}
.sv-col-wrap{position:relative;width:32px;height:32px;border-radius:8px;border:1px solid var(--bd);background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;gap:2px;cursor:pointer;flex-shrink:0;}
.sv-col-dot{width:14px;height:14px;border-radius:50%;border:1px solid rgba(255,255,255,.2);}
.sv-ref{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:8px;border:1px solid var(--bd);background:rgba(255,255,255,.05);color:var(--tx2);font-family:'Lato',sans-serif;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s;}
.sv-ref svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:1.8;}
.sv-ref:hover{background:rgba(255,255,255,.1);color:var(--tx);}
/* toolbar 2 */
.sv-tb2{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--bd);background:rgba(5,5,16,.75);flex-shrink:0;}
.sv-mode{display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:100px;border:1px solid var(--bd);background:transparent;color:var(--tx2);font-family:'Lato',sans-serif;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .15s;}
.sv-mode svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:1.8;}
.sv-mode:hover{background:rgba(255,255,255,.07);color:var(--tx);}
.sv-mode.on{background:rgba(200,169,126,.1);color:var(--ac);border-color:rgba(200,169,126,.3);}
.sv-save{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:100px;border:1px solid rgba(94,206,160,.3);background:rgba(94,206,160,.08);color:var(--gn);font-family:'Lato',sans-serif;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .15s;}
.sv-save svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.5;}
.sv-save:hover{background:rgba(94,206,160,.15);}
/* panel lateral */
.sv-side{width:52px;display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 4px;border-left:1px solid var(--bd);background:rgba(5,5,14,.8);flex-shrink:0;}
.sv-side-btn{width:40px;height:38px;border-radius:10px;border:1px solid var(--bd);background:rgba(255,255,255,.05);color:var(--tx2);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;transition:all .15s;font-family:'Lato',sans-serif;}
.sv-side-btn:hover{background:rgba(200,169,126,.1);color:var(--ac);border-color:rgba(200,169,126,.3);}
.sv-side-key{font-family:'Lato',sans-serif;font-weight:900;font-size:18px;color:var(--ac);text-align:center;line-height:1;padding:4px 0;}
.sv-side-sep{width:70%;height:1px;background:var(--bd);margin:4px 0;}
.sv-capo{width:40px;height:auto;min-height:38px;border-radius:10px;border:1px solid var(--bd);background:rgba(255,255,255,.05);color:var(--tx3);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:5px 2px;transition:all .15s;font-family:'Lato',sans-serif;}
.sv-capo:hover{background:rgba(200,169,126,.1);color:var(--ac);border-color:rgba(200,169,126,.3);}
.sv-hdr{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--bd);background:rgba(6,6,18,.85);flex-shrink:0;}
.sv-back{width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.07);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
.sv-back:hover{background:rgba(255,255,255,.12);}
.sv-back svg{width:13px;height:13px;stroke:var(--tx2);fill:none;stroke-width:2;}
/* toolbar */
.ann-tb{display:flex;align-items:center;padding:0 11px;border-bottom:1px solid var(--bd);background:rgba(6,6,18,.8);flex-shrink:0;height:48px;gap:4px;overflow:hidden;}
.tb{display:flex;align-items:center;justify-content:center;gap:4px;height:32px;padding:0 9px;border-radius:7px;border:1px solid var(--bd);background:transparent;color:var(--tx3);cursor:pointer;font-size:11px;font-family:'Lato',sans-serif;font-weight:700;transition:all .15s;white-space:nowrap;flex-shrink:0;}
.tb svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:1.8;flex-shrink:0;}
.tb:hover,.tb.on{background:rgba(255,255,255,.08);color:var(--tx);border-color:var(--bd2);}
.tb.on{border-color:rgba(200,169,126,.4);color:var(--ac);}
.cd{width:12px;height:12px;border-radius:50%;flex-shrink:0;box-shadow:0 0 0 1px rgba(255,255,255,.15);}
.tsp{width:1px;height:18px;background:var(--bd);margin:0 2px;flex-shrink:0;}
.ssel{background:rgba(255,255,255,.05);border:1px solid var(--bd);border-radius:5px;color:var(--tx2);font-family:'Lato',sans-serif;font-size:11px;padding:3px 4px;cursor:pointer;outline:none;flex-shrink:0;}
.tb-sp{flex:1;}
/* transpose */
.tp{display:flex;align-items:center;gap:4px;flex-shrink:0;background:rgba(255,255,255,.04);border:1px solid var(--bd);border-radius:8px;padding:3px 8px;}
.tp-lbl{font-size:9px;color:var(--tx3);font-weight:900;text-transform:uppercase;letter-spacing:1px;}
.tp-key{font-size:14px;font-weight:900;color:var(--ac);min-width:30px;text-align:center;font-family:'Lato',sans-serif;font-weight:900;font-size:16px;}
.tp-btn{width:26px;height:26px;border-radius:6px;border:1px solid var(--bd);background:rgba(255,255,255,.06);color:var(--tx2);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;transition:all .15s;flex-shrink:0;line-height:1;}
.tp-btn:hover{background:linear-gradient(135deg,#4a3a8a,var(--ac));border-color:transparent;color:#fff;box-shadow:0 2px 10px rgba(100,80,180,.3);}
.tp-btn:active{transform:scale(.92);}
.tp-delta{font-size:10px;color:var(--tx3);font-weight:700;min-width:22px;text-align:center;}
/* canvas */
.sv-wrap{flex:1;position:relative;overflow:hidden;}
.doc-if{position:absolute;inset:0;width:100%;height:100%;border:none;z-index:1;}
.draw-cv{position:absolute;top:0;left:0;width:100%;height:100%;z-index:2;touch-action:none;cursor:crosshair;}
/* sv nav */
.sv-tb1{display:flex;align-items:center;gap:3px;padding:0 10px;border-bottom:1px solid var(--bd);background:rgba(5,5,14,.95);flex-shrink:0;height:48px;overflow-x:auto;scrollbar-width:none;}
.sv-tb1::-webkit-scrollbar{display:none;}
.sv-tb2{display:flex;align-items:center;gap:6px;padding:0 10px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(5,5,14,.8);flex-shrink:0;height:40px;}
.sv-t{width:36px;height:36px;border-radius:9px;border:1px solid transparent;background:transparent;color:var(--tx3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s;flex-shrink:0;}
.sv-t svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.7;}
.sv-t:hover{background:rgba(255,255,255,.07);color:var(--tx2);border-color:var(--bd);}
.sv-t.on{background:rgba(255,255,255,.1);color:var(--tx);border-color:var(--bd);}
.sv-t-del:hover{color:var(--rd);}
.sv-col-wrap{position:relative;display:flex;align-items:center;gap:4px;padding:5px 9px;border-radius:9px;border:1px solid var(--bd);background:rgba(255,255,255,.05);cursor:pointer;height:32px;flex-shrink:0;}
.sv-col-dot{width:13px;height:13px;border-radius:50%;flex-shrink:0;box-shadow:0 0 0 1px rgba(255,255,255,.15);}
.sv-col-sel{position:absolute;inset:0;opacity:0;cursor:pointer;}
.sv-ref{display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:9px;border:1px solid var(--bd);background:rgba(255,255,255,.05);color:var(--tx2);cursor:pointer;font-size:11px;font-weight:700;font-family:'Lato',sans-serif;white-space:nowrap;flex-shrink:0;height:32px;}
.sv-ref svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.8;}
.sv-ref:hover{background:rgba(255,255,255,.09);color:var(--ac);}
.sv-mode{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:8px;border:1px solid var(--bd);background:rgba(255,255,255,.04);color:var(--tx3);cursor:pointer;font-size:11px;font-weight:700;font-family:'Lato',sans-serif;white-space:nowrap;transition:all .12s;height:30px;}
.sv-mode svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2;}
.sv-mode:hover{background:rgba(255,255,255,.07);color:var(--tx2);}
.sv-mode.on{background:rgba(200,169,126,.12);color:var(--ac);border-color:rgba(200,169,126,.3);}
.sv-save{display:flex;align-items:center;gap:5px;padding:4px 12px;border-radius:8px;border:1px solid rgba(94,206,160,.28);background:rgba(94,206,160,.07);color:var(--gn);cursor:pointer;font-size:11px;font-weight:700;font-family:'Lato',sans-serif;white-space:nowrap;flex-shrink:0;height:30px;}
.sv-save svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.5;}
.sv-save:hover{background:rgba(94,206,160,.13);}
.sv-side{width:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 4px;border-left:1px solid var(--bd);background:rgba(4,4,12,.85);flex-shrink:0;}
.sv-side-btn{width:42px;height:38px;border-radius:10px;border:1px solid var(--bd);background:rgba(255,255,255,.05);color:var(--tx3);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:all .12s;font-size:9px;font-weight:900;letter-spacing:.5px;}
.sv-side-btn svg{stroke:currentColor;flex-shrink:0;}
.sv-side-btn:hover{background:rgba(200,169,126,.12);color:var(--ac);border-color:rgba(200,169,126,.28);}
.sv-side-key{font-family:'Lato',sans-serif;font-weight:900;font-size:20px;color:var(--ac);text-align:center;line-height:1;padding:3px 0;}
.sv-side-sep{width:28px;height:1px;background:var(--bd);margin:3px 0;}
.sv-capo{width:42px;padding:7px 0;border-radius:10px;border:1px solid var(--bd);background:rgba(255,255,255,.04);color:var(--tx3);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;transition:all .12s;}
.sv-capo:hover{background:rgba(200,169,126,.1);color:var(--ac);border-color:rgba(200,169,126,.22);}
.sv-capo svg{stroke:currentColor;}
.sv-nav{padding:8px 14px;border-top:1px solid var(--bd);background:rgba(5,5,14,.88);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0;}
.sv-ni{text-align:center;flex:1;}
.nb{display:flex;align-items:center;gap:5px;padding:7px 13px;border-radius:100px;border:1px solid var(--bd);background:rgba(255,255,255,.06);color:var(--tx2);cursor:pointer;font-family:'Lato',sans-serif;font-size:12px;font-weight:700;transition:all .15s;white-space:nowrap;}
.nb svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2;}
.nb:hover{background:rgba(255,255,255,.1);color:var(--tx);}
.nb.p{background:var(--ac);border-color:transparent;color:var(--btn-c);}
.nb:disabled{opacity:.2;pointer-events:none;}
/* ── REHEARSAL ── */
.rh{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;animation:slu .4s cubic-bezier(.4,0,.2,1);}
@keyframes slu{from{transform:translateY(100%)}to{transform:translateY(0)}}
.rh-bg{position:absolute;inset:0;background:#07070f;}
[data-theme=cream] .rh .rh-bg{background:#f0ebe0;}
[data-theme=gray] .rh .rh-bg{background:#28282f;}
.rh-inner{position:relative;z-index:1;display:flex;flex-direction:column;height:100%;}
.rh-hdr{display:flex;align-items:center;justify-content:space-between;padding:13px 20px;border-bottom:1px solid var(--bd);flex-shrink:0;}
.rh-live{display:flex;align-items:center;gap:6px;padding:5px 13px;border-radius:100px;background:rgba(255,82,82,.1);border:1px solid rgba(255,82,82,.28);color:var(--rd);font-size:10px;font-weight:900;letter-spacing:1px;flex-shrink:0;}
.rh-dot{width:6px;height:6px;border-radius:50%;background:var(--rd);animation:rp 1.2s infinite;box-shadow:0 0 6px var(--rd);}
@keyframes rp{0%,100%{opacity:1}50%{opacity:.3}}
.rh-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;gap:22px;}
.rh-display{text-align:center;max-width:600px;width:100%;}
.rh-num{font-size:10px;color:var(--tx3);font-weight:700;text-transform:uppercase;letter-spacing:2.5px;margin-bottom:9px;}
.rh-name{font-family:'Lato',sans-serif;font-weight:900;font-size:clamp(30px,6vw,56px);color:var(--tx);line-height:1.0;margin-bottom:13px;}
.rh-tags{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;margin-bottom:14px;}
.rh-tag{font-size:12px;color:var(--tx2);background:var(--s1);border:1px solid var(--bd);padding:5px 13px;border-radius:100px;font-weight:700;}
.rh-tag.bpm{color:var(--ac);border-color:rgba(200,169,126,.25);background:rgba(200,169,126,.07);}
.rh-prog{display:flex;gap:8px;justify-content:center;}
.rh-pd{width:8px;height:8px;border-radius:50%;background:var(--s3);transition:all .3s;}
.rh-pd.on{background:var(--ac);transform:scale(1.4);box-shadow:0 0 10px var(--ac);}
.rh-pd.done{background:var(--gn);}
.rh-ctrls{display:flex;align-items:center;gap:9px;flex-wrap:wrap;justify-content:center;}
.rh-btn{display:flex;align-items:center;gap:7px;padding:11px 20px;border-radius:100px;border:1px solid var(--bd);background:var(--s1);color:var(--tx2);cursor:pointer;font-family:'Lato',sans-serif;font-size:14px;font-weight:700;transition:all .2s;white-space:nowrap;}
.rh-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;}
.rh-btn:hover{background:var(--s3);color:var(--tx);}
.rh-btn.go{background:var(--ac);border-color:transparent;color:var(--btn-c);padding:13px 28px;font-size:15px;}
.rh-btn.go:hover{opacity:.88;}
.rh-btn.end{background:rgba(255,82,82,.08);color:var(--rd);border-color:rgba(255,82,82,.22);}
.rh-btn:disabled{opacity:.2;pointer-events:none;}
.rh-team{width:100%;max-width:600px;background:var(--s1);border:1px solid var(--bd);border-radius:13px;padding:13px 17px;}
.rh-chips{display:flex;gap:6px;flex-wrap:wrap;}
.rh-chip{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:100px;background:var(--s2);border:1px solid var(--bd);font-size:11px;color:var(--tx2);}
.rh-chav{width:17px;height:17px;border-radius:50%;background:linear-gradient(135deg,#4a3a8a,var(--ac));font-size:7px;font-weight:900;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rh-chr{color:var(--ac);font-weight:700;}
/* ── ONBOARDING ── */
.ob-wrap{position:fixed;inset:0;background:rgba(4,4,12,.96);backdrop-filter:blur(20px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
.ob-card{background:rgba(10,10,22,.93);backdrop-filter:blur(40px) saturate(200%);border:1px solid var(--bd2);border-radius:20px;width:100%;max-width:440px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04);animation:su .3s ease;}
.ob-step{padding:28px 26px 24px;}
.ob-lgo{display:flex;align-items:center;gap:11px;margin-bottom:20px;}
.ob-lbl{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:var(--tx3);margin-bottom:7px;}
.ob-ttl{font-family:'Lato',sans-serif;font-weight:900;font-size:25px;color:var(--tx);line-height:1.1;margin-bottom:5px;}
.ob-sub{font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:19px;}
.ob-langs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:19px;}
.ob-lang{border:1.5px solid var(--bd);border-radius:11px;padding:12px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.03);}
.ob-lang:hover{background:rgba(255,255,255,.06);}
.ob-lang.on{border-color:rgba(200,169,126,.4);background:rgba(200,169,126,.06);}
.ob-modes{display:flex;flex-direction:column;gap:7px;margin-bottom:13px;}
.ob-mode{border:1.5px solid var(--bd);border-radius:11px;padding:12px 14px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.03);}
.ob-mode:hover{background:rgba(255,255,255,.06);}
.ob-mode.on{border-color:rgba(200,169,126,.4);background:rgba(200,169,126,.06);}
.ob-mic{width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ob-mic svg{width:17px;height:17px;stroke:var(--tx2);fill:none;stroke-width:1.5;}
.ob-mode.on .ob-mic{border-color:rgba(200,169,126,.3);background:rgba(200,169,126,.08);}
.ob-mode.on .ob-mic svg{stroke:var(--ac);}
.ob-note{font-size:11px;color:var(--tx3);line-height:1.6;padding:9px 12px;background:rgba(200,169,126,.05);border-radius:8px;border:1px solid rgba(200,169,126,.1);margin-bottom:15px;}
.ob-sum{background:rgba(255,255,255,.04);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;margin-bottom:17px;}
.ob-sr{display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);}
.ob-sr:last-child{border-bottom:none;}
.ob-ft{display:flex;align-items:center;justify-content:space-between;}
.ob-dots{display:flex;gap:5px;}
.ob-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.1);transition:all .2s;}
.ob-dot.on{background:var(--ac);box-shadow:0 0 7px var(--ac);}
.ob-dot.done{background:var(--gn);}
/* ── BOTTOM NAV ── */
.bot{display:none;position:fixed;bottom:0;left:0;right:0;background:rgba(5,5,13,.92);backdrop-filter:blur(26px) saturate(200%);border-top:1px solid var(--bd);z-index:20;padding:7px 0 11px;justify-content:space-around;align-items:center;}
[data-theme=cream] .bot{background:rgba(236,230,218,.93);}
[data-theme=gray] .bot{background:rgba(24,24,30,.93);}
.bn{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;padding:2px 7px;color:var(--tx3);transition:all .15s;}
.bn.on{color:var(--ac);}
.bn svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.5;}
.bn-lb{font-size:8px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;}
/* ── TOAST ── */
.toast{position:fixed;bottom:74px;right:15px;background:rgba(8,8,20,.93);backdrop-filter:blur(20px);border:1px solid var(--bd2);border-radius:13px;padding:10px 14px;display:flex;align-items:center;gap:9px;z-index:300;min-width:180px;max-width:255px;box-shadow:0 8px 30px rgba(0,0,0,.4);animation:ti .3s cubic-bezier(.34,1.56,.64,1);}
@keyframes ti{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}

/* ── TABLET VERTICAL (768-1023px) ───────────────────── */
@media(min-width:768px) and (max-width:1023px){
.sb{display:none;}
.main{margin-left:0!important;}
.bot{display:flex;}
.two{grid-template-columns:1fr 1fr;}
.pw{padding:16px 20px 90px;}
.sc-n{font-size:32px;}
.title{font-size:32px;}
.ph{flex-direction:row;align-items:center;}
.bn-lb{font-size:10px;}
.bn svg{width:24px;height:24px;}
.bot{padding:10px 0 16px;}
.modal{width:80vw;}
.stats{gap:10px;}
}

/* ── TABLET HORIZONTAL + ESCRITORIO (>=1024px) ──────── */
@media(min-width:1024px){
.sb{display:flex;width:240px;}
.sb.col{width:68px;}
.main{margin-left:240px;}
.main.col{margin-left:68px;}
.bot{display:none;}
.pw{padding:24px 28px 40px;}
.sc-n{font-size:42px;}
.title{font-size:36px;}
.two{grid-template-columns:1fr 1fr;}
.stats{gap:16px;}
.ph{flex-direction:row;align-items:center;}
.modal{width:600px;}
/* Sidebar textos más grandes en escritorio */
.ni-lb{font-size:13px;}
.u-name{font-size:15px;}
.logo-txt h1{font-size:20px;}
/* Íconos sidebar más grandes */
.ni-ic svg{width:20px;height:20px;}
}

/* ── ESCRITORIO GRANDE (>=1440px) ───────────────────── */
@media(min-width:1440px){
.sb{width:260px;}
.main{margin-left:260px;}
.pw{padding:28px 36px 40px;}
.sc-n{font-size:48px;}
.title{font-size:40px;}
.modal{width:680px;}
}

/* ── MÓVIL (<768px) ─────────────────────────────────── */
@media(max-width:767px){
.sb{display:none;}
.main{margin-left:0!important;}
.bot{display:flex;}
.two{grid-template-columns:1fr;}
.stats{gap:6px;}
.sc-n{font-size:24px;}
.pw{padding:13px 13px 86px;}
.title{font-size:24px;}
.ph{flex-direction:column;gap:8px;align-items:flex-start;}
.modal{width:96vw;}
.ann-tb{height:50px;gap:3px;padding:0 7px;}
.tb{height:34px;padding:0 7px;font-size:11px;}
.tb svg{width:14px;height:14px;}
.cd{width:14px;height:14px;}
.tp-lbl{display:none;}
.tp-btn{width:26px;height:26px;}
.mcal{width:36px;}
.mcal.exp{width:156px;}
.bpm-sec{padding:10px;border:none;}
.bpm-sec::before{display:none;}
.sc-row{gap:7px;}
}

`;

// DIAMOND ICON
const Di = ({sz=10,c='currentColor'}) => (
  <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 9 12 22 2 9"/>
    <line x1="2" y1="9" x2="22" y2="9"/>
  </svg>
);

// TOAST
function Toast({msg,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[msg]);
  if(!msg)return null;
  return(
    <div className="toast">
      <div className="t-ic"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{msg.text}</div>
        {msg.sub&&<div style={{fontSize:10,color:'var(--tx3)',marginTop:1}}>{msg.sub}</div>}
      </div>
    </div>
  );
}

// MINI CALENDAR
function MiniCal({eventDays=[]}){
  const [exp,setExp]=useState(false);
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  const mn=now.toLocaleString('es',{month:'long'});
  const firstDay=new Date(y,m,1).getDay();
  const dim=new Date(y,m+1,0).getDate();
  const today=now.getDate();
  const DOWS=['D','L','M','M','J','V','S'];
  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=dim;d++)cells.push(d);

  return(
    <div className={`mcal${exp?' exp':''}`} onClick={()=>setExp(e=>!e)}>
      {!exp&&(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'3px 0'}}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <div style={{fontSize:8,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'.5px'}}>{mn.slice(0,3)}</div>
        </div>
      )}
      {exp&&(
        <>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
            <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:11,color:'var(--tx)',textTransform:'capitalize'}}>{mn}</span>
            <span style={{fontSize:9,color:'var(--tx3)',fontWeight:700}}>{y}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'1px'}}>
            {DOWS.map(d=>(
              <div key={d} style={{fontSize:7,fontWeight:900,color:'var(--tx3)',textAlign:'center',textTransform:'uppercase',padding:'2px 0'}}>{d}</div>
            ))}
            {cells.map((d,i)=>{
              if(!d)return(<div key={`e${i}`}/>);
              const isSun=new Date(y,m,d).getDay()===0;
              const isToday=d===today;
              const hasEv=eventDays.includes(d);
              return(
                <div key={d} style={{
                  fontSize:9,textAlign:'center',padding:'3px 1px',borderRadius:3,lineHeight:1.2,position:'relative',
                  color:isToday?'var(--ac)':isSun?'var(--ac)':'var(--tx2)',
                  fontWeight:isToday||hasEv?700:400,
                  background:isToday?'rgba(200,169,126,.2)':'transparent',
                  opacity:isSun&&!hasEv?.6:1,
                }}>
                  {d}
                  {hasEv&&<span style={{position:'absolute',bottom:1,left:'50%',transform:'translateX(-50%)',width:3,height:3,borderRadius:'50%',background:'var(--ac)',display:'block'}}/>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// DOM STRIP
function DomStrip({activeSunday,onSelect,onToast}){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  const est=['pub','pub','sin','pub'];
  const lib=[false,false,false,true];
  let c=0;
  const sundays=[];
  for(let d=1;d<=31;d++){
    const dt=new Date(y,m,d);
    if(dt.getMonth()!==m)break;
    if(dt.getDay()===0){sundays.push({day:d,mes:dt.toLocaleString('es',{month:'short'}),estado:est[c]||'pub',libre:lib[c]||false});c++;}
  }
  const eventDays=sundays.filter(s=>s.estado!=='sin').map(s=>s.day);

  return(
    <div className="sc-row">
      <div className="dom-strip">
        {sundays.map((d,i)=>{
          const isOn=activeSunday===d.day;
          let cls='dc';
          if(isOn)cls+=' on';
          if(d.estado==='pub'&&!isOn)cls+=' pub';
          if(d.estado==='sin')cls+=' sin';
          if(d.libre)cls+=' lib';
          return(
            <div key={i} className={cls} onClick={()=>{onSelect(d.day);onToast(d.estado==='sin'?{text:'Sin reunión',sub:`Dom ${d.day}`}:d.libre?{text:'No citado',sub:`Dom ${d.day}`}:{text:`Dom ${d.day}`,sub:d.mes});}}>
              <span className="dc-d">{d.day}</span>
              <span className="dc-m">{d.mes}</span>
              <span className="dc-dot"/>
              {d.estado==='sin'&&<span className="dc-badge sin">Sin reunión</span>}
              {d.libre&&d.estado!=='sin'&&<span className="dc-badge lib">No citado</span>}
            </div>
          );
        })}
      </div>
      <MiniCal eventDays={eventDays}/>
    </div>
  );
}

// SONG VIEW — iframe + canvas + transpose
function transposeChord(chord,offset){
  if(!offset)return chord;
  const CHROM=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const EN={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb','Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'};
  const root=chord.replace(/m$|maj.*|sus.*|add.*|dim.*|aug.*/,'');
  const suf=chord.slice(root.length);
  const base=EN[root]||root;
  const idx=CHROM.indexOf(base);
  if(idx<0)return chord;
  return CHROM[(idx+offset+12)%12]+suf;
}

function renderSongContent(raw,tpOff,showChords,editMode,selectedChord,onSelectChord,onMoveChord){
  if(!raw)return(<div style={{color:'var(--tx3)',textAlign:'center',padding:'40px 0',fontSize:13,fontFamily:"'Lato',sans-serif"}}>Letra no disponible aún.</div>);

  const CHORD_RE=/\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;
  const screenW=typeof window!=='undefined'?window.innerWidth:390;
  const fs  =Math.min(14,Math.max(11,Math.floor(screenW/30)));
  const cFs =Math.max(10,fs-2);
  const sFs =Math.max(7,fs-4);
  const FONT="'Albert Sans',sans-serif";
  const LATO="'Lato',sans-serif";

  const trC=(ch)=>{
    if(!tpOff)return ch;
    const p=ch.split('/');
    return p.length>1?transposeChord(p[0],tpOff)+'/'+transposeChord(p[1],tpOff):transposeChord(ch,tpOff);
  };

  const lines=raw.split('\n');
  let start=0;
  for(let i=0;i<Math.min(4,lines.length);i++){
    const l=lines[i].trim();
    if(!l||(!l.includes('[')&&!l.startsWith('===')))start=i+1;
    else break;
  }

  const blocks=[];
  let curLabel=null,curLines=[];
  lines.slice(start).forEach(line=>{
    const t=line.trim();
    if(t.startsWith('===')&&t.endsWith('===')){
      if(curLines.length||curLabel!==null){blocks.push({label:curLabel,lines:curLines});curLines=[];}
      curLabel=t.slice(3,-3).replace(/:$/,'').trim().toUpperCase();
    } else { curLines.push(t); }
  });
  if(curLines.length||curLabel!==null)blocks.push({label:curLabel,lines:curLines});

  const maxLW=blocks.reduce((mx,b)=>b.label?Math.max(mx,b.label.length):mx,0);
  const labelPx=maxLW>0?Math.ceil(maxLW*(sFs*0.62))+10:0;

  // Contar acordes totales para ID único
  let globalChordIdx=0;

  const renderLine=(text,lineIdx,key)=>{
    CHORD_RE.lastIndex=0;
    const hasC=CHORD_RE.test(text);
    CHORD_RE.lastIndex=0;
    if(!text.trim())return null;

    if(!hasC||!showChords){
      const lyric=text.replace(CHORD_RE,'').trim();
      if(!lyric)return null;
      return(
        <div key={key} style={{
          fontSize:fs,fontWeight:700,color:'var(--tx)',fontFamily:FONT,
          lineHeight:1.2,textTransform:'uppercase',
          textAlign:'center',width:'100%',marginBottom:1,
        }}>{lyric}</div>
      );
    }

    const parts=[];
    let last=0,m;
    CHORD_RE.lastIndex=0;
    while((m=CHORD_RE.exec(text))!==null){
      if(m.index>last)parts.push({c:'',t:text.slice(last,m.index)});
      parts.push({c:trC(m[1]),rawC:m[1],t:''});
      last=m.index+m[0].length;
    }
    if(last<text.length)parts.push({c:'',t:text.slice(last)});

    const groups=[];
    let i2=0;
    while(i2<parts.length){
      if(parts[i2].c){
        const txt=i2+1<parts.length&&!parts[i2+1].c?parts[i2+1].t:'';
        groups.push({c:parts[i2].c,rawC:parts[i2].rawC,t:txt,ci:globalChordIdx++});
        i2+=txt?2:1;
      } else {
        groups.push({c:'',t:parts[i2].t,ci:-1});
        i2++;
      }
    }

    const hasChords=groups.some(g=>g.c);
    return(
      <div key={key} style={{
        display:'flex',flexWrap:'nowrap',
        justifyContent:'center',
        width:'100%',marginBottom:hasChords?3:1,
        alignItems:'flex-end',overflow:'visible',
      }}>
        {groups.map((g,j)=>{
          const isSelected=editMode&&selectedChord&&selectedChord.lineKey===key&&selectedChord.ci===g.ci;
          return(
            <div key={j} style={{
              display:'inline-flex',flexDirection:'column',
              alignItems:'flex-start',flexShrink:0,
              position:'relative',
            }}>
              {hasChords&&(
                editMode&&g.c?(
                  // Modo edición: acorde tocable con controles
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0}}>
                    {isSelected&&(
                      <div style={{display:'flex',gap:2,marginBottom:1}}>
                        <button
                          onClick={(e)=>{e.stopPropagation();onMoveChord(lineIdx,g.ci,'left');}}
                          style={{
                            fontSize:9,padding:'1px 4px',borderRadius:3,border:'1px solid var(--ac)',
                            background:'rgba(200,169,126,.2)',color:'var(--ac)',cursor:'pointer',
                            fontWeight:900,lineHeight:1,
                          }}>←</button>
                        <button
                          onClick={(e)=>{e.stopPropagation();onMoveChord(lineIdx,g.ci,'right');}}
                          style={{
                            fontSize:9,padding:'1px 4px',borderRadius:3,border:'1px solid var(--ac)',
                            background:'rgba(200,169,126,.2)',color:'var(--ac)',cursor:'pointer',
                            fontWeight:900,lineHeight:1,
                          }}>→</button>
                      </div>
                    )}
                    <span
                      onClick={()=>onSelectChord({lineKey:key,ci:g.ci,lineIdx})}
                      style={{
                        fontSize:cFs,fontWeight:800,
                        color:isSelected?'#fff':'var(--ac)',
                        lineHeight:1,fontFamily:FONT,
                        whiteSpace:'nowrap',display:'block',
                        paddingRight:g.t?1:3,
                        background:isSelected?'var(--ac)':'transparent',
                        borderRadius:3,padding:isSelected?'1px 3px':'0',
                        cursor:'pointer',
                        border:editMode?'1px dashed rgba(200,169,126,.4)':'none',
                      }}>{g.c}</span>
                  </div>
                ):(
                  <span style={{
                    fontSize:cFs,fontWeight:800,
                    color:g.c?'var(--ac)':'transparent',
                    lineHeight:1,fontFamily:FONT,
                    whiteSpace:'nowrap',display:'block',
                    paddingRight:g.t?1:3,
                  }}>{g.c||'·'}</span>
                )
              )}
              <span style={{
                fontSize:fs,fontWeight:700,
                color:g.t?'var(--tx)':'transparent',
                lineHeight:1.2,fontFamily:FONT,
                whiteSpace:'pre',textTransform:'uppercase',
                display:'block',
              }}>{g.t||' '}</span>
            </div>
          );
        })}
      </div>
    );
  };

  let lineCounter=0;
  return(
    <div style={{width:'100%',padding:'2px 4px 12px',
      outline:editMode?'2px dashed rgba(200,169,126,.25)':'none',
      borderRadius:editMode?8:0,
    }}>
      {editMode&&(
        <div style={{textAlign:'center',fontSize:10,color:'var(--ac)',fontFamily:LATO,
          fontWeight:700,letterSpacing:'1px',padding:'4px 0 8px',textTransform:'uppercase',opacity:.8}}>
          ✏ Toca un acorde y usa ← → para moverlo
        </div>
      )}
      {blocks.map((blk,bi)=>{
        const blines=blk.lines.filter((l,i,a)=>
          !((!l.trim())&&(i===0||i===a.length-1))
        );
        if(!blines.length&&!blk.label)return null;
        return(
          <div key={bi} style={{
            marginTop:bi===0?0:fs*0.85,
            background:'transparent',
            borderTop:bi===0?'none':'1px solid rgba(255,255,255,.06)',
            paddingTop:bi===0?0:4,
          }}>
            {blines.map((line,li)=>{
              if(!line.trim())return<div key={li} style={{height:fs*0.2}}/>;
              const isFirst=li===0;
              const thisLineIdx=lineCounter++;
              return(
                <div key={li} style={{display:'flex',alignItems:'flex-end',width:'100%'}}>
                  <div style={{
                    width:labelPx,minWidth:labelPx,flexShrink:0,
                    paddingRight:4,display:'flex',alignItems:'flex-end',paddingBottom:2,
                  }}>
                    {blk.label&&isFirst&&(
                      <span style={{
                        fontSize:sFs,fontWeight:900,color:'var(--tx3)',
                        fontFamily:LATO,textTransform:'uppercase',
                        letterSpacing:'1.2px',whiteSpace:'nowrap',opacity:.8,
                      }}>{blk.label}</span>
                    )}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    {renderLine(line,thisLineIdx,'l'+li+'_'+bi)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function SongView({songs,startIdx,onClose,theme="dark",isAdmin=false,onSaveChords}){
  const [idx,setIdx]=useState(startIdx);
  const [tpOff,setTpOff]=useState(0);
  const [tool,setTool]=useState('draw');
  const [color,setColor]=useState('#ff3b30');
  const [sz,setSz]=useState(4);
  const [showChords,setShowChords]=useState(true);
  const [showAnnoBar,setShowAnnoBar]=useState(false);
  const [capo,setCapo]=useState(0);
  const [editMode,setEditMode]=useState(false);
  const [selectedChord,setSelectedChord]=useState(null); // {lineIdx, chordIdx}
  const [editedSongs,setEditedSongs]=useState({});
  const [capoOpen,setCapoOpen]=useState(false);
  const [toast,setToast]=useState(null);
  const [isTablet,setIsTablet]=useState(()=>window.innerWidth>=768);

  // ── Editor de acordes ────────────────────────────────────────────────────
  const getSongContent=(song)=>editedSongs[song.name]||SONG_CONTENT_IGLESIA[song.name]||null;

  const handleMoveChord=(lineIdx,chordIdx,dir)=>{
    const song=songs[idx];
    const raw=getSongContent(song)||'';
    // Reconstruir líneas, encontrar la línea correcta, mover el acorde
    const allLines=raw.split('\n');
    // Saltar header (título/artista)
    let contentStart=0;
    for(let i=0;i<Math.min(4,allLines.length);i++){
      const l=allLines[i].trim();
      if(!l||(!l.includes('[')&&!l.startsWith('===')))contentStart=i+1;
      else break;
    }
    // Contar líneas de contenido para llegar a lineIdx
    let counter=0;
    let targetAbsIdx=-1;
    for(let i=contentStart;i<allLines.length;i++){
      const t=allLines[i].trim();
      if(t.startsWith('===')&&t.endsWith('==='))continue;
      if(!t)continue;
      if(counter===lineIdx){targetAbsIdx=i;break;}
      counter++;
    }
    if(targetAbsIdx<0)return;

    // En la línea encontrada, mover el acorde chordIdx
    const line=allLines[targetAbsIdx];
    const CHORD_RE=/\[([A-G][b#]?(?:m(?:aj7|aj)?|7|9|11|13|6|2|4|sus[24]?|add9|dim|aug)?(?:\/[A-G][b#]?)?)\]/g;
    const chords=[];
    let m;
    CHORD_RE.lastIndex=0;
    while((m=CHORD_RE.exec(line))!==null){
      chords.push({start:m.index,end:m.index+m[0].length,full:m[0]});
    }
    // Encontrar el acorde por índice
    let ci=0;
    // contar solo los acordes de esta línea hasta chordIdx
    if(ci>=chords.length)return;
    // Mapear chordIdx global a índice local en esta línea
    // (simplificación: usar el primer acorde si chordIdx=0, etc.)
    const localIdx=chordIdx%Math.max(1,chords.length);
    const chord=chords[localIdx];
    if(!chord)return;

    let newLine=line;
    if(dir==='left'&&chord.start>0){
      // Mover el tag del acorde un carácter a la izquierda
      const before=line.slice(0,chord.start);
      const after=line.slice(chord.end);
      // Quitar último char de before, ponerlo antes en after
      if(before.length>0){
        newLine=before.slice(0,-1)+chord.full+before.slice(-1)+after;
      }
    } else if(dir==='right'){
      const before=line.slice(0,chord.start);
      const after=line.slice(chord.end);
      // Mover un char a la derecha
      if(after.length>0){
        newLine=before+after[0]+chord.full+after.slice(1);
      }
    }

    if(newLine===line)return;
    const newLines=[...allLines];
    newLines[targetAbsIdx]=newLine;
    const newContent=newLines.join('\n');
    setEditedSongs(prev=>({...prev,[song.name]:newContent}));
  };

  const handleSaveEdit=()=>{
    const song=songs[idx];
    const edited=editedSongs[song.name];
    if(edited&&onSaveChords){
      onSaveChords(song.name,edited);
      setToast('✓ Acordes guardados oficialmente');
    }
    setEditMode(false);
    setSelectedChord(null);
  };

  // Colores según tema — funciona incluso con position:fixed
  const isLight = theme==='cream';
  const svBg      = isLight ? '#ffffff'           : 'rgba(4,4,12,.97)';
  const svHdrBg   = isLight ? 'rgba(240,234,222,.98)' : 'rgba(5,5,14,.92)';
  const svNavBg   = isLight ? 'rgba(235,228,215,.98)' : 'rgba(5,5,14,.88)';
  const svTx      = isLight ? '#1a1208'           : 'var(--tx)';
  const svTx2     = isLight ? '#4a3828'           : 'var(--tx2)';
  const svTx3     = isLight ? '#8a7058'           : 'var(--tx3)';
  const svAc      = isLight ? '#D4500A'           : 'var(--ac)';
  const svBd      = isLight ? 'rgba(0,0,0,.15)'   : 'var(--bd)';
  const svPanelBg = isLight ? 'rgba(240,234,222,.97)' : 'rgba(8,8,20,.92)';

  useEffect(()=>{
    const h=()=>setIsTablet(window.innerWidth>=768);
    window.addEventListener('resize',h);
    return()=>window.removeEventListener('resize',h);
  },[]);

  const cvRef=useRef(null);
  const wrapRef=useRef(null);
  const strokes=useRef([]);
  const drawing=useRef(false);
  const cur=useRef(null);

  const song=songs[idx];
  const curKey=tpKey(song.key,tpOff);
  // Nota que SUENA realmente con el capo puesto
  const sonaKey=tpKey(curKey,-capo);

  useEffect(()=>{setTpOff(0);setShowAnnoBar(false);setCapo(0);setCapoOpen(false);},[idx]);
  useEffect(()=>{
    const cv=cvRef.current,w=wrapRef.current;
    if(!cv||!w)return;
    const resize=()=>{cv.width=w.clientWidth;cv.height=w.clientHeight;redraw();};
    resize();
    const ro=new ResizeObserver(resize);
    ro.observe(w);
    return()=>ro.disconnect();
  },[idx]);

  const getP=e=>{const r=cvRef.current.getBoundingClientRect();const s=e.touches?e.touches[0]:e;return{x:s.clientX-r.left,y:s.clientY-r.top};};
  const applyS=s=>{const ctx=cvRef.current.getContext('2d');const t=s?.type||tool,c2=s?.color||color,sz2=s?.sz||sz;if(t==='erase'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=sz2*4;}else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=c2;ctx.lineWidth=sz2;}ctx.lineCap='round';ctx.lineJoin='round';};
  const redraw=()=>{const cv=cvRef.current;if(!cv)return;const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);strokes.current.forEach(s=>{if(s.pts.length<2)return;ctx.beginPath();applyS(s);ctx.moveTo(s.pts[0].x,s.pts[0].y);s.pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();});ctx.globalCompositeOperation='source-over';};
  const startD=e=>{if(tool==='text'||!showAnnoBar)return;drawing.current=true;const p=getP(e);cur.current={type:tool,color,sz,pts:[p]};const ctx=cvRef.current.getContext('2d');ctx.beginPath();ctx.moveTo(p.x,p.y);applyS();};
  const moveD=e=>{if(!drawing.current||!cur.current)return;const p=getP(e);cur.current.pts.push(p);const ctx=cvRef.current.getContext('2d');ctx.lineTo(p.x,p.y);ctx.stroke();};
  const endD=()=>{if(!drawing.current)return;drawing.current=false;if(cur.current?.pts.length>1)strokes.current.push(cur.current);cur.current=null;const ctx=cvRef.current.getContext('2d');ctx.globalCompositeOperation='source-over';};
  const undo=()=>{strokes.current.pop();redraw();};
  const clear=()=>{strokes.current=[];const ctx=cvRef.current?.getContext('2d');ctx?.clearRect(0,0,cvRef.current.width,cvRef.current.height);};
  const doTp=steps=>{const nOff=tpOff+steps;setTpOff(nOff);setToast({text:`♩ ${tpKey(song.key,nOff)}`,sub:nOff===0?'Tono original':`${nOff>0?'+':''}${nOff} st`});};
  const COLS=['#ff3b30','#0a84ff','#30d158','#ffd60a','#bf5af2'];

  // ── Panel Tono + Capo desplegable ──────────────────────────────────────────
  const PanelTono=()=>(
    <div style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',zIndex:3,display:'flex',flexDirection:'column',alignItems:'center',gap:0,borderRadius:14,border:`1px solid ${svBd}`,background:isLight?'rgba(240,234,222,.12)':'rgba(4,4,12,.10)',backdropFilter:'blur(40px)',width:48,overflow:'visible'}}>
      <button onClick={()=>doTp(1)} style={{width:'100%',padding:'7px 0',border:'none',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)',borderRadius:'14px 14px 0 0'}}>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        <span style={{fontSize:8,fontWeight:900,color:'var(--tx3)',letterSpacing:'.5px'}}>#</span>
      </button>
      <div style={{width:'100%',padding:'6px 0',textAlign:'center',borderBottom:'1px solid var(--bd)'}}>
        <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:16,color:svAc,lineHeight:1}}>{curKey}</div>
        {tpOff!==0&&<div style={{fontSize:7,color:'var(--tx3)',fontWeight:700,marginTop:1}}>{tpOff>0?'+':''}{tpOff}st</div>}
      </div>
      <button onClick={()=>doTp(-1)} style={{width:'100%',padding:'7px 0',border:'none',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)'}}>
        <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',fontStyle:'italic'}}>b</span>
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <button onClick={()=>setCapoOpen(o=>!o)} style={{width:'100%',padding:'6px 0',border:'none',background:capo>0?'rgba(200,169,126,.15)':'transparent',color:capo>0?'var(--ac)':'var(--tx3)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderRadius:'0 0 14px 14px',transition:'all .2s'}}>
        <span style={{fontSize:7,fontWeight:900,textTransform:'uppercase',letterSpacing:'1px',color:capo>0?svAc:svTx3}}>CAPO</span>
        <span style={{fontSize:capo>0?13:11,fontWeight:900,color:capo>0?'var(--ac)':'var(--tx3)',lineHeight:1}}>{capo>0?capo:'—'}</span>
        {capo>0&&<span style={{fontSize:7,color:'var(--gn)',fontWeight:700,lineHeight:1.2}}>{sonaKey}</span>}
        <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform:capoOpen?'rotate(180deg)':'none',transition:'transform .2s',marginTop:1}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {capoOpen&&(
        <div style={{position:'absolute',right:60,top:'50%',transform:'translateY(-50%)',background:isLight?'rgba(240,234,222,.97)':'rgba(10,10,20,.97)',backdropFilter:'blur(0px)',border:`2px solid ${svBd}`,borderRadius:14,padding:12,zIndex:10,minWidth:140,boxShadow:'0 8px 32px rgba(0,0,0,.5)'}}>
          <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Posición de capo</div>
          {[0,1,2,3,4,5,6,7].map(c=>{
            const notaSuena=c===0?curKey:tpKey(curKey,-c);
            const isOn=capo===c;
            return(
              <button key={c} onClick={()=>{setCapo(c);setCapoOpen(false);setToast(c===0?{text:'Sin capo',sub:'Tono original'}:{text:`Capo ${c}`,sub:`Suena en ${notaSuena}`});}}
                style={{width:'100%',padding:'7px 10px',marginBottom:3,border:'none',borderRadius:8,background:isOn?'rgba(200,169,126,.15)':'rgba(255,255,255,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all .15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {isOn?<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="var(--ac)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>:<div style={{width:10}}/>}
                  <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:13,color:isOn?'var(--ac)':'var(--tx)',lineHeight:1}}>
                    {c===0?'Sin capo':c}
                  </span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,fontWeight:900,color:isOn?'var(--gn)':'var(--tx3)',fontFamily:"'Albert Sans',sans-serif",fontWeight:700}}>{notaSuena}</div>
                  {c>0&&<div style={{fontSize:8,color:'var(--tx3)',marginTop:1}}>suena</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Barra de anotaciones ──────────────────────────────────────────────────
  const AnnoBar=()=>(
    <div style={{background:svHdrBg,borderBottom:`1px solid ${svBd}`,flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px'}}>
        <button onClick={()=>setShowAnnoBar(v=>!v)} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:8,border:showAnnoBar?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:showAnnoBar?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:showAnnoBar?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0,transition:'all .15s'}}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Anotar
          <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:showAnnoBar?'rotate(180deg)':'none',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div style={{flex:1}}/>
        {capo>0&&(
          <div style={{padding:'3px 8px',borderRadius:100,background:'rgba(94,206,160,.1)',border:'1px solid rgba(94,206,160,.25)',fontSize:10,fontWeight:700,color:'var(--gn)',flexShrink:0}}>
            Capo {capo} · suena {sonaKey}
          </div>
        )}
        <button onClick={()=>setShowChords(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:!showChords?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:!showChords?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:!showChords?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          {showChords?'Solo letra':'Con acordes'}
        </button>
        {isAdmin&&(
          <>
          <button onClick={()=>{if(editMode){setEditMode(false);setSelectedChord(null);}else{setEditMode(true);}}} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:editMode?'1px solid var(--ac)':'1px solid rgba(200,169,126,.28)',background:editMode?'rgba(200,169,126,.15)':'rgba(200,169,126,.07)',color:'var(--ac)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {editMode?'Cancelar':'Editar'}
          </button>
          {editMode&&editedSongs[songs[idx]?.name]&&(
            <button onClick={handleSaveEdit} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:'1px solid rgba(94,206,160,.5)',background:'rgba(94,206,160,.15)',color:'var(--gn)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Publicar
            </button>
          )}
          </>
        )}
        <button onClick={()=>setToast({text:'Guardado',sub:'Anotaciones en tu dispositivo'})} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:8,border:'1px solid rgba(94,206,160,.28)',background:'rgba(94,206,160,.07)',color:'var(--gn)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Guardar
        </button>
      </div>
      {showAnnoBar&&(
        <div style={{display:'flex',alignItems:'center',gap:3,padding:'0 10px 5px',overflowX:'auto',scrollbarWidth:'none'}}>
          {[['draw','Lápiz'],['erase','Borrar']].map(([t,l])=>(
            <button key={t} onClick={()=>setTool(t)} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:6,border:tool===t?'1px solid var(--bd)':'1px solid transparent',background:tool===t?'rgba(255,255,255,.09)':'transparent',color:tool===t?'var(--tx)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>{l}</button>
          ))}
          <div style={{width:1,height:16,background:'var(--bd)',margin:'0 3px'}}/>
          {COLS.map(c=>(<button key={c} onClick={()=>setColor(c)} style={{width:18,height:18,borderRadius:'50%',background:c,border:color===c?'2px solid #fff':'2px solid transparent',cursor:'pointer',flexShrink:0}}/>))}
          <div style={{width:1,height:16,background:'var(--bd)',margin:'0 3px'}}/>
          <button onClick={undo} style={{width:26,height:26,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
          </button>
          <button onClick={clear} style={{width:26,height:26,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      )}
    </div>
  );

  // ── Área de contenido (canvas + letra) ───────────────────────────────────
  const ContentArea=({padRight=12})=>(
    <div style={{flex:1,position:'relative',overflow:'hidden'}}>
      <canvas ref={cvRef} style={{position:'absolute',inset:0,zIndex:2,touchAction:'none',pointerEvents:showAnnoBar&&tool!=='text'?'all':'none',cursor:tool==='erase'?'cell':'crosshair'}}
        onMouseDown={startD} onMouseMove={moveD} onMouseUp={endD} onMouseLeave={endD}
        onTouchStart={e=>{e.preventDefault();startD(e);}} onTouchMove={e=>{e.preventDefault();moveD(e);}} onTouchEnd={e=>{e.preventDefault();endD();}}
      />
      <div ref={wrapRef} className="sv-content" style={{position:'absolute',inset:0,overflowY:'auto',scrollbarWidth:'none',background:svBg,padding:'10px 10px 10px 10px',display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
        {song.docId
          ?<iframe src={`https://docs.google.com/document/d/${song.docId}/preview`} allowFullScreen style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none',zIndex:1}}/>
          :<div style={{width:'100%'}}>{renderSongContent(getSongContent(song),tpOff,showChords,editMode,selectedChord,(c)=>setSelectedChord(c),(li,ci,dir)=>handleMoveChord(li,ci,dir))}</div>
        }
      </div>
      <PanelTono/>
    </div>
  );

  // ── Nav inferior ──────────────────────────────────────────────────────────
  const NavBar=()=>(
    <div className="sv-nav" style={{background:svNavBg,borderTop:`1px solid ${svBd}`}}>
      <button className="nb" disabled={idx===0} onClick={()=>setIdx(i=>i-1)}>
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Anterior
      </button>
      <div className="sv-ni">
        <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:13,color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
        <div style={{fontSize:9,color:svTx3,marginTop:1,fontWeight:700}}>Canción {idx+1} de {songs.length}</div>
      </div>
      <button className="nb p" onClick={()=>{if(idx===songs.length-1)onClose();else setIdx(i=>i+1);}}>
        {idx===songs.length-1?'Listo':'Siguiente'}<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  );

    // LAYOUT IPAD / TABLET ≥768px — horizontal con panel de setlist
    if(isTablet){
    return(
      <div className="sv" style={{flexDirection:'row',background:svBg}}>
        {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
        <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',borderRight:'1px solid var(--bd)',background:'rgba(6,6,14,.95)',backdropFilter:'blur(20px)'}}>
          <div style={{padding:'12px 14px 10px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:8}}>
            <div className="sv-back" onClick={onClose}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:13,color:'var(--tx)'}}>SetSync</div>
              <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{songs.length} canciones</div>
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',scrollbarWidth:'thin'}}>
            {songs.map((s,i)=>(
              <div key={i} onClick={()=>setIdx(i)} style={{padding:'11px 14px',borderBottom:'1px solid rgba(255,255,255,.05)',cursor:'pointer',background:i===idx?'rgba(200,169,126,.1)':'transparent',transition:'background .15s',borderLeft:`3px solid ${i===idx?'var(--ac)':'transparent'}`}}>
                <div style={{fontFamily:"'Lato',sans-serif",fontWeight:i===idx?900:700,fontSize:12,color:i===idx?'var(--ac)':'var(--tx)',marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</div>
                <div style={{fontSize:10,color:'var(--tx3)',display:'flex',gap:8}}>
                  <span style={{fontFamily:"'Source Code Pro',monospace",fontWeight:700}}>{s.key}</span>
                  <span>{s.bpm} BPM</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'11px 14px',borderTop:'1px solid var(--bd)',background:'rgba(200,169,126,.04)'}}>
            <div style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:4}}>Activa</div>
            <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:12,color:'var(--ac)',marginBottom:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{padding:'2px 7px',borderRadius:100,background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.2)',fontSize:10,fontWeight:900,color:'var(--ac)',fontFamily:"'Source Code Pro',monospace"}}>{curKey}</span>
              {capo>0&&<span style={{fontSize:10,color:'var(--gn)',fontWeight:700}}>· Capo {capo} → {sonaKey}</span>}
            </div>
          </div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',background:'rgba(6,6,14,.85)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:17,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
              <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginTop:1}}>
                {song.role||'Guitarra'} · {curKey} · {song.bpm} BPM
                {capo>0&&<span style={{color:'var(--gn)',marginLeft:8}}>· Capo {capo} suena {sonaKey}</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
              {songs.map((_,i)=>(<div key={i} style={{width:i===idx?14:6,height:4,borderRadius:2,background:i===idx?'var(--ac)':'var(--tx3)',transition:'all .3s'}}/>))}
            </div>
            <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700,flexShrink:0}}>{idx+1}/{songs.length}</div>
          </div>
          <AnnoBar/>
          <ContentArea padRight={12}/>
          <NavBar/>
        </div>
      </div>
    );
  }

    // LAYOUT MOBILE < 768px
    return(
    <div className="sv" style={{background:svBg}}>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      <div className="sv-hdr" style={{background:svHdrBg,borderBottom:`1px solid ${svBd}`}}>
        <div className="sv-back" onClick={onClose}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:17,color:svTx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
          <div style={{fontSize:10,color:svAc,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>
            {song.role||'Guitarra'} · {curKey} · {song.bpm} BPM
            {capo>0&&<span style={{color:'var(--gn)',marginLeft:6}}>· Cap.{capo}→{sonaKey}</span>}
          </div>
        </div>
        <div style={{fontSize:10,color:'var(--tx3)',fontWeight:700,flexShrink:0}}>{idx+1}/{songs.length}</div>
      </div>
      <AnnoBar/>
      <ContentArea padRight={12}/>
      <NavBar/>
    </div>
  );
}

const EQUIPOS_DATA=[
  {id:1,name:'Banda',color:'#8b72d4',roles:['Guitarra','Bajo','Piano','Batería','Mic 1','Libre'],miembros:[
    {id:1,name:'Belén Mella',email:'belen@iglesia.cl',role:'Mic 1'},
    {id:2,name:'Cony Saavedra',email:'cony@iglesia.cl',role:'Guitarra'},
    {id:3,name:'Florencia Gómez',email:'florencia@iglesia.cl',role:'Piano'},
    {id:4,name:'Cristian Gómez',email:'cristian@iglesia.cl',role:'Bajo'},
    {id:5,name:'Daniel Miranda',email:'daniel@iglesia.cl',role:'Batería'},
    {id:6,name:'Felipe Silva',email:'felipe@iglesia.cl',role:'Libre'},
  ]},
  {id:2,name:'Proyecciones',color:'#5ecea0',roles:['Operador','Diseño','Libre'],miembros:[
    {id:7,name:'Franco Silva',email:'franco@iglesia.cl',role:'Operador'},
    {id:8,name:'Renata',email:'renata@iglesia.cl',role:'Diseño'},
  ]},
  {id:3,name:'Sonido',color:'#ff9f0a',roles:['Ingeniero','Asistente','Libre'],miembros:[
    {id:9,name:'Carlos Cuevas',email:'carlos@iglesia.cl',role:'Ingeniero'},
    {id:10,name:'Mauro Pizarro',email:'mauro@iglesia.cl',role:'Asistente'},
  ]},
  {id:4,name:'Transmisiones',color:'#6e5fa0',roles:['Director','Streaming','Cámara','Libre'],miembros:[
    {id:11,name:'Renata V.',email:'renatav@iglesia.cl',role:'Streaming'},
  ]},
];

// ─── CONTENIDO DE CANCIONES ──────────────────────────
const SONG_CONTENT_IGLESIA={
  'TODO CAMBIÓ': `
TODO CAMBIÓ
Maverick City Music

[C]Brotó de mi alma Una[Em] nueva c[D]anción [G]
[C]Y pronto el enemigo[Em] Se confun[D]dió [G]
[C]Antes no en[Em]tendía
[D]Lo que tenía e[G]n mi canción
[C]Pero alab[Em]é a Cristo
[D]Allí todo camb[G]ió
[C]Pero alabé[Em] a Cristo
[D]Allí todo camb[G]ió
===CORO===
[C]Alábale,  Que Él es bueno [Em]
[D]Y reina con poder [G]
[C]Alábale que toda oscuridad [Em]
[D]Tiembla ante Él [G]
[C]No es un cuento, es[Em] mi historia
[D]Lo que mi Padre me enseñó [G]
[C]Cuando alabé a Cri[Em]sto
[D]Allí todo cambió [G]
[C]Cuando alabé[Em] a Cristo
[D]Allí todo cambió [G]
[C]Al mencionar Su nombre, monta[Em]ñas moverán [G] [D]
[C]Y lo que estaba [Em]muerto, l[D]o resucit[G]ará
[C]Antes no en[Em]tendía
[D]Lo que tenía e[G]n mi canción
[C]Pero alab[Em]é a Cristo
[D]Allí todo camb[G]ió
[C]Pero alabé[Em] a Cristo
[D]Allí todo camb[G]ió
===PUENTE===
[C]El me sano, me [Em]rescato, me dio vida nueva [G] [D]
[C]Me corono y me [Em]levanto, rompió las cadenas [G] [D]
[C]Nueva canción d[Em]e adoración, corre por mis venas [G] [D]
[C]Exáltale, Y vas[Em] a ver, como rompe tinieblas [G] [D]
`,

  'SANTO POR SIEMPRE': `
SANTO POR SIEMPRE

(F        Am  G  C/E  Am    G)
===INTRO===
[C]Mil generaciones
[F]se postran a adorarle [C]
[Am]le cantan al cordero que[G] venció. [F]
[C]Los que nos precedieron
[F]y los que en él creerán [C]
[Am]le cantarán a aque[G]l que ya venció. [F]
===PRECORO===
[F]Tu nombre es mas alto [Am]
[G]tu nombre es mas grande
[Am]tu nombre sobre [G]todo es [F]
[F]Dominios y tronos [Am]
[G]poderes y reinos
[Am]tu nombre sobre todo es. [Dm] [G]
===CORO 1===
[F]Cantan án[Am]gele[G]s, San - to
[C]clama la [G]creac[Am]ión, San - to
[Dm]exalta[Am]do Dio[G]s, San - to
[C]Santo por[Csus4] siempr[C]e.
===VERSO 2===
[C]Si te ha perdonado
[F]y tienes salv[C]ación
[Am]cántale al cordero que[G] venció. [F]
[C]Si te ha liberado
[F]su nombre ha puesto en ti [C]
[Am]cántale al cordero [G]que venció [F]
===CORO 2===
[C/E]Canta el pu[Am]eblo al[G] Rey, San - to
[C]Soberano e[Am]s Él, San - to
[Dm]y por siempre e[G]s, San - to
[C]Santo por [Csus4]siempre. [C]
[Dm]por siempre se[G]rás, San - to
[C]Santo po[Csus4]r siempr[C]e.
`,

  'YESHUA': `
YESHUA
Marcos Brunet

===VERSO 1===
[A]Mi[B] orgullo me sacó del jardín
[C#m]Su h[B]umildad colocó el jardín en mí
[A]Y [B]si vendiera todo lo que tengo
[C#m]A ca[B]mbio de su amor, yo fallaría
[A]Po[B]rque su amor no se compra Ni se merece
[C#m]Su a[B]mor es un regalo De gracia se recibe
===CORO===
[A]Qu[B]iero conocer a Jesús
[C#m]Quie[B]ro conocer a Jesús
[A]Qu[B]iero conocer a Jesús
[C#m]Quie[B]ro conocer a Jesús
[A]Y ser hallado en él
[B]Y ser hallado en él
[C#m]Y ser hallado en él
===PUENTE===
[A]Mi[C#m] amado es el más bello entre millares
[E]de[B] millares
[A]Tu[B]yo es el reino, Tuyo es el poder
[C#m]Tuya[B] es la gloria, Por siempre amén.
`,

  'GLORIA EN GLORIA': `
GLORIA EN GLORIA
Bethel Music

===VERSO 1===
[Bm]Vini[G]ste a habitar[D]
[Bm]A vi[G]vir entre no[D]sotros
[Bm]Sinti[G]endo el dolor[D], de la humanidad[Bm]
[G]Y llevarnos ma[D]s alto
[Bm]Infi[G]nito Dio[D]s
[Bm]Tu v[G]ida rendist[D]e para mi culpa borrar
[Bm]Mi ve[G]rguenza quitar y[D] llevarnos mas alto
===CORO===
[Bm]Vamos de gl[G]oria, en gl[D]oria, en gloria
[Bm]Jamás seré igual
[G]Jamás seré [D]igual
[Bm]Vamos de gl[G]oria en gl[D]oria, en gloria
[Bm]Gracia [G]que cambio[D] nuestro corazón
===VERSO 2===
[Bm]Tu amig[G]o yo so[D]y
[Bm]A tu re[G]ino me ha[D]s traído
[Bm]Éxclav[G]o fui yo,[D] ahora tu hijo soy[Bm]
[G]Y me llevas[D] más alto
===PUENTE===
[G]Jesús queremos ver, [D]tu rostro y majestad
[A]Por siempre cantaremos Sa[Bm]nto, sa[A]nto
[G]Tu amor va más allá, [D]no alcanzo a comprender
[A]Por siempre cantaremos, Di[Bm]gno, dig[A]no[G]
`,

  'HERMOSO NOMBRE': `
HERMOSO NOMBRE
Hillsong United

===VERSO 1===
[D]Tú fuiste el verbo en el principio - unigénito de Dios[A][Bm][G]
[D]el misterio de tu gloria - revelado en tu Amor[A][Bm][G]
[Bm]Dejaste el cielo por sa[A/C]lvarme - me [D]viniste a rescata[G]r[A][Bm]
[Bm]mi transgresión tú Perdona[A/C]ste, nada nos [D]separará[A][Bm][G]
===CORO===
[D]cuan hermoso su nombre es
[D/B]el nombre de[A] Jesús [G]mi rey
[D/F]cuan hermoso su nombre es, na[A]da se iguala a él
[D/B]cuan hermoso Su n[A]ombre es, no ha[G]y otro nombre
===PUENTE===
[G]La muerte venciste, el vel[A]o partiste, la tumba vac[Bm]ía ahora está.[F#m]
[G]Los cielos declaran, tu gl[A]oria proclaman, resucita[Bm]ste en majestad[F#m].
[G]inigualable, Incomparable,[A] hoy y por siempre reina[Bm]rás.[F#m]
`,

  'LA BONDAD DE DIOS': `
LA BONDAD DE DIOS
Bethel Music

===VERSO 1===
[G]Te amo Dios
[C]Tu amor nunca [G]me falla
[D]Mi e[F]xist[Em]ir en Tus [C]manos [D]está
[Em]Desde[C] el momento que despierto
[G]Has[D]ta e[F]l a[Em]nochecer
[C]Yo canta[D]ré de [G]la bondad de Dios
===CORO 1===
[C]En mi vida has sido [G]bueno
[C]En mi vida has sido [G]tan f[D]iel
[C]Con mi ser, con cada [G]aliento [Em] [F] [D]
[C]Yo cantar[D]é de la bo[G]ndad de Dios
===VERSO 2===
[C]Yo amo Tu voz
[C]Me has guiado po[G]r el fuego
[D]Tú c[F]erc[Em]a estás
[C]En la oscu[D]ridad
[Em]Te cono[C]zco como Padre
[G]Y com[D]o am[F]igo[Em] fiel
[C]Mi vida e[D]stá en[G] la bondad de Dios
===PUENTE===
[G]Tu f[B]idelidad s[C]igue
[D]Persiguiéndo[G]me
[G]Tu f[B]idelidad [C]sigue
[D]Persiguiénd[G]ome
[G]Todo[B] lo que soy
[G]Te lo entrego hoy
[D]A Ti me ren[Em]diré
[G]Tu f[B]idelidad [C]sigue
[D]Persiguiéndo[G]me
===TAG===
[C]Yo cantar[D]é de la bo[G]ndad de Dios
`,

  'AGNUS DEI': `
AGNUS DEI
Michael W. Smith

Aleluya, Aleluya
Reinas Tú, poderoso Dios
Aleluya
Santo, Santo
Del Señor Dios poderoso
Digno eres Tú,
Digno eres Tú.
Tú eres santo, santo
El Señor Dios poderoso
Digno eres Tú
Digno eres Tú
`,

  'ALABA (PRAISE)': `
ALABA (PRAISE)
Elevation Worship / Brandon Lake

===VERSO 1===
[G]Te alabo en el valle, Te a[Am]labo en el m[G]onte,
[D/G]Te alabo en el día, T[C/G]e alabo en [G]la noche,
[G]Te alabo en el medio, Est[Am]ando rod[G]eado,
[D/G]Porque cuando alabo, Tú[C/G] estás a m[G]i lado.
[D]Mientras tenga ali[C]ento, mi alma canta y…
===CORO===
[Em]Alaaaa[C]ba A Di[G]os, MI corazó[D]n
[Em]Alaaaa[C]ba a Di[G]os, Mi corazó[D]n,
===VERSO 2===
[G]Te alabo al sentirl[Am]o Y aun cu[G]ando no,
[D/G]Te alabo y sé, que[C/G] estás en c[G]ontrol,
[G]Es más que un sonido,[Am] es ado[G]ración,
[D/G]Y cuando alabamos C[C/G]aerá Je[G]ricó.
[D]Mientras tenga ali[C]ento, mi alma canta y…
===PUENTE===
[G]Alabo al que reina,[C/G] Alabo al Señor, [D/G] [C/G]
[G]Alabo al que es bueno,[C/G] Alabo al que es fiel,
[D/G]Le alabo porque no h[C/G]ay otro como él.
===FINAL===
[G]Que toda la[G] Creación,[G] Alabe a Dios[G] alabe a Dios,
[G]Que toda la[G] Creación,[G] Alabe a Dios[G] alabe a Dios.
`,

};
// ── Cancionero Banda — independiente del modo Iglesia ─────────────────────
const SONG_CONTENT_BANDA={

  'NOCHE SIN FIN': `
NOCHE SIN FIN
Los Viajeros del Viento

===INTRO===
[Am][F][C][G]

===VERSO 1===
[Am]Salí a buscar[F] lo que dejé atrás
[C]En una ciudad[G] que no perdona
[Am]Las calles gritan[F] pero no hay verdad
[C]Solo el viento[G] que me abandona

===PRECORO===
[F]Y aunque el cielo[Am] se oscurezca
[G]Yo sigo caminando

===CORO===
[C]En esta noche sin fin[G]
[Am]Busco una señal[F]
[C]Algo que me diga[G]
[Am]Que vale la pena[F] seguir

===VERSO 2===
[Am]Encontré tus ojos[F] en el andén
[C]Un destello rojo[G] entre la niebla
[Am]Me dijiste algo[F] que no entendí bien
[C]Pero me quedé[G] y la luna ya era vieja

===PUENTE===
[F]No me importa la hora
[Am]No me importa el lugar
[G]Si estás aquí conmigo
[F]El tiempo puede esperar
`,

  'FUEGO CRUZADO': `
FUEGO CRUZADO
Tormenta Eléctrica

===INTRO===
[Em][D][G][A]

===VERSO 1===
[Em]Encendí el motor[D] a las tres de la tarde
[G]El camino era largo[A] y el sol quemaba fuerte
[Em]Radio en volumen[D] diez, ventana abajo
[G]Buscando ese sonido[A] que me salva del fracaso

===CORO===
[G]Fuego cruzado[D]
[Em]Entre dos mundos[C]
[G]Sin saber a cuál[D] pertenezco
[Em]Pero suena bien[C]
[G]Y eso es suficiente[D]

===VERSO 2===
[Em]Llegué a ese bar[D] donde tocan los martes
[G]Me senté al fondo[A] a esperar que algo pase
[Em]Una guitarra rota[D] colgada en la pared
[G]Me recordó que hay cosas[A] que no tienen red

===PUENTE===
[C]Quema quema quema
[G]Todo lo que sobra
[D]Queda solo lo que duele
[Em]Y duele menos
`,

  'MAR ADENTRO': `
MAR ADENTRO
Coral y Sal

===VERSO 1===
[D]Crecí entre redes[A] y olor a mar
[Bm]Mi abuelo me enseñó[G] a no temblar
[D]Cuando la tormenta[A] llega sin aviso
[Bm]El barco aguanta más[G] de lo que yo pensé preciso

===CORO===
[G]Mar adentro[D]
[A]Donde no llega el ruido
[Bm]Mar adentro[G]
[D]Estoy vivo[A]

===VERSO 2===
[D]Las olas rompen[A] contra el acantilado
[Bm]Y yo me pregunto[G] qué habrá del otro lado
[D]Mi madre decía[A] que el mar no miente nunca
[Bm]Que guarda los secretos[G] que la tierra no trunca

===PUENTE===
[G]Sal en los labios
[A]Arena en los pies
[Bm]No necesito más
[G]Para saber quién soy
[A]Una vez más
`,

  'CIUDAD DE VIDRIO': `
CIUDAD DE VIDRIO
Proyecto Espejo

===INTRO===
[Dm][Bb][F][C]

===VERSO 1===
[Dm]Todo aquí brilla[Bb] pero no calienta
[F]Las ventanas altas[C] reflejan mi silueta
[Dm]Subí al piso cuarenta[Bb] a ver si desde arriba
[F]Esta ciudad de vidrio[C] se ve menos vacía

===CORO===
[Bb]Ciudad de vidrio[F]
[C]Transparente y fría
[Dm]Se rompe si la tocas[Bb]
[F]Con demasiada energía
[C]Ciudad de vidrio[Bb]
[F]Yo también fui así[C]

===VERSO 2===
[Dm]Me crucé contigo[Bb] en el pasillo doce
[F]Ibas mirando el suelo[C] yo intentaba que me notes
[Dm]Sonreíste un poco[Bb] seguiste caminando
[F]Y el vidrio entre los dos[C] siguió resonando

===PUENTE===
[Bb]No todo lo que brilla
[F]Está partido
[C]A veces el reflejo
[Dm]Es lo que no has vivido
`,

  'TIERRA ROJA': `
TIERRA ROJA
Los Hijos del Norte

===INTRO===
[G][D][Em][C]

===VERSO 1===
[G]Vengo del norte[D] donde el polvo es rojo
[Em]Donde los hombres[C] trabajan sin reloj
[G]Mi padre no habló[D] mucho en su vida
[Em]Pero cada silencio[C] era una despedida

===CORO===
[C]Tierra roja[G]
[D]Que me vio nacer
[Em]Tierra roja[C]
[G]A la que vuelvo[D] otra vez
[C]No hay ciudad[G] que valga más
[D]Que ese camino de polvo[Em]
[C]Que me lleva atrás[G]

===VERSO 2===
[G]Planté un árbol[D] antes de irme al sur
[Em]Para tener excusa[C] de volver
[G]Dicen que creció[D] hasta tocar las nubes
[Em]Y que da sombra a todos[C] los que quieren volver

===PUENTE===
[Em]Norte mío
[C]Siempre fuiste fiel
[G]Cuando el sur me dio
[D]Lo que el norte no pudo
[Em]Igual te extrañé
[C]Igual volví
`,

};

function Rehearsal({songs,onClose,onToast}){
  const [idx,setIdx]=useState(0);
  const [selMember,setSelMember]=useState('todos');
  const [showChords,setShowChords]=useState(true);
  const [tpOff,setTpOff]=useState(0);
  const [showAnnoBar,setShowAnnoBar]=useState(false);
  const [tool,setTool]=useState('draw');
  const [color,setColor]=useState('#ff3b30');
  const [toast,setToast]=useState(null);
  const [capoR,setCapoR]=useState(0);
  const [showCapoR,setShowCapoR]=useState(false);
  const cvRef=useRef(null);
  const wrapRef=useRef(null);
  const strokes=useRef({});
  const drawing=useRef(false);
  const cur=useRef(null);

  const song=songs[idx];
  const curKey=tpKey(song.key,tpOff);
  // Solo miembros de la Banda
  const banda=EQUIPOS_DATA.find(e=>e.name==='Banda');
  const miembros=banda?banda.miembros:[];

  useEffect(()=>{setTpOff(0);},[idx]);
  useEffect(()=>{
    const cv=cvRef.current,w=wrapRef.current;
    if(!cv||!w)return;
    const resize=()=>{cv.width=w.clientWidth;cv.height=w.clientHeight;redrawAll();};
    resize();
    const ro=new ResizeObserver(resize);
    ro.observe(w);
    return()=>ro.disconnect();
  },[idx,selMember]);

  const key=`${idx}-${selMember}`;
  const getStrokes=()=>strokes.current[key]||(strokes.current[key]=[]);
  const getP=e=>{const r=cvRef.current.getBoundingClientRect();const s=e.touches?e.touches[0]:e;return{x:s.clientX-r.left,y:s.clientY-r.top};};
  const applyS=s=>{const ctx=cvRef.current.getContext('2d');if((s?.type||tool)==='erase'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=20;}else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=s?.color||color;ctx.lineWidth=s?.sz||4;}ctx.lineCap='round';ctx.lineJoin='round';};
  const redrawAll=()=>{const cv=cvRef.current;if(!cv)return;const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);getStrokes().forEach(s=>{if(s.pts.length<2)return;ctx.beginPath();applyS(s);ctx.moveTo(s.pts[0].x,s.pts[0].y);s.pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();});ctx.globalCompositeOperation='source-over';};
  const startD=e=>{if(!showAnnoBar||tool==='text')return;drawing.current=true;const p=getP(e);cur.current={type:tool,color,sz:4,pts:[p]};const ctx=cvRef.current.getContext('2d');ctx.beginPath();ctx.moveTo(p.x,p.y);applyS();};
  const moveD=e=>{if(!drawing.current||!cur.current)return;const p=getP(e);cur.current.pts.push(p);const ctx=cvRef.current.getContext('2d');ctx.lineTo(p.x,p.y);ctx.stroke();};
  const endD=()=>{if(!drawing.current)return;drawing.current=false;if(cur.current?.pts.length>1)getStrokes().push(cur.current);cur.current=null;const ctx=cvRef.current.getContext('2d');ctx.globalCompositeOperation='source-over';};
  const doTp=s=>{setTpOff(t=>t+s);};
  const COLS=['#ff3b30','#0a84ff','#30d158','#ffd60a','#bf5af2'];

  const nav=d=>{const n=idx+d;if(n<0||n>=songs.length)return;setIdx(n);setTpOff(0);};

  return(
    <div style={{position:'fixed',inset:0,zIndex:100,background:'var(--bg)',display:'flex',flexDirection:'column'}}>
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      <div className="sv-hdr">
        <div className="sv-back" onClick={onClose}><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:17,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
          <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>{curKey} · {song.bpm} BPM{tpOff!==0?` · ${tpOff>0?'+':''}${tpOff}st`:''}</div>
        </div>
        <div style={{display:'flex',gap:3,alignItems:'center',flexShrink:0}}>
          {songs.map((_,i)=>(<div key={i} style={{height:4,borderRadius:2,background:i<idx?'var(--gn)':i===idx?'var(--ac)':'var(--bd)',width:i===idx?18:8,transition:'all .3s'}}/>))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:100,border:'1px solid rgba(255,82,82,.35)',background:'rgba(255,82,82,.1)',flexShrink:0}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'var(--rd)',animation:'rp 1.2s infinite'}}/>
          <span style={{fontSize:9,fontWeight:900,color:'var(--rd)',textTransform:'uppercase',letterSpacing:'.5px'}}>En Vivo</span>
        </div>
        <button onClick={onClose} style={{width:28,height:28,borderRadius:8,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>×</button>
      </div>
      <div style={{display:'flex',gap:5,padding:'6px 10px',overflowX:'auto',scrollbarWidth:'none',borderBottom:'1px solid var(--bd)',flexShrink:0}}>
        <button onClick={()=>setSelMember('todos')} style={{flexShrink:0,padding:'4px 11px',borderRadius:100,border:selMember==='todos'?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',background:selMember==='todos'?'rgba(200,169,126,.1)':'transparent',color:selMember==='todos'?'var(--ac)':'var(--tx3)',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>Todos</button>
        {miembros.map(m=>(
          <button key={m.id} onClick={()=>setSelMember(m.id)} style={{flexShrink:0,padding:'4px 11px',borderRadius:100,border:selMember===m.id?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',background:selMember===m.id?'rgba(200,169,126,.1)':'transparent',color:selMember===m.id?'var(--ac)':'var(--tx3)',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
            {m.name.split(' ')[0]}
          </button>
        ))}
        {selMember!=='todos'&&<span style={{fontSize:10,color:'rgba(200,169,126,.6)',fontWeight:700,display:'flex',alignItems:'center',marginLeft:4}}>👁 {miembros.find(m=>m.id===selMember)?.name}</span>}
      </div>
      <div style={{borderBottom:'1px solid var(--bd)',background:'rgba(5,5,14,.92)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px'}}>
          <button onClick={()=>setShowAnnoBar(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:7,border:showAnnoBar?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:showAnnoBar?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:showAnnoBar?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Anotar
            <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" style={{transform:showAnnoBar?'rotate(180deg)':'none',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div style={{flex:1}}/>
          <button onClick={()=>setShowChords(v=>!v)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,border:!showChords?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',background:!showChords?'rgba(200,169,126,.1)':'rgba(255,255,255,.04)',color:!showChords?'var(--ac)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif"}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            {showChords?'Solo letra':'Con acordes'}
          </button>
          <button onClick={()=>onToast({text:'Anotaciones guardadas',sub:selMember==='todos'?'Todos':miembros.find(m=>m.id===selMember)?.name})} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,border:'1px solid rgba(94,206,160,.28)',background:'rgba(94,206,160,.07)',color:'var(--gn)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif"}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Guardar
          </button>
        </div>
        {showAnnoBar&&(
          <div style={{display:'flex',alignItems:'center',gap:3,padding:'0 10px 5px',overflowX:'auto',scrollbarWidth:'none'}}>
            {[['draw','Lápiz'],['erase','Borrar']].map(([t,l])=>(
              <button key={t} onClick={()=>setTool(t)} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:6,border:tool===t?'1px solid var(--bd)':'1px solid transparent',background:tool===t?'rgba(255,255,255,.09)':'transparent',color:tool===t?'var(--tx)':'var(--tx3)',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",flexShrink:0}}>{l}</button>
            ))}
            <div style={{width:1,height:16,background:'var(--bd)',margin:'0 3px'}}/>
            {COLS.map(c=>(<button key={c} onClick={()=>setColor(c)} style={{width:18,height:18,borderRadius:'50%',background:c,border:color===c?'2px solid #fff':'2px solid transparent',cursor:'pointer',flexShrink:0}}/>))}
          </div>
        )}
      </div>
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <canvas ref={cvRef} style={{position:'absolute',inset:0,zIndex:2,touchAction:'none',pointerEvents:showAnnoBar&&tool!=='text'?'all':'none',cursor:tool==='erase'?'cell':'crosshair'}}
          onMouseDown={startD} onMouseMove={moveD} onMouseUp={endD} onMouseLeave={endD}
          onTouchStart={e=>{e.preventDefault();startD(e);}} onTouchMove={e=>{e.preventDefault();moveD(e);}} onTouchEnd={e=>{e.preventDefault();endD();}}
        />
        <div ref={wrapRef} className="sv-content" style={{position:'absolute',inset:0,overflowY:'auto',scrollbarWidth:'none',background:svBg,padding:'10px 60px 10px 10px',display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
          <div style={{width:'100%'}}>
            {renderSongContent(getSongContent(song),tpOff,showChords,editMode,selectedChord,(c)=>setSelectedChord(c),(li,ci,dir)=>handleMoveChord(li,ci,dir))}
          </div>
        </div>
        <div style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',zIndex:3,display:'flex',flexDirection:'column',alignItems:'center',gap:0,borderRadius:14,border:'1px solid var(--bd)',background:'rgba(8,8,20,.88)',backdropFilter:'blur(12px)',overflow:'hidden',width:50}}>
          <button onClick={()=>doTp(1)} style={{width:'100%',padding:'8px 0',border:'none',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)'}}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',letterSpacing:'.5px'}}>#</span>
          </button>
          <div style={{width:'100%',padding:'8px 0',textAlign:'center',borderBottom:'1px solid var(--bd)'}}>
            <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:20,color:'var(--ac)',lineHeight:1}}>{curKey}</div>
            {tpOff!==0&&<div style={{fontSize:8,color:'var(--tx3)',fontWeight:700,marginTop:2}}>{tpOff>0?'+':''}{tpOff}</div>}
          </div>
          <button onClick={()=>doTp(-1)} style={{width:'100%',padding:'8px 0',border:'none',background:'transparent',color:'var(--tx2)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,borderBottom:'1px solid var(--bd)'}}>
            <span style={{fontSize:10,fontWeight:900,color:'var(--tx3)',fontStyle:'italic'}}>b</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div style={{borderTop:'1px solid var(--bd)',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:4}}>
            <span style={{fontSize:7,fontWeight:900,textTransform:'uppercase',letterSpacing:'1px',color:'var(--tx3)',marginBottom:3}}>CAPO</span>
            {[0,1,2,3,4,5,6].map(c=>(
              <button key={c} onClick={()=>setCapoR(c)} style={{width:38,height:22,border:'none',background:capoR===c?'rgba(200,169,126,.2)':'transparent',color:capoR===c?'var(--ac)':'var(--tx3)',fontSize:10,fontWeight:capoR===c?900:400,cursor:'pointer',fontFamily:"'Lato',sans-serif",borderRadius:5,transition:'all .1s'}}>
                {c===0?'—':c}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="sv-nav">
        <button className="nb" disabled={idx===0} onClick={()=>nav(-1)}>
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>Anterior
        </button>
        <div className="sv-ni">
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:13,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{song.name}</div>
          <div style={{fontSize:9,color:'var(--tx3)',marginTop:1,fontWeight:700}}>Canción {idx+1} de {songs.length}</div>
        </div>
        <button className="nb p" onClick={()=>{if(idx===songs.length-1){onClose();onToast({text:'Finalizado',sub:songs.length+' canciones'});}else nav(1);}}>
          {idx===songs.length-1?'Finalizar':'Siguiente'}<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
}

function Onboarding({onFinish}){
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

// CANCIONERO
// ── Lector de MusicXML con reproducción MIDI via Tone.js ────────────────────
function playMusicXML(url, onEnd){
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

function _playMusicXML(url, onEnd){
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

function MusicXMLViewer({url}){
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


function Cancionero({mode,onOpenSong,userRole='superadmin'}){
  const isAdmin=userRole==='superadmin'||userRole==='leader';
  const [filter,setFilter]=useState('');
  const [bv,setBv]=useState(true);
  const [tab,setTab]=useState('mi'); // 'mi' | 'universal'
  const [showCrear,setShowCrear]=useState(false);
  const [nueva,setNueva]=useState({nombre:'',autor:'',key:'G',bpm:'',letra:''});
  const [partituras,setPartituras]=useState([]);
  const [partituraSel,setPartituraSel]=useState(null);
  const [midiPlaying,setMidiPlaying]=useState(false);
  const [crearModo,setCrearModo]=useState(null);

  const fl=CANCIONES.filter(s=>s.n.toLowerCase().includes(filter.toLowerCase()));
  const fast=fl.filter(s=>s.bpm>=120).sort((a,b)=>b.bpm-a.bpm);
  const mid=fl.filter(s=>s.bpm>=80&&s.bpm<120).sort((a,b)=>b.bpm-a.bpm);
  const slow=fl.filter(s=>s.bpm<80).sort((a,b)=>b.bpm-a.bpm);

  // UNIVERSAL — demo canciones de otros equipos
  const UNIVERSAL=[
    {n:'10,000 RAZONES',bpm:76,key:'G',autor:'Matt Redman',equipo:'Iglesia Gracia, Stgo'},
    {n:'ERES TODOPODEROSO',bpm:84,key:'A',autor:'Marcos Witt',equipo:'Casa de Dios, Viña'},
    {n:'RENUÉVAME',bpm:72,key:'D',autor:'Marcos Witt',equipo:'Iglesia Uno, CL'},
    {n:'DIGNO DE ALABANZA',bpm:90,key:'G',autor:'Luis Enrique Espinoza',equipo:'ICF Santiago'},
    {n:'SUBLIME GRACIA',bpm:68,key:'G',autor:'John Newton',equipo:'Iglesia Vida Nueva'},
    {n:'CUÁN GRANDE ES ÉL',bpm:64,key:'C',autor:'Stuart K. Hine',equipo:'Misión Paz, Valpo'},
    {n:'GLORIOSO',bpm:96,key:'D',autor:'Redimi2',equipo:'Elim Church CL'},
    {n:'SOPLANDO VIDA',bpm:82,key:'E',autor:'Marcos Brunet',equipo:'IPC Concepción'},
  ];

  const Sec=({title,range,type,songs})=>!songs.length?null:(
    <div className={`bpm-sec ${type}`}>
      <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
        <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:16,color:'var(--tx)'}}>{title}</span>
        <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700,background:'var(--s1)',border:'1px solid var(--bd)',padding:'3px 8px',borderRadius:100}}>{range}</span>
      </div>
      <div className={`bpm-bar ${type}`}/>
      <div className="sg">
        {songs.map(s=>(
          <div key={s.n} className="scard" onClick={()=>onOpenSong&&onOpenSong(s.n)} style={{cursor:'pointer'}}>
            <div className="scard-n">{s.n}</div>
            <div className="scard-s">{s.key} · <span style={{color:'var(--tx3)',fontWeight:600}}>{s.bpm} BPM</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  // MODAL CREAR CANCIÓN
  if(showCrear)return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}}
        onClick={()=>{setShowCrear(false);setCrearModo(null);}}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
          stroke="var(--tx2)" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Cancionero</span>
      </div>

      {/* Selector de modo si no hay uno elegido */}
      {crearModo===null&&(
        <div>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,
            fontSize:20,color:'var(--tx)',marginBottom:4}}>
            Subir nueva canción
          </div>
          <div style={{fontSize:12,color:'var(--tx3)',marginBottom:24,lineHeight:1.5}}>
            Elige cómo quieres agregar la canción a tu cancionero.
          </div>
          {/* Opción 1: Manual */}
          <div onClick={()=>setCrearModo('manual')}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              marginBottom:10,cursor:'pointer'}}>
            <div style={{width:44,height:44,borderRadius:12,flexShrink:0,
              background:'rgba(200,169,126,.1)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="var(--ac)" strokeWidth="1.5">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
              </svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
                fontFamily:"'Lato',sans-serif",marginBottom:3}}>
                Ingresar letra y acordes
              </div>
              <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.4}}>
                Escribe la letra con acordes en formato ChordPro. 
                Soporta transposición automática.
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          {/* Opción 2: Partitura */}
          <div onClick={()=>setCrearModo('partitura')}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              marginBottom:10,cursor:'pointer'}}>
            <div style={{width:44,height:44,borderRadius:12,flexShrink:0,
              background:'rgba(94,206,160,.1)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="var(--gn)" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
                fontFamily:"'Lato',sans-serif",marginBottom:3}}>
                Subir partitura
              </div>
              <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.4}}>
                <strong style={{color:'var(--gn)'}}>MusicXML</strong> — transposición + reproducción MIDI.{' '}
                <strong style={{color:'var(--rd)'}}>PDF</strong> — visualización directa.
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          {/* Opción 3: Drive masivo */}
          <div onClick={()=>setCrearModo('drive')}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px',
              borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
              cursor:'pointer'}}>
            <div style={{width:44,height:44,borderRadius:12,flexShrink:0,
              background:'rgba(255,255,255,.05)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                stroke="var(--tx3)" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
                fontFamily:"'Lato',sans-serif",marginBottom:3}}>
                Subida masiva desde Drive
              </div>
              <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.4}}>
                Conecta una carpeta de Google Drive con archivos .txt o .xml 
                y carga todo el repertorio de una vez.
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      )}

      {/* Modo manual — formulario de letra y acordes */}
      {crearModo==='manual'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,
            cursor:'pointer'}} onClick={()=>setCrearModo(null)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span style={{fontSize:12,color:'var(--tx3)',
              fontFamily:"'Lato',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,
            fontSize:20,color:'var(--tx)',marginBottom:16}}>
            Letra y acordes
          </div>
          <div className="card" style={{padding:14,marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
              Información
            </div>
            <input value={nueva.nombre} onChange={e=>setNueva(v=>({...v,nombre:e.target.value}))}
              placeholder="Nombre de la canción"
              style={{width:'100%',padding:'9px 12px',borderRadius:8,
                border:'1px solid var(--bd)',background:'var(--s2)',
                color:'var(--tx)',fontSize:13,marginBottom:8,boxSizing:'border-box'}}/>
            <input value={nueva.autor} onChange={e=>setNueva(v=>({...v,autor:e.target.value}))}
              placeholder="Autor o compositor"
              style={{width:'100%',padding:'9px 12px',borderRadius:8,
                border:'1px solid var(--bd)',background:'var(--s2)',
                color:'var(--tx)',fontSize:13,marginBottom:8,boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8}}>
              <select value={nueva.key} onChange={e=>setNueva(v=>({...v,key:e.target.value}))}
                style={{flex:1,padding:'9px 12px',borderRadius:8,
                  border:'1px solid var(--bd)',background:'var(--s2)',
                  color:'var(--tx)',fontSize:13}}>
                {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(k=>(
                  <option key={k}>{k}</option>
                ))}
              </select>
              <input value={nueva.bpm} onChange={e=>setNueva(v=>({...v,bpm:e.target.value}))}
                placeholder="BPM" type="number"
                style={{flex:1,padding:'9px 12px',borderRadius:8,
                  border:'1px solid var(--bd)',background:'var(--s2)',
                  color:'var(--tx)',fontSize:13}}/>
            </div>
          </div>
          <div className="card" style={{padding:14,marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',
              textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>
              Letra y acordes
            </div>
            <div style={{fontSize:11,color:'var(--tx3)',marginBottom:10,lineHeight:1.5}}>
              Usa <code style={{background:'var(--s3)',padding:'1px 5px',
                borderRadius:4,color:'var(--ac)'}}>[C]</code> para líneas de contenido y{' '}
              <code style={{background:'var(--s3)',padding:'1px 5px',
                borderRadius:4,color:'var(--ac)'}}>[L]</code> para metadatos.
              Los acordes entre <code style={{background:'var(--s3)',padding:'1px 5px',
                borderRadius:4,color:'var(--ac)'}}>[A B C#m]</code> se detectan automáticamente.
            </div>
            <textarea value={nueva.letra}
              onChange={e=>setNueva(v=>({...v,letra:e.target.value}))}
              rows={10} placeholder={"[L]VERSO 1:
[C]A         E
[C]Tu fidelidad es grande
[C]D         A
[C]Grande es tu amor

[L]CORO:
[C]Te alabaré..."}
              style={{width:'100%',padding:'10px',borderRadius:8,
                border:'1px solid var(--bd)',background:'var(--s2)',
                color:'var(--tx)',fontSize:12,fontFamily:"'Source Code Pro',monospace",
                resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}/>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={{flex:1,padding:'10px',borderRadius:10,
              border:'1px solid var(--bd)',background:'transparent',
              color:'var(--tx3)',cursor:'pointer',fontSize:13,fontWeight:700,
              fontFamily:"'Lato',sans-serif"}}
              onClick={()=>setCrearModo(null)}>Cancelar</button>
            <button className="btn-p" disabled={!nueva.nombre.trim()}
              onClick={()=>{
                setShowCrear(false);setCrearModo(null);
                setNueva({nombre:'',autor:'',key:'G',bpm:'',letra:''});
              }}
              style={{flex:2,padding:'10px',borderRadius:10,fontSize:13,fontWeight:700,
                fontFamily:"'Lato',sans-serif",display:'flex',alignItems:'center',
                justifyContent:'center',gap:6}}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Guardar canción
            </button>
          </div>
        </div>
      )}

      {/* Modo partitura */}
      {crearModo==='partitura'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,
            cursor:'pointer'}} onClick={()=>setCrearModo(null)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span style={{fontSize:12,color:'var(--tx3)',
              fontFamily:"'Lato',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,
            fontSize:20,color:'var(--tx)',marginBottom:6}}>
            Subir partitura
          </div>
          <div style={{fontSize:12,color:'var(--tx3)',marginBottom:20,lineHeight:1.6}}>
            Selecciona el formato según lo que necesites hacer con la partitura.
          </div>
          {/* Explicación formatos */}
          {[
            {fmt:'MusicXML',ext:'.xml .mxl .musicxml',color:'var(--gn)',
             desc:'Partitura digital editable. Permite transposición automática, reproducción MIDI y visualización de notas. Exporta desde MuseScore, Sibelius o Finale.'},
            {fmt:'PDF',ext:'.pdf',color:'var(--rd)',
             desc:'Partitura escaneada o exportada. Solo visualización directa, sin edición ni transposición. Útil para partituras antiguas o de editores externos.'},
          ].map(f=>(
            <div key={f.fmt} style={{padding:'14px',borderRadius:12,
              border:`1px solid ${f.color}22`,background:`${f.color}08`,
              marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:800,color:f.color,
                  fontFamily:"'Lato',sans-serif"}}>{f.fmt}</span>
                <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700,
                  background:'var(--s2)',padding:'2px 6px',borderRadius:6}}>{f.ext}</span>
              </div>
              <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.5}}>{f.desc}</div>
            </div>
          ))}
          <label style={{display:'flex',flexDirection:'column',alignItems:'center',
            justifyContent:'center',gap:10,padding:'24px',borderRadius:14,
            border:'2px dashed rgba(200,169,126,.3)',background:'rgba(200,169,126,.04)',
            cursor:'pointer',marginTop:8}}>
            <input type="file" accept=".xml,.mxl,.musicxml,.pdf"
              style={{display:'none'}}
              onChange={e=>{
                const file=e.target.files[0];
                if(!file)return;
                const tipo=file.name.endsWith('.pdf')?'pdf':'musicxml';
                const url=URL.createObjectURL(file);
                setPartituras(prev=>[...prev,{
                  id:Date.now(),
                  nombre:file.name.replace(/\.[^.]+$/,''),
                  tipo,url,size:(file.size/1024).toFixed(0)+'kb'
                }]);
                setShowCrear(false);setCrearModo(null);
                setTab('partituras');
              }}/>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
              stroke="rgba(200,169,126,.5)" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div style={{fontSize:13,fontWeight:700,color:'var(--ac)',
              fontFamily:"'Lato',sans-serif"}}>
              Tocar para seleccionar archivo
            </div>
            <div style={{fontSize:11,color:'var(--tx3)'}}>
              MusicXML o PDF
            </div>
          </label>
        </div>
      )}

      {/* Modo drive masivo */}
      {crearModo==='drive'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,
            cursor:'pointer'}} onClick={()=>setCrearModo(null)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="var(--tx3)" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span style={{fontSize:12,color:'var(--tx3)',
              fontFamily:"'Lato',sans-serif"}}>Subir canción</span>
          </div>
          <div style={{fontFamily:"'Lato',sans-serif",fontWeight:900,
            fontSize:20,color:'var(--tx)',marginBottom:6}}>
            Subida masiva desde Drive
          </div>
          <div style={{fontSize:12,color:'var(--tx3)',marginBottom:20,lineHeight:1.6}}>
            Conecta una carpeta de Google Drive que contenga tus canciones y carga todo el repertorio de una vez.
          </div>
          <div style={{padding:'16px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--tx)',
              fontFamily:"'Lato',sans-serif",marginBottom:8}}>Formatos soportados</div>
            {[
              {ext:'.txt',desc:'Canciones en formato ChordPro (una por archivo)'},
              {ext:'.xml / .mxl',desc:'Partituras MusicXML'},
              {ext:'.pdf',desc:'Partituras PDF'},
            ].map(f=>(
              <div key={f.ext} style={{display:'flex',gap:8,marginBottom:6}}>
                <code style={{fontSize:11,fontWeight:700,color:'var(--ac)',
                  background:'var(--s2)',padding:'2px 6px',borderRadius:4,flexShrink:0}}>
                  {f.ext}
                </code>
                <span style={{fontSize:11,color:'var(--tx3)'}}>{f.desc}</span>
              </div>
            ))}
          </div>
          <button
            onClick={()=>{setShowCrear(false);setCrearModo(null);}}
            style={{width:'100%',padding:'12px',borderRadius:12,border:'none',
              background:'rgba(200,169,126,.12)',color:'var(--ac)',
              fontSize:13,fontWeight:700,cursor:'pointer',
              fontFamily:"'Lato',sans-serif",display:'flex',
              alignItems:'center',justifyContent:'center',gap:8}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Conectar carpeta de Drive
          </button>
          <div style={{fontSize:11,color:'var(--tx3)',textAlign:'center',
            marginTop:8,fontFamily:"'Lato',sans-serif"}}>
            Disponible en la próxima actualización
          </div>
        </div>
      )}
    </div>
  );


  return(
    <div>
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:32,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Canciones</div>
          <div style={{fontSize:12,color:'var(--tx2)'}}>Busca canciones · sube letras con acordes · importa partituras MusicXML o PDF · <span style={{color:'var(--ac)'}}>{CANCIONES.length} canciones</span></div>
        </div>
  
      </div>
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        <button onClick={()=>setTab('mi')} style={{padding:'6px 14px',borderRadius:100,border:tab==='mi'?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',background:tab==='mi'?'rgba(200,169,126,.1)':'transparent',color:tab==='mi'?'var(--ac)':'var(--tx3)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>Mi cancionero</button>
        {mode==='worship'&&<button onClick={()=>setTab('universal')} style={{padding:'6px 14px',borderRadius:100,border:tab==='universal'?'1px solid rgba(94,206,160,.4)':'1px solid var(--bd)',background:tab==='universal'?'rgba(94,206,160,.1)':'transparent',color:tab==='universal'?'var(--gn)':'var(--tx3)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lato',sans-serif",display:'flex',alignItems:'center',gap:5}}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          Universal
        </button>}
        <button onClick={()=>setTab('partituras')} style={{padding:'6px 14px',borderRadius:100,
          border:tab==='partituras'?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',
          background:tab==='partituras'?'rgba(200,169,126,.1)':'transparent',
          color:tab==='partituras'?'var(--ac)':'var(--tx3)',
          fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lato',sans-serif",
          display:'flex',alignItems:'center',gap:5}}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/>
          </svg>
          Partituras
        </button>
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:6,flexShrink:0}}>
          <button onClick={()=>{setShowCrear(true);setCrearModo(null);}}
            style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',
              borderRadius:100,border:'1px solid rgba(200,169,126,.35)',
              background:'rgba(200,169,126,.09)',color:'var(--ac)',
              fontWeight:700,fontSize:11,cursor:'pointer',
              fontFamily:"'Lato',sans-serif",flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Subir canción
          </button>
          <button onClick={()=>{setShowCrear(true);setCrearModo('drive');}}
            style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',
              borderRadius:100,border:'1px solid rgba(255,255,255,.1)',
              background:'rgba(255,255,255,.04)',color:'var(--tx3)',
              fontWeight:700,fontSize:11,cursor:'pointer',
              fontFamily:"'Lato',sans-serif",flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none"
              stroke="currentColor" strokeWidth="2.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Subida masiva Drive
          </button>
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <input className="inp" placeholder="Buscar canción..." style={{flex:1}} value={filter} onChange={e=>setFilter(e.target.value)}/>
        <button onClick={()=>setBv(v=>!v)} style={{flexShrink:0,padding:'0 13px',borderRadius:9,border:'1px solid var(--bd)',background:bv?'rgba(200,169,126,.08)':'var(--s1)',color:bv?'var(--ac)':'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif",height:42,display:'flex',alignItems:'center',gap:5}}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          {bv?'Por BPM':'Por lista'}
        </button>
      </div>

      {tab==='mi'&&(
        bv&&!filter?(<><Sec title="Rápidas" range="120+ BPM" type="fast" songs={fast}/><Sec title="Medias" range="80–119 BPM" type="mid" songs={mid}/><Sec title="Lentas" range="–80 BPM" type="slow" songs={slow}/></>)
        :(<div className="sg">{fl.sort((a,b)=>b.bpm-a.bpm).map(s=><div key={s.n} className="scard" onClick={()=>onOpenSong&&onOpenSong(s.n)} style={{cursor:'pointer'}}><div className="scard-n">{s.n}</div><div className="scard-s">{s.key} · <span style={{color:'var(--tx3)',fontWeight:600}}>{s.bpm} BPM</span></div></div>)}</div>)
      )}

      {tab==='universal'&&(
        <div>
          <div style={{padding:'10px 12px',borderRadius:12,background:'rgba(94,206,160,.06)',border:'1px solid rgba(94,206,160,.2)',marginBottom:14}}>
            <div style={{fontSize:11,color:'var(--gn)',fontWeight:700,marginBottom:2}}>Cancionero Universal</div>
            <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.6}}>Canciones compartidas por iglesias de la comunidad Setlist. Solo disponible en Modo Iglesia.</div>
          </div>
          <div className="sg">
            {UNIVERSAL.filter(s=>s.n.toLowerCase().includes(filter.toLowerCase())).map(s=>(
              <div key={s.n} className="scard" onClick={()=>onOpenSong&&onOpenSong(s.n)} style={{cursor:'pointer'}}>
                <div className="scard-n">{s.n}</div>
                <div className="scard-s">{s.key} · {s.bpm} BPM</div>
                <div style={{fontSize:9,color:'var(--tx3)',marginTop:4,fontStyle:'italic'}}>{s.equipo}</div>
              </div>
            ))}
          </div>
        </div>
      )}


      {tab==='partituras'&&(
        <div>
          <div style={{fontSize:20,fontWeight:900,color:'var(--tx)',
            fontFamily:"'Lato',sans-serif",marginBottom:4}}>Partituras</div>
          <div style={{fontSize:12,color:'var(--tx3)',marginBottom:20,lineHeight:1.5}}>
            Sube partituras en formato <strong style={{color:'var(--ac)'}}>MusicXML</strong> o <strong style={{color:'var(--ac)'}}>PDF</strong>.
            MusicXML permite transposición automática y reproducción MIDI.
            PDF es para visualización directa.
          </div>

          {/* Zona de subida */}
          {isAdmin&&(
            <label style={{
              display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',gap:10,
              padding:'24px 16px',borderRadius:14,
              border:'2px dashed rgba(200,169,126,.3)',
              background:'rgba(200,169,126,.04)',
              cursor:'pointer',marginBottom:20,
            }}>
              <input type="file" accept=".xml,.mxl,.musicxml,.pdf"
                style={{display:'none'}}
                onChange={e=>{
                  const file=e.target.files[0];
                  if(!file)return;
                  const tipo=file.name.endsWith('.pdf')?'pdf':'musicxml';
                  const url=URL.createObjectURL(file);
                  setPartituras(prev=>[...prev,{
                    id:Date.now(),nombre:file.name.replace(/\.[^.]+$/,''),
                    tipo,url,size:(file.size/1024).toFixed(0)+'kb'
                  }]);
                }}/>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none"
                stroke="rgba(200,169,126,.5)" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--ac)'}}>
                  Subir partitura
                </div>
                <div style={{fontSize:11,color:'var(--tx3)',marginTop:4}}>
                  Formatos aceptados:
                </div>
                <div style={{display:'flex',gap:6,justifyContent:'center',marginTop:6,flexWrap:'wrap'}}>
                  {[
                    {ext:'MusicXML',desc:'Transposición + MIDI'},
                    {ext:'PDF',desc:'Visualización directa'},
                  ].map(f=>(
                    <span key={f.ext} style={{fontSize:10,fontWeight:700,
                      padding:'3px 8px',borderRadius:10,
                      background:'rgba(200,169,126,.1)',color:'var(--ac)',
                      border:'1px solid rgba(200,169,126,.2)'}}>
                      {f.ext} <span style={{opacity:.6,fontWeight:400}}>— {f.desc}</span>
                    </span>
                  ))}
                </div>
              </div>
            </label>
          )}

          {/* Lista de partituras */}
          {partituras.length===0?(
            <div style={{textAlign:'center',padding:'30px 0',color:'var(--tx3)',fontSize:13}}>
              {isAdmin?'Aún no hay partituras. Sube una usando el botón de arriba.':'Sin partituras disponibles.'}
            </div>
          ):partituras.map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,
              padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
              background:'var(--s1)',marginBottom:8}}>
              {/* Ícono por tipo */}
              <div style={{width:40,height:40,borderRadius:10,flexShrink:0,
                background:p.tipo==='pdf'?'rgba(196,64,16,.1)':'rgba(200,169,126,.1)',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                {p.tipo==='pdf'?(
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                    stroke="var(--rd)" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                ):(
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                    stroke="var(--ac)" strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                )}
              </div>
              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,color:'var(--tx)',
                  fontFamily:"'Lato',sans-serif",whiteSpace:'nowrap',
                  overflow:'hidden',textOverflow:'ellipsis'}}>{p.nombre}</div>
                <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>
                  {p.tipo==='pdf'?'PDF':'MusicXML'} · {p.size}
                </div>
              </div>
              {/* Acciones */}
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                {p.tipo==='pdf'?(
                  <a href={p.url} target="_blank" rel="noreferrer"
                    style={{padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:700,
                      border:'1px solid var(--bd)',background:'transparent',
                      color:'var(--tx2)',cursor:'pointer',textDecoration:'none',
                      fontFamily:"'Lato',sans-serif"}}>
                    Ver PDF
                  </a>
                ):(
                  <button onClick={()=>setPartituraSel(p)}
                    style={{padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:700,
                      border:'1px solid var(--ac)',background:'rgba(200,169,126,.08)',
                      color:'var(--ac)',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
                    Leer
                  </button>
                )}
                {isAdmin&&(
                  <button onClick={()=>setPartituras(prev=>prev.filter(x=>x.id!==p.id))}
                    style={{padding:'5px 8px',borderRadius:8,fontSize:11,
                      border:'1px solid var(--bd)',background:'transparent',
                      color:'var(--tx3)',cursor:'pointer'}}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
                      stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Lector MusicXML con MIDI */}
          {partituraSel&&(
            <div style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:100,
              display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
                borderBottom:'1px solid var(--bd)',flexShrink:0}}>
                <button onClick={()=>{setPartituraSel(null);setMidiPlaying(false);}}
                  style={{background:'transparent',border:'none',cursor:'pointer',
                    color:'var(--tx3)',display:'flex',alignItems:'center'}}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                    stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:900,color:'var(--tx)',
                    fontFamily:"'Lato',sans-serif"}}>{partituraSel.nombre}</div>
                  <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,
                    textTransform:'uppercase',letterSpacing:'1px'}}>
                    MusicXML · Reproducción MIDI
                  </div>
                </div>
                <button onClick={()=>{
                  if(midiPlaying){
                    setMidiPlaying(false);
                    window.__midiStop&&window.__midiStop();
                  } else {
                    setMidiPlaying(true);
                    playMusicXML(partituraSel.url, ()=>setMidiPlaying(false));
                  }
                }} style={{
                  display:'flex',alignItems:'center',gap:6,
                  padding:'7px 14px',borderRadius:10,border:'none',
                  background:midiPlaying?'rgba(196,64,16,.15)':'rgba(200,169,126,.12)',
                  color:midiPlaying?'var(--rd)':'var(--ac)',
                  fontSize:12,fontWeight:700,cursor:'pointer',
                  fontFamily:"'Lato',sans-serif",
                }}>
                  {midiPlaying?(
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none">
                      <rect x="6" y="4" width="4" height="16"/>
                      <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                  ):(
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  )}
                  {midiPlaying?'Detener':'Reproducir MIDI'}
                </button>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:'20px',
                display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
                <MusicXMLViewer url={partituraSel.url}/>
              </div>
              <div style={{padding:'12px 16px',borderTop:'1px solid var(--bd)',
                background:'var(--s1)',fontSize:11,color:'var(--tx3)',textAlign:'center',
                lineHeight:1.5}}>
                El sonido MIDI es una aproximación sintética de la partitura.
                No representa el sonido real del instrumento.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


    </div>
  );
}

function EquiposView({onToast,onGestionar}){
  return(
    <div>
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:32,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Equipos</div>
          <div style={{fontSize:12,color:'var(--ac)',fontWeight:600}}>Toca un equipo para ver sus integrantes y roles</div>
        </div>
        
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(295px,1fr))',gap:13}}>
        {EQUIPOS_DATA.map(eq=>(
          <div key={eq.id} className="eq-card">
            <div style={{padding:'12px 15px',display:'flex',alignItems:'center',gap:9,borderBottom:'1px solid var(--bd)'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:eq.color,boxShadow:`0 0 8px ${eq.color}80`,flexShrink:0}}/>
              <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:15,color:'var(--tx)',flex:1}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700,background:'var(--s2)',border:'1px solid var(--bd)',padding:'2px 8px',borderRadius:100}}>{eq.miembros.length} integrantes</span>
            </div>
            <div style={{padding:'8px 15px',borderBottom:'1px solid var(--bd)',display:'flex',flexWrap:'wrap',gap:5}}>
              {eq.roles.map(r=><span key={r} style={{fontSize:10,fontWeight:700,color:'var(--tx2)',background:'var(--s1)',border:'1px solid var(--bd)',padding:'3px 9px',borderRadius:100}}>{r}</span>)}
            </div>
            <div style={{padding:'0 15px'}}>
              {eq.miembros.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,'+eq.color+'80,'+eq.color+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{m.name}</div>
                    <div style={{fontSize:10,color:'var(--tx3)'}}>{m.email}</div>
                  </div>
                  <span style={{fontSize:10,color:eq.color,fontWeight:700,background:eq.color+'18',border:`1px solid ${eq.color}33`,padding:'2px 7px',borderRadius:100}}>{m.role}</span>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

// ADMIN VIEW

// ─── MINI CALENDARIO DE EVENTOS ───────────────────────
function MiniCalEvento({mes}){
  const now=new Date();
  const year=now.getFullYear();
  const month=mes!==undefined?mes:now.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const rawFirst=new Date(year,month,1).getDay(); const firstDay=rawFirst===0?6:rawFirst-1;
  const isCurrentMonth=month===now.getMonth();
  const setlistDays=isCurrentMonth?new Set(Object.entries(SETLISTS).filter(([,v])=>v!==null).map(([d])=>parseInt(d))):new Set();
  const especiales=new Set(EVENTOS_ESPECIALES.filter(e=>e.mes===month+1).map(e=>e.dia));
  const eventDays=new Set([...setlistDays,...especiales]);
  const today=isCurrentMonth?now.getDate():0;

  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  while(cells.length%7!==0)cells.push(null);
  const rows=[];
  for(let i=0;i<cells.length;i+=7)rows.push(cells.slice(i,i+7));

  return(
    <div style={{flexShrink:0,display:'flex',flexDirection:'column',gap:1,minWidth:140}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1,marginBottom:2}}>
        {['L','M','M','J','V','S','D'].map((d,i)=>(
          <div key={i} style={{textAlign:'center',fontSize:6,fontWeight:900,color:'rgba(255,255,255,.22)',fontFamily:"'Lato',sans-serif"}}>{d}</div>
        ))}
      </div>
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:0}}>
          {row.map((d,ci)=>{
            if(!d)return(<div key={ci} style={{height:11}}/>);
            const hasEv=eventDays.has(d);
            const isToday=d===today;
            return(
              <div key={ci} style={{height:11,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{
                  fontSize:7,fontWeight:hasEv?900:400,
                  fontFamily:"'Lato',sans-serif",
                  color:hasEv?'var(--ac)':isToday?'rgba(255,255,255,.8)':'var(--tx3)',
                  textDecoration:isToday&&!hasEv?'underline':'none',
                  lineHeight:1
                }}>{d}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function AdminView({mode,activeSunday,userRole,onRehearsal,onToast,onSelectDay,mesNav=new Date().getMonth()}){
  const [selDay,setSelDay]=useState(activeSunday);
  const [showPicker,setShowPicker]=useState(false);
  const [pFilter,setPFilter]=useState('');
  const [sel,setSel]=useState(new Set());
  const [published,setPublished]=useState(selDay===14||selDay===7);
  const isAdmin=userRole==='superadmin';
  const isLeader=userRole==='leader'||isAdmin;
  const MESES_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNombre=MESES_ES[new Date().getMonth()];

  // Días con evento este mes
  const diasEvento=Object.entries(SETLISTS)
    .filter(entry=>entry[1]!==null)
    .map(entry=>({day:parseInt(entry[0]),sl:entry[1]}));

  const selSl=SETLISTS[selDay]||[];
  const today=new Date().getDate();
  const todayMonth=new Date().getMonth()+1;
  // Determinar el próximo evento (primer domingo/evento del mes actual desde hoy en adelante)
  const allDays=Object.keys(SETLISTS).map(Number).sort((a,b)=>a-b);
  const nextDay=allDays.find(d=>d>=today&&SETLISTS[d]!==null);

  return(
    <div style={{padding:'0 0 90px'}}>
      <div style={{padding:'12px 8px 10px',display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:32,color:'var(--tx)',lineHeight:1}}>
            Eventos <span style={{color:'var(--ac)'}}>{['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][mesNav]}</span>
          </div>
          <div style={{fontSize:12,color:'var(--ac)',fontWeight:600,marginTop:5}}>
            {mesNav===new Date().getMonth()?`${diasEvento.filter(e=>e.sl).length} domingos · Toca uno para ver el detalle`:'Eventos del mes seleccionado'}
          </div>
        </div>
        <MiniCalEvento mes={mesNav}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10,padding:'0 8px 14px'}}>
        {mesNav===new Date().getMonth()&&Object.entries(SETLISTS).map(([dayStr,sl])=>{
          const day=parseInt(dayStr);
          const isNull=sl===null;
          const isActive=day===selDay;
          const pub=day<=14;
          if(isNull)return(
            <div key={day} style={{padding:'14px 16px',borderRadius:16,background:'rgba(255,82,82,.04)',border:'1px solid rgba(255,82,82,.15)',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:42,height:42,borderRadius:11,background:'rgba(255,82,82,.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:18,fontWeight:900,color:'rgba(255,82,82,.5)'}}>–</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:'var(--tx2)'}}>Dom {day}</div>
                <div style={{fontSize:11,color:'rgba(255,82,82,.7)',marginTop:2,fontWeight:700}}>Sin reunión</div>
              </div>
            </div>
          );
          const isNext=day===nextDay&&todayMonth===new Date().getMonth()+1;
          return(
            <div key={day}>
              {isNext&&day>today&&(
                <div style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0'}}>
                  <div style={{flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(200,169,126,.4))'}}/>
                  <span style={{fontSize:9,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1.5px',flexShrink:0}}>Próximo evento</span>
                  <div style={{flex:1,height:1,background:'linear-gradient(270deg,transparent,rgba(200,169,126,.4))'}}/>
                </div>
              )}
            <div onClick={()=>{setSelDay(day);if(onSelectDay)onSelectDay(day);}} style={{padding:isNext?'20px 16px':isActive?'18px 16px':'12px 14px',borderRadius:16,background:isNext?'rgba(200,169,126,.1)':isActive?'rgba(200,169,126,.07)':'var(--s1)',border:isNext?'1px solid rgba(200,169,126,.5)':isActive?'1px solid rgba(200,169,126,.35)':'1px solid var(--bd)',cursor:'pointer',transition:'all .2s',opacity:(day<today&&!isActive)?0.55:1}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:900,fontSize:isNext?28:isActive?22:17,color:'var(--tx)',fontFamily:"'Lato',sans-serif",transition:'font-size .2s'}}>Domingo {day}</div>
                  <div style={{fontSize:13,color:'var(--tx3)',marginTop:4,fontWeight:700}}>{sl.length} {sl.length===1?'canción':'canciones'}</div>
                </div>
                <span style={{padding:'4px 10px',borderRadius:100,fontSize:9,fontWeight:700,border:pub?'1px solid rgba(94,206,160,.35)':'1px solid rgba(255,200,100,.25)',background:pub?'rgba(94,206,160,.08)':'rgba(255,200,100,.06)',color:pub?'var(--gn)':'rgba(255,200,100,.8)',flexShrink:0}}>{pub?'✓ Publicado':'Borrador'}</span>
                {isLeader&&(
                  <button onClick={e=>{e.stopPropagation();onRehearsal();}} style={{padding:'7px 12px',borderRadius:10,border:'1px solid rgba(200,169,126,.3)',background:'rgba(94,206,160,.1)',cursor:'pointer',display:'flex',alignItems:'center',gap:5,flexShrink:0,fontFamily:"'Lato',sans-serif",fontWeight:700,fontSize:11,color:'var(--gn)',border:'1px solid rgba(94,206,160,.35)'}}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--gn)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    Modo Ensayo
                  </button>
                )}
              </div>
              <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:2}}>
                {EQUIPOS_DATA.map(eq=>(
                  <div key={eq.id} style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:100,background:eq.color+'12',border:'1px solid '+eq.color+'30'}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
                    <span style={{fontSize:10,fontWeight:700,color:'var(--tx)',fontFamily:"'Lato',sans-serif"}}>{eq.name}</span>
                    <span style={{fontSize:9,fontWeight:900,color:eq.color,marginLeft:2,display:'flex',alignItems:'center',gap:1}}>
                      {eq.miembros.length}
                      <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke={eq.color} strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </span>
                  </div>
                ))}
              </div>

            </div>
            </div>
          );
        })}

      </div>
      {mesNav!==new Date().getMonth()&&(
        <div style={{display:'flex',flexDirection:'column',gap:10,padding:'0 8px 14px'}}>
          {EVENTOS_ESPECIALES.filter(ev=>ev.mes===mesNav+1).length===0?(
            <div style={{padding:'32px 20px',borderRadius:16,background:'var(--s1)',border:'1px solid var(--bd)',textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:10}}>📭</div>
              <div style={{fontWeight:700,fontSize:15,color:'var(--tx)',marginBottom:6}}>Sin eventos ingresados</div>
              <div style={{fontSize:12,color:'var(--ac)',fontWeight:600}}>Crea un evento en Backstage para este mes</div>
            </div>
          ):(
            EVENTOS_ESPECIALES.filter(ev=>ev.mes===mesNav+1).map((ev,i)=>(
              <div key={i} style={{padding:'18px 16px',borderRadius:16,background:'var(--s1)',border:'1px solid rgba(200,169,126,.3)',cursor:'pointer'}} onClick={()=>onSelectDay&&onSelectDay(ev.dia)}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:900,fontSize:18,color:'var(--tx)',fontFamily:"'Lato',sans-serif"}}>{ev.label}</div>
                    <div style={{fontSize:12,color:'var(--ac)',marginTop:3,fontWeight:600,textTransform:'capitalize'}}>{ev.tipo} · {ev.setlist.length} canciones</div>
                  </div>
                  <span style={{padding:'4px 10px',borderRadius:100,fontSize:9,fontWeight:700,border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.08)',color:'var(--ac)',display:'none'}}>Especial</span>
                  {isLeader&&<button onClick={e=>{e.stopPropagation();onRehearsal();}} style={{padding:'6px 10px',borderRadius:9,border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.08)',cursor:'pointer',fontSize:10,fontWeight:700,color:'var(--ac)',fontFamily:"'Lato',sans-serif",display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    Modo Ensayo
                  </button>}
                </div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
                  {ev.setlist.map((s,j)=>(<span key={j} style={{fontSize:9,fontWeight:700,color:'var(--tx3)',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.07)',padding:'2px 7px',borderRadius:100}}>{s.name.split(' ').slice(0,3).join(' ')}</span>))}
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {EQUIPOS_DATA.map(eq=>(
                    <div key={eq.id} style={{display:'flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:100,background:eq.color+'12',border:'1px solid '+eq.color+'25'}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:eq.color}}/>
                      <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.6)'}}>{eq.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {mesNav===new Date().getMonth()&&EVENTOS_ESPECIALES.filter(ev=>ev.mes===mesNav+1).length>0&&(
        <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0'}}>
            <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
            <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Eventos especiales</span>
            <div style={{flex:1,height:1,background:'rgba(255,255,255,.08)'}}/>
          </div>
          {EVENTOS_ESPECIALES.filter(ev=>ev.mes===mesNav+1).map((ev,i)=>(
            <div key={i} style={{padding:'14px 16px',borderRadius:16,background:'var(--s1)',border:'1px solid rgba(200,169,126,.25)'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:900,fontSize:16,color:'var(--tx)',fontFamily:"'Lato',sans-serif"}}>{ev.label}</div>
                  <div style={{fontSize:11,color:'var(--ac)',marginTop:2,fontWeight:700,textTransform:'capitalize'}}>{ev.tipo} · {ev.setlist.length} canciones</div>
                </div>
                <span style={{padding:'3px 9px',borderRadius:100,fontSize:9,fontWeight:700,border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.08)',color:'var(--ac)',flexShrink:0,display:'none'}}>Especial</span>
              </div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {ev.setlist.map((s,j)=>(<span key={j} style={{fontSize:9,fontWeight:700,color:'var(--tx3)',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',padding:'2px 7px',borderRadius:100}}>{s.name.split(' ').slice(0,3).join(' ')}</span>))}
              </div>
            </div>
          ))}
        </div>
      )}
      {showPicker&&(
        <div className="mov" onClick={e=>e.target===e.currentTarget&&setShowPicker(false)}>
          <div className="modal">
            <div className="m-hdr">
              <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:19,color:'var(--tx)'}}>Agregar canción</span>
              <button className="ib" onClick={()=>setShowPicker(false)}><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <input className="inp" style={{margin:'9px 13px',width:'calc(100% - 26px)'}} placeholder="Buscar..." value={pFilter} onChange={e=>setPFilter(e.target.value)}/>
            <div className="m-body">
              {CANCIONES.filter(s=>s.n.toLowerCase().includes(pFilter.toLowerCase())).map((s,i)=>(
                <div key={s.n} className={`so${sel.has(s.n)?' on':''}`} onClick={()=>setSel(prev=>{const ns=new Set(prev);ns.has(s.n)?ns.delete(s.n):ns.add(s.n);return ns;})}>
                  <span style={{fontFamily:"'Lato',sans-serif",fontSize:13,color:'var(--tx3)',width:17,flexShrink:0}}>{i+1}</span>
                  <span className="so-n">{s.n}</span>
                  <span className="so-bpm">{s.bpm}</span>
                  <div className="so-chk">✓</div>
                </div>
              ))}
            </div>
            <div className="m-ftr">
              <button className="btn btn-g btn-sm" onClick={()=>setShowPicker(false)}>Cancelar</button>
              <button className="btn btn-p btn-sm" onClick={()=>{setShowPicker(false);onToast({text:'Actualizado',sub:`${sel.size} canciones`});}}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NOTIFICACIÓN PRÓX FECHA ──────────────────────────
// Mensajes generados dinámicamente con info del evento
const generarMensaje=(activeSunday,sl,mesNombre,tipo)=>{
  const canciones=sl.map((s,i)=>`${i+1}. ${s.name} (${s.key} - ${s.bpm} BPM)`).join('\n');
  const dias=tipo==='mie'?'este miércoles':'este sábado';
  const animos=[
    'No tocamos para impresionar, tocamos para ministrar. ¡Preparemos nuestros corazones!',
    'Somos instrumentos en manos del Señor. Que cada nota sea una ofrenda genuina.',
    '¡La presencia de Dios nos espera! Vengan listos y con el corazón disponible.',
    '¡Gracias por su fidelidad! Juntos vamos a levantar una adoración que glorifique a Dios.',
  ];
  const animo=animos[Math.floor(Math.random()*animos.length)];
  return `Hola equipo hermoso! 🎸

Les recuerdo que este domingo ${activeSunday} de ${mesNombre} tenemos servicio.

📋 SETLIST:
${canciones}

⏰ Llegada: 8:30 AM | Ensayo: 9:00 AM | Servicio: 10:00 AM

Por favor repasa las canciones con tiempo antes del ${dias}. 🙏

${animo}

¡Los esperamos! Con amor, el equipo de liderazgo.`;
};
function MiSetlistNotif({onToast,activeSunday,sl,mesNombre}){
  const [msg,setMsg]=useState('');
  const [tipo,setTipo]=useState('mie');
  useEffect(()=>{setMsg(generarMensaje(activeSunday,sl,mesNombre,tipo));},[tipo,activeSunday]);
  const [custom,setCustom]=useState(false);
  const [open,setOpen]=useState(false);
  if(!open)return(
    <div style={{marginBottom:14}}>
      <div style={{borderTop:'1px solid var(--bd)',paddingTop:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Recordatorio al equipo</div>
        <button onClick={()=>setOpen(true)} style={{width:'100%',padding:'14px 16px',borderRadius:14,border:'1px solid rgba(200,169,126,.3)',background:'rgba(200,169,126,.07)',cursor:'pointer',display:'flex',alignItems:'center',gap:12,fontFamily:"'Lato',sans-serif",transition:'all .15s'}}>
          <div style={{width:38,height:38,borderRadius:10,background:'rgba(200,169,126,.12)',border:'1px solid rgba(200,169,126,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{flex:1,textAlign:'left'}}>
            <div style={{fontWeight:900,fontSize:14,color:'var(--ac)'}}>Enviar recordatorio</div>
            <div style={{fontSize:11,color:'var(--tx2)',marginTop:2}}>Mié y Sáb · Info del evento + ánimo al equipo</div>
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--ac)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );
  return(
    <div style={{marginBottom:14,padding:'14px',borderRadius:14,border:'1px solid rgba(200,169,126,.28)',background:'rgba(200,169,126,.05)'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--ac)" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span style={{fontWeight:900,fontSize:13,color:'var(--tx)'}}>Mensaje al equipo</span>
        <button onClick={()=>setOpen(false)} style={{marginLeft:'auto',background:'none',border:'none',color:'var(--tx3)',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[['mie','Miércoles'],['sab','Sábado']].map(([t,l])=>(
          <button key={t} onClick={()=>setTipo(t)} style={{flex:1,padding:'8px',borderRadius:9,border:tipo===t?'1px solid rgba(200,169,126,.4)':'1px solid var(--bd)',background:tipo===t?'rgba(200,169,126,.08)':'var(--s1)',color:tipo===t?'var(--ac)':'var(--tx3)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
            {l}
          </button>
        ))}
      </div>
      {!custom&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>Vista previa del mensaje</div>
          <div style={{padding:'10px 12px',borderRadius:9,background:'var(--s1)',border:'1px solid var(--bd)',fontSize:11,color:'var(--tx)',lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:160,overflowY:'auto'}}>{msg}</div>
          <button onClick={()=>setCustom(true)} style={{marginTop:8,fontSize:11,color:'var(--ac)',fontWeight:700,background:'none',border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>Editar mensaje</button>
        </div>
      )}
      {custom&&(
        <div style={{marginBottom:10}}>
          <textarea className="inp" value={msg} onChange={e=>setMsg(e.target.value)} style={{minHeight:80,fontSize:12,lineHeight:1.6,resize:'vertical',marginBottom:6}}/>
          <button onClick={()=>{setCustom(false);setMsg(generarMensaje(activeSunday,sl,mesNombre,tipo));}} style={{fontSize:11,color:'var(--tx3)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>← Regenerar automático</button>
        </div>
      )}
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>setOpen(false)} className="btn btn-g btn-sm" style={{flex:1,justifyContent:'center'}}>Cancelar</button>
        <button onClick={()=>{onToast({text:'Mensaje enviado',sub:'Todo el equipo notificado'});setOpen(false);}} className="btn btn-p btn-sm" style={{flex:2,justifyContent:'center'}}>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar al equipo
        </button>
      </div>
    </div>
  );
}

function MiSetlist({activeSunday,onOpenSong,onLive,userRole,onToast}){
  const sl=SETLISTS[activeSunday]||[];
  const MESES_ES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNombre=MESES_ES[new Date().getMonth()];
  const ITINERARIO=[
    {hora:'08:30',label:'Llegada y preparación técnica'},
    {hora:'09:00',label:'Prueba de sonido'},
    {hora:'09:30',label:'Ensayo con el equipo'},
    {hora:'10:00',label:'Inicio del servicio'},
    {hora:'10:05',label:'Bloque de adoración (4 canciones)'},
    {hora:'10:30',label:'Mensaje'},
    {hora:'11:00',label:'Cierre y oración'},
  ];

  return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Dom <span style={{color:'var(--ac)'}}>{activeSunday} {mesNombre}</span></div>
            <div style={{fontSize:12,color:'var(--tx2)'}}>Tu setlist para este domingo. Repasa las canciones con tiempo.</div>
          </div>
          <button onClick={onLive} style={{flexShrink:0,padding:'9px 14px',borderRadius:12,border:'1px solid rgba(255,82,82,.35)',background:'rgba(255,82,82,.1)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'var(--rd)',animation:'rp 1.2s infinite'}}/>
              <span style={{fontSize:11,fontWeight:900,color:'var(--rd)',textTransform:'uppercase',letterSpacing:'.5px'}}>En Vivo</span>
            </div>
            <span style={{fontSize:8,color:'var(--tx3)',fontWeight:700}}>Interpretar</span>
          </button>
        </div>
        <div style={{display:'flex',gap:8,marginTop:10}}>
          <span style={{padding:'5px 12px',borderRadius:100,border:'1px solid rgba(94,206,160,.4)',background:'rgba(94,206,160,.1)',color:'var(--gn)',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:5}}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Publicado
          </span>
          
        </div>
      </div>
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:16,marginBottom:14,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Canciones</span>
          <span style={{padding:'2px 8px',borderRadius:100,border:'1px solid rgba(94,206,160,.4)',background:'rgba(94,206,160,.08)',color:'var(--gn)',fontSize:9,fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:'var(--gn)'}}/>Publicado
          </span>
        </div>
        {sl.length===0
          ?<div style={{textAlign:'center',padding:'24px',color:'var(--tx3)',fontSize:13}}>Sin setlist para este domingo</div>
          :sl.map((s,i)=>(
            <div key={i} onClick={()=>onOpenSong(i)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:i<sl.length-1?'1px solid rgba(255,255,255,.05)':'none',cursor:'pointer'}}>
              <span style={{fontSize:13,fontWeight:900,color:'var(--tx3)',minWidth:16,textAlign:'right'}}>{i+1}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:'var(--tx)'}}>{s.name}</div>
                <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>Guitarra · {s.key} · {s.bpm} BPM</div>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))
        }
      </div>
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:16,marginBottom:14,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Equipos convocados</span>
          <span style={{fontSize:10,fontWeight:700,color:'var(--tx3)'}}>{EQUIPOS_DATA.reduce((a,e)=>a+e.miembros.length,0)} personas</span>
        </div>
        {EQUIPOS_DATA.map(eq=>(
          <div key={eq.id} style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
            <div style={{padding:'8px 14px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
              <span style={{fontWeight:900,fontSize:12,color:'var(--tx)',flex:1}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{eq.miembros.length}</span>
            </div>
            <div style={{padding:'0 14px 8px',display:'flex',flexWrap:'wrap',gap:5}}>
              {eq.miembros.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:100,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)'}}>
                  <div style={{width:16,height:16,borderRadius:'50%',background:'linear-gradient(135deg,'+eq.color+'60,'+eq.color+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:6,fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                  <span style={{fontSize:10,fontWeight:700,color:'var(--tx)'}}>{m.name.split(' ')[0]}</span>
                  <span style={{fontSize:9,color:eq.color,fontWeight:700}}>{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {userRole==='superadmin'&&(
        <MiSetlistNotif onToast={onToast} activeSunday={activeSunday} sl={sl} mesNombre={mesNombre}/>
      )}
      <div style={{background:'var(--s1)',border:'1px solid var(--bd)',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)'}}>
          <span style={{fontSize:9,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'2px'}}>Itinerario del domingo</span>
        </div>
        {ITINERARIO.map((it,i)=>(
          <div key={i} style={{display:'flex',gap:12,padding:'10px 14px',borderBottom:i<ITINERARIO.length-1?'1px solid rgba(255,255,255,.04)':'none',alignItems:'flex-start'}}>
            <span style={{fontSize:11,fontWeight:900,color:'var(--ac)',minWidth:40,fontFamily:"'Source Code Pro',monospace"}}>{it.hora}</span>
            <span style={{fontSize:12,color:'var(--tx)',fontWeight:600,lineHeight:1.4}}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PREMIERE ─────────────────────────────────────────
const PREMIERES=[
  {id:1,name:'Toda La Tierra',album:'Toma Tu Lugar',sello:'Avanti Music',key:'G',bpm:128,dias:13,oficial:true,
   desc:'Un himno de adoración profética que invita a toda la creación a rendirse ante el Señor.'},
  {id:2,name:'Majestad',album:'Maverick City en Español',sello:'Maverick City Music',key:'D',bpm:72,dias:20,oficial:true,
   desc:'Nueva versión en español del clásico moderno sobre la majestad de Dios.'},
  {id:3,name:'Gloria Eterna',album:'',sello:'Red Music Latinoamérica',key:'A',bpm:118,dias:null,oficial:false,
   desc:'Próximamente. Red Music prepara este lanzamiento para sus iglesias asociadas.'},
];

function PremiereView({onToast}){
  const [sel,setSel]=useState(null);
  const top=PREMIERES[0];

  if(sel){
    const p=PREMIERES.find(x=>x.id===sel);
    return(
      <div style={{padding:'0 0 90px'}}>
        <div style={{padding:'16px',display:'flex',alignItems:'center',gap:10,marginBottom:4,cursor:'pointer'}} onClick={()=>setSel(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Premiere</span>
        </div>
        <div style={{margin:'0 16px',padding:'18px',borderRadius:16,background:'linear-gradient(135deg,rgba(200,169,126,.15),rgba(100,80,180,.1))',border:'1px solid rgba(200,169,126,.3)',marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:8}}>
            {p.oficial?'✓ Cifrado oficial':'Próximamente'}
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',marginBottom:4}}>{p.name}</div>
          <div style={{fontSize:13,color:'var(--tx2)',marginBottom:12}}>{p.album&&`${p.album} · `}{p.sello}</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
            <span style={{fontSize:11,fontWeight:700,color:'var(--ac)',background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.25)',padding:'4px 10px',borderRadius:100}}>{p.key}</span>
            <span style={{fontSize:11,fontWeight:700,color:'var(--tx2)',background:'var(--s1)',border:'1px solid var(--bd)',padding:'4px 10px',borderRadius:100}}>{p.bpm} BPM</span>
            {p.dias&&<span style={{fontSize:11,fontWeight:700,color:'var(--rd)',background:'rgba(255,82,82,.1)',border:'1px solid rgba(255,82,82,.28)',padding:'4px 10px',borderRadius:100}}>⚡ En {p.dias} días</span>}
          </div>
          <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.7}}>{p.desc}</div>
        </div>
        <div style={{padding:'0 8px',display:'flex',flexDirection:'column',gap:10}}>
          <button className="btn btn-p" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:'Agregado al setlist',sub:p.name})}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar al setlist
          </button>
          <button className="btn btn-g" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:'Te notificaremos',sub:`Al estreno de ${p.name}`})}>
            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Notificarme
          </button>
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:'0 0 90px'}}>
      <div style={{margin:'16px 16px 14px',borderRadius:18,overflow:'hidden',border:'1px solid rgba(200,169,126,.25)',position:'relative',cursor:'pointer'}} onClick={()=>setSel(top.id)}>
        <div style={{background:'linear-gradient(135deg,rgba(10,8,20,.95),rgba(30,20,60,.92))',padding:'22px 20px 20px'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
            <span style={{fontSize:14}}>★</span>
            <span style={{fontSize:9,fontWeight:900,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'2px'}}>Próximo estreno</span>
          </div>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:26,color:'var(--tx)',lineHeight:1.1,marginBottom:4}}>{top.name}</div>
          <div style={{fontSize:12,color:'var(--tx2)',marginBottom:14}}>{top.album} · {top.sello}</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:12,fontWeight:700,color:'var(--rd)',background:'rgba(255,82,82,.12)',border:'1px solid rgba(255,82,82,.3)',padding:'5px 12px',borderRadius:100}}>⚡ En {top.dias} días</span>
            <span style={{fontSize:11,color:'var(--tx3)',fontWeight:700,cursor:'pointer'}}>🏛 247 iglesias →</span>
          </div>
        </div>
      </div>
      <div style={{padding:'0 8px',display:'flex',flexDirection:'column',gap:8}}>
        {PREMIERES.map(p=>(
          <div key={p.id} onClick={()=>setSel(p.id)} style={{padding:'14px 16px',borderRadius:14,background:'var(--s1)',border:'1px solid var(--bd)',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15,color:'var(--tx)',marginBottom:2}}>{p.name}</div>
              <div style={{fontSize:11,color:'var(--tx3)'}}>{p.album||p.sello}</div>
              <div style={{fontSize:10,color:'var(--tx3)',marginTop:3}}>{p.key} · {p.bpm} BPM{p.oficial?' · ✓ Oficial':''}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
              {p.dias?<span style={{fontSize:11,fontWeight:700,color:'var(--rd)'}}>{p.dias}d</span>:<span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>PRÓX.</span>}
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        ))}
      </div>

      <div style={{padding:'16px',marginTop:8,borderTop:'1px solid var(--bd)'}}>
        <div style={{fontSize:11,color:'var(--tx3)',textAlign:'center',lineHeight:1.7}}>¿Representas un sello o artista?<br/>
          <span style={{color:'var(--ac)',fontWeight:700,cursor:'pointer'}} onClick={()=>onToast({text:'Próximamente',sub:'Contacto con sellos'})}>Publica aquí tus estrenos →</span>
        </div>
      </div>
    </div>
  );
}

// ─── ITINERARIO EDITOR ────────────────────────────────
const ITINERARIO_DEFAULT=[
  {hora:'08:30',label:'Llegada y preparación'},
  {hora:'09:00',label:'Prueba de sonido'},
  {hora:'09:30',label:'Ensayo con el equipo'},
  {hora:'10:00',label:'Inicio del servicio'},
  {hora:'10:05',label:'Adoración'},
  {hora:'10:30',label:'Mensaje'},
  {hora:'11:00',label:'Cierre y oración'},
];
function ItinerarioEditor(){
  const [items,setItems]=useState(ITINERARIO_DEFAULT);
  const [edit,setEdit]=useState(false);
  const update=(i,field,val)=>setItems(prev=>prev.map((it,j)=>j===i?{...it,[field]:val}:it));
  const addItem=()=>setItems(prev=>[...prev,{hora:'',label:''}]);
  const removeItem=i=>setItems(prev=>prev.filter((_,j)=>j!==i));

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <span style={{fontSize:10,fontWeight:700,color:'var(--tx3)'}}>Horarios del evento</span>
        <button onClick={()=>setEdit(v=>!v)} style={{fontSize:11,fontWeight:700,color:edit?'var(--ac)':'var(--tx3)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
          {edit?'Listo':'Editar'}
        </button>
      </div>
      {items.map((it,i)=>(
        <div key={i} style={{display:'flex',gap:8,alignItems:'center',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
          {edit
            ?<input value={it.hora} onChange={e=>update(i,'hora',e.target.value)} style={{fontFamily:"'Source Code Pro',monospace",fontSize:11,color:'var(--ac)',background:'rgba(200,169,126,.08)',border:'1px solid rgba(200,169,126,.2)',borderRadius:5,padding:'2px 6px',width:52,outline:'none'}}/>
            :<span style={{fontFamily:"'Source Code Pro',monospace",fontSize:11,color:'var(--ac)',minWidth:52,flexShrink:0}}>{it.hora}</span>
          }
          {edit
            ?<input value={it.label} onChange={e=>update(i,'label',e.target.value)} style={{flex:1,fontSize:11,color:'var(--tx)',background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:5,padding:'2px 8px',outline:'none',fontFamily:"'Lato',sans-serif"}}/>
            :<span style={{flex:1,fontSize:11,color:'var(--tx)'}}>{it.label}</span>
          }
          {edit&&<button onClick={()=>removeItem(i)} style={{background:'none',border:'none',color:'var(--rd)',cursor:'pointer',fontSize:15,lineHeight:1,flexShrink:0}}>×</button>}
        </div>
      ))}
      {edit&&(
        <button onClick={addItem} style={{marginTop:8,fontSize:11,fontWeight:700,color:'var(--ac)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif",display:'flex',alignItems:'center',gap:4}}>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Agregar ítem
        </button>
      )}
    </div>
  );
}

// ─── BACKSTAGE COMPLETO ────────────────────────────────
function PastorView({pastorData,setPastorData,eventos,onToast,onBack}){
  const [selEv,setSelEv]=useState('');
  const [versiculo,setVersiculo]=useState('');
  const [referencia,setReferencia]=useState('');
  const [comentario,setComentario]=useState('');
  const [pptName,setPptName]=useState('');
  const [saved,setSaved]=useState(false);
  const [notifDest,setNotifDest]=useState([]);
  const [notifMsg,setNotifMsg]=useState('');

  // Cargar datos del evento seleccionado
  React.useEffect(()=>{
    if(!selEv)return;
    const d=pastorData[selEv]||{};
    setVersiculo(d.versiculo||'');
    setReferencia(d.referencia||'');
    setComentario(d.comentario||'');
    setPptName(d.pptName||'');
    setSaved(false);
  },[selEv]);

  const handleSave=()=>{
    if(!selEv){onToast('Selecciona un evento primero');return;}
    setPastorData(prev=>({
      ...prev,
      [selEv]:{versiculo,referencia,comentario,pptName}
    }));
    setSaved(true);
    onToast('✓ Palabra del Pastor guardada');
  };

  const handlePPT=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    setPptName(file.name);
    onToast(`📎 ${file.name} listo para compartir`);
  };

  const FONT="'Lato',sans-serif";
  const domingos=eventos.filter(ev=>ev.tipo==='domingo'||ev.tipo==='especial'||!ev.tipo);

  return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}} onClick={onBack}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)',fontFamily:FONT}}>Backstage</span>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <span style={{fontSize:20}}>✝</span>
        <div>
          <div style={{fontSize:16,fontWeight:900,color:'var(--tx)',fontFamily:FONT}}>Palabra del Pastor</div>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT}}>Versículo y dirección para el equipo</div>
        </div>
      </div>

      <div style={{height:1,background:'var(--bd)',margin:'14px 0'}}/>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
          Evento
        </div>
        <select
          value={selEv}
          onChange={e=>setSelEv(e.target.value)}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',fontSize:13,fontFamily:FONT,fontWeight:700}}>
          <option value="">— Selecciona el domingo o evento —</option>
          {domingos.map((ev,i)=>(
            <option key={i} value={ev.id||i}>{ev.nombre||`Domingo ${ev.fecha||''}`}</option>
          ))}
          {domingos.length===0&&[7,14,21,28].map(d=>(
            <option key={d} value={`dom-${d}`}>Domingo {d} Junio</option>
          ))}
        </select>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
          Versículo central
        </div>
        <textarea
          value={versiculo}
          onChange={e=>{setVersiculo(e.target.value);setSaved(false);}}
          placeholder="Escribe el versículo aquí..."
          rows={3}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',fontSize:14,fontFamily:FONT,
            resize:'none',boxSizing:'border-box',lineHeight:1.5}}
        />
        <input
          value={referencia}
          onChange={e=>{setReferencia(e.target.value);setSaved(false);}}
          placeholder="Referencia (ej: Juan 3:16)"
          style={{width:'100%',padding:'8px 12px',borderRadius:10,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',fontSize:13,fontFamily:FONT,
            marginTop:6,boxSizing:'border-box'}}
        />
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
          Dirección para el equipo
        </div>
        <textarea
          value={comentario}
          onChange={e=>{setComentario(e.target.value);setSaved(false);}}
          placeholder="Mensaje al líder de alabanza, tema de la semana, énfasis pastoral..."
          rows={4}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',fontSize:13,fontFamily:FONT,
            resize:'none',boxSizing:'border-box',lineHeight:1.5}}
        />
      </div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
          Presentación (PPT)
        </div>
        <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
          borderRadius:10,border:'1px dashed var(--bd)',background:'var(--s2)',cursor:'pointer'}}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--ac)',fontFamily:FONT}}>
              {pptName||'Subir presentación'}
            </div>
            <div style={{fontSize:10,color:'var(--tx3)',fontFamily:FONT}}>
              {pptName?'Toca para cambiar':'PPT, PPTX, PDF'}
            </div>
          </div>
          <input type="file" accept=".ppt,.pptx,.pdf" onChange={handlePPT} style={{display:'none'}}/>
        </label>
        {pptName&&(
          <div style={{marginTop:8,padding:'8px 12px',borderRadius:8,background:'rgba(94,206,160,.08)',
            border:'1px solid rgba(94,206,160,.2)',display:'flex',alignItems:'center',gap:8}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--gn)" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{fontSize:12,color:'var(--gn)',fontFamily:FONT,fontWeight:700}}>{pptName}</span>
            <span style={{fontSize:10,color:'var(--tx3)',fontFamily:FONT,marginLeft:'auto'}}>Listo para equipo</span>
          </div>
        )}
      </div>
      <button
        onClick={handleSave}
        style={{width:'100%',padding:'12px',borderRadius:12,border:'none',
          background:saved?'rgba(94,206,160,.15)':'var(--ac)',
          color:saved?'var(--gn)':'#fff',
          fontSize:14,fontWeight:900,fontFamily:FONT,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        {saved?(
          <><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Guardado</>
        ):(
          <><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Publicar para el equipo</>
        )}
      </button>
      <div style={{marginBottom:14}}>
        <div style={{height:1,background:'var(--bd)',margin:'16px 0 14px'}}/>
        <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,
          textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
          📢 Enviar mensaje al equipo
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
          {['Todo el equipo','Solo líderes','Banda','Proyecciones','Sonido'].map(dest=>(
            <button
              key={dest}
              onClick={()=>setNotifDest(prev=>prev.includes(dest)?prev.filter(d=>d!==dest):[...prev,dest])}
              style={{
                padding:'5px 10px',borderRadius:20,fontSize:11,fontWeight:700,
                fontFamily:FONT,cursor:'pointer',border:'1px solid',
                background:notifDest.includes(dest)?'var(--ac)':'transparent',
                color:notifDest.includes(dest)?'#fff':'var(--tx3)',
                borderColor:notifDest.includes(dest)?'var(--ac)':'var(--bd)',
              }}>
              {dest}
            </button>
          ))}
        </div>
        <textarea
          value={notifMsg}
          onChange={e=>setNotifMsg(e.target.value)}
          placeholder="Ej: '¡Buenos días equipo! El domingo predicaré sobre la gracia. Busquemos canciones que hablen de gracia y misericordia 🙌'"
          rows={3}
          style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
            background:'var(--s1)',color:'var(--tx)',fontSize:13,fontFamily:FONT,
            resize:'none',boxSizing:'border-box',lineHeight:1.5,marginBottom:8}}
        />
        <button
          onClick={()=>{
            if(!notifMsg.trim()){onToast('Escribe un mensaje primero');return;}
            if(!notifDest.length){onToast('Selecciona a quién enviar');return;}
            onToast(`✓ Mensaje enviado a: ${notifDest.join(', ')}`);
            setNotifMsg('');
            setNotifDest([]);
          }}
          style={{width:'100%',padding:'10px',borderRadius:10,border:'none',
            background:'rgba(123,104,238,.15)',color:'#7b68ee',
            fontSize:13,fontWeight:800,fontFamily:FONT,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:6,
            border:'1px solid rgba(123,104,238,.3)'}}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          Enviar mensaje
        </button>
      </div>
      {(versiculo||comentario)&&(
        <div style={{marginTop:20,padding:'14px',borderRadius:12,
          background:'var(--s1)',border:'1px solid var(--bd)'}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',fontFamily:FONT,
            textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
            Vista previa — lo que verá el líder
          </div>
          {versiculo&&(
            <div style={{marginBottom:8}}>
              <div style={{fontSize:14,fontStyle:'italic',color:'var(--tx)',fontFamily:FONT,lineHeight:1.5}}>
                "{versiculo}"
              </div>
              {referencia&&(
                <div style={{fontSize:12,color:'var(--ac)',fontFamily:FONT,fontWeight:700,marginTop:4}}>
                  — {referencia}
                </div>
              )}
            </div>
          )}
          {comentario&&(
            <div style={{fontSize:12,color:'var(--tx2)',fontFamily:FONT,lineHeight:1.5,
              borderTop:versiculo?'1px solid var(--bd)':'none',paddingTop:versiculo?8:0}}>
              {comentario}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// MODO BANDA — Independiente del modo Iglesia
// Mismo diseño/fonts que Iglesia. Menú abajo. CSS vars compartidas.

const ROLES_MUSICOS=[
  {id:'encargado',     label:'Encargado'},
  {id:'guitarrista_e', label:'Guitarra Eléctrica'},
  {id:'guitarrista_a', label:'Guitarra Acústica'},
  {id:'bajista',       label:'Bajista'},
  {id:'baterista',     label:'Batería'},
  {id:'dj',            label:'DJ'},
  {id:'corista1',      label:'Corista 1'},
  {id:'corista2',      label:'Corista 2'},
  {id:'teclado',       label:'Tecladista'},
];
const EQUIPOS_TRABAJO=[
  {id:'roadies',     label:'Roadies'},
  {id:'produccion',  label:'Producción'},
  {id:'sonido',      label:'Sonido'},
  {id:'visuales',    label:'Visuales'},
  {id:'catering',    label:'Catering'},
  {id:'movilizacion',label:'Movilización'},
];
const ALL_ROLES_BANDA=[...ROLES_MUSICOS,...EQUIPOS_TRABAJO];

function BandaApp({onBack,userRole='superadmin',css='',themeStyle={}}){
  const [view,setView]=useState('equipo');
  const [toast,setToast]=useState(null);
  const [songViewBanda,setSongViewBanda]=useState(null);
  const isEncargado=userRole==='encargado'||userRole==='superadmin';

  const showToast=(msg)=>{setToast(typeof msg==='string'?{text:msg}:msg);setTimeout(()=>setToast(null),2500);};

  const getRol=(rolId)=>ALL_ROLES_BANDA.find(r=>r.id===rolId)||{label:rolId};

  // ── Estado global ─────────────────────────────────────────────────────────
  const [members,setMembers]=useState([
    {id:1,nombre:'Carlos',   rol:'baterista'},
    {id:2,nombre:'Valentina',rol:'guitarrista_e'},
    {id:3,nombre:'Diego',    rol:'bajista'},
    {id:4,nombre:'Sofía',    rol:'corista1'},
    {id:5,nombre:'Matías',   rol:'corista2'},
    {id:6,nombre:'Renata',   rol:'dj'},
    {id:7,nombre:'Pedro',    rol:'sonido'},
    {id:8,nombre:'Ana',      rol:'visuales'},
    {id:9,nombre:'Luis',     rol:'roadies'},
    {id:10,nombre:'Marco',   rol:'roadies'},
  ]);

  const [gigs,setGigs]=useState([
    {id:1,nombre:'Concierto Verano',   fecha:'2026-07-12',lugar:'Teatro Municipal', ciudad:'Santiago',   tipo:'concierto',
     equipos:['sonido','visuales','roadies'],
     setlist:['NOCHE SIN FIN','FUEGO CRUZADO','TIERRA ROJA'],
     ensayos:[{fecha:'2026-07-05',lugar:'Sala de ensayo',duracion:'3h'}],
     notas:'Llevar backline completo. Soundcheck a las 17:00.',
     notifs:['Equipo completo convocado','Rider enviado al venue']},
    {id:2,nombre:'Ensayo General',     fecha:'2026-07-05',lugar:'Sala de ensayo', ciudad:'Santiago',   tipo:'ensayo',
     equipos:['sonido'],
     setlist:['NOCHE SIN FIN','MAR ADENTRO','CIUDAD DE VIDRIO'],
     ensayos:[],
     notas:'Ensayo de 3 horas. Llevar todo el material.',
     notifs:[]},
    {id:3,nombre:'Festival Música Viva',fecha:'2026-08-02',lugar:'Parque Central',ciudad:'Valparaíso',tipo:'festival',
     equipos:['sonido','visuales','roadies','catering','movilizacion'],
     setlist:['FUEGO CRUZADO','CIUDAD DE VIDRIO','MAR ADENTRO','TIERRA ROJA','NOCHE SIN FIN'],
     ensayos:[{fecha:'2026-07-26',lugar:'Sala de ensayo',duracion:'4h'}],
     notas:'Festival con 3 bandas. Slot de 45 minutos. Compartir backline.',
     notifs:['Confirmado 35 min de set','Rider aprobado']},
  ]);

  const [repertorio,setRepertorio]=useState([
    {n:'NOCHE SIN FIN',    key:'Am',bpm:74,artista:'Los Viajeros del Viento',tipo:'original'},
    {n:'FUEGO CRUZADO',    key:'Em',bpm:92,artista:'Tormenta Eléctrica',     tipo:'original'},
    {n:'MAR ADENTRO',      key:'D', bpm:68,artista:'Coral y Sal',            tipo:'original'},
    {n:'CIUDAD DE VIDRIO', key:'Dm',bpm:80,artista:'Proyecto Espejo',        tipo:'original'},
    {n:'TIERRA ROJA',      key:'G', bpm:76,artista:'Los Hijos del Norte',    tipo:'original'},
  ]);

  const TABS=[
    {id:'equipo',     label:'Equipo'},
    {id:'fechas',     label:'Fechas'},
    {id:'repertorio', label:'Repertorio'},
    {id:'backstage',  label:'Backstage'},
  ];

  const NavIcoBanda=({id,active})=>{
    const s={viewBox:'0 0 24 24',width:20,height:20,fill:'none',
      stroke:active?'var(--ac)':'var(--tx3)',strokeWidth:1.5,
      strokeLinecap:'round',strokeLinejoin:'round'};
    if(id==='equipo')    return(<svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    if(id==='fechas')    return(<svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    if(id==='repertorio')return(<svg {...s}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>);
    if(id==='backstage') return(<svg {...s}><line x1="5" y1="3" x2="5" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><rect x="3" y="7" width="4" height="3.5" rx="1.5"/><rect x="10" y="13" width="4" height="3.5" rx="1.5"/><rect x="17" y="5" width="4" height="3.5" rx="1.5"/></svg>);
    return null;
  };

  return(
    <div style={{...themeStyle,minHeight:'100vh',position:'relative'}}>
      <style>{css}</style>
      <div style={{
        position:'sticky',top:0,zIndex:40,
        background:'rgba(var(--bg-rgb,5,5,13),.92)',
        backdropFilter:'blur(26px)',
        borderBottom:'1px solid var(--bd)',
        display:'flex',alignItems:'center',gap:10,
        padding:'10px 12px',
      }}>
        <button onClick={onBack} style={{
          background:'transparent',border:'none',cursor:'pointer',
          color:'var(--tx3)',padding:4,display:'flex',alignItems:'center',
          borderRadius:8,
        }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
            stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{flex:1}}>
          <h1 style={{margin:0,fontSize:16,fontWeight:900,
            fontFamily:"'Lato',sans-serif",color:'var(--tx)',lineHeight:1}}>
            Mi Banda
          </h1>
          <span style={{fontSize:9,fontWeight:700,color:'var(--ac)',
            textTransform:'uppercase',letterSpacing:'2px'}}>
            Modo Banda
          </span>
        </div>
      </div>
      {view==='fechas'&&(
        <div style={{
          position:'sticky',top:49,zIndex:39,
          background:'rgba(8,7,14,.9)',backdropFilter:'blur(18px)',
          borderBottom:'1px solid var(--bd)',
          display:'flex',overflowX:'auto',scrollbarWidth:'none',
          padding:'4px 8px',gap:4,
        }}>
          {['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'].map((m,i)=>{
            const hasGig=gigs.some(g=>new Date(g.fecha).getMonth()===i);
            const isNow=new Date().getMonth()===i;
            return(
              <button key={m} style={{
                flexShrink:0,padding:'4px 8px',borderRadius:6,border:'none',
                background:isNow?'rgba(200,169,126,.15)':'transparent',
                color:hasGig?'var(--ac)':isNow?'var(--tx2)':'var(--tx3)',
                fontSize:9,fontWeight:900,cursor:'pointer',
                letterSpacing:'.8px',fontFamily:"'Lato',sans-serif",
                position:'relative',
              }}>
                {m}
                {hasGig&&<span style={{
                  position:'absolute',bottom:2,left:'50%',
                  transform:'translateX(-50%)',
                  width:3,height:3,borderRadius:'50%',
                  background:'var(--ac)',display:'block',
                }}/>}
              </button>
            );
          })}
        </div>
      )}
      <div style={{padding:'10px 8px 90px'}}>
        {view==='equipo'&&(
          <div>
            <div className="ph" style={{marginBottom:16}}>
              <h2 style={{margin:0,fontSize:20,fontWeight:900,color:'var(--tx)',
                fontFamily:"'Lato',sans-serif"}}>Equipo</h2>
              <span style={{fontSize:11,color:'var(--tx3)'}}>
                {members.filter(m=>ROLES_MUSICOS.find(r=>r.id===m.rol)).length} músicos ·{' '}
                {members.filter(m=>EQUIPOS_TRABAJO.find(r=>r.id===m.rol)).length} técnicos
              </span>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',
              textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
              Músicos
            </div>
            {members.filter(m=>ROLES_MUSICOS.find(r=>r.id===m.rol)).map(m=>(
              <div key={m.id} style={{
                display:'flex',alignItems:'center',gap:12,
                padding:'10px 12px',borderRadius:12,
                border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:8,
              }}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800,color:'var(--tx)'}}>{m.nombre}</div>
                  <div style={{fontSize:11,color:'var(--tx2)',marginTop:1}}>{getRol(m.rol).label}</div>
                </div>
                {m.rol==='encargado'&&(
                  <span style={{fontSize:9,padding:'2px 7px',borderRadius:10,
                    background:'rgba(200,169,126,.12)',color:'var(--ac)',
                    border:'1px solid rgba(200,169,126,.25)',fontWeight:700}}>
                    ENCARGADO
                  </span>
                )}
              </div>
            ))}
            <div style={{height:1,background:'var(--bd)',margin:'18px 0 12px'}}/>
            <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',
              textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
              Equipos de trabajo
            </div>
            {EQUIPOS_TRABAJO.map(eq=>{
              const crew=members.filter(m=>m.rol===eq.id);
              return(
                <div key={eq.id} style={{
                  display:'flex',alignItems:'center',gap:12,
                  padding:'10px 12px',borderRadius:12,
                  border:'1px solid var(--bd)',background:'var(--s1)',marginBottom:8,
                }}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:800,color:'var(--tx)'}}>{eq.label}</div>
                    <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>
                      {crew.length>0?crew.map(c=>c.nombre).join(', '):'Sin asignar'}
                    </div>
                  </div>
                  <div style={{
                    width:24,height:24,borderRadius:12,
                    background:crew.length>0?'rgba(200,169,126,.1)':'var(--s2)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:12,fontWeight:800,
                    color:crew.length>0?'var(--ac)':'var(--tx3)',
                  }}>{crew.length}</div>
                </div>
              );
            })}
          </div>
        )}
        {view==='fechas'&&(
          <BandaFechas
            gigs={gigs} setGigs={setGigs}
            members={members} repertorio={repertorio}
            isEncargado={isEncargado} onToast={showToast}
          />
        )}
        {view==='repertorio'&&(
          <BandaRepertorio
            repertorio={repertorio} setRepertorio={setRepertorio}
            gigs={gigs} isEncargado={isEncargado} onToast={showToast}
            onOpenSong={(song)=>setSongViewBanda(song)}
          />
        )}
        {view==='backstage'&&(
          <BandaBackstage
            members={members} setMembers={setMembers}
            gigs={gigs} setGigs={setGigs}
            repertorio={repertorio}
            isEncargado={isEncargado} onToast={showToast}
            getRol={getRol}
          />
        )}
      </div>
      <nav style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'rgba(5,5,13,.92)',backdropFilter:'blur(26px)',
        borderTop:'1px solid var(--bd)',zIndex:20,
        padding:'7px 0 11px',display:'flex',
        justifyContent:'space-around',
      }}>
        {TABS.map(t=>(
          <div key={t.id}
            className={`bn${view===t.id?' on':''}`}
            onClick={()=>setView(t.id)}>
            <NavIcoBanda id={t.id} active={view===t.id}/>
            <span className="bn-lb">{t.label}</span>
          </div>
        ))}
      </nav>
      {songViewBanda&&(
        <div style={{position:'fixed',inset:0,zIndex:100}}>
          <SongView
            songs={[{name:songViewBanda.n,key:songViewBanda.key,
              bpm:songViewBanda.bpm,instrument:'GUITARRA',
              content:SONG_CONTENT_BANDA[songViewBanda.n]||null}]}
            startIdx={0}
            onClose={()=>setSongViewBanda(null)}
            theme="dark"
          />
        </div>
      )}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}

// ── FECHAS — con detalle completo de cada gig ─────────────────────────────
function BandaFechas({gigs,setGigs,members,repertorio,isEncargado,onToast}){
  const [selGig,setSelGig]=useState(null);
  const [mesActivo,setMesActivo]=useState(new Date().getMonth());
  const getRol=(rolId)=>ALL_ROLES_BANDA.find(r=>r.id===rolId)||{label:rolId};

  const gigsPorMes=gigs.filter(g=>new Date(g.fecha).getMonth()===mesActivo||
    gigs.length<4 // si hay pocos, mostrar todos
  ).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));

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
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx3)'}}>Fechas</span>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <h2 style={{margin:0,fontSize:18,fontWeight:900,color:'var(--tx)',
              fontFamily:"'Lato',sans-serif"}}>{g.nombre}</h2>
            <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,
              background:`rgba(0,0,0,.3)`,color:tipoColor,
              border:`1px solid ${tipoColor}44`,textTransform:'uppercase'}}>
              {g.tipo}
            </span>
          </div>
          <div style={{fontSize:13,color:'var(--tx2)'}}>
            {d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </div>
          <div style={{fontSize:12,color:'var(--tx3)',marginTop:2}}>
            {g.lugar} · {g.ciudad}
          </div>
        </div>
        <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
          background:'var(--s1)',marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
            letterSpacing:'1px',marginBottom:10}}>Equipos convocados</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {(g.equipos||[]).map(eq=>(
              <span key={eq} style={{fontSize:11,fontWeight:700,padding:'4px 10px',
                borderRadius:16,background:'rgba(200,169,126,.1)',
                color:'var(--ac)',border:'1px solid rgba(200,169,126,.2)'}}>
                {getRol(eq).label||eq}
              </span>
            ))}
            {(!g.equipos||g.equipos.length===0)&&(
              <span style={{fontSize:11,color:'var(--tx3)'}}>Sin definir</span>
            )}
          </div>
        </div>
        <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
          background:'var(--s1)',marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
            letterSpacing:'1px',marginBottom:10}}>Personas convocadas</div>
          {personasConvocadas.map(p=>(
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',
              alignItems:'center',padding:'6px 0',
              borderBottom:'1px solid var(--bd)'}}>
              <span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{p.nombre}</span>
              <span style={{fontSize:11,color:'var(--tx2)'}}>{getRol(p.rol).label}</span>
            </div>
          ))}
        </div>
        {g.setlist&&g.setlist.length>0&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
              letterSpacing:'1px',marginBottom:10}}>Setlist</div>
            {g.setlist.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,
                padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                <span style={{fontSize:12,fontWeight:700,color:'var(--tx3)',
                  width:20,textAlign:'right'}}>{i+1}</span>
                <span style={{fontSize:13,fontWeight:700,color:'var(--tx)',flex:1}}>{s}</span>
              </div>
            ))}
          </div>
        )}
        {g.ensayos&&g.ensayos.length>0&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
              letterSpacing:'1px',marginBottom:10}}>Ensayos previos</div>
            {g.ensayos.map((e,i)=>{
              const ed=new Date(e.fecha);
              return(
                <div key={i} style={{display:'flex',justifyContent:'space-between',
                  alignItems:'center',padding:'6px 0',
                  borderBottom:'1px solid var(--bd)'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{e.lugar}</div>
                    <div style={{fontSize:11,color:'var(--tx3)'}}>
                      {ed.toLocaleDateString('es-CL',{day:'numeric',month:'short'})} · {e.duracion}
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
            <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
              letterSpacing:'1px',marginBottom:10}}>Notificaciones</div>
            {g.notifs.map((n,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,
                padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
                  stroke="var(--gn)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{fontSize:12,color:'var(--tx)'}}>{n}</span>
              </div>
            ))}
          </div>
        )}
        {g.notas&&(
          <div style={{padding:'12px',borderRadius:12,border:'1px solid var(--bd)',
            background:'var(--s1)',marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
              letterSpacing:'1px',marginBottom:8}}>Notas</div>
            <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.5}}>{g.notas}</div>
          </div>
        )}
      </div>
    );
  }

  // ── Lista de gigs ────────────────────────────────────────────────────────
  return(
    <div>
      <div className="ph" style={{marginBottom:16}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:900,color:'var(--tx)',
          fontFamily:"'Lato',sans-serif"}}>Fechas</h2>
        {isEncargado&&(
          <button onClick={()=>onToast('Crear evento — próximamente')}
            style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--bd)',
              background:'transparent',color:'var(--ac)',fontSize:12,
              fontWeight:700,cursor:'pointer'}}>
            + Nuevo
          </button>
        )}
      </div>

      {gigs.length===0?(
        <div style={{textAlign:'center',padding:'40px 0',color:'var(--tx3)',fontSize:13}}>
          Sin eventos programados
        </div>
      ):gigs.map(g=>{
        const d=new Date(g.fecha);
        const tipoColor={concierto:'var(--ac)',ensayo:'var(--tx3)',festival:'var(--gn)'}[g.tipo]||'var(--ac)';
        return(
          <div key={g.id} onClick={()=>setSelGig(g.id)}
            style={{display:'flex',gap:12,padding:'12px',
              borderRadius:14,border:'1px solid var(--bd)',
              background:'var(--s1)',marginBottom:10,cursor:'pointer'}}>
            <div style={{width:46,flexShrink:0,textAlign:'center',
              borderRight:'1px solid var(--bd)',paddingRight:12}}>
              <div style={{fontSize:22,fontWeight:900,color:'var(--tx)',lineHeight:1}}>
                {d.getDate()}
              </div>
              <div style={{fontSize:9,color:'var(--tx3)',fontWeight:700,letterSpacing:'.5px'}}>
                {['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][d.getDay()]}
              </div>
              <div style={{fontSize:9,color:'var(--tx3)'}}>
                {['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][d.getMonth()]}
              </div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {g.nombre}
              </div>
              <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>
                {g.lugar} · {g.ciudad}
              </div>
              <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10,
                  background:`${tipoColor}18`,color:tipoColor,
                  border:`1px solid ${tipoColor}33`}}>
                  {g.tipo.toUpperCase()}
                </span>
                {g.setlist&&g.setlist.length>0&&(
                  <span style={{fontSize:10,color:'var(--tx3)',
                    padding:'2px 7px',borderRadius:10,
                    border:'1px solid var(--bd)'}}>
                    {g.setlist.length} canciones
                  </span>
                )}
                {g.ensayos&&g.ensayos.length>0&&(
                  <span style={{fontSize:10,color:'var(--tx3)',
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

// ── REPERTORIO ────────────────────────────────────────────────────────────
function BandaRepertorio({repertorio,setRepertorio,gigs,isEncargado,onToast,onOpenSong}){
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

function BandaCrearEnsayo({gigs,repertorio,members,onSave,onToast}){
  const FONT="'Lato',sans-serif";
  const [fecha,setFecha]=useState('');
  const [hora,setHora]=useState('');
  const [lugar,setLugar]=useState('');
  const [direccion,setDireccion]=useState('');
  const [eventoId,setEventoId]=useState('');
  const [duracion,setDuracion]=useState('2h');
  const [equiposConv,setEquiposConv]=useState([]);
  const [setlistSel,setSetlistSel]=useState([]);
  const [itinerario,setItinerario]=useState([
    {id:1,hora:'',accion:'Llegada y montaje'},
    {id:2,hora:'',accion:'Soundcheck'},
    {id:3,hora:'',accion:'Ensayo general'},
    {id:4,hora:'',accion:'Cierre'},
  ]);
  const [notas,setNotas]=useState('');

  const ALL_ROLES=[...ROLES_MUSICOS,...EQUIPOS_TRABAJO];
  const getRol=(id)=>ALL_ROLES.find(r=>r.id===id)||{label:id};

  const toggleEquipo=(rolId)=>setEquiposConv(prev=>
    prev.includes(rolId)?prev.filter(x=>x!==rolId):[...prev,rolId]
  );
  const toggleCancion=(n)=>setSetlistSel(prev=>
    prev.includes(n)?prev.filter(x=>x!==n):[...prev,n]
  );

  const addItinerario=()=>setItinerario(prev=>[...prev,{id:Date.now(),hora:'',accion:''}]);
  const updItinerario=(id,field,val)=>setItinerario(prev=>
    prev.map(i=>i.id===id?{...i,[field]:val}:i)
  );
  const delItinerario=(id)=>setItinerario(prev=>prev.filter(i=>i.id!==id));

  const handleSave=()=>{
    if(!fecha){onToast('Selecciona una fecha');return;}
    if(!lugar.trim()){onToast('Ingresa el lugar');return;}
    onSave({
      fecha,hora,lugar,direccion,eventoId,duracion,
      equipos:equiposConv,setlist:setlistSel,
      itinerario:itinerario.filter(i=>i.accion.trim()),
      notas,
    });
  };

  const SEP=({label})=>(
    <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
      letterSpacing:'1.5px',marginTop:20,marginBottom:10,fontFamily:FONT}}>
      {label}
    </div>
  );

  return(
    <div>
      <div style={{fontSize:20,fontWeight:900,color:'var(--tx)',fontFamily:FONT,marginBottom:4}}>
        Crear Ensayo
      </div>
      <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT,marginBottom:18,lineHeight:1.4}}>
        Programa un ensayo, convoca equipos y conéctalo con un evento.
      </div>
      <SEP label="Fecha y hora"/>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <div style={{flex:2}}>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT,marginBottom:4}}>Fecha</div>
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,
              border:'1px solid var(--bd)',background:'var(--s1)',
              color:'var(--tx)',fontSize:13,fontFamily:FONT,boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT,marginBottom:4}}>Hora</div>
          <input type="time" value={hora} onChange={e=>setHora(e.target.value)}
            style={{width:'100%',padding:'9px 8px',borderRadius:10,
              border:'1px solid var(--bd)',background:'var(--s1)',
              color:'var(--tx)',fontSize:13,boxSizing:'border-box'}}/>
        </div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <div style={{flex:2}}>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:FONT,marginBottom:4}}>Duración</div>
          <select value={duracion} onChange={e=>setDuracion(e.target.value)}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,
              border:'1px solid var(--bd)',background:'var(--s1)',
              color:'var(--tx)',fontSize:13,fontFamily:FONT}}>
            {['1h','1.5h','2h','2.5h','3h','4h','5h'].map(d=>(
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>
      <SEP label="Ubicación"/>
      <input value={lugar} onChange={e=>setLugar(e.target.value)}
        placeholder="Sala de ensayo, estudio..."
        style={{width:'100%',padding:'9px 12px',borderRadius:10,
          border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,fontFamily:FONT,
          marginBottom:8,boxSizing:'border-box'}}/>
      <input value={direccion} onChange={e=>setDireccion(e.target.value)}
        placeholder="Dirección completa (opcional)"
        style={{width:'100%',padding:'9px 12px',borderRadius:10,
          border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,fontFamily:FONT,
          boxSizing:'border-box'}}/>
      <SEP label="Conectar con evento"/>
      <select value={eventoId} onChange={e=>setEventoId(e.target.value)}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,
          border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,fontFamily:FONT}}>
        <option value="">— Sin evento asignado —</option>
        {gigs.filter(g=>g.tipo!=='ensayo').map(g=>(
          <option key={g.id} value={g.id}>{g.nombre} · {g.ciudad}</option>
        ))}
      </select>
      <SEP label="Equipos convocados"/>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:4}}>
        {ROLES_MUSICOS.map(r=>(
          <button key={r.id} onClick={()=>toggleEquipo(r.id)}
            style={{padding:'5px 10px',borderRadius:16,fontSize:11,fontWeight:700,
              fontFamily:FONT,cursor:'pointer',
              border:`1px solid ${equiposConv.includes(r.id)?'var(--ac)':'var(--bd)'}`,
              background:equiposConv.includes(r.id)?'rgba(200,169,126,.12)':'transparent',
              color:equiposConv.includes(r.id)?'var(--ac)':'var(--tx3)'}}>
            {r.label}
          </button>
        ))}
      </div>
      <div style={{height:1,background:'var(--bd)',margin:'8px 0'}}/>
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {EQUIPOS_TRABAJO.map(r=>(
          <button key={r.id} onClick={()=>toggleEquipo(r.id)}
            style={{padding:'5px 10px',borderRadius:16,fontSize:11,fontWeight:700,
              fontFamily:FONT,cursor:'pointer',
              border:`1px solid ${equiposConv.includes(r.id)?'var(--ac)':'var(--bd)'}`,
              background:equiposConv.includes(r.id)?'rgba(200,169,126,.12)':'transparent',
              color:equiposConv.includes(r.id)?'var(--ac)':'var(--tx3)'}}>
            {r.label}
          </button>
        ))}
      </div>
      <SEP label="Setlist a ensayar"/>
      {repertorio.map((c,i)=>{
        const sel=setlistSel.includes(c.n);
        return(
          <div key={i} onClick={()=>toggleCancion(c.n)}
            style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',
              borderRadius:10,marginBottom:5,cursor:'pointer',
              border:`1px solid ${sel?'var(--ac)':'var(--bd)'}`,
              background:sel?'rgba(200,169,126,.07)':'var(--s1)'}}>
            <div style={{width:18,height:18,borderRadius:9,flexShrink:0,
              border:`2px solid ${sel?'var(--ac)':'var(--bd)'}`,
              background:sel?'var(--ac)':'transparent',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              {sel&&<svg viewBox="0 0 24 24" width="10" height="10" fill="none"
                stroke="var(--bg)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'var(--tx)',fontFamily:FONT}}>{c.n}</div>
              <div style={{fontSize:10,color:'var(--tx3)'}}>{c.key} · {c.bpm} BPM</div>
            </div>
          </div>
        );
      })}
      <SEP label="Itinerario del ensayo"/>
      {itinerario.map((item,i)=>(
        <div key={item.id} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
          <input value={item.hora} onChange={e=>updItinerario(item.id,'hora',e.target.value)}
            type="time"
            style={{width:80,padding:'7px 8px',borderRadius:8,
              border:'1px solid var(--bd)',background:'var(--s1)',
              color:'var(--tx)',fontSize:12,flexShrink:0}}/>
          <input value={item.accion} onChange={e=>updItinerario(item.id,'accion',e.target.value)}
            placeholder={`Acción ${i+1}`}
            style={{flex:1,padding:'7px 10px',borderRadius:8,
              border:'1px solid var(--bd)',background:'var(--s1)',
              color:'var(--tx)',fontSize:13,fontFamily:FONT}}/>
          <button onClick={()=>delItinerario(item.id)}
            style={{background:'transparent',border:'none',cursor:'pointer',
              color:'var(--tx3)',padding:4,flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
              stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
      <button onClick={addItinerario}
        style={{width:'100%',padding:'8px',borderRadius:8,
          border:'1px dashed var(--bd)',background:'transparent',
          color:'var(--tx3)',fontSize:12,fontWeight:700,
          cursor:'pointer',fontFamily:FONT,marginBottom:4}}>
        + Agregar acción
      </button>
      <SEP label="Notas adicionales"/>
      <textarea value={notas} onChange={e=>setNotas(e.target.value)}
        placeholder="Indicaciones, qué llevar, notas especiales..."
        rows={3}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,
          border:'1px solid var(--bd)',background:'var(--s1)',
          color:'var(--tx)',fontSize:13,fontFamily:FONT,
          resize:'none',boxSizing:'border-box',lineHeight:1.5}}/>
      <button onClick={handleSave}
        style={{width:'100%',padding:'13px',borderRadius:12,border:'none',
          background:'var(--ac)',color:'var(--bg)',fontSize:14,fontWeight:900,
          fontFamily:FONT,cursor:'pointer',marginTop:20,
          display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
          stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Crear Ensayo
      </button>
    </div>
  );
}

function BandaBackstage({members,setMembers,gigs=[],setGigs,repertorio=[],isEncargado,onToast,getRol}){
  const [bsView,setBsView]=useState(null);
  const [subView,setSubView]=useState(null); // 'agregar' | 'equipo'
  const [nuevoNombre,setNuevoNombre]=useState('');
  const [nuevoRol,setNuevoRol]=useState('guitarrista_e');
  const [equiposPersonalizados,setEquiposPersonalizados]=useState([]);
  const [nuevoEquipoNombre,setNuevoEquipoNombre]=useState('');
  const [nuevoEquipoRoles,setNuevoEquipoRoles]=useState(['']);

  const MENU=[
    {id:'evento',   label:'Crear Evento',        sub:'Gigs, festivales, presentaciones'},
    {id:'ensayo',   label:'Crear Ensayo',         sub:'Fecha, lugar, equipos y setlist'},
    {id:'setlist',  label:'Crear Setlist',        sub:'Armar lista para un gig'},
    {id:'equipo',   label:'Gestión de Equipo',    sub:'Músicos y técnicos'},
    {id:'notif',    label:'Notificaciones',       sub:'Avisar al equipo'},
    {id:'config',   label:'Configuración',        sub:'Ajustes de la banda'},
  ];

  // ── Vistas internas ───────────────────────────────────────────────────────
  if(bsView==='equipo') return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}}
        onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx3)',fontFamily:"'Lato',sans-serif"}}>Backstage</span>
      </div>

      <div className="ph">
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:900,color:'var(--tx)',
            fontFamily:"'Lato',sans-serif"}}>Gestión de Equipo</h2>
          <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>
            {members.length} integrantes · {equiposPersonalizados.length} equipos
          </div>
        </div>
        {isEncargado&&(
          <div className="ph-btns">
            <button onClick={()=>setSubView('agregar')}
              style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,
                border:'1px solid var(--ac)',background:'rgba(200,169,126,.08)',
                color:'var(--ac)',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
              + Persona
            </button>
            <button onClick={()=>setSubView('equipo')}
              style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:700,
                border:'1px solid var(--bd)',background:'transparent',
                color:'var(--tx3)',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
              + Equipo
            </button>
          </div>
        )}
      </div>
      {subView==='agregar'&&isEncargado&&(
        <div style={{padding:'14px',borderRadius:14,border:'1px solid var(--bd)',
          background:'var(--s2)',marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',
            letterSpacing:'1px',marginBottom:10,fontFamily:"'Lato',sans-serif"}}>
            Nuevo integrante
          </div>
          <input value={nuevoNombre} onChange={e=>setNuevoNombre(e.target.value)}
            placeholder="Nombre"
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,
              marginBottom:8,boxSizing:'border-box'}}/>
          <select value={nuevoRol} onChange={e=>setNuevoRol(e.target.value)}
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,marginBottom:8}}>
            <optgroup label="Músicos">
              {ROLES_MUSICOS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </optgroup>
            <optgroup label="Equipos de trabajo">
              {EQUIPOS_TRABAJO.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </optgroup>
            {equiposPersonalizados.map(eq=>(
              <optgroup key={eq.id} label={eq.nombre}>
                {eq.roles.map(r=><option key={r} value={r}>{r}</option>)}
              </optgroup>
            ))}
          </select>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setSubView(null);setNuevoNombre('');}}
              style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid var(--bd)',
                background:'transparent',color:'var(--tx3)',fontSize:13,
                fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
              Cancelar
            </button>
            <button onClick={()=>{
              if(!nuevoNombre.trim()){return;}
              setMembers(prev=>[...prev,{id:Date.now(),nombre:nuevoNombre,rol:nuevoRol}]);
              setNuevoNombre('');setSubView(null);
              onToast(`✓ ${nuevoNombre} agregado`);
            }} style={{flex:2,padding:'9px',borderRadius:10,border:'none',
              background:'var(--ac)',color:'var(--bg)',fontSize:13,fontWeight:700,
              cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
              Agregar
            </button>
          </div>
        </div>
      )}
      {subView==='equipo'&&isEncargado&&(
        <div style={{padding:'14px',borderRadius:14,border:'1px solid var(--bd)',
          background:'var(--s2)',marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',textTransform:'uppercase',
            letterSpacing:'1px',marginBottom:10,fontFamily:"'Lato',sans-serif"}}>
            Nuevo equipo
          </div>
          <input value={nuevoEquipoNombre} onChange={e=>setNuevoEquipoNombre(e.target.value)}
            placeholder="Nombre del equipo (ej: Cuerdas, Vientos...)"
            style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
              background:'var(--s1)',color:'var(--tx)',fontSize:13,
              marginBottom:8,boxSizing:'border-box'}}/>
          <div style={{fontSize:11,color:'var(--tx3)',fontFamily:"'Lato',sans-serif",marginBottom:6}}>
            Roles dentro del equipo
          </div>
          {nuevoEquipoRoles.map((r,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:6}}>
              <input value={r} onChange={e=>setNuevoEquipoRoles(prev=>prev.map((x,j)=>j===i?e.target.value:x))}
                placeholder={`Rol ${i+1}`}
                style={{flex:1,padding:'7px 10px',borderRadius:8,border:'1px solid var(--bd)',
                  background:'var(--s1)',color:'var(--tx)',fontSize:13}}/>
              <button onClick={()=>setNuevoEquipoRoles(prev=>prev.filter((_,j)=>j!==i))}
                style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--tx3)'}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
          <button onClick={()=>setNuevoEquipoRoles(prev=>[...prev,''])}
            style={{width:'100%',padding:'7px',borderRadius:8,border:'1px dashed var(--bd)',
              background:'transparent',color:'var(--tx3)',fontSize:12,
              fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif",marginBottom:10}}>
            + Agregar rol
          </button>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setSubView(null);setNuevoEquipoNombre('');setNuevoEquipoRoles(['']);}}
              style={{flex:1,padding:'9px',borderRadius:10,border:'1px solid var(--bd)',
                background:'transparent',color:'var(--tx3)',fontSize:13,
                fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
              Cancelar
            </button>
            <button onClick={()=>{
              if(!nuevoEquipoNombre.trim()){onToast('Ingresa el nombre del equipo');return;}
              const roles=nuevoEquipoRoles.filter(r=>r.trim());
              setEquiposPersonalizados(prev=>[...prev,{
                id:'eq'+Date.now(),nombre:nuevoEquipoNombre,roles
              }]);
              setNuevoEquipoNombre('');setNuevoEquipoRoles(['']);setSubView(null);
              onToast(`✓ Equipo "${nuevoEquipoNombre}" creado`);
            }} style={{flex:2,padding:'9px',borderRadius:10,border:'none',
              background:'var(--ac)',color:'var(--bg)',fontSize:13,fontWeight:700,
              cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
              Crear equipo
            </button>
          </div>
        </div>
      )}
      <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
        letterSpacing:'1.5px',marginBottom:8,fontFamily:"'Lato',sans-serif"}}>
        Músicos
      </div>
      {members.filter(m=>ROLES_MUSICOS.find(r=>r.id===m.rol)).map(m=>(
        <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,
          padding:'10px 12px',borderRadius:12,border:'1px solid var(--bd)',
          background:'var(--s1)',marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
              fontFamily:"'Lato',sans-serif"}}>{m.nombre}</div>
            <div style={{fontSize:11,color:'var(--tx2)'}}>{getRol(m.rol).label}</div>
          </div>
          {isEncargado&&(
            <button onClick={()=>{setMembers(prev=>prev.filter(x=>x.id!==m.id));onToast(`${m.nombre} eliminado`);}}
              style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--tx3)',padding:4}}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      ))}
      <div style={{height:1,background:'var(--bd)',margin:'16px 0 12px'}}/>
      <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
        letterSpacing:'1.5px',marginBottom:8,fontFamily:"'Lato',sans-serif"}}>
        Equipos de trabajo
      </div>
      {members.filter(m=>EQUIPOS_TRABAJO.find(r=>r.id===m.rol)).map(m=>(
        <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,
          padding:'10px 12px',borderRadius:12,border:'1px solid var(--bd)',
          background:'var(--s1)',marginBottom:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
              fontFamily:"'Lato',sans-serif"}}>{m.nombre}</div>
            <div style={{fontSize:11,color:'var(--tx2)'}}>{getRol(m.rol).label}</div>
          </div>
          {isEncargado&&(
            <button onClick={()=>{setMembers(prev=>prev.filter(x=>x.id!==m.id));onToast(`${m.nombre} eliminado`);}}
              style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--tx3)',padding:4}}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      ))}
      {equiposPersonalizados.map(eq=>(
        <div key={eq.id} style={{marginTop:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--ac)',textTransform:'uppercase',
              letterSpacing:'1.5px',fontFamily:"'Lato',sans-serif"}}>
              {eq.nombre}
            </div>
            {isEncargado&&(
              <button onClick={()=>setEquiposPersonalizados(prev=>prev.filter(x=>x.id!==eq.id))}
                style={{fontSize:10,color:'var(--tx3)',background:'transparent',
                  border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
                Eliminar
              </button>
            )}
          </div>
          {members.filter(m=>eq.roles.includes(m.rol)).map(m=>(
            <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,
              padding:'10px 12px',borderRadius:12,border:'1px solid var(--bd)',
              background:'var(--s1)',marginBottom:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',
                  fontFamily:"'Lato',sans-serif"}}>{m.nombre}</div>
                <div style={{fontSize:11,color:'var(--tx2)'}}>{m.rol}</div>
              </div>
            </div>
          ))}
          {members.filter(m=>eq.roles.includes(m.rol)).length===0&&(
            <div style={{fontSize:12,color:'var(--tx3)',padding:'8px 0',
              fontFamily:"'Lato',sans-serif"}}>
              Sin integrantes en este equipo
            </div>
          )}
        </div>
      ))}
    </div>
  );

    if(bsView==='notif') return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}}
        onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx3)" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx3)',fontFamily:"'Lato',sans-serif"}}>Backstage</span>
      </div>
      <h2 style={{margin:'0 0 16px',fontSize:20,fontWeight:900,color:'var(--tx)',fontFamily:"'Lato',sans-serif"}}>
        Notificaciones
      </h2>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
        {['Todo el equipo','Músicos','Sonido','Visuales','Roadies'].map(dest=>(
          <button key={dest}
            style={{padding:'5px 10px',borderRadius:20,fontSize:11,fontWeight:700,
              cursor:'pointer',border:'1px solid var(--bd)',
              background:'transparent',color:'var(--tx3)',fontFamily:"'Lato',sans-serif"}}>
            {dest}
          </button>
        ))}
      </div>
      <textarea placeholder="Mensaje para el equipo..."
        rows={4}
        style={{width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid var(--bd)',
          background:'var(--s1)',color:'var(--tx)',fontSize:13,
          resize:'none',boxSizing:'border-box',lineHeight:1.5,marginBottom:8}}/>
      <button onClick={()=>{onToast('✓ Notificación enviada');setBsView(null);}}
        style={{width:'100%',padding:'11px',borderRadius:12,border:'none',
          background:'var(--ac)',color:'var(--bg)',fontSize:13,fontWeight:800,
          cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
        Enviar mensaje
      </button>
    </div>
  );

  // ── Home Backstage ────────────────────────────────────────────────────────
  return(
    <div>
      <h2 style={{margin:'0 0 4px',fontSize:20,fontWeight:900,color:'var(--tx)',
        fontFamily:"'Lato',sans-serif"}}>Backstage</h2>
      <div style={{fontSize:11,color:'var(--tx3)',marginBottom:20}}>Gestión y configuración</div>
      {MENU.map(item=>(
        <div key={item.id}
          onClick={()=>['equipo','notif','ensayo'].includes(item.id)?setBsView(item.id):onToast(`${item.label} — próximamente`)}
          style={{display:'flex',alignItems:'center',gap:14,padding:'14px',
            borderRadius:14,border:'1px solid var(--bd)',background:'var(--s1)',
            marginBottom:10,cursor:'pointer'}}>
          <div style={{width:38,height:38,borderRadius:10,background:'var(--s2)',flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            {item.id==='evento'&&<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>}
            {item.id==='ensayo'&&<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>}
            {item.id==='setlist'&&<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
            {item.id==='equipo'&&<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            {item.id==='notif'&&<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
            {item.id==='config'&&<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--ac)" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:'var(--tx)',fontFamily:"'Lato',sans-serif"}}>{item.label}</div>
            <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{item.sub}</div>
          </div>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      ))}
    </div>
  );
}

function BackstageView({userRole,onToast,mode,onSetTheme,onGetTheme,pastorData={},setPastorData,eventos=[],setEventos}){
  const [bsView,setBsView]=useState(null);
  const isAdmin=userRole==='superadmin';
  const isPastor=userRole==='pastor'||isAdmin;
  const isLeader=userRole==='leader'||isAdmin||isPastor;
  const [activeEq,setActiveEq]=useState(null);
  const [nuevaBanda,setNuevaBanda]=useState('');
  const [evNombre,setEvNombre]=useState('');
  const [evTipo,setEvTipo]=useState('domingo');
  const [evFecha,setEvFecha]=useState('');
  const [evNotas,setEvNotas]=useState('');
  const [evSetlist,setEvSetlist]=useState([]);
  const [evSearch,setEvSearch]=useState('');
  const [notifDest,setNotifDest]=useState([]);
  const [notifTipo,setNotifTipo]=useState('recordatorio');
  const [notifMsg,setNotifMsg]=useState('');

  // ── Setlist Creator ──
  const [slNombre,setSlNombre]=useState('');
  const [slCanciones,setSlCanciones]=useState([]);
  const [slSearch,setSlSearch]=useState('');
  const [slEventoId,setSlEventoId]=useState('');
  const [slGuardados,setSlGuardados]=useState([]);
  // ── CREAR EVENTO ──
  if(bsView==='evento')return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Crear <span style={{color:'var(--ac)'}}>evento</span></div>
      <div style={{fontSize:12,color:'var(--tx2)',marginBottom:20}}>Configura nombre, fecha, setlist y equipo en un solo lugar</div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Nombre del evento</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
          {['Culto Dominical','Reunión Especial','Reunión de Oración','Noche de Adoración','Culto de Jóvenes','Conferencia','Aniversario'].map(op=>(
            <button key={op} onClick={()=>setEvNombre(op)}
              style={{padding:'6px 12px',borderRadius:100,border:evNombre===op?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',background:evNombre===op?'rgba(200,169,126,.12)':'var(--s2)',color:evNombre===op?'var(--ac)':'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif",transition:'all .15s'}}>
              {op}
            </button>
          ))}
        </div>
        <input className="inp" placeholder="O escribe un nombre personalizado..." value={evNombre} onChange={e=>setEvNombre(e.target.value)}/>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Fecha</div>
        <div style={{display:'flex',gap:8}}>
          <select className="inp" style={{flex:1,cursor:'pointer'}} value={evFecha.split('-')[2]||''} onChange={e=>{const d=e.target.value;setEvFecha(prev=>{const parts=prev.split('-');parts[2]=d.padStart(2,'0');return parts.join('-');});}}>
            <option value="">Día</option>
            {Array.from({length:31},(_,i)=>i+1).map(d=>(<option key={d} value={d}>{d}</option>))}
          </select>
          <select className="inp" style={{flex:1.4,cursor:'pointer'}} value={evFecha.split('-')[1]||''} onChange={e=>{const m=e.target.value;setEvFecha(prev=>{const parts=prev.split('-');parts[1]=m.padStart(2,'0');return parts.join('-');});}}>
            <option value="">Mes</option>
            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i)=>(<option key={i} value={i+1}>{m}</option>))}
          </select>
          <select className="inp" style={{flex:1,cursor:'pointer'}} value={evFecha.split('-')[0]||''} onChange={e=>{const y=e.target.value;setEvFecha(prev=>{const parts=prev.split('-');parts[0]=y;return parts.join('-');});}}>
            <option value="">Año</option>
            {['2025','2026','2027'].map(y=>(<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Setlist</div>
        <input className="inp" placeholder="Buscar canción..." value={evSearch} onChange={e=>setEvSearch(e.target.value)} style={{marginBottom:8}}/>
        {evSetlist.length>0&&(
          <div style={{marginBottom:8}}>
            {evSetlist.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                <span style={{fontSize:11,color:'var(--tx3)',fontWeight:700,minWidth:16}}>{i+1}</span>
                <span style={{flex:1,fontSize:12,fontWeight:700,color:'var(--tx)'}}>{s}</span>
                <button onClick={()=>setEvSetlist(l=>l.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'var(--rd)',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{maxHeight:200,overflowY:'auto'}}>
          {CANCIONES.filter(s=>s.n.toLowerCase().includes(evSearch.toLowerCase())&&!evSetlist.includes(s.n)).map(s=>(
            <div key={s.n} onClick={()=>setEvSetlist(l=>[...l,s.n])} style={{padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,.04)',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(200,169,126,.05)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{s.n}</span>
              <span style={{fontSize:10,color:'var(--ac)',fontWeight:700}}>{s.key} · {s.bpm}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Equipos convocados</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
          {EQUIPOS_DATA.map(eq=>(
            <label key={eq.id} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:100,border:'1px solid var(--bd)',background:'var(--s1)',cursor:'pointer',transition:'all .15s'}}>
              <input type="checkbox" defaultChecked onChange={()=>{}} style={{accentColor:eq.color,width:13,height:13}}/>
              <div style={{width:7,height:7,borderRadius:'50%',background:eq.color}}/>
              <span style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)'}}>{eq.miembros.length}p</span>
            </label>
          ))}
        </div>
        <div style={{borderTop:'1px solid var(--bd)',paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',marginBottom:7}}>¿Necesitas un equipo adicional?</div>
          <div style={{display:'flex',gap:8}}>
            <input className="inp" placeholder="Nombre del equipo personalizado..." id="eq-custom" style={{flex:1,fontSize:12}}/>
            <button onClick={()=>{const v=document.getElementById('eq-custom').value.trim();if(v){onToast({text:'Equipo agregado',sub:v});document.getElementById('eq-custom').value='';}}}
              style={{padding:'8px 14px',borderRadius:9,border:'1px solid rgba(200,169,126,.35)',background:'rgba(200,169,126,.08)',color:'var(--ac)',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Lato',sans-serif",flexShrink:0}}>
              + Agregar
            </button>
          </div>
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:14}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Itinerario</div>
        <ItinerarioEditor/>
      </div>
      <div className="card" style={{padding:14,marginBottom:18}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>Notas del evento</div>
        <textarea className="inp" value={evNotas} onChange={e=>setEvNotas(e.target.value)}
          style={{minHeight:90,resize:'vertical',lineHeight:1.6,fontSize:12}}
          placeholder={"Ej: Llegar 30 min antes del ensayo. Revisar las canciones con tiempo.\nContactar a Cony para confirmar el equipo de proyecciones.\nFecha límite para cambios en el setlist: jueves en la noche."}/>
      </div>

      <div style={{display:'flex',gap:9}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>Cancelar</button>
        <button className="btn btn-p" style={{flex:2,justifyContent:'center'}}
          disabled={!evNombre.trim()&&!evFecha}
          onClick={()=>{
            const label=`${evNombre||'Nuevo evento'}`;
            const nuevoEv={id:Date.now(),nombre:label,fecha:`${evFecha.split('-')[2]||''} ${['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(evFecha.split('-')[1])||0]||''} ${evFecha.split('-')[0]||''}`.trim(),setlist:[...evSetlist]};
            setEventos(prev=>[...prev,nuevoEv]);
            onToast({text:'Evento creado',sub:`${label} · ${evSetlist.length} canciones`});
            setEvNombre('');setEvSetlist([]);setEvNotas('');setEvFecha('');
            setBsView(null);
          }}>
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Crear evento
        </button>
      </div>
    </div>
  );

    // VISTA: CREAR SETLIST
    if(bsView==='setlist'){

    const moverCancion=(from,to)=>{
      const arr=[...slCanciones];
      const [item]=arr.splice(from,1);
      arr.splice(to,0,item);
      setSlCanciones(arr);
    };

    const guardarSetlist=()=>{
      if(!slCanciones.length){onToast({text:'Agrega al menos una canción',sub:'El setlist está vacío'});return;}
      const nuevo={
        id:Date.now(),
        nombre:slNombre||`Setlist ${new Date().toLocaleDateString('es-CL')}`,
        canciones:[...slCanciones],
        eventoId:slEventoId||null,
        fecha:new Date().toLocaleDateString('es-CL'),
      };
      setSlGuardados(prev=>[...prev,nuevo]);
      // Si hay evento asignado, actualizar eventos
      if(slEventoId){
        setEventos(prev=>prev.map(ev=>ev.id===parseInt(slEventoId)?{...ev,setlist:slCanciones}:ev));
      }
      onToast({text:'Setlist guardado',sub:`${slCanciones.length} canciones${slEventoId?' · Asignado al evento':''}`});
      setSlCanciones([]);setSlNombre('');setSlEventoId('');setSlSearch('');
      setBsView(null);
    };

    return(
      <div style={{padding:'10px 8px',paddingBottom:90}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
        </div>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',lineHeight:1,marginBottom:5}}>
          Crear <span style={{color:'var(--ac)'}}>setlist</span>
        </div>
        <div style={{fontSize:12,color:'var(--tx2)',marginBottom:20}}>Arma la lista de canciones y asígnala a un evento cuando quieras</div>
        <div className="card" style={{padding:14,marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Nombre del setlist</div>
          <input className="inp" placeholder="Ej: Setlist 6 de julio · Noche de adoración..." value={slNombre} onChange={e=>setSlNombre(e.target.value)}/>
        </div>
        <div className="card" style={{padding:14,marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>
            Asignar a evento
            <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'var(--tx3)',fontSize:10,marginLeft:6}}>· opcional, puedes hacerlo después</span>
          </div>
          {eventos.length===0?(
            <div style={{padding:'12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.1)',textAlign:'center'}}>
              <div style={{fontSize:12,color:'var(--tx3)',marginBottom:6}}>Aún no hay eventos creados</div>
              <button onClick={()=>setBsView('evento')} style={{fontSize:11,fontWeight:700,color:'var(--ac)',background:'none',border:'none',cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>
                + Crear un evento primero →
              </button>
            </div>
          ):(
            <select className="inp" value={slEventoId} onChange={e=>setSlEventoId(e.target.value)} style={{cursor:'pointer'}}>
              <option value="">Sin asignar — guardar como borrador</option>
              {eventos.map(ev=>(
                <option key={ev.id} value={ev.id}>
                  {ev.nombre}{ev.fecha?' · '+ev.fecha:''}
                </option>
              ))}
            </select>
          )}
          {slEventoId&&(
            <div style={{marginTop:8,padding:'8px 12px',borderRadius:8,background:'rgba(94,206,160,.08)',border:'1px solid rgba(94,206,160,.2)',fontSize:11,color:'var(--gn)',fontWeight:700,display:'flex',alignItems:'center',gap:6}}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Setlist asignado a: {eventos.find(e=>String(e.id)===String(slEventoId))?.nombre}
            </div>
          )}
        </div>
        <div className="card" style={{padding:14,marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px'}}>Canciones</div>
            {slCanciones.length>0&&(
              <span style={{fontSize:11,fontWeight:700,color:'var(--ac)'}}>{slCanciones.length} canciones</span>
            )}
          </div>
          {slCanciones.length>0&&(
            <div style={{marginBottom:12,borderRadius:10,border:'1px solid var(--bd)',overflow:'hidden'}}>
              {slCanciones.map((s,i)=>(
                <div key={s+i} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderBottom:i<slCanciones.length-1?'1px solid rgba(255,255,255,.05)':'none',background:i%2===0?'rgba(255,255,255,.02)':'transparent'}}>
                  <span style={{fontSize:13,fontWeight:900,color:'var(--tx3)',minWidth:22,textAlign:'right'}}>{i+1}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s}</div>
                    <div style={{fontSize:10,color:'var(--tx3)',marginTop:1}}>
                      {CANCIONES.find(c=>c.n===s)?.key} · {CANCIONES.find(c=>c.n===s)?.bpm} BPM
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:2,flexShrink:0}}>
                    <button disabled={i===0} onClick={()=>moverCancion(i,i-1)} style={{width:22,height:20,border:'1px solid var(--bd)',background:'var(--s1)',color:i===0?'var(--tx3)':'var(--tx2)',cursor:i===0?'not-allowed':'pointer',borderRadius:'4px 4px 0 0',display:'flex',alignItems:'center',justifyContent:'center',opacity:i===0?.3:1}}>
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button disabled={i===slCanciones.length-1} onClick={()=>moverCancion(i,i+1)} style={{width:22,height:20,border:'1px solid var(--bd)',borderTop:'none',background:'var(--s1)',color:i===slCanciones.length-1?'var(--tx3)':'var(--tx2)',cursor:i===slCanciones.length-1?'not-allowed':'pointer',borderRadius:'0 0 4px 4px',display:'flex',alignItems:'center',justifyContent:'center',opacity:i===slCanciones.length-1?.3:1}}>
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>
                  <button onClick={()=>setSlCanciones(prev=>prev.filter((_,j)=>j!==i))} style={{width:26,height:26,border:'1px solid rgba(255,82,82,.2)',background:'rgba(255,82,82,.06)',color:'var(--rd)',cursor:'pointer',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:15}}>×</button>
                </div>
              ))}
            </div>
          )}
          <input className="inp" placeholder="Buscar y agregar canción..." value={slSearch} onChange={e=>setSlSearch(e.target.value)} style={{marginBottom:slSearch?8:0}}/>
          {slSearch&&(
            <div style={{maxHeight:220,overflowY:'auto',borderRadius:9,border:'1px solid var(--bd)',background:'var(--s2)',marginTop:4}}>
              {CANCIONES.filter(s=>s.n.toLowerCase().includes(slSearch.toLowerCase())&&!slCanciones.includes(s.n)).slice(0,12).map(s=>(
                <div key={s.n} onClick={()=>{setSlCanciones(prev=>[...prev,s.n]);setSlSearch('');}}
                  style={{padding:'9px 12px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,.04)'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(200,169,126,.06)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div>
                    <div style={{fontWeight:700,fontSize:12,color:'var(--tx)'}}>{s.n}</div>
                    <div style={{fontSize:10,color:'var(--tx3)',marginTop:1}}>{s.key} · {s.bpm} BPM</div>
                  </div>
                  <div style={{width:22,height:22,borderRadius:6,background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--ac)" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                </div>
              ))}
              {CANCIONES.filter(s=>s.n.toLowerCase().includes(slSearch.toLowerCase())&&!slCanciones.includes(s.n)).length===0&&(
                <div style={{padding:'12px',textAlign:'center',fontSize:12,color:'var(--tx3)'}}>No hay coincidencias</div>
              )}
            </div>
          )}
        </div>
        {slGuardados.length>0&&(
          <div className="card" style={{padding:14,marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:10}}>
              Setlists guardados ({slGuardados.length})
            </div>
            {slGuardados.map(sl=>(
              <div key={sl.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>{sl.nombre}</div>
                  <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>
                    {sl.canciones.length} canciones · {sl.fecha}
                    {sl.eventoId&&<span style={{color:'var(--gn)',marginLeft:6}}>· Asignado ✓</span>}
                  </div>
                </div>
                <button onClick={()=>{setSlCanciones([...sl.canciones]);setSlNombre(sl.nombre);setSlGuardados(prev=>prev.filter(x=>x.id!==sl.id));onToast({text:'Editando setlist',sub:sl.nombre});}}
                  style={{padding:'4px 10px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif",flexShrink:0}}>
                  Editar
                </button>
                <button onClick={()=>setSlGuardados(prev=>prev.filter(x=>x.id!==sl.id))}
                  style={{width:26,height:26,borderRadius:7,border:'1px solid rgba(255,82,82,.2)',background:'rgba(255,82,82,.06)',color:'var(--rd)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:15}}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{display:'flex',gap:9}}>
          <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>Cancelar</button>
          <button className="btn btn-p" style={{flex:2,justifyContent:'center'}} disabled={!slCanciones.length} onClick={guardarSetlist}>
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            {slEventoId?'Guardar y asignar al evento':'Guardar setlist'}
          </button>
        </div>
      </div>
    );
  }

  if(bsView==='equipos'){
    // Listado de músicos (todos los integrantes únicos)
    const bandaEquipo=EQUIPOS_DATA.find(e=>e.name==='Banda'); const listado=(bandaEquipo?bandaEquipo.miembros:[]).filter((m,i,arr)=>arr.findIndex(x=>x.id===m.id)===i);

    return(
      <div style={{padding:'10px 8px',paddingBottom:90}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
        </div>
        <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Gestión de <span style={{color:'var(--ac)'}}>equipos</span></div>
        <div style={{fontSize:12,color:'var(--tx2)',marginBottom:18}}>Crea equipos de trabajo y los roles dentro de cada uno. También puedes crear una nómina de músicos para cada evento o crear varias bandas desde un grupo grande de músicos.</div>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Listado de músicos · {listado.length} personas</div>
        <div className="card" style={{padding:14,marginBottom:14}}>
          <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:10}}>
            {listado.map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:100,background:'var(--s2)',border:'1px solid var(--bd)'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,rgba(139,114,212,.6),var(--ac))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                <span style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{m.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-g btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={()=>onToast({text:'Agregar músico',sub:'Al listado'})}>
            <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Agregar músico
          </button>
        </div>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1.5px',marginBottom:8}}>Formaciones · {EQUIPOS_DATA.length} equipos</div>
        {EQUIPOS_DATA.map(eq=>(
          <div key={eq.id} className="eq-card" style={{marginBottom:10}}>
            <div onClick={()=>setActiveEq(activeEq===eq.id?null:eq.id)} style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:9,cursor:'pointer'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:eq.color,flexShrink:0}}/>
              <span style={{fontFamily:"'Lato',sans-serif",fontWeight:900,fontSize:15,color:'var(--tx)',flex:1}}>{eq.name}</span>
              <span style={{fontSize:10,color:'var(--tx3)',fontWeight:700}}>{eq.miembros.length}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2" style={{transform:activeEq===eq.id?'rotate(180deg)':'none',transition:'transform .2s'}}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {activeEq===eq.id&&(
              <div style={{borderTop:'1px solid var(--bd)'}}>
                <div style={{padding:'8px 14px',borderBottom:'1px solid var(--bd)',display:'flex',flexWrap:'wrap',gap:5,alignItems:'center'}}>
                  <span style={{fontSize:9,fontWeight:700,color:'var(--tx3)',marginRight:4}}>ROLES:</span>
                  {eq.roles.map(r=>(
                    <span key={r} style={{fontSize:10,fontWeight:700,color:eq.color,background:eq.color+'15',border:'1px solid '+eq.color+'30',padding:'2px 8px',borderRadius:100}}>{r}</span>
                  ))}
                  <button onClick={()=>onToast({text:'Nuevo rol',sub:eq.name})} style={{fontSize:10,color:'var(--tx3)',background:'var(--s2)',border:'1px dashed var(--bd)',padding:'2px 8px',borderRadius:100,cursor:'pointer',fontFamily:"'Lato',sans-serif",fontWeight:700}}>+ Rol</button>
                </div>
                {eq.miembros.map(m=>(
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,'+eq.color+'60,'+eq.color+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:900,color:'#fff',flexShrink:0}}>{initials(m.name)}</div>
                    <span style={{flex:1,fontSize:12,fontWeight:700,color:'var(--tx)'}}>{m.name}</span>
                    <select defaultValue={m.role} style={{fontSize:10,color:eq.color,background:eq.color+'15',border:'1px solid '+eq.color+'30',padding:'3px 8px',borderRadius:100,cursor:'pointer',fontFamily:"'Lato',sans-serif",fontWeight:700,outline:'none'}}>
                      {eq.roles.map(r=>(<option key={r} value={r}>{r}</option>))}
                    </select>
                    <button onClick={()=>onToast({text:'Removido',sub:m.name})} style={{width:22,height:22,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
                <div style={{padding:'8px 14px'}}>
                  <select className="inp" style={{fontSize:11,cursor:'pointer'}} onChange={e=>{if(e.target.value)onToast({text:'Agregado a '+eq.name,sub:e.target.value});}} defaultValue="">
                    <option value="">Agregar persona...</option>
                    {listado.filter(m=>!eq.miembros.find(em=>em.id===m.id)).map(m=>(<option key={m.id} value={m.name}>{m.name}</option>))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))})}
        <div className="card" style={{padding:14}}>
          <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>Nueva formación</div>
          <input className="inp" placeholder="Nombre de la nueva banda o equipo..." value={nuevaBanda} onChange={e=>setNuevaBanda(e.target.value)} style={{marginBottom:8}}/>
          <button className="btn btn-p btn-sm" style={{width:'100%',justifyContent:'center'}} onClick={()=>{if(nuevaBanda.trim())onToast({text:'Formación creada',sub:nuevaBanda});setNuevaBanda('');}}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Crear formación
          </button>
        </div>
      </div>
    );
  }

    // ── DELEGAR PERMISOS ──
  if(bsView==='permisos')return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:24,color:'var(--tx)',marginBottom:6}}>Delegar Permisos</div>
      <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.6,marginBottom:18}}>Asigna líderes para que gestionen su área sin necesitar tu aprobación. </div>
      <div className="card" style={{padding:16,marginBottom:14}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:12}}>Líderes actuales</div>
        {[{av:'CS',name:'Cony Saavedra',eq:'Banda',perms:['editar setlist','convocar equipo']},{av:'MP',name:'Mauro Pizarro',eq:'Proyecciones',perms:['gestionar equipo']}].map(l=>(
          <div key={l.av} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--bd)'}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#4a3a8a,var(--ac))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#fff',flexShrink:0}}>{l.av}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:'var(--tx)'}}>{l.name}</div>
              <div style={{fontSize:10,color:'var(--ac)',fontWeight:700,marginTop:1}}>Líder {l.eq}</div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:4}}>
                {l.perms.map(p=>(<span key={p} style={{fontSize:9,color:'var(--tx3)',background:'var(--s2)',border:'1px solid var(--bd)',padding:'1px 6px',borderRadius:100,fontWeight:700}}>{p}</span>))}
              </div>
            </div>
            <button onClick={()=>onToast({text:'Editando permisos',sub:l.name})} style={{width:28,height:28,borderRadius:7,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:16,marginBottom:16}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:12}}>Agregar nuevo líder</div>
        <div style={{marginBottom:10}}>
          <div className="lbl" style={{marginBottom:5}}>Integrante</div>
          <select className="inp" style={{cursor:'pointer'}}>
            <option value="">Seleccionar...</option>
            {EQUIPOS_DATA.flatMap(e=>e.miembros).map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
        </div>
        <div style={{marginBottom:14}}>
          <div className="lbl" style={{marginBottom:8}}>Permisos</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {[{id:'setlist',label:'Editar setlist'},{id:'convocar',label:'Convocar equipo'},{id:'notif',label:'Enviar notificaciones'},{id:'itinerario',label:'Editar itinerario'}].map(p=>(
              <label key={p.id} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                <input type="checkbox" style={{width:16,height:16,accentColor:'var(--ac)',cursor:'pointer'}}/>
                <span style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{p.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn btn-p" style={{width:'100%'}} onClick={()=>onToast({text:'Líder asignado',sub:'Permisos guardados'})}>
          <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Guardar líder
        </button>
      </div>
    </div>
  );

  // ── NOTIFICACIONES ──
  if(bsView==='notif')return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:24,color:'var(--tx)',marginBottom:6}}>Notificaciones</div>
      <div style={{fontSize:13,color:'var(--tx2)',lineHeight:1.6,marginBottom:18}}>Envía mensajes directos a tu equipo. Sin WhatsApp, sin emails perdidos. </div>
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:12}}>¿A quién?</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
          {['Todo el equipo',...EQUIPOS_DATA.map(e=>e.name)].map(dest=>(
            <button key={dest} onClick={()=>setNotifDest(d=>d.includes(dest)?d.filter(x=>x!==dest):[...d,dest])} style={{padding:'6px 12px',borderRadius:100,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:"'Lato',sans-serif",border:notifDest.includes(dest)?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',background:notifDest.includes(dest)?'rgba(200,169,126,.1)':'var(--s1)',color:notifDest.includes(dest)?'var(--ac)':'var(--tx2)'}}>{dest}</button>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:16,marginBottom:12}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:12}}>Tipo de aviso</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[{id:'recordatorio',label:'Recordatorio',icon:'🔔'},{id:'cambio',label:'Cambio setlist',icon:''},{id:'urgente',label:'Urgente',icon:'⚡'},{id:'general',label:'General',icon:'💬'}].map(t=>(
            <button key={t.id} onClick={()=>setNotifTipo(t.id)} style={{padding:'10px',borderRadius:10,cursor:'pointer',textAlign:'left',border:notifTipo===t.id?'1px solid rgba(200,169,126,.5)':'1px solid var(--bd)',background:notifTipo===t.id?'rgba(200,169,126,.08)':'var(--s1)',fontFamily:"'Lato',sans-serif"}}>
              <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:notifTipo===t.id?'var(--ac)':'var(--tx)'}}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:16,marginBottom:16}}>
        <div style={{fontWeight:900,fontSize:14,color:'var(--tx)',marginBottom:10}}>Mensaje</div>
        <textarea className="inp" placeholder="Ej: Hola equipo, este domingo llegamos a las 9:00am. ¡Los esperamos!" value={notifMsg} onChange={e=>setNotifMsg(e.target.value)} style={{minHeight:90,resize:'vertical',lineHeight:1.6,fontSize:12}}/>
      </div>
      <div style={{display:'flex',gap:9}}>
        <button className="btn btn-g" style={{flex:1}} onClick={()=>setBsView(null)}>Cancelar</button>
        <button className="btn btn-p" style={{flex:2}} disabled={!notifMsg.trim()||!notifDest.length} onClick={()=>{onToast({text:'Notificación enviada',sub:notifDest.join(', ')});setBsView(null);}}>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar
        </button>
      </div>
    </div>
  );

  // ── CONFIGURACIÓN ──
  if(bsView==='config')return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,cursor:'pointer'}} onClick={()=>setBsView(null)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--tx2)" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>Backstage</span>
      </div>
      <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:28,color:'var(--tx)',lineHeight:1,marginBottom:5}}>Ajustes</div>
      <div style={{fontSize:12,color:'var(--tx2)',marginBottom:20}}>Personaliza la app a tu estilo</div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:12}}>Mi organización</div>
        <input className="inp" placeholder="Nombre de la iglesia o banda" style={{marginBottom:8}} defaultValue="Iglesia"/>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <input className="inp" placeholder="Ciudad" style={{flex:1}}/>
          <select className="inp" style={{flex:1,cursor:'pointer'}}>
            {['Chile','Argentina','Colombia','México','Perú','España','Venezuela','Ecuador','Bolivia','Uruguay','Paraguay','Costa Rica','Guatemala'].map(p=>(<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8,marginTop:4}}>Logotipo</div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:56,height:56,borderRadius:12,border:'1px dashed rgba(200,169,126,.4)',background:'rgba(200,169,126,.05)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,cursor:'pointer',flexShrink:0}}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--tx3)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9l4-4 4 4 4-4 4 4"/><circle cx="8.5" cy="14.5" r="2"/><path d="M21 15l-5-5-5 6"/></svg>
            <span style={{fontSize:7,color:'var(--tx3)',fontWeight:700}}>Logo</span>
          </div>
          <div>
            <div style={{fontSize:12,color:'var(--tx2)',lineHeight:1.6}}>PNG o SVG · 512×512px recomendado</div>
            <button style={{marginTop:6,padding:'4px 10px',borderRadius:7,border:'1px solid var(--bd)',background:'var(--s1)',color:'var(--tx3)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Lato',sans-serif"}}>Seleccionar archivo</button>
          </div>
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:900,color:'var(--tx3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:12}}>Tema visual</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
          {[
            {id:'dark',      label:'Oscuro',          sub:'Alto contraste · Dorado',
              bg:'linear-gradient(135deg,#2a1a4a 0%,#07070f 100%)',
              preview:['#07070f','#c8a97e','#ede9ff']},
            {id:'gray',      label:'Gris',             sub:'Carbón · Naranja quemado',
              bg:'linear-gradient(135deg,#22232a 0%,#3a3830 60%,#e07820 100%)',
              preview:['#22232a','#e07820','#f2ede6']},
            {id:'cream',     label:'Claro',             sub:'Blanco hueso · Contraste fuerte',
              bg:'linear-gradient(135deg,#EDE8DC 0%,#d8cfc0 100%)',
              preview:['#F5F0E8','#8B4513','#0e0a06']},
            {id:'bubblegum', label:'Bubblegum Pop',     sub:'Rosa neón · Teal profundo',
              bg:'linear-gradient(135deg,#0d1f1f 0%,#062a2a 40%,#FF69B4 100%)',
              preview:['#0d1f1f','#FF69B4','#00F0FF']},
            {id:'oliva',     label:'Oliva · Mocha',     sub:'Verde oliva · Naranja fuerte',
              bg:'linear-gradient(135deg,#111a0a 0%,#1e2e0e 40%,#E8670A 85%,#8fba30 100%)',
              preview:['#161a10','#E8670A','#8fba30']},
          ].map(th=>(
            <div key={th.id} onClick={()=>{onSetTheme(th.id);onToast({text:'Tema aplicado',sub:th.label});}}
              style={{borderRadius:12,cursor:'pointer',overflow:'hidden',transition:'all .2s',
                      border:onGetTheme()===th.id?'2px solid var(--ac)':'1px solid var(--bd)',
                      boxShadow:onGetTheme()===th.id?'0 0 0 1px var(--ac),0 4px 20px rgba(0,0,0,.4)':'none'}}>
              <div style={{height:64,background:th.bg,position:'relative',display:'flex',alignItems:'flex-end',padding:'0 8px 8px'}}>
                <div style={{display:'flex',gap:4}}>
                  {th.preview.map((c,i)=>(
                    <div key={i} style={{width:16,height:16,borderRadius:3,background:c,
                                         border:'1px solid rgba(255,255,255,.25)',
                                         boxShadow:'0 1px 4px rgba(0,0,0,.4)'}}/>
                  ))}
                </div>
                {onGetTheme()===th.id&&(
                  <div style={{position:'absolute',top:6,right:6,width:20,height:20,borderRadius:'50%',
                               background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',
                               display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </div>
              <div style={{padding:'8px 10px',background:'var(--s1)'}}>
                <div style={{fontSize:11,fontWeight:900,color:'var(--tx)',fontFamily:"'Lato',sans-serif"}}>{th.label}</div>
                <div style={{fontSize:9,color:'var(--tx3)',marginTop:2}}>{th.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:14,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>Daniel Miranda</div>
            <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>dmiranda@fearless.cl · Super Admin</div>
          </div>
          <button onClick={()=>onToast({text:'Cerrando sesión...',sub:'Hasta pronto'})} style={{padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,82,82,.3)',background:'rgba(255,82,82,.06)',color:'var(--rd)',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:"'Lato',sans-serif",display:'flex',alignItems:'center',gap:5}}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );

    // ── MENÚ PRINCIPAL BACKSTAGE ──
  const ItemIcon=({icon})=>{
    const props={viewBox:"0 0 24 24",width:18,height:18,fill:"none",stroke:"var(--ac)",strokeWidth:1.8};
    if(icon==='calendar')return(<svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    if(icon==='music')return(<svg {...props}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>);
    if(icon==='team')return(<svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    if(icon==='shield')return(<svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>);
    if(icon==='bell')return(<svg {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>);
    if(icon==='settings')return(<svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
    return null;
  };

      const ITEMS=[
    {id:'evento',label:'Crear evento',sub:'Nuevo domingo o fecha especial',icon:'calendar',adminOnly:false},
    {id:'setlist',label:'Crear setlist',sub:slGuardados.length>0?`${slGuardados.length} setlist${slGuardados.length>1?'s':''} guardado${slGuardados.length>1?'s':''}`:eventos.length>0?`${eventos.length} evento${eventos.length>1?'s':''} disponible${eventos.length>1?'s':''}`:' Arma y asigna a un evento',icon:'music',adminOnly:false},
    {id:'equipos',label:'Gestión de equipos',sub:'Crear equipos y roles',icon:'team',adminOnly:true},
    {id:'permisos',label:'Delegar permisos',sub:'Asignar líderes',icon:'shield',adminOnly:true},
    {id:'notif',label:'Notificaciones',sub:'Avisar al equipo',icon:'bell',adminOnly:false},
    {id:'config',label:'Configuración',sub:'Ajustes y preferencias',icon:'settings',adminOnly:false},
    {id:'pastor',label:'Palabra del Pastor',sub:'Versículo y PPT del domingo',icon:'book',pastorOnly:true},
  ].filter(it=>{
    if(it.adminOnly&&!isAdmin)return false;
    if(it.pastorOnly&&!isPastor)return false;
    return true;
  });

  return(
    <div style={{padding:'10px 8px',paddingBottom:90}}>
      <div style={{marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",fontWeight:400,fontSize:32,color:'var(--tx)',lineHeight:1}}>Backstage</div>
          <span style={{padding:'2px 9px',borderRadius:100,fontSize:9,fontWeight:700,border:'1px solid rgba(200,169,126,.28)',background:'rgba(200,169,126,.07)',color:'var(--ac)',fontFamily:"'Lato',sans-serif",flexShrink:0,alignSelf:'center'}}>{isAdmin?'Super Admin':'Líder'}</span>
        </div>
        <div style={{fontSize:12,color:'var(--ac)',fontWeight:600,lineHeight:1.5}}>
          {isAdmin?'Crea eventos, arma setlists, gestiona tu equipo y envía comunicaciones.':'Convoca a tu equipo, envía notificaciones y coordina lo que necesites.'}
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {ITEMS.map(it=>(
          <div key={it.id} onClick={()=>setBsView(it.id)} style={{display:'flex',alignItems:'center',gap:13,padding:'14px 16px',borderRadius:14,background:'var(--s1)',border:'1px solid var(--bd)',cursor:'pointer'}}>
            <div style={{width:42,height:42,borderRadius:11,background:'rgba(200,169,126,.1)',border:'1px solid rgba(200,169,126,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ItemIcon icon={it.icon}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15,color:'var(--tx)'}}>{it.label}</div>
              <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{it.sub}</div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--tx3)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

function App(){
  const [appMode,setAppMode]=useState(null); // null | 'iglesia' | 'banda' | 'academia'
  const [onboarded,setOnboarded]=useState(false);
  const [lang,setLang]=useState('es');
  const [mode,setMode]=useState('worship');
  const [view,setView]=useState('admin');
  const [sbCol,setSbCol]=useState(false);
  const [songView,setSongView]=useState(null);
  const [rehearsal,setRehearsal]=useState(false);
  const [toast,setToast]=useState(null);
  const [theme,setTheme]=useState('dark');
  const [eventos,setEventos]=useState([]);
  const [userRole]=useState('superadmin');
  const isAdmin=userRole==='superadmin';
  const isPastor=userRole==='pastor'||isAdmin;
  const [pastorData,setPastorData]=useState({});
  const handleSaveChords=(name,content)=>{
    SONG_CONTENT_IGLESIA[name]=content;
    showToast('✓ Acordes guardados');
  };
  const [activeSunday,setActiveSunday]=useState(7);
  const [mesNav,setMesNav]=useState(new Date().getMonth());

  // Temas aplicados via CSS variables inline — funciona en sandbox/artifact
  const THEMES={
    // ── OSCURO — fondo casi negro, dorado cálido, alto contraste ──
    dark:{
      bg:'#07070f',s1:'rgba(255,255,255,.06)',s2:'rgba(255,255,255,.03)',s3:'rgba(255,255,255,.1)',
      bd:'rgba(255,255,255,.1)',bd2:'rgba(255,255,255,.2)',
      ac:'#c8a97e',tx:'#ede9ff',tx2:'#9e9ab6',tx3:'#5a566e',
      gn:'#5ecea0',rd:'#ff5252',
    },
    // ── GRIS — carbón oscuro con naranja quemado ──
    gray:{
      bg:'#22232a',s1:'rgba(255,255,255,.08)',s2:'rgba(255,255,255,.04)',s3:'rgba(255,255,255,.13)',
      bd:'rgba(255,255,255,.13)',bd2:'rgba(255,255,255,.24)',
      ac:'#e07820',tx:'#f2ede6',tx2:'#b0a898',tx3:'#6a6258',
      gn:'#5ecea0',rd:'#ff5252',
    },
    // ── CLARO — blanco hueso con contraste fuerte. Texto casi negro ──
    cream:{
      bg:'#EDE8DC',
      s1:'rgba(0,0,0,.07)',s2:'rgba(0,0,0,.04)',s3:'rgba(0,0,0,.12)',
      bd:'rgba(0,0,0,.18)',bd2:'rgba(0,0,0,.32)',
      ac:'#D4500A',   // naranja fuerte — botones, highlights, mes activo
      tx:'#1a1208',   // casi negro
      tx2:'#3a2010',  // marrón oscuro
      tx3:'#7a5a3a',  // marrón medio
      gn:'#0d7a35',rd:'#c44010',
    },
    // ── BUBBLEGUM POP — fondo oscuro teal profundo, rosa neón + cyan ──
    bubblegum:{
      bg:'#0d1f1f',s1:'rgba(255,105,180,.1)',s2:'rgba(255,105,180,.05)',s3:'rgba(255,105,180,.17)',
      bd:'rgba(255,105,180,.25)',bd2:'rgba(255,105,180,.45)',
      ac:'#FF69B4',tx:'#f0faff',tx2:'#a0d8d8',tx3:'#069494',
      gn:'#00F0FF',rd:'#ff4488',
    },
    // ── VERDE OLIVA · MOCHA · NARANJA FUERTE — oscuro terroso con punch ──
    oliva:{
      bg:'#111a0a',s1:'rgba(232,103,10,.12)',s2:'rgba(232,103,10,.06)',s3:'rgba(232,103,10,.2)',
      bd:'rgba(143,186,48,.2)',bd2:'rgba(143,186,48,.38)',
      ac:'#E8670A',tx:'#f5f0d8',tx2:'#c8b878',tx3:'#6a8a3a',
      gn:'#8fba30',rd:'#e03020',
    },
  };
  const t=THEMES[theme]||THEMES.dark;
  const themeStyle={
    '--bg':t.bg,'--s1':t.s1,'--s2':t.s2,'--s3':t.s3,
    '--bd':t.bd,'--bd2':t.bd2,'--ac':t.ac,'--tx':t.tx,'--tx2':t.tx2,'--tx3':t.tx3,
    '--gn':t.gn,'--rd':t.rd,
    background:t.bg,color:t.tx,minHeight:'100vh',
  };

  const showToast=useCallback(msg=>{setToast(msg);setTimeout(()=>setToast(null),3200);},[]);

  const handleFinish=(l,m)=>{
    setLang(l);setMode(m);
    
    setOnboarded(true);
  };

  const modeData=MODES[mode]||MODES.worship;
  const activeSl=SETLISTS[activeSunday]||[];

  // Onboarding antiguo desactivado — reemplazado por ModeSelector

  const MESES=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const mesActual=new Date().getMonth();

  const BNS=[
    {id:'admin',label:'Resumen'},
    {id:'misetlist',label:'Próx Fecha'},
    {id:'cancionero',label:'Cancionero'},
    {id:'equipos',label:'Equipos'},
    {id:'backstage',label:'Backstage'},
  ];
  const NavIco=({id,active})=>{
    const s={viewBox:"0 0 24 24",width:20,height:20,fill:"none",stroke:active?"var(--ac)":"var(--tx3)",strokeWidth:1.5,strokeLinecap:"round",strokeLinejoin:"round"};
    if(id==='admin')return(<svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
    if(id==='misetlist')return(<svg {...s}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg>);
    if(id==='cancionero')return(<svg {...s}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>);
    if(id==='equipos')return(<svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    if(id==='equipos')return(<svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
    if(id==='equipos')return(<svg viewBox='0 0 24 24' width={20} height={20} fill='none' stroke={active?'var(--ac)':'var(--tx3)'} strokeWidth={1.5}><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'/></svg>);
    if(id==='equipos')return(<svg {...s}><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'/></svg>);
    if(id==='backstage')return(<svg {...s}><line x1="5" y1="3" x2="5" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="19" y1="3" x2="19" y2="21"/><rect x="3" y="7" width="4" height="3.5" rx="1.5"/><rect x="10" y="13" width="4" height="3.5" rx="1.5"/><rect x="17" y="5" width="4" height="3.5" rx="1.5"/></svg>);
    return null;
  };

  // ── Pantalla de bienvenida: idioma + modo (una sola vez, sin vuelta atrás) ──
  if(appMode===null){
    const T={
      es:{
        welcome:'Bienvenido a',
        choose:'Elige tu modo de uso',
        forever:'Esta elección define el modo permanente de tu cuenta. No se puede cambiar entre modos una vez elegido.',
        lang:'Idioma / Language',
        iglesia:{title:'Iglesia',sub:'Cultos · Setlists · Equipos de alabanza · Rol de Pastor'},
        banda:{title:'Banda',sub:'Gigs · Repertorio · Equipo técnico · Rider'},
        academia:{title:'Academia',sub:'Clases · Partituras · Alumnos · Evaluaciones'},
        soon:'Próximamente',
        enter:'Entrar',
      },
      en:{
        welcome:'Welcome to',
        choose:'Choose your mode',
        forever:'This permanently defines your account mode. You cannot switch between modes once chosen.',
        lang:'Language / Idioma',
        iglesia:{title:'Church',sub:'Services · Setlists · Worship Teams · Pastor role'},
        banda:{title:'Band',sub:'Gigs · Repertoire · Technical crew · Rider'},
        academia:{title:'Academy',sub:'Classes · Sheet music · Students · Assessments'},
        soon:'Coming soon',
        enter:'Enter',
      },
    };
    const t=T[lang]||T.es;

    return(
      <div style={{
        minHeight:'100vh',background:'#07070f',
        display:'flex',flexDirection:'column',
        fontFamily:"'Lato',sans-serif",
        overflowY:'auto',
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Special+Gothic+Expanded+One&family=Lato:wght@400;700;900&display=swap');`}</style>
        <div style={{padding:'48px 24px 24px',textAlign:'center'}}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#c8a97e" strokeWidth="1.5" style={{marginBottom:10}}>
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
          <div style={{fontFamily:"'Special Gothic Expanded One',sans-serif",
            fontSize:26,color:'#ede9ff',letterSpacing:'2px'}}>
            SETSYNC
          </div>
        </div>
        <div style={{padding:'0 24px 24px',textAlign:'center'}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,.3)',fontWeight:700,
            textTransform:'uppercase',letterSpacing:'2px',marginBottom:8}}>
            {t.lang}
          </div>
          <div style={{display:'inline-flex',gap:0,borderRadius:20,
            border:'1px solid rgba(255,255,255,.1)',overflow:'hidden'}}>
            {['es','en'].map(l=>(
              <button key={l} onClick={()=>setLang(l)}
                style={{padding:'6px 18px',border:'none',cursor:'pointer',
                  background:lang===l?'rgba(200,169,126,.2)':'transparent',
                  color:lang===l?'#c8a97e':'rgba(255,255,255,.3)',
                  fontSize:12,fontWeight:700,fontFamily:"'Lato',sans-serif",
                  textTransform:'uppercase',letterSpacing:'1px',
                  transition:'all .2s'}}>
                {l==='es'?'Español':'English'}
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:'0 24px 8px',textAlign:'center'}}>
          <div style={{fontSize:17,fontWeight:900,color:'#ede9ff',marginBottom:6}}>
            {t.choose}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,.35)',lineHeight:1.5,
            maxWidth:320,margin:'0 auto',fontWeight:400}}>
            {t.forever}
          </div>
        </div>
        <div style={{padding:'16px 20px 48px'}}>
          {[
            {id:'iglesia', data:t.iglesia, icon:'church'},
            {id:'banda',   data:t.banda,   icon:'music'},
            {id:'academia',data:t.academia,icon:'school', disabled:true},
          ].map(item=>(
            <button key={item.id}
              onClick={()=>!item.disabled&&(setAppMode(item.id),setOnboarded(true))}
              style={{
                width:'100%',padding:'18px 20px',marginBottom:10,
                borderRadius:16,display:'flex',alignItems:'center',gap:16,
                border:`1px solid ${item.disabled?'rgba(255,255,255,.05)':'rgba(200,169,126,.2)'}`,
                background:item.disabled?'rgba(255,255,255,.01)':'rgba(200,169,126,.04)',
                cursor:item.disabled?'not-allowed':'pointer',
                opacity:item.disabled?.35:1,
                textAlign:'left',transition:'all .2s',
              }}>
              <div style={{
                width:44,height:44,borderRadius:12,flexShrink:0,
                background:item.disabled?'rgba(255,255,255,.03)':'rgba(200,169,126,.08)',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                {item.icon==='church'&&(
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                    stroke={item.disabled?'rgba(255,255,255,.2)':'#c8a97e'} strokeWidth="1.5">
                    <path d="M18 22H6a2 2 0 0 1-2-2V7l4-4h8l4 4v13a2 2 0 0 1-2 2z"/>
                    <line x1="12" y1="2" x2="12" y2="7"/>
                    <line x1="9" y1="11" x2="15" y2="11"/>
                  </svg>
                )}
                {item.icon==='music'&&(
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                    stroke={item.disabled?'rgba(255,255,255,.2)':'#c8a97e'} strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                )}
                {item.icon==='school'&&(
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                    stroke="rgba(255,255,255,.2)" strokeWidth="1.5">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                )}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{fontSize:16,fontWeight:900,
                    color:item.disabled?'rgba(255,255,255,.2)':'#ede9ff'}}>
                    {item.data.title}
                  </span>
                  {item.disabled&&(
                    <span style={{fontSize:9,fontWeight:700,
                      color:'rgba(255,255,255,.2)',letterSpacing:'1px',
                      textTransform:'uppercase'}}>
                      {t.soon}
                    </span>
                  )}
                </div>
                <div style={{fontSize:11,color:item.disabled?'rgba(255,255,255,.12)':'rgba(255,255,255,.4)',
                  lineHeight:1.4,fontWeight:400}}>
                  {item.data.sub}
                </div>
              </div>
              {!item.disabled&&(
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                  stroke="rgba(200,169,126,.4)" strokeWidth="2" style={{flexShrink:0}}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

    // ── Modo Banda — completamente separado ────────────────────────────────────
  if(appMode==='banda'){
    return(
      <div style={{minHeight:'100vh',background:'#07070f',color:'#ede9ff',fontFamily:"'Lato',sans-serif"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Special+Gothic+Expanded+One&family=Lato:wght@400;700;900&display=swap');`}</style>
        <BandaApp onBack={()=>setAppMode(null)} userRole={userRole} css={css} themeStyle={themeStyle}/>
      </div>
    );
  }

  return(
    <div style={themeStyle}>
      <style>{css}</style>
      <div className="bg-fx"/>
      <nav className={`sb${sbCol?' col':''}`}>
        <div className="sb-top">
          <div className="logo-mk"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
          <div className="logo-txt"><h1>Setlist</h1><span>{modeData.tagline}</span></div>
          <div className="sb-r">
            <button className="sb-btn" onClick={()=>setSbCol(c=>!c)}>
              {sbCol?<svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>:<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>}
            </button>
          </div>
        </div>
        <div className="sb-foot">
          <div className="u-chip">
            <div className="u-av">DM</div>
            <div className="u-inf">
              <div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>Danny</div>
              <div style={{fontSize:9,color:'var(--ac)',textTransform:'uppercase',letterSpacing:'1px',fontWeight:700}}>Super Admin</div>
            </div>
          </div>
        </div>
      </nav>

      <main className={`main${sbCol?' col':''}`}>
        <div style={{display:'flex',overflowX:'hidden',gap:0,padding:'0',scrollbarWidth:'none',background:'rgba(8,7,14,.28)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',boxShadow:'inset 0 -1px 0 rgba(255,255,255,.06)',isolation:'isolate',position:'sticky',top:0,zIndex:40}}>
          {MESES.map((m,i)=>(
            <div key={m} onClick={()=>{setMesNav(i);setView('admin');}} style={{flex:1,padding:'5px 2px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,margin:'3px 1px',borderRadius:5,border:'1px solid transparent',background:mesNav===i?'rgba(200,169,126,.12)':i===mesActual?'rgba(200,169,126,.07)':'transparent',transition:'all .15s',minWidth:0}}>
              <span style={{fontSize:8,fontWeight:mesNav===i?700:i===mesActual?600:400,color:mesNav===i?'var(--ac)':i===mesActual?'rgba(200,169,126,.65)':'var(--tx3)',textTransform:'uppercase',letterSpacing:'.3px'}}>{m}</span>
              {(()=>{
                const evCount=(i===new Date().getMonth()?Object.values(SETLISTS).filter(v=>v!==null).length:0)+EVENTOS_ESPECIALES.filter(e=>e.mes===i+1).length;
                if(i===mesActual)return(<span style={{fontSize:12,fontWeight:700,color:mesNav===i?'var(--ac)':'rgba(200,169,126,.5)',lineHeight:1.1}}>{new Date().getDate()}</span>);
                return evCount>0?(<span style={{fontSize:8,fontWeight:700,color:mesNav===i?'var(--ac)':'rgba(255,255,255,.22)',lineHeight:1}}>{evCount}</span>):null;
              })()}
            </div>
          ))}
        </div>
        <div className="pw">
          {view==='admin'&&<AdminView mode={mode} activeSunday={activeSunday} userRole={userRole} onRehearsal={()=>setRehearsal(true)} onToast={showToast} onSelectDay={day=>{setActiveSunday(day);setView('misetlist');}} mesNav={mesNav}/>}
          {view==='cancionero'&&<Cancionero mode={mode} onOpenSong={(name)=>{const sl=activeSl;const idx=sl.findIndex(s=>s.name===name);if(idx>=0)setSongView(idx);}} />}
          {view==='equipos'&&<EquiposView onToast={showToast} onGestionar={()=>{setView('backstage');}}/>}
          {view==='premiere'&&<PremiereView onToast={showToast}/>}
          {view==='equipos'&&<EquiposView onToast={showToast} onGestionar={()=>setView('backstage')}/>}
          {view==='backstage'&&<BackstageView userRole={userRole} onToast={showToast} pastorData={pastorData} setPastorData={setPastorData} eventos={eventos} setEventos={setEventos} pastorData={pastorData} setPastorData={setPastorData} eventos={eventos} setEventos={setEventos} mode={mode} onSetTheme={setTheme} onGetTheme={()=>theme}/>}
          {view==='misetlist'&&<MiSetlist activeSunday={activeSunday} onOpenSong={i=>setSongView(i)} onLive={()=>setRehearsal(true)} userRole={userRole} onToast={showToast}/>}
        </div>
      </main>

      <nav className="bot">
        {BNS.map(n=>(
          <div key={n.id} className={`bn${view===n.id?' on':''}`} onClick={()=>setView(n.id)}>
            <NavIco id={n.id} active={view===n.id}/><span className="bn-lb">{n.label}</span>
          </div>
        ))}
      </nav>

      {songView!==null&&activeSl.length>0&&(
        <SongView songs={activeSl} startIdx={songView} onClose={()=>setSongView(null)} theme={theme} isAdmin={isAdmin} onSaveChords={(name,content)=>handleSaveChords(name,content)}/>
      )}
      {rehearsal&&activeSl.length>0&&(
        <Rehearsal songs={activeSl} onClose={()=>setRehearsal(false)} onToast={showToast}/>
      )}
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
if (window.__hideLoading) window.__hideLoading();
