import React, { useState } from "react";
import "./balas-hammer.css";

import MatrixInput from "./components/MatrixInput";
import Controls from "./components/Controls";
import GraphView from "./components/GraphView";
import ResultDisplay from "./components/ResultDisplay";

import { solveBalasHammer } from "./utils/balasHammer";
import { optimizeSteppingStone } from "./utils/steppingStone";

const defaultRows = 4;
const defaultCols = 6;

export default function App() { 
  const [rows, setRows] = useState(defaultRows);
  const [cols, setCols] = useState(defaultCols);
  const [costs, setCosts] = useState(
    Array.from({ length: defaultRows }, () => Array(defaultCols).fill(0))
  );
  const [offer, setOffer] = useState(Array(defaultRows).fill(0));
  const [demand, setDemand] = useState(Array(defaultCols).fill(0));
  const [steps, setSteps] = useState([]);
  const [savedCosts, setSavedCosts] = useState(null);

  // Nouveaux états pour allocations finales Balas et Stepping
  const [finalBalasAlloc, setFinalBalasAlloc] = useState(null);
  const [finalSteppingAlloc, setFinalSteppingAlloc] = useState(null);

  const handleDimensionsChange = (type, value) => {
    const numValue = Number(value);
    setSteps([]);
    setSavedCosts(null);
    setFinalBalasAlloc(null);
    setFinalSteppingAlloc(null);

    if (type === 'rows') {
      setRows(numValue);
      setCosts(Array.from({ length: numValue }, () => Array(cols).fill(0)));
      setOffer(Array(numValue).fill(0));
    } else if (type === 'cols') {
      let c = numValue;
      if (c < 1) c = 1;

      setCols(c);
      setCosts(prev =>
        Array.from({ length: rows }, (_, i) => {
          const oldRow = prev[i] || [];
          if (c > oldRow.length) {
            return [...oldRow, ...Array(c - oldRow.length).fill(0)];
          } else {
            return oldRow.slice(0, c);
          }
        })
      );
      setDemand(Array(c).fill(0));
    }
  };

  const handleRun = () => {
    setSavedCosts(costs.map(row => [...row]));

    const initialSolutionSteps = solveBalasHammer(costs, offer, demand);
    const finalBalasHammerAllocation = initialSolutionSteps.at(-1)?.allocations;

    let optimizationSteps = [];
    let finalSteppingStoneAllocation = null;
    if (finalBalasHammerAllocation) {
      optimizationSteps = optimizeSteppingStone(finalBalasHammerAllocation, costs, offer, demand);
      finalSteppingStoneAllocation = optimizationSteps.length > 0
        ? optimizationSteps.at(-1)?.allocations
        : finalBalasHammerAllocation; // fallback
    }

    setSteps([...initialSolutionSteps, ...optimizationSteps]);
    setFinalBalasAlloc(finalBalasHammerAllocation);
    setFinalSteppingAlloc(finalSteppingStoneAllocation);
  };

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
            onChange={(e) => handleDimensionsChange('rows', e.target.value)}
            className="bh-input"
          />
        </label>
        <label className="bh-label">
          Colonnes (destinations)
          <input
            type="number"
            value={cols}
            onChange={(e) => handleDimensionsChange('cols', e.target.value)}
            className="bh-input"
          />
        </label>
      </div>

      {/* Matrices */}
      <MatrixInput
        rows={rows}
        cols={cols}
        costs={costs}
        offer={offer}
        demand={demand}
        setCosts={setCosts}
        setOffer={setOffer}
        setDemand={setDemand}
        setSteps={setSteps}
        setSavedCosts={setSavedCosts}
      />

      {/* Boutons */}
      <Controls
        onRun={handleRun}
        showExportButton={steps.length > 0}
      />

      {/* Affichage résultats et graphes */}
      <div
  id="result-table"
  style={{
    display: "flex",
    gap: "2rem",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    flexWrap: "nowrap",
  }}
>
  {/* Colonne gauche : les deux graphes empilés */}
  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 440 }}>
    <div>
      <h3 style={{ textAlign: "center" }}>Solution Balas-Hammer</h3>
      <GraphView
        finalAllocations={finalBalasAlloc}
        rows={rows}
        cols={cols}
      />
    </div>

    <div>
      <h3 style={{ textAlign: "center" }}>Solution Stepping Stone</h3>
      <GraphView
        finalAllocations={finalSteppingAlloc}
        rows={rows}
        cols={cols}
      />
    </div>
  </div>

  {/* Colonne droite : tableau des étapes */}
  <div style={{ flex: "1 1 auto", minWidth: 480 }}>
    <ResultDisplay
      key={steps.length}
      steps={steps}
      cols={cols}
      rows={rows}
      savedCosts={savedCosts}
      costs={costs}
      finalBalasAlloc={finalBalasAlloc}
      finalSteppingAlloc={finalSteppingAlloc}
    />
  </div>
</div>


      </div>
  
  );
}
