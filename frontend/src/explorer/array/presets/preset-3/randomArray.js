// The value ranges a dice roll picks from. People only see the numbers, never which range they got.
const RANGES = [
  [0, 10],
  [0, 50],
  [20, 100],
];
const MIN_SIZE = 6;
const MAX_SIZE = 10;

const between = (low, high, random) => low + Math.floor(random() * (high - low + 1));

// A command that builds a random array: 6 to 10 values, all from one randomly chosen range.
export default function randomArrayCommand(random = Math.random) {
  const [low, high] = RANGES[Math.floor(random() * RANGES.length)];
  const size = between(MIN_SIZE, MAX_SIZE, random);
  const calls = Array.from({ length: size }, () => `append(${between(low, high, random)})`);
  return `array.${calls.join('.')}`;
}
