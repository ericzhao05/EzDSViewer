import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './GraphView.css';

const INT = /^-?\d+$/;
const SIZE = 320;
const R = 120;
const NODE_R = 18;

const pos = (i, n) => {
  const a = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
  return { x: SIZE / 2 + R * Math.cos(a), y: SIZE / 2 + R * Math.sin(a) };
};

const key = (a, b) => `${a}-${b}`;

function describe(op, r) {
  switch (op) {
    case 'bfs':
      return `BFS from ${r.start}: ${r.order.join(' → ')}`;
    case 'dfs':
      return `DFS from ${r.start}: ${r.order.join(' → ')}`;
    case 'topological-sort':
      return r.has_cycle
        ? 'Cycle found: no topological order exists (Kahn returned []).'
        : `Topological order: ${r.order.join(' → ')}`;
    case 'dijkstra':
      return `Shortest distances from ${r.start}: ${r.distances
        .map((d, i) => `${i}=${d === null ? '∞' : d}`)
        .join(', ')}`;
    case 'components':
      return `${r.components.length} component(s): ${r.components
        .map((c) => `{${c.join(', ')}}`)
        .join(' ')}`;
    case 'has-cycle':
      return r.has_cycle ? 'The graph has a cycle.' : 'The graph has no cycle.';
    default:
      return '';
  }
}

