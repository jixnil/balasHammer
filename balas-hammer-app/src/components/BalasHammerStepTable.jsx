// src/components/BalasHammerStepTable.jsx
import React from 'react';
import { getRowChar } from './SharedUIHelpers'; // Import helper
import "./style/balas‑hammer.css";

export default function BalasHammerStepTable({ step, cols, rows, savedCosts, costs }) {
  const maxRowPen = step.penalties ? Math.max(...step.penalties.rowPen) : -1;
  const maxColPen = step.penalties ? Math.max(...step.penalties.colPen) : -1;

  return (
    <div className="bh-step-container">
      {/* First table: Difference Matrix and Allocations */}
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
              <th className="bh-header-cell">Pénalité Ligne</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => {
              const rowPen = step.penalties?.rowPen?.[i];
              const isRowActive = step.offer[i] > 0 || (step.penalties && rowPen !== -1);

              return (
                <tr key={`r1-${i}`}>
                  <td className="bh-header-cell">{getRowChar(i)}</td>
                  {Array.from({ length: cols }, (_, j) => {
                    const isColActive = step.demand[j] > 0 || (step.penalties && step.penalties.colPen?.[j] !== -1);
                    const alloc = step.allocations[i][j];
                    const isChosen = step.chosen?.[0] === i && step.chosen?.[1] === j;

                    // Cell is active if both its row and column are active
                    const isActiveCell = isRowActive && isColActive;

                    return (
                      <td key={`c1-${j}`} className={isChosen ? "cell-red" : ""}>
                        {isActiveCell ? (
                          <>
                            <span>{(savedCosts ?? costs)[i][j]}</span>
                            {(alloc != null && alloc !== 0) && (
                              <div className="bh-allocation">{alloc === "ε" ? "ε" : alloc}</div>
                            )}
                          </>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="diff-blue">
                    {rowPen === -1 ? "" : (rowPen === maxRowPen ? <span style={{ color: "red" }}>{rowPen}</span> : rowPen)}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="bh-header-cell">Pénalité Colonne</td>
              {Array.from({ length: cols }, (_, j) => {
                const colPen = step.penalties?.colPen?.[j];
                return (
                  <td key={`p1-${j}`} className="diff-blue">
                    {colPen === -1 ? "" : (colPen === maxColPen ? <span style={{ color: "red" }}>{colPen}</span> : colPen)}
                  </td>
                );
              })}
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Second table: Cost and Allocation (min(Offer, Demand)) */}
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
              <th className="bh-header-cell">Offre (Restant)</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={`r2-${i}`}>
                <td className="bh-header-cell">{getRowChar(i)}</td>
                {Array.from({ length: cols }, (_, j) => {
                  const alloc = step.allocations[i][j];
                  //const cost = (savedCosts ?? costs)[i][j];
                  return (
                  <td key={`c2-${j}`}>
                    {alloc != null && alloc !== 0 ? ( // This condition is fine for showing non-zero numbers and "ε"
                      <div>
                        {/* {cost} */}
                        <div className="bh-allocation">
                          <strong>{alloc === "ε" ? "ε" : alloc}</strong>
                        </div>
                      </div>
                    ) : null}
                  </td>
                );
              })}
                <td className="bh-offer-cell">{step.offer[i]}</td>
              </tr>
            ))}

            {/* Current demand row at step k */}
            <tr>
              <td className="bh-header-cell">Demande (Restant)</td>
              {Array.from({ length: cols }, (_, j) => (
                <td key={`nd2-${j}`} className="bh-demand-cell">{step.demand[j]}</td>
              ))}
              <td colSpan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}