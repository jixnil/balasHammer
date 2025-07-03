import React from 'react';
import { getRowChar } from './SharedUIHelpers';
import "./style/balas‑hammer.css";

export default function GraphView({ finalAllocations, rows, cols }) {
  if (!finalAllocations) return null;

  const maxArcs = rows + cols - 1;
  let arcCount = 0;

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

      {/* Connexions (allocations), incluant epsilon "ε" pour dégénérescence */}
      {finalAllocations.map((row, i) =>
        row.map((alloc, j) => {
          if (arcCount >= maxArcs) return null; // Stop dès que le max est atteint

          if (
            (typeof alloc === 'number' && alloc > 0) ||
            alloc === "ε"
          ) {
            arcCount++; // Compte cet arc

            return (
              <g key={`${i}-${j}`}>
                <line
                  x1={80}
                  y1={i * 80 + 40}
                  x2={320}
                  y2={j * 80 + 40}
                  stroke={alloc === "ε" ? "#f00" : "#888"}
                  strokeWidth={alloc === "ε" ? 3 : 2}
                  strokeDasharray={alloc === "ε" ? "5,5" : "0"}
                />
              </g>
            );
          }
          return null;
        })
      )}
    </svg>
  );
}
