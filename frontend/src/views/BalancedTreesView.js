import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './BalancedTreesView.css';

const WHOLE = /^-?\d+$/;
const X_GAP = 48;
const Y_GAP = 62;
const R = 18;
const PAD = 26;
// A balance label starts this far right of its node's centre and needs this much room.
const BALANCE_X = R + 2;
const BALANCE_ROOM = 18;

const KIND_NAME = { avl: 'AVL', rb: 'Red-black' };

const FIGURES = [
  [
    'Rule',
    'Subtree heights differ by at most 1',
    'Coloring rules: no red node has a red child, and all root-to-leaf paths have the same number of black nodes',
  ],
  ['Max height', 'About 1.44 log₂ n', 'At most 2 log₂(n + 1)'],
  ['Lookups', 'Slightly faster (shorter)', 'Slightly slower'],
  ['Inserts and deletes', 'More rotations', 'Fewer rotations'],
  ['Common use', 'Read-heavy workloads', "Standard library sorted maps such as Java's TreeMap"],
];

const CASES = [
  ['left-left', 'Into the left child\'s left', 'Rotate right'],
  ['right-right', 'Into the right child\'s right', 'Rotate left'],
  ['left-right', 'Into the left child\'s right', 'Rotate the child left, then the node right'],
  ['right-left', 'Into the right child\'s left', 'Rotate the child right, then the node left'],
];

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const signed = (n) => (n > 0 ? `+${n}` : String(n));

// Lay out nodes: x from inorder position, y from depth.
function layout(tree) {
  const nodes = [];
  const edges = [];
  let counter = 0;
  const walk = (n, depth) => {
    if (!n) return null;
    const left = walk(n.left, depth + 1);
    const me = { ...n, x: counter++ * X_GAP + PAD, y: depth * Y_GAP + PAD };
    nodes.push(me);
    const right = walk(n.right, depth + 1);
    if (left) edges.push([me, left]);
    if (right) edges.push([me, right]);
    return me;
  };
  walk(tree, 0);
  const deepest = nodes.reduce((most, n) => Math.max(most, n.y), 0);
  const hasBalance = nodes.some((n) => n.balance !== undefined);
  const rightMargin = hasBalance ? BALANCE_X + BALANCE_ROOM : PAD;
  return { nodes, edges, width: Math.max(counter - 1, 0) * X_GAP + PAD + rightMargin, height: deepest + PAD };
}

function nodeName(n) {
  return n.color ? `${n.val}, ${n.color}` : `${n.val}, balance ${signed(n.balance)}`;
}

function nodeClass(n, marked) {
  const names = ['balanced-trees-node'];
  if (n.color) names.push(`balanced-trees-node-${n.color}`);
  if (n.balance !== undefined && Math.abs(n.balance) > 1) names.push('balanced-trees-node-unbalanced');
  if (marked) names.push('balanced-trees-node-mark');
  return names.join(' ');
}

