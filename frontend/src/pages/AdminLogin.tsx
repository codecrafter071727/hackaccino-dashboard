
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check against environment variables
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

    if (email === adminEmail && password === adminPassword) {
      // Successful login
      // Store a simple auth token/flag in localStorage
      localStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Simple Navbar */}
      <nav className="bg-black/50 backdrop-blur-md border-b border-white/10 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent cursor-pointer" onClick={() => navigate('/')}>
            Hackaccino
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Superadmin Login
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm text-gray-400 ml-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                placeholder="admin@hackaccino.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
