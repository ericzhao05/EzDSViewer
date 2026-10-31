import React, { useState } from 'react';
import { buildCall } from '../commandLang';

const WHOLE = /^-?\d+$/;

// A whole number becomes an integer, anything else stays a string.
function parseValue(text) {
  const t = text.trim();
  return WHOLE.test(t) && Number.isSafeInteger(Number(t)) ? Number(t) : t;
}

function parseWhole(text) {
  const t = text.trim();
  return WHOLE.test(t) && Number.isSafeInteger(Number(t)) ? Number(t) : null;
}

// Builds one call string per button and hands it to onCall.
export default function ArrayControls({ onCall, onUndo, canUndo, disabled }) {
  const [value, setValue] = useState('');
  const [index, setIndex] = useState('');
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');

  const send = (method, args) => {
    setMessage('');
    onCall(buildCall(method, args));
  };

  const withValue = (fn) => () => {
    if (value.trim() === '') return setMessage('Enter a value first.');
    return fn(parseValue(value));
  };
  const withIndex = (fn) => () => {
    const i = parseWhole(index);
    if (i === null) return setMessage('Enter a whole-number index first.');
    return fn(i);
  };
  const withTarget = (method) => () => {
    const t = parseWhole(target);
    if (t === null) return setMessage('Enter a whole-number target first.');
    return send(method, [t]);
  };
  const insert = () => {
    const i = parseWhole(index);
    if (value.trim() === '') return setMessage('Enter a value first.');
    if (i === null) return setMessage('Enter a whole-number index first.');
    return send('insert', [i, parseValue(value)]);
  };
  const pop = () => (index.trim() === '' ? send('pop', []) : withIndex((i) => send('pop', [i]))());

  const btn = (label, onClick, extra = false) => (
    <button className="control-btn" onClick={onClick} disabled={disabled || extra}>
      {label}
    </button>
  );

  return (
    <div className="array-controls-panel">
      <div className="ds-controls array-controls">
        <label>
          Value
          <input value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled} />
        </label>
        <label>
          Index
          <input value={index} onChange={(e) => setIndex(e.target.value)} disabled={disabled} />
        </label>
        <label>
          Target
          <input value={target} onChange={(e) => setTarget(e.target.value)} disabled={disabled} />
        </label>
      </div>
      <div className="ds-controls array-buttons">
        {btn('Append', withValue((v) => send('append', [v])))}
        {btn('Insert', insert)}
        {btn('Pop', pop)}
        {btn('Get', withIndex((i) => send('get', [i])))}
        {btn('Reset', () => send('reset', []))}
        {btn('Undo', onUndo, !canUndo)}
      </div>
      <div className="ds-controls array-buttons">
        {btn('Two sum', withTarget('two_sum_sorted'))}
        {btn('Binary search', withTarget('binary_search'))}
        {btn('Max subarray', () => send('max_subarray', []))}
        {btn('Prefix sums', () => send('prefix_sums', []))}
      </div>
      <p className="array-legend">Two sum and binary search need a sorted array of numbers.</p>
      {message && (
        <p className="explorer-inline-error" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
