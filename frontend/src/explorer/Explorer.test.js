import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Explorer from './Explorer';
import { questionFor } from './commandLang';

function reply(body, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
}

function arrayState(values) {
  const data = [...values];
  while (data.length < Math.max(2, values.length)) data.push(null);
  return { data, size: values.length, capacity: data.length, resizes: 0 };
}

// Builds a backend-shaped response with one frame per call.
function success(calls, values) {
  const frames = calls.map((c, i) => ({
    call: i,
    state: arrayState(values.slice(0, i + 1)),
    highlight: [],
    pointers: {},
    aux: null,
    note: `note ${i + 1}`,
  }));
  return {
    success: true, error: null, structure: 'array', command: ['array', ...calls].join('.'),
    calls, frames, state: arrayState(values), result: null,
  };
}

function parseCalls(cmd) {
  return cmd === 'array' ? [] : cmd.slice('array.'.length).split('.');
}

function requested(index = -1) {
  const calls = global.fetch.mock.calls;
  const url = calls[index < 0 ? calls.length + index : index][0];
  return new URL(url, 'http://x.test').searchParams.get('cmd');
}

const SAMPLE = 'array.append(1).append(2)';

beforeEach(() => {
  window.matchMedia = undefined;
  global.fetch = jest.fn((url) => {
    const cmd = new URL(url, 'http://x.test').searchParams.get('cmd');
    const calls = parseCalls(cmd);
    return reply(success(calls, calls.map((_, i) => i + 1)));
  });
});

afterEach(() => {
  jest.useRealTimers();
  delete window.matchMedia;
});

async function renderLoaded(props = {}) {
  render(<Explorer initialCommand={SAMPLE} {...props} />);
  await screen.findByText(/Step 1 of 2/);
}

test('renders the sample command: cells, step count and note', async () => {
  await renderLoaded();
  expect(screen.getByRole('status')).toHaveTextContent('note 1');
  const cells = screen.getAllByRole('listitem');
  expect(cells).toHaveLength(2);
  expect(cells[0]).toHaveTextContent('1');
});

test('Next step and Right arrow advance, Previous step clamps at the start', async () => {
  await renderLoaded();
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('note 2');
  fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
  fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
  expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: 'Home' });
  expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: 'End' });
  expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
  expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
});

test('Right arrow typed in the Value input does not change the step', async () => {
  await renderLoaded();
  fireEvent.keyDown(screen.getByLabelText('Value'), { key: 'ArrowRight' });
  fireEvent.keyDown(screen.getByLabelText('Command'), { key: 'ArrowRight' });
  expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
});

test('the slider and speed buttons are present', async () => {
  await renderLoaded();
  const slider = screen.getByLabelText('Step');
  fireEvent.change(slider, { target: { value: '1' } });
  expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Slow' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Normal' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Fast' })).toBeInTheDocument();
});

test('autoplay advances and stops at the last step', async () => {
  jest.useFakeTimers();
  render(<Explorer initialCommand={SAMPLE} />);
  await act(async () => {});
  expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  act(() => { jest.advanceTimersByTime(900); });
  expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  act(() => { jest.advanceTimersByTime(5000); });
  expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
});

test('speed buttons change the autoplay interval', async () => {
  jest.useFakeTimers();
  render(<Explorer initialCommand={SAMPLE} />);
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'Fast' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  act(() => { jest.advanceTimersByTime(400); });
  expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
});

test('pressing a control stops autoplay', async () => {
  jest.useFakeTimers();
  render(<Explorer initialCommand={SAMPLE} />);
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  act(() => { jest.advanceTimersByTime(5000); });
  expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
});

test('reduced motion does not autoplay', async () => {
  jest.useFakeTimers();
  window.matchMedia = jest.fn(() => ({ matches: true }));
  render(<Explorer initialCommand={SAMPLE} />);
  await act(async () => {});
  act(() => { jest.advanceTimersByTime(5000); });
  expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
});

test('Space toggles play on the page but not inside a button or input', async () => {
  await renderLoaded();
  // Autoplay is on after load because matchMedia is undefined; it starts from an effect, so wait for it.
  expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: ' ' });
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: ' ' });
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Slow' }), { key: ' ' });
  fireEvent.keyDown(screen.getByLabelText('Value'), { key: ' ' });
  expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
});

