import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './config';
import StudentRegistration from './pages/StudentRegistration';
import RoomAllocation from './pages/RoomAllocation';
import PCODuty from './pages/PCODuty';

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ErrorBoundary from './components/ErrorBoundary';

// Define User Interface
interface User {
  email: string;
  duty: string;
  // Add other user properties if necessary
}

// Dashboard Home Component
function DashboardHome() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [targetFeature, setTargetFeature] = useState<string | null>(null);
  
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('staffUser');
    if (storedUser) {
      try {
        setLoggedInUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Invalid user data', error);
        localStorage.removeItem('staffUser');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('staffUser');
    setLoggedInUser(null);
  };

  const handleCardClick = (feature: string) => {
    // Check if already logged in
    const storedUser = localStorage.getItem('staffUser');
    if (storedUser) {
      try {
        const user: User = JSON.parse(storedUser);
        if (user.duty === feature) {
          if (feature === 'Registration') navigate('/registration');
          else if (feature === 'Room Allocation') navigate('/allocation');
          else if (feature === 'PCO Assignment') navigate('/pco-duty');
        } else {
          alert(`Access Denied! Your duty is "${user.duty}", but you are trying to access "${feature}".`);
        }
      } catch (error) {
        localStorage.removeItem('staffUser');
        setTargetFeature(feature);
        setShowLoginModal(true);
      }
    } else {
      // Not logged in, show modal
      setTargetFeature(feature);
      setShowLoginModal(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/staff-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Login success
        localStorage.setItem('staffUser', JSON.stringify(data.user));
        setLoggedInUser(data.user);
        setShowLoginModal(false);
        
        // Check duty and redirect
        if (data.user.duty === targetFeature) {
          if (targetFeature === 'Registration') navigate('/registration');
          else if (targetFeature === 'Room Allocation') navigate('/allocation');
          else if (targetFeature === 'PCO Assignment') navigate('/pco-duty');
        } else {
          alert(`Login successful, but Access Denied! Your duty is "${data.user.duty}", not "${targetFeature}".`);
        }
        
        // Clear form
        setEmail('');
        setPassword('');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sans flex flex-col relative selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      
      {/* Refined Background Effects - Smoother, Static Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          {/* Subtle Grain Texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
          
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] opacity-40 mix-blend-screen"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] opacity-40 mix-blend-screen"></div>
      </div>

      {/* Navbar - Clean Glassmorphism */}
      <nav className="sticky top-0 z-50 w-full bg-[#05050A]/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
        <div className="flex flex-grow items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 group cursor-default">
             <div className="relative bg-white/5 border border-white/10 text-white p-2 rounded-xl group-hover:bg-white/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
             <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white tracking-tight">HACKACCINO</h1>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Volunteer Portal</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin/login')}
              className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5"
            >
              Superadmin Access
            </button>

            {loggedInUser ? (
              <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                <div className="hidden text-right lg:block">
                  <span className="block text-sm font-semibold text-white">
                    {loggedInUser.email.split('@')[0]}
                  </span>
                  <span className="block text-[10px] text-indigo-400 uppercase tracking-wide">
                    {loggedInUser.duty}
                  </span>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold shadow-lg">
                    {loggedInUser.email[0].toUpperCase()}
                </div>
                <button 
                  onClick={handleLogout}
                  className="ml-2 text-xs bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 px-3 py-1.5 rounded-lg transition-all"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                <span className="text-xs font-medium text-gray-500">Guest</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex-grow w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-20">
        
        {/* HERO SECTION - Streamlined */}
        <section className="py-16 text-center relative">
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-indigo-300 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                Official Hackathon Portal
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4 leading-tight">
                Brew Ideas. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Build Future.</span>
            </h1>
            
            <p className="text-base md:text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
                Logistics command center for Hackaccino 2026. Manage participants, allocations, and operations efficiently.
            </p>
            
            <button 
                onClick={() => document.getElementById('dashboard-modules')?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative px-6 py-3 bg-white text-[#05050A] text-sm font-bold rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)]"
            >
                <span className="relative z-10 flex items-center gap-2">
                    Access Modules
                    <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                </span>
            </button>
        </section>

        {/* DASHBOARD MODULES */}
        <div id="dashboard-modules" className="mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
            Operational Modules
          </h2>
        </div>

        {/* Improved Grid with PCO Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Registration */}
          <div 
            onClick={() => handleCardClick('Registration')}
            className="group relative rounded-2xl border border-white/5 bg-[#0F111A] p-6 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
             
             <div className="relative z-10 flex flex-col h-full justify-between">
                 <div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:text-white group-hover:bg-indigo-500 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Student Registration</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Verify identities, check-in teams, and handle on-spot participant registration.
                    </p>
                 </div>
                 
                 <div className="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider group-hover:text-indigo-300 transition-colors">
                    Access Portal <span className="group-hover:translate-x-1 transition-transform">→</span>
                 </div>
             </div>
          </div>

          {/* Card 2: Allocation */}
          <div 
             onClick={() => handleCardClick('Room Allocation')}
             className="group relative rounded-2xl border border-white/5 bg-[#0F111A] p-6 hover:border-purple-500/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>

             <div className="relative z-10 flex flex-col h-full justify-between">
                 <div>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:text-white group-hover:bg-purple-500 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Room Allocation</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Manage dormitory assignments, view capacity, and track room availability.
                    </p>
                 </div>

                 <div className="mt-6 flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider group-hover:text-purple-300 transition-colors">
                    Access Portal <span className="group-hover:translate-x-1 transition-transform">→</span>
                 </div>
             </div>
          </div>

          {/* Card 3: PCO Assignment (Newly Added for Volunteers) */}
          <div 
             onClick={() => handleCardClick('PCO Assignment')}
             className="group relative rounded-2xl border border-white/5 bg-[#0F111A] p-6 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>

             <div className="relative z-10 flex flex-col h-full justify-between">
                 <div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:text-white group-hover:bg-emerald-500 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">PCO Assignment</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Manage Protocol and Coordination Office duties, volunteer shifts, and tasks.
                    </p>
                 </div>

                 <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider group-hover:text-emerald-300 transition-colors">
                    Access Portal <span className="group-hover:translate-x-1 transition-transform">→</span>
                 </div>
             </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-white/5 bg-[#05050A] py-8">
         <div className="w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-gray-600">
            <p>&copy; 2026 Hackaccino System. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
                <a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a>
                <a href="#" className="hover:text-indigo-400 transition-colors">Support</a>
            </div>
         </div>
      </footer>

      {/* Login Modal - Refined & Accessible */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => setShowLoginModal(false)}></div>
          
          <div className="relative w-full max-w-sm bg-[#0F111A] border border-white/10 rounded-2xl shadow-2xl p-8 transform transition-all scale-100">
            
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white">Staff Login</h3>
                    <p className="text-xs text-gray-400 mt-1">
                        Authenticate to access <span className="text-indigo-400 font-semibold">{targetFeature}</span>
                    </p>
                </div>
                <button 
                  onClick={() => setShowLoginModal(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#05050A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-700"
                  placeholder="staff@hackaccino.com"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#05050A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-700"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                    <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Verifying...
                    </>
                ) : (
                    'Authenticate & Access'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/registration" element={<StudentRegistration />} />
          <Route path="/allocation" element={<RoomAllocation />} />
          <Route path="/pco-duty" element={<PCODuty />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;