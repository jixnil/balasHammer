// src/components/SteppingStoneStepDisplay.jsx
import React from 'react';
import { getRowChar } from './SharedUIHelpers';
import "./style/balas‑hammer.css";

export default function SteppingStoneStepDisplay({ step, cols, rows, savedCosts }) {
  const currentAllocations = step.allocations;
  const originalCosts = savedCosts;

  return (
    <div className="bh-step-container">
      <h3 style={{ textAlign: "center", marginBottom: "0.5rem", color: "#0056b3" }}>
        {step.note || "Étape Stepping Stone"}
      </h3>

      {/* Table for current Allocations */}
      <div className="bh-table-container">
        <h4 style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          Matrice des Allocations Actuelles
        </h4>
        <table className="bh-matrix-table">
          <thead>
            <tr>
              <th className="bh-header-cell"></th>
              {Array.from({ length: cols }, (_, j) => (
                <th key={`h-${j}`} className="bh-header-cell">{j + 1}</th>
              ))}
              <th className="bh-header-cell">Offre</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={`r-${i}`}>
                <td className="bh-header-cell">{getRowChar(i)}</td>
                {Array.from({ length: cols }, (_, j) => {
                  const alloc = currentAllocations[i][j];
                  const cost = originalCosts[i][j];
                  const isBestCell = step.bestCell && step.bestCell[0] === i && step.bestCell[1] === j;
                  const isInBestPath = step.bestPath && step.bestPath.some(p => p[0] === i && p[1] === j);

                  let cellClassName = "";
                  if (isBestCell) {
                      cellClassName = "cell-red-border"; // Highlights the chosen non-basic cell
                  } else if (isInBestPath) {
                      const pathIndex = step.bestPath.findIndex(p => p[0] === i && p[1] === j);
                      if (pathIndex !== -1) {
                          // This is where the magic happens: even indices are '+', odd indices are '-'
                          cellClassName = pathIndex % 2 === 0 ? "cell-path-plus" : "cell-path-minus";
                      }
                  }

                  return (
                    <td key={`c-${j}`} className={cellClassName}>
                      {/* Display cost (top left) and allocation (bottom right) */}
                      <span className="cost-display">{cost}</span>
                      {(alloc !== null && alloc !== 0) ? ( // Condition to display allocation, including "ε"
                        <div className="bh-allocation">
                          <strong>{alloc === "ε" ? "ε" : alloc}</strong>
                        </div>
                      ) : (
                          // Optionally display a placeholder like '0' for clarity if unallocated
                          // For a more explicit "empty" cell, just leave this `null`
                          null
                      )}
                    </td>
                  );
                })}
                <td className="bh-offer-cell">{step.offer[i]}</td>
              </tr>
            ))}
            <tr>
              <td className="bh-header-cell">Demande</td>
              {Array.from({ length: cols }, (_, j) => (
                <td key={`d-${j}`} className="bh-demand-cell">{step.demand[j]}</td>
              ))}
              <td colSpan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Deltas Calculation Section */}
      {step.deltas && step.deltas.length > 0 && (
        <div className="bh-deltas-section">
          <h4>Calcul des Deltas pour cette itération:</h4>
          <ul>
            {step.deltas.map((delta, index) => (
              <li key={`delta-${index}`} className={delta.delta < 0 ? "delta-negative" : ""}>
                {delta.formula}
                {step.bestCell && delta.cell[0] === step.bestCell[0] && delta.cell[1] === step.bestCell[1] && (
                    <span style={{ fontWeight: 'bold', color: 'green' }}> (Sélectionné)</span>
                )}
                {delta.delta < 0 && (
                    <span style={{ color: "red", marginLeft: "10px" }}> (Amélioration possible)</span>
                )}
              </li>
            ))}
          </ul>
          {step.minQtyApplied !== undefined && step.minQtyApplied !== Infinity && (
            <p>Quantité transférée pour cette amélioration : <strong>{step.minQtyApplied}</strong></p>
          )}
        </div>
      )}

      {step.totalCost !== undefined && (step.isFinalBalasHammerStep || step.isFinalSteppingStoneStep) && (
        <p className="bh-total-cost">
          Coût total {step.isFinalBalasHammerStep ? "initial (Balas-Hammer)" : "optimisé (Stepping Stone)"}: <strong>{step.totalCost}</strong>
        </p>
      )}
    </div>
  );
}