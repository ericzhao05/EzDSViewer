import { fireEvent, render, screen } from '@testing-library/react';
import PlayerPage from './PlayerPage';
import App from '../App';
import { THEME_OPTIONS } from '../theme/themes';

jest.mock('./Explorer', () => (props) => (
  <div data-testid="explorer" data-embed={String(props.embed)}>{props.initialCommand}</div>
));

// These tests are about how a page keeps its theme, so every listed theme is available here.
const original = THEME_OPTIONS.map((o) => ({ ...o }));
beforeAll(() => THEME_OPTIONS.forEach((o) => { delete o.comingSoon; }));
afterAll(() => THEME_OPTIONS.forEach((o, i) => Object.assign(o, original[i])));

const shownStyle = () => document.documentElement.dataset.style;

const pick = (name) => {
  fireEvent.click(screen.getByRole('button', { name: 'Choose style' }));
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(name) }));
};

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, state: null, stack: [] }) })
  );
});

afterEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

test('embed page passes the command, sets embed and applies theme=dark', () => {
  window.history.pushState({}, '', '/embed?c=array.append(1)&theme=dark');
  render(<PlayerPage />);
  const explorer = screen.getByTestId('explorer');
  expect(explorer).toHaveTextContent('array.append(1)');
  expect(explorer).toHaveAttribute('data-embed', 'true');
  expect(shownStyle()).toBe('chalkboard');
});

test('embed page ignores the stored theme', () => {
  localStorage.setItem('ezds-theme', 'phosphor/green');
  window.history.pushState({}, '', '/embed?c=array');
  render(<PlayerPage />);
  expect(shownStyle()).toBe('toy-blocks');
});

test('App at / still shows the sidebar', () => {
  render(<App />);
  expect(screen.getByRole('complementary', { name: 'Data structures' })).toBeInTheDocument();
});

test('App at /embed renders the bare player instead of the sidebar', () => {
  window.history.pushState({}, '', '/embed');
  render(<App />);
  expect(screen.getByTestId('explorer')).toHaveAttribute('data-embed', 'true');
  expect(screen.queryByRole('complementary')).toBeNull();
});

test('/embed has the top bar and the page panel, but no sidebar', () => {
  window.history.pushState({}, '', '/embed');
  const { container } = render(<PlayerPage />);
  expect(screen.getByRole('heading', { name: 'EzDSViewer' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Choose style' })).toBeInTheDocument();
  expect(container.querySelector('.main-content .ds-container')).toContainElement(screen.getByTestId('explorer'));
  expect(screen.queryByRole('complementary')).toBeNull();
});

test('App at /v saves a picked theme', () => {
  window.history.pushState({}, '', '/v');
  render(<App />);
  pick('Phosphor');
  expect(shownStyle()).toBe('phosphor');
  expect(localStorage.getItem('ezds-theme')).toBe('phosphor/green');
});

test('embed page applies a picked theme without saving it', () => {
  window.history.pushState({}, '', '/embed?theme=dark');
  render(<PlayerPage />);
  expect(shownStyle()).toBe('chalkboard');
  pick('Phosphor');
  expect(shownStyle()).toBe('phosphor');
  expect(localStorage.getItem('ezds-theme')).toBeNull();
});

test('embed page leaves an existing saved theme alone when picking', () => {
  localStorage.setItem('ezds-theme', 'phosphor/green');
  window.history.pushState({}, '', '/embed');
  render(<PlayerPage />);
  expect(shownStyle()).toBe('toy-blocks');
  pick('Chalkboard');
  expect(shownStyle()).toBe('chalkboard');
  expect(localStorage.getItem('ezds-theme')).toBe('phosphor/green');
});

test('App at / still saves a picked theme', () => {
  render(<App />);
  pick('Toy blocks');
  expect(shownStyle()).toBe('toy-blocks');
  expect(localStorage.getItem('ezds-theme')).toBe('toy-blocks/bubblegum');
});
