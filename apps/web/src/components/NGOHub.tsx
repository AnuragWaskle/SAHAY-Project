import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, HeartHandshake, Leaf, Loader2, MapPin, TrendingUp } from 'lucide-react';
import apiClient from '../api/client';

const NGOHub = () => {
  const { t } = useTranslation();
  const [demands, setDemands] = useState<any[]>([]);
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleAdopt = async (demand: any) => {
    try {
      const payload = {
        title: `Initiative: ${demand.title}`,
        description: `NGO-led initiative to resolve: ${demand.description}`,
        type: 'volunteer',
        incident_id: demand.incident_id,
        volunteer_target: 20
      };
      await apiClient.post('/initiatives', payload);
      alert('Successfully adopted project! Initiative launched.');
      setDemands(prev => prev.filter(d => d.id !== demand.id));
    } catch (err) {
      console.error('Failed to adopt initiative', err);
      alert('Failed to adopt initiative. Make sure you are logged in as a verified NGO owner.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [demandsRes, initiativesRes] = await Promise.all([
          apiClient.get('/demands').catch(() => ({ data: { data: { items: [] } } })),
          apiClient.get('/initiatives').catch(() => ({ data: { data: [] } })),
        ]);
        const rawDemands = demandsRes.data.data;
        const demandList = Array.isArray(rawDemands) ? rawDemands : (rawDemands?.items || []);
        setDemands(demandList);
        const rawInitiatives = initiativesRes.data.data;
        setInitiatives(Array.isArray(rawInitiatives) ? rawInitiatives : (rawInitiatives?.items || []));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-dark rounded-4xl p-8 lg:p-10 border-b-4 border-brand-green flex flex-col md:flex-row justify-between items-center text-gray-800 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/10 rounded-full blur-3xl -z-10 animate-pulse-soft"></div>
        <div className="mb-6 md:mb-0 z-10">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 mb-2">{t('ngo_hub')}</h2>
          <p className="text-gray-600 font-medium text-lg">Coordinate volunteers and adopt civic initiatives.</p>
        </div>
        <div className="p-5 bg-gradient-to-br from-brand-green to-emerald-600 rounded-3xl shadow-lg z-10 transform hover:scale-105 transition-transform duration-300">
          <Leaf size={56} className="text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-4xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
          <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <div className="bg-brand-green/20 p-2 rounded-xl mr-3 text-brand-green">
              <HeartHandshake size={24} />
            </div>
            Adoptable Projects
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={32} className="animate-spin text-brand-green" /></div>
            ) : demands.length === 0 ? (
              <div className="text-center py-12 bg-white/40 rounded-2xl border border-dashed border-gray-300">
                <HeartHandshake size={48} className="mx-auto text-gray-400 mb-3 opacity-50" />
                <p className="text-gray-500 font-medium">No active projects to adopt.</p>
              </div>
            ) : (
              demands.map(demand => (
                <div key={demand.id} className="bg-white/70 p-5 rounded-2xl mb-4 shadow-sm hover:shadow-md transition-shadow border border-white/80 group">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-gray-800 text-lg group-hover:text-brand-green transition-colors">{demand.title}</h4>
                    <span className="text-xs px-3 py-1 bg-brand-green/10 text-brand-green rounded-full font-bold shadow-sm">{demand.stage}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 font-medium">{demand.description}</p>
                  <button onClick={() => handleAdopt(demand)} className="bg-gradient-to-r from-brand-green to-emerald-500 text-white px-6 py-2.5 rounded-full text-sm font-bold w-full hover:-translate-y-0.5 hover:shadow-lg transition-all shadow-md">
                    Adopt Initiative
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass p-8 rounded-4xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-10 right-10 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl -z-10"></div>
          <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <div className="bg-brand-blue/20 p-2 rounded-xl mr-3 text-brand-blue">
              <TrendingUp size={24} />
            </div>
            Your Active Initiatives
          </h3>
          <div className="space-y-3">
            {initiatives.length === 0 ? (
              <div className="text-center py-12 bg-white/40 rounded-2xl border border-dashed border-gray-300">
                <Users size={48} className="mx-auto text-gray-400 mb-3 opacity-50" />
                <p className="text-gray-500 font-medium">No active initiatives yet.</p>
                <p className="text-gray-400 text-sm mt-1">Adopt a project from the left panel to get started.</p>
              </div>
            ) : (
              initiatives.map((init: any) => (
                <div key={init.id} className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-white hover:bg-white/80 transition-colors">
                  <div className="flex-1">
                    <span className="font-bold text-gray-800">{init.title}</span>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-xs text-gray-500">{init.type}</span>
                      {init.volunteer_count > 0 && (
                        <span className="text-xs text-brand-blue font-bold">{init.volunteer_count} volunteers</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-extrabold shadow-sm ${init.status === 'active' ? 'bg-brand-green/10 text-brand-green' : 'bg-gray-100 text-gray-600'}`}>
                    {init.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NGOHub;
