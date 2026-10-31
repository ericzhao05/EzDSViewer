import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './SuffixArrayView.css';

function describe(op, result) {
  if (op === 'search' || op === 'count') {
    if (result.count === 0) return `"${result.pattern}" does not occur in the text`;
    const where = op === 'search' ? ` at positions ${result.positions.join(', ')}` : '';
    return `"${result.pattern}" occurs ${result.count} time${result.count === 1 ? '' : 's'}${where} (rows ${result.range[0]} to ${result.range[1] - 1})`;
  }
  if (op === 'longest-repeated') {
    return result.length === 0
      ? 'No substring repeats'
      : `Longest repeated substring: "${result.substring}" (length ${result.length})`;
  }
  if (op === 'build') return `Built the suffix array for ${result.length} characters`;
  return '';
}

export default function SuffixArrayView() {
  const { state, error, loading, run } = useDsState('suffix-array');
  const [textInput, setTextInput] = useState('');
  const [patternInput, setPatternInput] = useState('');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [range, setRange] = useState(null);

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result) : '');
    setRange(data && data.result && data.result.range ? data.result.range : null);
    return data;
  };

  const withPattern = (op) => {
    if (patternInput === '') {
      setLocalError('Please enter a pattern');
      return;
    }
    exec(op, { pattern: patternInput });
  };

  const onBuild = () => {
    if (textInput === '') {
      setLocalError('Please enter some text');
      return;
    }
    exec('build', { text: textInput });
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );
  const show = (c) => (c === ' ' ? '␣' : c);

  return (
    <div className="ds-container">
      <h2>Suffix Array Visualization</h2>
      <p className="suffix-array-intro">
        A suffix array indexes every suffix of a string: it lists the start positions of all
        suffixes in sorted order, so any substring is a prefix of a contiguous block of rows
        and can be found by binary search. A suffix tree is the related structure; here the
        LCP array (longest common prefix of neighbouring suffixes) stands in for it.
      </p>
      <p className="suffix-array-complexity">
        Pattern search by binary search costs O(m log n) for a pattern of length m in a text of
        length n. The LCP array is built in O(n) after the suffix array.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls">
        <input
          type="text"
          aria-label="Text"
          placeholder="Text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={loading}
        />
        {btn('Build', onBuild)}
        <input
          type="text"
          aria-label="Pattern"
          placeholder="Pattern"
          value={patternInput}
          onChange={(e) => setPatternInput(e.target.value)}
          disabled={loading}
        />
        {btn('Search', () => withPattern('search'))}
        {btn('Count', () => withPattern('count'))}
        {btn('Longest repeated', () => exec('longest-repeated'))}
        {btn('Reset', async () => {
          setLocalError('');
          setRange(null);
          const d = await run('reset');
          setMessage(d ? 'Reset.' : '');
        })}
      </div>

      {message && <div className="suffix-array-result" role="status">{message}</div>}

      {loaded && (
        <>
          <section className="suffix-array-section" aria-label="Text">
            <h3>Text</h3>
            {state.text.length === 0 ? (
              <p className="empty-message">The text is empty.</p>
            ) : (
              <div className="suffix-array-scroll">
                <div className="suffix-array-chars" data-testid="sa-chars">
                  {Array.from(state.text).map((c, i) => (
                    <span key={i} className="suffix-array-slot">
                      <span className="suffix-array-char">{show(c)}</span>
                      <span className="suffix-array-index">{i}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="suffix-array-section" aria-label="Sorted suffixes">
            <h3>Sorted suffixes</h3>
            <div className="suffix-array-scroll">
              <table className="suffix-array-table">
                <thead>
                  <tr><th>Row</th><th>SA</th><th>LCP</th><th>Suffix</th></tr>
                </thead>
                <tbody>
                  {state.sa.map((start, row) => (
                    <tr
                      key={row}
                      data-testid="sa-row"
                      className={range && row >= range[0] && row < range[1] ? 'suffix-array-match' : ''}
                    >
                      <td>{row}</td>
                      <td>{start}</td>
                      <td>{state.lcp[row]}</td>
                      <td className="suffix-array-suffix">{state.suffixes[row]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
