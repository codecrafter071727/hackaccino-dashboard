import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import StudentRegistration from './pages/StudentRegistration';

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import JudgesPortal from './pages/JudgesPortal';
import ErrorBoundary from './components/ErrorBoundary';

// Dashboard Home Component
function DashboardHome() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [targetFeature, setTargetFeature] = useState<'Registration' | 'Room Allocation' | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);

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

  const handleCardClick = (feature: 'Registration' | 'Room Allocation' | 'PCO Assignment') => {
    // Check if already logged in
    const storedUser = localStorage.getItem('staffUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.duty === feature) {
          if (feature === 'Registration') navigate('/registration');
          else if (feature === 'Room Allocation') navigate('/room-allocation');
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
      const response = await fetch('http://localhost:3000/api/admin/staff-login', {
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
          else if (targetFeature === 'Room Allocation') navigate('/room-allocation');
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
    <div className="min-h-screen bg-college-bg flex flex-col font-sans relative">
      {/* Navbar */}
      <nav className="bg-college-primary text-white shadow-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-wider">HACKACCINO</span>
            <span className="text-sm bg-college-secondary text-college-primary px-2 py-1 rounded font-semibold">DASHBOARD</span>
          </div>
          <div className="flex items-center space-x-4">
             <button 
              onClick={() => navigate('/judges-portal')}
              className="text-sm bg-college-secondary hover:bg-college-secondary/80 text-college-primary px-4 py-2 rounded-lg transition-colors font-bold shadow-sm"
            >
              Judges Portal
            </button>
             <button 
              onClick={() => navigate('/admin/login')}
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20"
            >
              Superadmin
            </button>
            {loggedInUser ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm opacity-90 font-medium hidden md:inline-block">
                  {loggedInUser.email} <span className="text-xs opacity-75">({loggedInUser.duty})</span>
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-sm bg-red-500/20 hover:bg-red-500/40 text-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-500/30"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="text-sm opacity-80">Welcome, Staff</div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
          
          {/* Student Registration Card */}
          <div 
            onClick={() => handleCardClick('Registration')}
            className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 transform hover:-translate-y-1 cursor-pointer group border-t-4 border-college-primary"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-blue-100 p-3 rounded-full group-hover:bg-college-primary group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-college-primary group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm font-medium">Step 01</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-college-primary transition-colors">Student Registration</h2>
              <p className="text-gray-600 mb-6">
                Register new students, update profiles, and manage student database records securely.
              </p>
              <div className="flex items-center text-college-primary font-semibold group-hover:translate-x-2 transition-transform duration-300">
                <span>Go to Registration</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Room Allocation Card */}
          <div 
             onClick={() => handleCardClick('Room Allocation')}
             className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 transform hover:-translate-y-1 cursor-pointer group border-t-4 border-college-secondary">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-amber-100 p-3 rounded-full group-hover:bg-college-secondary group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-college-secondary group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm font-medium">Step 02</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-college-secondary transition-colors">Room Allocation</h2>
              <p className="text-gray-600 mb-6">
                Assign rooms to students, manage dormitory capacity, and view occupancy status.
              </p>
              <div className="flex items-center text-college-secondary font-semibold group-hover:translate-x-2 transition-transform duration-300">
                <span>Manage Allocation</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* PCO Assignment Card */}
          <div 
            onClick={() => handleCardClick('PCO Assignment')}
            className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 transform hover:-translate-y-1 cursor-pointer group border-t-4 border-emerald-500"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-emerald-100 p-3 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm font-medium">Step 03</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-emerald-500 transition-colors">PCO Assignment</h2>
              <p className="text-gray-600 mb-6">
                Coordinate and assign duties for participants, volunteers, and overall event management.
              </p>
              <div className="flex items-center text-emerald-500 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                <span>Manage PCO Duty</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-gray-500 text-sm">
        <p>&copy; 2024 Hackaccino College System. All rights reserved.</p>
      </footer>

      {/* Staff Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => { setShowLoginModal(false); setError(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Staff Login</h2>
            <p className="text-gray-500 mb-6 text-sm">
              Please login to access <span className="font-semibold text-college-primary">{targetFeature}</span>.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-college-primary focus:border-transparent transition-all"
                  placeholder="staff@hackaccino.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-college-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-college-primary text-white font-bold py-3 rounded-xl hover:bg-college-primary/90 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Login & Access'}
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
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/judges-portal" element={<JudgesPortal />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
