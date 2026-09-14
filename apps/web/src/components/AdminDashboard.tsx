import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, LayoutDashboard, Users, AlertTriangle, Building2, Settings,
  ListChecks, Loader2, RefreshCw, Search, ChevronDown, Activity,
  FileText, CheckCircle, XCircle, Clock, TrendingUp, Database,
  Cpu, Gift, DollarSign, Zap, Shield, ToggleLeft, ToggleRight, Edit2
} from 'lucide-react';
import apiClient from '../api/client';

type Tab = 'command' | 'users' | 'incidents' | 'ngo' | 'settings' | 'ai' | 'rewards' | 'revenue';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'command', label: 'Command Center', icon: <LayoutDashboard size={20} /> },
  { key: 'users', label: 'Users & Content', icon: <Users size={20} /> },
  { key: 'incidents', label: 'Incidents', icon: <AlertTriangle size={20} /> },
  { key: 'ngo', label: 'NGO / Initiatives', icon: <Building2 size={20} /> },
  { key: 'settings', label: 'Analytics & Settings', icon: <Settings size={20} /> },
  { key: 'ai', label: 'AI Intelligence', icon: <Cpu size={20} /> },
  { key: 'rewards', label: 'Rewards & Credits', icon: <Gift size={20} /> },
  { key: 'revenue', label: 'Revenue & CSR', icon: <DollarSign size={20} /> },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>('command');

  return (
    <div className="flex gap-6 animate-fade-in min-h-[80vh]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 glass rounded-3xl p-4 space-y-2 self-start sticky top-24">
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <ShieldCheck size={28} className="text-brand-indigo" />
          <span className="font-extrabold text-lg text-gray-800">Admin Panel</span>
        </div>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-brand-indigo to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {activeTab === 'command' && <CommandCenter />}
        {activeTab === 'users' && <UserContentManagement />}
        {activeTab === 'incidents' && <IncidentManagement />}
        {activeTab === 'ngo' && <NGOManagement />}
        {activeTab === 'settings' && <AnalyticsSettings />}
        {activeTab === 'ai' && <AIIntelligence />}
        {activeTab === 'rewards' && <RewardsCredits />}
        {activeTab === 'revenue' && <RevenueCSR />}
      </main>
    </div>
  );
};

// ─── Section 1: Command Center ──────────────────────────────────

