import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';
import { io, Socket } from 'socket.io-client';

interface TeamMember {
  name: string;
  email?: string;
  role: 'Leader' | 'Member';
  is_present: boolean;
  id_card_issued: boolean;
}

interface Team {
  team_id: string;
  team_name?: string;
  team_leader_name: string;
  team_members: TeamMember[];
  registered_email: string;
  registered_phone: string;
  allocated_room?: string;
  team_status?: string;
  current_phase?: string;
  invite_status?: string;
  mentors_assigned?: string;
}

type DbTeam = Omit<Team, 'team_members'> & { team_members?: unknown };
type TeamsRealtimePayload = {
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: DbTeam;
  old?: DbTeam;
};

const StudentRegistration: React.FC<{ isModal?: boolean }> = ({ isModal }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Unified members state for the modal/table view
  const [editMembers, setEditMembers] = useState<TeamMember[]>([]);
  
  const [updating, setUpdating] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const updatingRef = useRef(false);
  const selectedTeamRef = useRef<Team | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    updatingRef.current = updating;
  }, [updating]);

  useEffect(() => {
    selectedTeamRef.current = selectedTeam;
  }, [selectedTeam]);

  // Socket.io initialization and listeners
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      withCredentials: true,
      path: '/socket.io'
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Registration WebSocket server');
    });

    socket.on('connect_error', (error) => {
      console.error('Registration socket connect_error:', error);
    });

    socket.on('teamUpdate', (updatedTeam: Team) => {
      console.log('Live team update received in registration:', updatedTeam);
      setTeams(prev => 
        prev.map(t => t.team_id?.toString() === updatedTeam.team_id?.toString() ? { ...t, ...updatedTeam } : t)
      );
      
      if (selectedTeamRef.current && selectedTeamRef.current.team_id?.toString() === updatedTeam.team_id?.toString()) {
        setSelectedTeam(prev => prev ? { ...prev, ...updatedTeam } : prev);
        if (!updatingRef.current) {
          setEditMembers(updatedTeam.team_members);
        }
      }
    });

    socket.on('roomUpdate', (data: { team: Team }) => {
        const { team: updatedTeam } = data;
        setTeams(prev => 
            prev.map(t => t.team_id?.toString() === updatedTeam.team_id?.toString() ? { ...t, ...updatedTeam } : t)
        );
        if (selectedTeamRef.current && selectedTeamRef.current.team_id?.toString() === updatedTeam.team_id?.toString()) {
          setSelectedTeam(prev => prev ? { ...prev, ...updatedTeam } : prev);
          if (!updatingRef.current) {
            setEditMembers(updatedTeam.team_members);
          }
        }
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Protect the route
  useEffect(() => {
    const storedUser = localStorage.getItem('staffUser');
    if (!storedUser) {
      if (!isModal) {
        alert('Access Denied: You must be logged in to view this page.');
        navigate('/');
      }
      return;
    }
    
    try {
      const user = JSON.parse(storedUser);
      const userDuties = user.duties || [user.duty];
      if (!userDuties.includes('Registration') && !isModal) {
        alert('Access Denied: Your assigned duties do not permit access to this page.');
        navigate('/');
      }
    } catch {
      localStorage.removeItem('staffUser');
      if (!isModal) navigate('/');
    }
  }, [navigate, isModal]);

  const fetchTeams = async (query: string = '') => {
    setLoading(true);
    try {
      // Ensure no double slashes in URL
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const url = query 
        ? `${baseUrl}/api/teams?query=${encodeURIComponent(query)}&limit=100`
        : `${baseUrl}/api/teams?limit=100`;
      
      const response = await fetch(url);
      
      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }
      
      if (result && Array.isArray(result.data)) {
        setTeams(result.data);
      } else if (Array.isArray(result)) {
        // Fallback for old API format if needed
        setTeams(result);
      } else {
        setTeams([]);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error fetching teams:', error);
      alert(`Error fetching teams: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    const subscription = supabase
      .channel('teams_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        (payload) => {
          const p = payload as unknown as TeamsRealtimePayload;
          const eventType = p.eventType;
          const nextTeamRaw = p.new;
          const oldTeamRaw = p.old;
          const keyId = (nextTeamRaw?.team_id ?? oldTeamRaw?.team_id)?.toString();

          if (!keyId) return;

          const nextTeam: Team | undefined = nextTeamRaw
            ? ({
                ...nextTeamRaw,
                team_id: nextTeamRaw.team_id?.toString(),
                team_members: Array.isArray(nextTeamRaw.team_members) ? (nextTeamRaw.team_members as TeamMember[]) : []
              } as Team)
            : undefined;

          setTeams((prevTeams) => {
            if (!prevTeams || prevTeams.length === 0) return prevTeams;

            if (eventType === 'DELETE') {
              return prevTeams.filter(t => t.team_id?.toString() !== keyId);
            }

            const has = prevTeams.some(t => t.team_id?.toString() === keyId);
            if (has && nextTeam) {
              return prevTeams.map(t => t.team_id?.toString() === keyId ? { ...t, ...nextTeam } : t);
            }

            if (!has && nextTeam) {
              return [nextTeam, ...prevTeams];
            }

            return prevTeams;
          });

          setSelectedTeam((prevSelected) => {
            if (prevSelected && prevSelected.team_id?.toString() === keyId) {
               if (eventType === 'DELETE') return null;
               if (nextTeam) return { ...prevSelected, ...nextTeam };
            }
            return prevSelected;
          });

          if (
            selectedTeamRef.current &&
            selectedTeamRef.current.team_id?.toString() === keyId &&
            !updatingRef.current &&
            nextTeam
          ) {
            setEditMembers(nextTeam.team_members);
          }
        }
      )
      .subscribe((status) => {
        console.log('Registration teams realtime status:', status);
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeams(searchQuery);
  };

  const handleCardClick = (team: Team) => {
    setSelectedTeam(team);
    
    // Use unified team_members array from DB
    const members = team.team_members || [];
    setEditMembers(members);
  };

  const handleMemberChange = (index: number, field: 'is_present' | 'id_card_issued', value: boolean) => {
    const updatedMembers = [...editMembers];
    updatedMembers[index] = { ...updatedMembers[index], [field]: value };
    setEditMembers(updatedMembers);
  };

  const handleUpdate = async () => {
    if (!selectedTeam) return;

    setUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${selectedTeam.team_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_members: editMembers,
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
        // Update local state
        setTeams(teams.map(t => t.team_id === data.team_id ? data : t));
        setSelectedTeam(null); // Close modal
        alert('Team updated successfully!');
      } else {
        console.error('Update failed:', data);
        
        // Detailed error handling for users
        if (data.error && data.error.includes('does not exist')) {
          alert(`Database Error: The database schema is outdated.\n\nPlease run the SQL script provided in 'backend/schema.sql' to add the missing columns (leader_present, etc.).\n\nTechnical Error: ${data.error}`);
        } else {
          alert(`Failed to update team: ${data.error || response.statusText}`);
        }
      }
    } catch (error: any) {
      console.error('Error updating team:', error);
      alert(`Error updating team: ${error.message || 'Network error'}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    // Brute force clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Force immediate redirect to origin
      window.location.href = window.location.origin;
    }
  };

  return (
    <div className={`min-h-screen ${isModal ? 'bg-transparent' : 'bg-college-bg'} font-sans flex flex-col`}>
      {/* Navbar - Hide if in modal */}
      {!isModal && (
        <nav className="bg-college-primary text-white shadow-lg">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
              <span className="text-2xl font-bold tracking-wider">HACKACCINO</span>
              <span className="text-sm bg-college-secondary text-college-primary px-2 py-1 rounded font-semibold">REGISTRATION</span>
            </div>
            <div className="flex items-center space-x-4">
               <button 
                onClick={() => navigate('/judges-portal')}
                className="text-sm bg-college-secondary hover:bg-college-secondary/80 text-college-primary px-4 py-2 rounded-lg transition-colors font-bold shadow-sm hidden md:block"
              >
                Judges Portal
              </button>
               <button 
                onClick={() => navigate('/admin/login')}
                className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/20 hidden md:block"
              >
                Superadmin
              </button>
              <button 
                onClick={() => navigate('/')}
                className="text-sm hover:text-college-secondary transition-colors"
              >
                Back to Dashboard
              </button>
              <button 
                onClick={handleLogout}
                className="text-sm bg-red-500/20 hover:bg-red-500/40 text-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-500/30"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}

      <div className={`container mx-auto p-8 flex-grow ${isModal ? 'text-white' : ''}`}>
        {!isModal && (
          <h1 className={`text-3xl font-bold ${isModal ? 'text-white' : 'text-college-text'} mb-8 border-b-4 border-college-secondary inline-block pb-2`}>
            Student Registration
          </h1>
        )}

        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-4 max-w-2xl">
            <input
              type="text"
              placeholder="Search by Team Name, Leader, or Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 p-3 border-2 rounded-lg focus:outline-none focus:border-college-primary shadow-sm ${isModal ? 'bg-white/5 border-white/10 text-white placeholder-white/30' : 'border-gray-300'}`}
            />
            <button
              type="submit"
              className="bg-college-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-college-secondary transition shadow-md"
            >
              Search
            </button>
          </form>
        </div>

        {/* Team Grid */}
        {loading ? (
          <div className="text-center text-xl text-gray-500 mt-10">Loading teams...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div 
                key={team.team_id} 
                onClick={() => handleCardClick(team)}
                className={`${isModal ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'} rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden cursor-pointer border group`}
              >
                <div className="bg-college-primary p-4 flex justify-between items-center">
                  <span className="text-white font-bold text-lg truncate pr-2 max-w-[200px]" title={team.team_name || 'Unnamed Team'}>
                    {team.team_name || 'Unnamed Team'}
                  </span>
                  <div className="flex gap-2 items-center">
                    {team.allocated_room && (
                      <span className="bg-purple-500/30 text-white text-[10px] px-2 py-1 rounded-md font-bold border border-white/20" title={`Room: ${team.allocated_room}`}>
                        {team.allocated_room}
                      </span>
                    )}
                    {/* Visual indicators for overall team status */}
                    {team.team_members?.some(m => m.is_present) && (
                      <span className="bg-green-500/30 text-green-300 text-[10px] px-2 py-1 rounded-md font-bold border border-green-500/30" title="Someone is present">
                        P
                      </span>
                    )}
                    {team.team_members?.every(m => m.id_card_issued) && (
                      <span className="bg-blue-500/30 text-blue-300 text-[10px] px-2 py-1 rounded-md font-bold border border-blue-500/30" title="All IDs issued">
                        ID
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <p className={`text-[10px] font-mono mb-1 ${isModal ? 'text-white/30' : 'text-gray-400'}`}>ID: #{team.team_id}</p>
                      <p className={`text-sm ${isModal ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider font-semibold`}>Team Leader</p>
                      <p className={`text-xl font-bold ${isModal ? 'text-white group-hover:text-neon-green' : 'text-gray-800 group-hover:text-college-primary'} transition-colors`}>{team.team_leader_name}</p>
                    </div>
                    {team.team_status && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight border ${
                        team.team_status === 'Approved' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {team.team_status}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isModal ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <svg className={`w-3.5 h-3.5 ${isModal ? 'text-white/40' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <p className={`text-xs truncate ${isModal ? 'text-white/60' : 'text-gray-600'}`}>{team.registered_email}</p>
                    </div>

                    {team.current_phase && (
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isModal ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <svg className={`w-3.5 h-3.5 ${isModal ? 'text-white/40' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                        </div>
                        <p className={`text-[10px] uppercase font-bold tracking-wider ${isModal ? 'text-white/40' : 'text-gray-400'}`}>{team.current_phase}</p>
                      </div>
                    )}

                    {team.mentors_assigned && team.mentors_assigned !== 'N/A' && (
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isModal ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <svg className={`w-3.5 h-3.5 ${isModal ? 'text-white/40' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <p className={`text-[10px] font-bold ${isModal ? 'text-neon-green/60' : 'text-college-primary/60'}`}>Mentor: {team.mentors_assigned}</p>
                      </div>
                    )}

                    {team.invite_status && (
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isModal ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <svg className={`w-3.5 h-3.5 ${isModal ? 'text-white/40' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <p className={`text-[10px] font-medium ${isModal ? 'text-white/40' : 'text-gray-500'}`}>Invites: {team.invite_status}</p>
                      </div>
                    )}
                  </div>

                  <div className={`mt-5 pt-4 border-t ${isModal ? 'border-white/5' : 'border-gray-100'} flex justify-between items-center`}>
                    <div className="flex -space-x-2 overflow-hidden">
                      {team.team_members?.slice(0, 3).map((_, i) => (
                        <div key={i} className={`inline-block h-6 w-6 rounded-full ring-2 ${isModal ? 'ring-[#1e1e1e] bg-white/10' : 'ring-white bg-gray-200'} flex items-center justify-center text-[10px] font-bold ${isModal ? 'text-white/40' : 'text-gray-500'}`}>
                          {i + 1}
                        </div>
                      ))}
                      {team.team_members && team.team_members.length > 3 && (
                        <div className={`inline-block h-6 w-6 rounded-full ring-2 ${isModal ? 'ring-[#1e1e1e] bg-white/10' : 'ring-white bg-gray-300'} flex items-center justify-center text-[10px] font-bold ${isModal ? 'text-white/60' : 'text-gray-600'}`}>
                          +{team.team_members.length - 3}
                        </div>
                      )}
                    </div>
                    <span className={`text-[11px] font-bold ${isModal ? 'text-neon-green/60' : 'text-college-primary/60'} uppercase tracking-widest group-hover:underline`}>Manage Details</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Modal */}
        {selectedTeam && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className={`${isModal ? 'bg-[#121212] border border-white/10' : 'bg-white'} rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col`}>
              <div className="bg-college-primary p-6 flex justify-between items-center sticky top-0 z-10">
                <h2 className="text-2xl font-bold text-white">Team #{selectedTeam.team_id} Details</h2>
                <button 
                  onClick={() => setSelectedTeam(null)}
                  className="text-white hover:text-gray-200 text-2xl font-bold focus:outline-none"
                >
                  &times;
                </button>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                     <h3 className={`text-lg font-bold ${isModal ? 'text-white' : 'text-gray-700'} mb-2`}>Contact Info</h3>
                     {selectedTeam.team_name && <p className={isModal ? 'text-neon-green font-bold mb-1' : 'text-college-primary font-bold mb-1'}>{selectedTeam.team_name}</p>}
                     <p className={isModal ? 'text-white/70' : 'text-gray-600'}><span className="font-semibold">Email:</span> {selectedTeam.registered_email}</p>
                     <p className={isModal ? 'text-white/70' : 'text-gray-600'}><span className="font-semibold">Phone:</span> {selectedTeam.registered_phone}</p>
                     <p className={`${isModal ? 'text-white/70' : 'text-gray-600'} mt-2`}>
                        <span className="font-semibold">Allocated Room:</span> 
                        {selectedTeam.allocated_room ? (
                            <span className={`ml-2 px-2 py-0.5 rounded font-bold border ${isModal ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
                                {selectedTeam.allocated_room}
                            </span>
                        ) : (
                            <span className="ml-2 text-gray-400 italic">Not Assigned</span>
                        )}
                     </p>
                     <div className="mt-3 flex gap-2 flex-wrap">
                        {selectedTeam.team_status && (
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                            selectedTeam.team_status === 'Approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            Status: {selectedTeam.team_status}
                          </span>
                        )}
                        {selectedTeam.current_phase && (
                          <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            Phase: {selectedTeam.current_phase}
                          </span>
                        )}
                     </div>
                  </div>
                  <div className="flex flex-col items-end justify-center">
                    <button 
                      onClick={handleUpdate}
                      disabled={updating}
                      className={`px-6 py-3 rounded-lg font-bold text-white shadow-md transition ${updating ? 'bg-gray-400 cursor-not-allowed' : 'bg-college-secondary hover:bg-orange-600'}`}
                    >
                      {updating ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>

                <div className={`overflow-x-auto border rounded-lg shadow-sm ${isModal ? 'border-white/10' : 'border-gray-200'}`}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`${isModal ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'} border-b`}>
                        <th className={`p-4 font-bold ${isModal ? 'text-white/60' : 'text-gray-700'}`}>Role</th>
                        <th className={`p-4 font-bold ${isModal ? 'text-white/60' : 'text-gray-700'}`}>Name</th>
                        <th className={`p-4 font-bold text-center ${isModal ? 'text-white/60' : 'text-gray-700'}`}>Present?</th>
                        <th className={`p-4 font-bold text-center ${isModal ? 'text-white/60' : 'text-gray-700'}`}>ID Issued?</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isModal ? 'divide-white/5' : 'divide-gray-100'}`}>
                      {/* Unified Rows for Leader and Members */}
                      {editMembers.map((member, index) => (
                        <tr key={index} className={`${isModal ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'} transition`}>
                          <td className={`p-4 font-bold ${member.role === 'Leader' ? (isModal ? 'text-neon-green' : 'text-college-primary') : (isModal ? 'text-white/40' : 'text-gray-500')}`}>
                            {member.role}
                          </td>
                          <td className={`p-4 font-medium ${isModal ? 'text-white' : 'text-gray-800'}`}>
                            <div>
                              {member.name}
                              {member.email && <div className={`text-[10px] font-normal ${isModal ? 'text-white/40' : 'text-gray-400'}`}>{member.email}</div>}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={member.is_present} 
                              onChange={(e) => handleMemberChange(index, 'is_present', e.target.checked)}
                              className="w-5 h-5 text-neon-green/70 rounded focus:ring-neon-green/40 cursor-pointer bg-black/20 border-white/10 hover:border-neon-green/30 transition-all"
                             />
                          </td>
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={member.id_card_issued} 
                              onChange={(e) => handleMemberChange(index, 'id_card_issued', e.target.checked)}
                              className="w-5 h-5 text-neon-green/70 rounded focus:ring-neon-green/40 cursor-pointer bg-black/20 border-white/10 hover:border-neon-green/30 transition-all"
                             />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isModal && (
        <footer className="bg-gray-800 text-gray-400 p-6 text-center mt-auto">
          <p>&copy; 2025 University Dashboard. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
};

export default StudentRegistration;
