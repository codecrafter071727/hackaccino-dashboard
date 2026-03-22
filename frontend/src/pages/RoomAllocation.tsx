import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';
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

interface Team {
  team_id: number;
  team_leader_name: string;
  team_members: any;
  registered_email: string;
  registered_phone: string;
  leader_present: boolean;
  leader_id_issued: boolean;
  allocated_room?: string;
}

// ── Block selection card ──────────────────────────────────────────────────────
const BlockCard = ({
  letter,
  label,
  description,
  accent,
  onClick,
}: {
  letter: string;
  label: string;
  description: string;
  accent: { bg: string; text: string; hoverBg: string; hoverText: string; ring: string };
  onClick: () => void;
}) => (
  <motion.div
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    onClick={onClick}
    className="group relative rounded-2xl cursor-pointer overflow-hidden h-64 flex flex-col justify-center items-center text-center p-8
      bg-white dark:bg-[#111111]
      border border-gray-200 dark:border-white/[0.12]
      hover:border-gray-300 dark:hover:border-white/[0.22]
      shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]
      dark:shadow-[0_4px_32px_rgba(0,0,0,0.6)] dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.75)]
      transition-all duration-300"
  >
    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${accent.bg} ${accent.text} group-hover:${accent.hoverBg} group-hover:${accent.hoverText} border ${accent.ring}`}>
      <span className="text-4xl font-black">{letter}</span>
    </div>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-neon-green transition-colors">
      {label}
    </h2>
    <p className="text-sm text-gray-400 dark:text-white/40">{description}</p>
  </motion.div>
);

// ── Room card in the room list view ──────────────────────────────────────────
const RoomCard = ({
  room,
  occupancy,
  onClick,
}: {
  room: any;
  occupancy: number;
  onClick: () => void;
}) => {
  const total = room.capacity + occupancy;
  const isFull = room.capacity === 0;
  const fillPct = total > 0 ? Math.round((occupancy / total) * 100) : 0;

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="group relative rounded-2xl cursor-pointer overflow-hidden
        bg-white dark:bg-[#111111]
        border border-gray-200 dark:border-white/[0.12]
        hover:border-gray-300 dark:hover:border-white/[0.22]
        shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]
        dark:shadow-[0_4px_32px_rgba(0,0,0,0.6)] dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.75)]
        transition-all duration-300 p-6"
    >
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Room icon + ID */}
      <div className="flex items-start justify-between mb-5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center
          bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400
          border border-blue-200 dark:border-blue-500/30
          group-hover:bg-neon-green/10 group-hover:text-emerald-700 dark:group-hover:text-neon-green group-hover:border-neon-green/20
          transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <span className="text-[9px] font-mono text-gray-400 dark:text-white/35 tracking-widest uppercase">
          ID #{room.id}
        </span>
      </div>

      {/* Room name */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-neon-green transition-colors">
        {room.room_name}
      </h3>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40 mb-4">
        {room.block}
      </p>

      {/* Capacity bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-white/40">Occupancy</span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${isFull
              ? 'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
              : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
            }`}>
            {isFull ? 'Full' : `${room.capacity} left`}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-white/[0.1] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-400 dark:bg-red-500' : 'bg-neon-green'}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-gray-400 dark:text-white/35">
          <span>{occupancy} assigned</span>
          <span>{total} total</span>
        </div>
      </div>
    </motion.div>
  );
};

