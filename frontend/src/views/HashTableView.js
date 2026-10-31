import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './HashTableView.css';

const parseInts = (text) =>
  text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .map((t) => (/^-?\d+$/.test(t) ? Number(t) : NaN));

function describe(op, result) {
  if (result === null || result === undefined) return '';
  switch (op) {
    case 'put':
      return (result.updated ? 'Updated existing key.' : 'Inserted new key.') +
        (result.resized ? ' Load factor passed 0.75: table doubled and rehashed.' : '');
    case 'get':
      return result.found ? `Found value: ${JSON.stringify(result.value)}` : 'Key not found.';
    case 'remove':
      return result.removed ? 'Key removed.' : 'Key not found, nothing removed.';
    case 'two-sum':
      return result.length ? `Two Sum indices: [${result.join(', ')}]` : 'Two Sum: no pair found.';
    case 'group-anagrams':
      return `Anagram groups: ${JSON.stringify(result)}`;
    case 'longest-consecutive':
      return `Longest consecutive run: ${result}`;
    default:
      return '';
  }
}

export default function HashTableView() {
  const { state, error, loading, run } = useDsState('hash-table');
  const [keyType, setKeyType] = useState('text');
  const [keyText, setKeyText] = useState('');
  const [valueText, setValueText] = useState('');
  const [numsText, setNumsText] = useState('2, 7, 11, 15');
  const [targetText, setTargetText] = useState('9');
  const [wordsText, setWordsText] = useState('eat, tea, tan, ate, nat, bat');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const buildKey = () => {
    if (keyText === '') {
      setLocalError('Please enter a key');
      return undefined;
    }
    if (keyType === 'number') {
      if (!/^-?\d+$/.test(keyText.trim())) {
        setLocalError('Number keys must be whole numbers');
        return undefined;
      }
      return Number(keyText.trim());
    }
    return keyText;
  };

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result) : '');
    return data;
  };

  const onPut = async () => {
    const key = buildKey();
    if (key === undefined) return;
    if (valueText === '') {
      setLocalError('Please enter a value');
      return;
    }
    const value = /^-?\d+(\.\d+)?$/.test(valueText.trim()) ? Number(valueText) : valueText;
    await exec('put', { key, value });
  };
  const onKeyOp = async (op) => {
    const key = buildKey();
    if (key === undefined) return;
    await exec(op, { key });
  };
  const onTwoSum = () => {
    const nums = parseInts(numsText);
    const target = Number(targetText);
    if (nums.some(Number.isNaN) || !/^-?\d+$/.test(targetText.trim())) {
      setLocalError('Numbers must be whole numbers separated by commas');
      return;
    }
    exec('two-sum', { nums, target });
  };
  const onConsecutive = () => {
    const nums = parseInts(numsText);
    if (nums.some(Number.isNaN)) {
      setLocalError('Numbers must be whole numbers separated by commas');
      return;
    }
    exec('longest-consecutive', { nums });
  };
  const onAnagrams = () => {
    const words = wordsText.split(',').map((w) => w.trim()).filter((w) => w !== '');
    exec('group-anagrams', { words });
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const buckets = loaded ? state.buckets : [];

  return (
    <div className="ds-container">
      <h2>Hash Table Visualization</h2>
      <p className="hash-table-intro">
        Key-value storage that runs each key through a hash function to choose a bucket. This trades
        extra memory for O(1) average lookups. This table uses separate chaining: each bucket holds a
        list of entries.
      </p>
      <p className="hash-table-complexity">
        put, get, remove: O(1) on average, O(n) worst case. Load factor = size / buckets; past 0.75
        the table doubles and rehashes every entry.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}

      {loaded && (
        <div className="hash-table-stats">
          <span>Size: <strong>{state.size}</strong></span>
          <span>Buckets: <strong>{state.capacity}</strong></span>
          <span>Load factor: <strong>{state.load_factor.toFixed(2)}</strong> / {state.threshold}</span>
        </div>
      )}

      <div className="hash-table-scroll">
        {!loaded && !shownError && <p className="empty-message">Loading...</p>}
        {loaded && state.size === 0 && (
          <p className="empty-message">Hash table is empty. Put some entries!</p>
        )}
        {loaded && (
          <ul className="hash-table-buckets" aria-label="Buckets">
            {buckets.map((chain, i) => (
              <li key={i} className="hash-table-row" data-testid={`bucket-${i}`}>
                <span className="hash-table-index">{i}</span>
                {chain.length === 0 ? (
                  <span className="hash-table-null">null</span>
                ) : (
                  chain.map(([k, v], j) => (
                    <React.Fragment key={`${j}-${String(k)}`}>
                      <span className="hash-table-arrow" aria-hidden="true">&rarr;</span>
                      <span className="hash-table-entry">
                        <span className="hash-table-entry-key">{String(k)}</span>
                        <span className="hash-table-entry-value">{String(v)}</span>
                      </span>
                    </React.Fragment>
                  ))
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {message && <div className="hash-table-result" role="status">{message}</div>}

      <div className="ds-controls">
        <label>
          Key type
          <select value={keyType} onChange={(e) => setKeyType(e.target.value)} disabled={loading}>
            <option value="text">Text</option>
            <option value="number">Number</option>
          </select>
        </label>
        <input
          type="text"
          aria-label="Key"
          placeholder="Key"
          value={keyText}
          onChange={(e) => setKeyText(e.target.value)}
          disabled={loading}
        />
        <input
          type="text"
          aria-label="Value"
          placeholder="Value (for put)"
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          disabled={loading}
        />
        <button className="control-btn" onClick={onPut} disabled={loading}>Put</button>
        <button className="control-btn" onClick={() => onKeyOp('get')} disabled={loading}>Get</button>
        <button className="control-btn" onClick={() => onKeyOp('remove')} disabled={loading}>Remove</button>
        <button
          className="control-btn"
          onClick={async () => {
            setLocalError('');
            const d = await run('reset');
            setMessage(d ? 'Table reset.' : '');
          }}
          disabled={loading}
        >
          Reset
        </button>
      </div>

      <h3>Hash table techniques</h3>
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
          aria-label="Target"
          value={targetText}
          onChange={(e) => setTargetText(e.target.value)}
          disabled={loading}
        />
        <button className="control-btn" onClick={onTwoSum} disabled={loading}>Two Sum</button>
        <button className="control-btn" onClick={onConsecutive} disabled={loading}>
          Longest Consecutive
        </button>
      </div>
      <div className="ds-controls">
        <input
          type="text"
          aria-label="Words"
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          disabled={loading}
        />
        <button className="control-btn" onClick={onAnagrams} disabled={loading}>Group Anagrams</button>
      </div>
    </div>
  );
}
