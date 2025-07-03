// src/components/GraphView.jsx
import React from 'react';
import { getRowChar } from './SharedUIHelpers'; // Import helper
import "./style/balas‑hammer.css";

export default function GraphView({ finalAllocations, rows, cols }) {
  if (!finalAllocations) return null;

  return (
    <svg
      width="400"
      height={Math.max(rows, cols) * 80}
      className="bh-svg"
    >
      {/* Sources */}
      {Array.from({ length: rows }).map((_, i) => (
        <g key={i}>
          <circle cx={60} cy={i * 80 + 40} r={20} fill="#f0f0f0" stroke="#333" />
          <text x={60} y={i * 80 + 45} textAnchor="middle" fontWeight="bold">
            {getRowChar(i)}
          </text>
        </g>
      ))}
      {/* Destinations */}
      {Array.from({ length: cols }).map((_, j) => (
        <g key={j}>
          <circle cx={340} cy={j * 80 + 40} r={20} fill="#f0f0f0" stroke="#333" />
          <text x={340} y={j * 80 + 45} textAnchor="middle" fontWeight="bold">
            {j + 1}
          </text>
        </g>
      ))}
      {/* Connections (Liaisons) - Sans les numéros d'allocation */}
      {finalAllocations.map((row, i) =>
        row.map((alloc, j) => {
          // Afficher la ligne si l'allocation est un nombre positif
          // ou si c'est la chaîne "ε" (pour les cas de dégénérescence si vous voulez les montrer)
          if ((typeof alloc === 'number' && alloc > 0) || alloc === "ε") {
            return (
              <g key={`${i}-${j}`}>
                <line x1={80} y1={i * 80 + 40} x2={320} y2={j * 80 + 40}
                      stroke="#888" strokeWidth="2" />
                {/* Suppression du bloc <text> qui affichait {alloc} */}
              </g>
            );
          }
          return null;
        })
      )}
    </svg>
  );
}