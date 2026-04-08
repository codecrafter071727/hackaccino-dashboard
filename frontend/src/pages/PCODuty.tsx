import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';
import { io, Socket } from 'socket.io-client';
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavToggle,
  MobileNavMenu,
} from '../ui/resizable-navbar';

interface Volunteer {
  id: number;
  name: string;
  phone_no: string;
  room_no: string;
  time_slot: string;
  is_present: boolean;
  created_at: string;
}

// ── Toast notification ────────────────────────────────────────────────────────
const Toast = ({ message, type }: { message: string; type: 'success' | 'error' }) => (
  <motion.div
    initial={{ opacity: 0, y: -20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.95 }}
    className="fixed top-6 left-1/2 -translate-x-1/2 z-[300]"
  >
    <div className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl border min-w-[280px] ${type === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
      : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
      }`}>
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${type === 'success'
        ? 'bg-emerald-100 dark:bg-emerald-500/20'
        : 'bg-red-100 dark:bg-red-500/20'
        }`}>
        {type === 'success' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <span className="text-sm font-bold tracking-tight">{message}</span>
    </div>
  </motion.div>
);



// ── Main component ────────────────────────────────────────────────────────────
const PCODuty: React.FC<{ isModal?: boolean }> = ({ isModal }) => {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Socket.io initialization and listeners
  useEffect(() => {
    const socket = io(API_BASE_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to PCO WebSocket server');
    });

    socket.on('volunteerPresenceUpdate', (updatedVolunteer: Volunteer) => {
      console.log('Live volunteer presence update received:', updatedVolunteer);
      setVolunteers(prev =>
        prev.map(v => v.id === updatedVolunteer.id ? { ...v, ...updatedVolunteer } : v)
      );
    });

    socket.on('newVolunteerAssignment', (newVolunteer: Volunteer) => {
      console.log('Live new volunteer assignment received:', newVolunteer);
      setVolunteers(prev => [newVolunteer, ...prev]);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const loggedInUser = (() => {
    try { return JSON.parse(localStorage.getItem('staffUser') || 'null'); } catch { return null; }
  })();

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Auth guard + initial fetch
  useEffect(() => {
    const storedUser = localStorage.getItem('staffUser');
    if (!storedUser) {
      if (!isModal) { alert('Access Denied'); navigate('/'); }
      return;
    }
    try {
      const user = JSON.parse(storedUser);
      const userDuties = user.duties || [user.duty];
      if (!userDuties.includes('PCO Assignment') && !isModal) {
        alert('Access Denied: Your assigned duties do not permit access to this page.');
        navigate('/');
      }
    } catch {
      localStorage.removeItem('staffUser');
      if (!isModal) navigate('/');
    }
    fetchVolunteers();
  }, [navigate, isModal]);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/api/admin/volunteers`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch volunteers');
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error('Server returned non-JSON response. Please check if the backend is running.');
      }

      const data = await response.json();
      setVolunteers(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Error loading volunteers. Please ensure backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePresenceToggle = async (id: number, currentStatus: boolean) => {
    try {
      setUpdatingId(id);
      const res = await fetch(`${API_BASE_URL}/api/admin/update-volunteer-presence`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_present: !currentStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update presence');
      }

      // Update local state
      setVolunteers(volunteers.map(v =>
        v.id === id ? { ...v, is_present: !currentStatus } : v
      ));

      // Show success toast
      const volunteer = volunteers.find(v => v.id === id);
      setToast({
        message: `${volunteer?.name} marked as ${!currentStatus ? 'Present' : 'Absent'} successfully!`,
        type: 'success'
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setToast({ message: errorMessage || 'Error updating presence status', type: 'error' });
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = async () => {
    localStorage.clear(); sessionStorage.clear();
    try { const { supabase } = await import('../supabaseClient'); await supabase.auth.signOut(); } catch { }
    window.location.href = window.location.origin;
  };

  const filteredVolunteers = volunteers.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.room_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.time_slot.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.phone_no.includes(searchQuery)
  );

  // ── Stats ──────────────────────────────────────────────────────────────────
  const presentCount = volunteers.filter(v => v.is_present).length;
  const absentCount = volunteers.length - presentCount;

  const navItems = [{ name: 'Dashboard', link: '/' }, { name: 'PCO Duty', link: '/pco-duty' }];

  // ── Shared inner content ───────────────────────────────────────────────────
  const content = (
    <div className={`relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 ${isModal ? 'pt-6' : 'pt-28 sm:pt-32'} pb-12 sm:pb-20`}>

      {/* Page heading */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-neon-green/60 mb-1">
          PCO Assignment
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          Volunteer Duty
        </h1>
        <p className="text-gray-400 dark:text-white/30 text-sm mt-1">
          {volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''} loaded
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {[
          { label: 'Total Volunteers', value: volunteers.length, icon: '⬡' },
          { label: 'Present', value: presentCount, icon: '◎' },
          { label: 'Absent', value: absentCount, icon: '◈' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-white/[0.025] border border-gray-200 dark:border-white/[0.06] rounded-2xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 shadow-sm dark:shadow-none">
            <span className="text-emerald-500 dark:text-neon-green/40 text-xl font-mono shrink-0">{s.icon}</span>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-white/25">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + refresh row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl">
        <div className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, room, time slot…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full
              bg-white dark:bg-white/[0.04]
              border border-gray-200 dark:border-white/[0.08]
              text-gray-900 dark:text-white
              text-sm placeholder-gray-400 dark:placeholder-white/20
              rounded-xl pl-11 pr-5 py-3
              focus:outline-none focus:border-emerald-400 dark:focus:border-neon-green/30
              focus:ring-2 focus:ring-emerald-100 dark:focus:ring-0
              shadow-sm dark:shadow-none transition-all"
          />
        </div>
        <button
          onClick={fetchVolunteers}
          className="px-5 py-3 rounded-xl
            bg-white dark:bg-white/[0.04]
            border border-gray-200 dark:border-white/[0.08]
            text-gray-600 dark:text-white/60
            text-sm font-bold
            hover:bg-gray-50 dark:hover:bg-white/[0.07]
            hover:text-gray-900 dark:hover:text-white
            shadow-sm dark:shadow-none
            transition-all flex items-center gap-2 shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-white/[0.025] border border-gray-200 dark:border-white/[0.07] rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
            <p className="text-gray-400 dark:text-white/20 text-xs font-black uppercase tracking-widest animate-pulse">
              Loading Volunteers…
            </p>
          </div>
        ) : filteredVolunteers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <p className="text-5xl opacity-20 text-gray-500 dark:text-white">⬡</p>
            <p className="text-gray-400 dark:text-white/20 text-sm font-bold uppercase tracking-widest">
              {searchQuery ? `No results for "${searchQuery}"` : 'No volunteers found'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/[0.06]">
                    {['Volunteer', 'Contact', 'Room', 'Time Slot', 'Status', 'Action'].map((h) => (
                      <th
                        key={h}
                        className={`px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-white/30 ${h === 'Action' ? 'text-center' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                  {filteredVolunteers.map((volunteer, i) => (
                    <motion.tr
                      key={volunteer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Volunteer name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.07] border border-gray-200 dark:border-white/10 flex items-center justify-center text-xs font-black text-gray-500 dark:text-white/40 shrink-0">
                            {volunteer.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate max-w-[160px]">
                            {volunteer.name}
                          </span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 dark:text-white/50">{volunteer.phone_no}</span>
                      </td>

                      {/* Room */}
                      <td className="px-6 py-4">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border
                        bg-blue-100 text-blue-700 border-blue-200
                        dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25">
                          {volunteer.room_no}
                        </span>
                      </td>

                      {/* Time slot */}
                      <td className="px-6 py-4">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border
                        bg-violet-100 text-violet-700 border-violet-200
                        dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25">
                          {volunteer.time_slot}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${volunteer.is_present
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : 'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${volunteer.is_present ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          {volunteer.is_present ? 'Present' : 'Absent'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handlePresenceToggle(volunteer.id, volunteer.is_present)}
                          disabled={updatingId === volunteer.id}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 mx-auto min-w-[120px]
                          ${volunteer.is_present
                              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20'
                              : 'bg-neon-green text-black hover:shadow-[0_0_16px_rgba(163,255,18,0.35)]'
                            } disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
                        >
                          {updatingId === volunteer.id ? (
                            <div className={`w-3 h-3 border-2 rounded-full animate-spin ${volunteer.is_present
                              ? 'border-red-200 border-t-red-600 dark:border-red-500/30 dark:border-t-red-400'
                              : 'border-black/20 border-t-black'
                              }`} />
                          ) : volunteer.is_present ? 'Mark Absent' : 'Mark Present'}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card layout */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-white/[0.04]">
              {filteredVolunteers.map((volunteer, i) => (
                <motion.div
                  key={volunteer.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.07] border border-gray-200 dark:border-white/10 flex items-center justify-center text-xs font-black text-gray-500 dark:text-white/40 shrink-0">
                        {volunteer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{volunteer.name}</p>
                        <p className="text-xs text-gray-400 dark:text-white/40">{volunteer.phone_no}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0 ${volunteer.is_present
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                      : 'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${volunteer.is_present ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {volunteer.is_present ? 'Present' : 'Absent'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25">
                      {volunteer.room_no}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25">
                      {volunteer.time_slot}
                    </span>
                  </div>
                  <button
                    onClick={() => handlePresenceToggle(volunteer.id, volunteer.is_present)}
                    disabled={updatingId === volunteer.id}
                    className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2
                    ${volunteer.is_present
                        ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                        : 'bg-neon-green text-black hover:shadow-[0_0_16px_rgba(163,255,18,0.35)]'
                      } disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
                  >
                    {updatingId === volunteer.id ? (
                      <div className={`w-3 h-3 border-2 rounded-full animate-spin ${volunteer.is_present
                        ? 'border-red-200 border-t-red-600 dark:border-red-500/30 dark:border-t-red-400'
                        : 'border-black/20 border-t-black'
                        }`} />
                    ) : volunteer.is_present ? 'Mark Absent' : 'Mark Present'}
                  </button>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Table footer — count */}
        {!loading && filteredVolunteers.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/25">
              Showing {filteredVolunteers.length} of {volunteers.length}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                {presentCount} present
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-red-100 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                {absentCount} absent
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Standalone page ──────────────────────────────────────────────────────
  if (!isModal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col font-sans overflow-x-hidden">
        {/* Toast */}
        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} />}
        </AnimatePresence>

        {/* Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/[0.06] dark:bg-neon-green/[0.03] rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-blue-400/[0.08] dark:bg-blue-500/[0.07] rounded-full blur-[120px]" />
          <div className="absolute inset-0
            [background-size:40px_40px]
            [background-image:linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)]
            dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]
            [mask-image:linear-gradient(to_bottom,black_0%,transparent_40%)]" />
        </div>

        {/* Navbar */}
        <div className="fixed top-0 inset-x-0 z-[100] w-full">
          <Navbar>
            <NavBody>
              <div className="flex-1 flex justify-start">
                <NavbarLogo onClick={() => navigate('/')} />
              </div>
              <div className="flex-1 flex justify-center">
                <NavItems items={navItems} />
              </div>
              <div className="flex-1 flex justify-end">
                <div className="hidden md:flex items-center gap-4">
                  {loggedInUser ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-sm dark:shadow-none">
                        <div className="w-7 h-7 rounded-full bg-neon-green flex items-center justify-center text-black font-bold text-xs">
                          {(loggedInUser.name || loggedInUser.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col -space-y-0.5">
                          <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                            {loggedInUser.name || loggedInUser.email?.split('@')[0]}
                          </span>
                          <span className="text-[9px] text-emerald-600 dark:text-neon-green font-black uppercase tracking-widest opacity-80">
                            {loggedInUser.duties?.join(' • ') || loggedInUser.duty || 'Staff'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <NavbarButton variant="secondary" onClick={() => navigate('/admin/login')}>
                      Superadmin
                    </NavbarButton>
                  )}
                </div>
                <MobileNav>
                  <NavbarLogo onClick={() => navigate('/')} />
                  <MobileNavToggle isOpen={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
                </MobileNav>
              </div>
            </NavBody>
            <MobileNavMenu isOpen={isMobileMenuOpen}>
              <div className="flex flex-col gap-4 p-6">
                {navItems.map((item, i) => (
                  <button key={i} onClick={() => { navigate(item.link); setIsMobileMenuOpen(false); }}
                    className="text-left text-lg font-medium text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-neon-green transition-colors">
                    {item.name}
                  </button>
                ))}
                <hr className="border-gray-200 dark:border-white/10" />
                <button onClick={handleLogout} className="w-full py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 font-bold">
                  Logout
                </button>
              </div>
            </MobileNavMenu>
          </Navbar>
        </div>

        {content}
      </div>
    );
  }

  // ── Modal mode ──────────────────────────────────────────────────────────
  return (
    <div className="text-gray-900 dark:text-white">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
      {content}
    </div>
  );
};

export default PCODuty;