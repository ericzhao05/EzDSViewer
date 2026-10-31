import randomArrayCommand from './randomArray';

const values = (cmd) => cmd.slice('array.'.length).split('.').map((c) => Number(c.slice(7, -1)));

// Feeds the given numbers to the function in order, repeating the last one.
const feed = (...nums) => {
  let i = 0;
  return () => nums[Math.min(i++, nums.length - 1)];
};

test('every roll is 6 to 10 whole numbers from one of the three ranges', () => {
  const ranges = [[0, 10], [0, 50], [20, 100]];
  const sizes = new Set();
  for (let n = 0; n < 2000; n += 1) {
    const got = values(randomArrayCommand());
    sizes.add(got.length);
    expect(got.every(Number.isInteger)).toBe(true);
    expect(ranges.some(([low, high]) => got.every((v) => v >= low && v <= high))).toBe(true);
  }
  expect([...sizes].sort((a, b) => a - b)).toEqual([6, 7, 8, 9, 10]);
});

test.each([
  [0, 0, 10],
  [0.4, 0, 50],
  [0.9, 20, 100],
])('a pick of %d uses the range %d to %d, including both ends', (pick, low, high) => {
  expect(values(randomArrayCommand(feed(pick, 0, 0)))[0]).toBe(low);
  expect(values(randomArrayCommand(feed(pick, 0, 0.9999)))[0]).toBe(high);
});

test('the size reaches both 6 and 10', () => {
  expect(values(randomArrayCommand(feed(0, 0, 0)))).toHaveLength(6);
  expect(values(randomArrayCommand(feed(0, 0.9999, 0)))).toHaveLength(10);
});
