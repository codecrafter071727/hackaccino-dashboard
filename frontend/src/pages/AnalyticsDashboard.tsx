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
    <div className="min-h-screen bg-college-bg flex font-sans">
      {/* Toast Notification */}
      {notification.type && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl transition-all duration-500 transform animate-in slide-in-from-right fade-in bg-college-primary text-white`}>
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
      <aside className="w-64 bg-college-primary border-r border-college-primary/20 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-college-primary font-black">H</div>
          <span className="text-xl font-bold text-white tracking-tighter">Hackaccino</span>
        </div>

        <nav className="flex-grow p-4 space-y-2">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-4 text-white hover:bg-white/10 rounded-2xl transition-all duration-300 font-bold text-base tracking-tight"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </button>

          <div className="pt-6 pb-2 px-4 text-[10px] font-black text-white/70 uppercase tracking-widest">Analytics</div>
          
          <button 
            onClick={() => { setActiveTab('participants'); setFilter('all'); }}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 text-base font-bold tracking-tight ${activeTab === 'participants' ? 'bg-white text-college-primary shadow-xl' : 'text-white hover:bg-white/10'}`}
          >
            <svg className={`w-6 h-6 ${activeTab === 'participants' ? 'text-college-primary' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 15.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
            </svg>
            <span>Participants</span>
          </button>

          <button 
            onClick={() => { setActiveTab('idcards'); setFilter('all'); }}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 text-base font-bold tracking-tight ${activeTab === 'idcards' ? 'bg-white text-college-primary shadow-xl' : 'text-white hover:bg-white/10'}`}
          >
            <svg className={`w-6 h-6 ${activeTab === 'idcards' ? 'text-college-primary' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            <span>ID Cards</span>
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-4 hover:bg-white/10 rounded-2xl transition-all duration-300 cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-white/20 overflow-hidden flex items-center justify-center text-college-primary font-black">
               SA
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm font-black text-white truncate">Super Admin</p>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider truncate">admin@hackaccino.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-10 overflow-y-auto bg-college-bg">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black text-neutral-900 tracking-tight">
              {activeTab === 'participants' ? 'Attendance' : 'ID Cards'}
            </h1>
            <p className="text-neutral-600 font-medium">Real-time event management dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search teams..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-college-primary w-80 transition-all shadow-sm placeholder:text-neutral-300"
              />
              <svg className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button 
              onClick={fetchTeams}
              className="p-3 bg-white border border-neutral-200 rounded-xl hover:border-college-primary transition-all shadow-sm"
            >
              <svg className={`w-5 h-5 text-college-primary ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${filter === 'all' ? 'bg-college-primary text-white border-college-primary' : 'bg-white text-neutral-500 hover:text-college-primary border-neutral-200'}`}
          >
            All ({teams.length})
          </button>
          
          {activeTab === 'participants' ? (
            <>
              <button 
                onClick={() => setFilter('present')}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${filter === 'present' ? 'bg-college-primary text-white border-college-primary' : 'bg-white text-neutral-500 hover:text-college-primary border-neutral-200'}`}
              >
                Present ({teams.filter(t => t.leader_present).length})
              </button>
              <button 
                onClick={() => setFilter('absent')}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${filter === 'absent' ? 'bg-white text-neutral-300 border-neutral-200' : 'bg-white text-neutral-500 hover:text-college-primary border-neutral-200'}`}
              >
                Absent ({teams.filter(t => !t.leader_present).length})
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setFilter('issued')}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${filter === 'issued' ? 'bg-college-primary text-white border-college-primary' : 'bg-white text-neutral-500 hover:text-college-primary border-neutral-200'}`}
              >
                Issued ({teams.filter(t => t.leader_id_issued).length})
              </button>
              <button 
                onClick={() => setFilter('not_issued')}
                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${filter === 'not_issued' ? 'bg-white text-neutral-300 border-neutral-200' : 'bg-white text-neutral-500 hover:text-college-primary border-neutral-200'}`}
              >
                Pending ({teams.filter(t => !t.leader_id_issued).length})
              </button>
            </>
          )}
        </div>

        {/* Table Content */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-neutral-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-college-primary/5 border-b border-neutral-100">
                <th className="px-8 py-5 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Team Details</th>
                <th className="px-8 py-5 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Contact Info</th>
                <th className="px-8 py-5 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-neutral-600 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-5"><div className="h-4 bg-neutral-100 rounded w-32 mb-2"></div><div className="h-3 bg-neutral-50 rounded w-20"></div></td>
                    <td className="px-8 py-5"><div className="h-4 bg-neutral-100 rounded w-40"></div></td>
                    <td className="px-8 py-5"><div className="h-6 bg-neutral-100 rounded-full w-20"></div></td>
                    <td className="px-8 py-5 text-right"><div className="h-8 bg-neutral-100 rounded-lg w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-neutral-400">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-medium italic">No teams found matching your search and filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((team) => (
                  <tr key={team.team_id} className="hover:bg-college-primary/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-900 text-lg">#{team.team_id} {team.team_leader_name}</span>
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {Array.isArray(team.team_members) ? team.team_members.length : 0} Members
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-neutral-900 font-medium text-sm truncate max-w-[200px]">{team.registered_email}</span>
                        <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">{team.registered_phone}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {activeTab === 'participants' ? (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border transition-all ${team.leader_present ? 'bg-college-primary text-white border-college-primary' : 'bg-white text-neutral-300 border-neutral-100'}`}>
                          {team.leader_present ? 'PRESENT' : 'ABSENT'}
                        </span>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border transition-all ${team.leader_id_issued ? 'bg-college-primary text-white border-college-primary' : 'bg-white text-neutral-300 border-neutral-100'}`}>
                          {team.leader_id_issued ? 'ISSUED' : 'PENDING'}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {activeTab === 'participants' ? (
                        <button 
                          onClick={() => togglePresence(team.team_id, team.leader_present)}
                          disabled={updatingId === team.team_id}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${team.leader_present ? 'bg-white text-college-primary border border-college-primary/20 hover:border-college-primary' : 'bg-college-primary text-white hover:bg-college-primary/90'}`}
                        >
                          {updatingId === team.team_id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>
                          ) : team.leader_present ? 'Mark Absent' : 'Mark Present'}
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleIdCard(team.team_id, team.leader_id_issued)}
                          disabled={updatingId === team.team_id}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${team.leader_id_issued ? 'bg-white text-college-primary border border-college-primary/20 hover:border-college-primary' : 'bg-college-primary text-white hover:bg-college-primary/90'}`}
                        >
                          {updatingId === team.team_id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>
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
