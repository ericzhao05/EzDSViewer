import ArrayBoard from './array/ArrayBoard';
import ArrayControls from './array/ArrayControls';

// One board and one set of edit controls per structure the explorer can show.
export const BOARDS = {
  array: { Board: ArrayBoard, Controls: ArrayControls },
};
