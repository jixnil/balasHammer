/* eslint-disable react-refresh/only-export-components */
import React, { useState } from "react";
import html2canvas from "html2canvas";
import "./balas‑hammer.css";
import jsPDF from "jspdf";

/**
 * Balas‑Hammer (méthode de différence maximale)
 * ‑‑
 * 1. Calculer pour chaque ligne/colonne la pénalité = diff. entre les 2 plus petits coûts.
 * 2. Sélectionner la pénalité max.
 * 3. Dans la ligne/colonne correspondante, choisir la cellule de coût minimal.
 * 4. Allouer min(Offre, Demande).
 * 5. Rayer ligne/colonne épuisée, répéter.
 *
 * Gestion de la dégénérescence si #allocations < m+n‑1, on ajoute des 0 (ε) dans les cases
 *    de coût minimal non encore allouées pour atteindre m+n‑1 allocations.
 * 
 * 6. Algorithme de stepping stone pour trouver la valeur minimal de Z.
 */

/******************************
 * Helpers & Algo
 *****************************/
function clone2D(arr) {
  return arr.map((row) => [...row]);
}

// function getTwoMin(arr) {
//   const sorted = [...arr].sort((a, b) => a - b);
//   return [sorted[0], sorted[1] ?? sorted[0]] ;
// }

/**
 *  Balas‑Hammer (méthode de la pénalité maximale)
 *  — corrige :
 *    • accumulation d’allocations sur une même case
 *    • dépassement d’offre / demande
 *    • calcul sûr des pénalités quand il ne reste qu’un seul coût actif
 *    • copie défensive des tableaux d’offre / demande
 */
