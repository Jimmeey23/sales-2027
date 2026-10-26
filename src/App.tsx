import React, { createContext, lazy, Suspense, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { api, post } from './api';
import type { Bootstrap, ToastMessage, User } from './types';
import Layout from './components/Layout';
import { Button, Loading } from './components/ui';
import BrandMark from './components/BrandMark';
import Login from './pages/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StudioIntelligence = lazy(() => import('./pages/StudioIntelligence'));
const OfferStudio = lazy(() => import('./pages/OfferStudio'));
const OfferViewRedirect = lazy(() => import('./pages/OfferStudio').then(m => ({ default: m.OfferViewRedirect })));
const OfferBuilder = lazy(() => import('./pages/OfferBuilder'));
const Retention = lazy(() => import('./pages/Retention'));
const DataImport = lazy(() => import('./pages/DataImport'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const SalesPlan = lazy(() => import('./pages/SalesPlan'));
const Memberships = lazy(() => import('./pages/Memberships'));
const Insights = lazy(() => import('./pages/InsightsHome'));

interface AppContextValue {
  boot: Bootstrap;
  studioId: number | null;
  setStudioId: (id: number | null) => void;
  year: number;
  setYear: (year: number) => void;
  toast: (message: string, type?: ToastMessage['type']) => void;
  refreshBoot: () => Promise<void>;
  can: (permission: string) => boolean;
  scenario: string;
  setScenario: (scenario: string) => Promise<void>;
  dataVersion: number;
}
const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('App context unavailable');
  return value;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [checking, setChecking] = useState(true);
  const [studioId, setStudioIdState] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem('p57-location');
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  });
  const setStudioId = useCallback((id: number | null) => {
    setStudioIdState(id);
    try {
      id ? localStorage.setItem('p57-location', String(id)) : localStorage.removeItem('p57-location');
    } catch {
      /* storage unavailable */
    }
  }, []);
  const [year, setYear] = useState(2027);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [startupError, setStartupError] = useState('');
  const [dataVersion, setDataVersion] = useState(0);
  const toast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const item = { id: Date.now() + Math.random(), message, type };
    setToasts(current => [...current, item]);
    setTimeout(() => setToasts(current => current.filter(t => t.id !== item.id)), 4500);
  }, []);
  const loadBoot = useCallback(async () => {
    const value = await api<Bootstrap>('/bootstrap');
    setBoot(value);
    setYear(value.planningYear);
    if (value.user.assigned_studio_id) setStudioId(value.user.assigned_studio_id);
  }, [setStudioId]);
  useEffect(() => {
    api<{ user: User | null; directWorkspace: boolean }>('/auth/me')
      .then(async result => {
        const current =
          result.user || (result.directWorkspace ? (await post<{ user: User }>('/auth/workspace', {})).user : null);
        setUser(current);
        if (current) await loadBoot();
      })
      .catch(error => setStartupError(error.message || 'The workspace could not be opened.'))
      .finally(() => setChecking(false));
  }, [loadBoot]);
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setBoot(null);
    };
    window.addEventListener('p57-unauthorised', handler);
    return () => window.removeEventListener('p57-unauthorised', handler);
  }, []);
  if (checking)
    return (
      <main className="app-loading">
        <div className="loading-brand">
          <BrandMark large />
          <span>COMMERCIAL OS</span>
        </div>
        <Loading label="Opening your studio workspace…" />
      </main>
    );
  if (!user && !startupError)
    return (
      <Login
        onSignedIn={async signedIn => {
          setUser(signedIn);
          try {
            await loadBoot();
          } catch (error: any) {
            setStartupError(error.message);
          }
        }}
      />
    );
  if (!user || !boot)
    return (
      <main className="workspace-error">
        <BrandMark large />
        <p className="eyebrow">DIRECT WORKSPACE</p>
        <h1>We couldn’t open the studio.</h1>
        <p>{startupError || 'Your session is no longer available. Reconnect to continue.'}</p>
        <Button onClick={() => window.location.reload()}>Reconnect to the workspace</Button>
      </main>
    );
  const can = (permission: string) => boot.user.permissions.includes(permission);
  // Switching the target scenario rescales every studio-month on the server; pages remount to reload.
  const setScenario = async (scenario: string) => {
    try {
      await post('/targets/scenario', { scenario, year });
      await loadBoot();
      setDataVersion(v => v + 1);
      toast(`Targets switched to ${scenario}.`);
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };
  return (
    <AppContext.Provider
      value={{
        boot,
        studioId,
        setStudioId,
        year,
        setYear,
        toast,
        refreshBoot: loadBoot,
        can,
        scenario: boot.targetScenario || 'standard',
        setScenario,
        dataVersion,
      }}
    >
      <Suspense fallback={<Loading label="Loading workspace module…" />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="studios/:id" element={<StudioIntelligence />} />
            <Route path="sales-plan" element={<SalesPlan />} />
            <Route path="sales-plan/offers" element={<OfferViewRedirect view="planned" />} />
            <Route path="sales-plan/:tab" element={<SalesPlan />} />
            <Route path="memberships" element={<Memberships />} />
            <Route path="insights" element={<Insights />} />
            <Route path="tools" element={<Navigate to="/" replace />} />
            <Route path="plan" element={<Navigate to="/sales-plan/plan" replace />} />
            <Route path="plan/:id" element={<Navigate to="/sales-plan/plan" replace />} />
            <Route path="planner" element={<Navigate to="/sales-plan/approvals" replace />} />
            <Route path="calendar" element={<Navigate to="/sales-plan/activations" replace />} />
            <Route path="anniversary" element={<Navigate to="/sales-plan/anniversary" replace />} />
            <Route path="ai-offers" element={<OfferViewRedirect view="generate" />} />
            <Route path="goal-builder" element={<OfferViewRedirect view="gap" />} />
            <Route path="random-offers" element={<OfferViewRedirect view="generate" />} />
            <Route path="offers" element={<OfferStudio />} />
            <Route path="offer-builder" element={<OfferViewRedirect view="manual" />} />
            <Route path="offers/:id/edit" element={<OfferBuilder />} />
            <Route path="funnel" element={<Navigate to="/sales-plan/targets" replace />} />
            <Route path="retention" element={<Retention />} />
            <Route path="performance" element={<Navigate to="/insights" replace />} />
            <Route path="imports" element={can('import') ? <DataImport /> : <Navigate to="/" replace />} />
            <Route path="reports" element={can('export') ? <Reports /> : <Navigate to="/" replace />} />
            <Route path="settings" element={can('settings') ? <Settings /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
      <div className="toast-stack" aria-live="polite">
        {toasts.map(item => (
          <div key={item.id} className={`toast toast-${item.type}`}>
            {item.type === 'success' ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
            <span>{item.message}</span>
            <button onClick={() => setToasts(current => current.filter(t => t.id !== item.id))}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
