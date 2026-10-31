import React, { useState } from 'react';
import useDsState from '../hooks/useDsState';
import './QueueView.css';

const parseValue = (text) => (/^-?\d+$/.test(text.trim()) ? Number(text.trim()) : text);

function describe(op, result) {
  switch (op) {
    case 'circular-dequeue':
    case 'stacks-dequeue':
      return `Dequeued: ${JSON.stringify(result)}`;
    case 'deque-pop-front':
      return `Popped from front: ${JSON.stringify(result)}`;
    case 'deque-pop-back':
      return `Popped from back: ${JSON.stringify(result)}`;
    case 'sliding-window-max':
      return `Window maximums: [${result.maxes.join(', ')}]`;
    default:
      return '';
  }
}

function Cells({ items, label }) {
  return (
    <div className="queue-scroll">
      <div className="queue-row" aria-label={label} role="list">
        {items.map((v, i) => (
          <span key={i} role="listitem" className="queue-cell">{String(v)}</span>
        ))}
      </div>
    </div>
  );
}

export default function QueueView() {
  const { state, error, loading, run } = useDsState('queue');
  const [valueText, setValueText] = useState('');
  const [numsText, setNumsText] = useState('1, 3, -1, -3, 5, 3, 6, 7');
  const [kText, setKText] = useState('3');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [trace, setTrace] = useState(null);

  const exec = async (op, payload) => {
    setLocalError('');
    const data = await run(op, payload);
    setMessage(data ? describe(op, data.result) : '');
    return data;
  };

  const push = (op) => {
    if (valueText === '') {
      setLocalError('Please enter a value');
      return;
    }
    exec(op, { value: parseValue(valueText) });
  };

  const onSlide = async () => {
    const nums = numsText.split(',').map((t) => t.trim()).filter((t) => t !== '');
    if (nums.length === 0 || nums.some((t) => !/^-?\d+$/.test(t)) || !/^\d+$/.test(kText.trim())) {
      setLocalError('Numbers must be whole numbers separated by commas, and k a positive whole number');
      return;
    }
    const data = await exec('sliding-window-max', { nums: nums.map(Number), k: Number(kText) });
    setTrace(data ? data.result : null);
  };

  const shownError = localError || error;
  const loaded = state !== null;
  const c = loaded ? state.circular : null;
  const [stepIdx, setStepIdx] = useState(0);
  const step = trace ? trace.steps[Math.min(stepIdx, trace.steps.length - 1)] : null;

  const btn = (label, onClick) => (
    <button className="control-btn" onClick={onClick} disabled={loading}>{label}</button>
  );

  return (
    <div className="ds-container">
      <h2>Queue Visualization</h2>
      <p className="queue-intro">
        A queue is first in, first out. A deque (double-ended queue) allows O(1) insertion and
        removal at both ends. Queues drive BFS, schedulers, and buffers.
      </p>
      <p className="queue-complexity">
        Enqueue and dequeue are O(1) in the circular buffer. The two-stack queue is amortized O(1):
        each item moves between the stacks at most once. Dequeuing by shifting an array
        (list.pop(0)) is O(n).
      </p>

      {shownError && <div className="error-message" role="alert">{shownError}</div>}
      {!loaded && !shownError && <p className="empty-message">Loading...</p>}

      <div className="ds-controls">
        <input
          type="text"
          aria-label="Value"
          placeholder="Value"
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          disabled={loading}
        />
        {btn('Reset all', async () => {
          setLocalError('');
          setTrace(null);
          const d = await run('reset');
          setMessage(d ? 'Reset.' : '');
        })}
      </div>

      {message && <div className="queue-result" role="status">{message}</div>}

      {loaded && (
        <>
          <section className="queue-section" aria-label="Circular queue">
            <h3>Circular buffer queue</h3>
            <p>Fixed capacity {c.capacity}; indices wrap around instead of shifting. Size: {c.size}.</p>
            <div className="queue-scroll">
              <div className="queue-row" data-testid="circular-slots">
                {c.slots.map((v, i) => {
                  const isHead = c.size > 0 && i === c.head;
                  const isTail = c.size > 0 && i === (c.head + c.size - 1) % c.capacity;
                  return (
                    <span key={i} className="queue-slot">
                      <span className="queue-tag">
                        {[isHead && 'head', isTail && 'tail'].filter(Boolean).join('/')}
                      </span>
                      <span className={v === null ? 'queue-cell queue-cell-empty' : 'queue-cell'}>
                        {v === null ? '-' : String(v)}
                      </span>
                      <span>{i}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            {c.size === 0 && <p className="empty-message">Queue is empty.</p>}
            <div className="ds-controls">
              {btn('Enqueue', () => push('circular-enqueue'))}
              {btn('Dequeue', () => exec('circular-dequeue'))}
            </div>
          </section>

          <section className="queue-section" aria-label="Queue with two stacks">
            <h3>Queue with two stacks</h3>
            <p>Dequeue pops from the outgoing stack; when it is empty, incoming is poured into it.</p>
            <div className="queue-stacks">
              {[['Incoming', state.stacks.incoming], ['Outgoing', state.stacks.outgoing]].map(
                ([name, items]) => (
                  <div key={name}>
                    <div className="queue-stack-title">{name} stack (top at the top)</div>
                    <div className="queue-stack" role="list" aria-label={`${name} stack`}>
                      {items.map((v, i) => (
                        <span key={i} role="listitem" className="queue-cell">{String(v)}</span>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
            {state.stacks.incoming.length + state.stacks.outgoing.length === 0 && (
              <p className="empty-message">Queue is empty.</p>
            )}
            <div className="ds-controls">
              {btn('Enqueue', () => push('stacks-enqueue'))}
              {btn('Dequeue', () => exec('stacks-dequeue'))}
            </div>
          </section>

          <section className="queue-section" aria-label="Deque">
            <h3>Deque</h3>
            <Cells items={state.deque} label="Deque items" />
            {state.deque.length === 0 && <p className="empty-message">Deque is empty.</p>}
            <div className="ds-controls">
              {btn('Push front', () => push('deque-push-front'))}
              {btn('Push back', () => push('deque-push-back'))}
              {btn('Pop front', () => exec('deque-pop-front'))}
              {btn('Pop back', () => exec('deque-pop-back'))}
            </div>
          </section>
        </>
      )}

      <section className="queue-section" aria-label="Monotonic deque">
        <h3>Monotonic deque: sliding window maximum</h3>
        <p>
          The deque holds indices of candidates in decreasing order, giving an O(n) sliding-window
          maximum.
        </p>
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
            aria-label="Window size k"
            value={kText}
            onChange={(e) => setKText(e.target.value)}
            disabled={loading}
          />
          {btn('Run', () => { setStepIdx(0); onSlide(); })}
        </div>
        {trace && step && (
          <div>
            <div className="queue-scroll">
              <div className="queue-row">
                {trace.nums.map((n, i) => (
                  <span key={i} className="queue-slot">
                    <span
                      className={
                        i <= step.index && i > step.index - trace.k
                          ? 'queue-cell queue-in-window'
                          : 'queue-cell queue-cell-empty'
                      }
                    >
                      {n}
                    </span>
                    <span>{i}</span>
                  </span>
                ))}
              </div>
            </div>
            <p role="status" data-testid="trace-step">
              Step {step.index + 1} of {trace.steps.length}. Deque indices: [{step.deque.join(', ')}]
              {step.max !== null ? `, window max: ${step.max}` : ', window not full yet'}
            </p>
            <div className="ds-controls">
              <button
                className="control-btn"
                onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
                disabled={stepIdx <= 0}
              >
                Previous step
              </button>
              <button
                className="control-btn"
                onClick={() => setStepIdx((s) => Math.min(trace.steps.length - 1, s + 1))}
                disabled={stepIdx >= trace.steps.length - 1}
              >
                Next step
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
