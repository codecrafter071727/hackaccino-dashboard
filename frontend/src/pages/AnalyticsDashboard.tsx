import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

interface Team {
  team_id: number;
  team_leader_name: string;
  team_members: any[];
  registered_email: string;
  registered_phone: string;
  leader_present: boolean;
  leader_id_issued: boolean;
  allocated_room?: string;
}

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'participants' | 'idcards'>('participants');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'issued' | 'not_issued'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

  useEffect(() => {
    // Auth check
    const auth = localStorage.getItem('isAdminAuthenticated');
    if (auth !== 'true') {
      navigate('/admin/login');
      return;
    }
    fetchTeams();

    // Real-time subscription
    const channel = supabase
      .channel('analytics_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('team_id', { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setNotification({ message: msg, type: 'success' });
    setTimeout(() => setNotification({ message: '', type: null }), 3000);
  };

  const togglePresence = async (teamId: number, currentStatus: boolean) => {
    setUpdatingId(teamId);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ leader_present: !currentStatus })
        .eq('team_id', teamId);
      if (error) throw error;
      showSuccess(`Team #${teamId} marked as ${!currentStatus ? 'Present' : 'Absent'} successfully!`);
    } catch (err) {
      console.error('Error updating presence:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleIdCard = async (teamId: number, currentStatus: boolean) => {
    setUpdatingId(teamId);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ leader_id_issued: !currentStatus })
        .eq('team_id', teamId);
      if (error) throw error;
      showSuccess(`ID Card for Team #${teamId} ${!currentStatus ? 'Issued' : 'Revoked'} successfully!`);
    } catch (err) {
      console.error('Error updating ID card status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredData = teams.filter(team => {
    const matchesSearch = 
      team.team_leader_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.team_id.toString().includes(searchQuery) ||
      team.registered_email.toLowerCase().includes(searchQuery.toLowerCase());

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

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex font-sans">
      {/* Toast Notification */}
      {notification.type && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl transition-all duration-500 transform animate-in slide-in-from-right fade-in ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {notification.type === 'success' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
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

        <nav className="flex-grow p-4 space-y-2">
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
        {/* Header */}
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
                className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-72 transition-all shadow-sm"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button 
              onClick={fetchTeams}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'all' ? 'bg-gray-800 text-white shadow-lg shadow-gray-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            All Teams ({teams.length})
          </button>
          
          {activeTab === 'participants' ? (
            <>
              <button 
                onClick={() => setFilter('present')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'present' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                Present ({teams.filter(t => t.leader_present).length})
              </button>
              <button 
                onClick={() => setFilter('absent')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'absent' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                Not Present ({teams.filter(t => !t.leader_present).length})
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setFilter('issued')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'issued' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                Issued ({teams.filter(t => t.leader_id_issued).length})
              </button>
              <button 
                onClick={() => setFilter('not_issued')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'not_issued' ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                Pending ({teams.filter(t => !t.leader_id_issued).length})
              </button>
            </>
          )}
        </div>

        {/* Table Content */}
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
                  <tr key={team.team_id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800">#{team.team_id} {team.team_leader_name}</span>
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
                      {activeTab === 'participants' ? (
                        <button 
                          onClick={() => togglePresence(team.team_id, team.leader_present)}
                          disabled={updatingId === team.team_id}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${team.leader_present ? 'bg-white text-red-600 border border-red-100 hover:bg-red-50' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-100'}`}
                        >
                          {updatingId === team.team_id ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                          ) : team.leader_present ? 'Mark Absent' : 'Mark Present'}
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleIdCard(team.team_id, team.leader_id_issued)}
                          disabled={updatingId === team.team_id}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${team.leader_id_issued ? 'bg-white text-amber-600 border border-amber-100 hover:bg-amber-50' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'}`}
                        >
                          {updatingId === team.team_id ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                          ) : team.leader_id_issued ? 'Revoke ID' : 'Issue ID Card'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsDashboard;
