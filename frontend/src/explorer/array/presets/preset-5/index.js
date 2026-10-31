import React, { useEffect, useRef } from 'react';
import './styles.css';

// Layout 5, the lesson notebook. A running log of notes sits beside three numbered sections:
// build the array, watch it, try an algorithm. Logic comes only from session and controls.

const ONLY_NUMBERS = { text: 'Only numbers in the array', fails: 'Needs numbers only' };
const IN_ORDER = { text: 'Values in order, smallest first', fails: 'Needs a sorted array' };
const NOT_EMPTY = { text: 'At least one value in the array', fails: 'Needs at least one value' };

// What each algorithm asks for. A blockedReason from the controls decides which line has failed.
const NEEDS = {
  two_sum_sorted: [ONLY_NUMBERS, IN_ORDER],
  binary_search: [ONLY_NUMBERS, IN_ORDER],
  max_subarray: [ONLY_NUMBERS, NOT_EMPTY],
  prefix_sums: [ONLY_NUMBERS],
};

const FIXES = {
  'Needs a sorted array': 'In section 1, undo or start over, then add the values in order.',
  'Needs numbers only': 'In section 1, undo or start over, then add only whole numbers.',
  'Needs at least one value': 'Append a value in section 1.',
};

const CHECK_WORDS = { met: 'Met', unmet: 'Not met', unknown: 'Not checked yet', todo: 'Still needed' };
const CHECK_MARKS = { met: '✓', unmet: '✕', unknown: '?', todo: '' };

function Check({ state }) {
  return (
    <span className={`p5-check p5-check-${state}`}>
      <span aria-hidden="true">{CHECK_MARKS[state]}</span>
      <span className="p5-sr">{CHECK_WORDS[state]}: </span>
    </span>
  );
}

// A field whose accessible name also says which action it belongs to.
function Field({ input, owner }) {
  return (
    <label className="p5-field">
      <span>
        {input.label}
        {input.kind === 'optional-number' && ', optional'}
        <span className="p5-sr"> for {owner}</span>
      </span>
      <input
        type="text"
        value={input.value}
        placeholder={input.kind === 'optional-number' ? '' : input.placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => input.setValue(e.target.value)}
      />
    </label>
  );
}

// Enter in a field runs that item, and the text stays selected so the next value replaces it.
function useRunner(controls, item, onRun) {
  return (e) => {
    e.preventDefault();
    if (controls.disabled) return;
    onRun();
    item.run();
    const focused = document.activeElement;
    if (focused && focused.tagName === 'INPUT') focused.select();
  };
}

function Operation({ item, controls, onRun }) {
  const run = useRunner(controls, item, onRun);
  return (
    <li>
      <form className="p5-op" onSubmit={run} noValidate>
        <div className="p5-op-text">
          <div className="p5-item-head">
            <h4>{item.label}</h4>
            <p className="p5-cost">{item.complexity}</p>
          </div>
          <p>{item.summary}</p>
        </div>
        <div className="p5-op-fields">
          {item.inputs.map((input) => (
            <Field key={input.id} input={input} owner={item.label} />
          ))}
        </div>
        <button type="submit" className="control-btn p5-op-run" disabled={Boolean(item.blockedReason)}>
          {item.label}
        </button>
        {item.blockedReason && <p className="p5-say p5-blocked">{item.blockedReason}</p>}
        <p className="p5-say p5-message" aria-live="polite">{item.message}</p>
      </form>
    </li>
  );
}

function Algorithm({ item, controls, onRun }) {
  const run = useRunner(controls, item, onRun);
  const needs = NEEDS[item.id];
  const failedAt = needs.findIndex((need) => need.fails === item.blockedReason);
  const stateOf = (i) => {
    if (failedAt < 0 || i < failedAt) return 'met';
    return i === failedAt ? 'unmet' : 'unknown';
  };
  return (
    <li>
      <form className="p5-algo" onSubmit={run} noValidate>
        <div className="p5-item-head">
          <h4>{item.label}</h4>
          <p className="p5-cost">{item.complexity}</p>
        </div>
        <p>{item.summary}</p>
        <p className="p5-needs-title">Before it can run, it needs:</p>
        <ul className="p5-needs">
          {needs.map((need, i) => (
            <li key={need.text}>
              <Check state={stateOf(i)} />
              <span>{need.text}</span>
            </li>
          ))}
          {item.inputs.map((input) => (
            <li key={input.id} className="p5-need-input">
              <Check state={input.value.trim() ? 'met' : 'todo'} />
              <Field input={input} owner={item.label} />
            </li>
          ))}
        </ul>
        <div className="p5-algo-foot">
          {item.blockedReason && (
            <p className="p5-say p5-blocked">
              <strong>{item.blockedReason}</strong> {FIXES[item.blockedReason]}
            </p>
          )}
          <p className="p5-say p5-message" aria-live="polite">{item.message}</p>
          <button type="submit" className="control-btn p5-algo-run" disabled={Boolean(item.blockedReason)}>
            Run {item.label.toLowerCase()}
          </button>
        </div>
      </form>
    </li>
  );
}

