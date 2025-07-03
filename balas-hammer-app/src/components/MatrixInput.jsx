// src/components/CostMatrixInput.jsx
import React from 'react';
import { clone2D, getRowChar } from './SharedUIHelpers'; // Import helper
import "./style/balas‑hammer.css";
export default function CostMatrixInput({
  rows,
  cols,
  costs,
  offer,
  demand,
  setCosts,
  setOffer,
  setDemand
}) {
  const handleCostChange = (i, j, v) => {
    const cpy = clone2D(costs);
    cpy[i][j] = Number(v);
    setCosts(cpy);
  };

  const handleOfferChange = (i, e) => {
    const o = [...offer];
    o[i] = Number(e.target.value);
    setOffer(o);
  };

  const handleDemandChange = (j, e) => {
    const d = [...demand];
    d[j] = Number(e.target.value);
    setDemand(d);
  };

  return (
    <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
      <table className="bh-table">
        <thead>
          <tr>
            <th></th>
            {Array.from({ length: cols }).map((_, j) => (
              <th key={j}>{j + 1}</th>
            ))}
            <th>Offre</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td style={{ fontWeight: "600" }}>{getRowChar(i)}</td>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j}>
                  <input
                    type="number"
                    value={costs[i][j] ?? 0}
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
                  onChange={(e) => handleOfferChange(i, e)}
                  className="bh-input"
                  style={{ width: "5.5rem", color: "#b30000", fontWeight: 700 }}
                />
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ fontWeight: "600" }}>Demande</td>
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j}>
                <input
                  type="number"
                  value={demand[j]}
                  onChange={(e) => handleDemandChange(j, e)}
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
  );
}