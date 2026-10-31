import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkedListView from './LinkedListView';

const list = { values: [1, 2, 3], length: 3, cycle_to: null };
const empty = { values: [], length: 0, cycle_to: null };
const cyclic = { values: [1, 2, 3], length: 3, cycle_to: 1 };

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws nodes with head, tail and null', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: list, result: null }));
  render(<LinkedListView />);
  expect(await screen.findByTestId('node-0')).toHaveTextContent('head');
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByTestId('node-2')).toHaveTextContent('tail');
  expect(screen.getByTestId('list-end')).toHaveTextContent('null');
});

test('shows cycle target', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: cyclic, result: null }));
  render(<LinkedListView />);
  expect(await screen.findByTestId('list-end')).toHaveTextContent('node 1');
  expect(screen.getByText(/tail points back to index 1/)).toBeInTheDocument();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: empty, result: null }));
  render(<LinkedListView />);
  expect(await screen.findByText(/Linked list is empty/)).toBeInTheDocument();
});

test('push back sends request and redraws', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: empty, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: { values: [7], length: 1, cycle_to: null }, result: null })
    );
  render(<LinkedListView />);
  await screen.findByText(/Linked list is empty/);
  await userEvent.type(screen.getByLabelText('Value'), '7');
  await userEvent.click(screen.getByRole('button', { name: 'Push back' }));
  expect(await screen.findByTestId('node-0')).toHaveTextContent('7');
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/linked-list\/push-back$/);
  expect(JSON.parse(opts.body)).toEqual({ value: 7 });
});

test('find shows result message', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: list, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: list, result: { found: true, index: 2 } })
    );
  render(<LinkedListView />);
  await screen.findByTestId('node-0');
  await userEvent.type(screen.getByLabelText('Value'), '3');
  await userEvent.click(screen.getByRole('button', { name: 'Find value' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Found at index 2');
});

test('rejects non-integer input locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: list, result: null }));
  render(<LinkedListView />);
  await screen.findByTestId('node-0');
  await userEvent.type(screen.getByLabelText('Value'), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Push front' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Value must be a whole number');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: list, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: false, error: 'index must be between 0 and 2', state: list }, false)
    );
  render(<LinkedListView />);
  await screen.findByTestId('node-0');
  await userEvent.type(screen.getByLabelText('Index'), '9');
  await userEvent.click(screen.getByRole('button', { name: 'Delete at index' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('index must be between 0 and 2');
});
