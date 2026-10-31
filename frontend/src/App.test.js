import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { STRUCTURES } from './structures/registry';

// These tests cover the plain layout's behaviour; the layouts have their own preset.test.js files.
jest.mock('./explorer/array/presets', () => {
  const DefaultLayout = require('./explorer/array/presets/DefaultLayout').default;
  return { PRESETS: ['1', '2', '3', '4', '5'].map((id) => ({ id, name: `Plain ${id}`, Component: DefaultLayout })) };
});


beforeEach(() => {
  // These tests are about the shell, not the Array's replies, so the starter's request stays pending
  // rather than answering after a test has finished and updating the page outside act().
  global.fetch = jest.fn(() => new Promise(() => {}));
});

test('lists every registered structure and switches views', async () => {
  render(<App />);
  const nav = screen.getByRole('complementary', { name: 'Data structures' });
  STRUCTURES.forEach((s) => {
    expect(nav).toHaveTextContent(s.label);
  });
  const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Unavailable items carry a "Soon" label inside the button.
  const buttons = STRUCTURES.map((s) => screen.getByRole('button', { name: new RegExp(`^${escape(s.label)}( Soon)?$`) }));
  for (const button of buttons) {
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-current', 'page');
  }
});

describe('theme menu', () => {
  beforeEach(() => localStorage.clear());

  const openMenu = () => userEvent.click(screen.getByRole('button', { name: 'Choose style' }));

  test('defaults to Chalkboard Blackout and stays closed until opened', () => {
    render(<App />);
    expect(document.documentElement.dataset.style).toBe('chalkboard');
    expect(document.documentElement.dataset.palette).toBe('blackout');
    expect(screen.queryByRole('radio')).toBeNull();
  });

  test('offers three themes, switches, and remembers the pick', async () => {
    const { unmount } = render(<App />);
    await openMenu();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /chalkboard/i })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /phosphor/i }));
    expect(document.documentElement.dataset.style).toBe('phosphor');
    unmount();
    render(<App />);
    expect(document.documentElement.dataset.style).toBe('phosphor');
  });

  test('Escape closes the menu and returns focus to the button', async () => {
    render(<App />);
    await openMenu();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByRole('button', { name: 'Choose style' })).toHaveFocus();
  });

  test('tabbing away closes the menu, in both directions', async () => {
    render(<App />);
    await openMenu();
    await userEvent.tab();
    await waitFor(() => expect(screen.queryByRole('radio')).toBeNull());

    await openMenu();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Choose style' })).toHaveFocus();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    screen.getByRole('button', { name: 'Choose style' }).blur();
    await userEvent.tab({ shift: true });
    await waitFor(() => expect(screen.queryByRole('radio')).toBeNull());
  });

  test('clicking outside closes the menu', async () => {
    render(<App />);
    await openMenu();
    await userEvent.click(screen.getByRole('heading', { name: 'EzDSViewer' }));
    expect(screen.queryByRole('radio')).toBeNull();
  });
});

