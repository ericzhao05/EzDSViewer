import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './KdTreeView.css';

const PLANE = 320;
const PAD = 24;
const AXES = ['x', 'y'];
const key = (p) => p.join(',');

// Flatten the nested tree; also compute each node's partition cell and tree-drawing position.
export function layout(root) {
  const nodes = [];
  const lines = [];
  let col = 0;
  const walk = (n, depth, cell, parent) => {
    if (!n) return;
    const item = { point: n.point, axis: n.axis, depth, parent };
    const [x0, x1, y0, y1] = cell;
    const v = n.point[n.axis];
    if (n.axis === 0) {
      lines.push({ axis: 0, at: v, from: y0, to: y1, point: n.point });
    } else {
      lines.push({ axis: 1, at: v, from: x0, to: x1, point: n.point });
    }
    const leftCell = n.axis === 0 ? [x0, v, y0, y1] : [x0, x1, y0, v];
    const rightCell = n.axis === 0 ? [v, x1, y0, y1] : [x0, x1, v, y1];
    walk(n.left, depth + 1, leftCell, item);
    item.col = col++;
    nodes.push(item);
    walk(n.right, depth + 1, rightCell, item);
  };
  walk(root, 0, [-Infinity, Infinity, -Infinity, Infinity], null);
  return { nodes, lines };
}

function describe(op, r) {
  switch (op) {
    case 'insert':
      return r.inserted
        ? `Inserted (${r.point.join(', ')})`
        : `(${r.point.join(', ')}) is already in the tree; nothing changed`;
    case 'search':
      return `(${r.point.join(', ')}) ${r.found ? 'is in' : 'is not in'} the tree`;
    case 'nearest':
      return `Nearest to (${r.query.join(', ')}) is (${r.point.join(', ')}), squared distance ${r.distance_squared}; visited ${r.visited.length} node${r.visited.length === 1 ? '' : 's'}`;
    default:
      return '';
  }
}

