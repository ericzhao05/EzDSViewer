import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StringView from './StringView';

function reply(body, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
}

beforeEach(() => {
  global.fetch = jest.fn((url) =>
    url.endsWith('/api/string') ? reply({ success: true, state: { text: 'abca' }, result: null }) : reply({})
  );
});

test('draws the string as indexed cells', async () => {
  render(<StringView />);
  const cells = await screen.findAllByRole('listitem');
  expect(cells).toHaveLength(4);
  expect(cells[3]).toHaveTextContent('a3');
  expect(screen.getByText('O(n + m)', { exact: false })).toBeInTheDocument();
});

test('runs an operation and shows the result', async () => {
  render(<StringView />);
  await screen.findAllByRole('listitem');
  global.fetch.mockImplementationOnce(() =>
    reply({ success: true, state: { text: 'abca' }, result: { length: 3, start: 0, substring: 'abc' } })
  );
  await userEvent.click(screen.getByRole('button', { name: 'Longest unique substring' }));
  expect(await screen.findByRole('status')).toHaveTextContent('length 3');
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/\/string\/longest_unique_substring$/);
  expect(opts.method).toBe('POST');
});

test('shows an error from the backend', async () => {
  render(<StringView />);
  await screen.findAllByRole('listitem');
  global.fetch.mockImplementationOnce(() => reply({ success: false, error: "'other' must be a string" }, false));
  await userEvent.click(screen.getByRole('button', { name: 'Is anagram' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent("'other' must be a string"));
});

test('shows an error when loading fails', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('down')));
  render(<StringView />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load data');
});

test('shows the empty state', async () => {
  global.fetch = jest.fn(() => reply({ success: true, state: { text: '' }, result: null }));
  render(<StringView />);
  expect(await screen.findByText('The string is empty.')).toBeInTheDocument();
});
