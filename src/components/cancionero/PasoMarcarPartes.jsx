import { BLOQUE_COLORS, getColorBloque } from '../songview/estructura';
import { LABELS_DISPONIBLES } from '../../hooks/useMarcarPartes';

/**
 * PasoMarcarPartes
 * UI para Paso 2: el usuario selecciona tramos de texto y los etiqueta
 * con chips (Intro, Verso, Coro, etc.). Los tramos aparecen coloreados
 * en el textarea mientras se edita.
 *
 * Props:
 * - texto: string del paso 1
 * - tramos: array de {start, end, label, text, isRepetido}
 * - seleccionActual: {start, end, text} o null
 * - sugerenciaRepetido: {tramoPrevio, tramoPrevioIdx} o null
 * - onTextSelection: callback para capturar selección
 * - onTextoChange: callback para editar texto
 * - etiquetarSeleccion: (label, isRepetido) => void
 * - eliminarTramo: (idx) => void
 * - onContinuar: callback para ir a paso 3
 * - onVolver: callback para volver a paso 1
 */
export function PasoMarcarPartes({
  texto,
  tramos,
  seleccionActual,
  sugerenciaRepetido,
  onTextSelection,
  onTextoChange,
  etiquetarSeleccion,
  eliminarTramo,
  onContinuar,
  onVolver,
}) {
  // Render del texto con tramos coloreados como fondo
  // (usando div contentEditable o textarea con overlay)
  const renderTextoConTramos = () => {
    if (!tramos.length) return null;

    // Crear spans coloreados para cada tramo
    const spans = [];
    let lastEnd = 0;

    const tramosOrdenados = [...tramos].sort((a, b) => a.start - b.start);

    tramosOrdenados.forEach((tramo, idx) => {
      // Texto antes del tramo
      if (lastEnd < tramo.start) {
        spans.push(
          <span key={`text-${idx}`}>
            {texto.slice(lastEnd, tramo.start)}
          </span>
        );
      }

      // El tramo coloreado
      const color = getColorBloque(tramo.label);
      spans.push(
        <span
          key={`tramo-${idx}`}
          style={{
            backgroundColor: color + '33', // transparencia
            borderLeft: `3px solid ${color}`,
            padding: '2px 4px',
          }}
          title={tramo.label + (tramo.isRepetido ? ' (referencia)' : '')}
        >
          {tramo.text}
        </span>
      );

      lastEnd = tramo.end;
    });

    // Texto restante
    if (lastEnd < texto.length) {
      spans.push(
        <span key="text-final">
          {texto.slice(lastEnd)}
        </span>
      );
    }

    return spans;
  };

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
        Paso 2 de 3
      </div>
      <div style={{
        fontSize: 16,
        fontWeight: 500,
        color: 'var(--text-primary)',
        marginBottom: 4,
      }}>
        Marcá las partes
      </div>
      <div style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        marginBottom: 12,
      }}>
        Seleccioná un tramo de texto y tocá el chip que corresponde.
      </div>

      {/* ── Área de texto editable con tramos coloreados ── */}
      <div
        id="text-input-paso2"
        contentEditable
        suppressContentEditableWarning
        onInput={e => onTextoChange(e.currentTarget.textContent)}
        onMouseUp={onTextSelection}
        onTouchEnd={onTextSelection}
        style={{
          width: '100%',
          minHeight: 120,
          maxHeight: 200,
          padding: 10,
          borderRadius: 10,
          border: '0.5px solid var(--border)',
          backgroundColor: 'var(--surface-2)',
          color: 'var(--text-primary)',
          fontSize: 13,
          fontFamily: "'Outfit',sans-serif",
          overflowY: 'auto',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          outline: 'none',
          marginBottom: 12,
        }}
      >
        {renderTextoConTramos()}
      </div>

      {/* ── Chip para reutilizar bloque detectado como repetido ── */}
      {sugerenciaRepetido && seleccionActual && (
        <div style={{
          padding: 10,
          borderRadius: 10,
          backgroundColor: 'var(--bg-accent)',
          borderLeft: '3px solid var(--border-accent)',
          marginBottom: 12,
          fontSize: 12,
          color: 'var(--text-primary)',
        }}>
          <div style={{ marginBottom: 6 }}>
            ¿Es el mismo <strong>{sugerenciaRepetido.tramoPrevio.label}</strong> de arriba?
          </div>
          <button
            onClick={() => etiquetarSeleccion(sugerenciaRepetido.tramoPrevio.label, true)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--fill-primary)',
              color: 'var(--on-primary)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sí, reutilizar
          </button>
        </div>
      )}

      {/* ── Fila de chips de labels disponibles ── */}
      {seleccionActual && !sugerenciaRepetido && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginBottom: 8,
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}>
            Seleccionado — elegí la etiqueta
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}>
            {LABELS_DISPONIBLES.map(label => {
              const color = getColorBloque(label);
              return (
                <button
                  key={label}
                  onClick={() => etiquetarSeleccion(label, false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 600,
                    border: `1px solid ${color}45`,
                    background: `${color}15`,
                    color: color,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.target.style.background = `${color}25`;
                    e.target.style.borderColor = `${color}60`;
                  }}
                  onMouseLeave={e => {
                    e.target.style.background = `${color}15`;
                    e.target.style.borderColor = `${color}45`;
                  }}
                >
                  {label}
                </button>
              );
            })}
            <button
              onClick={() => {
                const custom = prompt('Nombre del bloque personalizado (ej. Preludio):');
                if (custom && custom.trim()) {
                  etiquetarSeleccion(custom.trim().toUpperCase(), false);
                }
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 600,
                border: '1px dashed var(--border-strong)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              + Personalizado
            </button>
          </div>
        </div>
      )}

      {/* ── Lista de tramos etiquetados ── */}
      {tramos.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginBottom: 8,
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}>
            Partes marcadas
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}>
            {tramos.map((tramo, idx) => {
              const color = getColorBloque(tramo.label);
              return (
                <div
                  key={idx}
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
                  }}
                >
                  <span style={{ maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tramo.label}
                  </span>
                  {tramo.isRepetido && <span style={{ opacity: 0.6, fontSize: 9 }}>ref</span>}
                  <button
                    onClick={() => eliminarTramo(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 11,
                      color: color,
                      opacity: 0.6,
                    }}
                    title="Eliminar esta etiqueta"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
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
          onClick={onContinuar}
          disabled={tramos.length === 0}
          style={{
            flex: 2,
            padding: 10,
            borderRadius: 10,
            background: tramos.length > 0 ? 'var(--fill-primary)' : 'var(--fill-disabled)',
            color: 'var(--on-primary)',
            border: 'none',
            cursor: tramos.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: 13,
            fontWeight: 700,
            opacity: tramos.length > 0 ? 1 : 0.5,
          }}
        >
          Continuar a estructura
        </button>
      </div>
    </div>
  );
}
