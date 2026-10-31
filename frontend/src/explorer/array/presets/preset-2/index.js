import React, { useEffect, useRef, useState } from 'react';
import { PlayerControls } from '../../../parts';
import './styles.css';

const NAVIGATION_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];

const DENSE_FROM = 24;

const plural = (n) => `${n} ${n === 1 ? 'step' : 'steps'}`;

// One entry per call: how many frames it made, and the array as that call left it.
function buildFilm(session, controls) {
  const algorithmIds = controls.algorithms.map((a) => a.id);
  return controls.history.map((entry) => {
    const own = session.frames.filter((f) => f.call === entry.index);
    return {
      ...entry,
      count: own.length,
      state: own.length > 0 ? own[own.length - 1].state : null,
      isAlgorithm: algorithmIds.includes(entry.call.split('(')[0]),
    };
  });
}

// A tiny picture of the array: filled for used slots, hollow for spare ones.
function Thumbnail({ state }) {
  if (!state) return null;
  return (
    <span className={`p2-thumb${state.data.length >= DENSE_FROM ? ' p2-dense' : ''}`} aria-hidden="true">
      {state.data.map((_, i) => (
        <span key={i} className={i < state.size ? 'p2-thumb-used' : 'p2-thumb-free'} />
      ))}
    </span>
  );
}

// One perforation per step of a multi-step call, filled once playback has passed it.
function Perforations({ film, step }) {
  if (film.count < 2) return null;
  return (
    <span className={`p2-holes${film.count >= DENSE_FROM ? ' p2-dense' : ''}`} aria-hidden="true">
      {Array.from({ length: film.count }, (_, i) => (
        <span key={i} className={film.firstFrame + i <= step ? 'p2-hole-seen' : 'p2-hole-ahead'} />
      ))}
    </span>
  );
}

function chipCaption(film, step) {
  const kind = film.isAlgorithm ? 'Algorithm' : 'Edit';
  if (film.count === 0) return `${kind}, no steps`;
  if (film.active && film.count > 1) return `${kind}, step ${step - film.firstFrame + 1} of ${film.count}`;
  return `${kind}, ${plural(film.count)}`;
}

