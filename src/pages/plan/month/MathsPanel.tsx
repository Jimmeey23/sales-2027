import { Sigma, SlidersHorizontal, X } from 'lucide-react';
import { number } from '../../../types';
import { type MonthEconomics } from '../usePlanData';
import { AssumptionsEditor } from './AssumptionsEditor';
import { Economics } from './Economics';

// Detailed monthly maths, opened from the month hero on request.
export function MathsPanel({
  id,
  econ,
  window,
  studioId,
  studioName,
  year,
  editable,
  assumptions,
  onSaved,
  onClose,
}: {
  id: string;
  econ: MonthEconomics;
  window: { from: string; to: string };
  studioId: number;
  studioName: string;
  year: number;
  editable: boolean;
  assumptions: Record<string, { auto: number | null; override: number | null }>;
  onSaved: () => Promise<unknown>;
  onClose: () => void;
}) {
  const custom = Object.values(assumptions || {}).filter(a => a.override !== null && a.override !== undefined).length;
  return (
    <div id={id} className="mw-section mw-maths is-open">
      <header className="mw-sh">
        <span className="mw-sh-icon">
          <Sigma size={16} />
        </span>
        <h4>The maths &amp; assumptions</h4>
        <p>
          Built bottom-up from history, {window.from} → {window.to}.
        </p>
        <span className="mw-maths-custom" title={`${custom} customised assumptions`}>
          <SlidersHorizontal size={13} /> {custom ? `${custom} customised` : 'History based'}
        </span>
        <button type="button" className="mw-maths-close" onClick={onClose} aria-label="Close monthly maths">
          <X size={16} />
        </button>
      </header>
      <div className="mw-assume-wrap">
        <h5>
          <SlidersHorizontal size={14} /> Assumptions · {studioName}
        </h5>
        <AssumptionsEditor
          studioId={studioId}
          studioName={studioName}
          year={year}
          editable={editable}
          assumptions={assumptions}
          onSaved={onSaved}
        />
      </div>
      <Economics econ={econ} window={window} />
    </div>
  );
}
