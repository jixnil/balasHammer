// src/components/Controls.jsx
import React from 'react';
import "./style/balas‑hammer.css";

export default function Controls({ onRun, onExportPDF, showExportButton }) {
  return (
    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
      <button onClick={onRun} className="bh-btn bh-run">
        Résoudre
      </button>

      {showExportButton && (
        <button onClick={onExportPDF} className="bh-btn bh-pdf" style={{ marginLeft: ".75rem" }}>
          Exporter PDF
        </button>
      )}
    </div>
  );
}