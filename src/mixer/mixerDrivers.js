// mixerDrivers.js — Capa de drivers de mesas digitales (v36/v37-ampliación).
//
// Interfaz común para que MonitorPanel (SongView.jsx) no necesite saber
// qué marca está conectada — todos los drivers exponen:
//   connect() / disconnect()  → Promise
//   onStatusChange(cb)        → cb('conectando'|'conectado'|'error'|'desconectado')
//   setFaderLevel(bus, ch, v) → v entre 0 y 1. bus SIEMPRE 1-4 (envío a bus
//                               de monitor personal — nunca al mix principal)
//   setMute(bus, ch, bool)
//   onFaderChange(bus, ch, cb) → devuelve {unsubscribe()}
//   onMuteChange(bus, ch, cb)  → devuelve {unsubscribe()}
//
// ── SOUNDCRAFT — funciona directo desde el navegador (WebSocket nativo) ──
// ── BEHRINGER/MIDAS — funciona HOY TAMBIÉN, pero necesita un puente local
// ─────────────────────────────────────────────────────────────────────────
// Investigación 01-Jul-2026 (ver contexto v37 en Drive): el protocolo real
// de Behringer/Midas (X32/M32/XR/MR) es OSC sobre UDP, puerto 10023 (X32/
// M32) o 10024 (XR/MR). Los navegadores NO pueden abrir sockets UDP crudos
// — por eso SetSync no puede hablarle a la mesa DIRECTO. La solución real
// (usada por herramientas profesionales del ecosistema X32) es un PUENTE
// LOCAL: un programa chico (Node.js) que corre en un notebook/mini-PC en
// la MISMA red que la mesa, escucha WebSocket de un lado y reenvía OSC/UDP
// real del otro. El navegador SÍ puede hablar WebSocket sin problema.
//
//   [SetSync en el celular] --WebSocket--> [puente local, Node.js] --OSC/UDP--> [X32/M32]
//
// Puente recomendado: x32-proxy (github.com/audiopump/x32-proxy, MIT) —
// ya hecho a medida para esto, sirve un WS en el mismo notebook. Alternativa
// genérica: osc-js con su BridgePlugin (ver bridge-behringer-ejemplo.js
// entregado junto a este archivo). Alguien del equipo de sonido debe dejar
// ese programa corriendo en un notebook conectado al WiFi de la mesa antes
// del ensayo/servicio — igual que hoy se necesita un notebook para X32-Edit.
//
// Direcciones OSC confirmadas (X32/M32, protocolo documentado por
// Patrick-Gilles Maillot — la referencia más completa y usada del
// ecosistema X32):
//   /ch/{canal:02d}/mix/{bus:02d}/level  ,f  0.0–1.0   → nivel de envío al bus
//   /ch/{canal:02d}/mix/{bus:02d}/on     ,i  0|1       → 1=activo, 0=apagado
//   /xremote                                            → sin esto cada ~9s,
//     el X32 DEJA de empujar cambios al cliente (quirk real y documentado).
// A propósito NUNCA se usa /ch/xx/mix/fader ni /ch/xx/mix/on (esas tocan el
// MIX PRINCIPAL, lo que sale por el PA) — el monitor personal solo toca
// envíos a bus (aux), por diseño, para que nadie pueda tocar sin querer lo
// que escucha la congregación.
//
// ── YAMAHA (Rivage/DM3 con OSC oficial, o CL/QL/TF con protocolo RCP) y
// ALLEN & HEATH (MIDI sobre TCP) — mismo problema de socket crudo, pero
// las direcciones/protocolo de esos aún no están verificadas acá. Quedan
// como stub hasta investigarlas con el mismo nivel de detalle.

import { SoundcraftUI } from 'soundcraft-ui-connection';
import OSC from 'osc-js';

export const MARCAS_MESA = [
  {id:'soundcraft',     nombre:'Soundcraft',           modelos:'Ui12 · Ui16 · Ui24R',        disponible:true,  puente:false},
  {id:'behringer_midas',nombre:'Behringer / Midas',    modelos:'X32 · M32 · XR18 · MR18',    disponible:true,  puente:true},
  {id:'yamaha_rivage',  nombre:'Yamaha Rivage / DM3',  modelos:'Rivage PM · DM3',             disponible:false, puente:true},
  {id:'yamaha_clql',    nombre:'Yamaha CL / QL / TF',  modelos:'CL · QL · TF',                disponible:false, puente:true},
  {id:'allenheath',     nombre:'Allen & Heath',        modelos:'SQ · dLive · Qu · Avantis',   disponible:false, puente:true},
];

// ── Driver Soundcraft — FUNCIONAL, conexión WebSocket real y directa ──────
export class SoundcraftDriver {
  constructor(ip){
    this.conn = new SoundcraftUI(ip);
    this._statusCb = null;
    this._sub = this.conn.status$.subscribe(ev=>{
      if(!this._statusCb) return;
      const map={OPENING:'conectando',OPEN:'conectado',CLOSE:'desconectado',
        CLOSING:'desconectado',ERROR:'error',RECONNECTING:'conectando'};
      this._statusCb(map[ev.type]||'desconectado');
    });
  }
  connect(){ return this.conn.connect(); }
  disconnect(){ this._sub?.unsubscribe?.(); return this.conn.disconnect(); }
  onStatusChange(cb){ this._statusCb=cb; }
  // bus 0/null → master; 1-4 → aux (bus de monitor personal)
  _canal(bus, ch){ return bus ? this.conn.aux(bus).input(ch) : this.conn.master.input(ch); }
  setFaderLevel(bus, ch, value){ this._canal(bus,ch).setFaderLevel(value); }
  setMute(bus, ch, value){ this._canal(bus,ch).setMute(value); }
  onFaderChange(bus, ch, cb){ return this._canal(bus,ch).faderLevel$.subscribe(cb); }
  onMuteChange(bus, ch, cb){ return this._canal(bus,ch).mute$.subscribe(cb); }
}

