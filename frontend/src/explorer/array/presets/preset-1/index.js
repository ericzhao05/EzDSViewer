import React, { useEffect, useRef, useState } from 'react';
import './styles.css';

const TABS = [
  {
    id: 'change',
    label: 'Change the array',
    lead: 'These work on the array itself. Each one adds a step you can replay.',
    listKey: 'operations',
  },
  {
    id: 'run',
    label: 'Run an algorithm',
    lead: 'These work through the values already there and leave them as they are. Each run plays step by step.',
    listKey: 'algorithms',
  },
];

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// Centres a child inside its own scrolling row. Never moves the page.
function scrollWithin(scroller, child) {
  if (!scroller || !child || !scroller.scrollTo) return;
  const left = child.offsetLeft - (scroller.clientWidth - child.offsetWidth) / 2;
  scroller.scrollTo({ left, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

// A button that stays focusable when it can't act, so keyboard users keep their place.
function ActionButton({ blocked, onClick, describedBy, type = 'button', children }) {
  return (
    <button
      type={type}
      className="control-btn"
      aria-disabled={blocked ? 'true' : undefined}
      aria-describedby={describedBy}
      onClick={(e) => {
        if (blocked) {
          e.preventDefault();
          return;
        }
        if (onClick) onClick(e);
      }}
    >
      {children}
    </button>
  );
}

// One action with its own inputs, reason and message.
function ActionItem({ item, kind, busy }) {
  const helpId = `p1-${item.id}-help`;
  const blocked = Boolean(item.blockedReason);
  const actionName = kind === 'run' ? `Run ${item.label}` : item.label;
  const send = (e) => {
    e.preventDefault();
    if (!blocked && !busy) item.run();
  };
  return (
    <form className="p1-item" aria-label={item.label} onSubmit={send} noValidate>
      <div className="p1-item-head">
        <h3>{item.label}</h3>
        {item.complexity && <span className="p1-cost">{item.complexity}</span>}
      </div>
      <p className="p1-summary">{item.summary}</p>
      <div className="p1-item-do">
        {item.inputs.map((input) => (
          <label className="p1-field" key={input.id}>
            <span>
              {input.label}
              {input.kind === 'optional-number' ? ' (optional)' : ''}
            </span>
            <input
              value={input.value}
              onChange={(e) => input.setValue(e.target.value)}
              placeholder={input.kind === 'optional-number' ? 'last' : input.placeholder}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={blocked || item.message ? helpId : undefined}
            />
          </label>
        ))}
        {item.inputs.length === 0 && <p className="p1-noinput">Uses the whole array.</p>}
        <ActionButton type="submit" blocked={blocked} describedBy={blocked || item.message ? helpId : undefined}>
          {actionName}
        </ActionButton>
      </div>
      {(blocked || item.message) && (
        <div id={helpId} className="p1-help">
          {blocked && <p className="p1-blocked">{item.blockedReason}</p>}
          {item.message && <p className="p1-message">{item.message}</p>}
        </div>
      )}
    </form>
  );
}

// Turns "two_sum_sorted(10)" into plain words, and says whether it was an algorithm.
function describeCall(call, controls) {
  const match = /^([a-z_]+)\((.*)\)$/s.exec(call);
  if (!match) return { text: call, isRun: false };
  const [, method, args] = match;
  const operation = controls.operations.find((o) => o.id === method);
  const algorithm = controls.algorithms.find((a) => a.id === method);
  const found = operation || algorithm;
  if (!found) return { text: call, isRun: false };
  const name = algorithm ? `Run ${found.label}` : found.label;
  return { text: args ? `${name} ${args}` : name, isRun: Boolean(algorithm) };
}

function CallTape({ controls }) {
  const tape = useRef(null);
  const { activeCall, history } = controls;
  useEffect(() => {
    if (!tape.current) return;
    scrollWithin(tape.current, tape.current.querySelector('[aria-current="step"]'));
  }, [activeCall, history.length]);

  if (history.length === 0) {
    return <p className="p1-tape-empty">Nothing yet. What you do in the panel shows up here.</p>;
  }
  return (
    <ol className="p1-tape" ref={tape} aria-label="Jump to an action">
      {history.map((entry) => {
        const { text, isRun } = describeCall(entry.call, controls);
        return (
          <li key={entry.index}>
            <button
              type="button"
              className={`p1-chip${isRun ? ' p1-chip-run' : ''}`}
              aria-current={entry.active ? 'step' : undefined}
              aria-disabled={entry.firstFrame < 0 ? 'true' : undefined}
              onClick={() => controls.goToCall(entry.index)}
            >
              {text}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepBar({ session }) {
  const none = !session.hasFrames;
  return (
    <div className="p1-bar">
      <div className="p1-transport">
        <ActionButton blocked={none} onClick={session.togglePlay}>
          {session.playing ? 'Pause' : 'Play'}
        </ActionButton>
        <ActionButton blocked={!session.canPrev} onClick={session.prev}>
          Previous step
        </ActionButton>
        <ActionButton blocked={!session.canNext} onClick={session.next}>
          Next step
        </ActionButton>
        <ActionButton blocked={none} onClick={session.restart}>
          Restart
        </ActionButton>
      </div>
      <div className="p1-scrub">
        <span className="explorer-count">{session.stepLabel}</span>
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
      </div>
      <div className="p1-speed" role="group" aria-labelledby="p1-speed-label">
        <span id="p1-speed-label">Speed</span>
        {session.speeds.map((s) => (
          <button
            key={s.label}
            type="button"
            className="control-btn"
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

function Panel({ controls, session }) {
  const lastCall = session.calls[session.calls.length - 1] || '';
  const opensOnRun = controls.algorithms.some((a) => lastCall.startsWith(`${a.id}(`));
  const [active, setActive] = useState(opensOnRun ? 'run' : 'change');
  const tabRefs = useRef({});

  const onTabKey = (e) => {
    const at = TABS.findIndex((t) => t.id === active);
    const moves = {
      ArrowRight: (at + 1) % TABS.length,
      ArrowLeft: (at - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const nextTab = TABS[moves[e.key]].id;
    setActive(nextTab);
    tabRefs.current[nextTab].focus();
  };

  return (
    <section className="p1-panel" aria-label="Actions">
      <div className="p1-tabs" role="tablist" aria-label="What do you want to do?">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={`p1-tab-${tab.id}`}
            className="p1-tab"
            aria-selected={active === tab.id}
            aria-controls={`p1-pane-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={onTabKey}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {session.error && (
        <p className="p1-error-pointer">That didn&rsquo;t run. The reason is at the top of the page.</p>
      )}
      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`p1-pane-${tab.id}`}
          aria-labelledby={`p1-tab-${tab.id}`}
          className="p1-pane"
          hidden={active !== tab.id}
        >
          <p className="p1-lead">{tab.lead}</p>
          {controls[tab.listKey].map((item) => (
            <ActionItem key={item.id} item={item} kind={tab.id} busy={controls.disabled} />
          ))}
        </div>
      ))}
    </section>
  );
}

function Share({ session }) {
  const shown = session.shownCommand;
  const cannotLink = session.tooLong || !shown;
  return (
    <section className="p1-share" aria-labelledby="p1-share-title">
      <div className="p1-share-copy">
        <h3 id="p1-share-title">Share what you made</h3>
        <p>A link rebuilds these steps for anyone who opens it. Nothing is saved on a server.</p>
        <div className="p1-share-buttons">
          <ActionButton blocked={cannotLink} onClick={session.copyLink}>
            Copy link
          </ActionButton>
          <ActionButton blocked={cannotLink} onClick={session.copyEmbed}>
            Copy embed code
          </ActionButton>
          <ActionButton blocked={!session.shownCommandValid} onClick={session.copyQuestion}>
            Copy question for Claude
          </ActionButton>
        </div>
        {session.tooLong && <p className="p1-share-note">This command is too long to share as a link</p>}
        <p className="p1-share-note" aria-live="polite">
          {session.copyNote}
        </p>
      </div>
      <form className="p1-command" onSubmit={session.submit}>
        <label className="p1-field">
          <span>Command</span>
          <input value={session.text} onChange={(e) => session.setText(e.target.value)} spellCheck={false} autoComplete="off" />
        </label>
        <ActionButton type="submit" blocked={session.loading}>
          Run
        </ActionButton>
        <p className="p1-command-hint">The same steps as text. Edit them and press Run to rebuild the array.</p>
      </form>
    </section>
  );
}

// Layout 1, The Workbench. The array and its step bar hold still in a stage on the left;
// a panel on the right shows one kind of action at a time.
export default function Preset1({ session, controls, intro: Intro, Board, title }) {
  const view = useRef(null);

  // In a long array, keep the marked or newest cell in sight during playback.
  useEffect(() => {
    if (!view.current) return;
    const scroller = view.current.querySelector('.array-scroll');
    if (!scroller) return;
    const cell =
      scroller.querySelector('.array-cell-highlight') ||
      [...scroller.querySelectorAll('.array-cell-used')].pop();
    if (cell) scrollWithin(scroller, cell.parentElement);
  }, [session.step, session.frames.length]);

  const emptyHint = session.hasFrames ? '' : 'The array is empty. Use Change the array to add a value.';

  return (
    <div className="preset-1">
      <header className="p1-header">
        {title && <h2>{title}</h2>}
        {Intro && (
          <div className="p1-intro">
            <Intro />
          </div>
        )}
      </header>

      <div className="p1-workbench">
        <div className="p1-stage">
          <div className="p1-view" ref={view}>
            <Board frame={session.frame} state={session.state} />
            <div className="p1-note" role="status">
              {session.note || emptyHint}
            </div>
          </div>
          <StepBar session={session} />
          <div className="p1-log">
            <div className="p1-log-head">
              <h3>Your steps</h3>
              <div className="p1-log-actions">
                <ActionButton blocked={!controls.canUndo} onClick={controls.undo}>
                  Undo
                </ActionButton>
                <ActionButton onClick={controls.startOver}>Start over</ActionButton>
              </div>
            </div>
            <CallTape controls={controls} />
          </div>
        </div>

        <Panel controls={controls} session={session} />
      </div>

      <Share session={session} />
    </div>
  );
}
