import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LruCacheView from './LruCacheView';

const emptyState = { capacity: 3, size: 0, order: [] };
const filled = {
  capacity: 3,
  size: 2,
  order: [{ key: 'b', value: 2 }, { key: 'a', value: 1 }],
};

const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws the recency list and hash map', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: filled, result: null }));
  render(<LruCacheView />);
  expect(await screen.findByText(/Capacity:/)).toHaveTextContent('Capacity: 3');
  expect(screen.getByTestId('lru-head')).toBeInTheDocument();
  expect(screen.getByTestId('lru-tail')).toBeInTheDocument();
  expect(screen.getByTestId('node-0')).toHaveTextContent('MRU');
  expect(screen.getByTestId('node-0')).toHaveTextContent('b2');
  expect(screen.getByTestId('node-1')).toHaveTextContent('LRU');
  expect(screen.getByTestId('map-1')).toHaveTextContent('a');
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: emptyState, result: null }));
  render(<LruCacheView />);
  expect(await screen.findByText(/Cache is empty/)).toBeInTheDocument();
});

test('put sends request and reports eviction', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result: null }))
    .mockImplementationOnce(() =>
      reply({
        success: true,
        state: filled,
        result: { updated: false, evicted: { key: 'z', value: 9 } },
      })
    );
  render(<LruCacheView />);
  await screen.findByText(/Cache is empty/);
  await userEvent.type(screen.getByLabelText('Key'), 'b');
  await userEvent.type(screen.getByLabelText('Value'), '2');
  await userEvent.click(screen.getByRole('button', { name: 'Put' }));
  expect(await screen.findByRole('status')).toHaveTextContent(/evicted least recently used key z/);
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/lru-cache\/put$/);
  expect(JSON.parse(opts.body)).toEqual({ key: 'b', value: 2 });
});

test('get miss shows message', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: filled, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: filled, result: { found: false, value: -1 } })
    );
  render(<LruCacheView />);
  await screen.findByText(/Capacity:/);
  await userEvent.type(screen.getByLabelText('Key'), 'q');
  await userEvent.click(screen.getByRole('button', { name: 'Get' }));
  expect(await screen.findByRole('status')).toHaveTextContent(/Miss.*returns -1/);
});

test('shows server error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: emptyState, result: null }))
    .mockImplementationOnce(() =>
      reply({ success: false, error: 'capacity must be an integer from 1 to 10', state: emptyState }, false)
    );
  render(<LruCacheView />);
  await screen.findByText(/Cache is empty/);
  await userEvent.click(screen.getByRole('button', { name: /Set capacity/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/capacity must be/);
});

test('shows load error', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<LruCacheView />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load data/);
});