// ── Driver Behringer/Midas — FUNCIONAL, pero requiere el puente local ─────
// direccion: "host" o "host:puerto" del PUENTE (no de la mesa directamente).
// Puerto por defecto 8080 (default de x32-proxy y de osc-js BridgePlugin).
export class BehringerMidasDriver {
  constructor(direccion){
    const [host, portStr] = direccion.split(':');
    const port = portStr ? parseInt(portStr,10) : 8080;
    this.osc = new OSC({ plugin: new OSC.WebsocketClientPlugin({host, port}) });
    this._statusCb = null;
    this._xremoteTimer = null;
    this.osc.on('open', ()=>{
      this._statusCb?.('conectado');
      // Quirk real del X32: sin /xremote cada ~9s deja de enviar cambios
      this.osc.send(new OSC.Message('/xremote'));
      this._xremoteTimer = setInterval(()=>this.osc.send(new OSC.Message('/xremote')), 8000);
    });
    this.osc.on('close', ()=>{ this._statusCb?.('desconectado'); clearInterval(this._xremoteTimer); });
    this.osc.on('error', ()=>{ this._statusCb?.('error'); clearInterval(this._xremoteTimer); });
  }
  connect(){
    return new Promise((resolve,reject)=>{
      let resuelto=false;
      const to=setTimeout(()=>{ if(!resuelto){ resuelto=true; reject(new Error(
        'No se pudo conectar al puente local — ¿está corriendo el programa puente en la red? Ver bridge-behringer-ejemplo.js')); } }, 6000);
      this.osc.on('open', ()=>{ if(!resuelto){ resuelto=true; clearTimeout(to); resolve(); } });
      this.osc.on('error', ()=>{ if(!resuelto){ resuelto=true; clearTimeout(to); reject(new Error(
        'No se pudo conectar al puente local — revisa que esté corriendo y en la misma red')); } });
      this.osc.open();
    });
  }
  disconnect(){ clearInterval(this._xremoteTimer); this.osc.close(); return Promise.resolve(); }
  onStatusChange(cb){ this._statusCb=cb; }
  _ch(n){ return String(n).padStart(2,'0'); }
  _bus(n){ return String(n).padStart(2,'0'); }
  // bus SIEMPRE 1-4 acá — el monitor personal solo toca envíos a bus (aux),
  // nunca /mix/fader ni /mix/on (esos son el mix principal, el PA)
  setFaderLevel(bus, ch, value){
    this.osc.send(new OSC.Message(`/ch/${this._ch(ch)}/mix/${this._bus(bus)}/level`, value));
  }
  setMute(bus, ch, value){
    this.osc.send(new OSC.Message(`/ch/${this._ch(ch)}/mix/${this._bus(bus)}/on`, value?0:1)); // 1=activo, 0=apagado
  }
  onFaderChange(bus, ch, cb){
    const addr=`/ch/${this._ch(ch)}/mix/${this._bus(bus)}/level`;
    const id=this.osc.on(addr, msg=>cb(msg.args[0]));
    return {unsubscribe:()=>this.osc.off(addr,id)};
  }
  onMuteChange(bus, ch, cb){
    const addr=`/ch/${this._ch(ch)}/mix/${this._bus(bus)}/on`;
    const id=this.osc.on(addr, msg=>cb(msg.args[0]===0)); // 0=apagado=muteado
    return {unsubscribe:()=>this.osc.off(addr,id)};
  }
}

// ── Drivers pendientes — protocolo aún no verificado con el mismo detalle ─
class DriverPendienteInvestigacion {
  constructor(marca){ this.marca=marca; this._statusCb=null; }
  connect(){
    this._statusCb?.('error');
    return Promise.reject(new Error(
      `${this.marca}: todavía no verificamos el protocolo con el detalle necesario para conectarlo con confianza. Próximamente.`
    ));
  }
  disconnect(){ return Promise.resolve(); }
  onStatusChange(cb){ this._statusCb=cb; }
  setFaderLevel(){}
  setMute(){}
  onFaderChange(){ return {unsubscribe(){}}; }
  onMuteChange(){ return {unsubscribe(){}}; }
}
export class YamahaRivageDriver extends DriverPendienteInvestigacion{ constructor(){super('Yamaha Rivage/DM3 (protocolo OSC)');} }
export class YamahaClQlDriver   extends DriverPendienteInvestigacion{ constructor(){super('Yamaha CL/QL/TF (protocolo RCP)');} }
export class AllenHeathDriver   extends DriverPendienteInvestigacion{ constructor(){super('Allen & Heath (MIDI sobre TCP)');} }

export function crearDriver(marcaId, direccion){
  switch(marcaId){
    case 'soundcraft': return new SoundcraftDriver(direccion);
    case 'behringer_midas': return new BehringerMidasDriver(direccion);
    case 'yamaha_rivage': return new YamahaRivageDriver();
    case 'yamaha_clql': return new YamahaClQlDriver();
    case 'allenheath': return new AllenHeathDriver();
    default: return null;
  }
}

