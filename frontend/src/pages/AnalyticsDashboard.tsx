import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';
import { io, Socket } from 'socket.io-client';

interface TeamMember {
  name: string;
  email?: string;
  role?: 'Leader' | 'Member' | string;
  is_present?: boolean;
  id_card_issued?: boolean;
}

interface Team {
  team_id: number;
  team_leader_name: string;
  team_members: TeamMember[];
  registered_email: string;
  registered_phone: string;
  leader_present: boolean;
  leader_id_issued: boolean;
  allocated_room?: string;
  team_name?: string;
}

interface Room {
  id: number;
  room_name: string;
  block: string;
  capacity: number; // remaining capacity
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, x: 40 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 40 }}
    className="fixed top-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border min-w-[260px] max-w-sm"
    style={{
      background: type === 'success'
        ? 'var(--toast-success-bg, #f0fdf4)'
        : 'var(--toast-error-bg, #fef2f2)',
    }}
  >
    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${type === 'success'
      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
      : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
      }`}>
      {type === 'success' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </div>
    <span className={`text-sm font-bold flex-1 ${type === 'success'
      ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-red-700 dark:text-red-400'
      }`}>
      {message}
    </span>
    <button
      onClick={onClose}
      className="text-gray-400 hover:text-gray-600 dark:hover:text-white/60 transition-colors shrink-0"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </motion.div>
);

// ── Sidebar nav item ──────────────────────────────────────────────────────────
const SideNavItem = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${active
      ? 'bg-neon-green/10 text-emerald-700 dark:text-neon-green border border-neon-green/20'
      : 'text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white border border-transparent'
      }`}
  >
    <span className={active ? 'text-emerald-600 dark:text-neon-green' : ''}>{icon}</span>
    {label}
  </button>
);

