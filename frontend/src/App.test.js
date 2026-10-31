import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { STRUCTURES } from './structures/registry';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, state: null, stack: [] }) })
  );
});

test('lists every registered structure and switches views', async () => {
  render(<App />);
  const nav = screen.getByRole('complementary', { name: 'Data structures' });
  STRUCTURES.forEach((s) => {
    expect(nav).toHaveTextContent(s.label);
  });
  const buttons = STRUCTURES.map((s) => screen.getByRole('button', { name: s.label }));
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
