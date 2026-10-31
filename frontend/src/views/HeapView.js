import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './HeapView.css';

const WHOLE = /^-?\d+$/;
const parseList = (text) => text.split(',').map((t) => t.trim()).filter((t) => t !== '');

function describe(op, result) {
  switch (op) {
    case 'pop':
      return `Popped the minimum: ${result}`;
    case 'peek':
      return `Peek (root, index 0): ${result}`;
    case 'push':
      return `Pushed ${result}: appended, then sifted up`;
    case 'build':
      return 'Built a heap from the list in O(n) by sifting down from the last parent.';
    case 'search':
      return result.index >= 0
        ? `Found at index ${result.index} after checking ${result.checked} item(s)`
        : `Not found after checking all ${result.checked} item(s)`;
    case 'kth-largest':
      return `Kth largest: ${result}`;
    case 'top-k-frequent':
      return `Top k frequent: [${result.join(', ')}]`;
    case 'median-add':
      return `Added. Median is now ${result}`;
    case 'median':
      return `Median: ${result}`;
    default:
      return '';
  }
}

const GAP_X = 44;
const GAP_Y = 56;
const R = 17;

function TreeSvg({ items, highlight }) {
  const levels = Math.floor(Math.log2(items.length)) + 1;
  const width = Math.max(2 ** (levels - 1) * GAP_X, 120);
  const height = (levels - 1) * GAP_Y + 2 * R + 8;
  const pos = (i) => {
    const level = Math.floor(Math.log2(i + 1));
    const idx = i + 1 - 2 ** level;
    return { x: ((idx + 0.5) / 2 ** level) * width, y: R + 4 + level * GAP_Y };
  };
  return (
    <div className="heap-scroll">
      <svg
        className="heap-svg"
        width={width}
        height={height}
        role="img"
        aria-label="Heap as a binary tree"
        data-testid="heap-tree"
      >
        {items.map((_, i) => {
          if (i === 0) return null;
          const a = pos((i - 1) >> 1);
          const b = pos(i);
          return <line key={`e${i}`} data-testid="heap-edge" className="heap-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        {items.map((v, i) => {
          const p = pos(i);
          return (
            <g key={i}>
              <circle
                data-testid="heap-node"
                className={i === highlight ? 'heap-node heap-node-hl' : 'heap-node'}
                cx={p.x}
                cy={p.y}
                r={R}
              />
              <text className="heap-node-text" x={p.x} y={p.y}>{String(v)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function HeapView() {
  const { state, error, loading, run } = useDsState('heap');
  const [valueText, setValueText] = useState('');
  const [buildText, setBuildText] = useState('9, 4, 7, 1, 8, 2');
  const [numsText, setNumsText] = useState('3, 2, 1, 5, 6, 4');
  const [kText, setKText] = useState('2');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [highlight, setHighlight] = useState(-1);

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result) : '');
    setHighlight(-1);
    return data;
  };

  const withValue = async (op) => {
    if (!WHOLE.test(valueText.trim())) {
      setLocalError('Please enter a whole number');
      return;
    }
    const data = await exec(op, { value: Number(valueText.trim()) });
    if (data && op === 'search') setHighlight(data.result.index);
  };

  const onPeek = async () => {
    const data = await exec('peek');
    if (data) setHighlight(0);
  };

  const onBuild = () => {
    const parts = parseList(buildText);
    if (parts.some((t) => !WHOLE.test(t))) {
      setLocalError('Items must be whole numbers separated by commas');
      return;
    }
    exec('build', { items: parts.map(Number) });
  };

  const withNums = (op) => {
    const parts = parseList(numsText);
    if (parts.length === 0 || parts.some((t) => !WHOLE.test(t)) || !/^\d+$/.test(kText.trim())) {
      setLocalError('Numbers must be whole numbers separated by commas, and k a positive whole number');
      return;
    }
    exec(op, { nums: parts.map(Number), k: Number(kText.trim()) });
  };

  const addMedian = () => {
    if (!WHOLE.test(valueText.trim())) {
      setLocalError('Please enter a whole number');
      return;
    }
    exec('median-add', { value: Number(valueText.trim()) });
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );

  return (
    <div className="ds-container">
      <h2>Heap Visualization</h2>
      <p className="heap-intro">
        A priority queue always removes the highest-priority item. A binary heap is the usual
        implementation: a complete binary tree in which each parent is no larger than its children
        (for a min-heap). It is only partially sorted, so siblings have no defined order. It is
        stored in an array: parent (i - 1) // 2, left child 2i + 1, right child 2i + 2.
      </p>
      <p className="heap-complexity">
        Peek O(1). Push O(log n): append, then sift up. Pop O(log n): move the last item to the
        root, then sift down. Build from n items O(n), not O(n log n), because most nodes sit near
        the bottom and sift only a short distance. Search O(n): no ordering to exploit.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls">
        <input
          type="text"
          aria-label="Value"
          placeholder="Value"
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          disabled={loading}
        />
        {btn('Push', () => withValue('push'))}
        {btn('Pop', () => exec('pop'))}
        {btn('Peek', onPeek)}
        {btn('Search', () => withValue('search'))}
        {btn('Reset all', () => exec('reset'))}
      </div>
      <div className="ds-controls">
        <input
          type="text"
          aria-label="Items to build from"
          value={buildText}
          onChange={(e) => setBuildText(e.target.value)}
          disabled={loading}
        />
        {btn('Build heap', onBuild)}
      </div>

      {message && <div className="heap-result" role="status">{message}</div>}

      {loaded && (
        <>
          <section className="heap-section" aria-label="Tree form">
            <h3>Tree form</h3>
            {state.items.length === 0 ? (
              <p className="empty-message">Heap is empty.</p>
            ) : (
              <TreeSvg items={state.items} highlight={highlight} />
            )}
          </section>
          <section className="heap-section" aria-label="Array form">
            <h3>Array form (size {state.size})</h3>
            <div className="heap-scroll">
              <div className="heap-row" role="list" aria-label="Heap array">
                {state.items.map((v, i) => (
                  <span key={i} role="listitem" className="heap-slot">
                    <span className={i === highlight ? 'heap-cell heap-cell-hl' : 'heap-cell'}>
                      {String(v)}
                    </span>
                    <span>{i}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="heap-section" aria-label="Running median">
            <h3>Running median: two heaps</h3>
            <p>
              A max-heap holds the lower half and a min-heap the upper half. Uses the Value box
              above.
            </p>
            <div className="ds-controls">
              {btn('Add to median', addMedian)}
              {btn('Get median', () => exec('median'))}
            </div>
            <p data-testid="median-state">
              Lower half (max-heap): [{state.median.low.join(', ')}]. Upper half (min-heap): [
              {state.median.high.join(', ')}]. Median:{' '}
              {state.median.value === null ? 'none yet' : state.median.value}
            </p>
          </section>
        </>
      )}

      <section className="heap-section" aria-label="Heap algorithms">
        <h3>Heap techniques</h3>
        <p>
          Kth largest keeps a min-heap of size k, O(n log k). Top K frequent counts values, then
          takes the k largest counts.
        </p>
        <div className="ds-controls">
          <input
            type="text"
            aria-label="Numbers"
            value={numsText}
            onChange={(e) => setNumsText(e.target.value)}
            disabled={loading}
          />
          <input
            type="text"
            aria-label="k"
            value={kText}
            onChange={(e) => setKText(e.target.value)}
            disabled={loading}
          />
          {btn('Kth largest', () => withNums('kth-largest'))}
          {btn('Top K frequent', () => withNums('top-k-frequent'))}
        </div>
      </section>
    </div>
  );
}
