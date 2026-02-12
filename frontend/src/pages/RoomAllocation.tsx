import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { supabase } from '../supabaseClient';

interface Team {
  team_id: number;
  team_leader_name: string;
  team_members: any; // Can be array of strings or objects
  registered_email: string;
  registered_phone: string;
  leader_present: boolean;
  leader_id_issued: boolean;
  allocated_room?: string;
}

const RoomAllocation = () => {
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  
  // Assignment State (Full Page View)
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [occupancyCounts, setOccupancyCounts] = useState<Record<string, number>>({});
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningTeamId, setAssigningTeamId] = useState<number | null>(null);

  const navigate = useNavigate();

  // Fetch initial occupancy counts
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
        if (room) {
          counts[room] = (counts[room] || 0) + 1;
        }
      });
      setOccupancyCounts(counts);
    } catch (err) {
      console.error('Error fetching occupancy:', err);
    }
  };

  // Protect the route and load user
  useEffect(() => {
    fetchOccupancy(); // Load occupancy on mount
    const storedUser = localStorage.getItem('staffUser');
    if (!storedUser) {
      alert('Access Denied: You must be logged in to view this page.');
      navigate('/');
      return;
    }
    
    try {
      const user = JSON.parse(storedUser);
      setLoggedInUser(user);
      if (user.duty !== 'Room Allocation') {
        alert('Access Denied: Your assigned duty does not permit access to this page.');
        navigate('/');
      }
    } catch (e) {
      localStorage.removeItem('staffUser');
      navigate('/');
    }
  }, [navigate]);

  // Real-time subscription for team updates
  useEffect(() => {
    const subscription = supabase
      .channel('room_allocation_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
        },
        (payload) => {
          const updatedTeam = payload.new as Team;
          
          // Update allTeams list if it's loaded
          setAllTeams((prevTeams) => 
            prevTeams.map((t) => 
              t.team_id === updatedTeam.team_id ? { ...t, ...updatedTeam } : t
            )
          );
          
          // Refresh occupancy counts
          fetchOccupancy();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Fetch rooms when block is selected
  useEffect(() => {
    if (selectedBlock) {
      fetchRooms(selectedBlock);
    }
  }, [selectedBlock]);

  // Fetch all teams when entering assignment view (selectedRoom is set)
  useEffect(() => {
    if (selectedRoom) {
      fetchAllTeams();
    }
  }, [selectedRoom]);

  // Filter teams when search query changes
  useEffect(() => {
    if (!allTeams.length) return;

    if (!searchQuery.trim()) {
      setFilteredTeams(allTeams);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = allTeams.filter(team => {
      // Search by ID
      if (team.team_id?.toString().includes(lowerQuery)) return true;
      // Search by Leader Name
      if (team.team_leader_name?.toLowerCase().includes(lowerQuery)) return true;
      // Search by Email
      if (team.registered_email?.toLowerCase().includes(lowerQuery)) return true;
      // Search by Members
      if (Array.isArray(team.team_members)) {
        return team.team_members.some((m: any) => {
          if (!m) return false;
          const name = typeof m === 'string' ? m : m.name;
          return name?.toLowerCase().includes(lowerQuery);
        });
      }
      return false;
    });
    setFilteredTeams(filtered);
  }, [searchQuery, allTeams]);

  const fetchRooms = async (block: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/rooms?block=${encodeURIComponent(block)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      setError('Failed to load rooms. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTeams = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams`);
      if (response.ok) {
        const data = await response.json();
        setAllTeams(data);
        setFilteredTeams(data);
      } else {
        setError('Failed to load teams.');
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRoom = async (team: Team) => {
    if (!selectedRoom) return;
    
    // Confirm if team is already assigned
    if (team.allocated_room) {
        if (!window.confirm(`This team is already assigned to ${team.allocated_room}. Do you want to move them to ${selectedRoom.room_name}?`)) {
            return;
        }
    }

    setAssigningTeamId(team.team_id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${team.team_id}/assign-room`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ room_name: selectedRoom.room_name }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign room');
      }

      // Update local state
      const updatedTeams = allTeams.map(t => 
        t.team_id === team.team_id ? { ...t, allocated_room: selectedRoom.room_name } : t
      );
      setAllTeams(updatedTeams);
      // filteredTeams will update automatically due to dependency on allTeams if we strictly depended on it, 
      // but here we are setting state separately. To be safe/clean, let's trigger a re-filter or just update filtered too.
      // Actually, my useEffect dependency is [searchQuery, allTeams], so updating allTeams will trigger the filter effect!
      
      alert(`Successfully assigned Team ${team.team_id} to ${selectedRoom.room_name}`);
    } catch (err) {
      alert('Failed to assign room. Please try again.');
      console.error(err);
    } finally {
      setAssigningTeamId(null);
    }
  };

  const handleBack = () => {
    if (selectedRoom) {
      setSelectedRoom(null);
      setSearchQuery('');
      setAllTeams([]);
      setFilteredTeams([]);
    } else if (selectedBlock) {
      setSelectedBlock(null);
      setRooms([]);
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staffUser');
    navigate('/');
  };

  const getMemberCount = (members: any) => {
    if (Array.isArray(members)) return members.length;
    return 0;
  };

  return (
    <div className="min-h-screen bg-[#0B0C15] flex flex-col font-sans relative text-gray-200 overflow-x-hidden selection:bg-purple-500 selection:text-white">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-[20%] right-[30%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_10px_3px_rgba(255,255,255,0.3)]"></div>
      </div>

      {/* Navbar - Premium Glass */}
      <nav className="sticky top-0 z-50 bg-[#0F111A]/80 backdrop-blur-xl border-b border-white/5 shadow-lg transition-all duration-300">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center max-w-7xl">
          <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => navigate('/')}>
             {/* Logo Icon */}
             <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-[#0F111A] border border-white/10 text-white p-2 rounded-lg group-hover:scale-105 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
             </div>
             <div className="flex flex-col">
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tighter">HACKACCINO</span>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">Logistics Portal</span>
             </div>
          </div>
          <div className="flex items-center space-x-4">
            {loggedInUser && (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium hidden md:inline-block text-gray-300">
                  {loggedInUser.email} <span className="text-xs opacity-75 text-blue-400">({loggedInUser.duty})</span>
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 px-3 py-1.5 rounded-md transition-all font-bold tracking-wide uppercase"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-6 py-8 relative z-10 max-w-7xl">
        
        {/* Dynamic Header */}
        <div className="mb-8 flex items-center justify-between sticky top-24 z-40 bg-[#0B0C15]/90 backdrop-blur-md py-4 -mx-6 px-6 border-b border-white/5 transition-all animate-fade-in">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="p-2.5 bg-[#161822] rounded-full shadow-lg border border-white/10 hover:border-blue-500/50 text-gray-400 hover:text-white transition-all transform hover:scale-110"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                {selectedRoom ? (
                    <span className="flex items-center gap-2">
                        Assigning to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{selectedRoom.room_name}</span>
                    </span>
                ) : selectedBlock ? (
                    `${selectedBlock} Rooms`
                ) : (
                    'Room Allocation'
                )}
              </h1>
              <p className="text-gray-500 mt-1 text-sm font-medium flex items-center gap-2">
                <span className="w-6 h-[2px] bg-blue-500 rounded-full"></span>
                {selectedRoom ? `Capacity: ${selectedRoom.capacity} Teams` : 
                 selectedBlock ? 'Click on a room to view and assign teams' : 
                 'Select a block to view allocated rooms'}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 text-red-200 p-4 rounded-xl shadow-lg mb-6 backdrop-blur-md">
            <p className="font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Error Occurred
            </p>
            <p className="opacity-80">{error}</p>
          </div>
        )}

        {/* View 1: Block Selection */}
        {!selectedBlock && !selectedRoom && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12 animate-fade-in-up">
            {/* N Block Card */}
            <div 
              onClick={() => setSelectedBlock('N Block')}
              className="group relative bg-[#161822]/60 backdrop-blur-md rounded-3xl border border-white/5 hover:border-blue-500/40 shadow-2xl overflow-hidden hover:-translate-y-2 transition-all duration-300 cursor-pointer h-72 flex flex-col justify-center items-center text-center p-8"
            >
              {/* Radial Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-600/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/30 text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/10">
                <span className="text-5xl font-black group-hover:text-white transition-colors">N</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">N Block</h2>
              <p className="text-gray-500 group-hover:text-gray-300 transition-colors">View allocated rooms in N Block</p>
            </div>

            {/* P Block Card */}
            <div 
              onClick={() => setSelectedBlock('P Block')}
              className="group relative bg-[#161822]/60 backdrop-blur-md rounded-3xl border border-white/5 hover:border-purple-500/40 shadow-2xl overflow-hidden hover:-translate-y-2 transition-all duration-300 cursor-pointer h-72 flex flex-col justify-center items-center text-center p-8"
            >
              {/* Radial Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-600/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/10">
                <span className="text-5xl font-black group-hover:text-white transition-colors">P</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">P Block</h2>
              <p className="text-gray-500 group-hover:text-gray-300 transition-colors">View allocated rooms in P Block</p>
            </div>
          </div>
        )}

        {/* View 2: Room List */}
        {selectedBlock && !selectedRoom && (
          <div className="animate-fade-in">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-64">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-gray-400 animate-pulse">Loading Rooms...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center mt-20 bg-[#161822]/60 backdrop-blur-md p-12 rounded-3xl shadow-xl border border-white/5 max-w-2xl mx-auto">
                <div className="bg-white/5 p-4 rounded-full inline-block mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <p className="text-xl font-bold text-white mb-2">No rooms found in {selectedBlock}</p>
                <p className="text-gray-500">Contact Superadmin to add rooms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {rooms.map((room) => (
                  <div 
                    key={room.id}
                    onClick={() => {
                        setSelectedRoom(room);
                        setSearchQuery('');
                        setAllTeams([]);
                        setFilteredTeams([]);
                    }}
                    className="group relative bg-[#161822]/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/5 hover:border-blue-500/50 cursor-pointer overflow-hidden hover:-translate-y-1"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4 pl-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:text-white group-hover:bg-blue-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-gray-500 border border-white/10 px-2 py-1 rounded bg-[#0B0C15]">
                            ID: {room.id}
                        </span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1 pl-3 group-hover:text-blue-400 transition-colors">{room.room_name}</h3>
                        
                        <div className="flex flex-col gap-2 mt-4 pl-3 pt-3 border-t border-white/5">
                            <div className="flex items-center justify-between text-sm text-gray-400">
                                <span>Capacity:</span>
                                <span className="text-white font-bold">{room.capacity} Teams</span>
                            </div>
                            
                            {occupancyCounts[room.room_name] !== undefined && (
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-xs font-bold uppercase text-gray-500">Status</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                    (room.capacity - occupancyCounts[room.room_name]) > 0 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                    {(room.capacity - occupancyCounts[room.room_name]) > 0 
                                        ? `${Math.max(0, room.capacity - occupancyCounts[room.room_name])} Available` 
                                        : 'Full'}
                                </span>
                            </div>
                            )}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View 3: Full Page Team Assignment */}
        {selectedRoom && (
          <div className="animate-fade-in pb-20">
             {/* Search Bar */}
             <div className="mb-10 relative max-w-2xl mx-auto group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative">
                    <input
                    type="text"
                    placeholder="Search by Team Leader, Member Name, ID, or Email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-[#161822] text-white rounded-xl border border-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-xl text-lg placeholder-gray-600"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 absolute left-4 top-4.5 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
              </div>

              {loading && allTeams.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-64">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-400 font-medium">Loading teams...</p>
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="text-center py-20 bg-[#161822]/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/5">
                    <div className="bg-white/5 inline-block p-4 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No teams found</h3>
                    <p className="text-gray-500">Try adjusting your search query</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map(team => (
                        <div 
                            key={team.team_id}
                            className={`group relative bg-[#161822]/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                                team.allocated_room === selectedRoom.room_name 
                                ? 'border-green-500/50 ring-1 ring-green-500/20' 
                                : 'border-white/5 hover:border-blue-500/40'
                            }`}
                        >
                            {/* Top Gradient Border */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${team.allocated_room === selectedRoom.room_name ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-600 opacity-50 group-hover:opacity-100'} transition-opacity`}></div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-bold bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">#{team.team_id}</span>
                                            {team.allocated_room && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1 ${
                                                    team.allocated_room === selectedRoom.room_name 
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                                    : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                                }`}>
                                                    {team.allocated_room === selectedRoom.room_name ? (
                                                        <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> ASSIGNED HERE</>
                                                    ) : team.allocated_room}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-white text-lg leading-tight group-hover:text-blue-400 transition-colors">{team.team_leader_name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Members</span>
                                        <span className="text-xl font-black text-white">{getMemberCount(team.team_members)}</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-3 mb-6 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                                    <div className="flex items-center text-sm text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="truncate">{team.registered_email}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <span>{team.registered_phone}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleAssignRoom(team)}
                                    disabled={assigningTeamId === team.team_id || team.allocated_room === selectedRoom.room_name}
                                    className={`relative w-full py-3 rounded-xl font-bold transition-all transform active:scale-95 overflow-hidden ${
                                        team.allocated_room === selectedRoom.room_name
                                        ? 'bg-green-500/10 text-green-400 cursor-default border border-green-500/20'
                                        : assigningTeamId === team.team_id
                                        ? 'bg-gray-700 text-gray-400 cursor-wait'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25 group/btn'
                                    }`}
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {assigningTeamId === team.team_id ? (
                                            <>
                                            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                                            Assigning...
                                            </>
                                        ) : team.allocated_room === selectedRoom.room_name ? (
                                            <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Assigned
                                            </>
                                        ) : (
                                            'Assign Room'
                                        )}
                                    </span>
                                    {/* Button Shine Effect */}
                                    {team.allocated_room !== selectedRoom.room_name && assigningTeamId !== team.team_id && (
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
              )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-white/5 bg-[#0F111A]/80 backdrop-blur-md py-8 text-center text-xs text-gray-500">
        <p className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Built for Hackaccino 2025 Hackathon. <span className="text-gray-600">All rights reserved.</span>
        </p>
      </footer>
    </div>
  );
};

export default RoomAllocation;