import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './BloomFilterView.css';

function describe(op, result) {
  if (op === 'add') {
    return `Added "${result.item}": set bits ${result.positions.join(', ')}`;
  }
  if (op === 'check') {
    const at = result.positions.join(', ');
    if (!result.possibly_present) {
      return `"${result.item}" is definitely not present (checked bits ${at}; at least one is 0)`;
    }
    return result.false_positive
      ? `"${result.item}": possibly present, but it was never added. A false positive (bits ${at} were all 1)`
      : `"${result.item}": possibly present (bits ${at} are all 1)`;
  }
  return '';
}

export default function BloomFilterView() {
  const { state, error, loading, run } = useDsState('bloom-filter');
  const [itemText, setItemText] = useState('');
  const [sizeText, setSizeText] = useState('');
  const [hashText, setHashText] = useState('');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [highlight, setHighlight] = useState([]);

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result) : '');
    setHighlight(data && data.result && data.result.positions ? data.result.positions : []);
    return data;
  };

  const withItem = (op) => {
    if (itemText.trim() === '') {
      setLocalError('Please enter an item');
      return;
    }
    exec(op, { item: itemText });
  };

  const onConfigure = () => {
    const size = sizeText === '' ? state.size : Number(sizeText);
    const hashes = hashText === '' ? state.num_hashes : Number(hashText);
    if (!Number.isInteger(size) || !Number.isInteger(hashes)) {
      setLocalError('Bit count and hash count must be whole numbers');
      return;
    }
    exec('configure', { size, num_hashes: hashes });
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );

  return (
    <div className="ds-container">
      <h2>Bloom Filter Visualization</h2>
      <p className="bloom-filter-intro">
        A Bloom filter is a compact set test that can give false positives but never false
        negatives. "Not present" is always correct; "possibly present" may be wrong.
      </p>
      <p className="bloom-filter-complexity">
        Add and lookup cost O(k) for k hash functions, independent of how many items are stored.
        Space is m bits. Items cannot be removed.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls">
        <input
          type="text"
          aria-label="Item"
          placeholder="Item"
          value={itemText}
          onChange={(e) => setItemText(e.target.value)}
          disabled={loading}
        />
        {btn('Add', () => withItem('add'))}
        {btn('Check', () => withItem('check'))}
        {btn('Reset', async () => {
          setLocalError('');
          setHighlight([]);
          const d = await run('reset');
          setMessage(d ? 'Reset.' : '');
        })}
      </div>

      {message && <div className="bloom-filter-result" role="status">{message}</div>}

      {loaded && (
        <>
          <section className="bloom-filter-section" aria-label="Bit array">
            <h3>Bit array</h3>
            <p>
              {state.size} bits, {state.num_hashes} hash functions, {state.count} adds,{' '}
              {state.bits_set} bits set. Estimated false positive rate:{' '}
              {(state.false_positive_rate * 100).toFixed(1)}%.
            </p>
            <div className="bloom-filter-scroll">
              <div className="bloom-filter-row" data-testid="bloom-bits">
                {state.bits.map((b, i) => (
                  <span key={i} className="bloom-filter-slot">
                    <span
                      className={
                        'bloom-filter-bit' +
                        (b ? ' bloom-filter-on' : '') +
                        (highlight.includes(i) ? ' bloom-filter-hit' : '')
                      }
                      data-testid="bloom-bit"
                    >
                      {b}
                    </span>
                    <span className="bloom-filter-index">{i}</span>
                  </span>
                ))}
              </div>
            </div>
            {state.count === 0 && <p className="empty-message">Filter is empty: all bits are 0.</p>}
          </section>

          <section className="bloom-filter-section" aria-label="Added items">
            <h3>Items added</h3>
            {state.added.length === 0 ? (
              <p className="empty-message">Nothing added yet.</p>
            ) : (
              <ul className="bloom-filter-items" aria-label="Added items list">
                {state.added.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
          </section>

          <section className="bloom-filter-section" aria-label="Configure">
            <h3>Configure (clears the filter)</h3>
            <div className="ds-controls">
              <input
                type="text"
                aria-label="Number of bits"
                placeholder={`Bits (${state.size})`}
                value={sizeText}
                onChange={(e) => setSizeText(e.target.value)}
                disabled={loading}
              />
              <input
                type="text"
                aria-label="Number of hash functions"
                placeholder={`Hashes (${state.num_hashes})`}
                value={hashText}
                onChange={(e) => setHashText(e.target.value)}
                disabled={loading}
              />
              {btn('Apply', onConfigure)}
            </div>
            <p>Try few bits and many adds to watch false positives appear.</p>
          </section>
        </>
      )}
    </div>
  );
}
