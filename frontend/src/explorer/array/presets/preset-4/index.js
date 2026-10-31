import React, { useEffect, useRef } from 'react';
import { PlayerControls, SharePanel } from '../../../parts';
import HandsOnArray from './HandsOnArray';
import './styles.css';

// The call behind the frame on screen belongs to this algorithm.
const isOnScreen = (controls, algo) => {
  const entry = controls.activeCall === null ? null : controls.history[controls.activeCall];
  return Boolean(entry && entry.call.startsWith(`${algo.id}(`));
};

function Algorithm({ algo, controls, onRun }) {
  const field = algo.inputs[0];
  const blocked = Boolean(algo.blockedReason);
  const submit = (e) => {
    e.preventDefault();
    if (controls.disabled) return;
    // Only a run that was really sent should bring the array back into view.
    if (algo.run()) onRun();
  };
  return (
    <form className="p4-algo" onSubmit={submit} aria-label={algo.label}>
      <h4 className="p4-algo-name">{algo.label}</h4>
      <p className="p4-small">
        {algo.summary} {algo.complexity}.
      </p>
      <div className="p4-algo-run">
        {field && (
          <label className="p4-field">
            {field.label}
            <input
              inputMode="numeric"
              autoComplete="off"
              value={field.value}
              placeholder={field.placeholder}
              onChange={(e) => field.setValue(e.target.value)}
            />
          </label>
        )}
        <button type="submit" className="control-btn" aria-disabled={blocked}>
          Run {algo.label}
        </button>
      </div>
      {blocked && <p className="p4-blocked">{algo.blockedReason}</p>}
      {algo.message && <p className="p4-message">{algo.message}</p>}
      {isOnScreen(controls, algo) && <p className="p4-now">On screen now</p>}
    </form>
  );
}

// Layout 4, Hands on. The array is the control for changing it; algorithms are a separate band below.
export default function Preset4({ session, controls, intro: Intro, title }) {
  const stage = useRef(null);
  const note = useRef(null);
  const ranAlgorithm = useRef(false);
  const callCount = session.calls.length;

  // The typed index belongs to the array that was on screen; Undo and Start over replace it.
  const clearIndex = () => {
    controls.operations.filter((op) => op.id === 'get' || op.id === 'pop').forEach((op) => op.inputs[0].setValue(''));
  };

  // The Run buttons sit below the array, so bring the array back into view for the animation.
  useEffect(() => {
    if (!ranAlgorithm.current) return;
    ranAlgorithm.current = false;
    const row = stage.current?.querySelector('.p4-scroll');
    if (!note.current?.scrollIntoView || !row) return;
    if (note.current.getBoundingClientRect().top >= 0 && row.getBoundingClientRect().bottom <= window.innerHeight) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    note.current.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  }, [callCount]);

  return (
    <div className="preset-4">
      {title && <h2>{title}</h2>}
      {Intro && <Intro />}

      <section className="p4-stage" ref={stage} aria-label="The array">
        <div className="p4-top">
          <div className="array-stats" aria-label="Array statistics">
            <span>
              Size: <strong>{session.state ? session.state.size : 0}</strong>
            </span>
            <span>
              Capacity: <strong>{session.state ? session.state.capacity : 0}</strong>
            </span>
            <span>
              Resizes: <strong>{session.state ? session.state.resizes : 0}</strong>
            </span>
          </div>
          <div className="p4-top-actions">
            <button type="button" className="control-btn" disabled={!controls.canUndo} onClick={() => {
                clearIndex();
                controls.undo();
              }}>
              Undo
            </button>
            <button type="button" className="control-btn" onClick={() => {
                clearIndex();
                controls.startOver();
              }}>
              Start over
            </button>
          </div>
        </div>
        <div className="explorer-note p4-note" role="status" ref={note}>
          {session.note}
        </div>
        <HandsOnArray session={session} controls={controls} />
        <PlayerControls session={session} />
      </section>

      <section className="p4-band" aria-labelledby="p4-band-title">
        <h3 id="p4-band-title">Run an algorithm</h3>
        <p className="p4-band-lead">
          These leave the array as it is. They walk through it and show you each step above.
        </p>
        <div className="p4-algos">
          {controls.algorithms.map((algo) => (
            <Algorithm
              key={algo.id}
              algo={algo}
              controls={controls}
              onRun={() => {
                ranAlgorithm.current = true;
              }}
            />
          ))}
        </div>
      </section>

      <SharePanel session={session} />
    </div>
  );
}
