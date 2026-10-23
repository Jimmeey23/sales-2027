import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Archive, BarChart3, Bot, Building2, CalendarDays, CircleDollarSign, Database, FileBarChart, Gift, Goal, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Shuffle, SlidersHorizontal, Target, UsersRound, WandSparkles, X, Zap } from 'lucide-react';
import BrandMark from './BrandMark';
import CopilotDrawer from './CopilotDrawer';
import { useApp } from '../App';
import { IconButton, Select } from './ui';

const NAV: Array<{ group: string; items: any[] }> = [
  { group: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/studios/1', label: 'Studio Intelligence', icon: BarChart3, studio: true },
  ]},
  { group: 'Sales plans', items: [
    { to: '/plan', label: 'Studio Sales Plans', icon: Building2 },
    { to: '/calendar', label: 'Campaign Calendar', icon: CalendarDays },
    { to: '/anniversary', label: 'April Anniversary', icon: Gift, april: true },
  ]},
  { group: 'Offers', items: [
    { to: '/offers', label: 'Offer Bank', icon: Archive },
    { to: '/ai-offers', label: 'AI Offer Generator', icon: WandSparkles },
    { to: '/offer-builder', label: 'Offer Builder', icon: CircleDollarSign },
  ]},
  { group: 'Advanced tools', items: [
    { to: '/planner', label: 'Target Matrix', icon: Target },
    { to: '/funnel', label: 'Funnel Simulator', icon: SlidersHorizontal },
    { to: '/retention', label: 'Retention & Reactivation', icon: UsersRound },
    { to: '/goal-builder', label: 'Goal-Based Offers', icon: Goal },
    { to: '/random-offers', label: 'Random Offers', icon: Shuffle },
    { to: '/performance', label: 'Campaign Performance', icon: Activity },
  ]},
  { group: 'Admin', items: [
    { to: '/imports', label: 'Data Import', icon: Database, permission: 'import' },
    { to: '/reports', label: 'Reports & Exports', icon: FileBarChart, permission: 'export' },
    { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings' },
  ]},
];
const TITLES: Record<string,string> = {'/':'Executive Dashboard','/plan':'Studio Sales Plans','/planner':'Target Matrix','/calendar':'Monthly Campaign Calendar','/anniversary':'April Anniversary Studio','/ai-offers':'AI Offer Generator','/goal-builder':'Goal-Based Offer Builder','/random-offers':'Random Offer Generator','/offers':'Offer Bank','/offer-builder':'Offer Builder & Editor','/funnel':'Revenue & Funnel Simulator','/retention':'Retention & Reactivation','/performance':'Campaign Performance','/imports':'Data Import & Management','/reports':'Reports & Exports','/settings':'Settings & Permissions'};

