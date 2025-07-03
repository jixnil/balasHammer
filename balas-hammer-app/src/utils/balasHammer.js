// src/utils/balasHammerSolver.js

/**
 * Balas‑Hammer (méthode de la pénalité maximale)
 * — corrige :
 * • accumulation d’allocations sur une même case
 * • dépassement d’offre / demande
 * • calcul sûr des pénalités quand il ne reste qu’un seul coût actif
 * • copie défensive des tableaux d’offre / demande
 */
export function solveBalasHammer(costs, offerOrig, demandOrig) {
  const m = costs.length;
  const n = costs[0].length;

  // Copies locales pour ne jamais toucher aux états React
  let offer = [...offerOrig];
  let demand = [...demandOrig];

  // tableau m×n d’allocations (null = non affecté, nombre = qté, "ε" = dégénérescence)
  const allocations = Array.from({ length: m }, () => Array(n).fill(null));

  // Historique pour l’UI
  const steps = [];

  // Helper function: check if allocation is still possible
  function canAllocate() {
    return offer.some(o => o > 0) && demand.some(d => d > 0);
  }

  // Main loop
  while (canAllocate()) {
    // 1. Calculate penalties for rows and columns
    const rowPen = Array(m).fill(-1);
    const colPen = Array(n).fill(-1);

    for (let i = 0; i < m; i++) {
      if (offer[i] === 0) continue; // row exhausted
      const activeCostsInRow = [];
      for (let j = 0; j < n; j++) {
        if (demand[j] > 0) activeCostsInRow.push(costs[i][j]);
      }
      if (activeCostsInRow.length > 0) {
        activeCostsInRow.sort((a, b) => a - b);
        const min1 = activeCostsInRow[0];
        const min2 = activeCostsInRow.length > 1 ? activeCostsInRow[1] : activeCostsInRow[0];
        rowPen[i] = min2 - min1;
      }
    }

    for (let j = 0; j < n; j++) {
      if (demand[j] === 0) continue; // column satisfied
      const activeCostsInCol = [];
      for (let i = 0; i < m; i++) {
        if (offer[i] > 0) activeCostsInCol.push(costs[i][j]);
      }
      if (activeCostsInCol.length > 0) {
        activeCostsInCol.sort((a, b) => a - b);
        const min1 = activeCostsInCol[0];
        const min2 = activeCostsInCol.length > 1 ? activeCostsInCol[1] : activeCostsInCol[0];
        colPen[j] = min2 - min1;
      }
    }

    // 2. Choose max penalty
    const maxRowPen = Math.max(...rowPen);
    const maxColPen = Math.max(...colPen);

    if (maxRowPen === -1 && maxColPen === -1) break; // No more allocations possible

    let iChosen = -1, jChosen = -1;

    if (maxRowPen >= maxColPen) { // Row wins
      iChosen = rowPen.indexOf(maxRowPen);
      let minCost = Infinity;
      for (let j = 0; j < n; j++) {
        if (demand[j] > 0 && costs[iChosen][j] < minCost) {
          minCost = costs[iChosen][j];
          jChosen = j;
        }
      }
    } else { // Column wins
      jChosen = colPen.indexOf(maxColPen);
      let minCost = Infinity;
      for (let i = 0; i < m; i++) {
        if (offer[i] > 0 && costs[i][jChosen] < minCost) {
          minCost = costs[i][jChosen];
          iChosen = i;
        }
      }
    }

    // 3. Safe allocation within bounds
    if (iChosen === -1 || jChosen === -1) break;

    // Check if cell is already allocated (should not happen with correct logic flow, but as a safeguard)
    if (allocations[iChosen][jChosen] != null && allocations[iChosen][jChosen] !== "ε") {
      // console.warn(`⚠️ Multiple allocation detected on (${iChosen}, ${jChosen}). Stopping current allocation step.`);
      break;
    }

    const qty = Math.min(offer[iChosen], demand[jChosen]);
    if (qty <= 0) break; // No quantity to allocate

    allocations[iChosen][jChosen] = qty;

    offer[iChosen] -= qty;
    demand[jChosen] -= qty;

    // 4. Save for UI
    steps.push({
      allocations: allocations.map(row => [...row]),
      offer: [...offer],
      demand: [...demand],
      chosen: [iChosen, jChosen],
      penalties: { rowPen, colPen },
      note: `Allocation de ${qty} à (${String.fromCharCode(65 + iChosen)}, ${jChosen + 1})`
    });
  }

  // 5. Degeneracy: ensure m + n - 1 allocations
  const neededAllocations = m + n - 1;
  let currentAllocCount = allocations.flat().filter(v => v !== null && v !== "ε").length;

  while (currentAllocCount < neededAllocations) {
    let best = { i: -1, j: -1, cost: Infinity };
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        // Only consider non-allocated cells
        if (allocations[i][j] === null && costs[i][j] < best.cost) {
          best = { i, j, cost: costs[i][j] };
        }
      }
    }
    if (best.i === -1) break; // Safety break if no unallocated cell found

    allocations[best.i][best.j] = "ε";
    currentAllocCount++;
    steps.push({
      allocations: allocations.map(row => [...row]),
      offer: [...offer],
      demand: [...demand],
      chosen: null, // No specific cell chosen for allocation, just added epsilon
      penalties: null,
      note: `Dégénérescence: Ajout de ε à (${String.fromCharCode(65 + best.i)}, ${best.j + 1})`
    });
  }

  // Final step (summary)
  steps.push({
    allocations: allocations.map(row => [...row]),
    offer: [...offer],
    demand: [...demand],
    note: "Fin de l'algorithme — solution de base obtenue"
  });

  return steps;
}
export function calculateTotalCost(allocations, costs) {
    let totalCost = 0;
    const m = allocations.length;
    const n = allocations[0].length;

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            const allocationValue = allocations[i][j];
            const unitCost = costs[i][j];

            // Only consider allocated cells (where allocationValue is a number and not 0 or "ε")
            if (typeof allocationValue === 'number' && allocationValue > 0) {
                totalCost += allocationValue * unitCost;
            }
            // If you want to include epsilon costs (which are usually 0 in transportation,
            // but if they had a cost, you'd handle them here):
            // else if (allocationValue === "ε" && unitCost > 0) {
            //     // Decide how to handle epsilon if it carries a cost.
            //     // Typically, epsilon allocations don't add to cost for the purpose of Z.
            //     // If they are part of a degeneracy fix, their cost is implicitly 0.
            // }
        }
    }
    return totalCost;
}

