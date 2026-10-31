import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './BinaryTreeView.css';

const STEP = 48;
const LEVEL = 60;
const R = 16;
const WHOLE = /^-?\d+$/;

const ORDERS = [
  ['preorder', 'Preorder', 'Node, left, right'],
  ['inorder', 'Inorder', 'Left, node, right'],
  ['postorder', 'Postorder', 'Left, right, node'],
  ['inorder-iterative', 'Inorder (iterative)', 'Same as inorder, with an explicit stack'],
  ['level-order', 'Level order', 'One level at a time'],
];

// Lays out the nested tree: x by inorder position, y by depth.
function layout(tree) {
  const nodes = [];
  const edges = [];
  let col = 0;
  const walk = (n, depth) => {
    if (!n) return null;
    const l = walk(n.left, depth + 1);
    const me = { val: n.val, x: 0, y: depth };
    me.x = col++;
    nodes.push(me);
    const r = walk(n.right, depth + 1);
    if (l) edges.push([me, l]);
    if (r) edges.push([me, r]);
    return me;
  };
  walk(tree, 0);
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.y), 0);
  return { nodes, edges, cols: col, maxDepth };
}

const flat = (result) => (Array.isArray(result) ? result.flat() : []);

export default function BinaryTreeView() {
  const { state, error, loading, run } = useDsState('binary-tree');
  const [valuesText, setValuesText] = useState('1, 2, 3, 4, 5, null, 6');
  const [p, setP] = useState('');
  const [q, setQ] = useState('');
  const [localError, setLocalError] = useState('');
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState(null); // { name, items }
  const [step, setStep] = useState(0);
  const [lcaVal, setLcaVal] = useState(null);

  const clearMarks = () => {
    setOrder(null);
    setLcaVal(null);
  };

  const exec = async (op, payload) => {
    setLocalError('');
    return run(op, payload);
  };

  const onOrder = async ([op, label]) => {
    const d = await exec(op);
    if (!d) return;
    setLcaVal(null);
    const items = flat(d.result);
    setOrder({ name: label, items, levels: op === 'level-order' ? d.result : null });
    setStep(items.length);
    setMessage('');
  };

  const onDepth = async () => {
    const d = await exec('max-depth');
    if (!d) return;
    clearMarks();
    setMessage(`Max depth: ${d.result} nodes on the longest path`);
  };

  const onInvert = async () => {
    const d = await exec('invert');
    if (!d) return;
    clearMarks();
    setMessage('Tree inverted (left and right swapped at every node).');
  };

  const onReset = async () => {
    const d = await exec('reset');
    clearMarks();
    setMessage(d ? 'Reset.' : '');
  };

  const onBuild = async () => {
    const parts = valuesText.split(',').map((t) => t.trim()).filter((t) => t !== '');
    if (parts.some((t) => t !== 'null' && !WHOLE.test(t))) {
      setLocalError('Entries must be whole numbers or null, separated by commas');
      return;
    }
    const d = await exec('build', { values: parts.map((t) => (t === 'null' ? null : Number(t))) });
    clearMarks();
    setMessage(d ? `Built a tree with ${d.result} nodes.` : '');
  };

  const onLca = async () => {
    if (!WHOLE.test(p.trim()) || !WHOLE.test(q.trim())) {
      setLocalError('p and q must be whole numbers');
      return;
    }
    const d = await exec('lca', { p: Number(p), q: Number(q) });
    if (!d) return;
    setOrder(null);
    setLcaVal(d.result);
    setMessage(`Lowest common ancestor of ${p.trim()} and ${q.trim()}: ${d.result}`);
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const lay = loaded ? layout(state.tree) : null;
  const shown = order ? order.items.slice(0, step) : [];
  const rank = (val) => shown.indexOf(val);
  const width = lay ? Math.max(lay.cols, 1) * STEP : 0;
  const height = lay ? (lay.maxDepth + 1) * LEVEL : 0;
  const cx = (n) => n.x * STEP + STEP / 2;
  const cy = (n) => n.y * LEVEL + LEVEL / 2;

  const btn = (label, onClick) => (
    <button key={label} className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );

  return (
    <div className="ds-container">
      <h2>Binary Tree Visualization</h2>
      <p className="binary-tree-intro">
        A binary tree is a hierarchy in which each node has at most two children.
      </p>
      <p className="binary-tree-complexity">
        Every traversal visits each node once, so it takes O(n) time and O(h) stack space, where
        h is the height. Level order uses O(w) space for tree width w. Do not assume the tree is
        balanced: h can reach n.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls">
        <input
          type="text"
          aria-label="Level-order values"
          value={valuesText}
          onChange={(e) => setValuesText(e.target.value)}
          disabled={loading}
        />
        {btn('Build tree', onBuild)}
        {btn('Reset', onReset)}
      </div>
      <div className="ds-controls">
        {ORDERS.map((o) => btn(o[1], () => onOrder(o)))}
        {btn('Max depth', onDepth)}
        {btn('Invert', onInvert)}
      </div>
      <div className="ds-controls">
        <input type="text" aria-label="Node p" placeholder="p" value={p}
          onChange={(e) => setP(e.target.value)} disabled={loading} />
        <input type="text" aria-label="Node q" placeholder="q" value={q}
          onChange={(e) => setQ(e.target.value)} disabled={loading} />
        {btn('Lowest common ancestor', onLca)}
      </div>

      {message && <div className="binary-tree-result" role="status">{message}</div>}

      {loaded && (
        <>
          <p className="binary-tree-stats">
            Nodes: {state.count}. Height: {state.height} edges.{' '}
            Full: {state.properties.full ? 'yes' : 'no'}.{' '}
            Complete: {state.properties.complete ? 'yes' : 'no'}.{' '}
            Perfect: {state.properties.perfect ? 'yes' : 'no'}.{' '}
            Balanced: {state.properties.balanced ? 'yes' : 'no'}.
          </p>
          {state.tree === null ? (
            <p className="empty-message">Tree is empty.</p>
          ) : (
            <div className="binary-tree-scroll">
              <svg
                role="img"
                aria-label="Binary tree"
                data-testid="tree-svg"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
              >
                {lay.edges.map(([a, b]) => (
                  <line key={`${a.val}-${b.val}`} className="binary-tree-edge"
                    x1={cx(a)} y1={cy(a)} x2={cx(b)} y2={cy(b)} />
                ))}
                {lay.nodes.map((n) => {
                  const r = rank(n.val);
                  const cls = ['binary-tree-node'];
                  if (r >= 0) cls.push('binary-tree-visited');
                  if (r >= 0 && r === step - 1) cls.push('binary-tree-current');
                  if (lcaVal === n.val) cls.push('binary-tree-lca');
                  return (
                    <g key={n.val} data-testid={`node-${n.val}`} className={cls.join(' ')}>
                      <circle cx={cx(n)} cy={cy(n)} r={R} />
                      <text x={cx(n)} y={cy(n)} textAnchor="middle" dominantBaseline="central">
                        {n.val}
                      </text>
                      {r >= 0 && (
                        <text className="binary-tree-badge" x={cx(n) + R} y={cy(n) - R}>
                          {r + 1}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {order && (
            <section className="binary-tree-order" aria-label="Traversal result">
              <h3>{order.name}</h3>
              {order.items.length === 0 ? (
                <p className="empty-message">Nothing to visit: the tree is empty.</p>
              ) : (
                <>
                  <p data-testid="order-output">
                    {order.levels
                      ? order.levels.map((lv) => `[${lv.join(', ')}]`).join(' ')
                      : `[${order.items.join(', ')}]`}
                  </p>
                  <label>
                    Step {step} of {order.items.length}{' '}
                    <input
                      type="range"
                      aria-label="Traversal step"
                      min={0}
                      max={order.items.length}
                      value={step}
                      onChange={(e) => setStep(Number(e.target.value))}
                    />
                  </label>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
