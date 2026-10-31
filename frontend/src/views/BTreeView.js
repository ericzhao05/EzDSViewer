import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './BTreeView.css';

const WHOLE = /^-?\d+$/;
const NUMBER_ERROR = 'Please enter a whole number';
const DEFAULT_BUILD = '10, 20, 5, 6, 12, 30, 7, 17, 3, 25';
const NO_HIGHLIGHT = { tree: null, nodes: [], keys: [], leaves: [] };

const CELL_H = 28;
const LEVEL_GAP = 48;
const PAD = 8;

const parseList = (text) => text.split(',').map((t) => t.trim()).filter((t) => t !== '');

function describe(op, r) {
  switch (op) {
    case 'insert':
      return r.inserted ? `Inserted ${r.key}.` : `${r.key} is already in the B-tree; nothing changed.`;
    case 'delete':
      return `Deleted ${r.key}.`;
    case 'search':
      return r.found
        ? `Found ${r.key} after reading ${r.path.length} node(s).`
        : `${r.key} is not in the B-tree (read ${r.path.length} node(s)).`;
    case 'bplus-insert':
      return r.inserted
        ? `Inserted ${r.key} with value "${r.value}".`
        : `${r.key} already existed: its value is now "${r.value}".`;
    case 'bplus-delete':
      return `Deleted ${r.key}, which held "${r.value}".`;
    case 'bplus-search':
      return r.found
        ? `Found ${r.key} = "${r.value}" after reading ${r.path.length} node(s).`
        : `${r.key} is not in the B+ tree (read ${r.path.length} node(s)).`;
    case 'bplus-range': {
      const listed = r.items.map((i) => `${i.key} = ${i.value}`).join(', ');
      return `Range [${r.low}, ${r.high}]: ${r.items.length} item(s) from ${r.leaves.length} leaf node(s)${listed ? `: ${listed}` : ''}.`;
    }
    case 'build':
      return `Built both trees: ${r.btree_size} key(s).`;
    case 'set-order':
      return `Order is now ${r.order}: both trees were rebuilt by inserting their keys again.`;
    case 'reset':
      return 'Both trees are back to their starting keys.';
    default:
      return '';
  }
}

function highlightFor(op, r) {
  if (op === 'search' || op === 'bplus-search') {
    return {
      tree: op === 'search' ? 'btree' : 'bplus',
      nodes: r.path,
      keys: r.found ? [r.key] : [],
      leaves: [],
    };
  }
  if (op === 'bplus-range') {
    return {
      tree: 'bplus',
      nodes: [...r.path, ...r.leaves],
      keys: r.items.map((i) => i.key),
      leaves: r.leaves,
    };
  }
  return NO_HIGHLIGHT;
}

// Leaves go left to right; each parent is centred over its children. A parent with k keys has
// k + 1 children, so it is never wider than the span they cover and cannot overlap a neighbour.
function layoutTree(root, leafGap) {
  const nodes = [];
  const edges = [];
  let cursor = PAD;
  let bottom = 0;

  const place = (node, depth) => {
    const longest = [...node.keys, ...(node.values || [])].reduce(
      (n, v) => Math.max(n, String(v).length),
      0
    );
    const cellW = Math.max(36, longest * 7 + 14);
    const w = Math.max(1, node.keys.length) * cellW;
    const h = node.values ? CELL_H * 2 : CELL_H;
    const y = PAD + depth * (CELL_H + LEVEL_GAP);
    const kids = node.children.map((c) => place(c, depth + 1));
    let x;
    if (kids.length) {
      const first = kids[0];
      const last = kids[kids.length - 1];
      x = (first.x + last.x + last.w) / 2 - w / 2;
    } else {
      x = cursor;
      cursor += w + leafGap;
    }
    const placed = { ...node, x, y, w, h, cellW };
    kids.forEach((kid, i) => {
      edges.push({
        id: kid.id,
        x1: x + i * cellW,
        y1: y + CELL_H,
        x2: kid.x + kid.w / 2,
        y2: kid.y,
      });
    });
    nodes.push(placed);
    bottom = Math.max(bottom, y + h);
    return placed;
  };

  place(root, 0);
  return { nodes, edges, width: cursor - leafGap + PAD, height: bottom + PAD };
}