export default function GraphView() {
  const { state, error, loading, run } = useDsState('graph');
  const [u, setU] = useState('');
  const [v, setV] = useState('');
  const [w, setW] = useState('1');
  const [start, setStart] = useState('0');
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState([]);
  const [treeEdges, setTreeEdges] = useState([]);
  const [localError, setLocalError] = useState('');

  const clearMarks = () => {
    setOrder([]);
    setTreeEdges([]);
  };

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    if (!data) {
      setMessage('');
      clearMarks();
      return;
    }
    const r = data.result;
    const algo = ['bfs', 'dfs', 'topological-sort', 'dijkstra', 'components', 'has-cycle'].includes(op);
    setMessage(algo && r ? describe(op, r) : '');
    setOrder(op === 'bfs' || op === 'dfs' || op === 'topological-sort' ? r.order : []);
    setTreeEdges(r && r.tree_edges ? r.tree_edges : []);
  };

  const num = (text, label) => {
    if (!INT.test(text.trim())) {
      setLocalError(`${label} must be a whole number`);
      return undefined;
    }
    return Number(text.trim());
  };

  const edgeOp = (op) => () => {
    const a = num(u, 'From');
    if (a === undefined) return;
    const b = num(v, 'To');
    if (b === undefined) return;
    if (op === 'add-edge') {
      const weight = num(w, 'Weight');
      if (weight === undefined) return;
      exec(op, { u: a, v: b, w: weight });
    } else exec(op, { u: a, v: b });
  };
  const algoOp = (op) => () => {
    const s = num(start, 'Start');
    if (s !== undefined) exec(op, { start: s });
  };
  const plain = (op) => () => exec(op, {});

  const shownError = localError || error;
  const loaded = state !== null;
  const n = loaded ? state.n : 0;
  const directed = loaded && state.directed;
  const treeSet = new Set(
    treeEdges.map(([a, b]) => (directed ? key(a, b) : key(Math.min(a, b), Math.max(a, b))))
  );

  const renderEdge = (e, i) => {
    const a = pos(e.u, n);
    const b = pos(e.v, n);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const x1 = a.x + ux * NODE_R;
    const y1 = a.y + uy * NODE_R;
    const x2 = b.x - ux * (NODE_R + (directed ? 2 : 0));
    const y2 = b.y - uy * (NODE_R + (directed ? 2 : 0));
    const k = directed ? key(e.u, e.v) : key(Math.min(e.u, e.v), Math.max(e.u, e.v));
    const hot = treeSet.has(k);
    return (
      <g key={i} data-testid={`edge-${e.u}-${e.v}`} className={'graph-edge' + (hot ? ' graph-edge-hot' : '')}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={directed ? 'url(#graph-arrow)' : undefined} />
        <text
          className="graph-weight"
          x={(a.x + b.x) / 2 - uy * 10}
          y={(a.y + b.y) / 2 + ux * 10}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {e.w}
        </text>
      </g>
    );
  };

  return (
    <div className="ds-container">
      <h2>Graph Visualization</h2>
      <p className="graph-intro">
        Vertices connected by edges. Edges can be directed or undirected, weighted or unweighted.
        Trees, grids, and dependency lists are all graphs in disguise. Adjacency lists are the
        default; use a matrix only when the graph is dense or you need O(1) edge checks.
      </p>
      <p className="graph-complexity">
        Complexity: BFS and DFS are O(V + E). Topological sort (Kahn) is O(V + E). Dijkstra with a
        heap is O((V + E) log V) and needs non-negative weights.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}
      {loaded && n === 0 && <p className="empty-message">Graph is empty. Add a node!</p>}

      {loaded && n > 0 && (
        <div className="graph-scroll">
          <svg
            className="graph-svg"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            role="img"
            aria-label={`Graph with ${n} nodes and ${state.edges.length} edges`}
          >
            <defs>
              <marker id="graph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="graph-arrow-head" />
              </marker>
            </defs>
            {state.edges.map(renderEdge)}
            {Array.from({ length: n }, (_, i) => {
              const p = pos(i, n);
              const step = order.indexOf(i);
              return (
                <g key={i} data-testid={`node-${i}`} className={'graph-node' + (step >= 0 ? ' graph-node-hot' : '')}>
                  <circle cx={p.x} cy={p.y} r={NODE_R} />
                  <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central">{i}</text>
                  {step >= 0 && (
                    <text className="graph-step" x={p.x + NODE_R} y={p.y - NODE_R} textAnchor="middle">
                      {step + 1}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {loaded && (
        <div className="graph-stats">
          <span>Nodes: <strong>{n}</strong></span>
          <span>Edges: <strong>{state.edges.length}</strong></span>
          <span>{directed ? 'Directed' : 'Undirected'}</span>
        </div>
      )}

      {message && <div className="graph-result" role="status">{message}</div>}

      <div className="ds-controls">
        <input type="text" aria-label="From node" placeholder="From" value={u} onChange={(e) => setU(e.target.value)} disabled={loading} />
        <input type="text" aria-label="To node" placeholder="To" value={v} onChange={(e) => setV(e.target.value)} disabled={loading} />
        <input type="text" aria-label="Weight" placeholder="Weight" value={w} onChange={(e) => setW(e.target.value)} disabled={loading} />
        <button className="control-btn" onClick={edgeOp('add-edge')} disabled={loading}>Add edge</button>
        <button className="control-btn" onClick={edgeOp('remove-edge')} disabled={loading}>Remove edge</button>
      </div>
      <div className="ds-controls">
        <button className="control-btn" onClick={plain('add-node')} disabled={loading}>Add node</button>
        <button className="control-btn" onClick={plain('remove-node')} disabled={loading}>Remove last node</button>
        <button className="control-btn" onClick={() => exec('set-directed', { directed: !directed })} disabled={loading || !loaded}>
          {directed ? 'Make undirected' : 'Make directed'}
        </button>
        <button className="control-btn" onClick={plain('reset')} disabled={loading}>Reset</button>
      </div>

      <h3>Graph algorithms</h3>
      <div className="ds-controls">
        <input type="text" aria-label="Start node" value={start} onChange={(e) => setStart(e.target.value)} disabled={loading} />
        <button className="control-btn" onClick={algoOp('bfs')} disabled={loading}>BFS</button>
        <button className="control-btn" onClick={algoOp('dfs')} disabled={loading}>DFS</button>
        <button className="control-btn" onClick={algoOp('dijkstra')} disabled={loading}>Dijkstra</button>
        <button className="control-btn" onClick={plain('topological-sort')} disabled={loading}>Topological sort</button>
        <button className="control-btn" onClick={plain('components')} disabled={loading}>Components</button>
        <button className="control-btn" onClick={plain('has-cycle')} disabled={loading}>Has cycle?</button>
      </div>
    </div>
  );
}
