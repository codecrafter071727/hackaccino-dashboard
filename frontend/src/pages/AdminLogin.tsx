import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (email === adminEmail && password === adminPassword) {
      localStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col font-sans overflow-hidden">

      {/* ── Background ───────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-emerald-400/[0.06] dark:bg-neon-green/[0.04] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/[0.08] dark:bg-blue-500/[0.07] rounded-full blur-[120px]" />
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[60%] h-[40%] bg-violet-300/[0.04] dark:hidden rounded-full blur-[160px]" />
        <div
          className="absolute inset-0
            [background-size:40px_40px]
            [background-image:linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)]
            dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]
            [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]"
        />
        <div className="absolute inset-0 bg-gray-50 dark:bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_40%,black)]" />
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 bg-white/80 dark:bg-black/60 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.07] shadow-[0_1px_0_0_rgba(0,0,0,0.04)] dark:shadow-none">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center group-hover:bg-neon-green/20 transition-colors">
              <div className="w-2 h-2 rounded-full bg-neon-green group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Hackaccino</span>
          </button>

          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25">
            Superadmin
          </span>
        </div>
      </nav>

      {/* ── Login card ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="relative bg-white dark:bg-[#0a0a0a]/95 backdrop-blur-2xl border-2 border-gray-200 dark:border-white/[0.10] rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.10)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden">

            {/* Top accent line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />

            <div className="px-8 pt-10 pb-10">

              {/* Header */}
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-neon-green/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-neon-green/20 shadow-[0_0_24px_rgba(163,255,18,0.08)]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                  Superadmin Login
                </h2>
                <p className="text-sm text-gray-400 dark:text-white/30">
                  Restricted access — authorized personnel only
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-white/30">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 dark:focus:border-neon-green/30 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-0 shadow-sm dark:shadow-none transition-all"
                    placeholder="admin@hackaccino.com"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-white/30">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 dark:focus:border-neon-green/30 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-0 shadow-sm dark:shadow-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full mt-2 py-3.5 rounded-xl bg-neon-green text-black text-sm font-black uppercase tracking-wider hover:shadow-[0_0_24px_rgba(163,255,18,0.40)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Access Dashboard
                </button>

              </form>

              {/* Footer note */}
              <div className="flex flex-col items-center gap-2 mt-8">
                <div className="h-[1px] w-10 bg-gray-200 dark:bg-white/10" />
                <p className="text-[9px] text-gray-400 dark:text-white/20 font-black uppercase tracking-[0.2em] text-center">
                  Authorized Personnel Only
                </p>
              </div>

            </div>
          </div>

          {/* Back link */}
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/50 uppercase tracking-widest transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>

        </div>
      </div>

    </div>
  );
};

export default AdminLogin;