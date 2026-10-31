import React, { useEffect, useRef, useState } from 'react';
import PlayerBar from './PlayerBar';
import './styles.css';

// The words around each operation's inputs. A string is plain text; { input } is an input's id.
const SENTENCES = {
  append: { verb: 'Append', words: [{ input: 'append-value' }, 'to the end'] },
  insert: { verb: 'Insert', words: [{ input: 'insert-value' }, 'at index', { input: 'insert-index' }] },
  pop: { verb: 'Remove', words: ['the value at index', { input: 'pop-index' }] },
  get: { verb: 'Read', words: ['index', { input: 'get-index' }] },
};

// What each algorithm asks of the array, and its complexity in plain words.
const ALGORITHMS = {
  two_sum_sorted: {
    needs: 'A sorted array of numbers, and a target.',
    cost: 'It looks at each value at most once.',
  },
  binary_search: {
    needs: 'A sorted array of numbers, and a target.',
    cost: 'Each step halves what is left, so 1,000 values take about 10 steps.',
  },
  max_subarray: {
    needs: 'At least one number. There is nothing to fill in.',
    cost: 'It walks the array once.',
  },
  prefix_sums: {
    needs: 'Numbers only. There is nothing to fill in.',
    cost: 'It walks the array once.',
  },
};

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

function Blank({ item, input }) {
  const isIndex = input.label === 'Index';
  return (
    <input
      className="p3-blank"
      aria-label={`${item.label} ${input.label.toLowerCase()}`}
      aria-describedby={`p3-about-${item.id}`}
      data-needed={input.kind !== 'optional-number' && input.value.trim() === ''}
      value={input.value}
      placeholder={input.placeholder}
      onChange={(e) => input.setValue(e.target.value)}
      inputMode={isIndex ? 'numeric' : undefined}
      enterKeyHint="go"
      autoComplete="off"
      spellCheck={false}
    />
  );
}

// A blocked reason or a missing-input message, written next to the thing it is about.
function Flags({ item }) {
  return (
    <>
      {item.blockedReason && (
        <span className="p3-flag">
          <span className="p3-flag-lead">Can't do this yet: </span>
          <span>{item.blockedReason}</span>
        </span>
      )}
      <span className="p3-message" aria-live="polite">
        {item.message}
      </span>
    </>
  );
}

function Sentence({ item, onSubmit, echo }) {
  const { verb, words } = SENTENCES[item.id];
  return (
    <li className="p3-row">
      <form className="p3-sentence" aria-label={item.label} onSubmit={(e) => onSubmit(e, item)}>
        <button type="submit" className="control-btn p3-verb" disabled={!!item.blockedReason} aria-describedby={`p3-about-${item.id}`}>
          {verb}
        </button>
        {words.map((word) =>
          typeof word === 'string' ? (
            <span key={word}>{word}</span>
          ) : (
            <Blank key={word.input} item={item} input={item.inputs.find((i) => i.id === word.input)} />
          )
        )}
        <Flags item={item} />
      </form>
      <p className="p3-about" id={`p3-about-${item.id}`}>
        {item.summary} Takes {item.complexity}.
      </p>
      {echo && <p className="p3-echo" aria-hidden="true">{echo}</p>}
    </li>
  );
}

function AlgorithmCard({ item, onSubmit }) {
  const { needs, cost } = ALGORITHMS[item.id];
  return (
    <li className="p3-card">
      <form aria-label={item.label} onSubmit={(e) => onSubmit(e, item)}>
        <h4>{item.label}</h4>
        <dl>
          <div>
            <dt>What it does</dt>
            <dd id={`p3-about-${item.id}`}>{item.summary}</dd>
          </div>
          <div>
            <dt>What it needs</dt>
            <dd>{needs}</dd>
          </div>
          <div>
            <dt>How long it takes</dt>
            <dd>
              <strong>{item.complexity}.</strong> {cost}
            </dd>
          </div>
        </dl>
        <div className="p3-card-go">
          {item.inputs.map((input) => (
            <label key={input.id} className="p3-card-field">
              {input.label}
              <Blank item={item} input={input} />
            </label>
          ))}
          <button type="submit" className="control-btn p3-run" disabled={!!item.blockedReason} aria-describedby={`p3-about-${item.id}`}>
            Run {item.label.toLowerCase()}
          </button>
        </div>
        <div className="p3-card-flags">
          <Flags item={item} />
        </div>
      </form>
    </li>
  );
}