function Filmstrip({ session, controls }) {
  const listRef = useRef(null);
  const [focused, setFocused] = useState(null);
  const film = buildFilm(session, controls);

  // The strip is one Tab stop; arrow keys move along it.
  const wanted = focused ?? controls.activeCall ?? film.length - 1;
  const tabStop = film[wanted] && film[wanted].count > 0 ? wanted : film.findIndex((f) => f.count > 0);

  const { activeCall } = controls;
  useEffect(() => {
    const list = listRef.current;
    const chip = list && list.querySelector('[aria-current="step"]');
    if (chip) list.scrollLeft = chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2;
  }, [activeCall, film.length]);

  const onKeyDown = (e) => {
    if (!NAVIGATION_KEYS.includes(e.key)) return;
    const chips = Array.from(listRef.current.querySelectorAll('button:not(:disabled)'));
    const at = chips.indexOf(document.activeElement);
    const next = {
      ArrowLeft: Math.max(0, at - 1),
      ArrowRight: Math.min(chips.length - 1, at + 1),
      Home: 0,
      End: chips.length - 1,
    }[e.key];
    e.preventDefault();
    if (chips[next]) chips[next].focus();
  };

  if (film.length === 0) {
    return <p className="p2-strip-empty">No steps yet. Add a value under Edit to start.</p>;
  }

  return (
    <ol
      className="p2-strip"
      ref={listRef}
      aria-label="Calls so far"
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(null);
      }}
    >
      {film.map((f) => (
        <li key={`${f.index}:${f.call}`} className="p2-strip-item">
          <button
            type="button"
            className={`p2-chip ${f.isAlgorithm ? 'p2-chip-algorithm' : 'p2-chip-edit'}`}
            style={{ '--p2-frames': Math.min(f.count, 16) }}
            aria-current={f.active ? 'step' : undefined}
            tabIndex={f.index === tabStop ? 0 : -1}
            disabled={f.count === 0}
            onFocus={() => setFocused(f.index)}
            onClick={() => controls.goToCall(f.index)}
          >
            <span className="p2-chip-call">{f.call}</span>
            <Thumbnail state={f.state} />
            <Perforations film={f} step={session.step} />
            <span className="p2-chip-kind">{chipCaption(f, session.step)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function ActionFields({ item }) {
  return item.inputs.map((input) => (
    <label key={input.id} className="p2-field">
      <span>{input.label}</span>
      <input
        value={input.value}
        placeholder={input.placeholder}
        aria-label={`${item.label} ${input.label.toLowerCase()}`}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => input.setValue(e.target.value)}
      />
    </label>
  ));
}

// An edit is named by its verb. An algorithm has a name of its own and is run.
function ActionRow({ item, kind, busy }) {
  const isAlgorithm = kind === 'algorithm';
  const send = (e) => {
    e.preventDefault();
    if (!busy) item.run();
  };
  return (
    <li>
      <form className={`p2-row p2-row-${kind} array-controls`} onSubmit={send} noValidate>
        <div className="p2-row-text">
          {isAlgorithm && <h4>{item.label}</h4>}
          <p>{item.summary}</p>
          <p className="p2-complexity">{item.complexity}</p>
        </div>
        <div className="p2-row-act">
          <ActionFields item={item} />
          {isAlgorithm ? (
            <button
              type="submit"
              className="control-btn p2-run"
              aria-label={`Run ${item.label}`}
              disabled={Boolean(item.blockedReason)}
            >
              Run
            </button>
          ) : (
            <button type="submit" className="control-btn p2-verb" disabled={Boolean(item.blockedReason)}>
              {item.label}
            </button>
          )}
        </div>
        {item.blockedReason && <p className="p2-blocked">{item.blockedReason}</p>}
        <p className="p2-message" aria-live="polite">{item.message}</p>
      </form>
    </li>
  );
}

function Dock({ controls }) {
  return (
    <div className="p2-dock">
      <section className="p2-group p2-group-edit" aria-labelledby="p2-edit-title">
        <h3 id="p2-edit-title">Edit</h3>
        <p className="p2-group-lead">Changes the array. Each edit adds a step to the history.</p>
        <ul>
          {controls.operations.map((item) => (
            <ActionRow key={item.id} item={item} kind="edit" busy={controls.disabled} />
          ))}
        </ul>
      </section>
      <section className="p2-group p2-group-algorithms" aria-labelledby="p2-algorithms-title">
        <h3 id="p2-algorithms-title">Algorithms</h3>
        <p className="p2-group-lead">Leaves the array as it is and plays the work step by step.</p>
        <ul>
          {controls.algorithms.map((item) => (
            <ActionRow key={item.id} item={item} kind="algorithm" busy={controls.disabled} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function ShareBand({ session }) {
  const shown = session.shownCommand;
  return (
    <section className="p2-share" aria-labelledby="p2-share-title">
      <h3 id="p2-share-title">Share</h3>
      <form className="explorer-command" onSubmit={session.submit}>
        <label>
          Command
          <input value={session.text} onChange={(e) => session.setText(e.target.value)} spellCheck={false} />
        </label>
        <button type="submit" className="control-btn" disabled={session.loading}>
          Run
        </button>
      </form>
      <div className="p2-share-buttons">
        <button type="button" className="control-btn" disabled={session.tooLong || !shown} onClick={session.copyLink}>
          Copy link
        </button>
        <button type="button" className="control-btn" disabled={session.tooLong || !shown} onClick={session.copyEmbed}>
          Copy embed code
        </button>
        <button type="button" className="control-btn" disabled={!session.shownCommandValid} onClick={session.copyQuestion}>
          Copy question for Claude
        </button>
      </div>
      {session.tooLong && <p className="array-legend">This command is too long to share as a link</p>}
      <p className="array-legend p2-copy-note" aria-live="polite">{session.copyNote}</p>
    </section>
  );
}

// Keeps the marked cell in view when a long array scrolls inside its own container.
function useFollowHighlight(session) {
  const stageRef = useRef(null);
  const { step } = session;
  const frameCount = session.frames.length;
  useEffect(() => {
    const scroller = stageRef.current && stageRef.current.querySelector('.array-scroll');
    const cell = scroller && scroller.querySelector('.array-cell-highlight');
    if (!cell) return;
    const from = scroller.getBoundingClientRect().left;
    const left = cell.getBoundingClientRect().left - from + scroller.scrollLeft;
    scroller.scrollLeft = left - (scroller.clientWidth - cell.offsetWidth) / 2;
  }, [step, frameCount]);
  return stageRef;
}

function picture(capacity) {
  if (capacity <= 8) return 'p2-stage-large';
  if (capacity <= 16) return 'p2-stage-medium';
  return 'p2-stage-small';
}

// Layout 2, Filmstrip. History runs across the page, one chip per call, under a large picture of the array.
export default function Preset2({ session, controls, intro: Intro, Board, title }) {
  const stageRef = useFollowHighlight(session);
  const capacity = session.state ? session.state.capacity : 0;
  return (
    <div className="preset-2">
      <header className="p2-header">
        <h2>{title}</h2>
        <div className="p2-intro">
          <Intro />
        </div>
      </header>

      <div className={`p2-stage ${picture(capacity)}`} ref={stageRef}>
        <Board frame={session.frame} state={session.state} />
        <div className="p2-caption" role="status">
          {session.note}
        </div>
      </div>

      <section className="p2-history" aria-labelledby="p2-history-title">
        <div className="p2-history-head">
          <div>
            <h3 id="p2-history-title">History</h3>
            <p>Select a call to see it again.</p>
          </div>
          <div className="p2-history-actions">
            <button type="button" className="control-btn" disabled={!controls.canUndo} onClick={controls.undo}>
              Undo
            </button>
            <button type="button" className="control-btn" disabled={!controls.canUndo} onClick={controls.startOver}>
              Start over
            </button>
          </div>
        </div>
        <Filmstrip session={session} controls={controls} />
        <PlayerControls session={session} />
      </section>

      <Dock controls={controls} />
      <ShareBand session={session} />
    </div>
  );
}
