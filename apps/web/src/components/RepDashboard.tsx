import React, { useEffect, useState } from 'react';
import { BarChart, MessageSquare, Loader2, Users, TrendingUp, AlertTriangle, Map } from 'lucide-react';
import apiClient from '../api/client';

const RepDashboard = () => {
  const [petitions, setPetitions] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);
  const [cityIndex, setCityIndex] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'petitions' | 'demands' | 'analytics'>('demands');

  const handleEndorse = async (petition: any) => {
    try {
      await apiClient.post(`/petitions/${petition.id}/sign`);
      alert(`Successfully endorsed: "${petition.title}"`);
      setPetitions(prev => prev.map(p => p.id === petition.id ? { ...p, signature_count: (p.signature_count || 0) + 1 } : p));
    } catch (err) {
      alert('Failed to endorse petition.');
    }
  };

  const handleStageChange = async (demandId: string, newStage: string) => {
    try {
      await apiClient.patch(`/demands/${demandId}/stage`, { new_stage: newStage, note: 'Stage updated by elected representative' });
      setDemands(prev => prev.map(d => d.id === demandId ? { ...d, stage: newStage } : d));
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update demand stage');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [petRes, demandRes, cityRes] = await Promise.all([
          apiClient.get('/petitions').catch(() => ({ data: { data: [] } })),
          apiClient.get('/demands').catch(() => ({ data: { data: { items: [] } } })),
          apiClient.get('/city/00000000-0000-0000-0000-000000000001/score').catch(() => ({ data: { data: null } })),
        ]);

        const petList = Array.isArray(petRes.data.data) ? petRes.data.data : (petRes.data.data?.items || []);
        setPetitions(petList.sort((a: any, b: any) => (b.signature_count || 0) - (a.signature_count || 0)));

        const demandList = Array.isArray(demandRes.data.data) ? demandRes.data.data : (demandRes.data.data?.items || []);
        setDemands(demandList);

        setCityIndex(cityRes.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const STAGE_COLORS: Record<string, string> = {
    proposed: 'bg-gray-100 text-gray-700',
    community_supported: 'bg-blue-100 text-blue-700',
    submitted: 'bg-indigo-100 text-indigo-700',
    accepted: 'bg-green-100 text-green-700',
    work_planned: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-orange-100 text-orange-700',
    completed: 'bg-emerald-100 text-emerald-700',
    citizen_verification: 'bg-purple-100 text-purple-700',
    resolved: 'bg-green-200 text-green-800',
    reopened: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-dark rounded-4xl p-8 lg:p-10 border-b-4 border-brand-indigo flex flex-col md:flex-row justify-between items-center text-gray-800 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-indigo/10 rounded-full blur-3xl -z-10 animate-pulse-soft"></div>
        <div className="mb-6 md:mb-0 z-10">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 mb-2">Corporator View</h2>
          <p className="text-gray-600 font-medium text-lg">Ward analytics, demands, and citizen sentiment.</p>
        </div>
        <div className="p-5 bg-gradient-to-br from-brand-indigo to-purple-600 rounded-3xl shadow-lg z-10 transform hover:scale-105 transition-transform duration-300">
          <BarChart size={56} className="text-white" />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 bg-white/50 p-1.5 rounded-2xl w-fit">
        {(['demands', 'petitions', 'analytics'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm capitalize transition-all ${activeTab === tab ? 'bg-brand-indigo text-white shadow-md' : 'text-gray-600 hover:bg-white/80'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={40} className="animate-spin text-brand-indigo" /></div>
      ) : (
        <>
          {/* Demands Tab */}
          {activeTab === 'demands' && (
            <div className="glass p-8 rounded-4xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                <div className="bg-brand-indigo/20 p-2 rounded-xl mr-3 text-brand-indigo"><TrendingUp size={24} /></div>
                Civic Demands ({demands.length})
              </h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {demands.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No active demands in your ward.</p>
                ) : demands.map(demand => (
                  <div key={demand.id} className="bg-white/70 p-5 rounded-2xl border border-white/80 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-4">
                        <h4 className="font-bold text-gray-800 text-lg">{demand.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{demand.ward_name} {demand.category ? `• ${demand.category}` : ''}</p>
                      </div>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${STAGE_COLORS[demand.stage] || 'bg-gray-100 text-gray-600'}`}>
                        {demand.stage?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{demand.description?.substring(0, 120)}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center"><Users size={14} className="mr-1" /> {demand.supporters_count || 0} supporters</span>
                        <span className="font-bold text-brand-indigo">Priority: {demand.priority || '—'}</span>
                      </div>
                      <div className="flex space-x-2">
                        {demand.stage === 'submitted' && (
                          <button onClick={() => handleStageChange(demand.id, 'accepted')} className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-full font-bold hover:bg-green-600">Accept</button>
                        )}
                        {demand.stage === 'accepted' && (
                          <button onClick={() => handleStageChange(demand.id, 'work_planned')} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-full font-bold hover:bg-blue-600">Plan Work</button>
                        )}
                        {demand.stage === 'work_planned' && (
                          <button onClick={() => handleStageChange(demand.id, 'in_progress')} className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-full font-bold hover:bg-orange-600">Start Work</button>
                        )}
                        {demand.stage === 'in_progress' && (
                          <button onClick={() => handleStageChange(demand.id, 'completed')} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-full font-bold hover:bg-emerald-600">Mark Complete</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Petitions Tab */}
          {activeTab === 'petitions' && (
            <div className="glass p-8 rounded-4xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                <div className="bg-brand-orange/20 p-2 rounded-xl mr-3 text-brand-orange"><MessageSquare size={24} /></div>
                Petitions ({petitions.length})
              </h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {petitions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No active petitions.</p>
                ) : petitions.map(petition => (
                  <div key={petition.id} className="bg-white/70 p-5 rounded-2xl border border-white/80 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-lg text-gray-800 flex-1 pr-4">{petition.title}</h4>
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold">{petition.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 flex items-center">
                      <Users size={16} className="mr-1.5 opacity-50" />
                      {petition.signature_count || petition.supporters_count || 0} Signatures
                    </p>
                    <button onClick={() => handleEndorse(petition)} className="text-sm font-bold bg-gradient-to-r from-brand-indigo to-purple-600 text-white px-6 py-2.5 rounded-full w-full hover:-translate-y-0.5 hover:shadow-lg transition-all">
                      Endorse Petition
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass p-8 rounded-4xl">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                  <div className="bg-brand-indigo/20 p-2 rounded-xl mr-3 text-brand-indigo"><BarChart size={24} /></div>
                  City Index Score
                </h3>
                <div className="flex items-end space-x-3 mb-4">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-brand-indigo to-purple-500">
                    {cityIndex?.overall_score?.toFixed(1) || '—'}
                  </span>
                  <span className="text-gray-500 mb-2 font-bold text-lg">/ 100</span>
                </div>
                {cityIndex?.dimensions && (
                  <div className="space-y-2 mt-4">
                    {Object.entries(cityIndex.dimensions).map(([key, val]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize font-medium">{key.replace(/_/g, ' ')}</span>
                        <div className="flex items-center">
                          <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                            <div className="h-2 bg-brand-indigo rounded-full" style={{ width: `${val}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-gray-700">{typeof val === 'number' ? val.toFixed(0) : val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass p-8 rounded-4xl">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                  <div className="bg-red-500/20 p-2 rounded-xl mr-3 text-red-500"><AlertTriangle size={24} /></div>
                  Demand Summary
                </h3>
                <div className="space-y-3">
                  {Object.entries(
                    demands.reduce((acc: Record<string, number>, d: any) => {
                      acc[d.stage] = (acc[d.stage] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${STAGE_COLORS[stage] || 'bg-gray-100 text-gray-600'}`}>
                        {stage.replace(/_/g, ' ')}
                      </span>
                      <span className="text-lg font-black text-gray-800">{count as number}</span>
                    </div>
                  ))}
                  {demands.length === 0 && <p className="text-gray-500 text-center py-4">No demand data available.</p>}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RepDashboard;
