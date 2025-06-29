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

function getTwoMin(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  return [sorted[0], sorted[1] ?? sorted[0]];
}

/**
 * Exécute l'algorithme et renvoie un tableau d'étapes ;
 * chaque étape = { allocations, offer, demand, chosen, penalties, note }
 */
function balasHammer(costs, offerOrig, demandOrig) {
  const m = costs.length;
  const n = costs[0].length;
  let offer = [...offerOrig];
  let demand = [...demandOrig];
  const allocations = Array.from({ length: m }, () => Array(n).fill(null));

  const steps = [];

  while (offer.some((o) => o > 0) && demand.some((d) => d > 0)) {
    // 1. pénalités lignes & colonnes
    const rowPen = costs.map((row, i) => {
      if (offer[i] === 0) return -1; // déjà épuisée
      const [min1, min2] = getTwoMin(row.filter((_, j) => demand[j] > 0));
      return min2 - min1;
    });
    const colPen = costs[0].map((_, j) => {
      if (demand[j] === 0) return -1;
      const col = costs.map((row) => row[j]);
      const [min1, min2] = getTwoMin(col.filter((_, i) => offer[i] > 0));
      return min2 - min1;
    });

    const maxRowPen = Math.max(...rowPen);
    const maxColPen = Math.max(...colPen);

    let chosenRow = null,
      chosenCol = null;

    if (maxRowPen >= maxColPen) {
      chosenRow = rowPen.indexOf(maxRowPen);
      // cellule de coût minimal dans cette ligne parmi colonnes dispos
      const minCost = Math.min(
        ...costs[chosenRow].filter((_, j) => demand[j] > 0)
      );
      chosenCol = costs[chosenRow].findIndex(
        (c, j) => c === minCost && demand[j] > 0
      );
    } else {
      chosenCol = colPen.indexOf(maxColPen);
      // coût min dans cette colonne parmi lignes dispos
      const column = costs.map((row) => row[chosenCol]);
      const minCost = Math.min(...column.filter((_, i) => offer[i] > 0));
      chosenRow = column.findIndex((c, i) => c === minCost && offer[i] > 0);
    }

    const quantity = Math.min(offer[chosenRow], demand[chosenCol]);
    allocations[chosenRow][chosenCol] = quantity;

    offer[chosenRow] -= quantity;
    demand[chosenCol] -= quantity;

    steps.push({
      allocations: clone2D(allocations),
      offer: [...offer],
      demand: [...demand],
      chosen: [chosenRow, chosenCol],
      penalties: { rowPen, colPen },
      note: `Allocation de ${quantity}`,
    });
  }

  /* Gestion dégénérescence */
  const needed = m + n - 1;
  let currentAllocs = allocations.flat().filter((x) => x !== null).length;
  while (currentAllocs < needed) {
    // trouver la coût minimal restant
    let best = { i: -1, j: -1, cost: Infinity };
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (allocations[i][j] === null && costs[i][j] < best.cost) {
          best = { i, j, cost: costs[i][j] };
        }
      }
    }
    allocations[best.i][best.j] = 0; // epsilon
    currentAllocs++;
  }

  steps.push({
    allocations: clone2D(allocations),
    offer: [...offer],
    demand: [...demand],
    chosen: null,
    penalties: null,
    note: "Fin de l'algorithme — solution de base obtenue",
  });

  return steps;
}

