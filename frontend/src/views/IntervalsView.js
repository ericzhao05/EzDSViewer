import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './IntervalsView.css';

const PAIR = /^\s*\[?\s*(-?\d+)\s*,\s*(-?\d+)\s*\]?\s*$/;

const parsePair = (text) => {
  const m = PAIR.exec(text);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

// "1,3 2,6 8,10" or "[1,3], [2,6]" -> [[1,3],[2,6],[8,10]]; null if malformed
const parsePairs = (text) => {
  const t = text.trim();
  if (!t) return [];
  const chunks = t.match(/\[?\s*-?\d+\s*,\s*-?\d+\s*\]?/g) || [];
  const rest = t.replace(/\[?\s*-?\d+\s*,\s*-?\d+\s*\]?/g, '').replace(/[\s,;]/g, '');
  if (rest !== '') return null;
  const pairs = chunks.map(parsePair);
  return pairs.some((p) => p === null || p[0] > p[1]) ? null : pairs;
};

const show = (p) => `[${p[0]}, ${p[1]}]`;
const showAll = (list) => `[${list.map(show).join(', ')}]`;

function describe(op, result) {
  switch (op) {
    case 'add':
      return `Added ${show(result)}`;
    case 'remove':
      return `Removed ${show(result)}`;
    case 'build':
      return 'Replaced the list.';
    case 'overlap':
      return result
        ? 'They overlap (a[0] < b[1] and b[0] < a[1])'
        : 'They do not overlap (touching endpoints do not count here)';
    case 'merge':
      return `Merged: ${showAll(result)}`;
    case 'insert':
      return `Inserted ${show(result.new)} into the merged list: ${showAll(result.result)}`;
    case 'non-overlapping':
      return `Remove at least ${result} interval(s) so the rest do not overlap`;
    case 'meeting-rooms':
      return `Minimum rooms needed: ${result}`;
    default:
      return '';
  }
}

const LEFT = 8;
const LANE_H = 26;
const BAR_H = 18;
const PX = 28;

function assignLanes(list) {
  const order = list.map((p, i) => ({ p, i })).sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1]);
  const ends = [];
  const lane = new Array(list.length).fill(0);
  order.forEach(({ p, i }) => {
    let l = ends.findIndex((e) => e <= p[0]);
    if (l === -1) {
      l = ends.length;
      ends.push(p[1]);
    } else {
      ends[l] = p[1];
    }
    lane[i] = l;
  });
  return { lane, count: Math.max(ends.length, 1) };
}

