import { useCallback, useEffect, useRef, useState } from 'react';
import { runCommand } from '../api/client';

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
export default function useExplorer(initialCommand, onEdit) {
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
    async (text) => {
      setCommand(text);
      const data = await request(text);
      if (!data) return;
      setResponse(data);
      if (data.success) {
        setCommand(data.command);
        setStep(0);
        setError(null);
      } else {
        setStep(lastFrame(data));
        setError(toError(data));
      }
    },
    [request]
  );

  const applyCall = useCallback(
    async (callText) => {
      if (!response.structure) return;
      const data = await request(join(response.structure, [...response.calls, callText]));
      if (!data) return;
      if (!data.success) {
        setError(toError(data));
        return;
      }
      const first = data.frames.findIndex((f) => f.call === data.calls.length - 1);
      setResponse(data);
      setCommand(data.command);
      setStep(first >= 0 ? first : lastFrame(data));
      setError(null);
      if (editHook.current) editHook.current(data.command);
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

  const goTo = useCallback(
    (i) => setStep(Math.min(Math.max(i, 0), Math.max(0, response.frames.length - 1))),
    [response.frames.length]
  );
  const next = useCallback(() => goTo(step + 1), [goTo, step]);
  const prev = useCallback(() => goTo(step - 1), [goTo, step]);

  useEffect(() => {
    if (initialCommand) load(initialCommand);
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
    goTo,
    next,
    prev,
  };
}
