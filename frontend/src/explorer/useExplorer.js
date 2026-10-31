import { useCallback, useEffect, useRef, useState } from 'react';
import { runCommand } from '../api/client';
import { BOARDS } from './boards';

const EMPTY = { structure: null, calls: [], frames: [], state: null, result: null };

function toError(data) {
  return {
    message: data.error,
    code: data.code,
    position: data.position,
    available: data.available,
  };
}

function join(structure, calls) {
  return [structure, ...calls].join('.');
}

// Holds the explorer's command, animation frames and current step.
// Only the most recent request may update state, so late replies are ignored.
export default function useExplorer(initialCommand, onEdit, { startAtEnd = false } = {}) {
  const [command, setCommand] = useState(initialCommand || '');
  const [response, setResponse] = useState(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);
  const editHook = useRef(onEdit);
  editHook.current = onEdit;

  // Sends one request. Resolves to the response body, or null if it was superseded or failed.
  const request = useCallback(async (text) => {
    const id = ++latest.current;
    setLoading(true);
    try {
      const data = await runCommand(text);
      if (id !== latest.current) return null;
      // Anything without a frames array (a 404, 500 or proxy error body) is not an explorer response.
      if (!data || !Array.isArray(data.frames)) {
        setError({ message: (data && data.error) || 'Unexpected response' });
        return null;
      }
      return data;
    } catch (err) {
      if (id === latest.current) setError({ message: err.message });
      return null;
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, []);

  const lastFrame = (data) => Math.max(0, data.frames.length - 1);

  const load = useCallback(
    async (text, { atEnd = false } = {}) => {
      setCommand(text);
      const data = await request(text);
      if (!data) return;
      setResponse(data);
      if (data.success) {
        setCommand(data.command);
        setStep(atEnd ? lastFrame(data) : 0);
        setError(null);
      } else {
        setStep(lastFrame(data));
        setError(toError(data));
      }
    },
    [request]
  );

  // Resolves to how many frames the new call made, or null if it was superseded or failed.
  // If keepStep() is true once the reply arrives, the person has navigated meanwhile and the step stays put.
  const applyCall = useCallback(
    async (callText, keepStep) => {
      if (!response.structure) return null;
      const data = await request(join(response.structure, [...response.calls, callText]));
      if (!data) return null;
      if (!data.success) {
        setError(toError(data));
        return null;
      }
      const newest = data.calls.length - 1;
      const first = data.frames.findIndex((f) => f.call === newest);
      setResponse(data);
      setCommand(data.command);
      if (!(keepStep && keepStep())) setStep(first >= 0 ? first : lastFrame(data));
      setError(null);
      if (editHook.current) editHook.current(data.command);
      return data.frames.filter((f) => f.call === newest).length;
    },
    [request, response]
  );

  const undo = useCallback(async () => {
    if (!response.structure || response.calls.length === 0) return;
    const data = await request(join(response.structure, response.calls.slice(0, -1)));
    if (!data) return;
    if (!data.success) {
      setError(toError(data));
      return;
    }
    setResponse(data);
    setCommand(data.command);
    setStep(lastFrame(data));
    setError(null);
    if (editHook.current) editHook.current(data.command);
  }, [request, response]);

  // Swaps everything for a new command, keeping what's on screen if it fails, and shows its last step.
  const replaceWith = useCallback(
    async (text) => {
      const data = await request(text);
      if (!data) return;
      if (!data.success) {
        setError(toError(data));
        return;
      }
      setResponse(data);
      setCommand(data.command);
      setStep(lastFrame(data));
      setError(null);
      if (editHook.current) editHook.current(data.command);
    },
    [request]
  );

  // Loads just the structure name, which clears the history.
  // After a bad first load there is no structure, so use the command's own if it has a board, else array.
  const startOver = useCallback(async () => {
    const named = command.split('.')[0].trim();
    const structure = response.structure || (BOARDS[named] ? named : 'array');
    await replaceWith(structure);
  }, [replaceWith, response, command]);

  const goTo = useCallback(
    (i) => setStep(Math.min(Math.max(i, 0), Math.max(0, response.frames.length - 1))),
    [response.frames.length]
  );
  const next = useCallback(() => goTo(step + 1), [goTo, step]);
  const prev = useCallback(() => goTo(step - 1), [goTo, step]);

  useEffect(() => {
    if (initialCommand) load(initialCommand, { atEnd: startAtEnd });
    // Only the first command is loaded automatically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const frame = response.frames[step] || null;
  return {
    command,
    // The command behind the board on screen; differs from `command` after a failed load.
    shownCommand: response.command || '',
    shownCommandValid: response.success === true,
    structure: response.structure,
    calls: response.calls,
    frames: response.frames,
    step,
    frame,
    state: frame ? frame.state : response.state,
    result: response.result,
    error,
    loading,
    load,
    applyCall,
    undo,
    startOver,
    replaceWith,
    goTo,
    next,
    prev,
  };
}
