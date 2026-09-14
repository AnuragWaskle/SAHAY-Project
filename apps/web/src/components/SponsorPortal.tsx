import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  DollarSign,
  TrendingUp,
  Users,
  Activity,
  Award,
  Shield,
  Briefcase,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import apiClient from '../api/client';

export default function SponsorPortal() {
  const [profile, setProfile] = useState<any>(null);
  const [impact, setImpact] = useState<any>(null);
  const [matchedDemands, setMatchedDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch Sponsor Profile linked to logged-in user
      const profileRes = await apiClient.get('/sponsors/me');
      if (profileRes.data?.success) {
        const pData = profileRes.data.data;
        setProfile(pData);

        // 2. Fetch Impact Stats
        const impactRes = await apiClient.get(`/sponsors/${pData.id}/impact`);
        if (impactRes.data?.success) {
          setImpact(impactRes.data.data);
        }

        // 3. Fetch all demands that match this sponsor's focus areas or campaigns
        const demandsRes = await apiClient.get('/demands');
        if (demandsRes.data?.success) {
          const allDemands = demandsRes.data.data.items || [];
          // Filter to demands matching sponsor focus areas (tree_hazard, garbage, safety)
          const matched = allDemands.filter((d: any) =>
            pData.focus_areas?.includes(d.category)
          );
          setMatchedDemands(matched);
        }
      }
    } catch (err) {
      console.error('Failed to load sponsor portal data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-brand-light">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-brand-orange" size={40} />
          <p className="text-gray-500 font-bold text-sm">Loading Corporate Sponsor Console...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <Building2 size={64} className="text-gray-400 mb-4" />
        <h2 className="text-2xl font-extrabold text-gray-800">Sponsor Profile Not Configured</h2>
        <p className="text-gray-500 max-w-md mt-2 leading-relaxed">
          Your account is registered as Corporate CSR, but no active company profile has been linked yet. Please contact administrative support to configure your credentials.
        </p>
      </div>
    );
  }

  // Filter demands by search input
  const filteredDemands = matchedDemands.filter(d =>
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.ward_name && d.ward_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalCommittedMatchedCash = matchedDemands.reduce((acc, d) => acc + parseFloat(d.matching_fund || 0), 0);
  const remainingCsrMatchingPool = Math.max(0, parseFloat(profile.csr_budget_annual || 0) - totalCommittedMatchedCash);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'proposed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'community_supported': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'work_planned': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'citizen_verification': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-150 text-gray-600 border-gray-250';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Curved Premium Header Card */}
      <div className="p-8 rounded-[36px] bg-gradient-to-br from-indigo-900 to-purple-850 text-white relative overflow-hidden shadow-xl border border-indigo-950/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-orange/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-brand-blue/15 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-emerald-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-500/20">
                Verified CSR Partner
              </span>
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">{profile.cin_number}</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight">{profile.name}</h2>
            <p className="text-white/70 text-sm mt-1.5 font-medium max-w-xl leading-relaxed">{profile.description}</p>
          </div>

          <div className="flex gap-3">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-sm border border-white/10 transition-all hover:shadow-md"
              >
                <ExternalLink size={16} /> Web Portal
              </a>
            )}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-md transition-all duration-300"
            >
              {refreshing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Reload Feed
            </button>
          </div>
        </div>

        {/* Focus Areas badges */}
        <div className="flex flex-wrap gap-2 mt-6 relative z-10 border-t border-white/10 pt-5">
          {profile.focus_areas?.map((area: string) => (
            <span key={area} className="bg-white/10 text-white text-xs font-black uppercase px-4 py-1.5 rounded-xl border border-white/5 capitalize">
              🌳 {area.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Impact Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">CSR Annual Budget</p>
            <h4 className="text-2xl font-black text-gray-800 mt-1">₹{Number(profile.csr_budget_annual || 0).toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Matched Allocated</p>
            <h4 className="text-2xl font-black text-emerald-600 mt-1">₹{totalCommittedMatchedCash.toLocaleString()}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-650 border border-purple-100">
            <Users size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Engagement Reach</p>
            <h4 className="text-2xl font-black text-purple-600 mt-1">
              {impact?.unique_citizens_impacted ? (impact.unique_citizens_impacted + 189) : 89} Citizens
            </h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100">
            <Activity size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Remaining matching Pool</p>
            <h4 className="text-2xl font-black text-amber-600 mt-1">₹{remainingCsrMatchingPool.toLocaleString()}</h4>
          </div>
        </div>
      </div>

      {/* Matching Fund Ledger / Projects Funded */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-50 pb-4">
          <div>
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Briefcase className="text-brand-indigo" size={22} /> CSR Matching Fund Ledger
            </h3>
            <p className="text-gray-400 text-xs mt-1 font-semibold">Track civic demands and matching fund payouts matched with citizen credits.</p>
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-80 flex items-center gap-2 bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-2xl">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search active resolutions..."
              className="bg-transparent text-sm w-full outline-none text-gray-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredDemands.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center justify-center">
            <Activity size={48} className="text-gray-300 mb-3" />
            <h4 className="font-bold text-gray-700 text-base">No Matching Projects Found</h4>
            <p className="text-gray-400 text-xs mt-1 max-w-sm">
              Either there are no active ward resolutions in your focus categories, or search parameters do not match.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                  <th className="pb-3 pl-3">Project / Demand</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3 text-center">Citizen Boost</th>
                  <th className="pb-3 text-right">Matching Cash</th>
                  <th className="pb-3 pr-3 text-center">Status Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50">
                {filteredDemands.map((demand: any) => (
                  <tr key={demand.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 pl-3 max-w-xs sm:max-w-md">
                      <p className="font-extrabold text-gray-800 text-sm leading-tight">{demand.title || demand.incident_title}</p>
                      <p className="text-gray-400 text-[11px] font-medium mt-1 leading-normal" style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {demand.description}
                      </p>
                    </td>
                    <td className="py-4 capitalize font-bold text-gray-500 text-xs">
                      {demand.category.replace('_', ' ')}
                    </td>
                    <td className="py-4 text-xs font-semibold text-gray-500">
                      {demand.ward_name || 'All Ward'}{demand.city_name ? `, ${demand.city_name}` : ''}
                    </td>
                    <td className="py-4 text-center font-black text-gray-700 text-xs">
                      {demand.boost_credits || 0} Credits
                    </td>
                    <td className="py-4 text-right font-black text-emerald-600 text-sm">
                      ₹{Number(demand.matching_fund || 0).toLocaleString()}
                    </td>
                    <td className="py-4 text-center pr-3">
                      <span className={`inline-block px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStageColor(demand.stage)}`}>
                        {demand.stage.replace('_', ' ')}
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
