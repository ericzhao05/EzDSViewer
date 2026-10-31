import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatrixView from './MatrixView';

const mk = (grid) => ({
  grid,
  rows: grid.length,
  cols: grid[0].length,
  limits: { max_dim: 12, max_cell: 3 },
});
const reply = (body, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
const G = [['1', '0'], ['0', '1']];

beforeEach(() => {
  global.fetch = jest.fn();
});

test('draws the grid cells', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: mk(G), result: null }));
  render(<MatrixView />);
  const cells = await screen.findAllByRole('gridcell');
  expect(cells.map((c) => c.textContent)).toEqual(['1', '0', '0', '1']);
  expect(screen.getByText(/Rows:/)).toHaveTextContent('Rows: 2');
  expect(screen.getByRole('button', { name: 'Set cell' })).toBeDisabled();
});

test('selecting a cell and setting it calls the API', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: mk(G), result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: mk([['1', '0'], ['7', '1']]), result: '7' }));
  render(<MatrixView />);
  await userEvent.click(await screen.findByRole('gridcell', { name: 'Cell 1,0' }));
  const input = screen.getByLabelText('Cell value');
  await userEvent.clear(input);
  await userEvent.type(input, '7');
  await userEvent.click(screen.getByRole('button', { name: 'Set cell' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Set cell (1, 0) to "7"');
  const [url, opts] = global.fetch.mock.calls[1];
  expect(url).toMatch(/matrix\/set-cell$/);
  expect(JSON.parse(opts.body)).toEqual({ row: 1, col: 0, value: '7' });
  expect(screen.getByRole('gridcell', { name: 'Cell 1,0' })).toHaveTextContent('7');
});

test('count islands shows result and colours islands', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: mk(G), result: null }))
    .mockImplementationOnce(() =>
      reply({ success: true, state: mk(G), result: { count: 2, labels: [[1, 0], [0, 2]] } }));
  render(<MatrixView />);
  await screen.findAllByRole('gridcell');
  await userEvent.click(screen.getByRole('button', { name: 'Count islands' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Number of islands: 2');
  expect(screen.getByRole('gridcell', { name: 'Cell 0,0' })).toHaveClass('matrix-view-island');
  expect(screen.getByRole('gridcell', { name: 'Cell 0,1' })).not.toHaveClass('matrix-view-island');
});

test('shows backend error', async () => {
  global.fetch
    .mockImplementationOnce(() => reply({ success: true, state: mk(G), result: null }))
    .mockImplementationOnce(() =>
      reply({ success: false, error: 'Rotation needs a square matrix', state: mk(G) }, false));
  render(<MatrixView />);
  await screen.findAllByRole('gridcell');
  await userEvent.click(screen.getByRole('button', { name: 'Rotate clockwise' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Rotation needs a square matrix');
});

test('rejects out-of-range resize locally', async () => {
  global.fetch.mockImplementation(() => reply({ success: true, state: mk(G), result: null }));
  render(<MatrixView />);
  await screen.findAllByRole('gridcell');
  await userEvent.type(screen.getByLabelText('Rows'), '99');
  await userEvent.click(screen.getByRole('button', { name: 'Resize' }));
  expect(screen.getByRole('alert')).toHaveTextContent('from 1 to 12');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('load failure shows error', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('down')));
  render(<MatrixView />);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load/);
});