function Timeline({ list, lo, hi, label, testid, cls }) {
  const span = Math.max(hi - lo, 1);
  const width = Math.max(span * PX, 240) + LEFT * 2;
  const x = (v) => LEFT + ((v - lo) / span) * (width - LEFT * 2);
  const { lane, count } = assignLanes(list);
  const height = count * LANE_H + 28;
  const ticks = [];
  const step = Math.max(1, Math.ceil(span / 20));
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  return (
    <div className="intervals-scroll">
      <svg className="intervals-svg" width={width} height={height} role="img" aria-label={label} data-testid={testid}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="intervals-tick" x1={x(v)} x2={x(v)} y1={0} y2={count * LANE_H + 4} />
            <text className="intervals-tick-text" x={x(v)} y={count * LANE_H + 18}>{v}</text>
          </g>
        ))}
        {list.map((p, i) => {
          const w = Math.max(x(p[1]) - x(p[0]), 3);
          return (
            <g key={i}>
              <rect
                data-testid={`${testid}-bar`}
                className={`intervals-bar ${cls || ''}`}
                x={x(p[0])}
                y={lane[i] * LANE_H + 4}
                width={w}
                height={BAR_H}
                rx={4}
              />
              <text className="intervals-bar-text" x={x(p[0]) + w / 2} y={lane[i] * LANE_H + 4 + BAR_H / 2}>
                {show(p)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function IntervalsView() {
  const { state, error, loading, run } = useDsState('intervals');
  const [pairText, setPairText] = useState('');
  const [indexText, setIndexText] = useState('0');
  const [buildText, setBuildText] = useState('[0, 30], [5, 10], [15, 20]');
  const [aText, setAText] = useState('1, 3');
  const [bText, setBText] = useState('2, 4');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [shown, setShown] = useState(null); // { title, list } drawn under the list

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result) : '');
    setShown(null);
    return data;
  };

  const withPair = async (op) => {
    const p = parsePair(pairText);
    if (!p || p[0] > p[1]) {
      setLocalError('Enter an interval as start, end (two whole numbers, start no larger than end)');
      return;
    }
    const data = await exec(op, { interval: p });
    if (data && op === 'insert') setShown({ title: 'After insert', list: data.result.result, newOne: data.result.new });
  };

  const onRemove = () => {
    if (!/^\d+$/.test(indexText.trim())) {
      setLocalError('Index must be a whole number');
      return;
    }
    exec('remove', { index: Number(indexText.trim()) });
  };

  const onBuild = () => {
    const pairs = parsePairs(buildText);
    if (pairs === null) {
      setLocalError('Enter intervals like [1, 3], [2, 6] with start no larger than end');
      return;
    }
    exec('build', { intervals: pairs });
  };

  const onOverlap = () => {
    const a = parsePair(aText);
    const b = parsePair(bText);
    if (!a || !b || a[0] > a[1] || b[0] > b[1]) {
      setLocalError('a and b must each be start, end (two whole numbers)');
      return;
    }
    exec('overlap', { a, b });
  };

  const onMerge = async () => {
    const data = await exec('merge');
    if (data) setShown({ title: 'Merged', list: data.result });
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );

  let lo = 0;
  let hi = 1;
  if (loaded) {
    const all = [...state.intervals, ...(shown ? shown.list : [])];
    if (shown && shown.newOne) all.push(shown.newOne);
    if (all.length) {
      lo = Math.min(...all.map((p) => p[0]));
      hi = Math.max(...all.map((p) => p[1]));
    }
  }

  return (
    <div className="ds-container">
      <h2>Intervals Visualization</h2>
      <p className="intervals-intro">
        Pairs of [start, end]. This is more a problem family than a structure. Nearly every
        solution starts by sorting by start, then scanning once. Two intervals a and b overlap
        when a[0] &lt; b[1] and b[0] &lt; a[1]; whether touching endpoints count depends on the
        problem, so ask.
      </p>
      <p className="intervals-complexity">
        Sort then scan: O(n log n) overall. Merge intervals merges when start &lt;= the last end.
        Meeting rooms II keeps a heap of end times, one entry per room in use.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls">
        <input
          type="text"
          aria-label="Interval"
          placeholder="start, end"
          value={pairText}
          onChange={(e) => setPairText(e.target.value)}
          disabled={loading}
        />
        {btn('Add', () => withPair('add'))}
        {btn('Insert (merged list)', () => withPair('insert'))}
        <input
          type="text"
          aria-label="Index to remove"
          value={indexText}
          onChange={(e) => setIndexText(e.target.value)}
          disabled={loading}
        />
        {btn('Remove', onRemove)}
        {btn('Clear', () => exec('clear'))}
        {btn('Reset all', () => exec('reset'))}
      </div>
      <div className="ds-controls">
        <input
          type="text"
          aria-label="Intervals to build from"
          value={buildText}
          onChange={(e) => setBuildText(e.target.value)}
          disabled={loading}
        />
        {btn('Set list', onBuild)}
      </div>
      <div className="ds-controls">
        {btn('Merge intervals', onMerge)}
        {btn('Meeting rooms', () => exec('meeting-rooms'))}
        {btn('Non-overlapping', () => exec('non-overlapping'))}
      </div>
      <div className="ds-controls">
        <input type="text" aria-label="Interval a" value={aText} onChange={(e) => setAText(e.target.value)} disabled={loading} />
        <input type="text" aria-label="Interval b" value={bText} onChange={(e) => setBText(e.target.value)} disabled={loading} />
        {btn('Overlap?', onOverlap)}
      </div>

      {message && <div className="intervals-result" role="status">{message}</div>}

      {loaded && (
        <>
          <section className="intervals-section" aria-label="Timeline">
            <h3>Timeline ({state.size} interval{state.size === 1 ? '' : 's'})</h3>
            {state.intervals.length === 0 ? (
              <p className="empty-message">No intervals.</p>
            ) : (
              <Timeline list={state.intervals} lo={lo} hi={hi} label="Intervals on a timeline" testid="intervals-main" />
            )}
            <ol className="intervals-list" aria-label="Interval list" start={0}>
              {state.intervals.map((p, i) => (
                <li key={i} value={i}>{show(p)}</li>
              ))}
            </ol>
          </section>
          {shown && (
            <section className="intervals-section" aria-label={shown.title}>
              <h3>{shown.title}</h3>
              {shown.list.length === 0 ? (
                <p className="empty-message">Nothing to show.</p>
              ) : (
                <Timeline list={shown.list} lo={lo} hi={hi} label={`${shown.title} intervals`} testid="intervals-shown" cls="intervals-bar-out" />
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
