import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';

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

const StudentRegistration: React.FC<{ isModal?: boolean }> = ({ isModal }) => {
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
    } catch (e) {
      localStorage.removeItem('staffUser');
      if (!isModal) navigate('/');
    }
  }, [navigate, isModal]);

  const fetchTeams = async (query: string = '') => {
    setLoading(true);
    try {
      const url = query 
        ? `${API_BASE_URL}/api/teams?query=${encodeURIComponent(query)}&limit=100`
        : `${API_BASE_URL}/api/teams?limit=100`;
      
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
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      alert(`Error fetching teams: ${error.message}`);
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
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut({ scope: 'local' });
    window.location.replace('/');
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
              placeholder="Search by Team Leader, Email, or Phone..."
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
                  <span className="text-white font-bold text-lg">Team #{team.team_id}</span>
                  <div className="flex gap-2">
                    {team.allocated_room && <span className="bg-purple-500 text-xs px-2 py-1 rounded-full text-white font-bold" title={`Room: ${team.allocated_room}`}>{team.allocated_room}</span>}
                    {team.leader_present && <span className="bg-green-400 text-xs px-2 py-1 rounded-full text-white font-bold">P</span>}
                    {team.leader_id_issued && <span className="bg-blue-400 text-xs px-2 py-1 rounded-full text-white font-bold">ID</span>}
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <p className={`text-sm ${isModal ? 'text-white/40' : 'text-gray-500'} uppercase tracking-wider font-semibold`}>Team Leader</p>
                    <p className={`text-xl font-bold ${isModal ? 'text-white group-hover:text-neon-green' : 'text-gray-800 group-hover:text-college-primary'} transition-colors`}>{team.team_leader_name}</p>
                  </div>
                  <div className="mb-2">
                    <p className={`text-sm ${isModal ? 'text-white/40' : 'text-gray-500'}`}>Email</p>
                    <p className={`${isModal ? 'text-white/80' : 'text-gray-700'} truncate`}>{team.registered_email}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${isModal ? 'text-white/40' : 'text-gray-500'}`}>Phone</p>
                    <p className={isModal ? 'text-white/80' : 'text-gray-700'}>{team.registered_phone}</p>
                  </div>
                  <div className={`mt-4 pt-4 border-t ${isModal ? 'border-white/5' : 'border-gray-100'} flex justify-between text-sm ${isModal ? 'text-white/40' : 'text-gray-500'}`}>
                     <span>{team.team_members ? team.team_members.length : 0} Members</span>
                     <span className={`${isModal ? 'text-neon-green' : 'text-college-secondary'} font-semibold group-hover:underline`}>View Details →</span>
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
                      {/* Leader Row */}
                      <tr className={`${isModal ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'} transition`}>
                        <td className={`p-4 ${isModal ? 'text-neon-green' : 'text-college-primary'} font-bold`}>Leader</td>
                        <td className={`p-4 font-medium ${isModal ? 'text-white' : 'text-gray-800'}`}>{selectedTeam.team_leader_name}</td>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={editLeaderPresent} 
                            onChange={(e) => setEditLeaderPresent(e.target.checked)}
                            className="w-5 h-5 text-neon-green/70 rounded focus:ring-neon-green/40 cursor-pointer bg-black/20 border-white/10 hover:border-neon-green/30 transition-all"
                           />
                        </td>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={editLeaderId} 
                            onChange={(e) => setEditLeaderId(e.target.checked)}
                            className="w-5 h-5 text-neon-green/70 rounded focus:ring-neon-green/40 cursor-pointer bg-black/20 border-white/10 hover:border-neon-green/30 transition-all"
                           />
                        </td>
                      </tr>

                      {/* Members Rows */}
                      {editMembers.map((member, index) => (
                        <tr key={index} className={`${isModal ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'} transition`}>
                          <td className={`p-4 ${isModal ? 'text-white/40' : 'text-gray-500'}`}>Member</td>
                          <td className={`p-4 ${isModal ? 'text-white/80' : 'text-gray-800'}`}>{member.name}</td>
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
