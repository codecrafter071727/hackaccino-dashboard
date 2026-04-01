import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';

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

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'participants' | 'idcards' | 'rooms'>('participants');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'issued' | 'not_issued'>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Rooms tab state
  const [selectedBlock, setSelectedBlock] = useState<'N Block' | 'P Block' | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedTeamDetail, setSelectedTeamDetail] = useState<Team | null>(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');

  // Individual member modal state
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const res = await fetch(`${baseUrl}/api/teams?limit=2000`);
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const rawData = await res.json();
      const data = Array.isArray(rawData) ? rawData : rawData.data;

      console.log('AnalyticsDashboard fetched teams:', data?.length);
      setTeams(data || []);
      
      // Update selected team if it's open in modal
      if (selectedTeam) {
        const updated = (data || []).find((t: Team) => t.team_id === selectedTeam.team_id);
        if (updated) setSelectedTeam(updated);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam]);

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
        const data = await res.json();
        throw new Error(data.error || 'Failed to update members');
      }

      const updatedTeam = await res.json();
      setTeams(prev => prev.map(t => t.team_id === teamId ? updatedTeam : t));
      setSelectedTeam(updatedTeam);
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
    fetchTeams();
    const subscription = supabase
      .channel('teams_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeams();
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
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

  const showSuccess = (msg: string) => {
    setNotification({ message: msg, type: 'success' });
    setTimeout(() => setNotification({ message: '', type: null }), 3000);
  };

  const filteredData = teams.filter(team => {
    // Safely check for null/undefined before calling toLowerCase()
    const leaderName = team.team_leader_name || '';
    const teamName = team.team_name || '';
    const email = team.registered_email || '';
    const teamIdStr = team.team_id ? team.team_id.toString() : '';

    const matchesSearch =
      leaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teamIdStr.includes(searchQuery) ||
      email.toLowerCase().includes(searchQuery.toLowerCase());

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

  // Rooms helpers
  const teamsInRoom = (roomName: string) =>
    teams.filter(t => t.allocated_room?.trim().toLowerCase() === roomName.trim().toLowerCase());

  const totalCapacity = (room: Room) =>
    room.capacity + teamsInRoom(room.room_name).length;

  const handleBlockSelect = (block: 'N Block' | 'P Block') => {
    setSelectedBlock(block);
    setSelectedRoom(null);
    setSelectedTeamDetail(null);
    setRoomSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex font-sans">
      {/* Toast Notification */}
      {notification.type && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl transition-all duration-500 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-bold">{notification.message}</span>
          <button onClick={() => setNotification({ message: '', type: null })} className="ml-2 hover:opacity-70">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">H</div>
          <span className="text-xl font-bold text-gray-800">Hackaccino</span>
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </button>

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Analytics</div>

          <button
            onClick={() => { setActiveTab('participants'); setFilter('all'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'participants' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 15.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
            </svg>
            Participants
          </button>

          <button
            onClick={() => { setActiveTab('idcards'); setFilter('all'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'idcards' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            ID Cards
          </button>

          <button
            onClick={() => { setActiveTab('rooms'); setSelectedBlock(null); setSelectedRoom(null); setSelectedTeamDetail(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'rooms' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Rooms
          </button>

          {/* Block sub-selector — shows only when Rooms tab is active */}
          {activeTab === 'rooms' && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() => handleBlockSelect('N Block')}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${selectedBlock === 'N Block' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
              >
                <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-black ${selectedBlock === 'N Block' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>N</span>
                N Block
              </button>
              <button
                onClick={() => handleBlockSelect('P Block')}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${selectedBlock === 'P Block' ? 'bg-amber-100 text-amber-700 font-semibold' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
              >
                <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-black ${selectedBlock === 'P Block' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'}`}>P</span>
                P Block
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white overflow-hidden">
              <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">Super Admin</p>
              <p className="text-xs text-gray-500 truncate">admin@hackaccino.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-8 overflow-y-auto">

        {/* ── PARTICIPANTS & IDCARDS TABS ── */}
        {(activeTab === 'participants' || activeTab === 'idcards') && (
          <>
            <header className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {activeTab === 'participants' ? 'Participant Attendance' : 'ID Card Issuance'}
                </h1>
                <p className="text-gray-500 text-sm">Real-time event management dashboard</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search leader, ID or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-72 transition-all shadow-sm"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button onClick={fetchTeams} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                  <svg className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </header>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'all' ? 'bg-gray-800 text-white shadow-lg shadow-gray-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                All Teams ({teams.length})
              </button>
              {activeTab === 'participants' ? (
                <>
                  <button onClick={() => setFilter('present')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'present' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                    Present ({teams.filter(t => t.leader_present).length})
                  </button>
                  <button onClick={() => setFilter('absent')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'absent' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                    Not Present ({teams.filter(t => !t.leader_present).length})
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setFilter('issued')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'issued' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                    Issued ({teams.filter(t => t.leader_id_issued).length})
                  </button>
                  <button onClick={() => setFilter('not_issued')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'not_issued' ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                    Pending ({teams.filter(t => !t.leader_id_issued).length})
                  </button>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Team Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Info</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32 mb-2"></div><div className="h-3 bg-gray-50 rounded w-20"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-40"></div></td>
                        <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-20"></div></td>
                        <td className="px-6 py-4 text-right"><div className="h-8 bg-gray-100 rounded-lg w-24 ml-auto"></div></td>
                      </tr>
                    ))
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-gray-400">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p>No teams found matching your search and filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((team) => (
                      <tr 
                        key={team.team_id} 
                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                        onClick={() => { setSelectedTeam(team); setShowMembersModal(true); }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800">
                              #{team.team_id} {team.team_name || team.team_leader_name}
                            </span>
                            {team.team_name && (
                              <span className="text-[10px] text-blue-500 font-medium uppercase tracking-wider">
                                Leader: {team.team_leader_name}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {Array.isArray(team.team_members) ? team.team_members.length : 0} Members
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-sm">
                            <span className="text-gray-600 truncate max-w-[200px]">{team.registered_email}</span>
                            <span className="text-gray-400 text-xs">{team.registered_phone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {activeTab === 'participants' ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${team.leader_present ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                              {team.leader_present ? 'PRESENT' : 'ABSENT'}
                            </span>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${team.leader_id_issued ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {team.leader_id_issued ? 'ISSUED' : 'PENDING'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                          >
                            {activeTab === 'participants' ? 'Manage Attendance' : 'Issue ID Cards'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── ROOMS TAB ── */}
        {activeTab === 'rooms' && (
          <div>
            {/* Header */}
            <header className="flex justify-between items-center mb-8">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  {(selectedRoom || selectedTeamDetail) && (
                    <button
                      onClick={() => {
                        if (selectedTeamDetail) { setSelectedTeamDetail(null); return; }
                        setSelectedRoom(null);
                      }}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                  )}
                  <h1 className="text-2xl font-bold text-gray-800">
                    {selectedTeamDetail
                      ? `Team #${selectedTeamDetail.team_id} — ${selectedTeamDetail.team_leader_name}`
                      : selectedRoom
                        ? `${selectedRoom.room_name}`
                        : selectedBlock
                          ? `${selectedBlock} Rooms`
                          : 'Room Overview'}
                  </h1>
                </div>
                <p className="text-gray-500 text-sm">
                  {selectedTeamDetail
                    ? `Room: ${selectedTeamDetail.allocated_room} · ${selectedBlock}`
                    : selectedRoom
                      ? `${teamsInRoom(selectedRoom.room_name).length} teams allocated · ${selectedRoom.capacity} slots remaining`
                      : selectedBlock
                        ? 'Click a room to see allocated teams'
                        : 'Select a block from the sidebar to explore rooms'}
                </p>
              </div>
              {selectedBlock && !selectedRoom && (
                <button
                  onClick={() => fetchRooms(selectedBlock)}
                  className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <svg className={`w-5 h-5 text-gray-500 ${roomsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </header>

            {/* No block selected */}
            {!selectedBlock && (
              <div className="flex flex-col items-center justify-center h-72 text-gray-400">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-lg font-medium">Select a block from the sidebar</p>
                <p className="text-sm mt-1">Choose N Block or P Block to explore rooms</p>
              </div>
            )}

            {/* Room list */}
            {selectedBlock && !selectedRoom && !selectedTeamDetail && (
              <>
                {/* Summary bar */}
                <div className="flex gap-4 mb-6">
                  <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Total Rooms</p>
                      <p className="text-xl font-bold text-gray-800">{rooms.length}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Teams Allocated</p>
                      <p className="text-xl font-bold text-gray-800">
                        {rooms.reduce((acc, r) => acc + teamsInRoom(r.room_name).length, 0)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Slots Available</p>
                      <p className="text-xl font-bold text-gray-800">
                        {rooms.reduce((acc, r) => acc + (r.capacity || 0), 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {roomsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {Array(8).fill(0).map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl p-6 animate-pulse shadow-sm border border-gray-100">
                        <div className="h-4 bg-gray-100 rounded w-24 mb-3"></div>
                        <div className="h-8 bg-gray-100 rounded w-16 mb-4"></div>
                        <div className="h-3 bg-gray-50 rounded w-32 mb-2"></div>
                        <div className="h-2 bg-gray-100 rounded-full mt-3"></div>
                      </div>
                    ))}
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                    </svg>
                    <p className="font-medium">No rooms found in {selectedBlock}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {rooms.map((room) => {
                      const allocated = teamsInRoom(room.room_name).length;
                      const total = totalCapacity(room);
                      const fillPct = total > 0 ? Math.round((allocated / total) * 100) : 0;
                      const isFull = room.capacity === 0;
                      return (
                        <div
                          key={room.id}
                          onClick={() => { setSelectedRoom(room); setRoomSearchQuery(''); }}
                          className={`bg-white rounded-2xl p-6 shadow-sm border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group ${isFull ? 'border-red-100' : 'border-gray-100 hover:border-blue-200'}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isFull ? 'bg-red-50' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                              <svg className={`w-5 h-5 ${isFull ? 'text-red-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${isFull ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                              {isFull ? 'Full' : `${room.capacity} left`}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-gray-800 mb-0.5 group-hover:text-blue-600 transition-colors">{room.room_name}</h3>
                          <p className="text-xs text-gray-400 mb-4">{allocated} team{allocated !== 1 ? 's' : ''} allocated · {total} total slots</p>

                          {/* Capacity bar */}
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${fillPct >= 100 ? 'bg-red-400' : fillPct >= 75 ? 'bg-amber-400' : 'bg-green-400'}`}
                              style={{ width: `${Math.min(fillPct, 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1.5">{fillPct}% occupied</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Teams in selected room */}
            {selectedRoom && !selectedTeamDetail && (
              <div>
                {/* Room capacity card */}
                <div className={`rounded-2xl p-5 mb-6 border flex items-center justify-between ${selectedRoom.capacity === 0 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Room Capacity</p>
                    <div className="flex items-end gap-2 mt-1">
                      <span className="text-3xl font-black text-gray-800">{teamsInRoom(selectedRoom.room_name).length}</span>
                      <span className="text-gray-400 text-sm mb-1">/ {totalCapacity(selectedRoom)} teams</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-black ${selectedRoom.capacity === 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {selectedRoom.capacity}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">slots remaining</p>
                  </div>
                </div>

                {/* Room Search Bar */}
                <div className="relative mb-6">
                  <input
                    type="text"
                    placeholder="Search teams by leader, name, ID, or email..."
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all shadow-sm"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {(() => {
                  const filteredRoomTeams = teamsInRoom(selectedRoom.room_name).filter(team => {
                    const q = roomSearchQuery.toLowerCase();
                    const leaderName = team.team_leader_name || '';
                    const email = team.registered_email || '';
                    const teamIdStr = team.team_id ? team.team_id.toString() : '';
                    const teamName = team.team_name || '';
                    return leaderName.toLowerCase().includes(q) ||
                           email.toLowerCase().includes(q) ||
                           teamIdStr.includes(q) ||
                           teamName.toLowerCase().includes(q);
                  });

                  return filteredRoomTeams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                      <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="font-medium">
                        {teamsInRoom(selectedRoom.room_name).length === 0 
                          ? "No teams allocated to this room yet" 
                          : "No teams found matching your search"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredRoomTeams.map((team) => (
                        <div
                          key={team.team_id}
                          onClick={() => setSelectedTeamDetail(team)}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 transition-all cursor-pointer group p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <span className="text-xs font-mono text-gray-400">#{team.team_id}</span>
                              {team.team_name && <p className="text-xs text-blue-500 font-medium">{team.team_name}</p>}
                              <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{team.team_leader_name}</h3>
                            </div>
                            <div className="flex gap-1.5">
                              {team.leader_present && (
                                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100">P</span>
                              )}
                              {team.leader_id_issued && (
                                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">ID</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857" />
                            </svg>
                            {Array.isArray(team.team_members) ? team.team_members.length : 0} members
                            <span className="ml-auto text-[10px] text-blue-500 font-semibold group-hover:underline">View details →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Team detail view */}
            {selectedTeamDetail && (
              <div className="max-w-2xl">
                {/* Info cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <p className="text-xs text-gray-400 font-medium mb-1">Room</p>
                    <p className="font-bold text-gray-800">{selectedTeamDetail.allocated_room}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <p className="text-xs text-gray-400 font-medium mb-1">Attendance</p>
                    <span className={`text-sm font-bold ${selectedTeamDetail.leader_present ? 'text-green-600' : 'text-red-500'}`}>
                      {selectedTeamDetail.leader_present ? '✓ Present' : '✗ Absent'}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <p className="text-xs text-gray-400 font-medium mb-1">ID Card</p>
                    <span className={`text-sm font-bold ${selectedTeamDetail.leader_id_issued ? 'text-blue-600' : 'text-amber-500'}`}>
                      {selectedTeamDetail.leader_id_issued ? '✓ Issued' : '⏳ Pending'}
                    </span>
                  </div>
                </div>

                <div className="mb-4 text-sm text-gray-500">
                  <span className="font-semibold text-gray-700">{selectedTeamDetail.registered_email}</span> · {selectedTeamDetail.registered_phone}
                </div>

                {/* Members table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Team Members</h3>
                    <span className="text-xs text-gray-400 font-medium">
                      {Array.isArray(selectedTeamDetail.team_members) ? selectedTeamDetail.team_members.length : 0} total
                    </span>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/60 border-b border-gray-100">
                        <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Present</th>
                        <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">ID Issued</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Array.isArray(selectedTeamDetail.team_members) && selectedTeamDetail.team_members.map((member: TeamMember, i: number) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${member.role === 'Leader' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                              {member.role || 'Member'}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-800 text-sm">{member.name}</p>
                            {member.email && <p className="text-xs text-gray-400">{member.email}</p>}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${member.is_present ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              {member.is_present ? '✓' : '–'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${member.id_card_issued ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                              {member.id_card_issued ? '✓' : '–'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Members Modal */}
      {showMembersModal && selectedTeam && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMembersModal(false)}></div>
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
                  onClick={() => setShowMembersModal(false)}
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
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            member.is_present 
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
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            member.id_card_issued 
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
