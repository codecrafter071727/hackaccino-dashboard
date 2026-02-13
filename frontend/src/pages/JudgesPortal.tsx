import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const JudgesPortal: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingTeams, setFetchingTeams] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        verifyJudgeAccess(session.user);
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        verifyJudgeAccess(session.user);
      } else {
        setUser(null);
        setTeams([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTeams = async (query: string = '') => {
    setFetchingTeams(true);
    try {
      const baseUrl = 'https://hackaccino-dashboard.onrender.com/api/teams';
      const url = query 
        ? `${baseUrl}?query=${encodeURIComponent(query)}&limit=100`
        : `${baseUrl}?limit=100`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result && Array.isArray(result.data)) {
        setTeams(result.data);
      } else if (Array.isArray(result)) {
        setTeams(result);
      } else {
        setTeams([]);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setFetchingTeams(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeams(searchQuery);
  };

  const verifyJudgeAccess = async (sessionUser: any) => {
    if (!sessionUser?.email) {
      setError('No email found in Google account.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('allowed_judges')
        .select('email')
        .eq('email', sessionUser.email)
        .single();

      if (fetchError || !data) {
        setError('Access Denied: Your email is not registered as a judge. Please contact the administrator.');
        await supabase.auth.signOut();
      } else {
        setUser({
          email: sessionUser.email,
          name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Judge',
          avatar: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture
        });
        setError(null);
      }
    } catch (err) {
      console.error('Error verifying judge access:', err);
      setError('An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/judges-portal'
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to start Google Sign-In');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-college-bg flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-college-primary text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-wider">HACKACCINO</span>
            <span className="text-sm bg-college-secondary text-college-primary px-2 py-1 rounded font-semibold">JUDGES PORTAL</span>
          </div>
          
          <div className="flex items-center space-x-6">
            {user && (
              <div className="flex items-center space-x-3 bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold leading-none">{user.name}</p>
                  <p className="text-[10px] opacity-70 leading-tight mt-1">{user.email}</p>
                </div>
                <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-college-secondary">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-college-secondary text-college-primary flex items-center justify-center font-bold">
                      {user.name.charAt(0)}
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleLogout}
                  className="ml-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
            <button 
              onClick={() => navigate('/')}
              className="text-sm hover:underline opacity-80"
            >
              Back to Home
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-6 py-8">
        {user ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Participating Teams</h2>
                <p className="text-gray-500 mt-1">Search and view all teams registered for the hackathon.</p>
              </div>
              
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex w-full md:w-auto gap-2">
                <div className="relative flex-grow md:w-80">
                  <input
                    type="text"
                    placeholder="Search by Leader, Email, or Phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-college-secondary focus:ring-2 focus:ring-college-secondary/20 outline-none transition-all shadow-sm"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  type="submit"
                  disabled={fetchingTeams}
                  className="bg-college-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-college-secondary transition-all shadow-md disabled:opacity-50"
                >
                  {fetchingTeams ? '...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Teams Table */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Team ID</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Team Leader</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Contact Details</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {fetchingTeams ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-college-secondary mb-3"></div>
                            <p>Loading teams data...</p>
                          </div>
                        </td>
                      </tr>
                    ) : teams.length > 0 ? (
                      teams.map((team) => (
                        <tr key={team.team_id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4 font-bold text-college-primary">#{team.team_id}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800">{team.team_leader_name}</span>
                              <span className="text-xs text-gray-400">
                                {Array.isArray(team.team_members) ? team.team_members.length : 0} Members
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col text-sm">
                              <span className="text-gray-600">{team.registered_email}</span>
                              <span className="text-gray-400">{team.registered_phone}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {team.leader_present ? (
                                <span className="px-2.5 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100">PRESENT</span>
                              ) : (
                                <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-full border border-red-100">ABSENT</span>
                              )}
                              {team.allocated_room && (
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-full border border-purple-100">{team.allocated_room}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-sm font-bold text-college-secondary hover:text-college-primary transition-colors group-hover:underline">
                              Start Judging →
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p>No teams found matching your search.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border-t-4 border-college-secondary">
            <div className="p-8 text-center space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-gray-800">Judge Sign In</h2>
                <p className="text-gray-500">Use your registered Google account to access the portal.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium animate-pulse">
                  {error}
                </div>
              )}

              <button 
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-gray-200 hover:border-college-primary hover:bg-gray-50 text-gray-700 py-4 rounded-xl font-bold transition-all shadow-sm group"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-college-primary"></div>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span className="group-hover:text-college-primary transition-colors">Sign in with Google</span>
                  </>
                )}
              </button>

              <div className="pt-4">
                <p className="text-xs text-gray-400">
                  Access is restricted to authorized judges only. 
                  Administrators must add your email in the Superadmin panel.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default JudgesPortal;
