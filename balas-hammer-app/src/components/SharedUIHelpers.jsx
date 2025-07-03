// src/components/SharedUIHelpers.js

// Clones a 2D array (useful for immutability with React state)
export function clone2D(arr) {
  return arr.map((row) => [...row]);
}

// Computes the total cost Z
export function computeZ(costs, alloc) {
  let z = 0;
  for (let i = 0; i < costs.length; i++) {
    for (let j = 0; j < costs[0].length; j++) {
      if (typeof alloc[i][j] === "number" && alloc[i][j] !== 0) {
        // Only sum numeric, non-zero allocations
        z += costs[i][j] * alloc[i][j];
      }
    }
  }
  return z;
}

// Helper to convert row index to character (A, B, C...)
export const getRowChar = (rowIndex) => String.fromCharCode(65 + rowIndex);