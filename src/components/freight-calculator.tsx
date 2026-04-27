"use client";

import { useMemo, useState } from "react";

import {
  calculateCubeFromDimensions,
  calculateDensity,
  lookupFreightClass
} from "@/lib/workbook/formulas";

export function FreightCalculator() {
  const [lengthIn, setLengthIn] = useState(40);
  const [widthIn, setWidthIn] = useState(48);
  const [heightIn, setHeightIn] = useState(80);
  const [units, setUnits] = useState(1);
  const [weightLb, setWeightLb] = useState(753);

  const cube = useMemo(
    () => calculateCubeFromDimensions(lengthIn, widthIn, heightIn, units),
    [heightIn, lengthIn, units, widthIn]
  );
  const density = useMemo(() => calculateDensity(weightLb, cube), [cube, weightLb]);
  const freightClass = useMemo(() => lookupFreightClass(density), [density]);

  return (
    <div className="calculator-grid">
      <div className="surface calculator-panel">
        <div className="field-grid">
          <label className="field">
            <span>Length (in)</span>
            <input
              type="number"
              value={lengthIn}
              onChange={(event) => setLengthIn(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>Width (in)</span>
            <input
              type="number"
              value={widthIn}
              onChange={(event) => setWidthIn(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>Height (in)</span>
            <input
              type="number"
              value={heightIn}
              onChange={(event) => setHeightIn(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>Handling units</span>
            <input
              type="number"
              value={units}
              onChange={(event) => setUnits(Number(event.target.value))}
            />
          </label>
          <label className="field field--wide">
            <span>Total weight (lb)</span>
            <input
              type="number"
              value={weightLb}
              onChange={(event) => setWeightLb(Number(event.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="result-grid">
        <article className="surface result-card">
          <p className="kicker">Workbook equivalent</p>
          <h4>Cube</h4>
          <div className="result-card__value">{cube.toFixed(2)} cu ft</div>
        </article>
        <article className="surface result-card">
          <p className="kicker">Workbook equivalent</p>
          <h4>Density</h4>
          <div className="result-card__value">{density.toFixed(2)} lb/cu ft</div>
        </article>
        <article className="surface result-card">
          <p className="kicker">Workbook equivalent</p>
          <h4>Freight Class</h4>
          <div className="result-card__value">{freightClass || "Pending"}</div>
        </article>
      </div>
    </div>
  );
}
