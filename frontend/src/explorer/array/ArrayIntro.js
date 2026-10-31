import React from 'react';

// The short explanation and complexity lines that sit above the array board.
export default function ArrayIntro() {
  return (
    <>
      <p>
        Elements sit in contiguous memory, so index i lives at base + i * element_size and access is O(1). A dynamic
        array doubles its capacity when full and copies everything over, which makes append amortized O(1).
      </p>
      <p className="array-complexity">
        Access O(1) &middot; append amortized O(1) (a single resize copy is O(n)) &middot; insert / pop at index O(n)
        &middot; growing by a constant instead of doubling would cost O(n&sup2;) for n appends.
      </p>
    </>
  );
}