function steppingStoneOptimize(allocations, costs, offer, demand) {
  const m = allocations.length;
  const n = allocations[0].length;
  const steps = [];
  let improved = true;

  console.log("Début Stepping Stone");

  while (improved) {
    improved = false;
    let bestDelta = 0;
    let bestPath = null;
    let bestCell = null;
    const allDeltas = [];

    console.log("Recherche de cycles pour chaque cellule non allouée...");

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (allocations[i][j] != null) {
          // Cellule déjà allouée
          continue;
        }

        const path = findClosedLoop(i, j, allocations);
        if (!path) {
          console.log(`  Pas de cycle fermé pour cellule (${i}, ${j})`);
          continue;
        }

        let delta = 0;
        const formula = [];

        for (let k = 0; k < path.length; k++) {
          const [pi, pj] = path[k];
          const cost = costs[pi][pj];
          const sign = k % 2 === 0 ? "+" : "-";
          formula.push(`${sign}${cost}`);
          delta += (k % 2 === 0 ? 1 : -1) * cost;
        }

        console.log(`  Cycle trouvé pour cellule (${i}, ${j}) avec Δ = ${delta}`);
        console.log(`    Formule: δ(${String.fromCharCode(65 + i)}, ${j + 1}) = ${formula.join(" ")} = ${delta}`);

        allDeltas.push({
          cell: [i, j],
          path,
          delta,
          formula: `δ(${String.fromCharCode(65 + i)}, ${j + 1}) = ` + formula.join(" ") + ` = ${delta}`
        });

        if (delta < bestDelta) {
          console.log(`  Nouvelle meilleure amélioration: Δ = ${delta} sur cellule (${i}, ${j})`);
          bestDelta = delta;
          bestPath = path;
          bestCell = [i, j];
          improved = true;
        }
      }
    }

    if (improved && bestPath) {
      console.log(`Application de l'amélioration Δ = ${bestDelta} via cellule (${String.fromCharCode(65 + bestCell[0])}, ${bestCell[1] + 1})`);

      let minQty = Infinity;
      for (let k = 1; k < bestPath.length; k += 2) {
        const [i, j] = bestPath[k];
        if (allocations[i][j] !== "ε") {
          minQty = Math.min(minQty, allocations[i][j]);
        }
      }
      console.log(`  Quantité minimale à ajuster sur le chemin: ${minQty}`);

      for (let k = 0; k < bestPath.length; k++) {
        const [i, j] = bestPath[k];
        if (k % 2 === 0) {
          allocations[i][j] = (allocations[i][j] ?? 0) + minQty;
        } else {
          if (allocations[i][j] !== "ε") {
            allocations[i][j] -= minQty;
            if (allocations[i][j] === 0) allocations[i][j] = null;
          }
        }
      }

      steps.push({
        allocations: allocations.map(row => [...row]),
        offer: [...offer],
        demand: [...demand],
        note: `Amélioration Stepping Stone avec Δ = ${bestDelta} via cellule (${String.fromCharCode(65 + bestCell[0])}, ${bestCell[1] + 1})`,
        deltas: allDeltas
      });
    } else {
      console.log("Aucune amélioration possible détectée, fin du Stepping Stone.");
    }
  }

  console.log("Fin Stepping Stone");
  return steps;
}
export function findClosedLoop(startI, startJ, allocations) {
  const m = allocations.length;
  const n = allocations[0].length;

  const path = [[startI, startJ]];
  const visited = new Set();

  function dfs(i, j, isRow, depth) {
  const key = `${i},${j},${isRow}`;
  console.log(`DFS: Profondeur ${depth}, position (${i},${j}), mode ${isRow ? 'ligne' : 'colonne'}`);

  if (visited.has(key)) {
    console.log(`  -> Déjà visité (${key}), retour en arrière`);
    return false;
  }

  // Retour au point de départ (cycle fermé), si profondeur >=4
  if (depth >= 4 && i === startI && j === startJ) {
    console.log(`  -> Cycle fermé trouvé à (${i},${j}) avec profondeur ${depth}`);
    return true;
  }

  visited.add(key);

  if (isRow) {
    for (let jj = 0; jj < n; jj++) {
      if (jj === j) continue;
      // autoriser retour au départ même si allocation nulle
      if ((allocations[i][jj] > 0) || (i === startI && jj === startJ)) {
        console.log(`  Exploration vers (${i},${jj}) en colonne`);
        path.push([i, jj]);
        if (dfs(i, jj, false, depth + 1)) return true;
        path.pop();
        console.log(`  Retour arrière depuis (${i},${jj}) en colonne`);
      }
    }
  } else {
    for (let ii = 0; ii < m; ii++) {
      if (ii === i) continue;
      if ((allocations[ii][j] > 0) || (ii === startI && j === startJ)) {
        console.log(`  Exploration vers (${ii},${j}) en ligne`);
        path.push([ii, j]);
        if (dfs(ii, j, true, depth + 1)) return true;
        path.pop();
        console.log(`  Retour arrière depuis (${ii},${j}) en ligne`);
      }
    }
  }

  visited.delete(key);
  console.log(`  Fin exploration position (${i},${j}), suppression de ${key} des visités`);
  return false;
}


  console.log(`Début recherche cycle à partir de (${startI},${startJ})`);
  if (dfs(startI, startJ, true, 1)) {
    console.log(`Cycle trouvé: ${JSON.stringify(path)}`);
    return [...path];
  }
  console.log(`Aucun cycle trouvé à partir de (${startI},${startJ})`);
  return null;
}


