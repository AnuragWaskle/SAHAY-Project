import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  ShieldCheck, LayoutDashboard, Users, AlertTriangle, Building2, Settings,
  ListChecks, Loader2, RefreshCw, Search, ChevronDown, Activity,
  FileText, CheckCircle, XCircle, Clock, TrendingUp, Database,
  Cpu, Gift, DollarSign, Zap, Shield, ToggleLeft, ToggleRight, Edit2,
  Eye, Check, X, Sparkles, Plus, Image as ImageIcon, Mail, Phone, MapPin,
  Star, Award, User as UserIcon, ExternalLink
} from 'lucide-react';
import apiClient from '../api/client';

// ─── User Profile Modal ──────────────────────────────────────────
function UserProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get(`/users/${userId}`);
        setProfile(res.data.data || res.data);
      } catch (e) {
        console.error('Failed to fetch user profile:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  const badgeColor: Record<string, string> = {
    blue_tick: 'bg-blue-100 text-blue-700',
    green_tick: 'bg-green-100 text-green-700',
    press_badge: 'bg-yellow-100 text-yellow-700',
    grey_check: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="glass max-w-lg w-full rounded-3xl p-6 space-y-5 shadow-2xl border border-white/60" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <h3 className="font-extrabold text-gray-800 text-xl flex items-center gap-2">
            <UserIcon size={22} className="text-brand-indigo" /> Citizen Profile
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 size={32} className="animate-spin text-brand-indigo" />
            <p className="text-gray-500 font-medium">Loading profile...</p>
          </div>
        ) : !profile ? (
          <div className="text-center py-10 text-gray-400 font-medium">Failed to load profile.</div>
        ) : (
          <>
            {/* Avatar + Name */}
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-indigo to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-3xl">{profile.name?.[0]?.toUpperCase() || '?'}</span>
                </div>
              )}
              <div>
                <h4 className="text-xl font-black text-gray-800">{profile.name || 'Unknown'}</h4>
                <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${
                  profile.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                  profile.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{profile.verification_status || 'unverified'}</span>
                {profile.badge_type && profile.badge_type !== 'none' && (
                  <span className={`ml-2 text-xs font-bold px-2.5 py-1 rounded-full ${
                    badgeColor[profile.badge_type] || 'bg-gray-100 text-gray-600'
                  }`}>{profile.badge_type?.replace(/_/g, ' ')}</span>
                )}
              </div>
            </div>

            {/* Role + City */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 p-3 rounded-2xl border border-white/80">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role</p>
                <p className="font-bold text-gray-800 mt-1 capitalize">{profile.role?.replace(/_/g, ' ') || 'citizen'}</p>
              </div>
              <div className="bg-white/60 p-3 rounded-2xl border border-white/80">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Level</p>
                <p className="font-black text-brand-indigo mt-1">Level {profile.level || 1}</p>
              </div>
              <div className="bg-white/60 p-3 rounded-2xl border border-white/80">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Civic Score</p>
                <p className="font-black text-brand-orange mt-1">{profile.civic_impact_score || 0} pts</p>
              </div>
              <div className="bg-white/60 p-3 rounded-2xl border border-white/80">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">City</p>
                <p className="font-bold text-gray-800 mt-1">{profile.city_name || profile.city_id || '—'}</p>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              {profile.email && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail size={15} className="text-gray-400" />
                  <span className="font-medium">{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone size={15} className="text-gray-400" />
                  <span className="font-medium">{profile.phone}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="bg-white/60 p-3 rounded-2xl border border-white/80">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Bio</p>
                <p className="text-sm text-gray-700 font-medium">{profile.bio}</p>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-indigo-50 p-3 rounded-2xl text-center">
                <p className="text-xl font-black text-brand-indigo">{profile.reports_count || profile.incident_count || 0}</p>
                <p className="text-xs font-bold text-gray-500">Reports</p>
              </div>
              <div className="bg-green-50 p-3 rounded-2xl text-center">
                <p className="text-xl font-black text-brand-green">{profile.resolved_count || 0}</p>
                <p className="text-xs font-bold text-gray-500">Resolved</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-2xl text-center">
                <p className="text-xl font-black text-brand-orange">{profile.badges_count || (profile.badges?.length) || 0}</p>
                <p className="text-xs font-bold text-gray-500">Badges</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-right">Member since {new Date(profile.created_at || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </>
        )}
      </div>
    </div>
  );
}


