import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, HeartHandshake, Leaf, Loader2, TrendingUp, Plus, Target, BarChart3,
  CheckCircle, XCircle, Clock, Calendar, DollarSign, Award, Building2
} from 'lucide-react';
import apiClient from '../api/client';
import NGORegistration from './NGORegistration';

type Tab = 'dashboard' | 'initiatives' | 'volunteers' | 'impact';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
  { key: 'initiatives', label: 'Initiatives', icon: <Target size={18} /> },
  { key: 'volunteers', label: 'Volunteers', icon: <Users size={18} /> },
  { key: 'impact', label: 'Impact', icon: <TrendingUp size={18} /> },
];

const INITIATIVE_TYPES = ['volunteer', 'fund', 'awareness', 'equipment', 'skills', 'materials'];

const NGOHub = () => {
  const { t } = useTranslation();
  const [hasOrg, setHasOrg] = useState<boolean | null>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkOrg = useCallback(async () => {
    try {
      const res = await apiClient.get('/organizations', { params: { verified_only: 'false' } });
      const orgs = res.data.data || [];
      if (orgs.length > 0) {
        setOrg(orgs[0]);
        setHasOrg(true);
      } else {
        setHasOrg(false);
      }
    } catch {
      setHasOrg(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkOrg(); }, [checkOrg]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Loader2 size={36} className="animate-spin text-brand-green" />
        <p className="text-gray-500 font-medium mt-4">Loading organization...</p>
      </div>
    );
  }

  if (hasOrg === false) {
    return <NGORegistration onRegistered={() => { setLoading(true); checkOrg(); }} />;
  }

  return <NGODashboard org={org} />;
};

// ─── NGO Dashboard (post-registration) ─────────────────────────

function NGODashboard({ org }: { org: any }) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-dark rounded-4xl p-8 lg:p-10 border-b-4 border-brand-green flex flex-col md:flex-row justify-between items-center relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/10 rounded-full blur-3xl -z-10 animate-pulse-soft"></div>
        <div className="mb-6 md:mb-0 z-10">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-extrabold text-gray-800">{org?.name || 'NGO Hub'}</h2>
            {org?.verification_status === 'verified' && (
              <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Verified</span>
            )}
            {org?.verification_status === 'pending' && (
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">Pending Verification</span>
            )}
          </div>
          <p className="text-gray-600 font-medium text-lg">Manage initiatives, volunteers, and track your impact.</p>
        </div>
        <div className="p-5 bg-gradient-to-br from-brand-green to-emerald-600 rounded-3xl shadow-lg z-10">
          <Leaf size={48} className="text-white" />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass p-2 rounded-2xl flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-brand-green to-emerald-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-white/60 hover:text-gray-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab org={org} />}
      {activeTab === 'initiatives' && <InitiativesTab org={org} />}
      {activeTab === 'volunteers' && <VolunteersTab org={org} />}
      {activeTab === 'impact' && <ImpactTab org={org} />}
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────────────

