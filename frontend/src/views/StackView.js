import React, { useEffect, useRef, useState } from 'react';
import useDsState from '../hooks/useDsState';
import './StackView.css';

const POP_MS = 400;
const PUSH_MS = 600;

const parseInts = (text) =>
  text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .map((t) => (/^-?\d+$/.test(t) ? Number(t) : NaN));

function describe(op, result) {
  switch (op) {
    case 'push':
      return `Pushed ${result}.`;
    case 'pop':
      return `Popped ${result}.`;
    case 'peek':
      return `Top of stack: ${result} (not removed).`;
    case 'valid-parentheses':
      return result ? 'Valid: every bracket is matched and the stack ends empty.' : 'Not valid.';
    case 'min-stack':
      return 'Min stack, (value, min so far): ' +
        (result.length ? result.map((r) => `(${r.value}, ${r.min})`).join(' ') : 'no values');
    case 'daily-temperatures':
      return `Days until warmer: [${result.join(', ')}]`;
    default:
      return '';
  }
}

export default function StackView() {
  const { state, error, loading, run } = useDsState('stack');
  const [input, setInput] = useState('');
  const [parenText, setParenText] = useState('({[]})');
  const [minText, setMinText] = useState('3, 1, 2');
  const [tempText, setTempText] = useState('73, 74, 75, 71, 69, 72, 76, 73');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [newIndex, setNewIndex] = useState(null);
  const [removing, setRemoving] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const busy = loading || removing;
  const loaded = state !== null;
  const items = loaded ? state.items : [];

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result) : '');
    return data;
  };

  const onPush = async () => {
    if (input.trim() === '') {
      setLocalError('Please enter a value to push');
      return;
    }
    const text = input.trim();
    const value = /^-?\d+$/.test(text) && Math.abs(Number(text)) <= 1e9 ? Number(text) : input;
    const data = await exec('push', { value });
    if (data) {
      setInput('');
      setNewIndex(data.state.items.length - 1);
      timers.current.push(setTimeout(() => setNewIndex(null), PUSH_MS));
    }
  };

  const onPop = () => {
    if (items.length === 0) return;
    setLocalError('');
    setRemoving(true);
    timers.current.push(
      setTimeout(async () => {
        await exec('pop');
        setRemoving(false);
      }, POP_MS)
    );
  };

  const onParens = () => exec('valid-parentheses', { text: parenText });
  const onMin = () => {
    const values = parseInts(minText);
    if (values.some(Number.isNaN)) {
      setLocalError('Values must be whole numbers separated by commas');
      return;
    }
    exec('min-stack', { values });
  };
  const onTemps = () => {
    const temps = parseInts(tempText);
    if (temps.some(Number.isNaN)) {
      setLocalError('Temperatures must be whole numbers separated by commas');
      return;
    }
    exec('daily-temperatures', { temps });
  };

  const shownError = localError || error;

  return (
    <div className="ds-container">
      <h2>Stack Visualization</h2>
      <p className="stack-view-intro">
        Last in, first out. Push, pop, and peek are all O(1). It can be backed by an array or a
        linked list. Function calls use one, which is why any recursion can be rewritten with an
        explicit stack.
      </p>
      <p className="stack-view-complexity">
        Push, pop, peek: O(1). Monotonic stack scans: O(n), since each element is pushed and popped
        at most once.
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}

      {loaded && (
        <div className="stack-view-stats">
          <span>Size: <strong>{state.size}</strong></span>
          <span>Capacity: <strong>{state.capacity}</strong></span>
        </div>
      )}

      <div className="stack-view-board" data-testid="stack-board">
        {!loaded && !shownError && <p className="empty-message">Loading...</p>}
        {loaded && items.length === 0 && (
          <p className="empty-message">Stack is empty. Push some elements!</p>
        )}
        {items.length > 0 && (
          <ul className="stack-view-items" aria-label="Stack items">
            {items.map((item, i) => {
              const isTop = i === items.length - 1;
              const cls = [
                'stack-view-item',
                isTop ? 'stack-view-top' : '',
                i === newIndex ? 'stack-view-new' : '',
                isTop && removing ? 'stack-view-removing' : '',
              ].filter(Boolean).join(' ');
              return (
                <li key={i} className={cls}>{String(item)}</li>
              );
            })}
          </ul>
        )}
      </div>

      {message && <div className="stack-view-result" role="status">{message}</div>}

      <div className="ds-controls">
        <input
          type="text"
          aria-label="Value"
          placeholder="Enter value to push"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && onPush()}
          disabled={busy}
        />
        <button className="control-btn" onClick={onPush} disabled={busy}>Push</button>
        <button className="control-btn" onClick={onPop} disabled={busy || items.length === 0}>Pop</button>
        <button className="control-btn" onClick={() => exec('peek')} disabled={busy || items.length === 0}>Peek</button>
        <button
          className="control-btn"
          onClick={async () => {
            setLocalError('');
            const d = await run('reset');
            setMessage(d ? 'Stack reset.' : '');
          }}
          disabled={busy}
        >
          Reset
        </button>
      </div>

      <div className="stack-view-algos">
        <div className="stack-view-algo">
          <input type="text" aria-label="Brackets" value={parenText}
            onChange={(e) => setParenText(e.target.value)} disabled={busy} />
          <button className="control-btn" onClick={onParens} disabled={busy}>Check parentheses</button>
        </div>
        <div className="stack-view-algo">
          <input type="text" aria-label="Min stack values" value={minText}
            onChange={(e) => setMinText(e.target.value)} disabled={busy} />
          <button className="control-btn" onClick={onMin} disabled={busy}>Min stack</button>
        </div>
        <div className="stack-view-algo">
          <input type="text" aria-label="Temperatures" value={tempText}
            onChange={(e) => setTempText(e.target.value)} disabled={busy} />
          <button className="control-btn" onClick={onTemps} disabled={busy}>Daily temperatures</button>
        </div>
      </div>
    </div>
  );
}
