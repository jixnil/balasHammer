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
import { calculateTotalCost } from "./balasHammer.js";
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
  let currentAllocations = initialAllocations.map(row => [...row]);
  let iterationCount = 0;

  steps.push({
    allocations: currentAllocations.map(r => [...r]),
    offer: [...offer],
    demand: [...demand],
    costs,
    note: "Début de l'optimisation Stepping Stone (solution initiale de Balas‑Hammer)",
    type: "SteppingStoneInitial",
    previousCost: calculateTotalCost(currentAllocations, costs),
    stepDelta: 0,
    totalCost: calculateTotalCost(currentAllocations, costs)
  });

  let improved = true;
  while (improved) {
    improved = false;
    let bestDelta = Infinity; // ✅ Correct
    let bestPath = null;
    let bestCell = null;
    const allDeltas = [];

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (currentAllocations[i][j] !== null && currentAllocations[i][j] !== "ε") continue;
        const path = findClosedLoop(i, j, currentAllocations);
        if (!path) continue;

        let delta = 0;
        const formulaParts = [];

        for (let k = 0; k < path.length; k++) {
          const [pi, pj] = path[k];
          const cost = costs[pi][pj];
          const sign = k % 2 === 0 ? "+" : "-";
          formulaParts.push(`${sign}${cost}`);
          delta += (k % 2 === 0 ? 1 : -1) * cost;
        }

        let gainMin = Infinity;
        for (let k = 1; k < path.length; k += 2) {
          const [pi, pj] = path[k];
          const val = currentAllocations[pi][pj];
          if (typeof val === "number" && val < gainMin) gainMin = val;
        }

        const gain = delta * gainMin;
        const gainFormula = `gain(${String.fromCharCode(65 + i)}, ${j + 1}) = ${delta} × ${gainMin} = ${gain}`;

        allDeltas.push({
          cell: [i, j],
          path,
          delta,
          formula: `δ(${String.fromCharCode(65 + i)}, ${j + 1}) = ${formulaParts.join(" ")} = ${delta}`,
          gain,
          gainFormula
        });

        if (delta < bestDelta) {
          bestDelta = delta;
          bestPath = path;
          bestCell = [i, j];
          improved = true;
        }
      }
    }

    // ✅ Enregistrement même si pas d'amélioration
    if (!improved || !bestPath) {
      steps.push({
        allocations: currentAllocations.map(r => [...r]),
        offer: [...offer],
        demand: [...demand],
        costs,
        note: "Aucune amélioration possible — solution optimale trouvée.",
        type: "SteppingStoneFinal",
        deltas: allDeltas,
        previousCost: calculateTotalCost(currentAllocations, costs),
        stepDelta: 0,
        totalCost: calculateTotalCost(currentAllocations, costs),
        isFinalSteppingStoneStep: true
      });
      break;
    }

    let minQty = Infinity;
    for (let k = 1; k < bestPath.length; k += 2) {
      const [i, j] = bestPath[k];
      if (typeof currentAllocations[i][j] === "number") {
        minQty = Math.min(minQty, currentAllocations[i][j]);
      }
    }
    if (minQty === Infinity || minQty <= 0) break;

    const nextAllocations = currentAllocations.map(r => [...r]);
    for (let k = 0; k < bestPath.length; k++) {
      const [i, j] = bestPath[k];
      if (k % 2 === 0) {
        nextAllocations[i][j] =
          (nextAllocations[i][j] === null || nextAllocations[i][j] === "ε")
            ? minQty
            : nextAllocations[i][j] + minQty;
      } else {
        if (nextAllocations[i][j] === "ε") {
          nextAllocations[i][j] = null;
        } else {
          nextAllocations[i][j] -= minQty;
          if (nextAllocations[i][j] === 0) nextAllocations[i][j] = null;
        }
      }
    }

    const previousCost = calculateTotalCost(currentAllocations, costs);
    const newCost = calculateTotalCost(nextAllocations, costs);

    iterationCount++;
    steps.push({
      allocations: nextAllocations.map(r => [...r]),
      offer: [...offer],
      demand: [...demand],
      costs,
      note: `Itération ${iterationCount} : Δ = ${bestDelta} via (${String.fromCharCode(65 + bestCell[0])}, ${bestCell[1] + 1}), quantité transférée ${minQty}.`,
      deltas: allDeltas,
      minQtyApplied: minQty,
      bestCell,
      bestPath,
      type: "SteppingStoneIteration",
      previousCost,
      stepDelta: bestDelta,
      totalCost: newCost
    });

    currentAllocations = nextAllocations;
  }

  return steps;
}
