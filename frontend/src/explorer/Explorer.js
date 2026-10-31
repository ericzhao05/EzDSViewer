import React, { useCallback, useEffect, useRef, useState } from 'react';
import useExplorer from './useExplorer';
import { BOARDS } from './boards';
import { encodeCommand, linkFor, MAX_LINK_CHARS, questionFor } from './commandLang';
import './Explorer.css';

const SPEEDS = [
  { label: 'Slow', ms: 1600 },
  { label: 'Normal', ms: 900 },
  { label: 'Fast', ms: 400 },
];

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// Steps through a command's animation frames and lets people edit the command.
export default function Explorer({
  initialCommand,
  embed = false,
  autoplay = true,
  startAtEnd = false,
  active = true,
  onEdit: onEditNotify,
}) {
  // Keep the address bar in step with edits so a refresh keeps them.
  const onEdit = useCallback(
    (cmd) => {
      if (embed) return;
      try {
        const url = linkFor(window.location.origin, cmd);
        if (url.length > MAX_LINK_CHARS) return;
        window.history.replaceState(window.history.state, '', `${window.location.pathname}?c=${encodeCommand(cmd)}${window.location.hash}`);
      } catch (err) {
        // The address bar is a nicety; never break editing over it.
      }
    },
    [embed]
  );
  const notifyRef = useRef(onEditNotify);
  notifyRef.current = onEditNotify;
  const handleEdit = useCallback(
    (cmd) => {
      onEdit(cmd);
      if (notifyRef.current) notifyRef.current(cmd);
    },
    [onEdit]
  );
  const x = useExplorer(initialCommand, handleEdit, { startAtEnd });
  const { command, structure, calls, frames, step, frame, state, error, loading } = x;
  const [text, setText] = useState(initialCommand || '');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [copyNote, setCopyNote] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const settled = useRef(false);

  const last = frames.length - 1;
  const board = structure && BOARDS[structure];

  useEffect(() => setText(command), [command]);

  // Autoplay runs once, after the first load settles without an error.
  useEffect(() => {
    if (settled.current || loading || !(structure || error)) return;
    settled.current = true;
    if (error) setShareOpen(true);
    if (autoplay && structure && !error && frames.length > 0 && !reducedMotion()) setPlaying(true);
  }, [loading, structure, error, frames.length, autoplay]);

  // A hidden explorer neither plays nor answers the keyboard.
  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);

  useEffect(() => {
    if (!playing) return undefined;
    if (step >= last) {
      setPlaying(false);
      return undefined;
    }
    const id = setTimeout(x.next, speed);
    return () => clearTimeout(id);
  }, [playing, step, last, speed, x.next]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wraps a control's action so that using it stops playback.
  const stopping = useCallback(
    (fn) => (...args) => {
      setPlaying(false);
      return fn(...args);
    },
    []
  );

  // After an edit: one new frame is simply shown; an algorithm's frames play from the first.
  const edited = useCallback(
    async (callText) => {
      setPlaying(false);
      const made = await x.applyCall(callText);
      if (made !== null && made > 1 && !reducedMotion()) setPlaying(true);
    },
    [x.applyCall] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (step >= last) x.goTo(0);
    return setPlaying(true);
  };

  const { goTo, next, prev } = x;
  useEffect(() => {
    const onKey = (e) => {
      if (!active || e.altKey || e.ctrlKey || e.metaKey || frames.length === 0) return;
      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;
      const actions = {
        ArrowLeft: () => { setPlaying(false); prev(); },
        ArrowRight: () => { setPlaying(false); next(); },
        Home: () => { setPlaying(false); goTo(0); },
        End: () => { setPlaying(false); goTo(last); },
        ' ': () => togglePlay(),
      };
      if (!actions[e.key]) return;
      e.preventDefault();
      actions[e.key]();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const origin = window.location.origin;
  const shown = x.shownCommand;
  const viewLink = linkFor(origin, shown);
  const embedLink = linkFor(origin, shown, 'embed');
  const tooLong = viewLink.length > MAX_LINK_CHARS;

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNote('Copied');
    } catch (err) {
      setCopyNote('Could not copy to the clipboard');
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setPlaying(false);
    x.load(text);
  };

  const Board = board && board.Board;
  const Controls = board && board.Controls;
  const Intro = board && board.intro;

  return (
    <div className="explorer">
      {!embed && board && board.title && <h2>{board.title}</h2>}
      {!embed && Intro && <Intro />}

      {error && (
        <div className="error-message" role="alert">
          {error.message}
          {error.available && error.available.length > 0 && (
            <div>Available: {error.available.join(', ')}</div>
          )}
        </div>
      )}

      {board && (
        <>
          <div className="explorer-board">
            <Board frame={frame} state={state} />
          </div>

          <div className="explorer-note" role="status">
            {frame ? frame.note : ''}
          </div>

          <div className="explorer-steps">
            <div className="explorer-buttons">
              <button className="control-btn" disabled={frames.length === 0} onClick={stopping(x.prev)}>
                Previous step
              </button>
              <button className="control-btn" disabled={frames.length === 0} onClick={togglePlay}>
                {playing ? 'Pause' : 'Play'}
              </button>
              <button className="control-btn" disabled={frames.length === 0} onClick={stopping(x.next)}>
                Next step
              </button>
              <button className="control-btn" disabled={frames.length === 0} onClick={stopping(() => x.goTo(0))}>
                Restart
              </button>
            </div>
            <input
              type="range"
              aria-label="Step"
              className="explorer-slider"
              min={0}
              max={Math.max(0, last)}
              value={step}
              disabled={frames.length === 0}
              onChange={(e) => stopping(x.goTo)(Number(e.target.value))}
            />
            <span className="explorer-count">
              {frames.length === 0 ? 'No steps yet' : `Step ${step + 1} of ${frames.length}`}
            </span>
            <div className="explorer-buttons" role="group" aria-label="Speed">
              {SPEEDS.map((s) => (
                <button
                  key={s.label}
                  className={`control-btn${speed === s.ms ? ' explorer-speed-on' : ''}`}
                  aria-pressed={speed === s.ms}
                  onClick={stopping(() => setSpeed(s.ms))}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {!embed && (
            <Controls
              onCall={edited}
              onUndo={stopping(x.undo)}
              onStartOver={stopping(x.startOver)}
              canUndo={calls.length > 0}
              disabled={loading}
            />
          )}
        </>
      )}

      {embed ? (
        <a className="explorer-open" href={viewLink} target="_blank" rel="noopener noreferrer">
          Open in EzDSViewer
        </a>
      ) : (
        <details
          className="explorer-copy"
          open={shareOpen}
          onToggle={(e) => setShareOpen(e.currentTarget.open)}
        >
          <summary>Share</summary>
          <form className="explorer-command" onSubmit={submit}>
            <label>
              Command
              <input value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
            </label>
            <button type="submit" className="control-btn" disabled={loading}>
              Run
            </button>
          </form>
          <div className="explorer-buttons">
            <button className="control-btn" disabled={tooLong || !shown} onClick={() => copy(viewLink)}>
              Copy link
            </button>
            <button className="control-btn" disabled={tooLong || !shown} onClick={() => copy(
              `<iframe src="${embedLink}" title="EzDSViewer animation" width="100%" height="480"></iframe>`
            )}>
              Copy embed code
            </button>
            <button
              className="control-btn"
              disabled={!x.shownCommandValid}
              onClick={() => copy(questionFor(shown))}
            >
              Copy question for Claude
            </button>
          </div>
          {tooLong && <p className="array-legend">This command is too long to share as a link</p>}
          {copyNote && <p className="array-legend" aria-live="polite">{copyNote}</p>}
        </details>
      )}
    </div>
  );
}
