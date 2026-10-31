import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './LinkedListView.css';

const INT = /^-?\d+$/;

const parseInts = (text) =>
  text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .map((t) => (INT.test(t) ? Number(t) : NaN));

function describe(op, result) {
  switch (op) {
    case 'delete':
      return `Removed value ${result.removed}.`;
    case 'find':
      return result.found ? `Found at index ${result.index}.` : 'Value not found.';
    case 'middle':
      return `Middle node: index ${result.index}, value ${result.value} (slow/fast pointers).`;
    case 'has-cycle':
      return result.has_cycle
        ? `Cycle detected: the tail points back to index ${result.cycle_to}.`
        : 'No cycle: the fast pointer reached the end.';
    case 'remove-nth-from-end':
      return `Removed value ${result.removed}.`;
    default:
      return '';
  }
}

export default function LinkedListView() {
  const { state, error, loading, run } = useDsState('linked-list');
  const [valueText, setValueText] = useState('');
  const [indexText, setIndexText] = useState('');
  const [nText, setNText] = useState('1');
  const [mergeText, setMergeText] = useState('2, 6, 10');
  const [message, setMessage] = useState('');
  const [highlight, setHighlight] = useState(null);
  const [localError, setLocalError] = useState('');

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    if (!data) {
      setMessage('');
      setHighlight(null);
      return null;
    }
    const r = data.result;
    setMessage(r ? describe(op, r) : '');
    if (op === 'find' && r && r.found) setHighlight(r.index);
    else if (op === 'middle' && r) setHighlight(r.index);
    else setHighlight(null);
    return data;
  };

  const needInt = (text, label) => {
    if (!INT.test(text.trim())) {
      setLocalError(`${label} must be a whole number`);
      return undefined;
    }
    return Number(text.trim());
  };

  const withValue = (op) => () => {
    const value = needInt(valueText, 'Value');
    if (value !== undefined) exec(op, { value });
  };
  const withIndex = (op) => () => {
    const index = needInt(indexText, 'Index');
    if (index !== undefined) exec(op, { index });
  };
  const onInsert = () => {
    const index = needInt(indexText, 'Index');
    const value = needInt(valueText, 'Value');
    if (index !== undefined && value !== undefined) exec('insert', { index, value });
  };
  const onRemoveNth = () => {
    const n = needInt(nText, 'N');
    if (n !== undefined) exec('remove-nth-from-end', { n });
  };
  const onMerge = () => {
    const values = parseInts(mergeText);
    if (values.some(Number.isNaN)) {
      setLocalError('Merge values must be whole numbers separated by commas');
      return;
    }
    exec('merge-sorted', { values });
  };
  const plain = (op, text) => async () => {
    const d = await exec(op, {});
    if (d && text) setMessage(text);
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const values = loaded ? state.values : [];
  const cycleTo = loaded ? state.cycle_to : null;
  const mid = values.length ? Math.floor(values.length / 2) : -1;

  return (
    <div className="ds-container">
      <h2>Linked List Visualization</h2>
      <p className="linked-list-intro">
        Nodes scattered through memory, each pointing to the next. It gives up O(1) indexing in
        exchange for O(1) insertion and removal at a position you already hold.
      </p>
      <p className="linked-list-complexity">
        Access by index: O(n). Insert or delete at front: O(1). Insert or delete at a known node:
        O(1), but a singly linked list needs the previous node. Memory: an extra pointer per node and
        poor locality (an array is compact and cache-friendly).
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}

      <div className="linked-list-scroll">
        {!loaded && !shownError && <p className="empty-message">Loading...</p>}
        {loaded && values.length === 0 && (
          <p className="empty-message">Linked list is empty. Push some nodes!</p>
        )}
        {loaded && (
          <ol className="linked-list-chain" aria-label="Linked list nodes">
            {values.map((v, i) => (
              <li
                key={i}
                data-testid={`node-${i}`}
                className={
                  'linked-list-item' +
                  (highlight === i ? ' linked-list-highlight' : '') +
                  (cycleTo === i ? ' linked-list-cycle-target' : '')
                }
              >
                <div className="linked-list-tags">
                  {i === 0 && <span className="linked-list-tag">head</span>}
                  {i === values.length - 1 && <span className="linked-list-tag">tail</span>}
                </div>
                <div className="linked-list-node">
                  <span className="linked-list-val">{v}</span>
                  <span className="linked-list-ptr" aria-hidden="true">&bull;</span>
                </div>
                <span className="linked-list-index">{i}</span>
                {i < values.length - 1 && (
                  <span className="linked-list-arrow" aria-hidden="true">&rarr;</span>
                )}
                {i === values.length - 1 && (
                  <span className="linked-list-end" data-testid="list-end">
                    {cycleTo === null ? 'null' : `↺ node ${cycleTo}`}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {loaded && (
        <div className="linked-list-stats">
          <span>Length: <strong>{state.length}</strong></span>
          {cycleTo !== null && (
            <span className="linked-list-cycle-note">
              Cycle: tail points back to index {cycleTo}
            </span>
          )}
          {mid >= 0 && cycleTo === null && <span>Middle (fast/slow): index {mid}</span>}
        </div>
      )}

      {message && <div className="linked-list-result" role="status">{message}</div>}

      <div className="ds-controls">
        <input
          type="text"
          aria-label="Value"
          placeholder="Value"
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          disabled={loading}
        />
        <input
          type="text"
          aria-label="Index"
          placeholder="Index"
          value={indexText}
          onChange={(e) => setIndexText(e.target.value)}
          disabled={loading}
        />
        <button className="control-btn" onClick={withValue('push-front')} disabled={loading}>Push front</button>
        <button className="control-btn" onClick={withValue('push-back')} disabled={loading}>Push back</button>
        <button className="control-btn" onClick={onInsert} disabled={loading}>Insert at index</button>
        <button className="control-btn" onClick={withIndex('delete')} disabled={loading}>Delete at index</button>
        <button className="control-btn" onClick={withValue('find')} disabled={loading}>Find value</button>
        <button className="control-btn" onClick={plain('reset', 'List reset.')} disabled={loading}>Reset</button>
      </div>

      <h3>Linked list techniques</h3>
      <div className="ds-controls">
        <button className="control-btn" onClick={plain('reverse', 'List reversed in place.')} disabled={loading}>Reverse</button>
        <button className="control-btn" onClick={plain('middle')} disabled={loading}>Find middle</button>
        <button className="control-btn" onClick={plain('has-cycle')} disabled={loading}>Detect cycle</button>
        <button className="control-btn" onClick={withIndex('make-cycle')} disabled={loading}>
          Make cycle to index
        </button>
        <button className="control-btn" onClick={plain('break-cycle', 'Cycle broken.')} disabled={loading}>Break cycle</button>
      </div>
      <div className="ds-controls">
        <input
          type="text"
          aria-label="N from end"
          value={nText}
          onChange={(e) => setNText(e.target.value)}
          disabled={loading}
        />
        <button className="control-btn" onClick={onRemoveNth} disabled={loading}>Remove nth from end</button>
        <input
          type="text"
          aria-label="Sorted values to merge"
          value={mergeText}
          onChange={(e) => setMergeText(e.target.value)}
          disabled={loading}
        />
        <button className="control-btn" onClick={onMerge} disabled={loading}>Merge sorted</button>
      </div>
    </div>
  );
}
