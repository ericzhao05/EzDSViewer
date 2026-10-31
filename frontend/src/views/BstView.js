import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './BstView.css';

const WHOLE = /^-?\d+$/;
const X_GAP = 56;
const Y_GAP = 64;
const R = 20;

const CASE_TEXT = {
  leaf: 'Leaf: removed it.',
  'one-child': 'One child: replaced the node with its child.',
  'two-children': 'Two children: copied in the inorder successor, then deleted that successor.',
};

// Lay out nodes: x from inorder position, y from depth.
function layout(tree) {
  const nodes = [];
  const edges = [];
  let counter = 0;
  const walk = (n, depth) => {
    if (!n) return null;
    const left = walk(n.left, depth + 1);
    const me = { val: n.val, x: counter++ * X_GAP + R + 4, y: depth * Y_GAP + R + 4 };
    nodes.push(me);
    const right = walk(n.right, depth + 1);
    if (left) edges.push([me, left]);
    if (right) edges.push([me, right]);
    return me;
  };
  walk(tree, 0);
  return { nodes, edges, width: counter * X_GAP + 8, height: nodes.length ? Math.max(...nodes.map((n) => n.y)) + R + 4 : 0 };
}

function describe(op, r) {
  switch (op) {
    case 'insert':
      return `Inserted ${r.inserted}. Path: ${r.path.join(' > ') || '(root)'}`;
    case 'search':
      return `${r.found ? 'Found' : 'Not found'}. Path: ${r.path.join(' > ') || '(empty tree)'}`;
    case 'delete':
      return `Deleted ${r.deleted}. ${CASE_TEXT[r.case]}${
        r.successor !== null ? ` Successor: ${r.successor}.` : ''
      }`;
    case 'kth-smallest':
      return `The ${r.k}th smallest is ${r.value}`;
    case 'inorder':
      return `Inorder (sorted): [${r.join(', ')}]`;
    case 'lca':
      return `Lowest common ancestor: ${r}`;
    case 'is-valid':
      return `Valid BST: ${r.valid ? 'yes' : 'no'} (${r.checked})`;
    default:
      return '';
  }
}

export default function BstView() {
  const { state, error, loading, run } = useDsState('bst');
  const [valueText, setValueText] = useState('');
  const [kText, setKText] = useState('');
  const [pText, setPText] = useState('');
  const [qText, setQText] = useState('');
  const [buildText, setBuildText] = useState('8, 3, 10, 1, 6, 14');
  const [checkText, setCheckText] = useState('5, 4, 7, null, null, 6, 8');
  const [message, setMessage] = useState('');
  const [path, setPath] = useState([]);
  const [localError, setLocalError] = useState('');

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    if (!data) {
      setMessage('');
      return;
    }
    setMessage(describe(op, data.result));
    const r = data.result;
    setPath(r && Array.isArray(r.path) ? r.path : []);
  };

  const needInt = (text, name) => {
    if (!WHOLE.test(text.trim())) {
      setLocalError(`${name} must be a whole number`);
      return null;
    }
    return Number(text.trim());
  };

  const withValue = (op) => {
    const v = needInt(valueText, 'Value');
    if (v !== null) exec(op, { value: v });
  };

  const onBuild = () => {
    const parts = buildText.split(',').map((t) => t.trim()).filter((t) => t !== '');
    if (parts.some((t) => !WHOLE.test(t))) {
      setLocalError('Values must be whole numbers separated by commas');
      return;
    }
    exec('build', { values: parts.map(Number) });
  };

  const onCheck = () => {
    const parts = checkText.split(',').map((t) => t.trim()).filter((t) => t !== '');
    if (parts.length === 0 || parts.some((t) => t !== 'null' && !WHOLE.test(t))) {
      setLocalError('Enter whole numbers or null separated by commas');
      return;
    }
    exec('is-valid', { values: parts.map((t) => (t === 'null' ? null : Number(t))) });
  };

  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );
  const input = (label, value, set, extra = {}) => (
    <input
      type="text"
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => set(e.target.value)}
      disabled={loading}
      {...extra}
    />
  );

  const shownError = localError || error;
  const loaded = state !== null;
  const lay = loaded ? layout(state.tree) : null;

  return (
    <div className="ds-container">
      <h2>Binary Search Tree Visualization</h2>
      <p className="bst-intro">
        A binary tree in which everything in a node&apos;s left subtree is smaller than the node and
        everything in the right subtree is larger. Each comparison discards one subtree, and an
        inorder traversal yields sorted output. Duplicates are ignored.
      </p>
      <p className="bst-complexity">
        Operations cost O(h), where h is the height. Inserting already-sorted data creates a tree
        shaped like a linked list, with O(n) operations.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls">
        {input('Value', valueText, setValueText)}
        {btn('Insert', () => withValue('insert'))}
        {btn('Search', () => withValue('search'))}
        {btn('Delete', () => withValue('delete'))}
        {btn('Inorder', () => exec('inorder'))}
        {btn('Reset', () => { setPath([]); exec('reset'); })}
        {btn('Clear', () => { setPath([]); exec('clear'); })}
      </div>

      {message && <div className="bst-result" role="status">{message}</div>}

      {loaded && (
        <>
          <p className="bst-stats">
            Nodes: {state.count}. Height: {state.height} (in edges; an empty tree is -1). Inorder: [
            {state.inorder.join(', ')}]
          </p>
          {state.tree === null ? (
            <p className="empty-message">Tree is empty.</p>
          ) : (
            <div className="bst-scroll">
              <svg
                role="img"
                aria-label="Binary search tree"
                data-testid="bst-svg"
                width={lay.width}
                height={lay.height}
              >
                {lay.edges.map(([a, c], i) => (
                  <line key={i} x1={a.x} y1={a.y} x2={c.x} y2={c.y} className="bst-edge" />
                ))}
                {lay.nodes.map((n) => (
                  <g
                    key={n.val}
                    data-testid={`bst-node-${n.val}`}
                    className={path.includes(n.val) ? 'bst-node bst-node-path' : 'bst-node'}
                  >
                    <circle cx={n.x} cy={n.y} r={R} />
                    <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central">{n.val}</text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </>
      )}

      <section className="bst-section" aria-label="Order statistics and ancestors">
        <h3>Kth smallest and lowest common ancestor</h3>
        <div className="ds-controls">
          {input('k', kText, setKText)}
          {btn('Kth smallest', () => {
            const k = needInt(kText, 'k');
            if (k !== null) exec('kth-smallest', { k });
          })}
          {input('p', pText, setPText)}
          {input('q', qText, setQText)}
          {btn('LCA', () => {
            const p = needInt(pText, 'p');
            const q = needInt(qText, 'q');
            if (p !== null && q !== null) exec('lca', { p, q });
          })}
        </div>
      </section>

      <section className="bst-section" aria-label="Build and validate">
        <h3>Build and validate</h3>
        <div className="ds-controls">
          {input('Values to insert', buildText, setBuildText)}
          {btn('Build', onBuild)}
        </div>
        <div className="ds-controls">
          {input('Level-order list to validate', checkText, setCheckText)}
          {btn('Is valid BST?', onCheck)}
          {btn('Check current tree', () => exec('is-valid'))}
        </div>
        <p className="bst-note">
          Validation passes bounds down, so a value deep in a left subtree must be below every
          ancestor it sits to the left of. Comparing only with direct children is a common mistake.
        </p>
      </section>
    </div>
  );
}
