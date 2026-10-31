import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './MatrixView.css';

const PALETTE = 6;

export default function MatrixView() {
  const { state, error, loading, run } = useDsState('matrix');
  const [sel, setSel] = useState(null);
  const [value, setValue] = useState('1');
  const [rows, setRows] = useState('');
  const [cols, setCols] = useState('');
  const [labels, setLabels] = useState(null);
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const loaded = state !== null;
  const grid = loaded ? state.grid : [];
  const maxDim = loaded ? state.limits.max_dim : 12;
  const maxCell = loaded ? state.limits.max_cell : 3;

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    if (data) setLabels(null);
    return data;
  };

  const select = (r, c) => {
    setSel({ r, c });
    setValue(grid[r][c]);
  };

  const onSet = async (v) => {
    if (!sel) return;
    if (v === '') {
      setLocalError('Enter a cell value');
      return;
    }
    const d = await exec('set-cell', { row: sel.r, col: sel.c, value: v });
    if (d) setMessage(`Set cell (${sel.r}, ${sel.c}) to "${v}".`);
  };

  const onResize = async () => {
    const r = Number(rows || state.rows);
    const c = Number(cols || state.cols);
    if (![r, c].every((n) => Number.isInteger(n) && n >= 1 && n <= maxDim)) {
      setLocalError(`Rows and columns must be whole numbers from 1 to ${maxDim}`);
      return;
    }
    const d = await exec('resize', { rows: r, cols: c });
    if (d) {
      setSel(null);
      setMessage(`Resized to ${r} x ${c}.`);
    }
  };

  const onRotate = async () => {
    const d = await exec('rotate');
    if (d) setMessage('Rotated 90 degrees clockwise (transpose, then reverse each row).');
  };

  const onIslands = async () => {
    setLocalError('');
    const d = await run('islands');
    if (d) {
      setLabels(d.result.labels);
      setMessage(`Number of islands: ${d.result.count} (cells "1" joined up, down, left, right).`);
    }
  };

  const onReset = async () => {
    const d = await exec('reset');
    if (d) {
      setSel(null);
      setMessage('Matrix reset.');
    }
  };

  const shownError = localError || error;
  const cols_n = loaded ? state.cols : 0;

  return (
    <div className="ds-container">
      <h2>Matrix Visualization</h2>
      <p className="matrix-view-intro">
        A 2D array. Interview problems often treat it as a graph in which each cell connects to its
        neighbors, so most grid problems are BFS or DFS.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}

      {loaded && (
        <div className="matrix-view-stats">
          <span>Rows: <strong>{state.rows}</strong></span>
          <span>Columns: <strong>{state.cols}</strong></span>
        </div>
      )}

      <div className="matrix-view-board" data-testid="matrix-board">
        {!loaded && !shownError && <p className="empty-message">Loading...</p>}
        {loaded && (
          <div
            className="matrix-view-grid"
            role="grid"
            aria-label="Matrix"
            style={{ gridTemplateColumns: `repeat(${cols_n}, 44px)` }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const label = labels ? labels[r][c] : 0;
                const cls = [
                  'matrix-view-cell',
                  label ? `matrix-view-island matrix-view-island-${label % PALETTE}` : '',
                  sel && sel.r === r && sel.c === c ? 'matrix-view-selected' : '',
                ].filter(Boolean).join(' ');
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    role="gridcell"
                    className={cls}
                    aria-label={`Cell ${r},${c}`}
                    onClick={() => select(r, c)}
                    disabled={loading}
                  >
                    {cell}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {message && <div className="matrix-view-result" role="status">{message}</div>}

      <div className="ds-controls">
        <span className="matrix-view-selection">
          {sel ? `Selected: row ${sel.r}, column ${sel.c}` : 'Click a cell to edit it'}
        </span>
        <input
          type="text"
          aria-label="Cell value"
          maxLength={maxCell}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && onSet(value)}
          disabled={loading || !sel}
        />
        <button className="control-btn" onClick={() => onSet(value)} disabled={loading || !sel}>
          Set cell
        </button>
        <button
          className="control-btn"
          onClick={() => onSet(grid[sel.r][sel.c] === '1' ? '0' : '1')}
          disabled={loading || !sel}
        >
          Toggle 0/1
        </button>
      </div>

      <div className="ds-controls">
        <input
          type="number"
          aria-label="Rows"
          placeholder={loaded ? String(state.rows) : 'Rows'}
          min="1"
          max={maxDim}
          value={rows}
          onChange={(e) => setRows(e.target.value)}
          disabled={loading}
        />
        <input
          type="number"
          aria-label="Columns"
          placeholder={loaded ? String(state.cols) : 'Cols'}
          min="1"
          max={maxDim}
          value={cols}
          onChange={(e) => setCols(e.target.value)}
          disabled={loading}
        />
        <button className="control-btn" onClick={onResize} disabled={loading || !loaded}>Resize</button>
        <button className="control-btn" onClick={onRotate} disabled={loading || !loaded}>Rotate clockwise</button>
        <button className="control-btn" onClick={onIslands} disabled={loading || !loaded}>Count islands</button>
        <button className="control-btn" onClick={onReset} disabled={loading}>Reset</button>
      </div>
    </div>
  );
}
