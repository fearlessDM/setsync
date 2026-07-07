import { useState, useRef } from 'react';
import { getColorBloque } from '../songview/estructura';

/**
 * PasoEstructura (Paso 3)
 * UI para armar el mapa/estructura: el usuario ordena los bloques
 * que etiquetó en el paso 2. Puede repetir bloques (Coro x2, etc.)
 *
 * Props:
 * - bloquesPaso3: array de labels únicos disponibles (["INTRO", "VERSO", "CORO", ...])
 * - onEstructuraCompleta: (mapaArray) => void, callback cuando confirma
 * - onVolver: callback para volver a paso 2
 */
export function PasoEstructura({ bloquesPaso3, onEstructuraCompleta, onVolver }) {
  const [mapa, setMapa] = useState([]); // array de {label, seqId}
  const dragIdx = useRef(null);

  const agregarAlMapa = (label) => {
    const nuevoItem = { label, seqId: Date.now() + Math.random() };
    setMapa(prev => [...prev, nuevoItem]);
  };

  const eliminarDelMapa = (idx) => {
    setMapa(prev => prev.filter((_, i) => i !== idx));
  };

  const reordenarMapa = (fromIdx, toIdx) => {
    const newMapa = [...mapa];
    const [moved] = newMapa.splice(fromIdx, 1);
    newMapa.splice(toIdx, 0, moved);
    setMapa(newMapa);
  };

  const reset = () => {
    setMapa([]);
  };

  // ── Mouse drag ──
  const onMouseDownItem = (i) => (e) => {
    e.preventDefault();
    dragIdx.current = i;
    const el = e.currentTarget;
    el.style.opacity = '0.5';
    el.style.transform = 'scale(1.05)';
    el.style.cursor = 'grabbing';

    const onMove = (ev) => {
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const item = target?.closest('[data-estructura-idx]');
      document.querySelectorAll('[data-estructura-idx]').forEach(n => {
        if (n !== el) n.style.background = '';
      });
      if (item) {
        const targetIdx = parseInt(item.dataset.estructuraIdx);
        if (dragIdx.current !== null && targetIdx !== dragIdx.current) {
          item.style.background = 'rgba(255,255,255,.1)';
          reordenarMapa(dragIdx.current, targetIdx);
          dragIdx.current = targetIdx;
        }
      }
    };

    const onUp = () => {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.cursor = 'grab';
      document.querySelectorAll('[data-estructura-idx]').forEach(n => {
        n.style.background = '';
      });
      dragIdx.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
        Paso 3 de 3
      </div>
      <div style={{
        fontSize: 16,
        fontWeight: 500,
        color: 'var(--text-primary)',
        marginBottom: 4,
      }}>
        Armá el orden de interpretación
      </div>
      <div style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        marginBottom: 12,
      }}>
        Tocá los bloques para agregarlos al mapa. Podés repetir. Arrastra para reordenar.
      </div>

      {/* ── Mapa actual (visual horizontal) ── */}
      {mapa.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginBottom: 8,
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}>
            Estructura actual
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: 8,
            borderRadius: 10,
            border: '0.5px solid var(--border)',
            backgroundColor: 'var(--surface-2)',
            minHeight: 40,
            alignItems: 'center',
          }}>
            {mapa.map((item, idx) => {
              const color = getColorBloque(item.label);
              return (
                <div key={item.seqId} data-estructura-idx={idx}>
                  <div
                    onMouseDown={onMouseDownItem(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: `${color}18`,
                      border: `1px solid ${color}45`,
                      fontSize: 10,
                      color: color,
                      fontWeight: 600,
                      cursor: 'grab',
                      userSelect: 'none',
                      transition: 'transform 0.15s, opacity 0.15s',
                    }}
                  >
                    <span>{item.label}</span>
                    <button
                      onClick={() => eliminarDelMapa(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 10,
                        color: color,
                        opacity: 0.6,
                      }}
                      title="Eliminar del mapa"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Botones para agregar bloques al mapa ── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 8,
          textTransform: 'uppercase',
          fontWeight: 600,
          letterSpacing: '0.5px',
        }}>
          Tocá para agregar al mapa
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}>
          {bloquesPaso3.map(label => {
            const color = getColorBloque(label);
            return (
              <button
                key={label}
                onClick={() => agregarAlMapa(label)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  border: `1px solid ${color}45`,
                  background: `${color}18`,
                  color: color,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.target.style.background = `${color}25`;
                  e.target.style.borderColor = `${color}60`;
                }}
                onMouseLeave={e => {
                  e.target.style.background = `${color}18`;
                  e.target.style.borderColor = `${color}45`;
                }}
              >
                + {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Botón Reset ── */}
      {mapa.length > 0 && (
        <button
          onClick={reset}
          style={{
            width: '100%',
            padding: 8,
            marginBottom: 12,
            borderRadius: 10,
            border: '0.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Limpiar mapa
        </button>
      )}

      {/* ── Botones de navegación ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onVolver}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Volver
        </button>
        <button
          onClick={() => onEstructuraCompleta(mapa)}
          disabled={mapa.length === 0}
          style={{
            flex: 2,
            padding: 10,
            borderRadius: 10,
            background: mapa.length > 0 ? 'var(--fill-primary)' : 'var(--fill-disabled)',
            color: 'var(--on-primary)',
            border: 'none',
            cursor: mapa.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: 13,
            fontWeight: 700,
            opacity: mapa.length > 0 ? 1 : 0.5,
          }}
        >
          Guardar canción
        </button>
      </div>
    </div>
  );
}
