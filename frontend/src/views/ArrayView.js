import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import ArrayCells from './ArrayCells';
import './ArrayView.css';

// Numeric-looking input becomes a number, anything else stays a string.
function parseValue(text) {
  const t = text.trim();
  if (t !== '' && !Number.isNaN(Number(t))) return Number(t);
  return t;
}

function parseIndex(text) {
  const t = text.trim();
  if (t === '' || Number.isNaN(Number(t))) return null;
  return Number(t);
}

export default function ArrayView() {
  const { state, result, error, loading, run } = useDsState('array');
  const [value, setValue] = useState('');
  const [index, setIndex] = useState('');
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState('');

  const act = async (op, payload, text) => {
    setLocalError('');
    const before = state ? state.capacity : null;
    const data = await run(op, payload);
    if (!data) return;
    setLabel(text);
    if (before !== null && data.state.capacity !== before && op !== 'reset') {
      setNote(`Array was full: allocated capacity ${data.state.capacity} and copied ${data.state.size - 1} elements (was ${before}).`);
    } else {
      setNote('');
    }
  };

  const needValue = () => {
    if (value.trim() === '') {
      setLocalError('Enter a value first.');
      return false;
    }
    return true;
  };
  const needIndex = () => {
    if (parseIndex(index) === null) {
      setLocalError('Enter an integer index first.');
      return false;
    }
    return true;
  };
  const needTarget = () => {
    if (parseIndex(target) === null) {
      setLocalError('Enter a numeric target first.');
      return false;
    }
    return true;
  };

  const append = () => needValue() && act('append', { value: parseValue(value) }, `append(${value.trim()})`);
  const insert = () =>
    needValue() && needIndex() && act('insert', { index: parseIndex(index), value: parseValue(value) }, `insert(${index}, ${value.trim()})`);
  const pop = () => {
    if (index.trim() === '') return act('pop', {}, 'pop()');
    return needIndex() && act('pop', { index: parseIndex(index) }, `pop(${index})`);
  };
  const getAt = () => needIndex() && act('get', { index: parseIndex(index) }, `array[${index}]`);
  const withTarget = (op) => needTarget() && act(op, { target: Number(target) }, `${op}(${target})`);

  const shownError = localError || error;
  const empty = state && state.size === 0;

  return (
    <div className="ds-container array-view">
      <h2>Array / Dynamic Array</h2>
      <p>
        Elements sit in contiguous memory, so index i lives at base + i * element_size and access is O(1). A dynamic
        array doubles its capacity when full and copies everything over, which makes append amortized O(1).
      </p>
      <p className="array-complexity">
        Access O(1) &middot; append amortized O(1) (a single resize copy is O(n)) &middot; insert / pop at index O(n)
        &middot; growing by a constant instead of doubling would cost O(n&sup2;) for n appends.
      </p>

      {shownError && (
        <div className="error-message" role="alert">
          {shownError}
        </div>
      )}

      {!state && !error && <p className="empty-message">Loading...</p>}

      {state && (
        <>
          <div className="array-stats" aria-label="Array statistics">
            <span>
              Size: <strong data-testid="array-size">{state.size}</strong>
            </span>
            <span>
              Capacity: <strong data-testid="array-capacity">{state.capacity}</strong>
            </span>
            <span>
              Resizes: <strong data-testid="array-resizes">{state.resizes}</strong>
            </span>
          </div>

          <ArrayCells state={state} />
          <p className="array-legend">Filled cells are in use (size); dashed cells are spare capacity.</p>
          {empty && <p className="empty-message">The array is empty. Append a value to begin.</p>}
          {note && <p className="array-note">{note}</p>}
        </>
      )}

      {label && result !== null && result !== undefined && (
        <p className="array-result" data-testid="array-result">
          {label} returned <code>{JSON.stringify(result)}</code>
        </p>
      )}

      <div className="ds-controls array-controls">
        <label>
          Value
          <input value={value} onChange={(e) => setValue(e.target.value)} disabled={loading} />
        </label>
        <label>
          Index
          <input value={index} onChange={(e) => setIndex(e.target.value)} disabled={loading} />
        </label>
        <label>
          Target
          <input value={target} onChange={(e) => setTarget(e.target.value)} disabled={loading} />
        </label>
      </div>
      <div className="ds-controls array-buttons">
        <button className="control-btn" onClick={append} disabled={loading}>Append</button>
        <button className="control-btn" onClick={insert} disabled={loading}>Insert at index</button>
        <button className="control-btn" onClick={pop} disabled={loading}>Pop</button>
        <button className="control-btn" onClick={getAt} disabled={loading}>Get</button>
        <button className="control-btn" onClick={() => act('reset', {}, 'reset')} disabled={loading}>Reset</button>
      </div>
      <div className="ds-controls array-buttons">
        <button className="control-btn" onClick={() => withTarget('two_sum_sorted')} disabled={loading}>Two sum (sorted)</button>
        <button className="control-btn" onClick={() => withTarget('binary_search')} disabled={loading}>Binary search</button>
        <button className="control-btn" onClick={() => act('max_subarray', {}, 'max_subarray()')} disabled={loading}>Max subarray</button>
        <button className="control-btn" onClick={() => act('prefix_sums', {}, 'prefix_sums()')} disabled={loading}>Prefix sums</button>
      </div>
      <p className="array-legend">Two sum and binary search need a sorted array of numbers.</p>
    </div>
  );
}