describe('one app at / and /v', () => {
  const reply = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  const state = (values) => ({ data: [...values], size: values.length, capacity: Math.max(2, values.length), resizes: 0 });

  // A backend-shaped response with one frame per call.
  const success = (cmd) => {
    const calls = cmd === 'array' ? [] : cmd.slice('array.'.length).split('.');
    const frames = calls.map((c, i) => ({
      call: i, state: state(calls.slice(0, i + 1).map((_, k) => k + 1)), highlight: [], pointers: {}, aux: null, note: `note ${i + 1}`,
    }));
    return { success: true, error: null, structure: 'array', command: cmd, calls, frames, state: state([]), result: null };
  };

  const requestedCommands = () =>
    global.fetch.mock.calls.map(([url]) => new URL(url, 'http://x.test').searchParams.get('cmd'));

  beforeEach(() => {
    window.matchMedia = undefined;
    global.fetch = jest.fn((url) => reply(success(new URL(url, 'http://x.test').searchParams.get('cmd'))));
  });

  afterEach(() => {
    delete window.matchMedia;
    window.history.replaceState(null, '', '/');
  });

  test.each(['/', '/v'])('%s renders the sidebar app, with the explorer in the main area', async (path) => {
    window.history.replaceState(null, '', path);
    render(<App />);
    expect(screen.getByRole('complementary', { name: 'Data structures' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Array / Dynamic Array' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Append' })).toBeInTheDocument();
  });

  test('/embed renders no sidebar', async () => {
    window.history.replaceState(null, '', '/embed?c=array');
    render(<App />);
    await act(async () => {}); // let the player's request settle
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  test('a fresh visit loads the starter at its last step, without playing or touching the address', async () => {
    render(<App />);
    expect(await screen.findByText('Step 4 of 4')).toBeInTheDocument();
    expect(requestedCommands()).toEqual(['array.append(1).append(3).append(5).append(7)']);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  test('the first edit puts the command in the address', async () => {
    render(<App />);
    await screen.findByText('Step 4 of 4');
    await userEvent.type(screen.getByLabelText('Value'), '9');
    await userEvent.click(screen.getByRole('button', { name: 'Append' }));
    await screen.findByText('Step 5 of 5');
    expect(new URLSearchParams(window.location.search).get('c')).toBe('array.append(1).append(3).append(5).append(7).append(9)');
  });

  test('a shared link starts at step 1 and plays', async () => {
    window.history.replaceState(null, '', '/?c=array.append(1).append(2)');
    render(<App />);
    expect(await screen.findByText('Step 1 of 2')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  test('all 24 structures are listed; only Array lacks the Soon label', async () => {
    render(<App />);
    await act(async () => {});
    const nav = screen.getByRole('complementary', { name: 'Data structures' });
    expect(nav.querySelectorAll('button')).toHaveLength(24);
    expect(nav.querySelectorAll('.ds-sidebar-soon')).toHaveLength(23);
    expect(screen.getByRole('button', { name: 'Array' })).toBeInTheDocument();
  });

  test('a coming-soon item shows the panel with no server request, and Open Array returns', async () => {
    render(<App />);
    await screen.findByText('Step 4 of 4');
    const before = global.fetch.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: /^Stack/ }));
    expect(screen.getByRole('heading', { name: 'Stack' })).toBeInTheDocument();
    expect(screen.getByText('This structure is coming soon. Array is ready to try now.')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(before);
    expect(window.location.pathname + window.location.search).toBe('/?ds=stack');
    await userEvent.click(screen.getByRole('button', { name: 'Open Array' }));
    expect(screen.getByRole('button', { name: /^Array$/ })).toHaveAttribute('aria-current', 'page');
    expect(window.location.search).toBe('');
    expect(screen.getByText('Step 4 of 4')).toBeVisible();
    expect(global.fetch).toHaveBeenCalledTimes(before);
  });

  test('array work survives a trip to a coming-soon item', async () => {
    render(<App />);
    await screen.findByText('Step 4 of 4');
    await userEvent.type(screen.getByLabelText('Value'), '9');
    await userEvent.click(screen.getByRole('button', { name: 'Append' }));
    await screen.findByText('Step 5 of 5');
    await userEvent.click(screen.getByRole('button', { name: /^Heap/ }));
    expect(window.location.search).toBe('?ds=heap');
    await userEvent.click(screen.getByRole('button', { name: /^Array$/ }));
    expect(screen.getByText('Step 5 of 5')).toBeVisible();
    expect(new URLSearchParams(window.location.search).get('c')).toBe('array.append(1).append(3).append(5).append(7).append(9)');
  });

  test('?ds= selects a coming-soon item on load, and an unknown one falls back to Array', async () => {
    window.history.replaceState(null, '', '/?ds=trie');
    const { unmount } = render(<App />);
    await act(async () => {});
    expect(screen.getByRole('heading', { name: 'Trie' })).toBeInTheDocument();
    unmount();
    window.history.replaceState(null, '', '/?ds=nope');
    render(<App />);
    await act(async () => {});
    expect(screen.getByRole('button', { name: /^Array$/ })).toHaveAttribute('aria-current', 'page');
  });

  test('the old manual views never call their /api routes', async () => {
    render(<App />);
    await screen.findByText('Step 4 of 4');
    for (const s of STRUCTURES.slice(1)) {
      await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${s.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }));
    }
    const urls = global.fetch.mock.calls.map(([url]) => String(url));
    expect(urls.filter((u) => !u.includes('/api/run'))).toEqual([]);
  });

  test('the Share section is collapsed by default and holds the command and copy buttons', async () => {
    const { container } = render(<App />);
    await screen.findByText('Step 4 of 4');
    const share = container.querySelector('details');
    expect(share).not.toHaveAttribute('open');
    expect(share).toContainElement(screen.getByLabelText('Command'));
    expect(share).toContainElement(screen.getByRole('button', { name: 'Run' }));
    expect(share).toContainElement(screen.getByRole('button', { name: 'Copy link' }));
  });

  test('a link that fails to load opens the Share section', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network down')));
    window.history.replaceState(null, '', '/?c=array.append(1)');
    const { container } = render(<App />);
    await screen.findByRole('alert');
    await waitFor(() => expect(container.querySelector('details')).toHaveAttribute('open'));
  });
});
