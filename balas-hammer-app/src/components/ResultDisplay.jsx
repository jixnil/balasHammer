// src/components/ResultDisplay.jsx
import React from 'react';
import BalasHammerStepTable from './BalasHammerStepTable';
import SteppingStoneDeltaTable from './SteppingStoneTable';
import { computeZ} from './SharedUIHelpers'; // Import helper
import "./style/balas‑hammer.css";

export default function ResultDisplay({ steps, cols, rows, savedCosts, costs }) {
  if (steps.length === 0) return null;

  return (
    <div id="result-table" style={{ flex: "1 1 480px" }}>
      {steps.map((step, k) => {
        const isSteppingStoneStep = step.deltas !== undefined; 

        return (
          <div key={k} className="bh-step">
            <h3 style={{ textAlign: "center", fontWeight: 700, marginBottom: "1.5rem" }}>
              Étape {k + 1}: {step.note}
            </h3>

            {isSteppingStoneStep && (
  <SteppingStoneDeltaTable
    step={step}
    cols={cols}
    rows={rows}
    savedCosts={savedCosts}
  />
)}
            <BalasHammerStepTable
              step={step}
              cols={cols}
              rows={rows}
              savedCosts={savedCosts}
              costs={costs}
            />

            {/* Z final for the last step */}
            {k === steps.length - 1 && (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <div className="bh-z">Coût total Z = {computeZ(savedCosts ?? costs, step.allocations)}</div>
                <div style={{ marginTop: "0.5rem" }}>
                  {step.allocations.flatMap((row, i) =>
                    row.map((q, j) => typeof q === "number" && q > 0
                      ? `${(savedCosts ?? costs)[i][j]} × ${q}`
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
  );
}