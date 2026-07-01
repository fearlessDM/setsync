// mixerDrivers.js — Capa de drivers de mesas digitales (v36-ampliación).
//
// Interfaz común para que MonitorPanel (SongView.jsx) no necesite saber
// qué marca está conectada — todos los drivers exponen:
//   connect() / disconnect()  → Promise
//   onStatusChange(cb)        → cb('conectando'|'conectado'|'error'|'desconectado')
//   setFaderLevel(bus, ch, v) → v entre 0 y 1. bus=0/null = master, 1-4 = aux
//   setMute(bus, ch, bool)
//   onFaderChange(bus, ch, cb) → devuelve {unsubscribe()}
//   onMuteChange(bus, ch, cb)  → devuelve {unsubscribe()}
//
// ── POR QUÉ SOLO SOUNDCRAFT FUNCIONA HOY ───────────────────────────────
// Investigación 01-Jul-2026 (ver contexto en Drive): OSC (Behringer/Midas,
// Yamaha Rivage/DM3) corre sobre UDP: los navegadores no pueden abrir
// sockets UDP crudos. El RCP de Yamaha CL/QL/TF y el MIDI-sobre-TCP de
// Allen & Heath son TCP crudo: tampoco alcanzable desde un navegador.
// Soundcraft Ui-series es la ÚNICA excepción real: su protocolo es
// WebSocket, que SÍ es nativo del navegador — por eso es el único driver
// funcional mientras SetSync sea una app web. El resto queda listo como
// stub (misma interfaz, mismo selector en la UI) y se activa solo con la
// migración a Capacitor (app nativa, con acceso real a sockets UDP/TCP).
//
// Librería usada para Soundcraft: soundcraft-ui-connection (MIT, npm),
// mantenida activamente por fmalcher, RxJS empaquetado internamente (sin
// dependencias externas que instalar aparte).

import { SoundcraftUI } from 'soundcraft-ui-connection';

export const MARCAS_MESA = [
  {id:'soundcraft',     nombre:'Soundcraft',           modelos:'Ui12 · Ui16 · Ui24R',        disponible:true},
  {id:'behringer_midas',nombre:'Behringer / Midas',    modelos:'X32 · M32 · XR18 · MR18',    disponible:false},
  {id:'yamaha_rivage',  nombre:'Yamaha Rivage / DM3',  modelos:'Rivage PM · DM3',             disponible:false},
  {id:'yamaha_clql',    nombre:'Yamaha CL / QL / TF',  modelos:'CL · QL · TF',                disponible:false},
  {id:'allenheath',     nombre:'Allen & Heath',        modelos:'SQ · dLive · Qu · Avantis',   disponible:false},
];

// ── Driver Soundcraft — FUNCIONAL, conexión WebSocket real ────────────────
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

// ── Drivers pendientes — requieren app nativa (Capacitor) ─────────────────
class DriverPendienteCapacitor {
  constructor(marca){ this.marca=marca; this._statusCb=null; }
  connect(){
    this._statusCb?.('error');
    return Promise.reject(new Error(
      `${this.marca}: esta mesa se conecta por una red que el navegador no puede usar directamente. Disponible cuando salga la app nativa de SetSync.`
    ));
  }
  disconnect(){ return Promise.resolve(); }
  onStatusChange(cb){ this._statusCb=cb; }
  setFaderLevel(){}
  setMute(){}
  onFaderChange(){ return {unsubscribe(){}}; }
  onMuteChange(){ return {unsubscribe(){}}; }
}
export class BehringerMidasDriver extends DriverPendienteCapacitor{ constructor(){super('Behringer/Midas (protocolo OSC)');} }
export class YamahaRivageDriver  extends DriverPendienteCapacitor{ constructor(){super('Yamaha Rivage/DM3 (protocolo OSC)');} }
export class YamahaClQlDriver    extends DriverPendienteCapacitor{ constructor(){super('Yamaha CL/QL/TF (protocolo RCP)');} }
export class AllenHeathDriver    extends DriverPendienteCapacitor{ constructor(){super('Allen & Heath (MIDI sobre TCP)');} }

export function crearDriver(marcaId, ip){
  switch(marcaId){
    case 'soundcraft': return new SoundcraftDriver(ip);
    case 'behringer_midas': return new BehringerMidasDriver();
    case 'yamaha_rivage': return new YamahaRivageDriver();
    case 'yamaha_clql': return new YamahaClQlDriver();
    case 'allenheath': return new AllenHeathDriver();
    default: return null;
  }
}
