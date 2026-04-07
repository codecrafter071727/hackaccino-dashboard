import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  // Role Assignment Modal State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedDuties, setSelectedDuties] = useState<string[]>(['Registration']);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  const availableDuties = ['Registration', 'Room Allocation', 'PCO Assignment'];

  const toggleDuty = (dutyName: string) => {
    setSelectedDuties(prev =>
      prev.includes(dutyName)
        ? prev.filter(d => d !== dutyName)
        : [...prev, dutyName]
    );
  };

  // Room Allocation Modal State
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [block, setBlock] = useState('N Block');
  const [roomName, setRoomName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [roomMessage, setRoomMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // Volunteer Room Allocation Modal State
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerPhone, setVolunteerPhone] = useState('');
  const [volunteerRoom, setVolunteerRoom] = useState('');
  const [volunteerTime, setVolunteerTime] = useState('');
  const [volunteerMessage, setVolunteerMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // System Analytics State
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [stats] = useState({
    totalTeams: 0,
    presentTeams: 0,
    totalRooms: 0,
    totalParticipants: 0
  });

  useEffect(() => {
    const auth = localStorage.getItem('isAdminAuthenticated');
    if (auth !== 'true') {
      navigate('/admin/login');
    } else {
      setIsAdmin(true);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    navigate('/admin/login');
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/assign-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, duty: selectedDuties.join(', ') }),
      });
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }
      if (response.ok) {
        setMessage({ type: 'success', text: 'Roles assigned successfully!' });
        setEmail('');
        setSelectedDuties(['Registration']);
        setTimeout(() => {
          setShowRoleModal(false);
          setMessage({ type: '', text: '' });
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to assign roles' });
      }
    } catch (error: any) {
      console.error('Error assigning role:', error);
      setMessage({ type: 'error', text: `Error: ${error.message || 'Network error. Ensure backend is running.'}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRoomMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block, room_name: roomName, capacity }),
      });
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }
      if (response.ok) {
        setRoomMessage({ type: 'success', text: 'Room created successfully!' });
        setBlock('N Block');
        setRoomName('');
        setCapacity('');
        setTimeout(() => {
          setShowRoomModal(false);
          setRoomMessage({ type: '', text: '' });
        }, 1500);
      } else {
        setRoomMessage({ type: 'error', text: data.error || 'Failed to create room' });
      }
    } catch (error: any) {
      console.error('Error creating room:', error);
      setRoomMessage({ type: 'error', text: `Error: ${error.message || 'Network error. Ensure backend is running.'}` });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignVolunteerRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setVolunteerMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/assign-volunteer-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: volunteerName,
          phone_no: volunteerPhone,
          room_no: volunteerRoom,
          time_slot: volunteerTime
        }),
      });
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }
      if (response.ok) {
        setVolunteerMessage({ type: 'success', text: 'Volunteer room allocated successfully!' });
        setVolunteerName('');
        setVolunteerPhone('');
        setVolunteerRoom('');
        setVolunteerTime('');
        setTimeout(() => {
          setShowVolunteerModal(false);
          setVolunteerMessage({ type: '', text: '' });
        }, 1500);
      } else {
        setVolunteerMessage({ type: 'error', text: data.error || 'Failed to allocate room' });
      }
    } catch (error: any) {
      console.error('Error allocating volunteer room:', error);
      setVolunteerMessage({ type: 'error', text: `Error: ${error.message || 'Network error. Ensure backend is running.'}` });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    navigate('/admin/analytics');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
      </div>
    );
  }

  // ── shared input className ────────────────────────────────────────────────
  const inputCls = "w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 dark:focus:border-neon-green/30 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-0 shadow-sm dark:shadow-none transition-all";
  const labelCls = "block text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-white/30 mb-1.5";
  const modalOverlayCls = "fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4";
  const modalBoxCls = "relative w-full max-w-md bg-white dark:bg-[#0a0a0a]/95 border border-gray-200 dark:border-white/[0.08] rounded-[2rem] shadow-[0_32px_80px_rgba(0,0,0,0.12)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden";
  const modalHeaderCls = "flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.02]";
  const modalBodyCls = "px-8 py-6 space-y-5";
  const closeBtnCls = "w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-white/40 dark:hover:text-white transition-all group shrink-0";
  const submitBtnCls = "w-full py-3 rounded-xl bg-neon-green text-black text-sm font-black uppercase tracking-wider hover:shadow-[0_0_20px_rgba(163,255,18,0.35)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans overflow-x-hidden">

      {/* ── Background ─────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/[0.06] dark:bg-neon-green/[0.03] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-blue-400/[0.08] dark:bg-blue-500/[0.07] rounded-full blur-[120px]" />
        <div className="absolute inset-0
          [background-size:40px_40px]
          [background-image:linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)]
          dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]
          [mask-image:linear-gradient(to_bottom,black_0%,transparent_40%)]" />
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.07] shadow-[0_1px_0_0_rgba(0,0,0,0.04)] dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
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

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/analytics')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/[0.1] hover:text-gray-900 dark:hover:text-white transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page body ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10">

        {/* Heading */}
        <div className="mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-neon-green/60 mb-1">
            Admin Portal
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-gray-400 dark:text-white/30 text-sm mt-1">
            Manage staff roles, rooms, volunteers and view analytics
          </p>
        </div>

        {/* ── Cards Grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">

          {/* Role Assignment Card */}
          <div className="group relative rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-white/[0.04] border-2 border-gray-200 dark:border-white/[0.12] hover:border-violet-300 dark:hover:border-violet-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.65)] transition-all duration-300 p-8">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/25 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/[0.05] dark:text-white/30 dark:border-white/[0.07]">Active</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Role Assignment</h3>
            <p className="text-sm text-gray-400 dark:text-white/30 leading-relaxed flex-1 mb-6">
              Manage and assign roles to registered users and team members.
            </p>
            <button
              onClick={() => setShowRoleModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(163,255,18,0.2)] hover:shadow-[0_0_20px_rgba(163,255,18,0.4)] transition-all self-start active:scale-95"
            >
              Manage Roles
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Room Management Card */}
          <div className="group relative rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-white/[0.04] border-2 border-gray-200 dark:border-white/[0.12] hover:border-amber-300 dark:hover:border-amber-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.65)] transition-all duration-300 p-8">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/[0.05] dark:text-white/30 dark:border-white/[0.07]">New</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Room Management</h3>
            <p className="text-sm text-gray-400 dark:text-white/30 leading-relaxed flex-1 mb-6">
              Create and manage rooms, allocate capacities for blocks.
            </p>
            <button
              onClick={() => setShowRoomModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(163,255,18,0.2)] hover:shadow-[0_0_20px_rgba(163,255,18,0.4)] transition-all self-start active:scale-95"
            >
              Manage Rooms
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* System Analytics Card */}
          <div className="group relative rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-white/[0.04] border-2 border-gray-200 dark:border-white/[0.12] hover:border-blue-300 dark:hover:border-blue-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.65)] transition-all duration-300 p-8">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/25 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/[0.05] dark:text-white/30 dark:border-white/[0.07]">Real-time</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">System Analytics</h3>
            <p className="text-sm text-gray-400 dark:text-white/30 leading-relaxed flex-1 mb-6">
              View real-time statistics, participation data, and event overview.
            </p>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(163,255,18,0.2)] hover:shadow-[0_0_20px_rgba(163,255,18,0.4)] transition-all self-start active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'View Analytics'}
              {!loading && <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>}
            </button>
          </div>

          {/* Volunteer Room Allocation Card */}
          <div className="group relative rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-white/[0.04] border-2 border-gray-200 dark:border-white/[0.12] hover:border-emerald-300 dark:hover:border-emerald-500/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.65)] transition-all duration-300 p-8">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/[0.05] dark:text-white/30 dark:border-white/[0.07]">Volunteer</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Volunteer Room Allocation</h3>
            <p className="text-sm text-gray-400 dark:text-white/30 leading-relaxed flex-1 mb-6">
              Allocate rooms and time slots for event volunteers and staff.
            </p>
            <button
              onClick={() => setShowVolunteerModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(163,255,18,0.2)] hover:shadow-[0_0_20px_rgba(163,255,18,0.4)] transition-all self-start active:scale-95"
            >
              Allocate Room
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>

        </div>
      </div>

      {/* ── Role Assignment Modal ─────────────────────────────────────────── */}
      {showRoleModal && (
        <div className={modalOverlayCls}>
          <div className="absolute inset-0" onClick={() => setShowRoleModal(false)} />
          <div className={`${modalBoxCls} relative`}>
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />
            <div className={modalHeaderCls}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Assign Staff Role</h2>
              </div>
              <button onClick={() => setShowRoleModal(false)} className={closeBtnCls}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={modalBodyCls}>
              {message.text && (
                <div className={`flex items-center gap-3 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'}`}>
                  {message.text}
                </div>
              )}
              <form onSubmit={handleAssignRole} className="space-y-5">
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="staff@hackaccino.com"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Duty Assignments</label>
                  <div className="space-y-2">
                    {availableDuties.map((dutyName) => (
                      <label
                        key={dutyName}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedDuties.includes(dutyName)
                          ? 'bg-violet-50 border-violet-300 dark:bg-violet-500/15 dark:border-violet-500/40'
                          : 'bg-gray-50 border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15]'
                          }`}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedDuties.includes(dutyName)}
                            onChange={() => toggleDuty(dutyName)}
                            className="w-5 h-5 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-violet-500/50 transition-all cursor-pointer accent-violet-600"
                          />
                        </div>
                        <span className={`text-sm font-bold ${selectedDuties.includes(dutyName) ? 'text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-white/50'}`}>
                          {dutyName}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={loading} className={submitBtnCls}>
                  {loading ? (
                    <><div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />Assigning…</>
                  ) : 'Assign Role'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Room Creation Modal ───────────────────────────────────────────── */}
      {showRoomModal && (
        <div className={modalOverlayCls}>
          <div className="absolute inset-0" onClick={() => setShowRoomModal(false)} />
          <div className={`${modalBoxCls} relative`}>
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />
            <div className={modalHeaderCls}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Add New Room</h2>
              </div>
              <button onClick={() => setShowRoomModal(false)} className={closeBtnCls}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={modalBodyCls}>
              {roomMessage.text && (
                <div className={`flex items-center gap-3 p-3 rounded-xl text-sm border ${roomMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'}`}>
                  {roomMessage.text}
                </div>
              )}
              <form onSubmit={handleCreateRoom} className="space-y-5">
                <div>
                  <label className={labelCls}>Block</label>
                  <div className="relative">
                    <select
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      className={`${inputCls} appearance-none`}
                    >
                      <option value="N Block" className="bg-white dark:bg-gray-900">N Block</option>
                      <option value="P Block" className="bg-white dark:bg-gray-900">P Block</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400 dark:text-white/30">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Room Name / Number</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. 101, Conference Hall"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Capacity (Number of Teams)</label>
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. 5"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className={submitBtnCls}>
                  {loading ? (
                    <><div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />Creating…</>
                  ) : 'Create Room'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── System Analytics Modal ────────────────────────────────────────── */}
      {showStatsModal && (
        <div className={modalOverlayCls}>
          <div className="absolute inset-0" onClick={() => setShowStatsModal(false)} />
          <div className={`${modalBoxCls} relative max-w-lg`}>
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />
            <div className={modalHeaderCls}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Analytics Overview</h2>
              </div>
              <button onClick={() => setShowStatsModal(false)} className={closeBtnCls}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={modalBodyCls}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Teams', value: stats.totalTeams, accent: 'text-gray-900 dark:text-white' },
                  { label: 'Teams Present', value: stats.presentTeams, accent: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Total Participants', value: stats.totalParticipants, accent: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Total Rooms', value: stats.totalRooms, accent: 'text-violet-600 dark:text-violet-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 dark:bg-white/[0.025] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm dark:shadow-none">
                    <span className={`text-3xl font-bold mb-1 ${s.accent}`}>{s.value}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-black uppercase tracking-widest">Attendance Summary</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-1000 rounded-full"
                    style={{ width: `${stats.totalTeams > 0 ? (stats.presentTeams / stats.totalTeams) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-white/30 mt-2 font-medium">
                  {stats.totalTeams > 0 ? Math.round((stats.presentTeams / stats.totalTeams) * 100) : 0}% of registered teams have checked in.
                </p>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-gray-200 dark:border-white/[0.08] text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white text-sm font-bold transition-all"
              >
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Volunteer Allocation Modal ────────────────────────────────────── */}
      {showVolunteerModal && (
        <div className={modalOverlayCls}>
          <div className="absolute inset-0" onClick={() => setShowVolunteerModal(false)} />
          <div className={`${modalBoxCls} relative`}>
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />
            <div className={modalHeaderCls}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Allocate Volunteer Room</h2>
              </div>
              <button onClick={() => setShowVolunteerModal(false)} className={closeBtnCls}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={modalBodyCls}>
              {volunteerMessage.text && (
                <div className={`flex items-center gap-3 p-3 rounded-xl text-sm border ${volunteerMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'}`}>
                  {volunteerMessage.text}
                </div>
              )}
              <form onSubmit={handleAssignVolunteerRoom} className="space-y-5">
                <div>
                  <label className={labelCls}>Volunteer Name</label>
                  <input
                    type="text"
                    value={volunteerName}
                    onChange={(e) => setVolunteerName(e.target.value)}
                    className={inputCls}
                    placeholder="Enter volunteer name"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input
                    type="text"
                    value={volunteerPhone}
                    onChange={(e) => setVolunteerPhone(e.target.value)}
                    className={inputCls}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Room Number</label>
                    <input
                      type="text"
                      value={volunteerRoom}
                      onChange={(e) => setVolunteerRoom(e.target.value)}
                      className={inputCls}
                      placeholder="Room #"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Time Slot</label>
                    <input
                      type="text"
                      value={volunteerTime}
                      onChange={(e) => setVolunteerTime(e.target.value)}
                      className={inputCls}
                      placeholder="e.g. 10AM – 1PM"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowVolunteerModal(false)}
                    className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-gray-200 dark:border-white/[0.08] text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white text-sm font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className={`flex-1 ${submitBtnCls}`}>
                    {loading ? (
                      <><div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />Allocating…</>
                    ) : 'Allocate Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;