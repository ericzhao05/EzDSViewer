import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StackView from './StackView';

const mk = (items) => ({ items, capacity: 100, size: items.length });
const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws items with values, top last', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: mk(['a', 5]), result: null }));
  render(<StackView />);
  const rows = await screen.findAllByRole('listitem');
  expect(rows.map((r) => r.textContent)).toEqual(['a', '5']);
  expect(rows[1]).toHaveClass('stack-view-top');
  expect(screen.getByText(/Capacity:/)).toHaveTextContent('Capacity: 100');
});

test('shows empty message', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: mk([]), result: null }));
  render(<StackView />);
  expect(await screen.findByText(/Stack is empty/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pop' })).toBeDisabled();
});

test('push sends numeric value and shows result', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: mk([]), result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: mk([7]), result: 7 }));
  render(<StackView />);
  await screen.findByText(/Stack is empty/);
  await userEvent.type(screen.getByLabelText('Value'), '7');
  await userEvent.click(screen.getByRole('button', { name: 'Push' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Pushed 7.');
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/stack\/push$/);
  expect(JSON.parse(opts.body)).toEqual({ value: 7 });
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

test('pop animates then calls the API', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: mk(['a', 'b']), result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: mk(['a']), result: 'b' }));
  render(<StackView />);
  await screen.findAllByRole('listitem');
  await userEvent.click(screen.getByRole('button', { name: 'Pop' }));
  expect(screen.getAllByRole('listitem')[1]).toHaveClass('stack-view-removing');
  expect(await screen.findByRole('status')).toHaveTextContent('Popped b.');
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(global.fetch.mock.calls[1][0]).toMatch(/stack\/pop$/);
});

test('shows backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: mk([]), result: null }))
    .mockImplementationOnce(() => reply({ success: false, error: 'Stack is full (capacity 100)', state: mk([]) }, false));
  render(<StackView />);
  await screen.findByText(/Stack is empty/);
  await userEvent.type(screen.getByLabelText('Value'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'Push' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Stack is full');
});

test('rejects empty push locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: mk([]), result: null }));
  render(<StackView />);
  await screen.findByText(/Stack is empty/);
  await userEvent.click(screen.getByRole('button', { name: 'Push' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Please enter a value');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('parentheses check shows result', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: mk([]), result: null }))
    .mockImplementationOnce(() => reply({ success: true, state: mk([]), result: false }));
  render(<StackView />);
  await screen.findByText(/Stack is empty/);
  await userEvent.click(screen.getByRole('button', { name: 'Check parentheses' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Not valid.');
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ text: '({[]})' });
});

test('load failure shows error', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<StackView />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load/);
});
