import { number } from '../../../types';

// Volumes as two compact charts: the acquisition funnel (bars taper from leads, with step conversion) and the
// lifecycle asks (renewals of those due, comebacks of the lapsed pool). Custom metrics sit underneath as chips.
export const VOL_DEFAULT_LABELS = [
  'Leads needed',
  'Completed trials',
  'New members',
  'Renewals needed',
  'Reactivations',
];
export const volLabelEdited = (v: any) => !VOL_DEFAULT_LABELS.includes(v.label);
export const SHORT_VOL: Record<string, string> = {
  leads: 'Leads',
  trials: 'Trials',
  buyers: 'New members',
  renewals: 'Renewals',
  reactivations: 'Comebacks',
};
export const toNum = (v: any) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0;
export function VolumesChart({ vols }: { vols: any[] }) {
  const byId = Object.fromEntries(vols.map(v => [v.id, v]));
  const funnel = ['leads', 'trials', 'buyers'].map(id => byId[id]).filter(Boolean);
  const life = ['renewals', 'reactivations'].map(id => byId[id]).filter(Boolean);
  const extra = vols.filter(v => !['leads', 'trials', 'buyers', 'renewals', 'reactivations', 'conv'].includes(v.id));
  const top = Math.max(1, ...funnel.map(v => toNum(v.value)));
  return (
    <div className="mw-volchart">
      {funnel.length > 0 && (
        <div className="mw-volchart-block">
          <div className="mw-volchart-title">
            <span>Acquisition funnel</span>
            {byId.conv && (
              <em title={byId.conv.hint}>
                {byId.conv.value} {byId.conv.label.toLowerCase()}
              </em>
            )}
          </div>
          {funnel.map(v => {
            const val = toNum(v.value);
            return (
              <div key={v.id} className="mw-volchart-row is-acq" title={v.hint}>
                <span className="mw-volchart-label">
                  {v.isCustom || volLabelEdited(v) ? v.label : SHORT_VOL[v.id] || v.label}
                </span>
                <div className="mw-volchart-track">
                  <b style={{ width: `${Math.max(2, (val / top) * 100)}%` }} />
                </div>
                <strong>{v.value}</strong>
                <small>{v.rate ? `${Math.round(v.rate * 100)}% conv.` : ''}</small>
              </div>
            );
          })}
        </div>
      )}
      {life.length > 0 && (
        <div className="mw-volchart-block">
          <div className="mw-volchart-title">
            <span>Lifecycle</span>
          </div>
          {life.map(v => {
            const val = toNum(v.value),
              share = v.of ? val / v.of : 0;
            return (
              <div key={v.id} className={`mw-volchart-row is-${v.id}${share > 1 ? ' is-over' : ''}`} title={v.hint}>
                <span className="mw-volchart-label">
                  {v.isCustom || volLabelEdited(v) ? v.label : SHORT_VOL[v.id] || v.label}
                </span>
                <div className="mw-volchart-track is-share">
                  <b style={{ width: `${Math.min(100, Math.max(2, share * 100))}%` }} />
                </div>
                <strong>{v.value}</strong>
                <small>{v.of ? `${Math.round(share * 100)}% of ${number(v.of)}` : ''}</small>
              </div>
            );
          })}
        </div>
      )}
      {extra.length > 0 && (
        <div className="mw-volchart-extra">
          {extra.map(v => (
            <span key={v.id} title={v.hint}>
              {v.label} <b>{v.value}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