function balasHammer(costs, offerOrig, demandOrig) {
  const m = costs.length;
  const n = costs[0].length;

  // Copies locales pour ne jamais toucher aux états React
  let offer  = [...offerOrig];
  let demand = [...demandOrig];

  // tableau m×n d’allocations (null = non affecté, nombre = qté, "ε" = dégénérescence)
  const allocations = Array.from({ length: m }, () => Array(n).fill(null));

  // Historique pour l’UI
  const steps = [];

  // Fonction helper : vérifier si on peut encore allouer
  function canAllocate() {
    return offer.some(o => o > 0) && demand.some(d => d > 0);
  }

  // Boucle principale
  while (canAllocate()) {
    // 1. Calcul des pénalités pour lignes et colonnes
    const rowPen = Array(m).fill(-1);
    const colPen = Array(n).fill(-1);

    for (let i = 0; i < m; i++) {
      if (offer[i] === 0) continue; // ligne épuisée
      const actifs = [];
      for (let j = 0; j < n; j++) {
        if (demand[j] > 0) actifs.push(costs[i][j]);
      }
      if (actifs.length > 0) {
        actifs.sort((a, b) => a - b);
        const min1 = actifs[0];
        const min2 = actifs.length > 1 ? actifs[1] : actifs[0];
        rowPen[i] = min2 - min1;
      }
    }

    for (let j = 0; j < n; j++) {
      if (demand[j] === 0) continue; // colonne satisfaite
      const actifs = [];
      for (let i = 0; i < m; i++) {
        if (offer[i] > 0) actifs.push(costs[i][j]);
      }
      if (actifs.length > 0) {
        actifs.sort((a, b) => a - b);
        const min1 = actifs[0];
        const min2 = actifs.length > 1 ? actifs[1] : actifs[0];
        colPen[j] = min2 - min1;
      }
    }

    // 2. Choix de la pénalité max
    const maxRowPen = Math.max(...rowPen);
    const maxColPen = Math.max(...colPen);

    if (maxRowPen === -1 && maxColPen === -1) break; // Plus d’allocation possible

    let iChosen = -1, jChosen = -1;

    if (maxRowPen >= maxColPen) { // Ligne gagnante
      iChosen = rowPen.indexOf(maxRowPen);
      let minCost = Infinity;
      for (let j = 0; j < n; j++) {
        if (demand[j] > 0 && costs[iChosen][j] < minCost) {
          minCost = costs[iChosen][j];
          jChosen = j;
        }
      }
    } else { // Colonne gagnante
      jChosen = colPen.indexOf(maxColPen);
      let minCost = Infinity;
      for (let i = 0; i < m; i++) {
        if (offer[i] > 0 && costs[i][jChosen] < minCost) {
          minCost = costs[i][jChosen];
          iChosen = i;
        }
      }
    } 

    // 3. Allocation sûre et dans les bornes
   // 3. Allocation sûre et dans les bornes
if (iChosen === -1 || jChosen === -1) break;

if (allocations[iChosen][jChosen] != null) {
  console.warn(`⚠️ Allocation multiple détectée sur (${iChosen}, ${jChosen})`);
  break; // ou continue
}

const qty = Math.min(offer[iChosen], demand[jChosen]);
if (qty <= 0) break;

allocations[iChosen][jChosen] = qty;

offer[iChosen] -= qty;
demand[jChosen] -= qty;


    // 4. Sauvegarde pour l’interface
    steps.push({
      allocations: allocations.map(row => [...row]),
      offer      : [...offer],
      demand     : [...demand],
      chosen     : [iChosen, jChosen],
      penalties  : { rowPen, colPen },
      note       : `Allocation de ${qty}`
    });
  }

  // 5. Dégénérescence : s’assurer d’avoir m + n - 1 allocations
  const needed = m + n - 1;
  let allocCount = allocations.flat().filter(v => v !== null).length;

  while (allocCount < needed) {
    let best = { i: -1, j: -1, cost: Infinity };
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (allocations[i][j] === null && costs[i][j] < best.cost) {
          best = { i, j, cost: costs[i][j] };
        }
      }
    }
    if (best.i === -1) break; // sécurité
    allocations[best.i][best.j] = "ε";
    allocCount++;
  }

  steps.push({
    allocations: allocations.map(row => [...row]),
    offer      : [...offer],
    demand     : [...demand],
    note       : "Fin de l'algorithme — solution de base obtenue"
  });
for (let i = 0; i < m; i++) {
  for (let j = 0; j < n; j++) {
    const val = allocations[i][j];
    if (typeof val === "number" && val > Math.min(offerOrig[i], demandOrig[j])) {
      console.warn(`⚠️ Suspicion de cumul trop grand en (${i}, ${j}) : ${val}`);
    }
  }
}

  return steps;
}


// function getCumulativeAllocation(steps, i, j, upToStep) {
//   let sum = 0;
//   for (let idx = 0; idx <= upToStep; idx++) {
//     const alloc = steps[idx].allocations[i][j];
//     if (alloc != null && alloc !== "ε") {
//       sum += alloc;
//     }
//   }
//   return sum;
// }

function computeZ(costs, alloc) {
  let z = 0;
  for (let i = 0; i < costs.length; i++) {
    for (let j = 0; j < costs[0].length; j++) {
      if (alloc[i][j] != null && alloc[i][j] !== "ε") {
        z += costs[i][j] * alloc[i][j];
      }
    }
  }
  return z;
}

/******************************
 * UI component
 *****************************/

const defaultRows = 4;
const defaultCols = 6;

