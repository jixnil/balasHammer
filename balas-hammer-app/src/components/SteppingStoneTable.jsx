import React from "react";
import { getRowChar } from "./SharedUIHelpers";
import "./style/balas‑hammer.css";

export default function SteppingStoneDeltaTable({ step, cols, rows, savedCosts }) {
  const deltaMatrix = Array.from({ length: rows }, () => Array(cols).fill(null));
  const alloc = step.allocations; // ✅ Correction ici

  // Remplir la matrice des Δ
  (step.deltas || []).forEach(({ cell: [i, j], delta }) => {
    deltaMatrix[i][j] = delta;
  });

  const pathIndex = (i, j) =>
    (step.bestPath || []).findIndex(([pi, pj]) => pi === i && pj === j);

  const cellClass = (i, j) => {
    const cls = [];
    const p = pathIndex(i, j);
    if (p >= 0) cls.push(p % 2 === 0 ? "path-plus" : "path-minus");
    if (deltaMatrix[i][j] !== null && deltaMatrix[i][j] < 0) cls.push("delta-negative");
    if (step.bestCell && step.bestCell[0] === i && step.bestCell[1] === j) cls.push("best-delta-cell");
    return cls.join(" ");
  };

  return (
    <div className="bh-step-container">
      <table className="ss-table">
        <thead>
          <tr>
            <th></th>
            {Array.from({ length: cols }, (_, j) => (
              <th key={`h${j}`} className="ss-label">{j + 1}</th>
            ))}
            <th className="ss-label">Vy</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={`r${i}`}>
              <th className="ss-label">{getRowChar(i)}</th>
              {Array.from({ length: cols }, (_, j) => {
                const cost = (savedCosts ?? step.costs)[i][j];
                const value = alloc[i][j];
                return (
                  <td key={`c${i}-${j}`} className={cellClass(i, j)}>
                    <div className="ss-cost">{cost}</div>
                    {value !== null && (
                      <div className="ss-alloc">{value === "ε" ? "ε" : value}</div>
                    )}
                    {deltaMatrix[i][j] !== null && (
                      <div className="delta-val">δ={deltaMatrix[i][j]}</div>
                    )}
                  </td>
                );
              })}
              <td className="ss-offer">{step.offer[i]}</td>
            </tr>
          ))}
          <tr>
            <th className="ss-label">Vx</th>
            {Array.from({ length: cols }, (_, j) => (
              <td key={`d${j}`} className="ss-demand">{step.demand[j]}</td>
            ))}
            <td></td>
          </tr>
        </tbody>
      </table>

      {/* Δ list */}
      <h3 className="ss-section-title">Calculs des Δ(x,y)</h3>
      <div className="ss-delta-list">
        {step.deltas?.map((d, idx) => (
          <p key={idx} className={d.delta < 0 ? "delta-negative-text" : ""}>
            {d.formula}
          </p>
        ))}
      </div>

      {step.totalCost !== undefined && (
        <div className="z-formula">
          <strong>Z = {step.previousCost} {step.stepDelta >= 0 ? '+' : ''}{step.stepDelta} =</strong>
          <span className="z-final"> {step.totalCost}</span>
        </div>
      )}

      <h3 className="ss-section-title">Chemins et gains</h3>
      {step.deltas?.map((d, idx) => (
        <div key={idx} className="delta-detail-box">
          <h4 className="delta-title">
            Détail pour δ({getRowChar(d.cell[0])},{d.cell[1]+1})
          </h4>
          <p>Chemin : {d.path.map(([i, j]) => `(${getRowChar(i)},${j+1})`).join(" → ")}</p>
          <p>{d.formula}</p>
          <p>{d.gainFormula}</p>
        </div>
      ))}
    </div>
  );
}
