import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArrayView from './ArrayView';

const emptyState = { data: [null, null], size: 0, capacity: 2, resizes: 0 };

function reply(body, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
}

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.endsWith('/api/array')) return reply({ success: true, state: emptyState, result: null });
    return reply({ success: false, error: 'index out of range', state: emptyState }, false);
  });
});

test('renders cells, size and capacity from state', async () => {
  global.fetch = jest.fn(() =>
    reply({ success: true, state: { data: [7, 9, null, null], size: 2, capacity: 4, resizes: 1 }, result: null })
  );
  render(<ArrayView />);
  expect(await screen.findByText('7')).toBeInTheDocument();
  expect(screen.getByText('9')).toBeInTheDocument();
  expect(screen.getByTestId('array-capacity')).toHaveTextContent('4');
  expect(screen.getByTestId('array-size')).toHaveTextContent('2');
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
});

test('shows empty message', async () => {
  render(<ArrayView />);
  expect(await screen.findByText(/array is empty/i)).toBeInTheDocument();
});

test('append posts the value and shows the resize note', async () => {
  const full = { data: [1, 2], size: 2, capacity: 2, resizes: 0 };
  const grown = { data: [1, 2, 3, null], size: 3, capacity: 4, resizes: 1 };
  global.fetch = jest.fn((url) =>
    url.endsWith('/append')
      ? reply({ success: true, state: grown, result: 3 })
      : reply({ success: true, state: full, result: null })
  );
  render(<ArrayView />);
  await screen.findByTestId('array-size');
  fireEvent.change(screen.getByLabelText('Value'), { target: { value: '3' } });
  fireEvent.click(screen.getByText('Append'));
  expect(await screen.findByText(/allocated capacity 4/)).toBeInTheDocument();
  const call = global.fetch.mock.calls.find(([u]) => u.endsWith('/append'));
  expect(JSON.parse(call[1].body)).toEqual({ value: 3 });
  expect(screen.getByTestId('array-resizes')).toHaveTextContent('1');
});

test('shows server error', async () => {
  render(<ArrayView />);
  await screen.findByText(/array is empty/i);
  fireEvent.change(screen.getByLabelText('Index'), { target: { value: '5' } });
  fireEvent.click(screen.getByText('Get'));
  expect(await screen.findByRole('alert')).toHaveTextContent('index out of range');
});

test('validates missing value locally', async () => {
  render(<ArrayView />);
  await screen.findByText(/array is empty/i);
  fireEvent.click(screen.getByText('Append'));
  expect(screen.getByRole('alert')).toHaveTextContent(/enter a value/i);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
});

test('shows algorithm result', async () => {
  global.fetch = jest.fn((url) =>
    url.endsWith('/max_subarray')
      ? reply({ success: true, state: emptyState, result: 14 })
      : reply({ success: true, state: emptyState, result: null })
  );
  render(<ArrayView />);
  await screen.findByText(/array is empty/i);
  fireEvent.click(screen.getByText('Max subarray'));
  expect(await screen.findByTestId('array-result')).toHaveTextContent('14');
});

test('shows load error', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('down')));
  render(<ArrayView />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
});
