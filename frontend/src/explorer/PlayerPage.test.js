import { render, screen } from '@testing-library/react';
import PlayerPage from './PlayerPage';
import App from '../App';

jest.mock('./Explorer', () => (props) => (
  <div data-testid="explorer" data-embed={String(props.embed)}>{props.initialCommand}</div>
));

beforeEach(() => {
  document.body.className = '';
  localStorage.clear();
  window.history.pushState({}, '', '/');
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, state: null, stack: [] }) })
  );
});

afterEach(() => {
  document.body.className = '';
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

test('embed page passes the command, sets embed and applies theme=dark', () => {
  window.history.pushState({}, '', '/embed?c=array.append(1)&theme=dark');
  render(<PlayerPage embed />);
  const explorer = screen.getByTestId('explorer');
  expect(explorer).toHaveTextContent('array.append(1)');
  expect(explorer).toHaveAttribute('data-embed', 'true');
  expect(document.body).toHaveClass('dark-mode');
});

test('embed page ignores the stored theme', () => {
  localStorage.setItem('darkMode', 'true');
  window.history.pushState({}, '', '/embed?c=array');
  render(<PlayerPage embed />);
  expect(document.body).not.toHaveClass('dark-mode');
});

test('view page defaults the command to array and follows the stored theme', () => {
  localStorage.setItem('darkMode', 'true');
  window.history.pushState({}, '', '/v');
  const { unmount } = render(<PlayerPage />);
  expect(screen.getByTestId('explorer')).toHaveTextContent(/^array$/);
  expect(screen.getByTestId('explorer')).toHaveAttribute('data-embed', 'false');
  expect(document.body).toHaveClass('dark-mode');
  unmount();
  expect(document.body).not.toHaveClass('dark-mode');
});

test('App at / still shows the sidebar', () => {
  render(<App />);
  expect(screen.getByRole('complementary', { name: 'Data structures' })).toBeInTheDocument();
});

test('App at /v and /embed renders the player instead of the sidebar', () => {
  window.history.pushState({}, '', '/v?c=array.pop()');
  const { unmount } = render(<App />);
  expect(screen.getByTestId('explorer')).toHaveTextContent('array.pop()');
  expect(screen.queryByRole('complementary')).toBeNull();
  unmount();
  window.history.pushState({}, '', '/embed');
  render(<App />);
  expect(screen.getByTestId('explorer')).toHaveAttribute('data-embed', 'true');
});
