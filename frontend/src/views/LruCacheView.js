import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './LruCacheView.css';

function describe(op, result, payload) {
  if (result === null || result === undefined) return '';
  switch (op) {
    case 'put': {
      let msg = result.updated
        ? 'Updated existing key and moved it to the front.'
        : 'Inserted new key at the front.';
      if (result.evicted) {
        msg += ` Cache was full: evicted least recently used key ${String(result.evicted.key)}.`;
      }
      return msg;
    }
    case 'get':
      return result.found
        ? `Hit: value ${String(result.value)}. Key moved to the front.`
        : `Miss: key ${String(payload.key)} is not cached, get returns -1.`;
    default:
      return '';
  }
}

export default function LruCacheView() {
  const { state, error, loading, run } = useDsState('lru-cache');
  const [keyType, setKeyType] = useState('text');
  const [keyText, setKeyText] = useState('');
  const [valueText, setValueText] = useState('');
  const [capText, setCapText] = useState('3');
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
    setMessage(data ? describe(op, data.result, payload) : '');
    return data;
  };

  const onPut = async () => {
    const key = buildKey();
    if (key === undefined) return;
    if (valueText === '') {
      setLocalError('Please enter a value');
      return;
    }
    const value = /^-?\d+$/.test(valueText.trim()) ? Number(valueText) : valueText;
    await exec('put', { key, value });
  };
  const onGet = async () => {
    const key = buildKey();
    if (key === undefined) return;
    await exec('get', { key });
  };
  const onCapacity = async () => {
    if (!/^\d+$/.test(capText.trim())) {
      setLocalError('Capacity must be a whole number');
      return;
    }
    const d = await exec('capacity', { capacity: Number(capText) });
    if (d) setMessage('New empty cache created.');
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const order = loaded ? state.order : [];

  return (
    <div className="ds-container">
      <h2>LRU Cache Visualization</h2>
      <p className="lru-cache-intro">
        A hash map gives O(1) lookup and a doubly linked list keeps usage order with O(1) moves and
        removals. The most recently used entry sits at the front; when the cache is full, the entry at
        the back is evicted.
      </p>
      <p className="lru-cache-complexity">get and put: O(1). Space: O(capacity).</p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}

      {loaded && (
        <div className="lru-cache-stats">
          <span>Capacity: <strong>{state.capacity}</strong></span>
          <span>Size: <strong>{state.size}</strong></span>
        </div>
      )}

      {!loaded && !shownError && <p className="empty-message">Loading...</p>}
      {loaded && state.size === 0 && (
        <p className="empty-message">Cache is empty. Put some entries!</p>
      )}
      {loaded && (
        <>
          <h3 className="lru-cache-heading">Recency list</h3>
          <div className="lru-cache-scroll">
            <ul className="lru-cache-list" aria-label="Recency list">
              <li className="lru-cache-sentinel" data-testid="lru-head">HEAD</li>
              {order.map((e, i) => (
                <li key={`${typeof e.key}-${String(e.key)}`} className="lru-cache-item" data-testid={`node-${i}`}>
                  <span className="lru-cache-arrow" aria-hidden="true">&harr;</span>
                  <span className="lru-cache-node">
                    <span className="lru-cache-tag">
                      {i === 0 ? 'MRU' : i === order.length - 1 ? 'LRU' : ' '}
                    </span>
                    <span className="lru-cache-node-key">{String(e.key)}</span>
                    <span className="lru-cache-node-value">{String(e.value)}</span>
                  </span>
                </li>
              ))}
              <li className="lru-cache-item">
                <span className="lru-cache-arrow" aria-hidden="true">&harr;</span>
                <span className="lru-cache-sentinel" data-testid="lru-tail">TAIL</span>
              </li>
            </ul>
          </div>

          <h3 className="lru-cache-heading">Hash map</h3>
          <div className="lru-cache-scroll">
            {order.length === 0 ? (
              <p className="empty-message">No keys in the map.</p>
            ) : (
              <ul className="lru-cache-map" aria-label="Hash map">
                {order.map((e, i) => (
                  <li key={`${typeof e.key}-${String(e.key)}`} className="lru-cache-map-row" data-testid={`map-${i}`}>
                    <span className="lru-cache-node-key">{String(e.key)}</span>
                    <span className="lru-cache-arrow" aria-hidden="true">&rarr;</span>
                    <span className="lru-cache-pointer">node #{i + 1} in list</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {message && <div className="lru-cache-result" role="status">{message}</div>}

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
        <button className="control-btn" onClick={onGet} disabled={loading}>Get</button>
        <button
          className="control-btn"
          onClick={async () => {
            setLocalError('');
            const d = await run('reset');
            setMessage(d ? 'Cache reset.' : '');
          }}
          disabled={loading}
        >
          Reset
        </button>
      </div>
      <div className="ds-controls">
        <input
          type="text"
          aria-label="Capacity"
          value={capText}
          onChange={(e) => setCapText(e.target.value)}
          disabled={loading}
        />
        <button className="control-btn" onClick={onCapacity} disabled={loading}>
          Set capacity (clears cache)
        </button>
      </div>
    </div>
  );
}
