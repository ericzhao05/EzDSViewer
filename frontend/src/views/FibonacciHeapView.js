import React, { useMemo, useState } from 'react';
import useDsState from '../hooks/useDsState';
import './FibonacciHeapView.css';

const WHOLE = /^-?\d+$/;
const NODE_W = 58;
const NODE_H = 46;
const H_GAP = 20;
const V_GAP = 32;
const ROOT_GAP = 52;
const PAD_X = 24;
const PAD_TOP = 46;
const PAD_BOTTOM = 18;
const WRAP_Y = 8;

function flatten(roots) {
  const out = [];
  const walk = (node) => {
    out.push(node);
    node.children.forEach(walk);
  };
  roots.forEach(walk);
  return out;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function nodeLabel(node, minId) {
  if (node.id === minId) return `Node ${node.key}, minimum`;
  if (node.mark) return `Node ${node.key}, marked`;
  return `Node ${node.key}`;
}

function layoutForest(roots) {
  const widths = new Map();
  const measure = (node) => {
    if (widths.has(node.id)) return widths.get(node.id);
    let width = NODE_W;
    if (node.children.length) {
      const inner = node.children.reduce((sum, child) => sum + measure(child), 0)
        + H_GAP * (node.children.length - 1);
      width = Math.max(NODE_W, inner);
    }
    widths.set(node.id, width);
    return width;
  };

  const nodes = [];
  const edges = [];
  const rootCenters = [];

  const place = (node, left, top) => {
    const width = measure(node);
    const x = left + width / 2;
    const y = top + NODE_H / 2;
    nodes.push({ node, x, y });
    if (node.children.length) {
      const inner = node.children.reduce((sum, child) => sum + measure(child), 0)
        + H_GAP * (node.children.length - 1);
      let childLeft = left + (width - inner) / 2;
      const childTop = top + NODE_H + V_GAP;
      node.children.forEach((child) => {
        const childWidth = measure(child);
        edges.push({
          key: `${node.id}-${child.id}`,
          x1: x,
          y1: y + NODE_H / 2,
          x2: childLeft + childWidth / 2,
          y2: childTop,
        });
        place(child, childLeft, childTop);
        childLeft += childWidth + H_GAP;
      });
    }
    return { x, y, width };
  };

  let cursor = PAD_X;
  roots.forEach((root, index) => {
    const placed = place(root, cursor, PAD_TOP);
    rootCenters.push(placed);
    cursor += placed.width;
    if (index < roots.length - 1) cursor += ROOT_GAP;
  });

  const width = Math.max(cursor + PAD_X, 180);
  const height = nodes.reduce((max, item) => Math.max(max, item.y + NODE_H / 2), PAD_TOP) + PAD_BOTTOM;
  const rootLinks = [];
  for (let i = 0; i < rootCenters.length - 1; i += 1) {
    const a = rootCenters[i];
    const b = rootCenters[i + 1];
    rootLinks.push({
      key: `root-${i}`,
      x1: a.x + NODE_W / 2,
      y1: a.y,
      x2: b.x - NODE_W / 2,
      y2: b.y,
    });
  }

  let wrap = null;
  if (rootCenters.length > 1) {
    const first = rootCenters[0];
    const last = rootCenters[rootCenters.length - 1];
    const yNode = first.y - NODE_H / 2;
    const leftX = first.x - NODE_W / 2;
    const rightX = last.x + NODE_W / 2;
    wrap = `M ${rightX} ${yNode} V ${WRAP_Y} H ${leftX} V ${yNode}`;
  }

  return { nodes, edges, rootLinks, wrap, width, height };
}

function describe(op, result) {
  if (op === 'reset') return { message: 'Restored the opening heaps.', steps: [] };
  if (!result) return { message: '', steps: [] };
  if (op === 'insert') return { message: `Inserted ${result.key} into heap A.`, steps: [] };
  if (op === 'other-insert') return { message: `Inserted ${result.key} into heap B.`, steps: [] };
  if (op === 'find-min') return { message: `Minimum: ${result.key}`, steps: [] };
  if (op === 'extract-min') {
    const steps = (result.links || []).map(
      (link) => `Linked ${link.child_key} under ${link.parent_key} (both had degree ${link.degree})`
    );
    return { message: `Extracted ${result.key}.`, steps };
  }
  if (op === 'decrease-key') {
    const cuts = result.cuts || [];
    const steps = cuts.map((cut) => (
      cut.cascading
        ? `Cascading cut: ${cut.key} from parent ${cut.parent_key}`
        : `Cut ${cut.key} from parent ${cut.parent_key}`
    ));
    if (result.marked !== null && result.marked !== undefined) steps.push(`Marked ${result.marked}`);
    const held = cuts.length === 0 ? ' Heap order still holds.' : '';
    return { message: `Decreased ${result.old_key} to ${result.key}.${held}`, steps };
  }
  if (op === 'merge') {
    const noun = result.moved === 1 ? 'node' : 'nodes';
    return { message: `Moved ${result.moved} ${noun} into heap A.`, steps: [] };
  }
  return { message: '', steps: [] };
}

function HeapFigure({
  roots, minId, testId, emptyText, interactive, selectedId, onSelect, disabled,
}) {
  const layout = useMemo(() => layoutForest(roots), [roots]);
  const minItem = layout.nodes.find((item) => item.node.id === minId);

  return (
    <div className="fibonacci-heap-scroll" data-testid={testId}>
      {roots.length === 0 ? (
        <p className="empty-message">{emptyText}</p>
      ) : (
        <div
          className="fibonacci-heap-canvas"
          style={{ width: layout.width, height: layout.height }}
        >
          <svg
            className="fibonacci-heap-svg"
            width={layout.width}
            height={layout.height}
            aria-hidden="true"
          >
            <defs>
              <marker
                id={`${testId}-arrow`}
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" className="fibonacci-heap-arrow" />
              </marker>
            </defs>
            {layout.wrap && (
              <path
                data-testid="fibonacci-heap-root-wrap"
                className="fibonacci-heap-root-wrap"
                d={layout.wrap}
                markerEnd={`url(#${testId}-arrow)`}
              />
            )}
            {layout.rootLinks.map((link) => (
              <line
                key={link.key}
                data-testid="fibonacci-heap-root-link"
                className="fibonacci-heap-root-link"
                x1={link.x1}
                y1={link.y1}
                x2={link.x2}
                y2={link.y2}
                markerEnd={`url(#${testId}-arrow)`}
              />
            ))}
            {layout.edges.map((edge) => (
              <line
                key={edge.key}
                data-testid="fibonacci-heap-edge"
                className="fibonacci-heap-edge"
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
              />
            ))}
          </svg>
          {minItem && (
            <span
              className="fibonacci-heap-min"
              style={{ left: minItem.x, top: minItem.y - NODE_H / 2 }}
            >
              min
            </span>
          )}
          {layout.nodes.map((item) => {
            const { node } = item;
            const label = nodeLabel(node, minId);
            const className = [
              'fibonacci-heap-node',
              node.id === minId ? 'fibonacci-heap-node-min' : '',
              node.mark ? 'fibonacci-heap-node-mark' : '',
              interactive && String(node.id) === selectedId ? 'fibonacci-heap-node-selected' : '',
            ].filter(Boolean).join(' ');
            const style = {
              left: item.x - NODE_W / 2,
              top: item.y - NODE_H / 2,
              width: NODE_W,
              height: NODE_H,
            };
            const body = (
              <>
                <span className="fibonacci-heap-key">{node.key}</span>
                <span className="fibonacci-heap-deg">{`deg ${node.degree}`}</span>
              </>
            );
            if (!interactive) {
              return (
                <div
                  key={node.id}
                  data-testid="fibonacci-heap-node"
                  className={className}
                  style={style}
                  role="img"
                  aria-label={label}
                >
                  {body}
                </div>
              );
            }
            return (
              <button
                key={node.id}
                type="button"
                data-testid="fibonacci-heap-node"
                className={className}
                style={style}
                aria-label={label}
                title={label}
                disabled={disabled}
                onClick={() => onSelect(String(node.id))}
              >
                {body}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FibonacciHeapView() {
  const { state, error, loading, run } = useDsState('fibonacci-heap');
  const [keyText, setKeyText] = useState('');
  const [newKey, setNewKey] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [localError, setLocalError] = useState('');
  const [message, setMessage] = useState('');
  const [steps, setSteps] = useState([]);

  const loaded = state !== null;
  const shownError = localError || error;
  const busy = loading || !loaded;
  const aNodes = loaded ? flatten(state.heap.roots) : [];
  const activeId = aNodes.some((node) => String(node.id) === selectedId) ? selectedId : '';

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    if (!data) {
      setMessage('');
      setSteps([]);
      return;
    }
    const next = describe(op, data.result);
    setMessage(next.message);
    setSteps(next.steps);
  };

  const onInsert = (op) => {
    if (!WHOLE.test(keyText.trim())) {
      setLocalError('Enter a whole number.');
      return;
    }
    exec(op, { value: Number(keyText.trim()) });
  };

  const onDecrease = () => {
    if (!WHOLE.test(newKey.trim())) {
      setLocalError('Enter a whole number.');
      return;
    }
    exec('decrease-key', { id: Number(activeId), key: Number(newKey.trim()) });
  };

  const btn = (label, onClick, extraDisabled) => (
    <button
      type="button"
      className="control-btn"
      onClick={onClick}
      disabled={busy || extraDisabled}
    >
      {label}
    </button>
  );

  return (
    <div className="ds-container fibonacci-heap">
      <h2>Fibonacci Heap</h2>
      <p className="fibonacci-heap-intro">
        A Fibonacci heap is a priority queue with O(1) amortized decrease-key.
        It shows up in theory courses and is rarely used in practice.
        Roots sit in a circular list; each root is a tree that keeps heap order.
        Decrease-key cuts a node out when it would beat its parent, and a marked
        parent that loses a second child is cut too.
      </p>
      <p className="fibonacci-heap-complexity">
        Insert O(1). Find-min O(1). Merge O(1). Decrease-key O(1) amortized.
        Extract-min O(log n) amortized: consolidation links roots that share a
        degree, and the size of a degree-d tree is at least the (d+2)th Fibonacci
        number. The potential is the number of trees plus twice the marked nodes.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls fibonacci-heap-controls">
        <div className="fibonacci-heap-field">
          <label htmlFor="fibonacci-heap-insert-key">Key to insert</label>
          <input
            id="fibonacci-heap-insert-key"
            type="text"
            inputMode="numeric"
            value={keyText}
            onChange={(e) => setKeyText(e.target.value)}
            disabled={busy}
          />
        </div>
        {btn('Insert into A', () => onInsert('insert'))}
        {btn('Insert into B', () => onInsert('other-insert'))}
      </div>
      <div className="ds-controls fibonacci-heap-controls">
        {btn('Find min', () => exec('find-min'))}
        {btn('Extract min', () => exec('extract-min'))}
        {btn('Merge B into A', () => exec('merge'))}
        {btn('Reset all', () => exec('reset'))}
      </div>
      <div className="ds-controls fibonacci-heap-controls">
        <div className="fibonacci-heap-field">
          <label htmlFor="fibonacci-heap-decrease-node">Node to decrease</label>
          <select
            id="fibonacci-heap-decrease-node"
            value={activeId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={busy || aNodes.length === 0}
          >
            <option value="">Select a node</option>
            {aNodes.map((node) => (
              <option key={node.id} value={String(node.id)}>
                {`${node.key} · id ${node.id}${node.mark ? ', marked' : ''}${node.id === state.heap.min_id ? ', min' : ''}`}
              </option>
            ))}
          </select>
        </div>
        <div className="fibonacci-heap-field">
          <label htmlFor="fibonacci-heap-new-key">New key</label>
          <input
            id="fibonacci-heap-new-key"
            type="text"
            inputMode="numeric"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            disabled={busy}
          />
        </div>
        {btn('Decrease key', onDecrease, !activeId)}
      </div>

      {message && <p className="fibonacci-heap-result" role="status">{message}</p>}
      {steps.length > 0 && (
        <div data-testid="fibonacci-heap-steps" className="fibonacci-heap-steps">
          {steps.map((line, index) => <p key={index}>{line}</p>)}
        </div>
      )}

      {loaded && (
        <>
          <p className="fibonacci-heap-note">
            {`Each heap holds at most ${state.limits.max_items} nodes. A dashed box has lost a child. Horizontal links are the root list; the dashed line closes it.`}
          </p>
          <section className="fibonacci-heap-section" aria-label="Heap A">
            <h3>Heap A</h3>
            <p data-testid="fibonacci-heap-stats-a" className="fibonacci-heap-stats">
              {`${plural(state.heap.size, 'node')}, ${plural(state.heap.trees, 'tree')}, ${state.heap.marked} marked, potential ${state.heap.potential}`}
            </p>
            <HeapFigure
              roots={state.heap.roots}
              minId={state.heap.min_id}
              testId="fibonacci-heap-a"
              emptyText="Heap A is empty."
              interactive
              selectedId={activeId}
              onSelect={setSelectedId}
              disabled={loading}
            />
          </section>
          <section className="fibonacci-heap-section" aria-label="Heap B">
            <h3>Heap B</h3>
            <p className="fibonacci-heap-stats">
              {`${plural(state.other.size, 'node')}, ${plural(state.other.trees, 'tree')}. Merge splices this root list onto A.`}
            </p>
            <HeapFigure
              roots={state.other.roots}
              minId={state.other.min_id}
              testId="fibonacci-heap-b"
              emptyText="Heap B is empty."
              interactive={false}
              selectedId=""
              onSelect={() => {}}
              disabled
            />
          </section>
        </>
      )}
    </div>
  );
}
