import type { ReactNode } from 'react';
import { Calendar, FileText, Mail, TrendingUp } from 'lucide-react';
import { monthBrief } from '../../lib/monthBrief';
import { lakh } from './usePlanData';
import { money } from '../../types';

export default function MonthBrief({
  content,
  offers,
  revenue,
  forecastedCount,
  renderText = text => text,
}: {
  content: unknown;
  offers: readonly unknown[];
  revenue: number;
  forecastedCount: number;
  renderText?: (text: string) => ReactNode;
}) {
  const brief = monthBrief(content, offers);
  if (!brief.present) return null;
  const missing = offers.length - forecastedCount;
  return (
    <section className="mw-section mw-brief" aria-label="Monthly launch brief">
      <div className="mw-brief-sheet">
        <header className="mw-brief-header">
          <span className="mw-brief-kicker">
            <FileText size={13} /> Monthly launch brief <em>As filed</em>
          </span>
          <h3>{brief.focus ? renderText(brief.focus) : 'The launch plan for this month'}</h3>
          {brief.studioRole && <p className="mw-brief-role">{renderText(brief.studioRole)}</p>}
        </header>
        <dl className="mw-brief-stats">
          <div className="is-revenue">
            <dt>
              <TrendingUp size={13} /> Combined projected revenue
            </dt>
            <dd>
              <strong title={forecastedCount ? money(revenue) : undefined}>
                {forecastedCount ? lakh(revenue) : '—'}
              </strong>
              <span>
                From {offers.length} selected {offers.length === 1 ? 'offer' : 'offers'}
                {missing > 0 ? ` · ${missing} awaiting forecast` : ''}
              </span>
              {brief.filedRevenue !== null && (
                <span className="mw-brief-filed">
                  Filed plan estimate: <b>{lakh(brief.filedRevenue)}</b>
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>Collateral</dt>
            <dd>
              <strong>{brief.pieces.length}</strong>
              <span>{brief.pieces.length === 1 ? 'piece to produce' : 'pieces to produce'}</span>
            </dd>
          </div>
          <div>
            <dt>CRM</dt>
            <dd>
              <strong>{brief.sends.length}</strong>
              <span>scheduled {brief.sends.length === 1 ? 'send' : 'sends'}</span>
            </dd>
          </div>
        </dl>
        <div className="mw-brief-panels">
          <section className="mw-brief-panel" aria-label="Collateral brief">
            <header className="mw-brief-panel-head">
              <FileText size={15} />
              <h4>{renderText(brief.collateralTitle)}</h4>
              <em>{brief.pieces.length}</em>
            </header>
            {brief.collateralSubtitle && <p className="mw-brief-panel-note">{renderText(brief.collateralSubtitle)}</p>}
            {brief.pieces.length ? (
              <ol className="mw-brief-list">
                {brief.pieces.map((piece, index) => (
                  <li key={index}>
                    <strong className="mw-brief-item-title">{renderText(piece.offer)}</strong>
                    {piece.headline && piece.headline !== piece.offer && (
                      <p className="mw-brief-headline">{renderText(piece.headline)}</p>
                    )}
                    {piece.detail && <p>{renderText(piece.detail)}</p>}
                    {piece.channels.length > 0 && (
                      <ul className="mw-brief-channels" aria-label="Channels">
                        {piece.channels.map((channel, index) => (
                          <li key={index}>
                            {channel.label}
                            {channel.due && <span> · due {channel.due}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {piece.copy && piece.copy !== piece.detail && piece.copy !== piece.headline && (
                      <details className="mw-brief-copy">
                        <summary>View copy</summary>
                        <p>{renderText(piece.copy)}</p>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mw-brief-empty">No collateral pieces were included in the filed brief.</p>
            )}
          </section>
          <section className="mw-brief-panel" aria-label="CRM schedule">
            <header className="mw-brief-panel-head">
              <Mail size={15} />
              <h4>CRM schedule</h4>
              <em>{brief.sends.length}</em>
            </header>
            {brief.crmRule && <p className="mw-brief-rule">{renderText(brief.crmRule)}</p>}
            {brief.reportedSends !== null && brief.reportedSends !== brief.sends.length && (
              <p className="mw-brief-panel-note">
                The filed plan reports {brief.reportedSends} sends; {brief.sends.length} detailed{' '}
                {brief.sends.length === 1 ? 'send is' : 'sends are'} listed below.
              </p>
            )}
            {brief.sends.length ? (
              <ol className="mw-brief-list mw-brief-send-list">
                {brief.sends.map((send, index) => (
                  <li key={index}>
                    {(send.day || send.channel) && (
                      <div className="mw-brief-send-meta">
                        {send.day && (
                          <span>
                            <Calendar size={11} />
                            {send.day}
                          </span>
                        )}
                        {send.channel && <span>{send.channel}</span>}
                      </div>
                    )}
                    <strong className="mw-brief-item-title">
                      {renderText(send.label || send.audience || `Outreach ${index + 1}`)}
                    </strong>
                    {send.label && send.audience && <p className="mw-brief-audience">{renderText(send.audience)}</p>}
                    {send.offers.length > 0 && (
                      <p className="mw-brief-send-offers">
                        <span>Offers</span>
                        {send.offers.map((name, index) => (
                          <span key={index}>{renderText(name)}</span>
                        ))}
                      </p>
                    )}
                    {send.message && <p className="mw-brief-message">{renderText(send.message)}</p>}
                    {send.note && send.note !== send.message && <p>{renderText(send.note)}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mw-brief-empty">No CRM send details were included in the filed brief.</p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
