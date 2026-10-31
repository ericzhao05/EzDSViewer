import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './StringView.css';

function describe(op, result) {
  if (!op) return '';
  if (op === 'is_anagram') return result ? 'Yes, they are anagrams.' : 'No, not anagrams.';
  if (op === 'is_palindrome') return result ? 'Yes, it is a palindrome.' : 'No, not a palindrome.';
  if (op === 'longest_unique_substring') {
    return `Longest substring without repeats has length ${result.length}` +
      (result.length ? ` ("${result.substring}", starting at index ${result.start}).` : '.');
  }
  return '';
}

export default function StringView() {
  const { state, result, error, loading, run } = useDsState('string');
  const [text, setText] = useState('');
  const [other, setOther] = useState('');
  const [lastOp, setLastOp] = useState('');
  const [hit, setHit] = useState(null);

  const text0 = state ? state.text : '';
  const chars = Array.from(text0);

  const exec = async (op, payload) => {
    const data = await run(op, payload);
    if (!data) return;
    setLastOp(op);
    setHit(
      op === 'longest_unique_substring' && data.result.length
        ? { start: data.result.start, end: data.result.start + data.result.length }
        : null
    );
  };

  const onSet = async (e) => {
    e.preventDefault();
    await exec('set', { text });
  };

  return (
    <div className="ds-container string-view">
      <h2>String Visualization</h2>
      <p className="string-about">
        A sequence of characters, typically stored as an array. Python, Java, and JavaScript strings are
        immutable, so every modification creates a new string.
      </p>
      <table className="string-complexity">
        <caption>Complexity</caption>
        <tbody>
          <tr><td>Access by index</td><td>O(1)</td></tr>
          <tr><td>Compare or copy</td><td>O(n)</td></tr>
          <tr><td>Slice of length k</td><td>O(k)</td></tr>
          <tr><td>Substring search, naive</td><td>O(nm)</td></tr>
          <tr><td>Substring search, KMP or Rabin-Karp (expected)</td><td>O(n + m)</td></tr>
        </tbody>
      </table>

      {error && <div className="error-message" role="alert">{error}</div>}

      {state === null && !error && <p className="empty-message">Loading...</p>}

      {state !== null && (
        <>
          {chars.length === 0 ? (
            <p className="empty-message">The string is empty.</p>
          ) : (
            <div className="string-cells" role="list" aria-label="String characters">
              {chars.map((ch, i) => (
                <div
                  key={i}
                  role="listitem"
                  className={`string-cell${hit && i >= hit.start && i < hit.end ? ' string-cell-hit' : ''}`}
                >
                  <span className="string-char">{ch === ' ' ? '␣' : ch}</span>
                  <span className="string-index">{i}</span>
                </div>
              ))}
            </div>
          )}

          <form className="ds-controls string-controls" onSubmit={onSet}>
            <input
              aria-label="New string"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Set the string"
              disabled={loading}
            />
            <button type="submit" className="control-btn push-btn" disabled={loading}>Set</button>
            <button type="button" className="control-btn pop-btn" disabled={loading} onClick={() => exec('reset')}>
              Reset
            </button>
          </form>

          <div className="ds-controls string-controls">
            <button type="button" className="control-btn push-btn" disabled={loading}
              onClick={() => exec('is_palindrome')}>Is palindrome</button>
            <button type="button" className="control-btn push-btn" disabled={loading}
              onClick={() => exec('longest_unique_substring')}>Longest unique substring</button>
          </div>
          <div className="ds-controls string-controls">
            <input
              aria-label="Other string"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Compare with"
              disabled={loading}
            />
            <button type="button" className="control-btn push-btn" disabled={loading}
              onClick={() => exec('is_anagram', { other })}>Is anagram</button>
          </div>

          {lastOp && lastOp !== 'set' && lastOp !== 'reset' && result !== null && !error && (
            <p className="string-result" role="status">{describe(lastOp, result)}</p>
          )}
        </>
      )}
    </div>
  );
}
