import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnionFindView from './UnionFindView';

const state = {
  size: 4,
  parent: [0, 0, 2, 2],
  rank: [1, 0, 1, 0],
  components: 2,
  limits: { max_size: 20 },
};

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws the forest and the parent array', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state, result: null }));
  render(<UnionFindView />);
  expect(await screen.findByTestId('node-3')).toBeInTheDocument();
  expect(screen.getByTestId('parent-1')).toHaveTextContent('0');
  expect(screen.getByTestId('parent-3')).toHaveTextContent('2');
  expect(screen.getByTestId('components')).toHaveTextContent('2');
  expect(screen.getByText(/can only merge/)).toBeInTheDocument();
});

test('union posts both elements and shows the outcome', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: { ...state, parent: [0, 0, 0, 2], components: 1 }, result: { merged: true } })
    );
  render(<UnionFindView />);
  await screen.findByTestId('node-0');
  await userEvent.type(screen.getByLabelText('Element A'), '1');
  await userEvent.type(screen.getByLabelText('Element B'), '3');
  await userEvent.click(screen.getByRole('button', { name: 'Union' }));
  expect(await screen.findByText('Merged the two groups.')).toBeInTheDocument();
  const call = global.fetch.mock.calls[1];
  expect(call[0]).toMatch(/union-find\/union/);
  expect(JSON.parse(call[1].body)).toEqual({ a: 1, b: 3 });
  expect(screen.getByTestId('components')).toHaveTextContent('1');
});

test('shows backend errors', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: false, error: "'b' must be an element from 0 to 3", state }, false)
    );
  render(<UnionFindView />);
  await screen.findByTestId('node-0');
  await userEvent.type(screen.getByLabelText('Element A'), '1');
  await userEvent.type(screen.getByLabelText('Element B'), '9');
  await userEvent.click(screen.getByRole('button', { name: 'Connected?' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/must be an element/);
});

test('rejects non-numeric input locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state, result: null }));
  render(<UnionFindView />);
  await screen.findByTestId('node-0');
  await userEvent.click(screen.getByRole('button', { name: 'Union' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/whole numbers/);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() =>
    reply({ success: true, state: { ...state, size: 0, parent: [], rank: [], components: 0 }, result: null })
  );
  render(<UnionFindView />);
  expect(await screen.findByText('No elements.')).toBeInTheDocument();
});