// ── Filter pill ───────────────────────────────────────────────────────────────
const FilterPill = ({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: 'gray' | 'emerald' | 'red' | 'blue' | 'amber';
  onClick: () => void;
}) => {
  const activeColors = {
    gray: 'bg-gray-900 text-white dark:bg-white dark:text-black border-transparent',
    emerald: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black border-transparent',
    red: 'bg-red-500 text-white border-transparent',
    blue: 'bg-blue-600 text-white border-transparent',
    amber: 'bg-amber-500 text-white border-transparent',
  };
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border transition-all shrink-0 ${active
        ? activeColors[color]
        : 'bg-white dark:bg-white/[0.04] text-gray-500 dark:text-white/40 border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.07] hover:text-gray-900 dark:hover:text-white'
        }`}
    >
      {label}
    </button>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: string;
}) => (
  <div className="bg-white dark:bg-white/[0.025] border border-gray-200 dark:border-white/[0.06] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm dark:shadow-none">
    <span className={`text-xl font-mono shrink-0 ${accent || 'text-emerald-500 dark:text-neon-green/40'}`}>{icon}</span>
    <div className="min-w-0">
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-white/25 truncate">{label}</p>
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'participants' | 'idcards' | 'rooms'>('participants');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'issued' | 'not_issued'>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Rooms tab state
  const activeTabRef = useRef(activeTab);

  // @ts-ignore
  const [selectedBlock, setSelectedBlock] = useState<'N Block' | 'P Block' | null>(null);
  // @ts-ignore
  const [rooms, setRooms] = useState<Room[]>([]);
  // @ts-ignore
  const [roomsLoading, setRoomsLoading] = useState(false);
  // @ts-ignore
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  // @ts-ignore
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const selectedBlockRef = useRef(selectedBlock);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    selectedBlockRef.current = selectedBlock;
  }, [selectedBlock]);

  // Memoized selected team to avoid manual syncing
  const selectedTeam = selectedTeamId ? teams.find(t => t.team_id === selectedTeamId) : null;

  const fetchTeams = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const res = await fetch(`${baseUrl}/api/teams?limit=2000`);

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const rawData = await res.json();
      const data = Array.isArray(rawData) ? rawData : rawData.data;

      console.log('AnalyticsDashboard fetched teams:', data?.length);
      setTeams(data || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  const handleUpdateMembers = async (teamId: number, updatedMembers: TeamMember[]) => {
    setUpdatingId(teamId);
    try {
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const res = await fetch(`${baseUrl}/api/teams/${teamId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_members: updatedMembers }),
      });

      if (!res.ok) {
        let errorMsg = 'Failed to update members';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch (jsonErr) {
          const text = await res.text();
          console.error('Server returned non-JSON error:', text.substring(0, 200));
          errorMsg = `Server error (${res.status}): ${res.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const updatedTeam = await res.json();
      setTeams(prev => prev.map(t => t.team_id === teamId ? updatedTeam : t));
      showSuccess(`Team #${teamId} updated successfully!`);
    } catch (err: unknown) {
      console.error('Error updating members:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setNotification({ message: errorMessage, type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem('isAdminAuthenticated');
    if (auth !== 'true') {
      navigate('/admin/login');
      return;
    }

    // Initial fetch
    fetchTeams();

    // 1. Initialize Socket.io
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      withCredentials: true,
      path: '/socket.io'
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('AnalyticsDashboard: Connected to WebSocket server');
    });

    socket.on('teamUpdate', (updatedTeam: Team) => {
      console.log('AnalyticsDashboard: Real-time Team Update via Socket:', updatedTeam);
      setTeams(prev => prev.map(t =>
        t.team_id.toString() === updatedTeam.team_id.toString() ? { ...t, ...updatedTeam } : t
      ));
    });

    socket.on('teamsRefreshed', (data: { message: string; count: number }) => {
      console.log('AnalyticsDashboard: Teams refreshed via Socket:', data);
      fetchTeams(true);
    });

    socket.on('roomUpdate', (data: { team: Team; room: Room; old_room?: Room; old_room_name?: string }) => {
      console.log('AnalyticsDashboard: Real-time Room Update via Socket:', data);

      // Update the team in state
      if (data.team) {
        setTeams(prev => prev.map(t =>
          t.team_id.toString() === data.team.team_id.toString() ? { ...t, ...data.team } : t
        ));
      }

      // If we are currently on the rooms tab, refresh rooms for the selected block
      if (activeTabRef.current === 'rooms' && selectedBlockRef.current) {
        fetchRooms(selectedBlockRef.current);
      }
    });

    // 2. Setup Supabase subscription as fallback
    const subscription = supabase
      .channel('teams_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
        console.log('AnalyticsDashboard: Supabase Real-time Update:', payload);
        const updatedTeam = payload.new as Team;
        if (updatedTeam && updatedTeam.team_id) {
          setTeams(prev => prev.map(t =>
            t.team_id.toString() === updatedTeam.team_id.toString() ? { ...t, ...updatedTeam } : t
          ));
        }
      })
      .subscribe();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      supabase.removeChannel(subscription);
    };
  }, [navigate, fetchTeams]);

  const fetchRooms = async (block: string) => {
    setRoomsLoading(true);
    try {
      const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const res = await fetch(`${base}/api/admin/rooms?block=${encodeURIComponent(block)}`);
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rooms' && selectedBlock) {
      fetchRooms(selectedBlock);
    }
  }, [selectedBlock, activeTab]);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(t);
  }, [notification]);

  const showSuccess = (msg: string) => setNotification({ message: msg, type: 'success' });

  const togglePresence = async (teamId: number, current: boolean) => {
    setUpdatingId(teamId);
    try {
      const { error } = await supabase.from('teams').update({ leader_present: !current }).eq('team_id', teamId);
      if (error) throw error;
      showSuccess(`Team #${teamId} marked as ${!current ? 'Present' : 'Absent'}`);
    } catch (err) { console.error(err); } finally { setUpdatingId(null); }
  };

  const toggleIdCard = async (teamId: number, current: boolean) => {
    setUpdatingId(teamId);
    try {
      const { error } = await supabase.from('teams').update({ leader_id_issued: !current }).eq('team_id', teamId);
      if (error) throw error;
      showSuccess(`ID Card for Team #${teamId} ${!current ? 'Issued' : 'Revoked'}`);
    } catch (err) { console.error(err); } finally { setUpdatingId(null); }
  };

  const filteredData = teams.filter(team => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      team.team_leader_name.toLowerCase().includes(q) ||
      team.team_id.toString().includes(q) ||
      team.registered_email.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (activeTab === 'participants') {
      if (filter === 'present') return team.leader_present;
      if (filter === 'absent') return !team.leader_present;
    } else {
      if (filter === 'issued') return team.leader_id_issued;
      if (filter === 'not_issued') return !team.leader_id_issued;
    }
    return true;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const presentCount = teams.filter(t => t.leader_present).length;
  const absentCount = teams.length - presentCount;
  const issuedCount = teams.filter(t => t.leader_id_issued).length;
  const pendingCount = teams.length - issuedCount;

  // ── Sidebar content ────────────────────────────────────────────────────────
  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Hackaccino</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-white/25 px-4 pb-2 pt-1">
          Navigation
        </p>
        <SideNavItem
          active={false}
          onClick={() => navigate('/admin/dashboard')}
          label="Dashboard"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />

        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-white/25 px-4 pb-2 pt-4">
          Analytics
        </p>
        <SideNavItem
          active={activeTab === 'participants'}
          onClick={() => { setActiveTab('participants'); setFilter('all'); setSidebarOpen(false); }}
          label="Participants"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 15.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
            </svg>
          }
        />
        <SideNavItem
          active={activeTab === 'idcards'}
          onClick={() => { setActiveTab('idcards'); setFilter('all'); setSidebarOpen(false); }}
          label="ID Cards"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
          }
        />

        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-white/25 px-4 pb-2 pt-4">
          Management
        </p>
        <SideNavItem
          active={false}
          onClick={() => navigate('/')}
          label="Staff Dashboard"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </nav>

      {/* Admin profile pill */}
      <div className="p-4 border-t border-gray-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 rounded-xl bg-neon-green flex items-center justify-center text-black font-black text-xs shrink-0">
            A
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">Super Admin</p>
            <p className="text-[9px] text-emerald-600 dark:text-neon-green font-black uppercase tracking-widest opacity-80">
              Admin
            </p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('isAdminAuthenticated'); navigate('/admin/login'); }}
            className="ml-auto w-7 h-7 rounded-lg bg-red-50 border border-red-200 text-red-500 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors shrink-0"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex font-sans overflow-hidden">
      {/* Background glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/[0.05] dark:bg-neon-green/[0.03] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-blue-400/[0.07] dark:bg-blue-500/[0.07] rounded-full blur-[120px]" />
      </div>

      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-56 xl:w-64 shrink-0 flex-col sticky top-0 h-screen z-20
        bg-white dark:bg-[#0a0a0a]
        border-r border-gray-200 dark:border-white/[0.07]
        shadow-[1px_0_0_0_rgba(0,0,0,0.04)] dark:shadow-none">
        {sidebar}
      </aside>

      {/* ── Mobile Sidebar overlay ───────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 h-full w-64 z-40 lg:hidden
                bg-white dark:bg-[#0a0a0a]
                border-r border-gray-200 dark:border-white/[0.07]"
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10">

        {/* Top bar */}
        <header className="sticky top-0 z-20
          bg-white/90 dark:bg-black/80 backdrop-blur-xl
          border-b border-gray-200 dark:border-white/[0.07]
          px-6 md:px-10 py-4 flex items-center gap-4">

          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-neon-green/60 leading-none mb-0.5">
              {activeTab === 'participants' ? 'Participants' : 'ID Cards'}
            </p>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
              {activeTab === 'participants' ? 'Attendance Tracking' : 'ID Card Issuance'}
            </h1>
          </div>

          {/* Search */}
          <div className="relative hidden sm:block">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search leader, ID, email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 md:w-64 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-white/20 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-emerald-400 dark:focus:border-neon-green/30 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-0 shadow-sm dark:shadow-none transition-all"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchTeams()}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-all shrink-0"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </header>

        {/* Page body */}
        <div className="px-6 md:px-10 py-8 space-y-6 flex-1">

          {/* Mobile search */}
          <div className="relative sm:hidden">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-white/20 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-emerald-400 dark:focus:border-neon-green/30 shadow-sm dark:shadow-none transition-all"
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Teams" value={teams.length} icon="⬡" />
            {activeTab === 'participants' ? (
              <>
                <StatCard label="Present" value={presentCount} icon="◎" accent="text-emerald-500 dark:text-neon-green/60" />
                <StatCard label="Absent" value={absentCount} icon="◈" accent="text-red-400 dark:text-red-400/60" />
                <StatCard label="Rate" value={teams.length > 0 ? `${Math.round((presentCount / teams.length) * 100)}%` : '0%'} icon="◉" accent="text-blue-500 dark:text-blue-400/60" />
              </>
            ) : (
              <>
                <StatCard label="Issued" value={issuedCount} icon="◎" accent="text-blue-500 dark:text-blue-400/60" />
                <StatCard label="Pending" value={pendingCount} icon="◈" accent="text-amber-500 dark:text-amber-400/60" />
                <StatCard label="Rate" value={teams.length > 0 ? `${Math.round((issuedCount / teams.length) * 100)}%` : '0%'} icon="◉" accent="text-emerald-500 dark:text-neon-green/60" />
              </>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterPill label={`All (${teams.length})`} active={filter === 'all'} color="gray" onClick={() => setFilter('all')} />
            {activeTab === 'participants' ? (
              <>
                <FilterPill label={`Present (${presentCount})`} active={filter === 'present'} color="emerald" onClick={() => setFilter('present')} />
                <FilterPill label={`Absent (${absentCount})`} active={filter === 'absent'} color="red" onClick={() => setFilter('absent')} />
              </>
            ) : (
              <>
                <FilterPill label={`Issued (${issuedCount})`} active={filter === 'issued'} color="blue" onClick={() => setFilter('issued')} />
                <FilterPill label={`Pending (${pendingCount})`} active={filter === 'not_issued'} color="amber" onClick={() => setFilter('not_issued')} />
              </>
            )}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-white/[0.025] border border-gray-200 dark:border-white/[0.07] rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-10 h-10 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
                <p className="text-gray-400 dark:text-white/20 text-xs font-black uppercase tracking-widest animate-pulse">
                  Loading Teams…
                </p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                <p className="text-5xl opacity-20 text-gray-500 dark:text-white">⬡</p>
                <p className="text-gray-400 dark:text-white/20 text-sm font-bold uppercase tracking-widest">
                  No teams found
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/[0.06]">
                      {['Team', 'Contact', 'Status', 'Action'].map((h) => (
                        <th key={h} className={`px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-white/30 ${h === 'Action' ? 'text-right' : ''}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                    {filteredData.map((team, i) => (
                      <motion.tr
                        key={team.team_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Team */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.07] border border-gray-200 dark:border-white/10 flex items-center justify-center text-xs font-black text-gray-500 dark:text-white/40 shrink-0">
                              {team.team_leader_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[180px]">
                                {team.team_leader_name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/[0.05] dark:text-white/30 dark:border-white/[0.07]">
                                  #{team.team_id}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-white/30">
                                  {Array.isArray(team.team_members) ? team.team_members.length : 0} members
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 dark:text-white/60 truncate max-w-[200px]">{team.registered_email}</p>
                          <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{team.registered_phone}</p>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {activeTab === 'participants' ? (
                            <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${team.leader_present
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                              : 'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${team.leader_present ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                              {team.leader_present ? 'Present' : 'Absent'}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${team.leader_id_issued
                              ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                              : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${team.leader_id_issued ? 'bg-blue-500' : 'bg-amber-500'}`} />
                              {team.leader_id_issued ? 'Issued' : 'Pending'}
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right">
                          {activeTab === 'participants' ? (
                            <button
                              onClick={() => togglePresence(team.team_id, team.leader_present)}
                              disabled={updatingId === team.team_id}
                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 inline-flex items-center justify-center gap-2 min-w-[120px]
                                ${team.leader_present
                                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20'
                                  : 'bg-neon-green text-black hover:shadow-[0_0_16px_rgba(163,255,18,0.35)]'
                                } disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
                            >
                              {updatingId === team.team_id ? (
                                <div className={`w-3 h-3 border-2 rounded-full animate-spin ${team.leader_present ? 'border-red-200 border-t-red-600 dark:border-red-500/30 dark:border-t-red-400' : 'border-black/20 border-t-black'}`} />
                              ) : team.leader_present ? 'Mark Absent' : 'Mark Present'}
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleIdCard(team.team_id, team.leader_id_issued)}
                              disabled={updatingId === team.team_id}
                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 inline-flex items-center justify-center gap-2 min-w-[120px]
                                ${team.leader_id_issued
                                  ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 dark:hover:bg-amber-500/20'
                                  : 'bg-neon-green text-black hover:shadow-[0_0_16px_rgba(163,255,18,0.35)]'
                                } disabled:opacity-40 disabled:cursor-not-allowed active:scale-95`}
                            >
                              {updatingId === team.team_id ? (
                                <div className={`w-3 h-3 border-2 rounded-full animate-spin ${team.leader_id_issued ? 'border-amber-200 border-t-amber-600 dark:border-amber-500/30 dark:border-t-amber-400' : 'border-black/20 border-t-black'}`} />
                              ) : team.leader_id_issued ? 'Revoke ID' : 'Issue ID Card'}
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table footer */}
            {!loading && filteredData.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between flex-wrap gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/25">
                  Showing {filteredData.length} of {teams.length} teams
                </p>
                {activeTab === 'participants' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                      {presentCount} present
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-red-100 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                      {absentCount} absent
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                      {issuedCount} issued
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                      {pendingCount} pending
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Members Modal */}
      {showMembersModal && selectedTeam && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowMembersModal(false); setSelectedTeamId(null); }}></div>
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                    {selectedTeam.team_name || selectedTeam.team_leader_name}
                    <span className="text-sm font-mono text-gray-400 font-normal">#{selectedTeam.team_id}</span>
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {activeTab === 'participants'
                      ? 'Manage individual member attendance'
                      : activeTab === 'idcards'
                        ? 'Manage individual member ID card issuance'
                        : 'Manage individual member attendance and ID cards'}
                  </p>
                </div>
                <button
                  onClick={() => { setShowMembersModal(false); setSelectedTeamId(null); }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {Array.isArray(selectedTeam.team_members) && selectedTeam.team_members.map((member: TeamMember, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center justify-between group hover:bg-blue-50/50 hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${member.role === 'Leader' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-800">{member.name}</h4>
                          {member.role === 'Leader' && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 font-black px-1.5 py-0.5 rounded uppercase">Leader</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{member.email || 'No email provided'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Attendance Toggle - Only in Participants or Rooms tab */}
                      {(activeTab === 'participants' || activeTab === 'rooms') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedMembers = [...selectedTeam.team_members];
                            updatedMembers[i] = { ...member, is_present: !member.is_present };
                            handleUpdateMembers(selectedTeam.team_id, updatedMembers);
                          }}
                          disabled={updatingId === selectedTeam.team_id}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${member.is_present
                            ? 'bg-green-600 text-white shadow-lg shadow-green-100'
                            : 'bg-white text-gray-400 border border-gray-200 hover:border-green-200 hover:text-green-600'
                            }`}
                        >
                          {member.is_present ? '✓ PRESENT' : 'ABSENT'}
                        </button>
                      )}

                      {/* ID Card Toggle - Only in ID Cards or Rooms tab */}
                      {(activeTab === 'idcards' || activeTab === 'rooms') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedMembers = [...selectedTeam.team_members];
                            updatedMembers[i] = { ...member, id_card_issued: !member.id_card_issued };
                            handleUpdateMembers(selectedTeam.team_id, updatedMembers);
                          }}
                          disabled={updatingId === selectedTeam.team_id}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${member.id_card_issued
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                            : 'bg-white text-gray-400 border border-gray-200 hover:border-blue-200 hover:text-blue-600'
                            }`}
                        >
                          {member.id_card_issued ? '✓ ID ISSUED' : 'ID PENDING'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;