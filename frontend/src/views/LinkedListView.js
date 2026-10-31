import React, { useEffect, useState } from 'react';
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

function SinglyPanel({ onBusy }) {
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

  useEffect(() => {
    onBusy(loading);
  }, [loading, onBusy]);

  return (
    <>
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
    </>
  );
}

const pointerText = (id) => (id === null ? 'null' : `#${id}`);

// The response names the removed node and gives the list after the removal, but not the node's
// old neighbours. Those come from the drawing, which another client may have outdated, so each
// claim is checked against the list after the removal. If none holds, only the removal is stated.
function describeRemoval(op, r, nodesBefore, after) {
  const gone = `Removed value ${r.removed} (node #${r.node})`;
  if (after.length === 0) {
    return `${gone}: it was the only node, so the list is now empty and head and tail are null.`;
  }
  const inList = (id) => after.nodes.find((n) => n.id === id);
  const old = nodesBefore.find((n) => n.id === r.node);
  const head = inList(after.head);
  const tail = inList(after.tail);

  if (head && (op === 'pop-front' || (old && old.prev === null && old.next === head.id))) {
    return `${gone}: it was the head, so node #${head.id} is now the head and its prev is ${pointerText(head.prev)}.`;
  }
  if (tail && (op === 'pop-back' || (old && old.next === null && old.prev === tail.id))) {
    return `${gone}: it was the tail, so node #${tail.id} is now the tail and its next is ${pointerText(tail.next)}.`;
  }
  const before = old && inList(old.prev);
  const next = old && inList(old.next);
  if (before && next && before.next === next.id && next.prev === before.id) {
    return `${gone}: node #${before.id}'s next now points to node #${next.id}, and node #${next.id}'s prev now points back to node #${before.id}.`;
  }
  return `${gone}.`;
}

function describeDoubly(op, r, nodesBefore, after) {
  switch (op) {
    case 'pop-front':
    case 'pop-back':
    case 'delete':
      return describeRemoval(op, r, nodesBefore, after);
    case 'insert-after':
      return `Inserted node #${r.node} after node #${r.after}: only the neighbouring pointers changed.`;
    case 'find':
      return r.found ? `Found at index ${r.index} (node #${r.node}).` : 'Value not found.';
    case 'traverse-forward':
      return `Forward from head: ${r.values.join(' → ') || 'empty'}`;
    case 'traverse-backward':
      return `Backward from tail: ${r.values.join(' → ') || 'empty'}`;
    default:
      return '';
  }
}