// ── Team assignment card ──────────────────────────────────────────────────────
const TeamAssignCard = ({
  team,
  selectedRoom,
  assigning,
  onAssign,
  getMemberCount,
}: {
  team: Team;
  selectedRoom: any;
  assigning: boolean;
  onAssign: () => void;
  getMemberCount: (m: any) => number;
}) => {
  const isAssignedHere = team.allocated_room === selectedRoom?.room_name;
  const isAssignedElsewhere = team.allocated_room && !isAssignedHere;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-2xl overflow-hidden h-full flex flex-col
        bg-white dark:bg-[#111111]
        transition-all duration-300
        ${isAssignedHere
          ? 'border-2 border-emerald-400 dark:border-neon-green/50 shadow-[0_0_0_3px_rgba(52,211,153,0.1)] dark:shadow-[0_0_0_3px_rgba(163,255,18,0.08),0_4px_32px_rgba(0,0,0,0.6)]'
          : 'border border-gray-200 dark:border-white/[0.12] hover:border-gray-300 dark:hover:border-white/[0.22] shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.6)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.75)]'
        }`}
    >
      <div className={`absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent to-transparent transition-opacity duration-300 ${isAssignedHere ? 'via-neon-green/60 opacity-100' : 'via-neon-green/50 opacity-0 group-hover:opacity-100'}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md
                bg-gray-100 text-gray-500 border border-gray-200
                dark:bg-white/[0.08] dark:text-white/50 dark:border-white/[0.12]">
                #{team.team_id}
              </span>
              {isAssignedHere && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md
                  bg-emerald-100 text-emerald-700 border border-emerald-200
                  dark:bg-neon-green/15 dark:text-neon-green dark:border-neon-green/30">
                  Assigned Here
                </span>
              )}
              {isAssignedElsewhere && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md
                  bg-violet-100 text-violet-700 border border-violet-200
                  dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/35">
                  {team.allocated_room}
                </span>
              )}
            </div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight truncate">
              {team.team_leader_name}
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-white/35 mb-0.5">Members</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{getMemberCount(team.team_members)}</p>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 dark:text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-[11px] text-gray-500 dark:text-white/55 truncate">{team.registered_email}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 dark:text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-[11px] text-gray-500 dark:text-white/55">{team.registered_phone}</span>
          </div>
        </div>

        {/* Assign button */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/[0.08]">
          <button
            onClick={onAssign}
            disabled={assigning || isAssignedHere}
            className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2
              ${isAssignedHere
                ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 cursor-default dark:bg-neon-green/15 dark:text-neon-green dark:border-neon-green/30'
                : assigning
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-white/[0.06] dark:text-white/25'
                  : 'bg-neon-green text-black hover:shadow-[0_0_20px_rgba(163,255,18,0.35)] active:scale-[0.98]'
              }`}
          >
            {assigning ? (
              <>
                <div className="w-3 h-3 border-2 border-gray-400 dark:border-white/25 border-t-transparent rounded-full animate-spin" />
                Assigning…
              </>
            ) : isAssignedHere ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Allocated
              </>
            ) : (
              'Assign to this Room'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const RoomAllocation: React.FC<{ isModal?: boolean }> = ({ isModal }) => {
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [occupancyCounts, setOccupancyCounts] = useState<Record<string, number>>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningTeamId, setAssigningTeamId] = useState<number | null>(null);

  const navigate = useNavigate();

  const fetchOccupancy = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('allocated_room')
        .not('allocated_room', 'is', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((team: any) => {
        const room = team.allocated_room;
        if (room) counts[room] = (counts[room] || 0) + 1;
      });
      setOccupancyCounts(counts);
    } catch (err) {
      console.error('Error fetching occupancy:', err);
    }
  };

  useEffect(() => {
    fetchOccupancy();
    const storedUser = localStorage.getItem('staffUser');
    if (!storedUser) { if (!isModal) { alert('Access Denied'); navigate('/'); } return; }
    try {
      const user = JSON.parse(storedUser);
      setLoggedInUser(user);
      const duties = user.duties || [user.duty];
      if (!duties.includes('Room Allocation') && !isModal) { alert('Access Denied'); navigate('/'); }
    } catch { localStorage.removeItem('staffUser'); if (!isModal) navigate('/'); }
  }, [navigate, isModal]);

  useEffect(() => {
    const sub = supabase
      .channel('room_allocation_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, (payload) => {
        const u = payload.new as Team;
        setAllTeams((prev) => prev.map((t) => t.team_id === u.team_id ? { ...t, ...u } : t));
        fetchOccupancy();
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  useEffect(() => { if (selectedBlock) fetchRooms(selectedBlock); }, [selectedBlock]);
  useEffect(() => { if (selectedRoom) fetchAllTeams(); }, [selectedRoom]);

  useEffect(() => {
    if (!allTeams.length) return;
    if (!searchQuery.trim()) { setFilteredTeams(allTeams); return; }
    const q = searchQuery.toLowerCase();
    setFilteredTeams(allTeams.filter(t =>
      t.team_id?.toString().includes(q) ||
      t.team_leader_name?.toLowerCase().includes(q) ||
      t.registered_email?.toLowerCase().includes(q) ||
      t.registered_phone?.toLowerCase().includes(q) ||
      (Array.isArray(t.team_members) && t.team_members.some((m: any) => {
        const name = typeof m === 'string' ? m : m?.name;
        return name?.toLowerCase().includes(q);
      }))
    ));
  }, [searchQuery, allTeams]);

  const fetchRooms = async (block: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/rooms?block=${encodeURIComponent(block)}`);
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to fetch rooms'); }
      const ct = res.headers.get('content-type');
      if (!ct?.includes('application/json')) throw new Error('Server returned non-JSON response.');
      setRooms(await res.json());
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const fetchAllTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams?limit=200`);
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const result = await res.json();
      const data = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
      setAllTeams(data); setFilteredTeams(data);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleAssignRoom = async (team: Team) => {
    if (!selectedRoom) return;
    if (team.allocated_room && !window.confirm(`Move team from ${team.allocated_room} to ${selectedRoom.room_name}?`)) return;
    setAssigningTeamId(team.team_id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${team.team_id}/assign-room`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_name: selectedRoom.room_name }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const msg = e.message || e.error || 'Failed to assign room';
        alert(`⚠️ ${msg}`);
        if (selectedBlock) fetchRooms(selectedBlock);
        throw new Error(msg);
      }
      await res.json();
      const updated = allTeams.map(t => t.team_id === team.team_id ? { ...t, allocated_room: selectedRoom.room_name } : t);
      setAllTeams(updated);
      setFilteredTeams(updated.filter(t => filteredTeams.some(ft => ft.team_id === t.team_id)));
      if (selectedBlock) fetchRooms(selectedBlock);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAssigningTeamId(null);
    }
  };

  const handleBack = () => {
    if (selectedRoom) { setSelectedRoom(null); setSearchQuery(''); setAllTeams([]); setFilteredTeams([]); }
    else if (selectedBlock) { setSelectedBlock(null); setRooms([]); }
    else if (!isModal) navigate('/');
  };

  const handleLogout = async () => {
    localStorage.clear(); sessionStorage.clear();
    try { await supabase.auth.signOut(); } catch { }
    window.location.href = window.location.origin;
  };

  const getMemberCount = (members: any) => Array.isArray(members) ? members.length : 0;
  const navItems = [{ name: 'Dashboard', link: '/' }, { name: 'Rooms', link: '/room-allocation' }];

  const breadcrumb = selectedRoom
    ? ['Room Allocation', selectedBlock!, selectedRoom.room_name]
    : selectedBlock
      ? ['Room Allocation', selectedBlock]
      : ['Room Allocation'];

  const totalRooms = rooms.length;
  const fullRooms = rooms.filter(r => r.capacity === 0).length;
  const assignedTeams = Object.values(occupancyCounts).reduce((a, b) => a + b, 0);

  const content = (
    <div className={`relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-10 ${isModal ? 'pt-6' : 'pt-32'} pb-20`}>

      {/* Page heading + breadcrumb */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-gray-300 dark:text-white/25 text-xs">›</span>}
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${i === breadcrumb.length - 1
                  ? 'text-emerald-600 dark:text-neon-green/70'
                  : 'text-gray-400 dark:text-white/35 cursor-pointer hover:text-gray-600 dark:hover:text-white/60'
                }`}>
                {crumb}
              </span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {(selectedBlock || selectedRoom) && (
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14]
                border border-gray-200 dark:border-white/[0.12]
                text-gray-500 hover:text-gray-900 dark:text-white/50 dark:hover:text-white
                transition-all group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              {selectedRoom ? (
                <span>
                  Assign to{' '}
                  <span className="text-emerald-600 dark:text-neon-green">{selectedRoom.room_name}</span>
                </span>
              ) : selectedBlock ? (
                `${selectedBlock} Rooms`
              ) : (
                'Room Allocation'
              )}
            </h1>
            <p className="text-gray-400 dark:text-white/40 text-sm mt-1">
              {selectedRoom
                ? `Assigning teams to ${selectedRoom.room_name} · ${selectedRoom.block}`
                : selectedBlock
                  ? 'Select a room to assign teams'
                  : 'Select a block to get started'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats bar — only on block view */}
      {selectedBlock && !selectedRoom && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Rooms', value: totalRooms, icon: '⬡' },
            { label: 'Full Rooms', value: fullRooms, icon: '◎' },
            { label: 'Teams Assigned', value: assignedTeams, icon: '◈' },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/[0.12] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <span className="text-emerald-500 dark:text-neon-green/60 text-xl font-mono shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 p-4 rounded-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── VIEW 1: Block selection ── */}
      {!selectedBlock && !selectedRoom && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto mt-10">
          <BlockCard
            letter="N"
            label="N Block"
            description="View rooms in N Block"
            accent={{
              bg: 'bg-blue-100 dark:bg-blue-500/20',
              text: 'text-blue-600 dark:text-blue-400',
              hoverBg: 'bg-neon-green/10',
              hoverText: 'text-emerald-600 dark:text-neon-green',
              ring: 'border-blue-200 dark:border-blue-500/30',
            }}
            onClick={() => setSelectedBlock('N Block')}
          />
          <BlockCard
            letter="P"
            label="P Block"
            description="View rooms in P Block"
            accent={{
              bg: 'bg-amber-100 dark:bg-amber-500/20',
              text: 'text-amber-600 dark:text-amber-400',
              hoverBg: 'bg-neon-green/10',
              hoverText: 'text-emerald-600 dark:text-neon-green',
              ring: 'border-amber-200 dark:border-amber-500/30',
            }}
            onClick={() => setSelectedBlock('P Block')}
          />
        </div>
      )}

      {/* ── VIEW 2: Room list ── */}
      {selectedBlock && !selectedRoom && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-10 h-10 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
              <p className="text-gray-400 dark:text-white/35 text-xs font-black uppercase tracking-widest animate-pulse">Loading Rooms…</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <p className="text-5xl opacity-20 text-gray-500 dark:text-white">⬡</p>
              <p className="text-gray-400 dark:text-white/35 text-sm font-bold uppercase tracking-widest">No rooms found</p>
              <p className="text-gray-400 dark:text-white/25 text-xs">Contact Superadmin to add rooms</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {rooms.map((room, i) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                >
                  <RoomCard
                    room={room}
                    occupancy={occupancyCounts[room.room_name] || 0}
                    onClick={() => { setSelectedRoom(room); setAllTeams([]); }}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── VIEW 3: Team assignment ── */}
      {selectedRoom && (
        <div>
          {/* Room info banner */}
          <div className="mb-6 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/[0.12] rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Selected Room</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedRoom.room_name} · {selectedRoom.block}</p>
              </div>
            </div>
            <div className="flex gap-3 ml-auto flex-wrap">
              <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${selectedRoom.capacity === 0
                  ? 'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                }`}>
                {selectedRoom.capacity === 0 ? 'Room Full' : `${selectedRoom.capacity} Slots Left`}
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30">
                {filteredTeams.length} Teams Shown
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-6 max-w-2xl">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by leader, member, ID, or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full
                  bg-white dark:bg-[#111111]
                  border border-gray-200 dark:border-white/[0.12]
                  text-gray-900 dark:text-white
                  text-sm placeholder-gray-400 dark:placeholder-white/30
                  rounded-xl pl-11 pr-5 py-3
                  focus:outline-none focus:border-emerald-400 dark:focus:border-neon-green/40
                  focus:ring-2 focus:ring-emerald-100 dark:focus:ring-0
                  shadow-sm dark:shadow-none
                  transition-all"
              />
            </div>
          </div>

          {/* Team grid */}
          {loading && allTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-10 h-10 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
              <p className="text-gray-400 dark:text-white/35 text-xs font-black uppercase tracking-widest animate-pulse">Loading Teams…</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <p className="text-5xl opacity-20 text-gray-500 dark:text-white">⬡</p>
              <p className="text-gray-400 dark:text-white/35 text-sm font-bold uppercase tracking-widest">No teams found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredTeams.map((team, i) => (
                <motion.div
                  key={team.team_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className="h-full"
                >
                  <TeamAssignCard
                    team={team}
                    selectedRoom={selectedRoom}
                    assigning={assigningTeamId === team.team_id}
                    onAssign={() => handleAssignRoom(team)}
                    getMemberCount={getMemberCount}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Standalone page ──────────────────────────────────────────────────────
  if (!isModal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col font-sans overflow-x-hidden">
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
                      <div className="flex items-center gap-3 bg-gray-100 dark:bg-white/[0.08] border border-gray-200 dark:border-white/[0.12] rounded-full pl-2 pr-4 py-1.5 shadow-sm dark:shadow-none">
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
  return <div className="text-gray-900 dark:text-white">{content}</div>;
};

export default RoomAllocation;