function DashboardTab({ org }: { org: any }) {
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/initiatives', { params: { organization_id: org?.id } })
      .then(res => setInitiatives(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [org]);

  const active = initiatives.filter(i => i.status === 'active');
  const completed = initiatives.filter(i => i.status === 'completed');
  const totalVolunteers = initiatives.reduce((sum, i) => sum + (i.volunteer_count || 0), 0);
  const totalContributors = initiatives.reduce((sum, i) => sum + (i.contributor_count || 0), 0);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Initiatives" value={active.length} icon={<Target size={22} />} color="green" />
        <StatCard label="Total Volunteers" value={totalVolunteers} icon={<Users size={22} />} color="blue" />
        <StatCard label="Contributors" value={totalContributors} icon={<HeartHandshake size={22} />} color="orange" />
        <StatCard label="Completed" value={completed.length} icon={<CheckCircle size={22} />} color="indigo" />
      </div>

      {/* Recent Activity */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-brand-green" /> Recent Initiatives
        </h3>
        {initiatives.length === 0 ? (
          <EmptyState message="No initiatives yet. Create your first initiative to get started!" />
        ) : (
          <div className="space-y-3">
            {initiatives.slice(0, 5).map(init => (
              <div key={init.id} className="bg-white/70 p-4 rounded-2xl border border-white/80 flex justify-between items-center hover:shadow-sm transition-shadow">
                <div>
                  <h4 className="font-bold text-gray-800">{init.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {init.type} | {init.volunteer_count || 0} volunteers | {init.contributor_count || 0} contributors
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  init.status === 'active' ? 'bg-green-100 text-green-700' :
                  init.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {init.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organization Details */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-brand-indigo" /> Organization Profile
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Type" value={org?.type || '—'} />
          <InfoRow label="Registration" value={org?.registration_number || '—'} />
          <InfoRow label="Focus Areas" value={(org?.focus_areas || []).join(', ') || '—'} />
          <InfoRow label="Status" value={org?.verification_status || 'pending'} />
        </div>
        {org?.description && (
          <p className="text-gray-600 text-sm font-medium mt-4 bg-white/50 p-3 rounded-xl">{org.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Initiatives Tab ────────────────────────────────────────────



// ─── Initiatives Tab ────────────────────────────────────────────

function InitiativesTab({ org }: { org: any }) {
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Adoption states
  const [viewMode, setViewMode] = useState<'yours' | 'adopt'>('yours');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [adoptingIncident, setAdoptingIncident] = useState<any | null>(null);

  const fetchInitiatives = useCallback(async () => {
    try {
      const res = await apiClient.get('/initiatives', { params: { organization_id: org?.id } });
      setInitiatives(res.data.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [org]);

  const loadIncidents = async () => {
    setLoadingIncidents(true);
    try {
      const res = await apiClient.get('/incidents');
      const items = res.data.data?.items || res.data.data || [];
      setIncidents(items.filter((i: any) => i.status !== 'resolved'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingIncidents(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'yours') {
      fetchInitiatives();
    } else {
      loadIncidents();
    }
  }, [viewMode, fetchInitiatives]);

  if (loading && viewMode === 'yours') return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header with Switcher & Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-4">
        <div className="flex gap-2 bg-gray-100/60 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('yours')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              viewMode === 'yours'
                ? 'bg-white text-brand-green shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Your Initiatives
          </button>
          <button
            onClick={() => setViewMode('adopt')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              viewMode === 'adopt'
                ? 'bg-white text-brand-green shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Adopt Citizen Incidents 🌳
          </button>
        </div>

        {viewMode === 'yours' && (
          <button
            onClick={() => {
              setAdoptingIncident(null);
              setShowCreate(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-green to-emerald-500 text-white font-bold text-sm shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <Plus size={16} /> Create Initiative
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateInitiativeModal
          prefilled={adoptingIncident}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setAdoptingIncident(null);
            setViewMode('yours');
            setLoading(true);
            fetchInitiatives();
          }}
        />
      )}

      {/* View Switch */}
      {viewMode === 'adopt' ? (
        loadingIncidents ? (
          <LoadingState />
        ) : incidents.length === 0 ? (
          <EmptyState message="No unresolved citizen incidents found to adopt." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {incidents.map(inc => (
              <div key={inc.id} className="glass p-5 rounded-3xl hover:shadow-lg transition-all flex flex-col justify-between border border-white/80 bg-white/40">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-extrabold text-gray-800 text-base leading-tight">{inc.title}</h4>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                      inc.severity === 'CRITICAL' ? 'bg-red-50 text-red-650 border-red-100' : 'bg-orange-50 text-orange-655 border-orange-100'
                    }`}>
                      {inc.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mb-4 line-clamp-3 leading-relaxed">{inc.description}</p>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Score: {inc.priority_score}
                  </span>
                  <button
                    onClick={() => {
                      setAdoptingIncident(inc);
                      setShowCreate(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-brand-green/10 text-brand-green hover:bg-brand-green/20 font-black text-[11px] uppercase tracking-wider transition-all"
                  >
                    Adopt & Solve 🚀
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Initiatives List */
        initiatives.length === 0 ? (
          <EmptyState message="No initiatives created yet. Click 'Create Initiative' to start one." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initiatives.map(init => (
              <div key={init.id} className="glass p-5 rounded-3xl hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-gray-800 text-lg">{init.title}</h4>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    init.status === 'active' ? 'bg-green-100 text-green-700' :
                    init.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {init.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{init.description}</p>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Type" value={init.type} />
                  <MiniStat label="Volunteers" value={`${init.volunteer_count || 0}/${init.volunteer_target || '—'}`} />
                  <MiniStat label="Contributors" value={init.contributor_count || 0} />
                </div>
                {init.goal_amount && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 font-medium mb-1">
                      <span>Raised</span>
                      <span>{Math.round((init.raised_amount / init.goal_amount) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-green to-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (init.raised_amount / init.goal_amount) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function CreateInitiativeModal({ onClose, onCreated, prefilled }: { onClose: () => void; onCreated: () => void; prefilled?: any }) {
  const [form, setForm] = useState({
    title: prefilled ? `Adopted: ${prefilled.title}` : '',
    description: prefilled ? `Resolves citizen issue: ${prefilled.description}` : '',
    type: 'volunteer',
    volunteer_target: '20',
    goal_amount: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/initiatives', {
        title: form.title,
        description: form.description,
        type: form.type,
        volunteer_target: form.volunteer_target ? parseInt(form.volunteer_target) : null,
        goal_amount: form.goal_amount ? parseFloat(form.goal_amount) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      
      // If adopting, let's also resolve or note down the incident link
      if (prefilled) {
        await apiClient.patch(`/incidents/${prefilled.id}`, { status: 'resolved', notes: 'Adopted as NGO Initiative' }).catch(() => null);
      }

      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create initiative');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-md animate-fade-in">
      <div className="glass-dark p-8 rounded-4xl max-w-lg w-full mx-4 shadow-2xl border border-white/60 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-extrabold text-gray-800 mb-6">
          {prefilled ? 'Adopt Incident as Initiative' : 'Create Initiative'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-brand-green/30"
              placeholder="e.g., Clean Bhopal Lake Drive"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-brand-green/30 h-24 resize-none"
              placeholder="What problem are you solving and how?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none"
              >
                {INITIATIVE_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Volunteer Target</label>
              <input
                type="number"
                value={form.volunteer_target}
                onChange={e => setForm(p => ({ ...p, volunteer_target: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none"
                placeholder="e.g., 50"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Goal Amount (optional)</label>
              <input
                type="number"
                value={form.goal_amount}
                onChange={e => setForm(p => ({ ...p, goal_amount: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none"
                placeholder="e.g., 50000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">End Date</label>
            <input
              type="date"
              value={form.end_date}
              onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 font-medium text-gray-800 outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{error}</div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-white hover:bg-gray-50 transition-colors border border-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-brand-green to-emerald-500 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Create Initiative'}
          </button>
        </div>
      </div>
    </div>
  );
}

function VolunteersTab({ org }: { org: any }) {
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchVolunteers = useCallback(async () => {
    try {
      const params: any = {};
      if (filter) params.status = filter;
      const res = await apiClient.get(`/organizations/${org?.id}/volunteers`, { params });
      setVolunteers(res.data.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [org, filter]);

  useEffect(() => { fetchVolunteers(); }, [fetchVolunteers]);

  const handleAction = async (vol: any, action: 'accept' | 'reject' | 'complete') => {
    setActionLoading(vol.id);
    try {
      if (action === 'complete') {
        const hours = prompt('Hours logged for this volunteer:');
        if (!hours) { setActionLoading(null); return; }
        await apiClient.post(`/organizations/${org.id}/initiatives/${vol.initiative_id}/volunteers/${vol.user_id}/complete`, {
          hours_logged: parseFloat(hours),
        });
      } else {
        await apiClient.post(`/organizations/${org.id}/initiatives/${vol.initiative_id}/volunteers/${vol.user_id}/accept`, {
          action,
        });
      }
      fetchVolunteers();
    } catch (err: any) {
      alert(err?.response?.data?.error || `Failed to ${action} volunteer`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-extrabold text-gray-800">Volunteer Management</h3>
        <div className="flex gap-2">
          {['', 'applied', 'accepted', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setLoading(true); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-gradient-to-r from-brand-green to-emerald-500 text-white shadow-md'
                  : 'bg-white/70 text-gray-600 hover:bg-white border border-gray-200'
              }`}
            >
              {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {volunteers.length === 0 ? (
        <EmptyState message="No volunteer applications yet. Once citizens apply to volunteer for your initiatives, they'll appear here." />
      ) : (
        <div className="glass p-6 rounded-3xl">
          <div className="space-y-3">
            {volunteers.map((vol: any) => (
              <div key={vol.id} className="bg-white/70 p-4 rounded-2xl border border-white/80 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green to-emerald-400 flex items-center justify-center text-white font-bold text-sm">
                    {(vol.volunteer_name || 'U').charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{vol.volunteer_name || 'Anonymous'}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Initiative: <span className="font-medium text-gray-700">{vol.initiative_title}</span>
                    </p>
                    {vol.hours_logged && <p className="text-xs text-brand-green font-bold mt-0.5">{vol.hours_logged}h logged</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Applied {new Date(vol.applied_at).toLocaleDateString()}
                      {vol.civic_impact_score && ` · Impact: ${vol.civic_impact_score}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    vol.status === 'applied' ? 'bg-yellow-100 text-yellow-700' :
                    vol.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    vol.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    vol.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {vol.status}
                  </span>
                  {vol.status === 'applied' && (
                    <>
                      <button
                        onClick={() => handleAction(vol, 'reject')}
                        disabled={actionLoading === vol.id}
                        className="px-3 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50"
                      >
                        <XCircle size={14} className="inline mr-1" />Decline
                      </button>
                      <button
                        onClick={() => handleAction(vol, 'accept')}
                        disabled={actionLoading === vol.id}
                        className="px-3 py-2 rounded-xl bg-green-50 text-green-700 font-bold text-xs hover:bg-green-100 transition-colors border border-green-200 disabled:opacity-50"
                      >
                        <CheckCircle size={14} className="inline mr-1" />Accept
                      </button>
                    </>
                  )}
                  {vol.status === 'accepted' && (
                    <button
                      onClick={() => handleAction(vol, 'complete')}
                      disabled={actionLoading === vol.id}
                      className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors border border-blue-200 disabled:opacity-50"
                    >
                      <Award size={14} className="inline mr-1" />Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Impact Tab ─────────────────────────────────────────────────

function ImpactTab({ org }: { org: any }) {
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/initiatives', { params: { organization_id: org?.id } })
      .then(res => setInitiatives(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [org]);

  if (loading) return <LoadingState />;

  const completed = initiatives.filter(i => i.status === 'completed').length;
  const totalVolunteers = initiatives.reduce((s, i) => s + (i.volunteer_count || 0), 0);
  const totalContributors = initiatives.reduce((s, i) => s + (i.contributor_count || 0), 0);
  const totalRaised = initiatives.reduce((s, i) => s + (parseFloat(i.raised_amount) || 0), 0);

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-extrabold text-gray-800">Impact Dashboard</h3>

      {/* Impact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Initiatives Completed" value={completed} icon={<CheckCircle size={22} />} color="green" />
        <StatCard label="Volunteers Engaged" value={totalVolunteers} icon={<Users size={22} />} color="blue" />
        <StatCard label="Total Contributors" value={totalContributors} icon={<HeartHandshake size={22} />} color="orange" />
        <StatCard label="Funds Raised" value={`₹${totalRaised.toLocaleString()}`} icon={<DollarSign size={22} />} color="indigo" />
      </div>

      {/* Impact Breakdown by Initiative */}
      <div className="glass p-6 rounded-3xl">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Award size={18} className="text-brand-orange" /> Initiative Impact Breakdown
        </h4>
        {initiatives.length === 0 ? (
          <EmptyState message="Complete initiatives to see your impact data here." />
        ) : (
          <div className="space-y-3">
            {initiatives.map(init => (
              <div key={init.id} className="bg-white/70 p-4 rounded-2xl border border-white/80">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-bold text-gray-800">{init.title}</h5>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    init.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {init.status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <MiniStat label="Volunteers" value={init.volunteer_count || 0} />
                  <MiniStat label="Contributors" value={init.contributor_count || 0} />
                  <MiniStat label="Type" value={init.type} />
                  <MiniStat label="Raised" value={`₹${(parseFloat(init.raised_amount) || 0).toLocaleString()}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Card */}
      <div className="glass p-6 rounded-3xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
        <h4 className="font-bold text-gray-800 mb-2">Organization Impact Summary</h4>
        <p className="text-gray-600 text-sm font-medium">
          {org?.name || 'Your organization'} has launched {initiatives.length} initiative{initiatives.length !== 1 ? 's' : ''},
          engaged {totalVolunteers} volunteers, and received support from {totalContributors} contributors
          {totalRaised > 0 ? `, raising ₹${totalRaised.toLocaleString()} for civic improvements` : ''}.
          {completed > 0 ? ` ${completed} initiative${completed !== 1 ? 's' : ''} successfully completed.` : ''}
        </p>
      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-brand-blue to-blue-500',
    green: 'from-brand-green to-emerald-500',
    orange: 'from-brand-orange to-orange-400',
    indigo: 'from-brand-indigo to-purple-600',
  };
  return (
    <div className="glass p-5 rounded-3xl flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all">
      <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorMap[color] || colorMap.green} text-white shadow-md`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 px-3 py-2 rounded-xl text-center">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-bold text-gray-800">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/50 px-4 py-2.5 rounded-xl flex justify-between items-center">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-800 font-bold capitalize">{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 size={32} className="animate-spin text-brand-green" />
      <p className="text-gray-500 font-medium mt-3">Loading...</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 bg-white/40 rounded-2xl border border-dashed border-gray-300">
      <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );
}

export default NGOHub;