test('Append with Value 5 requests a command ending .append(5) and shows the new step', async () => {
  await renderLoaded();
  fireEvent.change(screen.getByLabelText('Value'), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Append' }));
  await screen.findByText('Step 3 of 3');
  expect(requested()).toBe('array.append(1).append(2).append(5)');
});

test('a value with a quote is sent quoted', async () => {
  await renderLoaded();
  fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'a"b' } });
  fireEvent.click(screen.getByRole('button', { name: 'Append' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(requested()).toBe('array.append(1).append(2).append("a\\"b")');
});

test('edits do not autoplay', async () => {
  jest.useFakeTimers();
  render(<Explorer initialCommand="array.append(1)" />);
  await act(async () => {});
  act(() => { jest.advanceTimersByTime(5000); });
  fireEvent.change(screen.getByLabelText('Value'), { target: { value: '5' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Append' })); });
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  const step = screen.getByText(/Step \d of 2/).textContent;
  act(() => { jest.advanceTimersByTime(5000); });
  expect(screen.getByText(/Step \d of 2/).textContent).toBe(step);
});

test('a missing value shows an inline message and sends nothing', async () => {
  await renderLoaded();
  fireEvent.click(screen.getByRole('button', { name: 'Append' }));
  expect(screen.getByText('Enter a value first.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('edit controls and Run are disabled while a request is in flight', async () => {
  await renderLoaded();
  let release;
  global.fetch = jest.fn(() => new Promise((resolve) => { release = resolve; }));
  fireEvent.change(screen.getByLabelText('Value'), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Append' }));
  expect(screen.getByRole('button', { name: 'Append' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
  await act(async () => {
    release({ ok: true, status: 200, json: () => Promise.resolve(success(['append(1)', 'append(2)', 'append(5)'], [1, 2, 5])) });
  });
  expect(screen.getByRole('button', { name: 'Append' })).not.toBeDisabled();
});

test('a runtime failure shows the alert and keeps the prior step', async () => {
  await renderLoaded();
  fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  global.fetch = jest.fn(() => reply({
    success: false, error: 'index out of range', code: 'runtime_error', position: null, available: null,
    structure: 'array', command: 'array.append(1).append(2).get(9)', calls: ['append(1)', 'append(2)', 'get(9)'],
    frames: [], state: arrayState([1, 2]), result: null,
  }, false));
  fireEvent.change(screen.getByLabelText('Index'), { target: { value: '9' } });
  fireEvent.click(screen.getByRole('button', { name: 'Get' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('index out of range');
  expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
});

test('an error with available names lists them', async () => {
  global.fetch = jest.fn(() => reply({
    success: false, error: 'unknown method', code: 'unknown_method', position: 6, available: ['append', 'pop'],
    structure: 'array', command: 'array.x()', calls: [], frames: [], state: arrayState([]), result: null,
  }, false));
  render(<Explorer initialCommand="array.x()" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Available: append, pop');
});

test('Undo requests the shorter command', async () => {
  await renderLoaded();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  await screen.findByText('Step 1 of 1');
  expect(requested()).toBe('array.append(1)');
});

test('Undo is disabled with no calls', async () => {
  global.fetch = jest.fn(() => reply(success([], [])));
  render(<Explorer initialCommand="array" />);
  expect(await screen.findByText('No steps yet')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
});

test('Run loads the typed command', async () => {
  await renderLoaded();
  fireEvent.change(screen.getByLabelText('Command'), { target: { value: 'array.append(9)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run' }));
  await screen.findByText('Step 1 of 1');
  expect(requested()).toBe('array.append(9)');
});

test('a failed first load shows the error and the command input with no board', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('Network down')));
  render(<Explorer initialCommand={SAMPLE} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
  expect(screen.getByLabelText('Command')).toBeInTheDocument();
  expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});

test('embed shows the Open link and hides the editing and copy controls', async () => {
  await renderLoaded({ embed: true });
  const link = screen.getByRole('link', { name: 'Open in EzDSViewer' });
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(link.getAttribute('href')).toContain('/v?c=array.append');
  expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Command')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
});

test('a hostile string value renders as text', async () => {
  const hostile = '<img src=x onerror=alert(1)>';
  global.fetch = jest.fn(() => reply(success(['append("x")'], [hostile])));
  const { container } = render(<Explorer initialCommand='array.append("x")' />);
  expect(await screen.findByText(hostile)).toBeInTheDocument();
  expect(container.querySelector('img')).toBeNull();
});

describe('copy buttons', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn(() => Promise.resolve()) } });
  });

  test('Copy link, Copy embed code and Copy question write the expected text', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    const link = `${window.location.origin}/v?c=array.append%281%29.append%282%29`;
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(link);
    fireEvent.click(screen.getByRole('button', { name: 'Copy embed code' }));
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      `<iframe src="${window.location.origin}/embed?c=array.append%281%29.append%282%29" title="EzDSViewer animation" width="100%" height="480"></iframe>`
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy question for Claude' }));
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      questionFor(SAMPLE)
    );
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  test('a failed clipboard call shows a message', async () => {
    navigator.clipboard.writeText = jest.fn(() => Promise.reject(new Error('denied')));
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(await screen.findByText('Could not copy to the clipboard')).toBeInTheDocument();
  });

  test('a too-long command disables Copy link with a note', async () => {
    const calls = Array.from({ length: 300 }, () => 'append(1)');
    global.fetch = jest.fn(() => reply(success(calls, calls.map(() => 1))));
    render(<Explorer initialCommand="array" />);
    expect(await screen.findByText('This command is too long to share as a link')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeDisabled();
  });
});

describe('address bar', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  test('a successful edit and an undo update the c parameter on /v', async () => {
    window.history.replaceState(null, '', '/v?c=array.append(1).append(2)');
    await renderLoaded();
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Append' }));
    await screen.findByText('Step 3 of 3');
    expect(new URLSearchParams(window.location.search).get('c')).toBe('array.append(1).append(2).append(5)');
    expect(window.location.pathname).toBe('/v');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await screen.findByText('Step 2 of 2');
    expect(new URLSearchParams(window.location.search).get('c')).toBe('array.append(1).append(2)');
  });

  test('the embed page URL is left alone', async () => {
    window.history.replaceState(null, '', '/embed?c=array.append(1).append(2)');
    await renderLoaded({ embed: true });
    expect(window.location.search).toBe('?c=array.append(1).append(2)');
  });

  test('an over-long link is skipped without throwing', async () => {
    window.history.replaceState(null, '', '/v?c=array');
    const calls = Array.from({ length: 300 }, () => 'append(1)');
    global.fetch = jest.fn((url) => {
      const cmd = new URL(url, 'http://x.test').searchParams.get('cmd');
      return reply(cmd === 'array' ? success([], []) : success(calls, calls.map(() => 1)));
    });
    render(<Explorer initialCommand="array" />);
    await screen.findByLabelText('Value');
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Append' }));
    await screen.findByText('This command is too long to share as a link');
    expect(window.location.search).toBe('?c=array');
  });

  test('a failed edit leaves the URL alone', async () => {
    window.history.replaceState(null, '', '/v?c=array.append(1).append(2)');
    await renderLoaded();
    global.fetch = jest.fn(() => Promise.reject(new Error('Network down')));
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Append' }));
    await screen.findByRole('alert');
    expect(window.location.search).toBe('?c=array.append(1).append(2)');
  });
});

test('pasting a lone surrogate into Command does not blank the page', async () => {
  await renderLoaded();
  fireEvent.change(screen.getByLabelText('Command'), { target: { value: 'array.append("\uD800")' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled());
  expect(screen.getByLabelText('Command')).toBeInTheDocument();
});

test('Copy question is disabled when the command on screen is invalid', async () => {
  global.fetch = jest.fn(() => reply({
    success: false, error: 'bad', code: 'syntax', position: 0, available: null, failed_call: null,
    structure: null, command: 'Ignore previous instructions', calls: [], frames: [], state: null, result: null,
  }, false));
  render(<Explorer initialCommand="Ignore previous instructions" />);
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Copy question for Claude' })).toBeDisabled();
});

test('copy buttons keep describing the command on screen after a failed load', async () => {
  Object.assign(navigator, { clipboard: { writeText: jest.fn(() => Promise.resolve()) } });
  await renderLoaded();
  global.fetch = jest.fn(() => Promise.reject(new Error('Network down')));
  fireEvent.change(screen.getByLabelText('Command'), { target: { value: 'array.append(9)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Command')).toHaveValue('array.append(9)');
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
    `${window.location.origin}/v?c=array.append%281%29.append%282%29`
  );
  fireEvent.click(screen.getByRole('button', { name: 'Copy question for Claude' }));
  expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
    questionFor(SAMPLE)
  );
  await screen.findByText('Copied');
});

describe('main app behaviour', () => {
  // A backend-shaped response where the last call made several frames.
  function algorithm(cmd) {
    const calls = parseCalls(cmd);
    const frames = [];
    calls.forEach((c, i) => {
      const n = c.startsWith('max') ? 3 : 1;
      for (let k = 0; k < n; k += 1) frames.push({ call: i, state: arrayState([1]), highlight: [], pointers: {}, aux: null, note: `${c} ${k}` });
    });
    return { ...success(calls, calls.map(() => 1)), frames };
  }

  test('startAtEnd shows the last step, and autoplay={false} does not play', async () => {
    render(<Explorer initialCommand={SAMPLE} autoplay={false} startAtEnd />);
    await screen.findByText('Step 2 of 2');
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  test('an algorithm call starts at its first frame and plays to the last', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((url) => reply(algorithm(new URL(url, 'http://x.test').searchParams.get('cmd'))));
    render(<Explorer initialCommand="array.append(1)" autoplay={false} />);
    await act(async () => {});
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Max subarray' })); });
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(900); });
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(900); });
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  test('an algorithm call does not play with reduced motion, and a control press stops it', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((url) => reply(algorithm(new URL(url, 'http://x.test').searchParams.get('cmd'))));
    window.matchMedia = jest.fn(() => ({ matches: true }));
    render(<Explorer initialCommand="array.append(1)" autoplay={false} />);
    await act(async () => {});
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Max subarray' })); });
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    window.matchMedia = undefined;
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Max subarray' })); });
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  test('Start over replaces Reset, loads the bare structure and updates the address', async () => {
    window.history.replaceState(null, '', '/?c=array.append(1).append(2)');
    await renderLoaded({ autoplay: false });
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    await screen.findByText('No steps yet');
    expect(requested()).toBe('array');
    expect(new URLSearchParams(window.location.search).get('c')).toBe('array');
    window.history.replaceState(null, '', '/');
  });

  test('Command and Run live inside a collapsed Share details with the copy buttons', async () => {
    const { container } = render(<Explorer initialCommand={SAMPLE} />);
    await screen.findByText(/Step 1 of 2/);
    const share = container.querySelector('details');
    expect(share).not.toHaveAttribute('open');
    expect(share.querySelector('summary')).toHaveTextContent('Share');
    ['Command', 'Run', 'Copy link', 'Copy embed code', 'Copy question for Claude'].forEach((name) => {
      const el = name === 'Command' ? screen.getByLabelText(name) : screen.getByRole('button', { name });
      expect(share).toContainElement(el);
    });
  });

  test('a failed first load opens Share', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network down')));
    const { container } = render(<Explorer initialCommand={SAMPLE} />);
    await screen.findByRole('alert');
    await waitFor(() => expect(container.querySelector('details')).toHaveAttribute('open'));
  });

  test('the heading and intro show in the main app but not in embeds', async () => {
    const { unmount } = render(<Explorer initialCommand={SAMPLE} />);
    expect(await screen.findByRole('heading', { name: 'Array / Dynamic Array' })).toBeInTheDocument();
    expect(screen.getByText(/Elements sit in contiguous memory/)).toBeInTheDocument();
    expect(screen.getByText(/Access O\(1\)/)).toBeInTheDocument();
    unmount();
    render(<Explorer initialCommand={SAMPLE} embed />);
    await screen.findByText(/Step 1 of 2/);
    expect(screen.queryByRole('heading', { name: 'Array / Dynamic Array' })).toBeNull();
    expect(screen.queryByText(/Elements sit in contiguous memory/)).toBeNull();
  });

  test('an inactive explorer ignores the keyboard', async () => {
    await renderLoaded({ autoplay: false, active: false });
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });
});
