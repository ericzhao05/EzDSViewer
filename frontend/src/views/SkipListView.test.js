import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkipListView from './SkipListView';

const emptyState = {
  seed: 7, size: 0, max_level: 3, p: 0.5, keys: [], levels: [[], [], []],
};
const filled = {
  seed: 7, size: 3, max_level: 3, p: 0.5, keys: [1, 4, 9],
  levels: [[1, 4, 9], [4, 9], [9]],
};

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws each level of the list', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: filled, result: null }));
  render(<SkipListView />);
  expect(await screen.findByText(/Size:/)).toHaveTextContent('Size: 3');
  expect(screen.getByTestId('node-0-1')).toHaveTextContent('1');
  expect(screen.getByTestId('node-1-4')).toBeInTheDocument();
  expect(screen.queryByTestId('node-1-1')).toBeNull();
  expect(screen.getByTestId('node-2-9')).toBeInTheDocument();
  expect(screen.queryByTestId('node-2-4')).toBeNull();
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: emptyState, result: null }));
  render(<SkipListView />);
  expect(await screen.findByText(/List is empty/)).toBeInTheDocument();
});

test('insert posts the key and reports its height', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: filled, result: { inserted: true, level: 2 } })
    );
  render(<SkipListView />);
  await screen.findByText(/List is empty/);
  await userEvent.type(screen.getByLabelText('Key'), '9');
  await userEvent.click(screen.getByRole('button', { name: 'Insert' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Inserted 9 with height 3');
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toContain('/skip-list/insert');
  expect(JSON.parse(opts.body)).toEqual({ key: 9 });
});

test('search highlights the visited path', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: filled, result: null }))
    .mockImplementationOnce(() =>
      reply({
        success: true,
        state: filled,
        result: {
          found: true,
          path: [{ level: 2, key: null }, { level: 2, key: 9 }, { level: 1, key: null }, { level: 0, key: 9 }],
        },
      })
    );
  render(<SkipListView />);
  await screen.findByText(/Size:/);
  await userEvent.type(screen.getByLabelText('Key'), '9');
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Found 9');
  expect(screen.getByTestId('node-2-9')).toHaveClass('skip-list-visited');
  expect(screen.getByTestId('node-1-4')).not.toHaveClass('skip-list-visited');
});

test('rejects a non-integer key without calling the backend', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: filled, result: null }));
  render(<SkipListView />);
  await screen.findByText(/Size:/);
  await userEvent.type(screen.getByLabelText('Key'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(screen.getByRole('alert')).toHaveTextContent('whole number');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows backend errors', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: filled, result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'the list is limited to 40 keys', state: filled }, false));
  render(<SkipListView />);
  await screen.findByText(/Size:/);
  await userEvent.type(screen.getByLabelText('Key'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Insert' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('limited to 40 keys');
});

test('shows an error when loading fails', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<SkipListView />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load data');
});