function TreeSvg({ tree, name, label, leafGap, highlight }) {
  const { nodes, edges, width, height } = layoutTree(tree.root, leafGap);
  const active = highlight.tree === name ? highlight : NO_HIGHLIGHT;
  const leafById = {};
  nodes.forEach((n) => {
    if (n.leaf) leafById[n.id] = n;
  });
  const links = nodes.filter((n) => n.next && leafById[n.next]);
  const walked = (n) => {
    const at = active.leaves.indexOf(n.id);
    return at >= 0 && active.leaves[at + 1] === n.next;
  };
  return (
    <div className="b-tree-scroll">
      <svg
        className="b-tree-svg"
        width={width}
        height={height}
        role="img"
        aria-label={label}
        data-testid={`${name}-svg`}
      >
        <defs>
          <marker
            id={`${name}-arrow`}
            markerUnits="userSpaceOnUse"
            viewBox="0 0 6 6"
            markerWidth="9"
            markerHeight="9"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path className="b-tree-arrowhead" d="M0,0 L6,3 L0,6 z" />
          </marker>
        </defs>
        {edges.map((e) => (
          <line
            key={e.id}
            className="b-tree-edge"
            data-testid={`${name}-edge`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
          />
        ))}
        {links.map((n) => {
          const to = leafById[n.next];
          const y = n.y + CELL_H;
          return (
            <line
              key={n.id}
              className={walked(n) ? 'b-tree-link b-tree-link-hl' : 'b-tree-link'}
              data-testid={`${name}-link`}
              markerEnd={`url(#${name}-arrow)`}
              x1={n.x + n.w}
              y1={y}
              x2={to.x - 1}
              y2={y}
            />
          );
        })}
        {nodes.map((n) => {
          // In a B+ tree, internal nodes only route, so they are drawn apart from the leaves.
          const router = name === 'bplus' && !n.leaf;
          const visited = active.nodes.includes(n.id);
          return (
            <g
              key={n.id}
              className={visited ? 'b-tree-node b-tree-node-hl' : 'b-tree-node'}
              data-testid={`${name}-node`}
              data-node-id={n.id}
            >
              {n.keys.map((k, i) => {
                const hit = !router && active.keys.includes(k);
                const cx = n.x + i * n.cellW;
                return (
                  <g key={k}>
                    <rect
                      data-testid={`${name}-cell`}
                      className={[
                        'b-tree-cell',
                        router ? 'b-tree-cell-router' : '',
                        hit ? 'b-tree-cell-hit' : '',
                      ].join(' ')}
                      x={cx}
                      y={n.y}
                      width={n.cellW}
                      height={CELL_H}
                    />
                    <text
                      className={router ? 'b-tree-text b-tree-text-router' : 'b-tree-text'}
                      x={cx + n.cellW / 2}
                      y={n.y + CELL_H / 2}
                    >
                      {String(k)}
                    </text>
                    {n.values && (
                      <>
                        <rect
                          data-testid={`${name}-cell`}
                          className="b-tree-cell b-tree-cell-value"
                          x={cx}
                          y={n.y + CELL_H}
                          width={n.cellW}
                          height={CELL_H}
                        />
                        <text className="b-tree-value" x={cx + n.cellW / 2} y={n.y + CELL_H * 1.5}>
                          {n.values[i]}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function BTreeView() {
  const { state, error, loading, run } = useDsState('b-tree');
  const [treeKey, setTreeKey] = useState('');
  const [plusKey, setPlusKey] = useState('');
  const [plusValue, setPlusValue] = useState('');
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  const [buildText, setBuildText] = useState(DEFAULT_BUILD);
  const [message, setMessage] = useState('');
  const [events, setEvents] = useState([]);
  const [localError, setLocalError] = useState('');
  const [highlight, setHighlight] = useState(NO_HIGHLIGHT);

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result) : '');
    setEvents(data && data.result && data.result.events ? data.result.events : []);
    setHighlight(data && data.result ? highlightFor(op, data.result) : NO_HIGHLIGHT);
  };

  const withKey = (op, text, extra) => {
    if (!WHOLE.test(text.trim())) {
      setLocalError(NUMBER_ERROR);
      return;
    }
    exec(op, { key: Number(text.trim()), ...extra });
  };

  const insertPlus = () => {
    const value = plusValue.trim();
    withKey('bplus-insert', plusKey, value ? { value } : {});
  };

  const rangeScan = () => {
    if (!WHOLE.test(low.trim()) || !WHOLE.test(high.trim())) {
      setLocalError(`${NUMBER_ERROR} for both range bounds`);
      return;
    }
    exec('bplus-range', { low: Number(low.trim()), high: Number(high.trim()) });
  };

  const build = () => {
    const parts = parseList(buildText);
    if (parts.some((t) => !WHOLE.test(t))) {
      setLocalError('Keys must be whole numbers separated by commas');
      return;
    }
    exec('build', { keys: parts.map(Number) });
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const orders = [];
  if (loaded) {
    for (let m = state.limits.min_order; m <= state.limits.max_order; m += 1) orders.push(m);
  }
  const btn = (text, onClick, label) => (
    <button className="control-btn" onClick={onClick} disabled={loading} aria-label={label}>{text}</button>
  );
  const input = (label, value, setter, placeholder) => (
    <input
      type="text"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setter(e.target.value)}
      disabled={loading}
    />
  );

  return (
    <div className="ds-container">
      <h2>B-tree and B+ tree</h2>
      <p className="b-tree-intro">
        A search tree whose nodes hold many sorted keys and have many children, designed for storage
        that is read in blocks. A wide node fits one disk page, so a tree over millions of rows is
        only a few levels deep and each level costs one read.
      </p>
      <div className="b-tree-scroll">
        <table className="b-tree-table">
          <thead>
            <tr><th scope="col">Property</th><th scope="col">B-tree of order m</th></tr>
          </thead>
          <tbody>
            <tr><td>Children per node</td><td>At most m; at least ⌈m/2⌉ for internal nodes other than the root</td></tr>
            <tr><td>Leaves</td><td>All at the same depth</td></tr>
            <tr><td>Search, insert, delete</td><td>O(log n)</td></tr>
            <tr><td>Insert overflow</td><td>Split the full node and move the median key up</td></tr>
            <tr><td>Delete underflow</td><td>Borrow from a sibling or merge with one</td></tr>
          </tbody>
        </table>
      </div>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls b-tree-controls">
        <label className="b-tree-label">
          Order m
          <select
            className="b-tree-select"
            value={loaded ? state.order : ''}
            onChange={(e) => exec('set-order', { order: Number(e.target.value) })}
            disabled={loading || !loaded}
          >
            {orders.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        {input('Keys for both trees', buildText, setBuildText)}
        {btn('Build both trees', build)}
        {btn('Reset', () => exec('reset'))}
      </div>

      {message && (
        <div className="b-tree-result" role="status">
          <div>{message}</div>
          {events.length > 0 && (
            <ol className="b-tree-events" aria-label="What the tree did">
              {events.map((e, i) => <li key={i}>{e}</li>)}
            </ol>
          )}
        </div>
      )}

      <section className="b-tree-section" aria-label="B-tree">
        <h3>B-tree</h3>
        <div className="ds-controls b-tree-controls">
          {input('B-tree key', treeKey, setTreeKey, 'Key')}
          {btn('Insert', () => withKey('insert', treeKey), 'Insert into B-tree')}
          {btn('Search', () => withKey('search', treeKey), 'Search B-tree')}
          {btn('Delete', () => withKey('delete', treeKey), 'Delete from B-tree')}
        </div>
        {loaded && (
          <>
            <p className="b-tree-meta">
              Order {state.btree.order}: {state.btree.size} key(s), height {state.btree.height}. A
              node holds at most {state.btree.max_keys} keys; nodes other than the root hold at
              least {state.btree.min_keys}.
            </p>
            {state.btree.size === 0 ? (
              <p className="empty-message">B-tree is empty.</p>
            ) : (
              <TreeSvg
                tree={state.btree}
                name="btree"
                label={`B-tree of order ${state.btree.order} with ${state.btree.size} keys`}
                leafGap={14}
                highlight={highlight}
              />
            )}
          </>
        )}
      </section>

      <section className="b-tree-section" aria-label="B+ tree">
        <h3>B+ tree</h3>
        <p className="b-tree-intro">
          A B+ tree keeps all values in the leaves and links the leaves together, so range scans
          walk the leaf chain. Most relational database indexes use this variant. Internal keys only
          route searches, so a deleted key can stay behind as a separator.
        </p>
        <div className="ds-controls b-tree-controls">
          {input('B+ tree key', plusKey, setPlusKey, 'Key')}
          {input('B+ tree value', plusValue, setPlusValue, 'Value (optional)')}
          {btn('Insert', insertPlus, 'Insert into B+ tree')}
          {btn('Search', () => withKey('bplus-search', plusKey), 'Search B+ tree')}
          {btn('Delete', () => withKey('bplus-delete', plusKey), 'Delete from B+ tree')}
        </div>
        <div className="ds-controls b-tree-controls">
          {input('Range low', low, setLow, 'Low')}
          {input('Range high', high, setHigh, 'High')}
          {btn('Range scan', rangeScan)}
        </div>
        {loaded && (
          <>
            <p className="b-tree-meta">
              Order {state.bplus.order}: {state.bplus.size} key(s), height {state.bplus.height}. A
              node holds at most {state.bplus.max_keys} keys; leaves other than the root hold at
              least {state.bplus.min_leaf_keys}, and internal nodes other than the root at
              least {state.bplus.min_keys}.
            </p>
            {state.bplus.size === 0 ? (
              <p className="empty-message">B+ tree is empty.</p>
            ) : (
              <>
                <TreeSvg
                  tree={state.bplus}
                  name="bplus"
                  label={`B+ tree of order ${state.bplus.order} with ${state.bplus.size} keys`}
                  leafGap={28}
                  highlight={highlight}
                />
                <div className="b-tree-scroll">
                  <p className="b-tree-chain" data-testid="bplus-chain">
                    Leaf chain: {state.bplus.leaves.map((l) => `[${l.keys.join(', ')}]`).join(' → ')}
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