export default function Layout() {
  const { boot, studioId, setStudioId, year, setYear, can, scenario, setScenario, dataVersion } = useApp();
  const [open, setOpen] = useState(false), [collapsed, setCollapsed] = useState(false), [copilotOpen, setCopilotOpen] = useState(false);
  const [search, setSearch] = useState('');
  const location = useLocation(), navigate = useNavigate(); const searchRef = useRef<HTMLInputElement>(null);
  useEffect(()=>{setOpen(false);},[location.pathname]);
  useEffect(()=>{const handler=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();searchRef.current?.focus();}};document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);},[]);
  const title = location.pathname.startsWith('/plan/') ? 'Studio Sales Plan' : location.pathname.startsWith('/studios/') ? 'Studio Intelligence' : location.pathname.startsWith('/offers/') ? 'Offer Builder & Editor' : TITLES[location.pathname] || 'P57';
  const scoped = ['studio_manager','sales_associate'].includes(boot.user.role);
  const submitSearch = (e:React.FormEvent)=>{e.preventDefault();if(search.trim())navigate(`/offers?q=${encodeURIComponent(search.trim())}`);};
  return <div className={`app-shell ${collapsed?'sidebar-collapsed':''}`}>
    {open&&<div className="sidebar-overlay" onClick={()=>setOpen(false)}/>}
    <aside className={`sidebar ${open?'mobile-open':''}`}>
      <div className="sidebar-brand"><BrandMark/>{!collapsed&&<div className="brand-copy"><strong>Sales Intelligence</strong><span>COMMERCIAL OS</span></div>}<IconButton label="Close navigation" className="mobile-close" onClick={()=>setOpen(false)}><X size={18}/></IconButton></div>
      <nav className="sidebar-nav" aria-label="Workspace navigation">{NAV.map(group=><div className="nav-group" key={group.group}>{!collapsed&&<div className="nav-group-label">{group.group}</div>}{group.items.filter(item=>!item.permission||can(item.permission)).map(item=>{const Icon=item.icon;const destination=item.studio?`/studios/${studioId||boot.studios[0]?.id}`:item.to;return <NavLink key={item.label} to={destination} end={item.end} title={collapsed?item.label:undefined} className={({isActive})=>`${isActive||(item.studio&&location.pathname.startsWith('/studios/'))?'active':''} ${item.april?'april-link':''}`}><Icon size={18}/>{!collapsed&&<span>{item.label}</span>}{item.april&&!collapsed&&<span className="nav-dot"/>}</NavLink>;})}</div>)}</nav>
      <div className="sidebar-bottom">{!collapsed&&<div className="sidebar-data"><span className="live-dot"/><div><strong>Source data connected</strong><span>Actuals through {boot.coverage.sales.last||'—'}</span></div><Zap size={14}/></div>}<button className="collapse-btn" onClick={()=>setCollapsed(!collapsed)}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>} {!collapsed&&'Collapse navigation'}</button></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="topbar-left"><IconButton label="Open navigation" className="menu-button" onClick={()=>setOpen(true)}><Menu size={20}/></IconButton><div className="topbar-title"><div className="breadcrumb"><span className="workspace-dot"/> P57 WORKSPACE <span>/</span> {title}</div><h1>{title}</h1></div></div><div className="topbar-actions"><form className="global-search" onSubmit={submitSearch}><Search size={16}/><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the offer bank" aria-label="Search offers"/><kbd>⌘ K</kbd></form><div className="topbar-select"><span>Studio</span><Select aria-label="Global studio" value={studioId||'all'} onChange={e=>setStudioId(e.target.value==='all'?null:Number(e.target.value))} disabled={scoped}><option value="all">All studios</option>{boot.studios.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></div><div className="topbar-select scenario-select" title="Applies to every studio, month and report"><span>Targets</span><Select aria-label="Target scenario" value={scenario} disabled={!can('target_edit')} onChange={e=>setScenario(e.target.value)}><option value="standard">Standard</option><option value="aggressive">Aggressive</option><option value="aspirational">Aspirational</option></Select></div><div className="topbar-select year-select"><span>Planning year</span><Select value={year} onChange={e=>setYear(Number(e.target.value))}>{[2025,2026,2027,2028].map(y=><option key={y}>{y}</option>)}</Select></div><button className="copilot-launch" onClick={()=>setCopilotOpen(true)} title="Open P57 Copilot"><Bot size={18}/><span>Copilot</span></button><button className="quick-add" onClick={()=>navigate('/offer-builder')} title="Create an offer"><Plus size={18}/><span>New offer</span></button><div className="workspace-profile"><span className="avatar">{boot.user.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><div><strong>{boot.user.name}</strong><span>{boot.user.role.replaceAll('_',' ')}</span></div></div></div></header>
      <div className="context-strip"><div><span className="context-badge"><Zap size={11}/> LIVE DATA + DRAFT PLANS</span><span className="context-copy">Imported actuals stay separate from estimates and demonstrations.</span></div><div className="context-meta"><Building2 size={13}/><span>{boot.studios.length} locations</span><i>·</i><span>AI {boot.aiConfigured?'connected':'not configured'}</span></div></div>
      <main className="page-content" key={dataVersion}><Outlet/></main>
    </div>
    {copilotOpen&&<CopilotDrawer onClose={()=>setCopilotOpen(false)}/>} 
  </div>;
}
