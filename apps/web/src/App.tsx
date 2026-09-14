import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth, onAuthStateChanged, User } from './lib/firebase';
import apiClient from './api/client';
import OfficerConsole from './components/OfficerConsole';
import NGOHub from './components/NGOHub';
import RepDashboard from './components/RepDashboard';
import AdminDashboard from './components/AdminDashboard';
import SponsorPortal from './components/SponsorPortal';

const getDashboardRoute = (role: string | null) => {
  switch (role) {
    case 'municipal_officer': return '/officer';
    case 'ngo': return '/ngo';
    case 'elected_representative': return '/rep';
    case 'super_admin': return '/admin';
    case 'company_csr': return '/sponsor';
    default: return '/login';
  }
};

const Login = ({ setRole }: { setRole: (role: string) => void }) => {
  const navigate = useNavigate();

  const handleLogin = (role: string, token: string) => {
    localStorage.setItem('role', role);
    localStorage.setItem('auth_token', token);
    setRole(role);
    navigate(getDashboardRoute(role));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-in">
      <div className="p-10 text-center glass-dark rounded-4xl max-w-md w-full mx-auto border-white/60 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-brand-orange/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-brand-blue/30 rounded-full blur-3xl"></div>
        
        <h2 className="text-4xl font-extrabold text-gradient mb-2 relative z-10">Welcome to Sahay</h2>
        <p className="text-gray-600 mb-8 font-medium relative z-10">Select your role to access the dashboard</p>
        
        <div className="space-y-4 relative z-10">
          <button onClick={() => handleLogin('municipal_officer', 'demo_officer_1')} className="block w-full p-4 rounded-2xl bg-gradient-to-r from-brand-blue to-blue-500 text-white font-bold text-lg hover:-translate-y-1 hover:shadow-lg transition-all duration-300">Login as Officer</button>
          <button onClick={() => handleLogin('ngo', 'demo_ngo_1')} className="block w-full p-4 rounded-2xl bg-gradient-to-r from-brand-green to-emerald-500 text-white font-bold text-lg hover:-translate-y-1 hover:shadow-lg transition-all duration-300">Login as NGO</button>
          <button onClick={() => handleLogin('elected_representative', 'demo_elected')} className="block w-full p-4 rounded-2xl bg-gradient-to-r from-brand-indigo to-purple-600 text-white font-bold text-lg hover:-translate-y-1 hover:shadow-lg transition-all duration-300">Login as Rep</button>
          <button onClick={() => handleLogin('company_csr', 'demo_sponsor_1')} className="block w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-lg hover:-translate-y-1 hover:shadow-lg transition-all duration-300">Login as Sponsor</button>
          <button onClick={() => handleLogin('super_admin', 'demo_super_admin')} className="block w-full p-4 rounded-2xl bg-gradient-to-r from-gray-700 to-gray-900 text-white font-bold text-lg hover:-translate-y-1 hover:shadow-lg transition-all duration-300">Login as Admin</button>
        </div>
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

const App = () => {
  const { t, i18n } = useTranslation();
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser && !localStorage.getItem('role')) {
        setRole(null);
      } else {
        setRole(localStorage.getItem('role'));
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const handleLogout = () => {
    localStorage.removeItem('role');
    localStorage.removeItem('auth_token');
    setRole(null);
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-light">
        <div className="w-12 h-12 border-4 border-brand-orange border-t-brand-blue rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="glass sticky top-0 z-50 p-4 flex justify-between items-center rounded-b-3xl mb-8 mx-4 mt-2 shadow-sm animate-slide-up">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-brand-blue flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-xl">S</span>
          </div>
          <h1 className="text-2xl font-black text-gradient tracking-tight">
            Sahay
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleLanguage}
            className="px-5 py-2 rounded-full glass-dark text-gray-800 font-bold hover:bg-white/80 transition-all hover:shadow-md text-sm"
          >
            {i18n.language === 'en' ? 'हिंदी' : 'English'}
          </button>
          {role && (
            <button 
              onClick={handleLogout}
              className="px-5 py-2 rounded-full bg-red-500/10 text-red-600 font-bold hover:bg-red-500 hover:text-white transition-all text-sm"
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 pb-12">
        <Routes>
          <Route path="/login" element={role ? <Navigate to={getDashboardRoute(role)} replace /> : <Login setRole={setRole} />} />
          <Route path="/officer/*" element={role === 'municipal_officer' ? <OfficerConsole /> : <Navigate to="/login" />} />
          <Route path="/ngo/*" element={role === 'ngo' ? <NGOHub /> : <Navigate to="/login" />} />
          <Route path="/rep/*" element={role === 'elected_representative' ? <RepDashboard /> : <Navigate to="/login" />} />
          <Route path="/admin/*" element={role === 'super_admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/sponsor/*" element={role === 'company_csr' ? <SponsorPortal /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={getDashboardRoute(role)} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