// The heading a run of notes gets when an algorithm made them, such as "Two sum, target 10".
function chapterFor(call, algorithms) {
  const algorithm = algorithms.find((a) => call && call.startsWith(`${a.id}(`));
  if (!algorithm) return null;
  const args = call.slice(algorithm.id.length + 1, -1);
  return args ? `${algorithm.label}, target ${args}` : algorithm.label;
}

// Scrolls a box, never the page, just enough to bring the item inside it into view.
function revealInBox(box, item, axis) {
  if (!box || !item) return;
  const b = box.getBoundingClientRect();
  const i = item.getBoundingClientRect();
  const [start, end, size, scroll] = axis === 'x'
    ? ['left', 'right', 'width', 'scrollLeft']
    : ['top', 'bottom', 'height', 'scrollTop'];
  if (i[start] < b[start] || i[end] > b[end]) {
    box[scroll] += i[start] - b[start] - (b[size] - i[size]) / 2;
  }
}

function NotesLog({ session, controls }) {
  const list = useRef(null);

  useEffect(() => {
    if (list.current) revealInBox(list.current, list.current.querySelector('[aria-current="step"]'), 'y');
  }, [session.step, session.frames.length]);

  // The log is one stop on the Tab key; the arrow keys move along its lines.
  const onKeyDown = (e) => {
    const lines = Array.from(list.current.querySelectorAll('button'));
    const at = lines.indexOf(document.activeElement);
    const to = { ArrowUp: at - 1, ArrowDown: at + 1, Home: 0, End: lines.length - 1 }[e.key];
    if (to === undefined || at < 0 || !lines[to]) return;
    e.preventDefault();
    lines[to].focus();
  };

  return (
    <aside className="p5-log" aria-labelledby="p5-log-title">
      <h3 id="p5-log-title">What happened</h3>
      {session.hasFrames ? (
        <>
          <p className="p5-log-hint">
            Pick a line to go back to that step.
            <span className="p5-sr"> Use the up and down arrow keys to move between lines.</span>
          </p>
          <ol className="p5-lines" ref={list} onKeyDown={onKeyDown}>
            {session.frames.map((frame, i) => {
              const startsCall = i === 0 || session.frames[i - 1].call !== frame.call;
              const chapter = startsCall ? chapterFor(session.calls[frame.call], controls.algorithms) : null;
              const current = i === session.step;
              return (
                <li key={i}>
                  {chapter && <p className="p5-chapter">{chapter}</p>}
                  <button
                    type="button"
                    className={`p5-line${current ? ' p5-line-now' : ''}${i > session.step ? ' p5-line-ahead' : ''}`}
                    aria-current={current ? 'step' : undefined}
                    tabIndex={current ? 0 : -1}
                    onClick={() => session.goTo(i)}
                  >
                    <span className="p5-line-number">{i + 1}</span>
                    <span>{frame.note}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <p className="p5-log-hint">Your notes start here. Append a value in section 1 to write the first line.</p>
      )}
    </aside>
  );
}

function StepBar({ session }) {
  const none = !session.hasFrames;
  return (
    <div className="p5-stepbar">
      <div className="p5-step-range">
        <input
          type="range"
          aria-label="Step"
          aria-valuetext={session.stepLabel}
          className="explorer-slider"
          min={0}
          max={session.lastStep}
          value={session.step}
          disabled={none}
          onChange={(e) => session.goTo(Number(e.target.value))}
        />
        <span className="explorer-count">{session.stepLabel}</span>
      </div>
      <div className="p5-step-buttons">
        <button type="button" className="control-btn" disabled={none} onClick={session.togglePlay}>
          {session.playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="control-btn" disabled={none} onClick={session.prev}>
          Previous step
        </button>
        <button type="button" className="control-btn" disabled={none} onClick={session.next}>
          Next step
        </button>
        <button type="button" className="control-btn" disabled={none} onClick={session.restart}>
          Restart
        </button>
      </div>
      <div className="p5-speed" role="group" aria-labelledby="p5-speed-label">
        <span id="p5-speed-label">Speed</span>
        {session.speeds.map((s) => (
          <button
            type="button"
            key={s.label}
            className={`control-btn${session.speed === s.ms ? ' explorer-speed-on' : ''}`}
            aria-pressed={session.speed === s.ms}
            onClick={() => session.setSpeed(s.ms)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Share({ session }) {
  const shown = session.shownCommand;
  return (
    <section className="p5-share" aria-labelledby="p5-share-title">
      <h3 id="p5-share-title">Share this array</h3>
      <p>A link rebuilds your array and every step. Nothing is saved on a server.</p>
      <div className="p5-share-buttons">
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
      {session.tooLong && <p className="p5-say">This command is too long to share as a link</p>}
      <p className="p5-say" aria-live="polite">{session.copyNote}</p>
      <form className="p5-command" onSubmit={session.submit}>
        <label className="p5-field">
          <span>Command</span>
          <input value={session.text} onChange={(e) => session.setText(e.target.value)} spellCheck={false} autoComplete="off" />
        </label>
        <button type="submit" className="control-btn" disabled={session.loading}>
          Run
        </button>
      </form>
    </section>
  );
}

export default function Preset5({ session, controls, intro: Intro, Board, title }) {
  const root = useRef(null);
  const stage = useRef(null);
  const ranSomething = useRef(false);
  const callCount = session.calls.length;
  const seenCalls = useRef(callCount);

  // Whatever was just run, bring the array into view so the person sees it happen.
  useEffect(() => {
    const grew = callCount > seenCalls.current;
    seenCalls.current = callCount;
    if (!grew || !ranSomething.current || !stage.current) return;
    ranSomething.current = false;
    const box = stage.current.getBoundingClientRect();
    if (box.top >= 0 && box.bottom <= window.innerHeight) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    stage.current.scrollIntoView?.({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
  }, [callCount]);

  // The app shows a failed edit's message above the layout, which may be far from the button pressed.
  const failure = session.error && session.error.message;
  useEffect(() => {
    if (!failure || !root.current) return;
    const alert = root.current.closest('.explorer')?.querySelector('[role="alert"]');
    if (alert && alert.getBoundingClientRect().top < 0) alert.scrollIntoView?.({ block: 'nearest' });
  }, [failure]);

  // Keep the marked cell on screen when a long array scrolls inside its box.
  useEffect(() => {
    if (!stage.current) return;
    revealInBox(stage.current.querySelector('.array-scroll'), stage.current.querySelector('.array-cell-highlight'), 'x');
  }, [session.step, session.frame]);

  const onRun = () => {
    ranSomething.current = true;
  };

  return (
    <div className="preset-5" ref={root}>
      <div className="p5-book">
        <header className="p5-head">
          {title && <h2>{title}</h2>}
          {Intro && <div className="p5-introtext"><Intro /></div>}
        </header>

        <section className="p5-section" aria-labelledby="p5-build">
          <h3 id="p5-build"><span className="p5-num">1.</span> Build your array</h3>
          <div className="p5-lead-row">
            <p className="p5-lead">These change the array. Each one writes a new line in your notes.</p>
            <div className="p5-edit">
              <button type="button" className="control-btn" disabled={!controls.canUndo} onClick={controls.undo}>
                Undo
              </button>
              <button type="button" className="control-btn" onClick={controls.startOver}>
                Start over
              </button>
            </div>
          </div>
          <ul className="p5-ops">
            {controls.operations.map((item) => (
              <Operation key={item.id} item={item} controls={controls} onRun={onRun} />
            ))}
          </ul>
        </section>

        <section className="p5-section" aria-labelledby="p5-watch">
          <h3 id="p5-watch"><span className="p5-num">2.</span> Watch it</h3>
          {session.structure && Board && (
            <div className="p5-stage" ref={stage}>
              <Board frame={session.frame} state={session.state} />
              <div className="p5-note" role="status">
                {session.hasFrames ? session.note : 'Nothing to watch yet. Build your array in section 1.'}
              </div>
            </div>
          )}
          <StepBar session={session} />
        </section>

        <NotesLog session={session} controls={controls} />

        <section className="p5-section" aria-labelledby="p5-try">
          <h3 id="p5-try"><span className="p5-num">3.</span> Try an algorithm</h3>
          <p className="p5-lead">
            These leave your array as it is. Each one works through the values and shows you every step.
          </p>
          <ul className="p5-algos">
            {controls.algorithms.map((item) => (
              <Algorithm key={item.id} item={item} controls={controls} onRun={onRun} />
            ))}
          </ul>
        </section>

        <Share session={session} />
      </div>
    </div>
  );
}