function computeZ(costs, alloc) {
  let z = 0;
  for (let i = 0; i < costs.length; i++) {
    for (let j = 0; j < costs[0].length; j++) {
      if (alloc[i][j] != null) z += costs[i][j] * alloc[i][j];
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
  const [offerOrig] = useState([...offer]); // Ajoutez cette ligne
  const [demandOrig] = useState([...demand]); // Ajoutez cette ligne
  const [steps, setSteps] = useState([]);
  //const [stepIdx, setStepIdx] = useState(0);

  //    const current = steps[stepIdx] ?? null;

  /** Handlers **/
  const handleCostChange = (i, j, v) => {
    const cpy = clone2D(costs);
    cpy[i][j] = Number(v);
    setCosts(cpy);
  };

  const handleRun = () => {
    const s = balasHammer(costs, offer, demand);
    setSteps(s);
    //setStepIdx(s.length - 1); // aller à la solution finale directement
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
      <h1 className="bh-title">ALGORITHME ‑ Balas Hammer</h1>
      <div className="bh-banner">
        Méthode de différence maximale (Algorithme de Balas‑Hammer)
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
                      value={costs[i][j]}
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
            {/* Premier tableau : Matrice avec différences et allocations */}
            <div className="bh-table-container">
              <h4 style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                Matrice des différences et allocations
              </h4>
              <table className="bh-matrix-table">
                <thead>
                  <tr>
                    <th className="bh-header-cell"></th>
                    {activeCols.map(j => (
                      <th key={`h1-${j}`} className="bh-header-cell">{j + 1}</th>
                    ))}
                    <th className="bh-header-cell">Diff. ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map(i => {
                    const rowPen = step.penalties?.rowPen[i];
                    return (
                      <tr key={`r1-${i}`}>
                        <td className="bh-header-cell">{String.fromCharCode(65 + i)}</td>
                        {activeCols.map(j => {
                          const alloc = step.allocations[i][j];
                          return (
                            <td key={`c1-${j}`}>
                              {costs[i][j]}
                              {alloc != null && (
                                <span className="bh-allocation">{alloc}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className={`bh-penalty ${rowPen === maxRow ? "bh-max-penalty" : ""}`}>
                          {rowPen === maxRow ? (
                            <strong>{rowPen} (max)</strong>
                          ) : rowPen}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="bh-header-cell">Diff. colonne</td>
                    {activeCols.map(j => {
                      const colPen = step.penalties?.colPen[j];
                      return (
                        <td key={`p1-${j}`} className={`bh-penalty ${colPen === maxCol ? "bh-max-penalty" : ""}`}>
                          {colPen === maxCol ? (
                            <strong>{colPen} (max)</strong>
                          ) : colPen}
                        </td>
                      );
                    })}
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

             {/* Deuxième tableau modifié : Matrice complète avec allocations et mises à jour */}
              <div className="bh-table-container">
                <h4 style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                  Matrice avec allocations et mises à jour
                </h4>
                <table className="bh-matrix-table">
                  <thead>
                    <tr>
                      <th className="bh-header-cell"></th>
                      {activeCols.map(j => (
                        <th key={`h2-${j}`} className="bh-header-cell">{j + 1}</th>
                      ))}
                      <th className="bh-header-cell">Offre Orig.</th>
                      <th className="bh-header-cell">Nouv. Offre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRows.map(i => {
                      const isChosenRow = step.chosen && step.chosen[0] === i;
                      return (
                        <tr key={`r2-${i}`}>
                          <td className="bh-header-cell">{String.fromCharCode(65 + i)}</td>
                          {activeCols.map(j => {
                            const isChosen = isChosenRow && step.chosen[1] === j;
                            const alloc = step.allocations[i][j];
                            const isMin = isChosen && (
                              step.penalties?.rowPen[i] === maxRow || 
                              step.penalties?.colPen[j] === maxCol
                            );
                            
                            return (
                              <td 
                                key={`c2-${j}`} 
                                className={isChosen ? "bh-chosen-cell" : ""}
                              >
                                <div style={{ position: "relative" }}>
                                  {isMin ? (
                                    <strong style={{ color: "#006600" }}>{costs[i][j]} (min)</strong>
                                  ) : costs[i][j]}
                                  {alloc != null && (
                                    <span className="bh-allocation">{alloc}</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="bh-offer-cell">{offerOrig[i]}</td>
                          <td className="bh-offer-cell">
                            {step.offer[i]}
                            <span style={{ color: "#888", marginLeft: "4px" }}>
                              (-{offerOrig[i] - step.offer[i]})
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td className="bh-header-cell">Demande Orig.</td>
                      {activeCols.map(j => (
                        <td key={`d2-${j}`} className="bh-demand-cell">{demandOrig[j]}</td>
                      ))}
                      <td colSpan="2"></td>
                    </tr>
                    <tr>
                      <td className="bh-header-cell">Nouv. Demande</td>
                      {activeCols.map(j => (
                        <td key={`nd2-${j}`} className="bh-demand-cell">
                          {step.demand[j]}
                          <span style={{ color: "#888", marginLeft: "4px" }}>
                            (-{demandOrig[j] - step.demand[j]})
                          </span>
                        </td>
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
              <div className="bh-z">Coût total Z = {computeZ(costs, step.allocations)}</div>
              <div style={{ marginTop: "0.5rem" }}>
                {step.allocations.flatMap((row, i) =>
                  row.map((q, j) => q != null && q !== 0
                    ? `${costs[i][j]}×${q}`
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