export default function BalasHammerApp() {
  const [rows, setRows] = useState(defaultRows);
  const [cols, setCols] = useState(defaultCols);
  const [costs, setCosts] = useState(
    Array.from({ length: defaultRows }, () => Array(defaultCols).fill(0))
  );
  const [offer, setOffer] = useState(Array(defaultRows).fill(0));
  const [demand, setDemand] = useState(Array(defaultCols).fill(0));
  const [steps, setSteps] = useState([]);
  //const [stepIdx, setStepIdx] = useState(0);

  //    const current = steps[stepIdx] ?? null;

  /** Handlers **/
  const handleCostChange = (i, j, v) => {
    const cpy = clone2D(costs);
    cpy[i][j] = Number(v);
    setCosts(cpy);
  };
const [savedCosts, setSavedCosts] = useState(null);

const handleRun = () => {
  setSavedCosts(costs.map(row => [...row]));
  const initialSteps = balasHammer(costs, offer, demand);

  const finalAlloc = initialSteps.at(-1).allocations.map(row => [...row]);
  const steppingSteps = steppingStoneOptimize(finalAlloc, costs, offer, demand);

  setSteps([...initialSteps, ...steppingSteps]);
};


  const exportPDF = async () => {
    const element = document.getElementById("result-table");
    if (!element) return;
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape" });
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("balas_hammer_solution.pdf");
  };

  /********************** RENDU **********************/
   return (
    <div className="bh-wrapper">
      <h1 className="bh-title">ALGORITHME ‑ Balas-Hammer</h1>
      <div className="bh-banner">
        Méthode de différence maximale (Algorithme de Balas-Hammer)
      </div>

      {/* Paramètres */}
      <div className="bh-grid2">
        <label className="bh-label">
          Lignes (sources)
          <input
            type="number"
            value={rows}
           onChange={(e) => {
  const r = Number(e.target.value);
  setRows(r);
  setCosts(Array.from({ length: r }, () => Array(cols).fill(0)));
  setOffer(Array(r).fill(0));
  setSteps([]);       // ← pour éviter affichage d'étapes invalides
  setSavedCosts(null);
}}

            className="bh-input"
          />
        </label>

        <label className="bh-label">
          Colonnes (destinations)
          <input
            type="number"
            value={cols}
            onChange={(e) => {
  let c = Number(e.target.value);
  if (c < 1) c = 1;  // minimum 1 colonne

  setCols(c);

  setCosts(prev =>
    Array.from({ length: rows }, (_, i) => {
      const oldRow = prev[i] || [];
      if (c > oldRow.length) {
        // Ajout de colonnes avec des zéros
        return [...oldRow, ...Array(c - oldRow.length).fill(0)];
      } else {
        // Tronquer les colonnes en trop
        return oldRow.slice(0, c);
      }
    })
  );

  setDemand(Array(c).fill(0));
  setSteps([]);
  setSavedCosts(null);
}}


            className="bh-input"
          />
        </label>
      </div>

      {/* Matrice des coûts */}
      <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
        <table className="bh-table">
          <thead>
            <tr>
              <th></th>
              {Array.from({ length: cols }).map((_, j) => (
                <th key={j}>{j + 1}</th>
              ))}
              <th>  </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                <td style={{ fontWeight: "600" }}>
                  {String.fromCharCode(65 + i)}
                </td>
                {Array.from({ length: cols }).map((_, j) => (
                  <td key={j}>
                    <input
                      type="number"
                      value={costs[i][j] ?? 0
}
                      onChange={(e) => handleCostChange(i, j, e.target.value)}
                      className="bh-input"
                      style={{ width: "4.5rem" }}
                    />
                  </td>
                ))}
                <td>
                  <input
                    type="number"
                    value={offer[i]}
                    onChange={(e) => {
                      const o = [...offer];
                      o[i] = Number(e.target.value);
                      setOffer(o);
                    }}
                    className="bh-input"
                    style={{ width: "5.5rem", color: "#b30000", fontWeight: 700 }}
                  />
                </td>
              </tr>
            ))}

            {/* ligne demande */}
            <tr>
              <td style={{ fontWeight: "600" }}>  </td>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j}>
                  <input
                    type="number"
                    value={demand[j]}
                    onChange={(e) => {
                      const d = [...demand];
                      d[j] = Number(e.target.value);
                      setDemand(d);
                    }}
                    className="bh-input"
                    style={{ width: "4.5rem", color: "#b30000", fontWeight: 700 }}
                  />
                </td>
              ))}
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Boutons */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <button onClick={handleRun} className="bh-btn bh-run">
          Résoudre
        </button>

        {steps.length > 0 && (
          <button onClick={exportPDF} className="bh-btn bh-pdf" style={{ marginLeft: ".75rem" }}>
            Exporter PDF
          </button>
        )}
      </div>

      {/* === RÉSULTATS === */}
      {steps.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", justifyContent: "center" }}>
          {/* Graphe final */}
          <svg
            width="400"
            height={Math.max(rows, cols) * 80}
            className="bh-svg"
          >
            {/* sources */}
            {Array.from({ length: rows }).map((_, i) => (
              <g key={i}>
                <circle cx={60} cy={i * 80 + 40} r={20} fill="#f0f0f0" stroke="#333" />
                <text x={60} y={i * 80 + 45} textAnchor="middle" fontWeight="bold">
                  {String.fromCharCode(65 + i)}
                </text>
              </g>
            ))}
            {/* destinations */}
            {Array.from({ length: cols }).map((_, j) => (
              <g key={j}>
                <circle cx={340} cy={j * 80 + 40} r={20} fill="#f0f0f0" stroke="#333" />
                <text x={340} y={j * 80 + 45} textAnchor="middle" fontWeight="bold">
                  {j + 1}
                </text>
              </g>
            ))}
            {/* liaisons */}
            {steps.at(-1).allocations.map((row, i) =>
              row.map((alloc, j) => {
                if (alloc != null && alloc !== 0)
                  return (
                    <g key={`${i}-${j}`}>
                      <line x1={80} y1={i * 80 + 40} x2={320} y2={j * 80 + 40}
                            stroke="#888" strokeWidth="2" />
                      <text
                        x={200} y={(i * 80 + j * 80) / 2 + 40 - 5}
                        fill="#c00" fontWeight="700" textAnchor="middle"
                      >
                        {alloc}
                      </text>
                    </g>
                  );
                return null;
              })
            )}
          </svg>

          {/* Étapes */}
          <div id="result-table" style={{ flex: "1 1 480px" }}>
           {steps.length > 0 && (
  <div style={{ width: '100%' }}>
    {steps.map((step, k) => {
      const maxRow = step.penalties ? Math.max(...step.penalties.rowPen) : -1;
      const maxCol = step.penalties ? Math.max(...step.penalties.colPen) : -1;
      
      const activeRows = step.offer.map((o, i) => o > 0 ? i : null).filter(i => i !== null);
       const activeCols = step.demand.map((d, j) => d > 0 ? j : null).filter(j => j !== null);


      return (
        <div key={k} className="bh-step">
          <h3 style={{ textAlign: "center", fontWeight: 700, marginBottom: "1.5rem" }}>
            Étape {k + 1} {activeRows.length === 1 || activeCols.length === 1 }
          </h3>

          <div className="bh-step-container">
           {/* Premier tableau : Matrice des différences et allocations */}
<div className="bh-table-container">
  <h4 style={{ textAlign: "center", marginBottom: "0.5rem" }}>
    Matrice des différences et allocations
  </h4>
  <table className="bh-matrix-table">
    <thead>
      <tr>
        <th className="bh-header-cell"></th>
        {Array.from({ length: cols }, (_, j) => (
          <th key={`h1-${j}`} className="bh-header-cell">{j + 1}</th>
        ))}
        <th className="bh-header-cell">  </th>
      </tr>
    </thead>
    <tbody>
      {Array.from({ length: rows }, (_, i) => {
        const rowPen = step.penalties?.rowPen?.[i];

        return (
          <tr key={`r1-${i}`}>
            <td className="bh-header-cell">{String.fromCharCode(65 + i)}</td>
            {Array.from({ length: cols }, (_, j) => {
              const colPen = step.penalties?.colPen?.[j];
              const isRowActive = rowPen !== -1;
              const isColActive = colPen !== -1;

              const alloc = step.allocations[i][j];
              const isChosen = step.chosen?.[0] === i && step.chosen?.[1] === j;

              // cellule active = ni ligne ni colonne saturée
              const isActive = isRowActive && isColActive;

              return (
                <td
                  key={`c1-${j}`}
                  className={isChosen ? "cell-red" : ""}
                >
                  {isActive ? (
                    <>
                      <span>{(savedCosts ?? costs)[i][j]
}</span>
                      {alloc != null && (
                        <div className="bh-allocation">{alloc}</div>
                      )}
                    </>
                  ) : null}
                </td>
              );
            })}
           <td className="diff-blue">
  {rowPen === -1 ? (
    ""
  ) : rowPen === maxRow ? (
    <span style={{ color: "red" }}>{rowPen}</span>  // nombre en rouge si max
  ) : (
    rowPen  // sinon nombre bleu (via la classe diff-blue)
  )}
</td>

          </tr>
        );
      })}
      <tr>
        <td className="bh-header-cell">  </td>
        {Array.from({ length: cols }, (_, j) => {
          const colPen = step.penalties?.colPen?.[j];
          return (
            <td key={`p1-${j}`} className="diff-blue">
  {colPen === -1 ? (
    ""
  ) : colPen === maxCol ? (
    <span style={{ color: "red" }}>{colPen}</span>  // nombre en rouge si max
  ) : (
    colPen
  )}
</td>

          );
        })}
        <td></td>
      </tr>
    </tbody>
  </table>
</div>
          {/* Deuxième tableau : coût et min(Offre, Demande) au moment de l'allocation */}
<div className="bh-table-container">
  <h4 style={{ textAlign: "center", marginBottom: "0.5rem" }}>
    Matrice avec coût et allocation (min(Offre, Demande))
  </h4>
  <table className="bh-matrix-table">
    <thead>
      <tr>
        <th className="bh-header-cell"></th>
        {Array.from({ length: cols }, (_, j) => (
          <th key={`h2-${j}`} className="bh-header-cell">{j + 1}</th>
        ))}
        <th className="bh-header-cell"> </th>
      </tr>
    </thead>
    <tbody>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={`r2-${i}`}>
          <td className="bh-header-cell">{String.fromCharCode(65 + i)}</td>

          {Array.from({ length: cols }, (_, j) => {
            let content = null;

            for (let s = 0; s <= k; s++) {
              const step = steps[s];
              const [ci, cj] = step.chosen ?? [-1, -1];
              const quantity = step.allocations[i][j];

              // si cette cellule a été choisie à cette étape
              if (ci === i && cj === j && quantity > 0) {
                const cost = (savedCosts ?? costs)[i][j]
;
                content = (
                  <div>
                    {cost}
                    <div className="bh-allocation"><strong>{quantity}</strong></div>
                  </div>
                );
                break; // on prend uniquement la première étape où la cellule est choisie
              }
            }

            return (
              <td key={`c2-${j}`}>
                {content}
              </td>
            );
          })}

          <td className="bh-offer-cell">{steps[k].offer[i]}</td>
        </tr>
      ))}

      {/* Ligne Demande actuelle à l’étape k */}
      <tr>
        <td className="bh-header-cell"> </td>
        {Array.from({ length: cols }, (_, j) => (
          <td key={`nd2-${j}`} className="bh-demand-cell">{steps[k].demand[j]}</td>
        ))}
        <td colSpan="2"></td>
      </tr>
    </tbody>
  </table>
</div>
            </div>
            

          {/* Note et Z final */}
          <p style={{ textAlign: "center", fontStyle: "italic", margin: "1rem 0" }}>
            {step.note}
          </p>

          {k === steps.length - 1 && (
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <div className="bh-z">Coût total Z = {computeZ(savedCosts ?? costs, step.allocations)}</div>
              <div style={{ marginTop: "0.5rem" }}>
                {step.allocations.flatMap((row, i) =>
                  row.map((q, j) => q != null && q !== 0
                    ? `${(savedCosts ?? costs)[i][j]}×${q}`
                    : null
                  )
                ).filter(Boolean).join(" + ")}
              </div>
            </div>
          )}
        </div>
      ); 
    })}
    
  </div>
)}
{steps.deltas && steps.deltas.length > 0 && (
  <div style={{ marginTop: "1rem" }}>
    <h4 style={{ textAlign: "center" }}>Calculs des δ(x, y)</h4>
    <table className="bh-delta-table">
      <thead>
        <tr>
          <th>Cellule</th>
          <th>Cycle fermé</th>
          <th>Formule</th>
          <th>Δ</th>
        </tr>
      </thead>
      <tbody>
        {steps.deltas.map(({ cell, path, formula, delta }, idx) => (
          <tr key={idx}>
            <td>({String.fromCharCode(65 + cell[0])}, {cell[1] + 1})</td>
            <td>
              {path.map(([i, j]) => `(${String.fromCharCode(65 + i)}, ${j + 1})`).join(" → ")}
            </td>
            <td>{formula}</td>
            <td style={{ color: delta < 0 ? "red" : "black" }}>{delta}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}


          </div>
        </div>
      )}
    </div>
  );
}
