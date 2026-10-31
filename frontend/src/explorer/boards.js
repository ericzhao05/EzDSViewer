import ArrayBoard from './array/ArrayBoard';
import ArrayControls from './array/ArrayControls';
import ArrayIntro from './array/ArrayIntro';

// One board and one set of edit controls per structure the explorer can show.
// title and Intro appear above the board in the main app, not in embeds.
export const BOARDS = {
  array: { Board: ArrayBoard, Controls: ArrayControls, title: 'Array / Dynamic Array', intro: ArrayIntro },
};