function CommandCenter() {
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, healthRes] = await Promise.all([
        apiClient.get('/admin/platform-stats'),
        apiClient.get('/healthz').catch(() => ({ data: { status: 'unreachable' } })),
      ]);
      setStats(statsRes.data.data);
      setHealth(healthRes.data);
    } catch (err) {
      console.error('Command center fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingState />;

  const totalUsers = stats?.users_by_role?.reduce((s: number, r: any) => s + parseInt(r.count), 0) || 0;
  const totalIncidents = stats?.incidents_by_status?.reduce((s: number, r: any) => s + parseInt(r.count), 0) || 0;

  return (
    <div className="space-y-6">
      <SectionHeader title="Command Center" subtitle="Platform-wide overview" onRefresh={fetchData} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totalUsers} icon={<Users size={24} />} color="blue" />
        <StatCard label="Cities" value={stats?.cities || 0} icon={<Building2 size={24} />} color="green" />
        <StatCard label="Total Incidents" value={totalIncidents} icon={<AlertTriangle size={24} />} color="orange" />
        <StatCard label="Reports (24h)" value={stats?.reports_last_24h || 0} icon={<FileText size={24} />} color="indigo" />
      </div>

      {/* Users by Role */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-3xl">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-brand-blue" /> Users by Role
          </h3>
          {stats?.users_by_role?.length ? (
            <div className="space-y-2">
              {stats.users_by_role.map((r: any) => (
                <div key={r.role} className="flex justify-between items-center bg-white/60 px-4 py-2.5 rounded-xl">
                  <span className="font-medium text-gray-700 text-sm">{r.role.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-gray-900">{r.count}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No user data available" />}
        </div>

        <div className="glass p-6 rounded-3xl">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-brand-orange" /> Incidents by Status
          </h3>
          {stats?.incidents_by_status?.length ? (
            <div className="space-y-2">
              {stats.incidents_by_status.map((r: any) => (
                <div key={r.status} className="flex justify-between items-center bg-white/60 px-4 py-2.5 rounded-xl">
                  <span className="font-medium text-gray-700 text-sm capitalize">{r.status}</span>
                  <span className="font-bold text-gray-900">{r.count}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No incident data" />}
        </div>
      </div>

      {/* System Health */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Database size={18} className="text-brand-green" /> System Health
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HealthCard name="API Server" status={health?.status === 'ok' ? 'online' : 'offline'} detail={health?.version || ''} />
          <HealthCard name="AI Engines" status={health?.status === 'ok' ? 'online' : 'unknown'} detail={`${health?.service || 'unknown'}`} />
          <HealthCard name="Database" status={stats ? 'online' : 'offline'} detail="PostgreSQL + PostGIS" />
        </div>
      </div>
    </div>
  );
}

// ─── Section 2: User & Content Management ───────────────────────

function UserContentManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [modQueue, setModQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, modRes] = await Promise.all([
        apiClient.get('/users', { params: { limit: 50, search: search || undefined } }),
        apiClient.get('/admin/moderation-queue'),
      ]);
      setUsers(usersRes.data.data?.items || usersRes.data.data || []);
      setModQueue(modRes.data.data || []);
    } catch (err) {
      console.error('User fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <SectionHeader title="User & Content Management" subtitle="Search users and moderate content" onRefresh={fetchData} />

      {/* Search */}
      <div className="glass p-4 rounded-2xl flex items-center gap-3">
        <Search size={20} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search users by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchData()}
          className="flex-1 bg-transparent outline-none font-medium text-gray-800 placeholder:text-gray-400"
        />
        <button onClick={fetchData} className="px-4 py-1.5 rounded-xl bg-brand-indigo text-white font-bold text-sm hover:bg-purple-700 transition-colors">
          Search
        </button>
      </div>

      {loading ? <LoadingState /> : (
        <>
          {/* Users Table */}
          <div className="glass p-6 rounded-3xl overflow-x-auto">
            <h3 className="font-bold text-gray-800 mb-4">Users ({users.length})</h3>
            {users.length === 0 ? <EmptyState message="No users found" /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 font-bold border-b border-gray-200">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Impact</th>
                    <th className="pb-3">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-white/50">
                      <td className="py-3 pr-4 font-bold text-gray-800">{u.name}</td>
                      <td className="py-3 pr-4">
                        <span className="bg-brand-blue/10 text-brand-blue text-xs font-bold px-2 py-1 rounded-full">
                          {u.role?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          u.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                          u.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {u.verification_status || 'unverified'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-bold text-brand-orange">{u.civic_impact_score || 0}</td>
                      <td className="py-3 font-medium text-gray-600">{u.level || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Moderation Queue */}
          <div className="glass p-6 rounded-3xl">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> Moderation Queue ({modQueue.length})
            </h3>
            {modQueue.length === 0 ? <EmptyState message="No flagged content pending review" /> : (
              <div className="space-y-3">
                {modQueue.map((flag: any) => (
                  <div key={flag.id} className="bg-white/70 p-4 rounded-2xl flex justify-between items-center border border-white/80">
                    <div>
                      <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full mr-2">{flag.target_type}</span>
                      <span className="font-medium text-gray-800">{flag.reason}</span>
                      <p className="text-xs text-gray-500 mt-1">Flagged by: {flag.flagged_by_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs hover:bg-gray-200">Dismiss</button>
                      <button className="px-3 py-1.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600">Action</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Section 3: Civic Incident Management ───────────────────────

function IncidentManagement() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/incidents', { params: { limit: 50 } });
      const data = res.data.data;
      setIncidents(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      console.error('Incidents fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await apiClient.patch(`/incidents/${id}`, { status: newStatus });
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
    } catch (err) {
      console.error('Failed to update incident', err);
      alert('Failed to update incident status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <><SectionHeader title="Civic Incident Management" subtitle="Review and manage incidents" onRefresh={fetchData} /><LoadingState /></>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Civic Incident Management" subtitle={`${incidents.length} incidents loaded`} onRefresh={fetchData} />

      <div className="glass p-6 rounded-3xl overflow-x-auto">
        {incidents.length === 0 ? <EmptyState message="No incidents found" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 font-bold border-b border-gray-200">
                <th className="pb-3 pr-3">Title</th>
                <th className="pb-3 pr-3">Category</th>
                <th className="pb-3 pr-3">Severity</th>
                <th className="pb-3 pr-3">Priority</th>
                <th className="pb-3 pr-3">Reports</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc: any) => (
                <tr key={inc.id} className="border-b border-gray-100 hover:bg-white/50">
                  <td className="py-3 pr-3 font-bold text-gray-800 max-w-[200px] truncate">{inc.title}</td>
                  <td className="py-3 pr-3 text-xs font-medium text-gray-600">{inc.category}</td>
                  <td className="py-3 pr-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      inc.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      inc.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      inc.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-3 pr-3 font-bold text-brand-indigo">{Number(inc.priority_score).toFixed(0)}</td>
                  <td className="py-3 pr-3 font-medium text-gray-700">{inc.report_count}</td>
                  <td className="py-3 pr-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      inc.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      inc.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {updatingId === inc.id ? (
                      <Loader2 size={16} className="animate-spin text-brand-indigo" />
                    ) : (
                      <select
                        value={inc.status}
                        onChange={e => updateStatus(inc.id, e.target.value)}
                        className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium cursor-pointer"
                      >
                        <option value="active">Active</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Section 4: NGO / Initiative Management ─────────────────────

function NGOManagement() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vrRes, orgRes, initRes] = await Promise.all([
        apiClient.get('/admin/verification-queue'),
        apiClient.get('/organizations').catch(() => ({ data: { data: [] } })),
        apiClient.get('/initiatives').catch(() => ({ data: { data: [] } })),
      ]);
      setVerifications(vrRes.data.data || []);
      const orgData = orgRes.data.data;
      setOrganizations(Array.isArray(orgData) ? orgData : (orgData?.items || []));
      const initData = initRes.data.data;
      setInitiatives(Array.isArray(initData) ? initData : (initData?.items || []));
    } catch (err) {
      console.error('NGO data fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id: string) => {
    try {
      await apiClient.post(`/admin/verification-queue/${id}/approve`, { review_notes: 'Approved via Admin Portal' });
      setVerifications(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Failed to approve', err);
      alert('Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await apiClient.post(`/admin/verification-queue/${id}/reject`, { reason });
      setVerifications(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Failed to reject', err);
      alert('Failed to reject request');
    }
  };

  if (loading) return <><SectionHeader title="NGO & Initiative Management" subtitle="Verification and organizations" onRefresh={fetchData} /><LoadingState /></>;

  return (
    <div className="space-y-6">
      <SectionHeader title="NGO & Initiative Management" subtitle="Verification queue, organizations, and initiatives" onRefresh={fetchData} />

      {/* Verification Queue */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ListChecks size={18} className="text-brand-orange" /> Verification Queue ({verifications.length})
        </h3>
        {verifications.length === 0 ? <EmptyState message="No pending verifications" /> : (
          <div className="space-y-3">
            {verifications.map(req => (
              <div key={req.id} className="bg-white/70 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center border border-white/80">
                <div className="mb-3 sm:mb-0">
                  <h4 className="font-bold text-gray-800 text-lg">{req.applicant_name || req.user_name || 'Unknown'}</h4>
                  <p className="text-sm text-gray-500 font-medium">
                    Requesting: <span className="font-bold text-gray-700">{req.role_applied?.replace(/_/g, ' ')}</span>
                    {req.city_name && <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{req.city_name}</span>}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleReject(req.id)} className="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white px-5 py-2 rounded-full text-sm font-bold transition-colors">
                    Reject
                  </button>
                  <button onClick={() => handleApprove(req.id)} className="bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-white px-5 py-2 rounded-full text-sm font-bold transition-colors shadow-sm">
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organizations */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-brand-green" /> Organizations ({organizations.length})
        </h3>
        {organizations.length === 0 ? <EmptyState message="No organizations registered yet" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {organizations.map((org: any) => (
              <div key={org.id} className="bg-white/70 p-4 rounded-2xl border border-white/80">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800">{org.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{org.type} | Reg: {org.registration_number || 'N/A'}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    org.verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                    org.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {org.verification_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Initiatives */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-indigo" /> Initiatives ({initiatives.length})
        </h3>
        {initiatives.length === 0 ? <EmptyState message="No active initiatives" /> : (
          <div className="space-y-3">
            {initiatives.map((init: any) => (
              <div key={init.id} className="bg-white/70 p-4 rounded-2xl border border-white/80 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-800">{init.title}</h4>
                  <p className="text-xs text-gray-500">{init.type} | Volunteers: {init.volunteer_count || 0}/{init.volunteer_target || '—'}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
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
    </div>
  );
}

// ─── Section 5: Analytics & Settings ────────────────────────────

function AnalyticsSettings() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/audit-logs', { params: { limit: 50 } });
      setAuditLogs(res.data.data || []);
    } catch (err) {
      console.error('Audit logs fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <><SectionHeader title="Analytics & Settings" subtitle="Audit trail and configuration" onRefresh={fetchData} /><LoadingState /></>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Analytics & Settings" subtitle="Audit trail and platform configuration" onRefresh={fetchData} />

      {/* Audit Logs */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-brand-indigo" /> Audit Logs ({auditLogs.length})
        </h3>
        {auditLogs.length === 0 ? <EmptyState message="No audit logs recorded" /> : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="bg-white/60 p-4 rounded-xl border border-white/80 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">{log.actor_name || 'System'}</span>
                    <span className="text-xs bg-brand-indigo/10 text-brand-indigo px-2 py-0.5 rounded-full font-medium">
                      {log.actor_role?.replace(/_/g, ' ') || 'system'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-bold">{log.action}</span> on {log.target_type}
                    {log.target_id && <span className="text-xs text-gray-400 ml-1">({log.target_id.slice(0, 8)}...)</span>}
                  </p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">{JSON.stringify(log.metadata)}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Configuration Info */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Settings size={18} className="text-gray-500" /> Platform Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConfigItem label="AI Model" value="NVIDIA Nemotron Ultra 253B" />
          <ConfigItem label="Database" value="PostgreSQL + PostGIS" />
          <ConfigItem label="Auth Provider" value="Firebase Authentication" />
          <ConfigItem label="Storage" value="Local / MinIO" />
          <ConfigItem label="Realtime" value="Socket.IO WebSocket" />
          <ConfigItem label="Report Categories" value="15 categories" />
          <ConfigItem label="Priority Formula" value="Severity 25% | Population 20% | Support 15% | Recurrence 15% | Vulnerability 10% | Evidence 10% | Urgency 5%" />
          <ConfigItem label="Auto-Promote Threshold" value="50 supporters → community_supported" />
        </div>
      </div>
    </div>
  );
}

// ─── Section 6: AI Intelligence Center ─────────────────────────

function AIIntelligence() {
  const [stats, setStats] = useState<any>(null);
  const [economics, setEconomics] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, econRes, healthRes] = await Promise.all([
        apiClient.get('/ai/stats').catch(() => null),
        apiClient.get('/ai/economics').catch(() => null),
        apiClient.get('/ai/health').catch(() => null),
      ]);
      setStats(statsRes?.data?.data || null);
      setEconomics(econRes?.data?.data || null);
      setHealth(healthRes?.data?.data || null);
    } catch (err) {
      console.error('AI Intelligence fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <><SectionHeader title="AI Intelligence Center" subtitle="NVIDIA Nemotron operations & economics" onRefresh={fetchData} /><LoadingState /></>;

  const successRate = stats?.success_rate ?? health?.success_rate ?? 0;
  const statusColor = successRate > 95 ? 'bg-green-500' : successRate > 80 ? 'bg-yellow-500' : 'bg-red-500';
  const statusLabel = successRate > 95 ? 'Operational' : successRate > 80 ? 'Degraded' : 'Issues Detected';

  return (
    <div className="space-y-6">
      <SectionHeader title="AI Intelligence Center" subtitle="NVIDIA Nemotron operations & economics" onRefresh={fetchData} />

      {/* AI Provider Card */}
      <div className="glass-dark p-6 rounded-3xl border-b-4 border-brand-indigo relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-indigo/10 rounded-full blur-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-brand-indigo to-purple-700">
                <Cpu size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-800 text-xl">NVIDIA Nemotron</h3>
                <p className="text-sm text-gray-500 font-medium">{stats?.model || 'nvidia/llama-3.1-nemotron-ultra-253b-v1'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`}></div>
            <span className="font-bold text-gray-700">{statusLabel}</span>
            <span className="text-xs bg-gray-100 px-3 py-1 rounded-full font-bold text-gray-600">
              {(successRate).toFixed(1)}% uptime
            </span>
          </div>
        </div>
      </div>

      {/* AI Operations Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Requests (Today)" value={stats?.total_requests || 0} icon={<Zap size={24} />} color="indigo" />
        <StatCard label="Success Rate" value={`${(successRate).toFixed(1)}%`} icon={<CheckCircle size={24} />} color="green" />
        <StatCard label="Avg Latency" value={`${stats?.avg_latency_ms || 0}ms`} icon={<Clock size={24} />} color="orange" />
        <StatCard label="Avg Confidence" value={`${(stats?.avg_confidence || 0).toFixed(1)}%`} icon={<TrendingUp size={24} />} color="blue" />
      </div>

      {/* AI Tasks Breakdown */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-brand-indigo" /> AI Tasks Breakdown
        </h3>
        {stats?.tasks && stats.tasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 font-bold border-b border-gray-200">
                  <th className="pb-3 pr-4">Task</th>
                  <th className="pb-3 pr-4">Requests</th>
                  <th className="pb-3 pr-4">Success Rate</th>
                  <th className="pb-3 pr-4">Avg Confidence</th>
                  <th className="pb-3">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {stats.tasks.map((task: any) => (
                  <tr key={task.task} className="border-b border-gray-100 hover:bg-white/50">
                    <td className="py-3 pr-4 font-bold text-gray-800 capitalize">{task.task.replace(/_/g, ' ')}</td>
                    <td className="py-3 pr-4 font-medium text-gray-700">{task.count}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        task.success_rate >= 95 ? 'bg-green-100 text-green-700' :
                        task.success_rate >= 80 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {task.success_rate?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-gray-700">{task.avg_confidence?.toFixed(1)}%</td>
                    <td className="py-3 font-medium text-gray-700">{task.avg_latency_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {['Classification', 'Clustering', 'Duplicate Detection', 'Priority', 'Summarization', 'Verification'].map(task => (
              <div key={task} className="bg-white/60 p-4 rounded-2xl border border-white/80">
                <p className="font-bold text-gray-700 text-sm">{task}</p>
                <p className="text-xs text-gray-400 mt-1">No data yet</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Economics */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign size={18} className="text-brand-green" /> AI Economics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white/60 p-4 rounded-2xl border border-white/80 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Est. Cost Today</p>
            <p className="text-xl font-black text-gray-800 mt-1">₹{economics?.estimated_cost_today?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white/60 p-4 rounded-2xl border border-white/80 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cost/Report</p>
            <p className="text-xl font-black text-gray-800 mt-1">₹{economics?.cost_per_report?.toFixed(3) || '0.000'}</p>
          </div>
          <div className="bg-white/60 p-4 rounded-2xl border border-white/80 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cost/Incident</p>
            <p className="text-xl font-black text-gray-800 mt-1">₹{economics?.cost_per_incident?.toFixed(3) || '0.000'}</p>
          </div>
          <div className="bg-white/60 p-4 rounded-2xl border border-white/80 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cost/User</p>
            <p className="text-xl font-black text-gray-800 mt-1">₹{economics?.cost_per_user?.toFixed(3) || '0.000'}</p>
          </div>
          <div className="bg-white/60 p-4 rounded-2xl border border-white/80 text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Failure Rate</p>
            <p className="text-xl font-black text-red-600 mt-1">{economics?.failure_rate?.toFixed(2) || '0.00'}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section 7: Rewards & Credits ──────────────────────────────

function RewardsCredits() {
  const [rules, setRules] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [fraudFlags, setFraudFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, redemptionsRes, dashRes, fraudRes] = await Promise.all([
        apiClient.get('/credits/rules').catch(() => null),
        apiClient.get('/rewards/redemptions/all', { params: { limit: 20 } }).catch(() => null),
        apiClient.get('/credits/dashboard').catch(() => null),
        apiClient.get('/fraud/flags', { params: { status: 'pending', limit: 10 } }).catch(() => null),
      ]);
      setRules(rulesRes?.data?.data || []);
      setRedemptions(redemptionsRes?.data?.data || []);
      setDashboard(dashRes?.data?.data || null);
      setFraudFlags(fraudRes?.data?.data || []);
    } catch (err) {
      console.error('Rewards fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleRule = async (id: string, active: boolean) => {
    try {
      await apiClient.patch(`/credits/rules/${id}`, { active: !active });
      setRules(prev => prev.map(r => r.id === id ? { ...r, active: !active } : r));
    } catch (err) {
      console.error('Failed to toggle rule', err);
    }
  };

  const saveRuleEdit = async (id: string) => {
    try {
      await apiClient.patch(`/credits/rules/${id}`, editValues);
      setRules(prev => prev.map(r => r.id === id ? { ...r, ...editValues } : r));
      setEditingRule(null);
      setEditValues({});
    } catch (err) {
      console.error('Failed to save rule', err);
    }
  };

  const handleFraudAction = async (id: string, action: 'confirmed' | 'dismissed') => {
    try {
      await apiClient.patch(`/fraud/flags/${id}`, { status: action });
      setFraudFlags(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Failed to update fraud flag', err);
    }
  };

  if (loading) return <><SectionHeader title="Rewards & Credits" subtitle="Civic credit economy management" onRefresh={fetchData} /><LoadingState /></>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Rewards & Credits" subtitle="Civic credit economy management" onRefresh={fetchData} />

      {/* Economy Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Credits Issued" value={dashboard?.total_credits_issued || 0} icon={<Zap size={24} />} color="orange" />
        <StatCard label="Credits Redeemed" value={dashboard?.total_credits_redeemed || 0} icon={<Gift size={24} />} color="green" />
        <StatCard label="Active Campaigns" value={dashboard?.active_campaigns || 0} icon={<TrendingUp size={24} />} color="blue" />
        <StatCard label="Fraud Alerts" value={fraudFlags.length} icon={<Shield size={24} />} color="indigo" />
      </div>

      {/* Reward Rules Table */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ListChecks size={18} className="text-brand-orange" /> Reward Rules ({rules.length})
        </h3>
        {rules.length === 0 ? <EmptyState message="No reward rules configured" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 font-bold border-b border-gray-200">
                  <th className="pb-3 pr-4">Action</th>
                  <th className="pb-3 pr-4">Base Points</th>
                  <th className="pb-3 pr-4">Daily Limit</th>
                  <th className="pb-3 pr-4">Verification</th>
                  <th className="pb-3 pr-4">Active</th>
                  <th className="pb-3">Edit</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule: any) => (
                  <tr key={rule.id} className="border-b border-gray-100 hover:bg-white/50">
                    <td className="py-3 pr-4">
                      <span className="font-bold text-gray-800">{rule.label}</span>
                      <p className="text-xs text-gray-400">{rule.action}</p>
                    </td>
                    <td className="py-3 pr-4">
                      {editingRule === rule.id ? (
                        <input
                          type="number"
                          className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm font-bold"
                          defaultValue={rule.base_points}
                          onChange={e => setEditValues((v: any) => ({ ...v, base_points: parseInt(e.target.value) }))}
                        />
                      ) : (
                        <span className="font-black text-brand-orange">+{rule.base_points}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {editingRule === rule.id ? (
                        <input
                          type="number"
                          className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm font-bold"
                          defaultValue={rule.daily_limit}
                          onChange={e => setEditValues((v: any) => ({ ...v, daily_limit: parseInt(e.target.value) }))}
                        />
                      ) : (
                        <span className="font-medium text-gray-700">{rule.daily_limit}/day</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        rule.requires_verification ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {rule.requires_verification ? 'Required' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <button onClick={() => toggleRule(rule.id, rule.active)} className="text-gray-500 hover:text-gray-800">
                        {rule.active ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} className="text-gray-400" />}
                      </button>
                    </td>
                    <td className="py-3">
                      {editingRule === rule.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveRuleEdit(rule.id)} className="px-2 py-1 rounded-lg bg-green-500 text-white text-xs font-bold">Save</button>
                          <button onClick={() => { setEditingRule(null); setEditValues({}); }} className="px-2 py-1 rounded-lg bg-gray-200 text-gray-600 text-xs font-bold">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingRule(rule.id); setEditValues({}); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                          <Edit2 size={14} className="text-gray-500" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Redemptions */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Gift size={18} className="text-brand-green" /> Recent Redemptions
        </h3>
        {redemptions.length === 0 ? <EmptyState message="No redemptions yet" /> : (
          <div className="space-y-2">
            {redemptions.map((r: any) => (
              <div key={r.id} className="bg-white/60 p-4 rounded-2xl border border-white/80 flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-800">{r.user_name || 'User'}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium text-gray-700">{r.reward_name || 'Reward'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-brand-orange">-{r.credits_spent}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    r.status === 'fulfilled' ? 'bg-green-100 text-green-700' :
                    r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {r.status}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fraud Alerts */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Shield size={18} className="text-red-500" /> Fraud Alerts ({fraudFlags.length} pending)
        </h3>
        {fraudFlags.length === 0 ? <EmptyState message="No pending fraud alerts — system is clean" /> : (
          <div className="space-y-3">
            {fraudFlags.map((flag: any) => (
              <div key={flag.id} className="bg-white/70 p-4 rounded-2xl border border-white/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800">{flag.user_name || 'Unknown User'}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      flag.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      flag.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      flag.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {flag.severity}
                    </span>
                    <span className="text-xs bg-brand-indigo/10 text-brand-indigo px-2 py-0.5 rounded-full font-medium">
                      {flag.flag_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{flag.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleFraudAction(flag.id, 'dismissed')}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs hover:bg-gray-200 transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleFraudAction(flag.id, 'confirmed')}
                    className="px-3 py-1.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors"
                  >
                    Confirm Fraud
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section 8: Revenue & CSR ──────────────────────────────────

function RevenueCSR() {
  const [summary, setSummary] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, campaignsRes, sponsorsRes] = await Promise.all([
        apiClient.get('/revenue/summary').catch(() => null),
        apiClient.get('/campaigns', { params: { status: 'active', limit: 10 } }).catch(() => null),
        apiClient.get('/sponsors', { params: { limit: 10 } }).catch(() => null),
      ]);
      setSummary(summaryRes?.data?.data || null);
      setCampaigns(campaignsRes?.data?.data || []);
      setSponsors(sponsorsRes?.data?.data || []);
    } catch (err) {
      console.error('Revenue fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <><SectionHeader title="Revenue & CSR" subtitle="Platform revenue and sponsor management" onRefresh={fetchData} /><LoadingState /></>;

  const REVENUE_SOURCES = [
    { key: 'csr_platform_fee', label: 'CSR Platform Fee', color: 'bg-brand-green' },
    { key: 'municipal_saas', label: 'Municipal SaaS', color: 'bg-brand-blue' },
    { key: 'ngo_premium', label: 'NGO Premium', color: 'bg-brand-indigo' },
    { key: 'impact_analytics', label: 'Impact Analytics', color: 'bg-brand-orange' },
    { key: 'sponsorship_fee', label: 'Sponsorship Fee', color: 'bg-purple-500' },
  ];

  const totalRevenue = summary?.total_revenue || 0;

  return (
    <div className="space-y-6">
      <SectionHeader title="Revenue & CSR" subtitle="Platform revenue and sponsor management" onRefresh={fetchData} />

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${(summary?.total_revenue || 0).toLocaleString()}`} icon={<DollarSign size={24} />} color="green" />
        <StatCard label="This Month" value={`₹${(summary?.this_month || 0).toLocaleString()}`} icon={<TrendingUp size={24} />} color="blue" />
        <StatCard label="Active Sponsors" value={sponsors.length} icon={<Building2 size={24} />} color="orange" />
        <StatCard label="Active Campaigns" value={campaigns.length} icon={<Activity size={24} />} color="indigo" />
      </div>

      {/* Revenue by Source */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-green" /> Revenue by Source
        </h3>
        <div className="space-y-3">
          {REVENUE_SOURCES.map(source => {
            const amount = summary?.by_source?.[source.key] || 0;
            const percentage = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
            return (
              <div key={source.key} className="bg-white/60 p-4 rounded-2xl border border-white/80">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700 text-sm">{source.label}</span>
                  <span className="font-black text-gray-800">₹{amount.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${source.color}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{percentage.toFixed(1)}% of total</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Campaigns */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-brand-blue" /> Active Campaigns ({campaigns.length})
        </h3>
        {campaigns.length === 0 ? <EmptyState message="No active campaigns" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((campaign: any) => {
              const progress = campaign.target_participants > 0
                ? Math.round((campaign.actual_participants / campaign.target_participants) * 100)
                : 0;
              return (
                <div key={campaign.id} className="bg-white/70 p-5 rounded-2xl border border-white/80">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-800">{campaign.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{campaign.sponsor_name || 'Sponsor'}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                      campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Budget: <span className="font-bold text-gray-700">₹{Number(campaign.budget || 0).toLocaleString()}</span></span>
                    <span>{campaign.actual_participants}/{campaign.target_participants} participants</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-indigo" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-right text-gray-400 mt-1">{progress}% filled</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sponsor Directory */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Building2 size={18} className="text-brand-orange" /> Sponsor Directory ({sponsors.length})
        </h3>
        {sponsors.length === 0 ? <EmptyState message="No sponsors registered yet" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sponsors.map((sponsor: any) => (
              <div key={sponsor.id} className="bg-white/70 p-5 rounded-2xl border border-white/80 hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-orange-400 flex items-center justify-center text-white font-black text-sm">
                    {sponsor.name?.[0] || 'S'}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{sponsor.name}</h4>
                    <p className="text-xs text-gray-500">{sponsor.sector || 'Various'}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    sponsor.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                    sponsor.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {sponsor.verification_status || 'pending'}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{sponsor.campaign_count || 0} campaigns</p>
                    <p className="text-xs font-bold text-gray-700">₹{(sponsor.total_csr || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────

function SectionHeader({ title, subtitle, onRefresh }: { title: string; subtitle: string; onRefresh?: () => void }) {
  return (
    <div className="flex justify-between items-center mb-2">
      <div>
        <h2 className="text-3xl font-extrabold text-gray-800">{title}</h2>
        <p className="text-gray-500 font-medium">{subtitle}</p>
      </div>
      {onRefresh && (
        <button onClick={onRefresh} className="p-3 rounded-2xl glass hover:bg-white/80 transition-colors" title="Refresh">
          <RefreshCw size={20} className="text-gray-600" />
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-brand-blue to-blue-500',
    green: 'from-brand-green to-emerald-500',
    orange: 'from-brand-orange to-orange-400',
    indigo: 'from-brand-indigo to-purple-600',
  };
  return (
    <div className="glass p-5 rounded-3xl flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all">
      <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} text-white shadow-md`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function HealthCard({ name, status, detail }: { name: string; status: string; detail: string }) {
  return (
    <div className="bg-white/60 p-4 rounded-2xl border border-white flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="font-bold text-gray-800">{name}</span>
      </div>
      <span className={`text-xs px-3 py-1 rounded-full font-bold ${
        status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {status === 'online' ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/60 p-4 rounded-xl border border-white/80">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-1">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 size={36} className="animate-spin text-brand-indigo" />
      <p className="text-gray-500 font-medium mt-4">Loading...</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10 bg-white/40 rounded-2xl border border-dashed border-gray-300">
      <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );
}

export default AdminDashboard;
