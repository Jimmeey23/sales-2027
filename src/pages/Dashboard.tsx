import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../App';
import { Button } from '../components/ui';
import PageHeader from '../components/PageHeader';
import OverviewBrief from '../components/OverviewBrief';

// Overview: 2025 → 2026 performance and key findings for the selected location. Targets, the sales
// plan and activations live under Plan; detailed studio analysis under Insights.
export default function Dashboard() {
  const { studioId, boot } = useApp();
  const navigate = useNavigate();
  const name = studioId ? boot.studios.find(s => s.id === studioId)?.name : 'all studios';
  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="MANAGEMENT CONTROL CENTRE"
        title="2025 → 2026 → 2027, in one view."
        description={
          <>
            Imported actuals and the 2027 target for <strong>{name}</strong>. Estimates are labelled.
          </>
        }
        actions={
          <div className="filter-row">
            <Button variant="secondary" onClick={() => navigate('/sales-plan/targets')}>
              Target metrics <ArrowRight size={15} />
            </Button>
            <Button onClick={() => navigate('/sales-plan/plan')}>
              2027 sales plan <ArrowRight size={15} />
            </Button>
          </div>
        }
      />
      <OverviewBrief studioId={studioId} />
    </div>
  );
}
