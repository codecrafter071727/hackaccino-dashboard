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

  // Derived Statistics for UI (Visual Only)
  const totalTeams = teams.length;
  const presentCount = teams.filter(t => t.leader_present).length;
  const issuedCount = teams.filter(t => t.leader_id_issued).length;
  const attendanceRate = totalTeams > 0 ? Math.round((presentCount / totalTeams) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0B0C15] flex font-sans text-white selection:bg-purple-500 selection:text-white">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
      </div>

      {/* Toast Notification */}
      {notification.type && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border transition-all duration-500 transform animate-in slide-in-from-right fade-in backdrop-blur-md ${notification.type === 'success' ? 'bg-[#0F111A]/90 border-green-500/50 text-green-400' : 'bg-[#0F111A]/90 border-red-500/50 text-red-400'}`}>
          {notification.type === 'success' ? (
            <div className="bg-green-500/20 p-1.5 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
          ) : (
            <div className="bg-red-500/20 p-1.5 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
          )}
          <span className="font-semibold text-sm">{notification.message}</span>
          <button onClick={() => setNotification({ message: '', type: null })} className="ml-2 hover:text-white transition-colors">
            <svg className="w-4 h-4 text-gray-500 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar - Dark Glass Theme */}
      <aside className="hidden lg:flex w-72 bg-[#0F111A]/80 backdrop-blur-xl flex-col sticky top-0 h-screen shadow-2xl border-r border-white/5 z-20 transition-all duration-300">
        <div className="p-8 flex items-center gap-3 mb-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative w-10 h-10 bg-[#161822] rounded-lg flex items-center justify-center text-white border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>
          </div>
          <div>
             <span className="text-xl font-black text-white tracking-tight block leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">HACKACCINO</span>
             <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Admin Portal</span>
          </div>
        </div>

        <nav className="flex-grow px-6 space-y-2">
          <div className="px-4 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Overview</div>
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all font-medium group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:scale-110 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </button>

          <div className="mt-8 px-4 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Analytics</div>
          
          <button 
            onClick={() => { setActiveTab('participants'); setFilter('all'); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium border ${activeTab === 'participants' ? 'bg-[#3C50E0]/10 text-blue-400 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 15.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
            </svg>
            Participants
          </button>

          <button 
            onClick={() => { setActiveTab('idcards'); setFilter('all'); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium border ${activeTab === 'idcards' ? 'bg-[#3C50E0]/10 text-blue-400 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            ID Verification
          </button>
        </nav>

        <div className="p-6 border-t border-white/5 mt-auto bg-[#0B0C15]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#161822] border border-white/10 overflow-hidden flex items-center justify-center relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-sm"></div>
               <svg className="w-5 h-5 text-gray-400 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
               </svg>
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm font-bold text-white truncate">Super Admin</p>
              <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider font-semibold">System Access</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-6 md:p-10 overflow-y-auto w-full relative z-10">
        
        {/* Top Metric Cards - Dark Glass Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* Card 1 */}
            <div className="rounded-2xl border border-white/5 bg-[#161822]/60 backdrop-blur-md p-6 shadow-xl hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all duration-300 group hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                    <svg className="fill-current w-6 h-6" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/></svg>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h4 className="text-3xl font-bold text-white">{totalTeams}</h4>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Teams</span>
                    </div>
                </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-white/5 bg-[#161822]/60 backdrop-blur-md p-6 shadow-xl hover:border-green-500/30 hover:shadow-green-500/10 transition-all duration-300 group hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 mb-4 group-hover:scale-110 transition-transform">
                    <svg className="fill-current w-6 h-6" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h4 className="text-3xl font-bold text-white">{presentCount}</h4>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Present</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20">
                        {attendanceRate}%
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                    </span>
                </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-white/5 bg-[#161822]/60 backdrop-blur-md p-6 shadow-xl hover:border-purple-500/30 hover:shadow-purple-500/10 transition-all duration-300 group hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                    <svg className="fill-current w-6 h-6" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM4 0h16v2H4z"/></svg>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h4 className="text-3xl font-bold text-white">{issuedCount}</h4>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">IDs Issued</span>
                    </div>
                </div>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border border-white/5 bg-[#161822]/60 backdrop-blur-md p-6 shadow-xl hover:border-amber-500/30 hover:shadow-amber-500/10 transition-all duration-300 group hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                    <svg className="fill-current w-6 h-6" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h4 className="text-3xl font-bold text-white">{totalTeams - issuedCount}</h4>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending IDs</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></span>
              {activeTab === 'participants' ? 'Participant Attendance' : 'ID Card Issuance'}
            </h2>
            <nav className="flex items-center gap-2 mt-2 ml-4">
                <span className="text-sm font-medium text-gray-500">Dashboard</span>
                <span className="text-sm font-medium text-gray-600">/</span>
                <span className="text-sm font-medium text-blue-400">Analytics</span>
            </nav>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80 group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
              <div className="relative">
                <input 
                    type="text" 
                    placeholder="Search leader, ID or email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#161822] py-3 pl-11 pr-4 text-white placeholder-gray-500 outline-none transition focus:bg-[#0F111A] shadow-xl"
                />
                <svg className="w-5 h-5 text-gray-500 absolute left-4 top-3.5 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button 
              onClick={fetchTeams}
              className="p-3 bg-[#161822] border border-white/10 rounded-xl hover:bg-white/5 transition-all shadow-lg hover:border-blue-500/50 hover:text-white text-gray-400 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <svg className={`w-5 h-5 relative z-10 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* Filters - Dark Pill Style */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all shadow-lg border ${filter === 'all' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-transparent' : 'bg-[#161822] text-gray-400 border-white/10 hover:border-blue-500/50 hover:text-white'}`}
          >
            All Teams
          </button>
          
          {activeTab === 'participants' ? (
            <>
              <button 
                onClick={() => setFilter('present')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all shadow-lg border ${filter === 'present' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-[#161822] text-gray-400 border-white/10 hover:border-green-500/50 hover:text-green-400'}`}
              >
                Present
              </button>
              <button 
                onClick={() => setFilter('absent')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all shadow-lg border ${filter === 'absent' ? 'bg-[#EF4444] text-white border-[#EF4444]' : 'bg-[#161822] text-gray-400 border-white/10 hover:border-red-500/50 hover:text-red-400'}`}
              >
                Absent
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setFilter('issued')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all shadow-lg border ${filter === 'issued' ? 'bg-[#3C50E0] text-white border-[#3C50E0]' : 'bg-[#161822] text-gray-400 border-white/10 hover:border-blue-500/50 hover:text-blue-400'}`}
              >
                Issued
              </button>
              <button 
                onClick={() => setFilter('not_issued')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all shadow-lg border ${filter === 'not_issued' ? 'bg-[#F0950C] text-white border-[#F0950C]' : 'bg-[#161822] text-gray-400 border-white/10 hover:border-amber-500/50 hover:text-amber-400'}`}
              >
                Pending
              </button>
            </>
          )}
        </div>

        {/* Table Content - Dark Glass Card */}
        <div className="rounded-2xl border border-white/5 bg-[#161822]/60 backdrop-blur-md shadow-xl overflow-hidden">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
                <thead>
                <tr className="bg-[#0F111A] text-left border-b border-white/5">
                    <th className="min-w-[220px] py-5 px-6 font-bold text-gray-400 uppercase tracking-wider text-xs">Team Details</th>
                    <th className="min-w-[180px] py-5 px-6 font-bold text-gray-400 uppercase tracking-wider text-xs">Contact Info</th>
                    <th className="min-w-[120px] py-5 px-6 font-bold text-gray-400 uppercase tracking-wider text-xs">Status</th>
                    <th className="py-5 px-6 font-bold text-gray-400 uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                {loading ? (
                    Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                        <td className="py-5 px-6"><div className="h-4 bg-white/10 rounded w-32 mb-2"></div><div className="h-3 bg-white/5 rounded w-20"></div></td>
                        <td className="py-5 px-6"><div className="h-4 bg-white/10 rounded w-40"></div></td>
                        <td className="py-5 px-6"><div className="h-6 bg-white/10 rounded-full w-20"></div></td>
                        <td className="py-5 px-6 text-right"><div className="h-8 bg-white/10 rounded w-24 ml-auto"></div></td>
                    </tr>
                    ))
                ) : filteredData.length === 0 ? (
                    <tr>
                    <td colSpan={4} className="py-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                        <div className="bg-white/5 p-6 rounded-full mb-6 border border-white/5">
                            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">No Data Found</h4>
                        <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
                        </div>
                    </td>
                    </tr>
                ) : (
                    filteredData.map((team) => (
                    <tr key={team.team_id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-5 px-6">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-full">#{team.team_id}</span>
                            </div>
                            <h5 className="font-bold text-white group-hover:text-blue-400 transition-colors text-base">
                                {team.team_leader_name}
                            </h5>
                            <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {Array.isArray(team.team_members) ? team.team_members.length : 0} Members
                            </span>
                        </div>
                        </td>
                        <td className="py-5 px-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm text-gray-300 truncate max-w-[200px] flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                {team.registered_email}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                {team.registered_phone}
                            </span>
                        </div>
                        </td>
                        <td className="py-5 px-6">
                        {activeTab === 'participants' ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-md py-1 px-3 text-xs font-bold border ${team.leader_present ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${team.leader_present ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                {team.leader_present ? 'Present' : 'Absent'}
                            </span>
                        ) : (
                            <span className={`inline-flex items-center gap-1.5 rounded-md py-1 px-3 text-xs font-bold border ${team.leader_id_issued ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${team.leader_id_issued ? 'bg-blue-400' : 'bg-amber-400'}`}></span>
                                {team.leader_id_issued ? 'Issued' : 'Pending'}
                            </span>
                        )}
                        </td>
                        <td className="py-5 px-6 text-right">
                        {activeTab === 'participants' ? (
                            <button 
                            onClick={() => togglePresence(team.team_id, team.leader_present)}
                            disabled={updatingId === team.team_id}
                            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-center text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-xl transform active:scale-95 ${team.leader_present ? 'bg-white/5 text-red-400 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30' : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:to-green-400 border border-transparent'}`}
                            >
                            {updatingId === team.team_id ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : team.leader_present ? 'Mark Absent' : 'Mark Present'}
                            </button>
                        ) : (
                            <button 
                            onClick={() => toggleIdCard(team.team_id, team.leader_id_issued)}
                            disabled={updatingId === team.team_id}
                            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-center text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-xl transform active:scale-95 ${team.leader_id_issued ? 'bg-white/5 text-amber-400 border border-white/10 hover:bg-amber-500/10 hover:border-amber-500/30' : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:to-blue-400 border border-transparent'}`}
                            >
                            {updatingId === team.team_id ? (
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
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
        </div>
      </main>
    </div>
  );
};

export default AnalyticsDashboard;