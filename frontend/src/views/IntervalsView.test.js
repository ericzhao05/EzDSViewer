import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntervalsView from './IntervalsView';

const base = { intervals: [[1, 3], [2, 6], [8, 10]], size: 3, limits: {} };
const empty = { intervals: [], size: 0, limits: {} };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws one bar per interval and the intro text', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: base, result: null }));
  render(<IntervalsView />);
  await screen.findByTestId('intervals-main');
  expect(screen.getAllByTestId('intervals-main-bar')).toHaveLength(3);
  expect(screen.getByText(/Sort then scan: O\(n log n\) overall/)).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: empty, result: null }));
  render(<IntervalsView />);
  expect(await screen.findByText('No intervals.')).toBeInTheDocument();
});

test('add posts the interval', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: empty, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result: [1, 3] }));
  render(<IntervalsView />);
  await screen.findByText('No intervals.');
  await userEvent.type(screen.getByLabelText('Interval'), '1, 3');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByText('Added [1, 3]')).toBeInTheDocument();
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/\/intervals\/add$/);
  expect(JSON.parse(opts.body)).toEqual({ interval: [1, 3] });
});

test('merge draws the merged timeline', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: base, result: [[1, 6], [8, 10]] }));
  render(<IntervalsView />);
  await screen.findByTestId('intervals-main');
  await userEvent.click(screen.getByRole('button', { name: 'Merge intervals' }));
  expect(await screen.findByText('Merged: [[1, 6], [8, 10]]')).toBeInTheDocument();
  expect(screen.getAllByTestId('intervals-shown-bar')).toHaveLength(2);
});

test('rejects a bad interval locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: base, result: null }));
  render(<IntervalsView />);
  await screen.findByTestId('intervals-main');
  await userEvent.type(screen.getByLabelText('Interval'), '5, 2');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/start, end/);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows a backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: base, result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'index must be a whole number within the list', state: base }, false));
  render(<IntervalsView />);
  await screen.findByTestId('intervals-main');
  await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('index must be');
});

test('shows a load error', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<IntervalsView />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load/);
});

test('caps the drawing width for huge values', async () => {
  const huge = { intervals: [[0, 1000000]], size: 1, limits: {} };
  global.fetch.mockImplementation(() => reply({ success: true, state: huge, result: null }));
  render(<IntervalsView />);
  const svg = await screen.findByTestId('intervals-main');
  expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(1300);
});

test('rejects a zero-length interval locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: base, result: null }));
  render(<IntervalsView />);
  await screen.findByTestId('intervals-main');
  await userEvent.type(screen.getByLabelText('Interval'), '3, 3');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/smaller than end/);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