function ShareArea({ session, onCommandRun }) {
  const shown = session.shownCommand;
  const cantLink = session.tooLong || !shown;
  return (
    <section className="p3-section" aria-labelledby="p3-share">
      <h3 id="p3-share">Share</h3>
      <p className="p3-lead">A link rebuilds this array for whoever opens it. Nothing is saved on a server.</p>
      <ul className="p3-rows p3-share-rows">
        <li className="p3-sentence">
          <button type="button" className="control-btn" disabled={cantLink} onClick={session.copyLink}>
            Copy link
          </button>
          <span>to send someone this array.</span>
        </li>
        <li className="p3-sentence">
          <button type="button" className="control-btn" disabled={cantLink} onClick={session.copyEmbed}>
            Copy embed code
          </button>
          <span>to put the animation on your own page.</span>
        </li>
        <li className="p3-sentence">
          <button type="button" className="control-btn" disabled={!session.shownCommandValid} onClick={session.copyQuestion}>
            Copy question for Claude
          </button>
          <span>to ask what each step does.</span>
        </li>
      </ul>
      {session.tooLong && <p className="p3-flag">This command is too long to share as a link</p>}
      <p className="p3-message" aria-live="polite">
        {session.copyNote}
      </p>
      <form
        className="p3-command"
        onSubmit={(e) => {
          onCommandRun();
          session.submit(e);
        }}
      >
        <label>
          Command
          <input value={session.text} onChange={(e) => session.setText(e.target.value)} spellCheck={false} autoComplete="off" />
        </label>
        <button type="submit" className="control-btn" disabled={session.loading}>
          Run
        </button>
      </form>
    </section>
  );
}

// Layout 3, The Sentences. The controls read as English and each verb is its own button;
// algorithms are separate, larger explained cards. The timeline and note sit above the array,
// and the array alone stays in view when there is room.
export default function Preset3({ session, controls, intro: Intro, Board, title }) {
  const player = useRef(null);
  // Which sentence sent the latest edit, so its answer can be repeated beside it on small screens.
  const sentFrom = useRef(null);
  const [echoFor, setEchoFor] = useState(null);
  const firstCommand = useRef(true);

  const reveal = () => {
    const el = player.current;
    if (!el) return;
    const { top } = el.getBoundingClientRect();
    if (top >= 0 && top < window.innerHeight / 2) return;
    el.scrollIntoView?.({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  // When a new command lands: a sentence answers beside itself, anything else shows the array.
  useEffect(() => {
    if (firstCommand.current) {
      firstCommand.current = false;
      return;
    }
    setEchoFor(sentFrom.current);
    if (!sentFrom.current) reveal();
    sentFrom.current = null;
  }, [session.command]);

  const send = (e, item, from) => {
    e.preventDefault();
    if (controls.disabled || item.blockedReason) return;
    const form = e.currentTarget;
    // Only a call that was really sent can have an answer to echo.
    sentFrom.current = item.run() ? from : null;
    const missing = form.querySelector('input[data-needed="true"]');
    if (missing) missing.focus();
    else if (form.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') document.activeElement.select();
  };

  const echoText = (id) => (echoFor === id ? session.note : '');
  const inviting = !session.hasFrames ? 'Nothing has happened yet. Append a value below to begin.' : '';

  return (
    <div className="preset-3">
      {title && <h2>{title}</h2>}
      {Intro && (
        <div className="p3-intro">
          <Intro showComplexity={false} />
        </div>
      )}

      {session.structure && Board && (
        <>
          <div className="p3-player" ref={player}>
            <PlayerBar session={session} />
            <div className="explorer-note" role="status">
              <span key={session.step} className="p3-note-text">
                {session.note || inviting}
              </span>
            </div>
          </div>
          <div className="p3-stage">
            <div className="explorer-board">
              <Board frame={session.frame} state={session.state} />
            </div>
          </div>

          <section className="p3-section" aria-labelledby="p3-change">
            <h3 id="p3-change">Change or read the array</h3>
            <p className="p3-lead">Press the first word of a sentence, or press Enter in a blank.</p>
            <ul className="p3-rows">
              {controls.operations.map((item) => (
                <Sentence key={item.id} item={item} echo={echoText(item.id)} onSubmit={(e, it) => send(e, it, it.id)} />
              ))}
              <li className="p3-row p3-row-undo">
                <div className="p3-sentence">
                  <button
                    type="button"
                    className="control-btn"
                    disabled={!controls.canUndo}
                    onClick={() => {
                      sentFrom.current = 'undo';
                      controls.undo();
                    }}
                  >
                    Undo
                  </button>
                  <span>the last thing you did, or</span>
                  <button
                    type="button"
                    className="control-btn"
                    onClick={() => {
                      sentFrom.current = 'undo';
                      controls.startOver();
                    }}
                  >
                    Start over
                  </button>
                  <span>with an empty array.</span>
                </div>
                {echoText('undo') && <p className="p3-echo" aria-hidden="true">{echoText('undo')}</p>}
              </li>
            </ul>
          </section>

          <section className="p3-section" aria-labelledby="p3-algorithms">
            <h3 id="p3-algorithms">Algorithms</h3>
            <p className="p3-lead">These work through the array one step at a time while you watch. They don't change its values.</p>
            <ul className="p3-cards">
              {controls.algorithms.map((item) => (
                <AlgorithmCard key={item.id} item={item} onSubmit={(e, it) => send(e, it, null)} />
              ))}
            </ul>
          </section>
        </>
      )}

      <ShareArea session={session} onCommandRun={() => { sentFrom.current = null; }} />
    </div>
  );
}