export default function KdTreeView() {
  const { state, error, loading, run } = useDsState('kd-tree');
  const [xText, setXText] = useState('');
  const [yText, setYText] = useState('');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [query, setQuery] = useState(null);
  const [visited, setVisited] = useState([]);
  const [best, setBest] = useState(null);

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result) : '');
    if (data && op === 'nearest') {
      setQuery(data.result.query);
      setVisited(data.result.visited.map(key));
      setBest(key(data.result.point));
    } else {
      setQuery(null);
      setVisited([]);
      setBest(null);
    }
    return data;
  };

  const withPoint = (op) => {
    const ok = (t) => t.trim() !== '' && Number.isFinite(Number(t));
    if (!ok(xText) || !ok(yText)) {
      setLocalError('Please enter a number for both x and y');
      return;
    }
    exec(op, { point: [Number(xText), Number(yText)] });
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const { nodes, lines } = loaded ? layout(state.root) : { nodes: [], lines: [] };

  // plane scale
  const xs = nodes.map((n) => n.point[0]).concat(query ? [query[0]] : []);
  const ys = nodes.map((n) => n.point[1]).concat(query ? [query[1]] : []);
  const lo = (a) => (a.length ? Math.min(...a) - 1 : 0);
  const hi = (a) => (a.length ? Math.max(...a) + 1 : 10);
  const [minX, maxX, minY, maxY] = [lo(xs), hi(xs), lo(ys), hi(ys)];
  const sx = (v) => PAD + ((Math.min(Math.max(v, minX), maxX) - minX) / (maxX - minX)) * (PLANE - 2 * PAD);
  const sy = (v) => PLANE - PAD - ((Math.min(Math.max(v, minY), maxY) - minY) / (maxY - minY)) * (PLANE - 2 * PAD);

  // tree scale
  const GX = 44;
  const GY = 56;
  const treeW = Math.max(nodes.length, 1) * GX + 20;
  const treeH = (nodes.reduce((m, n) => Math.max(m, n.depth), 0) + 1) * GY + 20;
  const tx = (n) => 20 + n.col * GX;
  const ty = (n) => 28 + n.depth * GY;

  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );

  const nodeClass = (n) => {
    const k = key(n.point);
    if (k === best) return 'kdtree-node kdtree-node-best';
    if (visited.includes(k)) return 'kdtree-node kdtree-node-visited';
    return 'kdtree-node';
  };

  return (
    <div className="ds-container">
      <h2>kd-tree Visualization</h2>
      <p className="kdtree-intro">
        A kd-tree partitions k-dimensional points. Each level splits on one axis in turn (here x,
        then y, then x again): smaller coordinates go left, greater or equal go right. It speeds up
        nearest-neighbor search, because a splitting line can rule out a whole side.
      </p>
      <p className="kdtree-complexity">
        Insert and search are O(log n) on average for a balanced tree, O(n) when insertions
        arrive in sorted order. Nearest-neighbor search is O(log n) on average and O(n) in the
        worst case. Space is O(n).
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls">
        <input
          type="text"
          inputMode="decimal"
          aria-label="x"
          placeholder="x"
          value={xText}
          onChange={(e) => setXText(e.target.value)}
          disabled={loading}
        />
        <input
          type="text"
          inputMode="decimal"
          aria-label="y"
          placeholder="y"
          value={yText}
          onChange={(e) => setYText(e.target.value)}
          disabled={loading}
        />
        {btn('Insert', () => withPoint('insert'))}
        {btn('Search', () => withPoint('search'))}
        {btn('Nearest', () => withPoint('nearest'))}
        {btn('Clear', () => exec('clear'))}
        {btn('Reset', () => exec('reset'))}
      </div>

      {message && <div className="kdtree-result" role="status">{message}</div>}

      {loaded && nodes.length === 0 && <p className="empty-message">Tree is empty.</p>}

      {loaded && nodes.length > 0 && (
        <>
          <section className="kdtree-section" aria-label="Plane partition">
            <h3>Plane partition</h3>
            <p>Each point splits the region it lives in.</p>
            <p className="kdtree-key">
              <svg width="28" height="10" aria-hidden="true"><line className="kdtree-split-x" x1="0" y1="5" x2="28" y2="5" /></svg>
              {' '}splits on x
              <svg width="28" height="10" aria-hidden="true"><line className="kdtree-split-y" x1="0" y1="5" x2="28" y2="5" /></svg>
              {' '}splits on y
            </p>
            <div className="kdtree-scroll">
              <svg
                className="kdtree-svg"
                data-testid="kdtree-plane"
                width={PLANE}
                height={PLANE}
                viewBox={`0 0 ${PLANE} ${PLANE}`}
                role="img"
                aria-label="Partition of the plane by the kd-tree"
              >
                <rect className="kdtree-frame" x={PAD} y={PAD} width={PLANE - 2 * PAD} height={PLANE - 2 * PAD} />
                {lines.map((l) => {
                  const a = Number.isFinite(l.from) ? l.from : l.axis === 0 ? minY : minX;
                  const b = Number.isFinite(l.to) ? l.to : l.axis === 0 ? maxY : maxX;
                  return l.axis === 0 ? (
                    <line key={key(l.point)} data-testid="kdtree-split" className="kdtree-split-x"
                      x1={sx(l.at)} x2={sx(l.at)} y1={sy(a)} y2={sy(b)} />
                  ) : (
                    <line key={key(l.point)} data-testid="kdtree-split" className="kdtree-split-y"
                      x1={sx(a)} x2={sx(b)} y1={sy(l.at)} y2={sy(l.at)} />
                  );
                })}
                {nodes.map((n) => (
                  <g key={key(n.point)}>
                    <circle data-testid="kdtree-point" className={nodeClass(n).replace('kdtree-node', 'kdtree-dot')}
                      cx={sx(n.point[0])} cy={sy(n.point[1])} r="6" />
                    <text className="kdtree-label" x={sx(n.point[0]) + 8} y={sy(n.point[1]) - 8}>
                      {`(${n.point.join(',')})`}
                    </text>
                  </g>
                ))}
                {query && (
                  <g data-testid="kdtree-query">
                    <rect className="kdtree-query" x={sx(query[0]) - 5} y={sy(query[1]) - 5} width="10" height="10" />
                    <text className="kdtree-label" x={sx(query[0]) + 8} y={sy(query[1]) + 16}>query</text>
                  </g>
                )}
                <text className="kdtree-label" x={PAD} y={PLANE - 6}>x: {minX} to {maxX}</text>
                <text className="kdtree-label" x={PAD} y={12}>y: {minY} to {maxY}</text>
              </svg>
            </div>
          </section>

          <section className="kdtree-section" aria-label="Tree">
            <h3>Tree</h3>
            <p>Each node shows its point and the axis it splits on. Left is smaller, right is greater or equal.</p>
            <div className="kdtree-scroll">
              <svg
                className="kdtree-svg"
                data-testid="kdtree-tree"
                width={treeW}
                height={treeH}
                viewBox={`0 0 ${treeW} ${treeH}`}
                role="img"
                aria-label="kd-tree"
              >
                {nodes.filter((n) => n.parent).map((n) => (
                  <line key={`e${key(n.point)}`} data-testid="kdtree-edge" className="kdtree-edge"
                    x1={tx(n.parent)} y1={ty(n.parent)} x2={tx(n)} y2={ty(n)} />
                ))}
                {nodes.map((n) => (
                  <g key={key(n.point)} data-testid="kdtree-node">
                    <rect className={nodeClass(n)} x={tx(n) - 20} y={ty(n) - 14} width="40" height="28" rx="6" />
                    <text className="kdtree-node-text" x={tx(n)} y={ty(n) - 3}>{n.point.join(',')}</text>
                    <text className="kdtree-axis-text" x={tx(n)} y={ty(n) + 8}>{AXES[n.axis]}</text>
                  </g>
                ))}
              </svg>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
