import ArrayBoard from './array/ArrayBoard';
import ArrayIntro from './array/ArrayIntro';

// One board per structure the explorer can show. The controls live in array/useArrayControls.
// title and intro appear above the board in the main app, not in embeds.
export const BOARDS = {
  array: { Board: ArrayBoard, title: 'Array / Dynamic Array', intro: ArrayIntro },
};
