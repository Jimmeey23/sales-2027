import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { ErrorState, Loading } from '../components/ui';
import PageHeader from '../components/PageHeader';
import { usePlanData } from './plan/usePlanData';
import OffersTab from './plan/OffersTab';

export default function OfferStudio() {
  const { boot, studioId, year } = useApp();
  const { data, loading, error, reload } = usePlanData();
  const studio = boot.studios.find(s => s.id === studioId);
  return (
    <div className="ws-page">
      <PageHeader
        eyebrow={`${studio ? studio.name.toUpperCase() : 'ALL LOCATIONS'} · OFFERS ${year}`}
        title="Offer studio"
        description="Find, generate and build offers in one place. Nothing is approved or published until you save it and it passes review."
      />
      {loading && !data ? (
        <Loading label="Loading offers…" />
      ) : error && !data ? (
        <ErrorState message={error} retry={() => reload().catch(() => {})} />
      ) : (
        data && <OffersTab data={data} reload={reload} />
      )}
    </div>
  );
}

// Old tool URLs land on the matching studio view, keeping any navigation state (e.g. a concept to edit).
export function OfferViewRedirect({ view }: { view: string }) {
  const location = useLocation();
  return <Navigate to={`/offers?view=${view}`} state={location.state} replace />;
}