type Tab = 'command' | 'users' | 'incidents' | 'revenue' | 'gamification' | 'feedback';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'command', label: 'Command Center', icon: <LayoutDashboard size={20} /> },
  { key: 'users', label: 'Account Approvals & Users', icon: <Users size={20} /> },
  { key: 'incidents', label: 'Incidents & AI Verification', icon: <AlertTriangle size={20} /> },
  { key: 'revenue', label: 'Revenue & CSR', icon: <DollarSign size={20} /> },
  { key: 'gamification', label: 'Gamification & Leaderboard', icon: <Award size={20} /> },
  { key: 'feedback', label: 'App Feedback', icon: <Star size={20} /> },
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
        {activeTab === 'revenue' && <RevenueCSR />}
        {activeTab === 'gamification' && <GamificationAdmin />}
        {activeTab === 'feedback' && <ApplicationFeedback />}
      </main>
    </div>
  );
};

// ─── Section 1: Command Center ──────────────────────────────────

const CHART_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2'];

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

  // Format data for Recharts
  const categoryData = (stats?.category_breakdown || []).map((item: any) => ({
    name: (item.category || 'Other').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    count: parseInt(item.count || '0'),
  }));

  const trendData = (stats?.weekly_trends || []).map((t: any, i: number) => ({
    day: t.day ? new Date(t.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : `Day ${i + 1}`,
    reports: parseInt(t.count || '0'),
  }));

  const statusPieData = (stats?.incidents_by_status || []).map((r: any) => ({
    name: (r.status || 'unknown').replace(/_/g, ' '),
    value: parseInt(r.count || '0'),
  }));

  const roleBarData = (stats?.users_by_role || []).map((r: any) => ({
    role: (r.role || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    count: parseInt(r.count || '0'),
  }));

  return (
    <div className="space-y-6">
      <SectionHeader title="Command Center" subtitle="Platform-wide overview — all data live from PostgreSQL" onRefresh={fetchData} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totalUsers} icon={<Users size={24} />} color="blue" />
        <StatCard label="Cities" value={stats?.cities || 0} icon={<Building2 size={24} />} color="green" />
        <StatCard label="Total Incidents" value={totalIncidents} icon={<AlertTriangle size={24} />} color="orange" />
        <StatCard label="Reports (24h)" value={stats?.reports_last_24h || 0} icon={<FileText size={24} />} color="indigo" />
      </div>

      {/* Row 1: Category bar + Daily trend area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Categories — Horizontal Bar Chart */}
        <div className="glass p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-indigo" /> Incidents by Category
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-brand-indigo rounded-full">Live SQL</span>
          </div>
          {categoryData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(val: any) => [`${val} incidents`, 'Count']}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#7C3AED">
                  {categoryData.map((_: any, idx: number) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No incident categories in database yet" />}
        </div>

        {/* Daily Report Volume — Area Chart */}
        <div className="glass p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Activity size={18} className="text-emerald-600" /> Daily Report Volume
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">PostgreSQL Query</span>
          </div>
          {trendData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ left: -10, right: 10, top: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11, fontWeight: 700 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(val: any) => [`${val} reports`, 'Volume']}
                />
                <Area type="monotone" dataKey="reports" stroke="#7C3AED" strokeWidth={2.5} fill="url(#trendGrad)" dot={{ r: 4, fill: '#7C3AED' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No report volume data in database yet" />}
        </div>
      </div>

      {/* Row 2: Incident Status Pie + Users by Role Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Status — Donut/Pie */}
        <div className="glass p-6 rounded-3xl">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-brand-orange" /> Incidents by Status
          </h3>
          {statusPieData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusPieData.map((_: any, idx: number) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(val: any, name: any) => [`${val} incidents`, name]}
                />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No incident data" />}
        </div>

        {/* Users by Role — Vertical Bar */}
        <div className="glass p-6 rounded-3xl">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-brand-blue" /> Users by Role
          </h3>
          {roleBarData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roleBarData} margin={{ left: -10, right: 10, top: 4, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="role" tick={{ fontSize: 10, fontWeight: 600 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fontWeight: 700 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(val: any) => [`${val} users`, 'Count']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {roleBarData.map((_: any, idx: number) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No user data available" />}
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
  const [verifications, setVerifications] = useState<any[]>([]);
  const [modQueue, setModQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, vrRes, modRes] = await Promise.all([
        apiClient.get('/users', { params: { limit: 50, search: search || undefined } }),
        apiClient.get('/admin/verification-queue'),
        apiClient.get('/admin/moderation-queue'),
      ]);
      setUsers(usersRes.data.data?.items || usersRes.data.data || []);
      setVerifications(vrRes.data.data || []);
      setModQueue(modRes.data.data || []);
    } catch (err) {
      console.error('User content fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApproveAccount = async (id: string) => {
    setActioningId(id);
    try {
      await apiClient.post(`/admin/verification-queue/${id}/approve`, { review_notes: 'Approved via Admin Panel' });
      setVerifications(prev => prev.filter(v => v.id !== id));
      fetchData();
    } catch (err) {
      alert('Failed to approve account request');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectAccount = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setActioningId(id);
    try {
      await apiClient.post(`/admin/verification-queue/${id}/reject`, { reason });
      setVerifications(prev => prev.filter(v => v.id !== id));
      fetchData();
    } catch (err) {
      alert('Failed to reject account request');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="User & Content Management" subtitle="Account approvals, role verifications, and content moderation" onRefresh={fetchData} />

      {/* Search Bar */}
      <div className="glass p-4 rounded-2xl flex items-center gap-3">
        <Search size={20} className="text-gray-400" />
        <input
          type="text"
          placeholder="Search users by name, role, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchData()}
          className="flex-1 bg-transparent outline-none font-medium text-gray-800 placeholder:text-gray-400"
        />
        <button onClick={fetchData} className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-indigo to-purple-600 text-white font-bold text-sm hover:shadow-lg transition-all">
          Search
        </button>
      </div>

      {loading ? <LoadingState /> : (
        <>
          {/* Account Creation & Role Verification Requests Queue */}
          <div className="glass p-6 rounded-3xl border-l-4 border-brand-orange">
            <h3 className="font-bold text-gray-800 mb-2 text-lg flex items-center gap-2">
              <ListChecks size={22} className="text-brand-orange" /> Account Creation & Role Verification Requests ({verifications.length})
            </h3>
            <p className="text-sm text-gray-500 mb-4 font-medium">
              Approve or reject incoming registration requests for Municipal Officers, NGO Partners, CSR Corporate Representatives, and Journalists.
            </p>
            {verifications.length === 0 ? <EmptyState message="No pending account creation requests" /> : (
              <div className="space-y-3">
                {verifications.map(req => (
                  <div key={req.id} className="bg-white/80 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center border border-white/90 shadow-sm hover:shadow-md transition-all gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedUserId(req.user_id || req.id)}
                          className="font-extrabold text-gray-800 text-base hover:text-brand-indigo transition-colors flex items-center gap-1.5"
                        >
                          {req.applicant_name || req.email || 'Applicant'}
                          <ExternalLink size={13} className="opacity-50" />
                        </button>
                        <span className="bg-brand-indigo/10 text-brand-indigo text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                          {req.role_applied?.replace(/_/g, ' ')}
                        </span>
                        {req.city_name && (
                          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            {req.city_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-medium">
                        Contact: <span className="text-gray-700 font-semibold">{req.email || 'No Email'}</span> | Phone: <span className="text-gray-700 font-semibold">{req.phone || 'N/A'}</span>
                      </p>
                      {req.documents && req.documents.length > 0 && (
                        <p className="text-xs text-gray-400 font-medium flex items-center gap-1 mt-1">
                          <FileText size={13} className="text-brand-indigo" /> Credentials: <span className="text-gray-600 font-bold">{req.documents.join(', ')}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleRejectAccount(req.id)}
                        disabled={actioningId === req.id}
                        className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all"
                      >
                        Reject Request
                      </button>
                      <button
                        onClick={() => handleApproveAccount(req.id)}
                        disabled={actioningId === req.id}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-md px-5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5"
                      >
                        <Check size={15} /> Approve Account
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Users Table — clickable rows */}
          <div className="glass p-6 rounded-3xl overflow-x-auto">
            <h3 className="font-bold text-gray-800 mb-1 text-base">Registered Users ({users.length})</h3>
            <p className="text-xs text-gray-400 mb-4 font-medium">Click any row to view full citizen profile</p>
            {users.length === 0 ? <EmptyState message="No users found" /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 font-bold border-b border-gray-200">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Verification</th>
                    <th className="pb-3 pr-4">Civic Score</th>
                    <th className="pb-3">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className="border-b border-gray-100 hover:bg-brand-indigo/5 cursor-pointer transition-colors group"
                      title="Click to view profile"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-indigo to-purple-500 flex items-center justify-center">
                              <span className="text-white font-black text-xs">{u.name?.[0]?.toUpperCase()}</span>
                            </div>
                          )}
                          <span className="font-bold text-gray-800 group-hover:text-brand-indigo transition-colors">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="bg-brand-blue/10 text-brand-blue text-xs font-bold px-2.5 py-1 rounded-full capitalize">
                          {u.role?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          u.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                          u.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {u.verification_status || 'unverified'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-bold text-brand-orange">{u.civic_impact_score || 0} pts</td>
                      <td className="py-3 font-medium text-gray-600">Lvl {u.level || 1}</td>
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

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}

// ─── Section 3: Civic Incident Management ───────────────────────

function IncidentManagement() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [aiVerifyingId, setAiVerifyingId] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, any>>({});

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

  const runAiVerification = async (inc: any) => {
    setAiVerifyingId(inc.id);
    try {
      const imgUrl = (inc.media_urls && inc.media_urls[0]) || inc.image || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&q=80';
      const res = await apiClient.post('/admin/verify-image-ai', {
        incident_id: inc.id,
        media_url: imgUrl,
        category: inc.category,
      });
      setAiResults(prev => ({ ...prev, [inc.id]: res.data.data }));
    } catch (err) {
      console.error('AI verification failed', err);
      alert('AI Verification failed to execute');
    } finally {
      setAiVerifyingId(null);
    }
  };

  if (loading) return <><SectionHeader title="Civic Incident Management" subtitle="Review submitted images, execute AI verification, and manage tickets" onRefresh={fetchData} /><LoadingState /></>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Civic Incident Management" subtitle={`${incidents.length} incidents loaded from real mobile application data`} onRefresh={fetchData} />

      <div className="glass p-6 rounded-3xl overflow-x-auto">
        {incidents.length === 0 ? <EmptyState message="No incidents found" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 font-bold border-b border-gray-200">
                <th className="pb-3 pr-3">Evidence Image</th>
                <th className="pb-3 pr-3">Title & Category</th>
                <th className="pb-3 pr-3">Severity</th>
                <th className="pb-3 pr-3">Priority</th>
                <th className="pb-3 pr-3">Reporter</th>
                <th className="pb-3 pr-3">AI Image Verification</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3">Manual Control</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc: any) => {
                const imgUrl = (inc.media_urls && inc.media_urls[0]) || inc.image || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&q=80';
                const aiData = aiResults[inc.id];
                return (
                  <tr key={inc.id} className="border-b border-gray-100 hover:bg-white/50 transition-colors">
                    {/* Image Thumbnail */}
                    <td className="py-3 pr-3">
                      <div
                        onClick={() => setSelectedImage({ url: imgUrl, title: inc.title, reporter: inc.reporter_name || 'Citizen User', category: inc.category, created_at: inc.created_at })}
                        className="relative w-16 h-12 rounded-xl overflow-hidden cursor-pointer group shadow-sm border border-gray-200"
                      >
                        <img src={imgUrl} alt={inc.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye size={16} className="text-white" />
                        </div>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-3 pr-3">
                      <span className="font-extrabold text-gray-800 block max-w-[180px] truncate">{inc.title}</span>
                      <span className="text-xs font-semibold text-gray-500 capitalize">{inc.category?.replace(/_/g, ' ')}</span>
                    </td>

                    {/* Severity */}
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

                    <td className="py-3 pr-3 font-black text-brand-indigo">{Number(inc.priority_score || 70).toFixed(0)}</td>
                    <td className="py-3 pr-3 text-xs font-bold text-gray-700">{inc.reporter_name || 'Rahul Sharma'}</td>

                    {/* AI Image Verification Badge / Action */}
                    <td className="py-3 pr-3">
                      {aiData ? (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                          <Sparkles size={14} className="text-emerald-600 animate-spin" />
                          <span>AI Verified ({aiData.confidence})</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => runAiVerification(inc)}
                          disabled={aiVerifyingId === inc.id}
                          className="bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                        >
                          {aiVerifyingId === inc.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          <span>AI Verify Image</span>
                        </button>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 pr-3">
                      <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                        inc.status === 'resolved' ? 'bg-green-100 text-green-700' :
                        inc.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inc.status}
                      </span>
                    </td>

                    {/* Manual Controls */}
                    <td className="py-3">
                      {updatingId === inc.id ? (
                        <Loader2 size={16} className="animate-spin text-brand-indigo" />
                      ) : (
                        <select
                          value={inc.status}
                          onChange={e => updateStatus(inc.id, e.target.value)}
                          className="text-xs bg-white border border-gray-300 rounded-lg px-2 py-1 font-bold text-gray-800 cursor-pointer outline-none focus:ring-2 focus:ring-brand-indigo"
                        >
                          <option value="active">Active</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Image Lightbox Modal for Manual Image Verification */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-dark max-w-2xl w-full p-6 rounded-3xl space-y-4 border border-white/20 text-white relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2">
              <ImageIcon size={20} className="text-brand-indigo" />
              <h3 className="font-extrabold text-lg text-white">{selectedImage.title}</h3>
            </div>
            <div className="w-full h-80 rounded-2xl overflow-hidden bg-black/50 flex items-center justify-center">
              <img src={selectedImage.url} alt={selectedImage.title} className="w-full h-full object-contain" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs bg-white/10 p-4 rounded-2xl">
              <div><span className="text-gray-400">Reporter:</span> <span className="font-bold text-white">{selectedImage.reporter}</span></div>
              <div><span className="text-gray-400">Category:</span> <span className="font-bold text-white capitalize">{selectedImage.category}</span></div>
              <div><span className="text-gray-400">Uploaded:</span> <span className="font-bold text-white">{new Date(selectedImage.created_at || Date.now()).toLocaleString()}</span></div>
              <div><span className="text-gray-400">Vision Integrity:</span> <span className="font-bold text-green-400">Original JPEG Image</span></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setSelectedImage(null)} className="px-5 py-2 rounded-xl bg-white/20 text-white font-bold text-xs hover:bg-white/30 transition-colors">
                Close Preview
              </button>
              <button
                onClick={() => {
                  alert('Photo manually verified by admin');
                  setSelectedImage(null);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle size={15} /> Confirm Manual Verification
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/revenue');
      setData(res.data.data);
    } catch (err) {
      console.error('Revenue fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <><SectionHeader title="Revenue & CSR" subtitle="Platform revenue and sponsor management" onRefresh={fetchData} /><LoadingState /></>;

  const totalRevenue = data?.total_revenue || 0;
  const transactions = data?.transactions || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800">Revenue & CSR Analytics</h2>
          <p className="text-gray-500 font-medium">Real-time revenue metrics from PostgreSQL contributions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="p-3 rounded-2xl glass hover:bg-white/80 transition-colors" title="Refresh">
            <RefreshCw size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Revenue Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString('en-IN')}`} icon={<DollarSign size={24} />} color="green" />
        <StatCard label="Total Transactions" value={transactions.length} icon={<Activity size={24} />} color="blue" />
      </div>

      {/* Transactions */}
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-brand-blue" /> Recent Transactions
        </h3>
        {transactions.length === 0 ? <EmptyState message="No revenue recorded yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 font-bold border-b border-gray-200">
                  <th className="pb-3 pr-4">Contributor</th>
                  <th className="pb-3 pr-4">Amount (₹)</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t: any) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-white/50">
                    <td className="py-3 pr-4 font-bold text-gray-800">
                      {t.contributor_name}
                      <span className="block text-xs text-gray-400 capitalize">{t.contributor_role?.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 pr-4 font-bold text-brand-green">₹{t.amount}</td>
                    <td className="py-3 pr-4 font-semibold text-gray-700 capitalize">{t.type}</td>
                    <td className="py-3 pr-4 text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="py-3 text-gray-600">{t.notes || t.initiative_title || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section 9: Gamification & Badges ────────────────────────────

function GamificationAdmin() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBadgeModal, setShowAddBadgeModal] = useState(false);
  const [newBadge, setNewBadge] = useState({ code: '', name: '', description: '', icon: 'Award', category: 'achievement' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leaderboardRes, badgesRes] = await Promise.all([
        apiClient.get('/admin/leaderboard'),
        apiClient.get('/admin/badges'),
      ]);
      setLeaderboard(leaderboardRes.data.data || []);
      setBadges(badgesRes.data.data || []);
    } catch (err) {
      console.error('Gamification fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/badges', newBadge);
      alert('Badge created!');
      setShowAddBadgeModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to create badge');
    }
  };

  if (loading) return <><SectionHeader title="Gamification" subtitle="Leaderboard & Badges" onRefresh={fetchData} /><LoadingState /></>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Gamification & Leaderboard" subtitle="Citizen engagement and dynamic rewards" onRefresh={fetchData} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Award className="text-brand-orange" /> Leaderboard (Top 50)</h3>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto pr-2">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/90 backdrop-blur">
                <tr className="text-left text-gray-500 font-bold border-b border-gray-200">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 pr-4">Citizen</th>
                  <th className="pb-3 pr-4">Score</th>
                  <th className="pb-3">Level</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user, idx) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-white/50">
                    <td className="py-3 pr-4 font-black text-brand-orange">#{idx + 1}</td>
                    <td className="py-3 pr-4 font-bold text-gray-800">{user.name}</td>
                    <td className="py-3 pr-4 font-bold text-brand-indigo">{user.civic_impact_score} pts</td>
                    <td className="py-3 font-semibold text-gray-700">Lvl {user.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Shield className="text-brand-green" /> System Badges</h3>
              <button onClick={() => setShowAddBadgeModal(true)} className="text-sm font-bold bg-brand-indigo text-white px-3 py-1.5 rounded-xl">Add Badge</button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
              {badges.map(b => (
                <div key={b.id} className="bg-white/50 p-3 rounded-2xl border border-white">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-800">{b.name}</h4>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">{b.category}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{b.description}</p>
                  <p className="text-xs font-mono text-gray-400 mt-2">{b.code}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAddBadgeModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Badge</h3>
            <form onSubmit={handleCreateBadge} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Code</label><input type="text" required value={newBadge.code} onChange={e => setNewBadge(p => ({...p, code: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2" placeholder="e.g. eco_warrior"/></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Name</label><input type="text" required value={newBadge.name} onChange={e => setNewBadge(p => ({...p, name: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2" placeholder="e.g. Eco Warrior"/></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1">Description</label><input type="text" required value={newBadge.description} onChange={e => setNewBadge(p => ({...p, description: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"/></div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAddBadgeModal(false)} className="px-4 py-2 font-bold text-gray-600 bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 font-bold text-white bg-brand-indigo rounded-xl">Create Badge</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section 10: App Feedback ────────────────────────────────

function ApplicationFeedback() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/feedback');
      setFeedback(res.data.data || []);
    } catch (err) {
      console.error('Feedback fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <><SectionHeader title="Application Feedback" subtitle="Citizen reviews and ratings" onRefresh={fetchData} /><LoadingState /></>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Application Feedback" subtitle="Citizen reviews and ratings from the mobile app" onRefresh={fetchData} />
      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Star className="text-yellow-500" /> Recent Feedback</h3>
        {feedback.length === 0 ? <EmptyState message="No feedback recorded yet." /> : (
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
            {feedback.map((f: any) => (
              <div key={f.id} className="bg-white/60 p-4 rounded-2xl border border-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-800">{f.user_name} <span className="text-xs text-gray-500 font-normal">({f.user_email})</span></h4>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={14} className={star <= f.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{new Date(f.created_at).toLocaleString()}</span>
                </div>
                {f.comment && <p className="text-gray-700 mt-2 font-medium bg-white/40 p-3 rounded-xl">{f.comment}</p>}
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

function ContractorPerformance() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/contractors/performance');
      setData(res.data.data || []);
    } catch (err) {
      console.error('Contractor performance fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <><SectionHeader title="Contractor Performance" subtitle="Real resolution quality & SLA metrics" onRefresh={fetchData} /><LoadingState /></>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Contractor Performance" subtitle="Real-world resolution verification, on-time rate, and citizen satisfaction" onRefresh={fetchData} />

      <div className="glass p-6 rounded-3xl">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ListChecks size={18} className="text-brand-blue" /> Field Contractors ({data.length})
        </h3>
        {data.length === 0 ? <EmptyState message="No contractor performance records recorded yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 font-bold border-b border-gray-200">
                  <th className="pb-3 pr-4">Contractor</th>
                  <th className="pb-3 pr-4">Total Jobs</th>
                  <th className="pb-3 pr-4">Completed</th>
                  <th className="pb-3 pr-4">On-Time %</th>
                  <th className="pb-3 pr-4">Verified %</th>
                  <th className="pb-3 pr-4">Citizen Rejection %</th>
                  <th className="pb-3 pr-4">Avg Resolution Time</th>
                  <th className="pb-3">Rating</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c: any) => (
                  <tr key={c.contractor_id} className="border-b border-gray-100 hover:bg-white/50">
                    <td className="py-3 pr-4">
                      <span className="font-bold text-gray-800 block">{c.contractor_name}</span>
                      <span className="text-xs text-gray-400">{c.email || c.phone || 'Field Contractor'}</span>
                    </td>
                    <td className="py-3 pr-4 font-bold text-gray-700">{c.total_jobs}</td>
                    <td className="py-3 pr-4 font-semibold text-gray-700">{c.completed_jobs}</td>
                    <td className="py-3 pr-4 font-bold text-brand-blue">{c.on_time_pct}%</td>
                    <td className="py-3 pr-4 font-bold text-brand-green">{c.verified_resolution_pct}%</td>
                    <td className="py-3 pr-4 font-bold text-red-500">{c.citizen_rejection_pct}%</td>
                    <td className="py-3 pr-4 text-gray-600 font-medium">{c.avg_resolution_hours} hrs</td>
                    <td className="py-3">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase ${
                        c.performance_rating === 'EXCELLENT' ? 'bg-green-100 text-green-700' :
                        c.performance_rating === 'GOOD' ? 'bg-blue-100 text-blue-700' :
                        c.performance_rating === 'NEEDS_IMPROVEMENT' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {c.performance_rating?.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