function DoublyPanel({ onBusy }) {
  const { state, error, loading, run } = useDsState('linked-list/doubly');
  const [valueText, setValueText] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    onBusy(loading);
  }, [loading, onBusy]);

  const nodes = state ? state.nodes : [];
  // The selection is an id, so it simply stops matching once that node is gone.
  const selected = nodes.find((n) => n.id === selectedId) || null;

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    if (!data) {
      setMessage('');
      setHighlight(null);
      return null;
    }
    const r = data.result;
    setMessage(r ? describeDoubly(op, r, nodes, data.state) : '');
    setHighlight(r && r.node !== undefined ? r.node : null);
    return data;
  };

  const complain = (text) => {
    setLocalError(text);
    setMessage('');
  };

  const needValue = () => {
    if (!INT.test(valueText.trim())) {
      complain('Value must be a whole number');
      return undefined;
    }
    return Number(valueText.trim());
  };

  const withValue = (op) => () => {
    const value = needValue();
    if (value !== undefined) exec(op, { value });
  };
  const onInsertAfter = () => {
    if (!selected) {
      complain('Select a node first: click it in the drawing');
      return;
    }
    const value = needValue();
    if (value !== undefined) exec('insert-after', { node: selected.id, value });
  };
  const onDelete = () => {
    if (!selected) {
      complain('Select a node first: click it in the drawing');
      return;
    }
    exec('delete', { node: selected.id });
  };
  const onReset = async () => {
    const data = await exec('reset', {});
    if (data) {
      setSelectedId(null);
      setMessage('List reset.');
    }
  };

  const shownError = localError || error;
  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );

  return (
    <>
      <p className="linked-list-intro">
        Nodes scattered through memory, each pointing to both neighbors. It gives up O(1) indexing in
        exchange for O(1) insertion and removal at a position you already hold.
      </p>
      <p className="linked-list-complexity" data-testid="doubly-complexity">
        Access: O(n). Search: O(n). Insert: O(1) at a known node. Delete: O(1) at a known node.
        Space: O(n). Click a node to hold it: its id reaches the node directly, with no walk from the
        head.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}

      <div className="linked-list-scroll">
        {!state && !shownError && <p className="empty-message">Loading...</p>}
        {state && nodes.length === 0 && (
          <p className="empty-message">Doubly linked list is empty. Push some nodes!</p>
        )}
        {nodes.length > 0 && (
          <ol className="linked-list-chain" aria-label="Doubly linked list nodes">
            {nodes.map((n) => (
              <li
                key={n.id}
                data-testid={`dnode-${n.id}`}
                className={
                  'linked-list-ditem' +
                  (highlight === n.id ? ' linked-list-highlight' : '') +
                  (selectedId === n.id ? ' linked-list-selected' : '')
                }
              >
                <div className="linked-list-dcell">
                  <div className="linked-list-tags">
                    {n.id === state.head && <span className="linked-list-tag">head</span>}
                    {n.id === state.tail && <span className="linked-list-tag">tail</span>}
                  </div>
                  <button
                    type="button"
                    className="linked-list-dnode"
                    aria-label={`Select node #${n.id}, value ${n.value}`}
                    aria-pressed={selectedId === n.id}
                    onClick={() => {
                      setLocalError('');
                      setSelectedId(selectedId === n.id ? null : n.id);
                    }}
                    disabled={loading}
                  >
                    <span className="linked-list-dptr" data-testid={`dnode-${n.id}-prev`}>
                      <span className="linked-list-dptr-name">prev </span>{pointerText(n.prev)}
                    </span>
                    <span className="linked-list-val">{n.value}</span>
                    <span className="linked-list-dptr" data-testid={`dnode-${n.id}-next`}>
                      <span className="linked-list-dptr-name">next </span>{pointerText(n.next)}
                    </span>
                  </button>
                  <span className="linked-list-index">#{n.id}</span>
                </div>
                {n.next !== null && (
                  <span className="linked-list-dlinks" data-testid={`dlink-${n.id}`} aria-hidden="true">
                    <span>&rarr;</span>
                    <span>&larr;</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {state && (
        <div className="linked-list-stats">
          <span>Length: <strong>{state.length}</strong></span>
          <span>Head: <strong>{pointerText(state.head)}</strong></span>
          <span>Tail: <strong>{pointerText(state.tail)}</strong></span>
          <span data-testid="doubly-selected">
            Selected: <strong>{selected ? `#${selected.id} (value ${selected.value})` : 'none'}</strong>
          </span>
        </div>
      )}

      {message && <div className="linked-list-result" role="status">{message}</div>}

      <div className="ds-controls linked-list-dcontrols">
        <input
          type="text"
          aria-label="Value"
          placeholder="Value"
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          disabled={loading}
        />
        {btn('Push front', withValue('push-front'))}
        {btn('Push back', withValue('push-back'))}
        {btn('Pop front', () => exec('pop-front', {}))}
        {btn('Pop back', () => exec('pop-back', {}))}
        {btn('Find value', withValue('find'))}
        {btn('Reset', onReset)}
      </div>
      <div className="ds-controls linked-list-dcontrols">
        {btn('Insert after selected', onInsertAfter)}
        {btn('Delete selected', onDelete)}
        {btn('Traverse forward', () => exec('traverse-forward', {}))}
        {btn('Traverse backward', () => exec('traverse-backward', {}))}
      </div>
    </>
  );
}

export default function LinkedListView() {
  const [mode, setMode] = useState('singly');
  const [busy, setBusy] = useState(false);
  const modeButton = (value, label) => (
    <button
      type="button"
      className={'control-btn' + (mode === value ? ' linked-list-mode-active' : '')}
      aria-pressed={mode === value}
      onClick={() => setMode(value)}
      disabled={busy}
    >
      {label}
    </button>
  );

  return (
    <div className="ds-container">
      <h2>Linked List Visualization</h2>
      <div className="ds-controls" role="group" aria-label="List type">
        {modeButton('singly', 'Singly')}
        {modeButton('doubly', 'Doubly')}
      </div>
      {mode === 'singly' ? <SinglyPanel onBusy={setBusy} /> : <DoublyPanel onBusy={setBusy} />}
    </div>
  );
}
