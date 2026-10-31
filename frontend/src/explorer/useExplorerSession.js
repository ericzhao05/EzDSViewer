import { useCallback, useEffect, useRef, useState } from 'react';
import useExplorer from './useExplorer';
import { encodeCommand, linkFor, MAX_LINK_CHARS, questionFor } from './commandLang';
import { withPreset } from './array/presets/PresetSwitcher';

export const SPEEDS = [
  { label: 'Slow', ms: 1600 },
  { label: 'Normal', ms: 900 },
  { label: 'Fast', ms: 400 },
];

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// Everything non-visual about the explorer: loading, playback, keyboard, copy actions and the Command box.
// Returns one plain object, the "session", that any page layout can read and call.
export default function useExplorerSession({
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
        const search = withPreset(`?c=${encodeCommand(cmd)}`);
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`);
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
  // Bumped whenever the person presses a control or the explorer is hidden; a late reply checks it.
  const interrupt = useRef(0);

  const last = frames.length - 1;

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
    if (!active) {
      interrupt.current += 1;
      setPlaying(false);
    }
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
      interrupt.current += 1;
      setPlaying(false);
      return fn(...args);
    },
    []
  );

  // After an edit: one new frame is simply shown; an algorithm's frames play from the first.
  const runCall = useCallback(
    async (callText) => {
      setPlaying(false);
      const mark = ++interrupt.current;
      const moved = () => interrupt.current !== mark;
      const made = await x.applyCall(callText, moved);
      if (made !== null && made > 1 && !moved() && !reducedMotion()) setPlaying(true);
    },
    [x.applyCall] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const togglePlay = () => {
    interrupt.current += 1;
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
        ArrowLeft: () => { interrupt.current += 1; setPlaying(false); prev(); },
        ArrowRight: () => { interrupt.current += 1; setPlaying(false); next(); },
        Home: () => { interrupt.current += 1; setPlaying(false); goTo(0); },
        End: () => { interrupt.current += 1; setPlaying(false); goTo(last); },
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
    if (e && e.preventDefault) e.preventDefault();
    setPlaying(false);
    x.load(text);
  };

  const hasFrames = frames.length > 0;
  return {
    embed,
    // What is on screen.
    structure,
    command,
    shownCommand: shown,
    shownCommandValid: x.shownCommandValid,
    calls,
    frames,
    step,
    frame,
    state,
    result: x.result,
    error,
    loading,
    hasFrames,
    lastStep: Math.max(0, last),
    stepLabel: hasFrames ? `Step ${step + 1} of ${frames.length}` : 'No steps yet',
    note: frame ? frame.note : '',
    // Playback. Every one of these stops autoplay first.
    playing,
    togglePlay,
    canPrev: hasFrames && step > 0,
    canNext: hasFrames && step < last,
    prev: stopping(x.prev),
    next: stopping(x.next),
    restart: stopping(() => x.goTo(0)),
    goTo: stopping(x.goTo),
    speeds: SPEEDS,
    speed,
    setSpeed: stopping(setSpeed),
    // Editing.
    runCall,
    undo: stopping(x.undo),
    startOver: stopping(x.startOver),
    canUndo: calls.length > 0,
    // The Command box.
    text,
    setText,
    submit,
    // Sharing.
    viewLink,
    embedLink,
    tooLong,
    copyLink: () => copy(viewLink),
    copyEmbed: () => copy(
      `<iframe src="${embedLink}" title="EzDSViewer animation" width="100%" height="480"></iframe>`
    ),
    copyQuestion: () => copy(questionFor(shown)),
    copyNote,
    shareOpen,
    setShareOpen,
  };
}
