// src/utils/steppingStoneOptimizer.js

/**
 * Finds a closed loop (path) for a non-allocated cell in the stepping stone method.
 * The path must start and end at the non-basic cell, alternating between horizontal and vertical moves
 * and only involving basic (allocated or epsilon) cells, except for the starting cell.
 *
 * This implementation uses a Breadth-First Search (BFS) to find the shortest such cycle,
 * which is generally more robust for Stepping Stone paths than a simple DFS.
 *
 * @param {number} startI Row index of the unallocated cell (non-basic variable).
 * @param {number} startJ Column index of the unallocated cell (non-basic variable).
 * @param {Array<Array<number|string|null>>} allocations Current allocation matrix.
 * @returns {Array<Array<number>>|null} The path as an array of [row, col] pairs, or null if no loop found.
 */
export function findClosedLoop(startI, startJ, allocations) {
    const m = allocations.length;
    const n = allocations[0].length;

    // A queue for BFS, storing [row, col, parent_index_in_path, is_row_move]
    // is_row_move: true if the last move was horizontal (along a row), false if vertical (along a column)
    const queue = [];
    // Stores paths for each visited cell: [row, col, parent_index_in_path]
    const pathInfo = [];
    // Visited set to prevent infinite loops, stores strings like "i,j,is_row_move"
    const visited = new Set();

    // Start BFS from the non-basic cell, trying both horizontal and vertical initial moves
    // The first move is "to" an allocated cell from the non-basic one.
    // So, it's a "row move" if we consider moving to (startI, j)
    // And a "col move" if we consider moving to (i, startJ)

    // Initial dummy parent for the starting cell
    pathInfo.push([startI, startJ, -1]);
    visited.add(`${startI},${startJ},initial`); // Mark initial state as visited

    // Try initial horizontal moves from (startI, startJ)
    for (let j = 0; j < n; j++) {
        if (j === startJ) continue;
        // Check if the cell is allocated (basic)
        if (allocations[startI][j] !== null) {
            queue.push([startI, j, 0, true]); // (startI, j) is the next cell, parent is at index 0 (startI, startJ), last move was row (horizontal)
            pathInfo.push([startI, j, 0]);
            visited.add(`${startI},${j},row`);
        }
    }

    // Try initial vertical moves from (startI, startJ)
    for (let i = 0; i < m; i++) {
        if (i === startI) continue;
        // Check if the cell is allocated (basic)
        if (allocations[i][startJ] !== null) {
            queue.push([i, startJ, 0, false]); // (i, startJ) is the next cell, parent is at index 0 (startI, startJ), last move was col (vertical)
            pathInfo.push([i, startJ, 0]);
            visited.add(`${i},${startJ},col`);
        }
    }

    let head = 0;
    while (head < queue.length) {
        const [currI, currJ,  prevIsRowMove] = queue[head++];
        const currPathIdx = pathInfo.length - (queue.length - head + 1); // Index of (currI, currJ) in pathInfo

        // Explore neighbors
        if (prevIsRowMove) { // Last move was horizontal, next must be vertical
            for (let i = 0; i < m; i++) {
                if (i === currI) continue;
                if (allocations[i][currJ] !== null) { // Must be an allocated cell
                    // Check if we've found the start cell, completing the cycle
                    if (i === startI && currJ === startJ) {
                        // Reconstruct path
                        const path = [];
                        let idx = currPathIdx;
                        while (idx !== -1) {
                            path.unshift([pathInfo[idx][0], pathInfo[idx][1]]);
                            idx = pathInfo[idx][2];
                        }
                        // Ensure the path has an even number of cells (including the non-basic start cell)
                        // A valid Stepping Stone path has an even number of nodes.
                        // The loop should be like: non-basic -> basic -> non-basic -> basic ... -> non-basic.
                        // Or if the first node is non-basic, then it's non-basic, basic, basic, basic....
                        // Path needs to be: [start non-basic, basic1, basic2, ..., basicN] where basicN connects to start non-basic.
                        // The length will be `N+1`. If N is odd, N+1 is even.
                        // E.g., for a 2x2: (0,0) [non-basic] -> (0,1) [basic] -> (1,1) [basic] -> (1,0) [basic]
                        // Path: [(0,0), (0,1), (1,1), (1,0)] Length = 4 (even).
                        if (path.length % 2 === 0) {
                            return path;
                        }
                    }

                    const key = `${i},${currJ},col`;
                    if (!visited.has(key)) {
                        queue.push([i, currJ, currPathIdx, false]); // Next move will be column (vertical)
                        pathInfo.push([i, currJ, currPathIdx]);
                        visited.add(key);
                    }
                }
            }
        } else { // Last move was vertical, next must be horizontal
            for (let j = 0; j < n; j++) {
                if (j === currJ) continue;
                if (allocations[currI][j] !== null) { // Must be an allocated cell
                    // Check if we've found the start cell, completing the cycle
                    if (currI === startI && j === startJ) {
                        // Reconstruct path
                        const path = [];
                        let idx = currPathIdx;
                        while (idx !== -1) {
                            path.unshift([pathInfo[idx][0], pathInfo[idx][1]]);
                            idx = pathInfo[idx][2];
                        }
                        if (path.length % 2 === 0) {
                            return path;
                        }
                    }

                    const key = `${currI},${j},row`;
                    if (!visited.has(key)) {
                        queue.push([currI, j, currPathIdx, true]); // Next move will be row (horizontal)
                        pathInfo.push([currI, j, currPathIdx]);
                        visited.add(key);
                    }
                }
            }
        }
    }

    return null; // No closed loop found
}
// src/utils/steppingStone.js (or steppingStoneOptimizer.js)

