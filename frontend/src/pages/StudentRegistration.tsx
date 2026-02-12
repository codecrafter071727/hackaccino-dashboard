import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { supabase } from '../supabaseClient';

interface TeamMember {
  name: string;
  is_present: boolean;
  id_card_issued: boolean;
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
}

const StudentRegistration: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Edit state for the modal/table view
  const [editLeaderPresent, setEditLeaderPresent] = useState(false);
  const [editLeaderId, setEditLeaderId] = useState(false);
  const [editMembers, setEditMembers] = useState<TeamMember[]>([]);
  
  const [updating, setUpdating] = useState(false);

  const navigate = useNavigate();

  // Protect the route
  useEffect(() => {
    const storedUser = localStorage.getItem('staffUser');
    if (!storedUser) {
      alert('Access Denied: You must be logged in to view this page.');
      navigate('/');
      return;
    }
    
    try {
      const user = JSON.parse(storedUser);
      if (user.duty !== 'Registration') {
        alert('Access Denied: Your assigned duty does not permit access to this page.');
        navigate('/');
      }
    } catch (e) {
      localStorage.removeItem('staffUser');
      navigate('/');
    }
  }, [navigate]);

  const fetchTeams = async (query: string = '') => {
    setLoading(true);
    try {
      const url = query 
        ? `${API_BASE_URL}/api/teams?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/api/teams`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setTeams(data);
      } else {
        setTeams([]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    // Real-time subscription to 'teams' table
    const subscription = supabase
      .channel('teams_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
        },
        (payload) => {
          const updatedTeam = payload.new as Team;
          
          // Update the list of teams in real-time
          setTeams((prevTeams) => 
            prevTeams.map((t) => 
              t.team_id === updatedTeam.team_id ? { ...t, ...updatedTeam } : t
            )
          );

          // If the updated team is currently selected in the modal, update that too
          setSelectedTeam((prevSelected) => {
            if (prevSelected && prevSelected.team_id === updatedTeam.team_id) {
               // Also update the edit form state if it's open, but only if not currently editing (optional, complex)
               // For now, we'll just update the background data. 
               // To make it truly live in the modal while editing is tricky without overwriting user input.
               // Let's at least update the visual indicators if the user isn't actively typing.
               return { ...prevSelected, ...updatedTeam };
            }
            return prevSelected;
          });
        }
      )
      .subscribe();

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
    setEditLeaderPresent(team.leader_present || false);
    setEditLeaderId(team.leader_id_issued || false);
    
    // Normalize members to handle both string array (legacy) and object array (new)
    const members = team.team_members || [];
    const normalizedMembers: TeamMember[] = members.map((m: any) => {
      if (typeof m === 'string') {
        return { name: m, is_present: false, id_card_issued: false };
      }
      return m;
    });
    
    setEditMembers(normalizedMembers);
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
          leader_present: editLeaderPresent,
          leader_id_issued: editLeaderId,
          team_members: editMembers,
        }),
      });

      if (response.ok) {
        const updatedTeam = await response.json();
        
        // Update local state
        setTeams(teams.map(t => t.team_id === updatedTeam.team_id ? updatedTeam : t));
        setSelectedTeam(null); // Close modal
        alert('Team updated successfully!');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Update failed:', errorData);
        
        // Detailed error handling for users
        if (errorData.error && errorData.error.includes('does not exist')) {
          alert(`Database Error: The database schema is outdated.\n\nPlease run the SQL script provided in 'backend/schema.sql' to add the missing columns (leader_present, etc.).\n\nTechnical Error: ${errorData.error}`);
        } else {
          alert(`Failed to update team: ${errorData.error || response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error updating team:', error);
      alert('Error updating team.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staffUser');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0B0C15] font-sans flex flex-col text-gray-200 relative overflow-x-hidden selection:bg-purple-500 selection:text-white">
       
       {/* Background Effects */}
       <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-[30%] right-[30%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_10px_3px_rgba(255,255,255,0.3)]"></div>
       </div>

       {/* Navbar */}
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
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">Registration Portal</span>
             </div>
          </div>
          <div className="flex items-center space-x-4">
             <button 
              onClick={() => navigate('/admin/login')}
              className="hidden md:flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
            >
              Superadmin
            </button>
            <button 
              onClick={() => navigate('/')}
              className="text-sm font-medium text-gray-400 hover:text-blue-400 transition-colors"
            >
              Dashboard
            </button>
            <button 
              onClick={handleLogout}
              className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 px-3 py-1.5 rounded-md transition-all font-bold tracking-wide uppercase"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6 md:p-10 flex-grow relative z-10 max-w-7xl">
        <div className="mb-10 relative">
             <div className="absolute -left-10 top-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none"></div>
             <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
              Student Registration
            </h1>
            <p className="text-gray-400 text-sm md:text-base font-medium flex items-center gap-2">
                <span className="w-8 h-[2px] bg-blue-500 rounded-full"></span>
                Manage team check-ins & ID verification
            </p>
        </div>

        {/* Search Bar */}
        <div className="mb-10 relative z-20">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 max-w-3xl relative group">
             {/* Search Glow */}
             <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input
                type="text"
                placeholder="Search by Team Leader, Email, or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-[#161822] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all shadow-xl"
                />
            </div>
            <button
              type="submit"
              className="relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
            >
                <span className="relative z-10">Search Records</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </form>
        </div>

        {/* Team Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
             <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
             </div>
             <p className="mt-4 text-gray-400 font-medium animate-pulse">Fetching records...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {teams.map((team) => (
              <div 
                key={team.team_id} 
                onClick={() => handleCardClick(team)}
                className="group relative bg-[#161822]/60 backdrop-blur-md rounded-2xl border border-white/5 hover:border-blue-500/40 shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-blue-500/10"
              >
                {/* Gradient Top Border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                
                {/* Card Header */}
                <div className="p-6 relative">
                  <div className="flex justify-between items-start mb-4">
                     <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-400 uppercase tracking-wider group-hover:text-white transition-colors">
                        Team #{team.team_id}
                     </span>
                     <div className="flex gap-2">
                        {team.allocated_room && <span className="bg-purple-500/20 border border-purple-500/30 text-xs px-2 py-1 rounded-md text-purple-300 font-bold shadow-[0_0_10px_rgba(168,85,247,0.2)]" title={`Room: ${team.allocated_room}`}>{team.allocated_room}</span>}
                        {team.leader_present && <span className="bg-green-500/20 border border-green-500/30 text-xs px-2 py-1 rounded-md text-green-400 font-bold shadow-[0_0_10px_rgba(34,197,94,0.2)]">P</span>}
                        {team.leader_id_issued && <span className="bg-blue-500/20 border border-blue-500/30 text-xs px-2 py-1 rounded-md text-blue-400 font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)]">ID</span>}
                     </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest mb-1 opacity-80">Team Leader</p>
                    <p className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors truncate">{team.team_leader_name}</p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-6 pb-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                    <div className="p-1.5 rounded-full bg-white/5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </div>
                    <span className="truncate">{team.registered_email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                    <div className="p-1.5 rounded-full bg-white/5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    </div>
                    <span>{team.registered_phone}</span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex justify-between items-center group-hover:bg-white/[0.05] transition-colors">
                     <span className="text-xs font-medium text-gray-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        {team.team_members ? team.team_members.length : 0} Members
                     </span>
                     <span className="text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        View Details <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                     </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Modal - Premium Glass Upgrade */}
        {selectedTeam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-md transition-opacity" onClick={() => setSelectedTeam(null)}></div>
            
            <div className="relative bg-[#161822] border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-300">
              
              {/* Modal Header */}
              <div className="sticky top-0 z-20 bg-[#161822]/95 backdrop-blur-md border-b border-white/10 px-6 py-5 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        Team #{selectedTeam.team_id}
                        <span className="text-xs font-normal text-gray-500 border border-white/10 px-2 py-0.5 rounded-full bg-white/5 uppercase tracking-wider">Details</span>
                    </h2>
                </div>
                <button 
                  onClick={() => setSelectedTeam(null)}
                  className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              
              <div className="p-8">
                {/* Info & Action Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 bg-blue-500/5 border border-blue-500/10 rounded-xl p-6">
                  <div className="space-y-3">
                     <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2">Contact Information</h3>
                     <p className="text-gray-300 text-sm flex items-center gap-2">
                        <span className="w-20 text-gray-500 font-semibold">Email:</span> 
                        <span className="text-white truncate">{selectedTeam.registered_email}</span>
                     </p>
                     <p className="text-gray-300 text-sm flex items-center gap-2">
                        <span className="w-20 text-gray-500 font-semibold">Phone:</span> 
                        <span className="text-white">{selectedTeam.registered_phone}</span>
                     </p>
                     <p className="text-gray-300 text-sm flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                        <span className="w-20 text-gray-500 font-semibold">Location:</span> 
                        {selectedTeam.allocated_room ? (
                            <span className="inline-flex items-center gap-1.5 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-md text-xs font-bold border border-purple-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                                {selectedTeam.allocated_room}
                            </span>
                        ) : (
                            <span className="text-gray-500 italic flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                Not Assigned
                            </span>
                        )}
                     </p>
                  </div>
                  <div className="flex flex-col items-end justify-center">
                    <button 
                      onClick={handleUpdate}
                      disabled={updating}
                      className={`group relative px-6 py-3 rounded-xl font-bold text-white shadow-lg overflow-hidden transition-all transform hover:scale-105 active:scale-95 ${updating ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                          {updating ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Updating...
                              </>
                          ) : (
                              <>
                                Update Status
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                              </>
                          )}
                      </span>
                      {!updating && <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300"></div>}
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden border border-white/10 rounded-xl bg-[#0F111A]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Present</th>
                        <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">ID Card</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {/* Leader Row */}
                      <tr className="hover:bg-white/[0.02] transition-colors group">
                        <td className="p-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">LEADER</span>
                        </td>
                        <td className="p-4 font-bold text-white group-hover:text-blue-400 transition-colors">{selectedTeam.team_leader_name}</td>
                        <td className="p-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={editLeaderPresent} 
                                onChange={(e) => setEditLeaderPresent(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          </label>
                        </td>
                        <td className="p-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={editLeaderId} 
                                onChange={(e) => setEditLeaderId(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                          </label>
                        </td>
                      </tr>

                      {/* Members Rows */}
                      {editMembers.map((member, index) => (
                        <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <span className="text-xs text-gray-500 font-medium">MEMBER</span>
                          </td>
                          <td className="p-4 text-gray-300 font-medium">{member.name}</td>
                          <td className="p-4 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={member.is_present} 
                                onChange={(e) => handleMemberChange(index, 'is_present', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                          </td>
                          <td className="p-4 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={member.id_card_issued} 
                                onChange={(e) => handleMemberChange(index, 'id_card_issued', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                            </label>
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

      <footer className="mt-auto w-full border-t border-white/5 bg-[#0F111A]/80 backdrop-blur-md py-8 text-center text-xs text-gray-500">
        <p className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Built for Hackaccino 2025 Hackathon. <span className="text-gray-600">All rights reserved.</span>
        </p>
      </footer>
    </div>
  );
};

export default StudentRegistration;