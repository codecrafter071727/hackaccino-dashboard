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
    <div className="min-h-screen bg-college-bg flex flex-col font-sans relative">
      {/* Navbar */}
      <nav className="bg-college-primary text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-2xl font-bold tracking-wider">HACKACCINO</span>
            <span className="text-sm bg-college-secondary text-college-primary px-2 py-1 rounded font-semibold">DASHBOARD</span>
          </div>
          <div className="flex items-center space-x-4">
            {loggedInUser && (
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
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-6 py-8">
        
        {/* Dynamic Header */}
        <div className="mb-8 flex items-center justify-between sticky top-24 z-40 bg-college-bg/95 backdrop-blur py-4 -mx-6 px-6 border-b border-gray-200/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all text-gray-500 hover:text-college-primary border border-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {selectedRoom ? (
                    <span className="flex items-center gap-2">
                        Assigning to <span className="text-college-primary">{selectedRoom.room_name}</span>
                    </span>
                ) : selectedBlock ? (
                    `${selectedBlock} Rooms`
                ) : (
                    'Room Allocation'
                )}
              </h1>
              <p className="text-gray-500 mt-1">
                {selectedRoom ? `Capacity: ${selectedRoom.capacity} Teams` : 
                 selectedBlock ? 'Click on a room to view and assign teams' : 
                 'Select a block to view allocated rooms'}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mb-6">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* View 1: Block Selection */}
        {!selectedBlock && !selectedRoom && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-10">
            {/* N Block Card */}
            <div 
              onClick={() => setSelectedBlock('N Block')}
              className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group border-t-4 border-college-primary h-64 flex flex-col justify-center items-center text-center p-8"
            >
              <div className="bg-blue-100 p-4 rounded-full group-hover:bg-college-primary group-hover:text-white transition-colors duration-300 mb-6">
                <span className="text-4xl font-bold text-college-primary group-hover:text-white">N</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-college-primary transition-colors">N Block</h2>
              <p className="text-gray-500">View allocated rooms in N Block</p>
            </div>

            {/* P Block Card */}
            <div 
              onClick={() => setSelectedBlock('P Block')}
              className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group border-t-4 border-college-secondary h-64 flex flex-col justify-center items-center text-center p-8"
            >
              <div className="bg-amber-100 p-4 rounded-full group-hover:bg-college-secondary group-hover:text-white transition-colors duration-300 mb-6">
                <span className="text-4xl font-bold text-college-secondary group-hover:text-white">P</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-college-secondary transition-colors">P Block</h2>
              <p className="text-gray-500">View allocated rooms in P Block</p>
            </div>
          </div>
        )}

        {/* View 2: Room List */}
        {selectedBlock && !selectedRoom && (
          <div>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-college-primary"></div>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center text-gray-400 mt-20 bg-white p-12 rounded-2xl shadow-lg max-w-2xl mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-xl font-medium text-gray-600">No rooms found in {selectedBlock}</p>
                <p className="text-gray-400 mt-2">Contact Superadmin to add rooms.</p>
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
                    className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all border border-gray-100 hover:border-college-primary group relative overflow-hidden cursor-pointer"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-gray-200 group-hover:bg-college-primary transition-colors"></div>
                    <div className="flex justify-between items-start mb-4 pl-2">
                      <div className="p-2 bg-blue-50 rounded-lg text-college-primary group-hover:bg-college-primary group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        ID: {room.id}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1 pl-2 group-hover:text-college-primary transition-colors">{room.room_name}</h3>
                    <div className="flex items-center text-gray-500 text-sm mt-4 pl-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <div className="flex flex-col">
                        <span>Capacity: <span className="text-gray-900 font-bold">{room.capacity} Teams</span></span>
                        {occupancyCounts[room.room_name] !== undefined && (
                          <span className={`text-xs font-bold mt-1 ${
                            (room.capacity - occupancyCounts[room.room_name]) > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            Available: {Math.max(0, room.capacity - occupancyCounts[room.room_name])} Teams
                          </span>
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
          <div className="animate-fade-in">
             {/* Search Bar */}
             <div className="mb-8 relative max-w-2xl mx-auto">
                <input
                  type="text"
                  placeholder="Search by Team Leader, Member Name, ID, or Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-300 focus:border-college-primary focus:ring-4 focus:ring-college-primary/10 outline-none transition-all shadow-md text-lg"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 absolute left-4 top-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {loading && allTeams.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-college-primary mb-4"></div>
                    <p className="text-gray-500">Loading teams...</p>
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                    <div className="bg-gray-50 inline-block p-4 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-700">No teams found</h3>
                    <p className="text-gray-500">Try adjusting your search query</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeams.map(team => (
                        <div 
                            key={team.team_id}
                            className={`bg-white rounded-xl shadow-md overflow-hidden border transition-all duration-300 ${
                                team.allocated_room === selectedRoom.room_name 
                                ? 'border-green-500 ring-2 ring-green-500/20' 
                                : 'border-gray-100 hover:border-college-primary hover:shadow-xl'
                            }`}
                        >
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">#{team.team_id}</span>
                                            {team.allocated_room && (
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                                    team.allocated_room === selectedRoom.room_name 
                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                    : 'bg-purple-100 text-purple-700 border-purple-200'
                                                }`}>
                                                    {team.allocated_room === selectedRoom.room_name ? 'ASSIGNED HERE' : team.allocated_room}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-lg leading-tight">{team.team_leader_name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xs text-gray-400 font-semibold uppercase tracking-wider">Members</span>
                                        <span className="text-lg font-bold text-gray-700">{getMemberCount(team.team_members)}</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mb-5">
                                    <div className="flex items-center text-sm text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="truncate">{team.registered_email}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <span>{team.registered_phone}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleAssignRoom(team)}
                                    disabled={assigningTeamId === team.team_id || team.allocated_room === selectedRoom.room_name}
                                    className={`w-full py-2.5 rounded-lg font-bold transition-all transform active:scale-95 ${
                                        team.allocated_room === selectedRoom.room_name
                                        ? 'bg-green-50 text-green-600 cursor-default border border-green-200'
                                        : assigningTeamId === team.team_id
                                        ? 'bg-gray-100 text-gray-400 cursor-wait'
                                        : 'bg-college-primary text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                                    }`}
                                >
                                    {assigningTeamId === team.team_id ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                                            Assigning...
                                        </span>
                                    ) : team.allocated_room === selectedRoom.room_name ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Assigned
                                        </span>
                                    ) : (
                                        'Assign Room'
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
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-gray-500 text-sm mt-auto">
        <p>&copy; 2024 Hackaccino College System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default RoomAllocation;