// ... (findClosedLoop function remains the same) ...

/**
 * Optimizes allocations using the Stepping Stone method.
 *
 * @param {Array<Array<number|string|null>>} initialAllocations The initial allocation matrix (can contain "ε").
 * @param {Array<Array<number>>} costs The cost matrix.
 * @param {Array<number>} offer The original offer quantities (not modified by stepping stone, but useful for reference).
 * @param {Array<number>} demand The original demand quantities (not modified by stepping stone, but useful for reference).
 * @returns {Array<Object>} An array of steps, each describing an optimization iteration.
 */
export function optimizeSteppingStone(initialAllocations, costs, offer, demand) {
  const m = initialAllocations.length;
  const n = initialAllocations[0].length;
  const steps = [];

  // Create a mutable copy of allocations for optimization
  let currentAllocations = initialAllocations.map(row => [...row]);
  let iterationCount = 0; // To label stepping stone iterations

  // Add the initial state of Stepping Stone (which is the final Balas-Hammer allocation)
  steps.push({
      allocations: currentAllocations.map(row => [...row]),
      offer: [...offer],
      demand: [...demand],
      note: "Début de l'optimisation Stepping Stone (solution initiale de Balas-Hammer)",
      type: "SteppingStoneInitial" // Mark this for specific display if needed
  });


  let improved = true; // Flag to continue iterations as long as improvement is found

  while (improved) {
    improved = false;
    let bestDelta = 0;
    let bestPath = null;
    let bestCell = null;
    const allDeltas = []; // To store all calculated deltas for the current iteration's display

    // Iterate through all non-basic (unallocated) cells to find potential improvements
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        // Skip if the cell is already allocated (basic variable)
        if (currentAllocations[i][j] !== null && currentAllocations[i][j] !== "ε") {
          continue;
        }

        // Find a closed loop for the current non-basic cell
        const path = findClosedLoop(i, j, currentAllocations);

        if (!path) {
          continue; // No closed loop means no improvement possible from this cell
        }

        let delta = 0;
        const formulaParts = [];

        // Calculate the improvement index (delta) for the path
        // The path elements alternate signs: (+, -, +, -, ...)
        for (let k = 0; k < path.length; k++) {
          const [pi, pj] = path[k];
          const cost = costs[pi][pj];
          const sign = k % 2 === 0 ? "+" : "-";
          formulaParts.push(`${sign}${cost}`);
          delta += (k % 2 === 0 ? 1 : -1) * cost;
        }

        // Store delta calculation for UI display
        allDeltas.push({
          cell: [i, j],
          path, // Include the path for each delta calculation
          delta,
          formula: `δ(${String.fromCharCode(65 + i)}, ${j + 1}) = ` + formulaParts.join(" ") + ` = ${delta}`
        });

        // If a negative delta is found, it means an improvement is possible
        if (delta < bestDelta) {
          bestDelta = delta;
          bestPath = path;
          bestCell = [i, j];
          improved = true; // Set flag to true to continue iterating
        }
      }
    }

    // If an improvement was found in this iteration, apply it
    if (improved && bestPath) {
      iterationCount++; // Increment iteration count for labeling steps
      let minQty = Infinity;
      // Find the minimum quantity among cells with a '-' sign in the optimal path
      for (let k = 1; k < bestPath.length; k += 2) { // Iterate over indices 1, 3, 5... (cells with '-' sign)
        const [i, j] = bestPath[k];
        if (typeof currentAllocations[i][j] === 'number') {
          minQty = Math.min(minQty, currentAllocations[i][j]);
        }
      }

      if (minQty === Infinity || minQty <= 0) {
          break; // Exit loop if no transferable quantity, indicating no further practical improvement via this process.
      }

      // Create a new allocation matrix for the next step's state
      const nextAllocations = currentAllocations.map(row => [...row]);

      // Adjust quantities along the best path
      for (let k = 0; k < bestPath.length; k++) {
        const [i, j] = bestPath[k];
        if (k % 2 === 0) { // Cells with '+' sign: add minQty
          if (nextAllocations[i][j] === null || nextAllocations[i][j] === "ε") {
              nextAllocations[i][j] = minQty;
          } else {
              nextAllocations[i][j] += minQty;
          }
        } else { // Cells with '-' sign: subtract minQty
          if (nextAllocations[i][j] === "ε") {
            nextAllocations[i][j] = null; // 'ε' leaves the basis
          } else {
            nextAllocations[i][j] -= minQty;
            if (nextAllocations[i][j] === 0) {
              nextAllocations[i][j] = null; // Numeric 0 leaves the basis
            }
          }
        }
      }
      currentAllocations = nextAllocations; // Update the allocations for the next iteration

      // Record the step for UI display
      steps.push({
        allocations: currentAllocations.map(row => [...row]),
        offer: [...offer],
        demand: [...demand],
        note: `Itération ${iterationCount} de Stepping Stone: Amélioration avec Δ = ${bestDelta} via (${String.fromCharCode(65 + bestCell[0])}, ${bestCell[1] + 1}). Quantité transférée: ${minQty}.`,
        deltas: allDeltas, // Include all deltas calculated in this iteration for display
        minQtyApplied: minQty,
        bestCell: bestCell, // The non-basic cell that initiated the best path
        bestPath: bestPath, // The actual path of the best improvement
        type: "SteppingStoneIteration" // Mark this for specific display
      });
    } else {
      break; // No negative delta found, so the optimal solution is reached or no practical path left
    }
  }

  // Add a final step to indicate the end of optimization (if not already added as an iteration)
  // Check if the last recorded step is already the optimal one
  const lastStep = steps[steps.length - 1];
  if (!lastStep || lastStep.type !== "SteppingStoneIteration") {
    steps.push({
      allocations: currentAllocations.map(row => [...row]),
      offer: [...offer],
      demand: [...demand],
      note: "Fin de l'optimisation Stepping Stone — solution optimale obtenue",
      type: "SteppingStoneFinal"
    });
  } else {
      // If the last step was an iteration, just update its note if it's the final one
      // eslint-disable-next-line no-undef
      if (bestDelta >= 0) { // If no further improvement was found in the last check
          lastStep.note = lastStep.note + " (Solution optimale atteinte).";
          lastStep.type = "SteppingStoneFinal"; // Mark as final
      }
  }


  return steps;
}