function TreeDrawing({ tree, label, marks = [], testIds = false }) {
  const lay = layout(tree);
  return (
    <div className="balanced-trees-scroll">
      <svg role="img" aria-label={label} width={lay.width} height={lay.height}>
        {lay.edges.map(([a, c]) => (
          <line key={c.val} x1={a.x} y1={a.y} x2={c.x} y2={c.y} className="balanced-trees-edge" />
        ))}
        {lay.nodes.map((n) => (
          <g
            key={n.val}
            role="img"
            aria-label={nodeName(n)}
            data-testid={testIds ? `balanced-trees-node-${n.val}` : undefined}
            className={nodeClass(n, marks.includes(n.val))}
          >
            <circle className="balanced-trees-ring" cx={n.x} cy={n.y} r={R + 4} />
            <circle className="balanced-trees-disc" cx={n.x} cy={n.y} r={R} />
            <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central">{n.val}</text>
            {n.balance !== undefined && (
              <text className="balanced-trees-balance" x={n.x + BALANCE_X} y={n.y - R} textAnchor="start">
                {signed(n.balance)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function describeChange(verb, r) {
  return `${verb} ${r.value} with ${plural(r.rotations, 'rotation')}.`;
}

export default function BalancedTreesView() {
  const { state, error, loading, run } = useDsState('balanced-trees');
  const [kind, setKind] = useState('avl');
  const [valueText, setValueText] = useState('');
  const [listText, setListText] = useState('1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [steps, setSteps] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [path, setPath] = useState([]);
  const [rotation, setRotation] = useState(null);
  const [comparison, setComparison] = useState(null);

  const clearDrawing = () => {
    setSteps(null);
    setStepIdx(0);
    setPath([]);
  };

  const exec = async (op, payload, onDone) => {
    setLocalError('');
    setMessage('');
    const data = await run(op, payload);
    if (data) onDone(data.result);
  };

  // Lands on the last step, which is the finished tree; the tutor steps back through the rest.
  const showSteps = (r) => {
    setPath([]);
    setSteps(r.steps);
    setStepIdx(Math.max(r.steps.length - 1, 0));
  };

  const withValue = (action) => {
    const text = valueText.trim();
    if (!WHOLE.test(text)) {
      setLocalError('Value must be a whole number');
      return;
    }
    action(Number(text));
  };

  const parseList = () => {
    const parts = listText.split(',').map((t) => t.trim()).filter((t) => t !== '');
    if (parts.some((t) => !WHOLE.test(t))) {
      setLocalError('Values must be whole numbers separated by commas');
      return null;
    }
    return parts.map(Number);
  };

  const onInsert = () =>
    withValue((value) =>
      exec(`${kind}-insert`, { value }, (r) => {
        setMessage(describeChange('Inserted', r));
        showSteps(r);
      })
    );

  const onDelete = () =>
    withValue((value) =>
      exec(`${kind}-delete`, { value }, (r) => {
        setMessage(describeChange('Deleted', r));
        showSteps(r);
      })
    );

  const onSearch = () =>
    withValue((value) =>
      exec(`${kind}-search`, { value }, (r) => {
        const trail = r.path.join(' > ') || '(empty tree)';
        setMessage(`${r.found ? 'Found' : 'Did not find'} ${r.value}. Path: ${trail}`);
        clearDrawing();
        setPath(r.path);
      })
    );

  const onBuild = () => {
    const values = parseList();
    if (values === null) return;
    exec(`${kind}-build`, { values }, (r) => {
      setMessage(`Built a tree of ${plural(r.count, 'node')} with ${plural(r.rotations, 'rotation')}.`);
      clearDrawing();
    });
  };

  const onClear = () =>
    exec(`${kind}-build`, { values: [] }, () => {
      setMessage('Cleared.');
      clearDrawing();
    });

  const onReset = () =>
    exec('reset', {}, () => {
      setMessage('Reset both trees.');
      clearDrawing();
    });

  const onCase = (name) =>
    exec('avl-case', { case: name }, (r) => {
      setMessage(`${capitalize(name)} case: ${plural(r.rotations, 'rotation')}.`);
      showSteps(r);
    });

  const onRotate = (direction) => exec('rotate', { direction }, setRotation);

  const onCompare = () => {
    const values = parseList();
    if (values === null) return;
    exec('compare', { values }, setComparison);
  };

  const onToggle = (next) => {
    setKind(next);
    setMessage('');
    setLocalError('');
    clearDrawing();
  };

  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );

  const shownError = localError || error;
  const loaded = state !== null;
  const current = loaded ? state[kind] : null;
  const step = steps && steps.length > 0 ? steps[Math.min(stepIdx, steps.length - 1)] : null;
  const drawn = step ? step.tree : current && current.tree;
  const marks = step ? (step.pivot !== undefined ? [step.pivot] : []) : path;
  const steppedBack = step !== null && stepIdx < steps.length - 1;

  return (
    <div className="ds-container">
      <h2>Balanced Search Trees Visualization</h2>
      <p className="balanced-trees-intro">
        BSTs that restructure themselves to keep height at O(log n). The basic tool is a rotation,
        which changes the tree&apos;s shape in O(1) while preserving sorted order.
      </p>

      <div className="balanced-trees-scroll">
        <table className="balanced-trees-table">
          <thead>
            <tr>
              <th scope="col"><span className="balanced-trees-hidden">Property</span></th>
              <th scope="col">AVL</th>
              <th scope="col">Red-black</th>
            </tr>
          </thead>
          <tbody>
            {FIGURES.map(([name, avl, rb]) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>{avl}</td>
                <td>{rb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls balanced-trees-controls" role="group" aria-label="Tree type">
        {Object.keys(KIND_NAME).map((k) => (
          <button
            key={k}
            className={k === kind ? 'control-btn balanced-trees-on' : 'control-btn'}
            aria-pressed={k === kind}
            onClick={() => onToggle(k)}
            disabled={loading}
          >
            {KIND_NAME[k]}
          </button>
        ))}
      </div>

      <div className="ds-controls balanced-trees-controls">
        <input
          type="text"
          aria-label="Value"
          placeholder="Value"
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          disabled={loading}
        />
        {btn('Insert', onInsert)}
        {btn('Delete', onDelete)}
        {btn('Search', onSearch)}
        {btn('Clear', onClear)}
        {btn('Reset both', onReset)}
      </div>

      {message && <div className="balanced-trees-result" role="status">{message}</div>}

      {loaded && (
        <section className="balanced-trees-section" aria-label={`${KIND_NAME[kind]} tree`}>
          <p className="balanced-trees-stats">
            {steppedBack && 'Finished tree, not this step: '}
            Nodes: {current.count}. Height: {current.height} (in levels; one node is 1).
            {current.height_bound !== null && (
              <>
                {' '}
                {kind === 'avl' ? `About 1.44 log₂ n = ${current.height_bound}.` : `At most 2 log₂(n + 1) = ${current.height_bound}.`}
              </>
            )}
            {kind === 'rb' && ` Black height: ${current.black_height}.`}
            {' '}Rotations so far: {current.rotations}. Inorder: [{current.inorder.join(', ')}]
          </p>
          {kind === 'avl' ? (
            <p className="balanced-trees-note">
              The small number beside each node is its balance factor: left height minus right
              height. It must stay in the range -1 to 1. The 1.44 figure is an estimate, so a small
              tree can sit a level above it.
            </p>
          ) : (
            <p className="balanced-trees-note">
              <span className="balanced-trees-swatch balanced-trees-swatch-red" /> Red nodes have a
              dashed outline.{' '}
              <span className="balanced-trees-swatch balanced-trees-swatch-black" /> Black nodes have
              a solid one. The root is kept black. Black height counts black nodes on a path from the
              root down.
            </p>
          )}

          {drawn ? (
            <TreeDrawing tree={drawn} label={`${KIND_NAME[kind]} tree`} marks={marks} testIds />
          ) : (
            <p className="empty-message">Tree is empty.</p>
          )}

          {step && (
            <div className="balanced-trees-steps">
              <h3>What happened</h3>
              <p className="balanced-trees-step-count">Step {stepIdx + 1} of {steps.length}</p>
              <div className="ds-controls balanced-trees-controls">
                <button
                  className="control-btn"
                  onClick={() => setStepIdx((i) => i - 1)}
                  disabled={loading || stepIdx <= 0}
                >
                  Previous step
                </button>
                <button
                  className="control-btn"
                  onClick={() => setStepIdx((i) => i + 1)}
                  disabled={loading || stepIdx >= steps.length - 1}
                >
                  Next step
                </button>
              </div>
              <ol className="balanced-trees-step-list">
                {steps.map((s, i) => (
                  <li key={i}>
                    <button
                      className={`balanced-trees-step balanced-trees-step-${s.kind}`}
                      aria-current={i === stepIdx ? 'step' : undefined}
                      onClick={() => setStepIdx(i)}
                      disabled={loading}
                    >
                      {s.text}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {kind === 'avl' && (
        <section className="balanced-trees-section" aria-label="AVL imbalance cases">
          <h3>AVL insertion: the four imbalances</h3>
          <p className="balanced-trees-note">
            After a normal BST insert, walk back up and fix any node whose balance factor leaves the
            range -1 to 1. Show replaces the AVL tree with a three-node example of that case.
          </p>
          <div className="balanced-trees-scroll">
            <table className="balanced-trees-table">
              <thead>
                <tr>
                  <th scope="col">Imbalance</th>
                  <th scope="col">New value went...</th>
                  <th scope="col">Fix</th>
                  <th scope="col"><span className="balanced-trees-hidden">Demo</span></th>
                </tr>
              </thead>
              <tbody>
                {CASES.map(([name, went, fix]) => (
                  <tr key={name}>
                    <th scope="row">{capitalize(name)}</th>
                    <td>{went}</td>
                    <td>{fix}</td>
                    <td>{btn(`Show ${name}`, () => onCase(name))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="balanced-trees-section" aria-label="Rotation">
        <h3>A single rotation</h3>
        <p className="balanced-trees-note">
          The diagram&apos;s nodes as numbers: A = 1, x = 2, B = 3, y = 4, C = 5. A, B and C stand for
          whole subtrees. B changes parent; nothing else below x and y moves.
        </p>
        <div className="ds-controls balanced-trees-controls">
          {btn('Rotate right', () => onRotate('right'))}
          {btn('Rotate left', () => onRotate('left'))}
        </div>
        {rotation && (
          <>
            <div className="balanced-trees-pair">
              <TreeDrawing tree={rotation.before} label={`Tree before rotating ${rotation.direction}`} />
              <span className="balanced-trees-arrow" aria-hidden="true">{'->'}</span>
              <TreeDrawing tree={rotation.after} label={`Tree after rotating ${rotation.direction}`} />
            </div>
            <p className="balanced-trees-note">Sorted order stays {rotation.inorder.join(', ')}.</p>
          </>
        )}
      </section>

      <section className="balanced-trees-section" aria-label="Build and compare">
        <h3>Build and compare</h3>
        <p className="balanced-trees-note">
          Build loads the values into the selected tree. Compare inserts them into a fresh AVL tree
          and a fresh red-black tree, then deletes them in the same order, leaving the trees above
          alone.
        </p>
        <div className="ds-controls balanced-trees-controls">
          <input
            type="text"
            aria-label="Values"
            placeholder="Values, comma separated"
            value={listText}
            onChange={(e) => setListText(e.target.value)}
            disabled={loading}
          />
          {btn('Build', onBuild)}
          {btn('Compare both', onCompare)}
        </div>
        {comparison && (
          <div className="balanced-trees-scroll">
            <table className="balanced-trees-table">
              <caption>Comparison over {plural(comparison.count, 'distinct value')}</caption>
              <thead>
                <tr>
                  <th scope="col">Tree</th>
                  <th scope="col">Height</th>
                  <th scope="col">Insert rotations</th>
                  <th scope="col">Delete rotations</th>
                  <th scope="col">Height figure</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(KIND_NAME).map((k) => (
                  <tr key={k}>
                    <th scope="row">{KIND_NAME[k]}</th>
                    <td>{comparison[k].height}</td>
                    <td>{comparison[k].insert_rotations}</td>
                    <td>{comparison[k].delete_rotations}</td>
                    <td>{comparison[k].height_bound}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
