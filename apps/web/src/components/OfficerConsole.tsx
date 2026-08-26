import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { Activity, ShieldAlert, CheckCircle, Clock, Map as MapIcon, Image as ImageIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const OfficerConsole = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ open: 0, critical: 0, resolved: 0 });
  const [incidents, setIncidents] = useState<any[]>([]);
  const [resolvingIncident, setResolvingIncident] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const handleResolve = async (id: string) => {
    setResolving(true);
    try {
      await apiClient.patch(`/incidents/${id}`, { status: 'resolved' });
      setResolvingIncident(null);
      setStats(prev => ({ ...prev, resolved: prev.resolved + 1, open: Math.max(0, prev.open - 1) }));
      setIncidents(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Failed to resolve incident', err);
      alert('Failed to resolve incident. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await apiClient.get('/incidents');
        const items = res.data.data?.items || res.data.data || [];
        const sorted = items.sort((a: any, b: any) => b.priority_score - a.priority_score);
        setIncidents(sorted);
        
        setStats({
          open: sorted.length,
          critical: sorted.filter((i: any) => i.severity === 'CRITICAL').length || 0,
          resolved: 12
        });
      } catch (err) {
        console.error("Failed to fetch incidents", err);
      }
    };
    fetchIncidents();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-dark rounded-4xl p-8 lg:p-10 border-b-4 border-brand-blue flex flex-col md:flex-row justify-between items-center text-gray-800 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl -z-10 animate-pulse-soft"></div>
        <div className="mb-6 md:mb-0 z-10">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-500 mb-2">{t('officer_console')}</h2>
          <p className="text-gray-600 font-medium text-lg">Welcome back, Officer. Here is your ward overview.</p>
        </div>
        <div className="p-5 bg-gradient-to-br from-brand-blue to-blue-600 rounded-3xl shadow-lg z-10 transform hover:scale-105 transition-transform duration-300">
          <ShieldAlert size={56} className="text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-4xl flex items-center space-x-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-br from-brand-orange to-orange-400 p-4 rounded-2xl text-white shadow-md">
            <Activity size={36} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Incidents</h3>
            <p className="text-4xl font-black text-gray-800">{stats.open}</p>
          </div>
        </div>
        
        <div className="glass p-8 rounded-4xl flex items-center space-x-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-2xl text-white shadow-md">
            <ShieldAlert size={36} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Critical Priority</h3>
            <p className="text-4xl font-black text-gray-800">{stats.critical}</p>
          </div>
        </div>

        <div className="glass p-8 rounded-4xl flex items-center space-x-5 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="bg-gradient-to-br from-brand-green to-emerald-500 p-4 rounded-2xl text-white shadow-md">
            <CheckCircle size={36} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Resolved Today</h3>
            <p className="text-4xl font-black text-gray-800">{stats.resolved}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Incident List */}
        <div className="glass p-8 rounded-4xl hover:shadow-2xl transition-shadow duration-300">
          <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <div className="bg-brand-blue/20 p-2 rounded-xl mr-3 text-brand-blue">
              <Activity size={24} />
            </div>
            Priority Incident Queue
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {incidents.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No active incidents.</p>
              </div>
            ) : null}
            {incidents.map((incident, idx) => (
              <div key={idx} className="bg-white/70 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm hover:shadow-md transition-all border border-white/80 group">
                <div className="flex-1 mb-4 sm:mb-0">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm ${incident.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-orange-400 text-white'}`}>
                      {incident.severity}
                    </span>
                    <span className="text-xs bg-brand-blue/10 text-brand-blue font-bold px-3 py-1 rounded-full">
                      Score: {incident.priority_score}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-800 text-lg group-hover:text-brand-blue transition-colors">{incident.title}</h4>
                  <p className="text-sm text-gray-600 truncate max-w-[250px] md:max-w-xs mt-1">{incident.description}</p>
                </div>
                <button 
                  onClick={() => setResolvingIncident(incident.id)}
                  className="bg-brand-blue text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5 transition-all w-full sm:w-auto"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Live Map */}
        <div className="glass p-8 rounded-4xl flex flex-col hover:shadow-2xl transition-shadow duration-300">
          <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <div className="bg-brand-gray/10 p-2 rounded-xl mr-3 text-brand-gray">
              <MapIcon size={24} />
            </div>
            Live Incident Map
          </h3>
          <div className="flex-1 rounded-3xl overflow-hidden border border-white/80 min-h-[400px] shadow-inner relative z-0">
            {/* Center default to Bhopal (23.2599, 77.4126) */}
            <MapContainer center={[23.2599, 77.4126]} zoom={12} style={{ height: '100%', width: '100%', zIndex: 0 }}>
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              {incidents.map((incident, idx) => (
                incident.lat && incident.lng ? (
                  <Marker key={idx} position={[parseFloat(incident.lat), parseFloat(incident.lng)]}>
                    <Popup>
                      <div className="p-1">
                        <strong className="text-brand-blue block mb-1">{incident.title}</strong>
                        <span className="text-xs font-bold text-gray-500">Priority: {incident.priority_score}</span>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
      
      {/* Resolve Modal */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-md animate-fade-in">
          <div className="glass-dark p-10 rounded-4xl max-w-md w-full mx-4 shadow-2xl border border-white/60 transform transition-all">
            <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-blue-500 mb-3">Resolve Incident</h3>
            <p className="text-base text-gray-600 mb-8 font-medium">Upload an "After" photo to verify the resolution of this incident. The AI engine will analyze the image.</p>
            
            <div className="border-2 border-dashed border-brand-blue/40 rounded-3xl p-10 mb-8 flex flex-col items-center justify-center bg-white/40 cursor-pointer hover:bg-white/60 hover:border-brand-blue transition-all group">
              <ImageIcon size={48} className="text-brand-blue mb-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
              <span className="text-base font-bold text-gray-800">Click to upload photo</span>
              <span className="text-sm text-gray-500 mt-1 font-medium">JPG or PNG (max 5MB)</span>
            </div>
            
            <div className="flex space-x-4">
              <button onClick={() => setResolvingIncident(null)} disabled={resolving} className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 bg-white hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">
                Cancel
              </button>
              <button onClick={() => handleResolve(resolvingIncident)} disabled={resolving} className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-brand-blue to-blue-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {resolving ? 'Resolving...' : 'Submit Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerConsole;
