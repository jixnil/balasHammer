// src/components/SteppingStoneDeltaTable.jsx
import React from 'react';
import { getRowChar } from './SharedUIHelpers'; // Import helper
import "./style/balas‑hammer.css";

export default function SteppingStoneDeltaTable({ deltas }) {
  if (!deltas || deltas.length === 0) return null;

  return (
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
          {deltas.map(({ cell, path, formula, delta }, idx) => (
            <tr key={idx}>
              <td>({getRowChar(cell[0])}, {cell[1] + 1})</td>
              <td>
                {path.map(([i, j]) => `(${getRowChar(i)}, ${j + 1})`).join(" → ")}
              </td>
              <td>{formula}</td>
              <td style={{ color: delta < 0 ? "red" : "black" }}>{delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}