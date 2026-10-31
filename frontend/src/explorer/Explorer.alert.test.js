import { render, screen } from '@testing-library/react';
import Explorer from './Explorer';

// A layout that never mentions errors: Explorer itself must still show them.
jest.mock('./array/presets', () => ({
  PRESETS: [{ id: '1', name: 'Bare', Component: () => <p>bare layout</p> }],
}));

test('a layout that ignores errors still gets the alert', async () => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: false,
    status: 400,
    json: () => Promise.resolve({
      success: false, error: 'bad call', code: 'unknown_method', position: null, available: ['append'],
      structure: 'array', command: 'array.x()', calls: ['x()'], frames: [],
      state: { data: [null, null], size: 0, capacity: 2, resizes: 0 }, result: null,
    }),
  }));
  render(<Explorer initialCommand="array.x()" />);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('bad call');
  expect(alert).toHaveTextContent('Available: append');
  expect(screen.getByText('bare layout')).toBeInTheDocument();
});
