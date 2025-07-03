// src/App.js
import React, { useState } from "react";
// import html2canvas from "html2canvas";
// import jsPDF from "jspdf";
import "./balas-hammer.css";


import MatrixInput from "./components/MatrixInput";
import Controls from "./components/Controls";
import GraphView from "./components/GraphView";
import ResultDisplay from "./components/ResultDisplay";


import { solveBalasHammer} from "./utils/balasHammer";
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

  /** Handlers **/
  const handleDimensionsChange = (type, value) => {
    const numValue = Number(value);
    setSteps([]); 
    setSavedCosts(null);

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
    setSavedCosts(costs.map(row => [...row])); // Save current costs

    const initialSolutionSteps = solveBalasHammer(costs, offer, demand);
    const finalBalasHammerAllocation = initialSolutionSteps.at(-1)?.allocations;

    let optimizationSteps = [];
    if (finalBalasHammerAllocation) {
        optimizationSteps = optimizeSteppingStone(finalBalasHammerAllocation, costs, offer, demand);
    }
    setSteps([...initialSolutionSteps, ...optimizationSteps]);
  };

//   const exportPDF = async () => {
//     const element = document.getElementById("result-table");
//     if (!element) return;
//     const canvas = await html2canvas(element, { scale: 2 });
//     const imgData = canvas.toDataURL("image/png");
//     const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3" });
//     const imgProps = pdf.getImageProperties(imgData);
//     const pdfWidth = pdf.internal.pageSize.getWidth();

//     const x = 10;
//     const y = 10;
//     const width = pdfWidth - 2 * x;
//     const height = (imgProps.height * width) / imgProps.width;

//     if (height > pdf.internal.pageSize.getHeight() - 2 * y) {
//         let currentHeight = 0;
//         while (currentHeight < imgProps.height) {
//             if (currentHeight > 0) {
//                 pdf.addPage();
//             }
//             const sliceHeight = Math.min(imgProps.height - currentHeight, pdf.internal.pageSize.getHeight() - 2 * y);
//             const sliceCanvas = document.createElement('canvas');
//             sliceCanvas.width = canvas.width;
//             sliceCanvas.height = sliceHeight * (canvas.width / imgProps.width);
//             const sliceCtx = sliceCanvas.getContext('2d');
//             sliceCtx.drawImage(canvas, 0, currentHeight * (canvas.width / imgProps.width), canvas.width, sliceHeight * (canvas.width / imgProps.width), 0, 0, sliceCanvas.width, sliceCanvas.height);
//             const sliceImgData = sliceCanvas.toDataURL("image/png");
//             pdf.addImage(sliceImgData, "PNG", x, y, width, sliceHeight * (width / imgProps.width));
//             currentHeight += sliceHeight;
//         }
//     } else {
//         pdf.addImage(imgData, "PNG", x, y, width, height);
//     }

//     pdf.save("balas_hammer_solution.pdf");
//   };

  return (
    <div className="bh-wrapper">
      <h1 className="bh-title">ALGORITHME ‑ Balas-Hammer</h1>
      <div className="bh-banner">
        Méthode de différence maximale (Algorithme de Balas-Hammer)
      </div>

      {/* Parameters */}
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

      {/* Cost Matrix, Offer, and Demand Input */}
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

      {/* Control Buttons */}
      <Controls
        onRun={handleRun}
        // onExportPDF={exportPDF}
        showExportButton={steps.length > 0}
      />

       <div id="result-table" style={{
            display: "flex",
            flexWrap: "wrap", // Permet aux éléments de passer à la ligne
            gap: "2rem",      // Espace entre les éléments
            justifyContent: "center", // Centre les groupes d'éléments horizontalement
            alignItems: "flex-start", // Aligne les éléments en haut de chaque ligne
            // Ajoutez un align-content pour gérer la distribution des lignes si nécessaire
            alignContent: "flex-start"
        }}>
          <ResultDisplay
            steps={steps}
            cols={cols}
            rows={rows}
            savedCosts={savedCosts}
            costs={costs}
          />
          {/* Le GraphView est toujours à l'intérieur du conteneur flex */}
          {/* mais avec des marges pour le pousser en bas et à droite */}
          <div style={{
            marginLeft: "auto", // Pousse le graphe à droite sur sa ligne
            marginTop: "auto",  // Pousse le graphe vers le bas sur sa colonne
       
          }}>
            <GraphView
              finalAllocations={steps.at(-1)?.allocations}
              rows={rows}
              cols={cols}
            />
          </div>
        </div>
      
    </div>
  );
}