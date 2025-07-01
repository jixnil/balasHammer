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
 */

/******************************
 * Helpers & Algo
 *****************************/
function clone2D(arr) {
  return arr.map((row) => [...row]);
}

// function getTwoMin(arr) {
//   const sorted = [...arr].sort((a, b) => a - b);
//   return [sorted[0], sorted[1] ?? sorted[0]];
// }

/**
 *  Balas‑Hammer (méthode de la pénalité maximale)
 *  — corrige :
 *    • accumulation d’allocations sur une même case
 *    • dépassement d’offre / demande
 *    • calcul sûr des pénalités quand il ne reste qu’un seul coût actif
 *    • copie défensive des tableaux d’offre / demande
 */
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
    if (iChosen === -1 || jChosen === -1) break; // sécurité

    const qty = Math.min(offer[iChosen], demand[jChosen]);
    if (qty <= 0) break; // sécurité contre boucle infinie

    allocations[iChosen][jChosen] = (allocations[iChosen][jChosen] ?? 0) + qty;

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
  // fige la matrice utilisée pour ce run
  setSavedCosts(costs.map(row => [...row]));   // ←  deep‑copy
  const s = balasHammer(costs, offer, demand); // ←  calcul avec ces coûts
  setSteps(s);
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
              const c = Number(e.target.value);
              setCols(c);
              setCosts((prev) =>
                prev.map((row) => [...row, ...Array(c - row.length).fill(0)])
              );
              setDemand(Array(c).fill(0));
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
                      value={(savedCosts ?? costs)[i][j]
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
            Étape {k + 1} {activeRows.length === 1 || activeCols.length === 1 ? "(Finale)" : ""}
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
          </div>
        </div>
      )}
    </div>
  );
}
