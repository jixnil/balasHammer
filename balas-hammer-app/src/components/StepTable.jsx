import React from "react";
import "./style/balas‑hammer.css";

const StepTable = ({ steps, currentStepIndex }) => {
  if (!steps || steps.length === 0) return <p>Aucune étape à afficher.</p>;

  const step = steps[currentStepIndex];

  return (
    <div className="step-table">
      <h3>Étape {currentStepIndex + 1} / {steps.length}</h3>
      {/* Affiche ici le contenu de l'étape, par exemple une matrice ou tableau */}
      <pre>{JSON.stringify(step, null, 2)}</pre>
    </div>
  );
};

export default StepTable;
