import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './QuadtreeView.css';

const PAD = 4;
const SCALE = 4;

function flatten(node, out = []) {
  out.push(node);
  if (node.children) node.children.forEach((c) => flatten(c, out));
  return out;
}

const toNum = (t) => (t.trim() !== '' && Number.isFinite(Number(t)) ? Number(t) : null);

export default function QuadtreeView() {
  const { state, error, loading, run } = useDsState('quadtree');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [rect, setRect] = useState({ x0: '20', y0: '20', x1: '60', y1: '60' });
  const [capacity, setCapacity] = useState('2');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [query, setQuery] = useState(null);

  const exec = async (op, payload, describe) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data && describe ? describe(data.result) : '');
    if (op !== 'query') setQuery(null);
    return data;
  };

  const insert = (px, py) =>
    exec('insert', { x: px, y: py }, (r) => `Inserted (${r.point[0]}, ${r.point[1]}).`);

  const onInsert = () => {
    const px = toNum(x);
    const py = toNum(y);
    if (px === null || py === null) {
      setLocalError('x and y must be numbers');
      return;
    }
    insert(px, py);
  };

  const onQuery = async () => {
    const v = ['x0', 'y0', 'x1', 'y1'].map((k) => toNum(rect[k]));
    if (v.some((n) => n === null)) {
      setLocalError('Rectangle corners must be numbers');
      return;
    }
    setLocalError('');
    const data = await run('query', { x0: v[0], y0: v[1], x1: v[2], y1: v[3] });
    if (data) {
      setQuery(data.result);
      setMessage(
        `Found ${data.result.points.length} point(s); visited ${data.result.nodes_visited} of ` +
          `${data.result.total_nodes} nodes.`
      );
    } else {
      setMessage('');
    }
  };

  const onRandom = () =>
    exec('random', { n: 10 }, (r) => `Added ${r.added.length} random points.`);

  const onConfigure = () => {
    const c = toNum(capacity);
    if (c === null) {
      setLocalError('Capacity must be a whole number');
      return;
    }
    setQuery(null);
    exec('configure', { capacity: c }, () => `Capacity set to ${c}; tree cleared.`);
  };

  const onSvgClick = (e) => {
    if (loading) return;
    const box = e.currentTarget.getBoundingClientRect();
    if (!box.width) return;
    const px = Math.round(((e.clientX - box.left) / box.width) * (state.size + 2 * PAD / SCALE) - PAD / SCALE);
    const py = Math.round(((e.clientY - box.top) / box.height) * (state.size + 2 * PAD / SCALE) - PAD / SCALE);
    insert(Math.min(state.size, Math.max(0, px)), Math.min(state.size, Math.max(0, py)));
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const nodes = loaded ? flatten(state.tree) : [];
  const visitedKeys = new Set((query ? query.visited : []).map((v) => v.join(',')));
  const foundKeys = new Set((query ? query.points : []).map((p) => p.join(',')));
  const dim = loaded ? state.size * SCALE + 2 * PAD : 0;

  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );
  const num = (label, value, onChange) => (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
      className="quadtree-num"
    />
  );

  return (
    <div className="ds-container">
      <h2>Quadtree Visualization</h2>
      <p className="quadtree-intro">
        A quadtree recursively divides 2D space into four parts. A leaf holds a few points; when it
        overflows it splits into four equal quadrants. Used for maps and collision detection.
      </p>
      <p className="quadtree-complexity">
        Insert takes time proportional to the tree depth, about O(log n) for evenly spread points but
        up to the depth limit when points cluster. A range query skips every quadrant that misses the
        rectangle, so it visits far fewer nodes than n on spread-out data. Space is O(n).
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls">
        {num('x', x, setX)}
        {num('y', y, setY)}
        {btn('Insert point', onInsert)}
        {btn('Add 10 random', onRandom)}
        {btn('Reset', async () => {
          setQuery(null);
          const d = await exec('reset');
          setMessage(d ? 'Reset.' : '');
        })}
      </div>
      <div className="ds-controls">
        {num('Capacity', capacity, setCapacity)}
        {btn('Set capacity', onConfigure)}
      </div>
      <div className="ds-controls">
        {num('x0', rect.x0, (v) => setRect({ ...rect, x0: v }))}
        {num('y0', rect.y0, (v) => setRect({ ...rect, y0: v }))}
        {num('x1', rect.x1, (v) => setRect({ ...rect, x1: v }))}
        {num('y1', rect.y1, (v) => setRect({ ...rect, y1: v }))}
        {btn('Range query', onQuery)}
      </div>

      {message && <div className="quadtree-result" role="status">{message}</div>}

      {loaded && (
        <>
          <p className="quadtree-stats">
            {state.count} points, {state.node_count} nodes, depth {state.depth}, capacity{' '}
            {state.capacity} per leaf (max depth {state.max_depth}). Click the grid to insert a point.
          </p>
          {state.count === 0 && (
            <p className="empty-message">No points yet: the root is a single empty leaf.</p>
          )}
          <div className="quadtree-scroll">
            <svg
              className="quadtree-svg"
              data-testid="quadtree-svg"
              viewBox={`0 0 ${dim} ${dim}`}
              width={dim}
              height={dim}
              role="img"
              aria-label="Quadtree subdivisions"
              onClick={onSvgClick}
            >
              {nodes.map((n, i) => {
                const key = [n.x, n.y, n.w, n.h].join(',');
                const cls = [
                  'quadtree-cell',
                  n.children ? 'quadtree-internal' : 'quadtree-leaf',
                  visitedKeys.has(key) ? 'quadtree-visited' : '',
                ].join(' ');
                return (
                  <rect
                    key={i}
                    data-testid="quadtree-node"
                    className={cls}
                    x={PAD + n.x * SCALE}
                    y={PAD + n.y * SCALE}
                    width={n.w * SCALE}
                    height={n.h * SCALE}
                  />
                );
              })}
              {query && (
                <rect
                  data-testid="quadtree-query-rect"
                  className="quadtree-query"
                  x={PAD + query.rect[0] * SCALE}
                  y={PAD + query.rect[1] * SCALE}
                  width={(query.rect[2] - query.rect[0]) * SCALE}
                  height={(query.rect[3] - query.rect[1]) * SCALE}
                />
              )}
              {nodes.flatMap((n, i) =>
                n.points.map((p, j) => (
                  <circle
                    key={`${i}-${j}`}
                    data-testid="quadtree-point"
                    className={foundKeys.has(p.join(',')) ? 'quadtree-point quadtree-found' : 'quadtree-point'}
                    cx={PAD + p[0] * SCALE}
                    cy={PAD + p[1] * SCALE}
                    r="4"
                  >
                    <title>{`(${p[0]}, ${p[1]})`}</title>
                  </circle>
                ))
              )}
            </svg>
          </div>
          {query && (
            <p data-testid="quadtree-found" className="quadtree-found-list">
              Points in rectangle:{' '}
              {query.points.length ? query.points.map((p) => `(${p[0]}, ${p[1]})`).join(', ') : 'none'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
