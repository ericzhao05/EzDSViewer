import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './SkipListView.css';

function describe(op, result, payload) {
  if (result === null || result === undefined) return '';
  switch (op) {
    case 'insert':
      return result.inserted
        ? `Inserted ${payload.key} with height ${result.level + 1} (coin flips chose level ${result.level}).`
        : `${payload.key} is already in the list; nothing changed.`;
    case 'search': {
      const hops = result.path.length;
      return result.found
        ? `Found ${payload.key} after visiting ${hops} nodes (highlighted).`
        : `${payload.key} is not in the list (${hops} nodes visited, highlighted).`;
    }
    case 'delete':
      return result.deleted ? `Deleted ${payload.key}.` : `${payload.key} was not in the list.`;
    default:
      return '';
  }
}

const parseInt10 = (text) => (/^-?\d+$/.test(text.trim()) ? Number(text.trim()) : null);

export default function SkipListView() {
  const { state, error, loading, run } = useDsState('skip-list');
  const [keyText, setKeyText] = useState('');
  const [seedText, setSeedText] = useState('7');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [path, setPath] = useState([]);

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result, payload) : '');
    setPath(data && op === 'search' ? data.result.path : []);
    return data;
  };

  const withKey = (op) => async () => {
    const key = parseInt10(keyText);
    if (key === null) {
      setLocalError('Key must be a whole number');
      return;
    }
    await exec(op, { key });
  };

  const onSeed = async () => {
    const seed = parseInt10(seedText);
    if (seed === null) {
      setLocalError('Seed must be a whole number');
      return;
    }
    const d = await exec('seed', { seed });
    if (d) setMessage(`New empty list using seed ${seed}.`);
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const keys = loaded ? state.keys : [];
  const visited = new Set(path.map((s) => `${s.level}:${s.key}`));
  const topLevel = loaded
    ? Math.max(0, ...state.levels.map((row, i) => (row.length ? i : 0)))
    : 0;
  const rows = [];
  for (let i = topLevel; i >= 0; i--) rows.push(i);

  return (
    <div className="ds-container">
      <h2>Skip List Visualization</h2>
      <p className="skip-list-intro">
        Layered linked lists with O(log n) expected search. Level 0 links every key in order; each
        key is promoted to the next level up by a coin flip, so upper levels act as express lanes
        that skip over many keys.
      </p>
      <p className="skip-list-complexity">
        Expected search, insert and delete: O(log n). Worst case: O(n). Space: O(n) expected.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}

      {loaded && (
        <div className="skip-list-stats">
          <span>Size: <strong>{state.size}</strong></span>
          <span>Max levels: <strong>{state.max_level}</strong></span>
          <span>Seed: <strong>{String(state.seed)}</strong></span>
        </div>
      )}

      {!loaded && !shownError && <p className="empty-message">Loading...</p>}
      {loaded && keys.length === 0 && <p className="empty-message">List is empty. Insert some keys!</p>}
      {loaded && keys.length > 0 && (
        <div className="skip-list-scroll">
          <table className="skip-list-grid" aria-label="Skip list levels">
            <tbody>
              {rows.map((lvl) => {
                const present = new Set(state.levels[lvl]);
                return (
                  <tr key={lvl} data-testid={`level-${lvl}`}>
                    <th scope="row" className="skip-list-level-label">L{lvl}</th>
                    <td className="skip-list-cell skip-list-head">HEAD</td>
                    {keys.map((k) => {
                      const has = present.has(k);
                      const hit = visited.has(`${lvl}:${k}`);
                      return (
                        <td
                          key={k}
                          className={`skip-list-cell${has ? ' skip-list-node' : ' skip-list-gap'}${hit ? ' skip-list-visited' : ''}`}
                          data-testid={has ? `node-${lvl}-${k}` : undefined}
                        >
                          {has ? k : ''}
                        </td>
                      );
                    })}
                    <td className="skip-list-cell skip-list-nil">nil</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {message && <div className="skip-list-result" role="status">{message}</div>}

      <div className="ds-controls">
        <input
          type="text"
          aria-label="Key"
          placeholder="Integer key"
          value={keyText}
          onChange={(e) => setKeyText(e.target.value)}
          disabled={loading}
        />
        <button className="control-btn" onClick={withKey('insert')} disabled={loading}>Insert</button>
        <button className="control-btn" onClick={withKey('search')} disabled={loading}>Search</button>
        <button className="control-btn" onClick={withKey('delete')} disabled={loading}>Delete</button>
        <button
          className="control-btn"
          onClick={async () => {
            await exec('reset');
            setMessage('List reset.');
          }}
          disabled={loading}
        >
          Reset
        </button>
      </div>
      <div className="ds-controls">
        <input
          type="text"
          aria-label="Seed"
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          disabled={loading}
        />
        <button className="control-btn" onClick={onSeed} disabled={loading}>
          Set seed (clears list)
        </button>
      </div>
    </div>
  );
}
