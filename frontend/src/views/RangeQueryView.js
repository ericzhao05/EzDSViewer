import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './RangeQueryView.css';

const INT = /^-?\d+$/;
const CELL_W = 44;

const lowbit = (i) => i & -i;

function describe(op, result) {
  switch (op) {
    case 'prefix-sum':
      return `Prefix sum: ${result.sum}`;
    case 'range-sum':
      return `Range sum: ${result.sum}`;
    case 'range-min':
      return `Range minimum: ${result.min}`;
    default:
      return '';
  }
}

function FenwickDiagram({ nums, tree, marked, subtracted }) {
  return (
    <div className="range-query-scroll">
      <div className="range-query-fenwick" data-testid="fenwick-tree">
        {tree.map((v, k) => {
          const pos = k + 1;
          const cls = [
            'range-query-cell',
            marked.includes(pos) ? 'range-query-hit' : '',
            subtracted.includes(pos) ? 'range-query-minus' : '',
          ].join(' ');
          return (
            <div key={pos} className="range-query-col">
              <div className={cls} data-testid={`fenwick-${pos}`}>{v}</div>
              <div className="range-query-sub">tree[{pos}]</div>
              <div className="range-query-sub">covers {pos - lowbit(pos)}..{pos - 1}</div>
              <div className="range-query-cell range-query-array" title="Array value">{nums[k]}</div>
              <div className="range-query-sub">nums[{k}]</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SegmentDiagram({ n, tree, marked }) {
  const total = 2 * n;
  const levels = Math.floor(Math.log2(total - 1)) + 1;
  const width = Math.max(2 ** (levels - 1) * CELL_W, 320);
  const height = levels * 56 + 20;
  const pos = (i) => {
    const level = Math.floor(Math.log2(i));
    const slots = 2 ** level;
    return { x: ((i - slots + 0.5) / slots) * width, y: level * 56 + 26 };
  };
  const nodes = [];
  for (let i = 1; i < total; i += 1) nodes.push(i);
  return (
    <div className="range-query-scroll">
      <svg
        className="range-query-svg"
        width={width}
        height={height}
        role="img"
        aria-label="Segment tree"
        data-testid="segment-tree"
      >
        {nodes.filter((i) => i > 1).map((i) => {
          const a = pos(i);
          const b = pos(Math.floor(i / 2));
          return <line key={`e${i}`} className="range-query-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        {nodes.map((i) => {
          const p = pos(i);
          const leaf = i >= n;
          const hit = marked.includes(i);
          return (
            <g key={i} data-testid={`segment-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={18}
                className={`range-query-node${leaf ? ' range-query-leaf' : ''}${hit ? ' range-query-node-hit' : ''}`}
              />
              <text x={p.x} y={p.y + 4} textAnchor="middle" className="range-query-node-text">
                {tree[i]}
              </text>
              <text x={p.x} y={p.y + 30} textAnchor="middle" className="range-query-node-index">
                {i}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function RangeQueryView() {
  const { state, error, loading, run } = useDsState('range-query');
  const [mode, setMode] = useState('fenwick');
  const [indexText, setIndexText] = useState('0');
  const [valueText, setValueText] = useState('10');
  const [leftText, setLeftText] = useState('1');
  const [rightText, setRightText] = useState('4');
  const [numsText, setNumsText] = useState('5, 2, 7, 1, 9, 3, 6, 4');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [marked, setMarked] = useState({ fenwick: [], subtract: [], segment: [] });

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    if (!data) {
      setMessage('');
      return null;
    }
    setMessage(describe(op, data.result));
    const r = data.result || {};
    if (op === 'set' || op === 'add') {
      setMarked({ fenwick: r.touched.fenwick, subtract: [], segment: r.touched.segment });
      setMessage(`Updated; highlighted nodes were rewritten.`);
    } else if (op === 'range-min') {
      setMarked({ fenwick: [], subtract: [], segment: r.nodes });
    } else if (op === 'prefix-sum' || op === 'range-sum') {
      setMarked({ fenwick: r.nodes, subtract: r.subtract_nodes || [], segment: [] });
    } else {
      setMarked({ fenwick: [], subtract: [], segment: [] });
    }
    return data;
  };

  const ints = (...texts) => {
    if (texts.some((t) => !INT.test(t.trim()))) {
      setLocalError('Please enter whole numbers');
      return null;
    }
    return texts.map((t) => Number(t.trim()));
  };

  const onUpdate = (op) => {
    const v = ints(indexText, valueText);
    if (v) exec(op, { index: v[0], [op === 'set' ? 'value' : 'delta']: v[1] });
  };

  const onRange = (op) => {
    const v = ints(leftText, rightText);
    if (v) exec(op, { left: v[0], right: v[1] });
  };

  const onPrefix = () => {
    const v = ints(rightText);
    if (v) exec('prefix-sum', { count: v[0] });
  };

  const onLoad = () => {
    const parts = numsText.split(',').map((t) => t.trim()).filter((t) => t !== '');
    if (parts.length === 0 || parts.some((t) => !INT.test(t))) {
      setLocalError('Numbers must be whole numbers separated by commas');
      return;
    }
    exec('load', { nums: parts.map(Number) });
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const isFenwick = mode === 'fenwick';

  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );
  const field = (label, value, set) => (
    <input
      type="text"
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => set(e.target.value)}
      disabled={loading}
    />
  );

  return (
    <div className="ds-container">
      <h2>Range Query Visualization</h2>
      <p className="range-query-intro">
        Prefix sums answer range queries in O(1) but cost O(n) to update. A Fenwick tree and a
        segment tree make both operations O(log n).
      </p>
      <p className="range-query-complexity">
        {isFenwick
          ? 'Fenwick (binary indexed) tree: update and query O(log n), space O(n). Very short code; handles prefix-based operations such as sums.'
          : 'Segment tree: update and query O(log n), space O(n). Longer code; handles any associative operation, including min and max. Here it answers range minimum.'}
      </p>

      <div className="ds-controls" role="group" aria-label="Structure">
        <button
          className="control-btn"
          aria-pressed={isFenwick}
          onClick={() => setMode('fenwick')}
          disabled={isFenwick}
        >
          Fenwick tree
        </button>
        <button
          className="control-btn"
          aria-pressed={!isFenwick}
          onClick={() => setMode('segment')}
          disabled={!isFenwick}
        >
          Segment tree
        </button>
      </div>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}
      {message && <div className="range-query-result" role="status">{message}</div>}

      {loaded && state.nums.length === 0 && <p className="empty-message">Array is empty.</p>}
      {loaded && state.nums.length > 0 && (
        isFenwick ? (
          <FenwickDiagram
            nums={state.nums}
            tree={state.fenwick}
            marked={marked.fenwick}
            subtracted={marked.subtract}
          />
        ) : (
          <SegmentDiagram n={state.nums.length} tree={state.segment} marked={marked.segment} />
        )
      )}
      {loaded && (
        <p className="range-query-legend">
          Highlighted nodes are the ones the last operation read or rewrote
          {isFenwick ? '; dashed nodes are subtracted for a range sum.' : '.'}
        </p>
      )}

      <div className="ds-controls">
        {field('Index', indexText, setIndexText)}
        {field('Value or delta', valueText, setValueText)}
        {btn('Set value', () => onUpdate('set'))}
        {btn('Add delta', () => onUpdate('add'))}
      </div>
      <div className="ds-controls">
        {field('Left', leftText, setLeftText)}
        {field('Right', rightText, setRightText)}
        {isFenwick ? btn('Range sum', () => onRange('range-sum')) : btn('Range min', () => onRange('range-min'))}
        {isFenwick && btn('Prefix sum of first Right elements', onPrefix)}
      </div>
      <div className="ds-controls">
        {field('Array', numsText, setNumsText)}
        {btn('Load array', onLoad)}
        {btn('Reset', async () => {
          setLocalError('');
          const d = await exec('reset');
          setMessage(d ? 'Reset.' : '');
        })}
      </div>
    </div>
  );
}
