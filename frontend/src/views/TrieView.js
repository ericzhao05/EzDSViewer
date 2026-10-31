import React, { useMemo, useState } from 'react';
import useDsState from '../hooks/useDsState';
import './TrieView.css';

const GAP_X = 40;
const GAP_Y = 56;
const R = 14;
const PAD = 24;

// Lay out the tree: leaves get consecutive columns, parents centre over their children.
function layout(tree) {
  const nodes = [];
  const edges = [];
  let col = 0;
  const walk = (node, depth, path, parentIdx) => {
    const idx = nodes.length;
    const entry = { ...node, depth, path, x: 0, y: depth * GAP_Y + PAD };
    nodes.push(entry);
    if (parentIdx !== null) edges.push([parentIdx, idx]);
    if (node.children.length === 0) {
      entry.x = col * GAP_X + PAD;
      col += 1;
    } else {
      const kids = node.children.map((c) => walk(c, depth + 1, path + c.char, idx));
      entry.x = (nodes[kids[0]].x + nodes[kids[kids.length - 1]].x) / 2;
    }
    return idx;
  };
  walk(tree, 0, '', null);
  const width = Math.max(1, col) * GAP_X + PAD;
  const height = Math.max(...nodes.map((n) => n.depth)) * GAP_Y + PAD * 2;
  return { nodes, edges, width, height };
}

function describe(op, r) {
  switch (op) {
    case 'insert':
      return r.added
        ? `Inserted "${r.word}": ${r.matched} of ${r.word.length} letters already existed.`
        : `"${r.word}" is already stored.`;
    case 'delete':
      if (!r.deleted) {
        return r.matched === r.word.length
          ? `"${r.word}" is only a prefix, so nothing was deleted.`
          : `"${r.word}" is not stored, so nothing was deleted.`;
      }
      return r.pruned > 0
        ? `Deleted "${r.word}": pruned ${r.pruned} ${r.pruned === 1 ? 'node' : 'nodes'} that no longer served any word.`
        : `Deleted "${r.word}": cleared is_word, and no nodes pruned because longer words still use them.`;
    case 'search':
      return r.found
        ? `"${r.word}" is a stored word.`
        : r.matched === r.word.length
        ? `"${r.word}" is only a prefix: the path exists but is_word is false.`
        : `"${r.word}" not found: the path stops after ${r.matched} letters.`;
    case 'starts-with':
      return r.found
        ? `Some stored word starts with "${r.prefix}".`
        : `No stored word starts with "${r.prefix}".`;
    case 'autocomplete':
      return `${r.count} word(s) start with "${r.prefix}": ${r.words.join(', ') || 'none'}`;
    default:
      return '';
  }
}

export default function TrieView() {
  const { state, error, loading, run } = useDsState('trie');
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [highlight, setHighlight] = useState('');

  const lay = useMemo(() => (state ? layout(state.tree) : null), [state]);

  const exec = async (op, key) => {
    const value = text.trim();
    if (key !== 'prefix-optional' && value === '') {
      setLocalError('Please enter a word');
      return;
    }
    setLocalError('');
    // A delete can remove the highlighted nodes, so drop the highlight whatever happens.
    if (op === 'delete') setHighlight('');
    const payload = key === 'prefix-optional' ? { prefix: value } : { [key]: value };
    const data = await run(op, payload);
    if (data) {
      setMessage(describe(op, data.result));
      const r = data.result;
      if (!r.deleted) setHighlight((r.word || r.prefix || '').slice(0, r.matched));
    } else {
      setMessage('');
    }
  };

  const shownError = localError || error;
  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );
  const onPath = (n) => n.path.length > 0 ? highlight.startsWith(n.path) : highlight.length > 0;

  return (
    <div className="ds-container">
      <h2>Trie Visualization</h2>
      <p className="trie-intro">
        A prefix tree: each edge is a character and each path from the root spells a prefix.
        Lookup cost depends on the word's length and not on how many words are stored.
        Use it for autocomplete, prefix counts, and searching many words at once.
      </p>
      <p className="trie-complexity">
        Search, insert, delete and prefix lookup are O(L), where L is the word's length. Space is O(total
        characters). Filled nodes mark the end of a stored word (is_word).
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!state && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls trie-controls">
        <input
          type="text"
          aria-label="Word or prefix"
          placeholder="Word or prefix"
          value={text}
          maxLength={32}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        {btn('Insert', () => exec('insert', 'word'))}
        {btn('Delete', () => exec('delete', 'word'))}
        {btn('Search', () => exec('search', 'word'))}
        {btn('Starts with', () => exec('starts-with', 'prefix'))}
        {btn('Autocomplete', () => exec('autocomplete', 'prefix-optional'))}
        {btn('Reset', async () => {
          setLocalError('');
          setHighlight('');
          const d = await run('reset');
          setMessage(d ? 'Reset.' : '');
        })}
      </div>

      {message && <div className="trie-result" role="status">{message}</div>}

      {state && lay && (
        <>
          <div className="trie-scroll">
            <svg
              className="trie-svg"
              role="img"
              aria-label="Trie diagram"
              width={lay.width}
              height={lay.height}
              viewBox={`0 0 ${lay.width} ${lay.height}`}
            >
              {lay.edges.map(([a, b]) => (
                <line
                  key={`${a}-${b}`}
                  className={onPath(lay.nodes[b]) ? 'trie-edge trie-hot' : 'trie-edge'}
                  x1={lay.nodes[a].x}
                  y1={lay.nodes[a].y}
                  x2={lay.nodes[b].x}
                  y2={lay.nodes[b].y}
                />
              ))}
              {lay.nodes.map((n) => (
                <g
                  key={n.path || 'root'}
                  data-testid={`trie-node-${n.path || 'root'}`}
                  className={[
                    'trie-node',
                    n.is_word ? 'trie-word' : '',
                    onPath(n) ? 'trie-hot' : '',
                  ].join(' ')}
                >
                  <circle cx={n.x} cy={n.y} r={R} />
                  <text x={n.x} y={n.y + 4} textAnchor="middle">{n.depth === 0 ? '*' : n.char}</text>
                </g>
              ))}
            </svg>
          </div>
          {state.words.length === 0 ? (
            <p className="empty-message">The trie is empty. Insert a word.</p>
          ) : (
            <p className="trie-words" aria-label="Stored words">
              Stored words ({state.words.length}): {state.words.join(', ')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
