import { render, screen } from '@testing-library/react';
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
