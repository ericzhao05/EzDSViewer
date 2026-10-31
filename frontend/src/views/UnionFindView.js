import React, { useMemo, useState } from 'react';
import useDsState from '../hooks/useDsState';
import './UnionFindView.css';

const X_GAP = 46;
const Y_GAP = 56;
const R = 16;
const PAD = 24;

// Lays the parent array out as a forest: leaves get consecutive x slots, parents sit above their children.
function layoutForest(parent) {
  const children = parent.map(() => []);
  const roots = [];
  parent.forEach((p, i) => (p === i ? roots.push(i) : children[p].push(i)));
  const pos = {};
  let next = 0;
  let maxDepth = 0;
  const place = (node, depth) => {
    maxDepth = Math.max(maxDepth, depth);
    if (children[node].length === 0) {
      pos[node] = { x: next++, depth };
      return;
    }
    children[node].forEach((c) => place(c, depth + 1));
    const xs = children[node].map((c) => pos[c].x);
    pos[node] = { x: (Math.min(...xs) + Math.max(...xs)) / 2, depth };
  };
  roots.forEach((r) => place(r, 0));
  return { pos, width: Math.max(next, 1), height: maxDepth + 1 };
}

function describe(op, result) {
  switch (op) {
    case 'union':
      return result.merged ? 'Merged the two groups.' : 'Already connected: nothing merged.';
    case 'find':
      return `Root: ${result.root} (path: ${result.path.join(' → ')})`;
    case 'connected':
      return result.connected ? 'Connected: same root.' : 'Not connected: different roots.';
    default:
      return '';
  }
}

export default function UnionFindView() {
  const { state, error, loading, run } = useDsState('union-find');
  const [aText, setAText] = useState('');
  const [bText, setBText] = useState('');
  const [sizeText, setSizeText] = useState('8');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const forest = useMemo(() => (state ? layoutForest(state.parent) : null), [state]);

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result) : '');
  };

  const parseNum = (text) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);

  const pair = (op) => {
    const a = parseNum(aText);
    const b = parseNum(bText);
    if (a === null || b === null) {
      setLocalError('Enter whole numbers for both elements');
      return;
    }
    exec(op, { a, b });
  };

  const single = () => {
    const x = parseNum(aText);
    if (x === null) {
      setLocalError('Enter a whole number for element A');
      return;
    }
    exec('find', { x });
  };

  const onInit = () => {
    const size = parseNum(sizeText);
    if (size === null) {
      setLocalError('Size must be a whole number');
      return;
    }
    exec('init', { size });
  };

  const shownError = localError || error;
  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );

  return (
    <div className="ds-container">
      <h2>Union-Find Visualization</h2>
      <p className="union-find-intro">
        Also called a disjoint set. It tracks which group each item belongs to and supports merging
        groups. Path compression and union by rank together bring operations to nearly constant
        amortized time. Use it for connected components, cycle detection in undirected graphs, and
        Kruskal's algorithm.
      </p>
      <p className="union-find-complexity">
        With path compression and union by rank, find and union take nearly constant amortized
        time. Union-find can only merge; it cannot split groups.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!state && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls">
        <input
          type="text"
          aria-label="Element A"
          placeholder="A"
          value={aText}
          onChange={(e) => setAText(e.target.value)}
          disabled={loading}
        />
        <input
          type="text"
          aria-label="Element B"
          placeholder="B"
          value={bText}
          onChange={(e) => setBText(e.target.value)}
          disabled={loading}
        />
        {btn('Union', () => pair('union'))}
        {btn('Connected?', () => pair('connected'))}
        {btn('Find A', single)}
      </div>
      <div className="ds-controls">
        <input
          type="text"
          aria-label="Number of elements"
          value={sizeText}
          onChange={(e) => setSizeText(e.target.value)}
          disabled={loading}
        />
        {btn('New set', onInit)}
        {btn('Reset', async () => {
          setLocalError('');
          const d = await run('reset');
          setMessage(d ? 'Reset.' : '');
        })}
      </div>

      {message && <div className="union-find-result" role="status">{message}</div>}

      {state && forest && (
        <>
          <p>Components: <strong data-testid="components">{state.components}</strong></p>
          {state.size === 0 ? (
            <p className="empty-message">No elements.</p>
          ) : (
            <>
              <div className="union-find-scroll">
                <svg
                  role="img"
                  aria-label="Union-find forest"
                  width={PAD * 2 + (forest.width - 1) * X_GAP}
                  height={PAD * 2 + (forest.height - 1) * Y_GAP}
                >
                  {state.parent.map((p, i) =>
                    p === i ? null : (
                      <line
                        key={`e${i}`}
                        className="union-find-edge"
                        x1={PAD + forest.pos[i].x * X_GAP}
                        y1={PAD + forest.pos[i].depth * Y_GAP}
                        x2={PAD + forest.pos[p].x * X_GAP}
                        y2={PAD + forest.pos[p].depth * Y_GAP}
                      />
                    )
                  )}
                  {state.parent.map((p, i) => (
                    <g
                      key={`n${i}`}
                      data-testid={`node-${i}`}
                      className={p === i ? 'union-find-node union-find-root' : 'union-find-node'}
                    >
                      <circle
                        cx={PAD + forest.pos[i].x * X_GAP}
                        cy={PAD + forest.pos[i].depth * Y_GAP}
                        r={R}
                      />
                      <text
                        x={PAD + forest.pos[i].x * X_GAP}
                        y={PAD + forest.pos[i].depth * Y_GAP}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {i}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="union-find-scroll">
                <table className="union-find-table" aria-label="Parent and rank arrays">
                  <tbody>
                    <tr>
                      <th scope="row">index</th>
                      {state.parent.map((_, i) => <td key={i}>{i}</td>)}
                    </tr>
                    <tr>
                      <th scope="row">parent</th>
                      {state.parent.map((p, i) => (
                        <td key={i} data-testid={`parent-${i}`}>{p}</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">rank</th>
                      {state.rank.map((r, i) => <td key={i}>{r}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
