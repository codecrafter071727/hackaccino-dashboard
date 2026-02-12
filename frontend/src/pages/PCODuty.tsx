import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

interface Volunteer {
  id: number;
  name: string;
  phone_no: string;
  room_no: string;
  time_slot: string;
  is_present: boolean;
  created_at: string;
}

const PCODuty = () => {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const storedUser = localStorage.getItem('staffUser');
    if (!storedUser) {
      alert('Access Denied: You must be logged in to view this page.');
      navigate('/');
      return;
    }
    
    try {
      const user = JSON.parse(storedUser);
      if (user.duty !== 'PCO Assignment') {
        alert('Access Denied: Your assigned duty does not permit access to this page.');
        navigate('/');
      }
    } catch (e) {
      localStorage.removeItem('staffUser');
      navigate('/');
    }

    fetchVolunteers();
  }, [navigate]);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/volunteers`);
      if (!response.ok) throw new Error('Failed to fetch volunteers');
      const data = await response.json();
      setVolunteers(data);
    } catch (err) {
      setError('Error loading volunteers. Please ensure backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePresenceToggle = async (id: number, currentStatus: boolean) => {
    try {
      setUpdatingId(id);
      const response = await fetch(`${API_BASE_URL}/api/admin/update-volunteer-presence`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_present: !currentStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update presence');
      }
      
      // Update local state
      setVolunteers(volunteers.map(v => 
        v.id === id ? { ...v, is_present: !currentStatus } : v
      ));

      // Show success toast
      const volunteer = volunteers.find(v => v.id === id);
      setToast({ 
        message: `${volunteer?.name} marked as ${!currentStatus ? 'Present' : 'Absent'} successfully!`, 
        type: 'success' 
      });
    } catch (err: any) {
      setToast({ message: err.message || 'Error updating presence status', type: 'error' });
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredVolunteers = volunteers.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.room_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B0C15] p-6 relative overflow-x-hidden text-gray-200 selection:bg-purple-500 selection:text-white font-sans">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-[20%] right-[30%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_10px_3px_rgba(255,255,255,0.3)]"></div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-500 animate-in slide-in-from-top-4 fade-in zoom-in-95`}>
          <div className={`${toast.type === 'success' ? 'bg-[#0F111A] border-green-500/50 text-green-400' : 'bg-[#0F111A] border-red-500/50 text-red-400'} border px-8 py-4 rounded-xl shadow-2xl flex items-center gap-4 min-w-[300px] backdrop-blur-md`}>
            {toast.type === 'success' ? (
              <div className="bg-green-500/10 p-2 rounded-full border border-green-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="bg-red-500/10 p-2 rounded-full border border-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <span className="font-bold tracking-wide text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
              <span className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></span>
              PCO Duty Dashboard
            </h1>
            <p className="text-gray-400 font-medium text-sm ml-5">Manage volunteer attendance and room assignments</p>
          </div>
          
          <div className="w-full md:w-96 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                </div>
                <input
                type="text"
                placeholder="Search by name or room no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-[#161822] border border-white/10 rounded-xl leading-5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent sm:text-sm transition-all shadow-xl"
                />
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={fetchVolunteers}
              className="group bg-[#161822] border border-white/10 text-gray-300 px-5 py-3 rounded-xl font-bold hover:bg-white/5 hover:text-white hover:border-blue-500/30 transition-all flex items-center gap-2 shadow-lg active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button 
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95 border border-white/10"
            >
              Back to Home
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-6 py-4 rounded-xl mb-8 flex items-center gap-4 backdrop-blur-md animate-in slide-in-from-top-2">
            <div className="bg-red-500/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="bg-[#161822]/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/5 relative">
          {/* Top Gradient Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-50"></div>

          {loading ? (
            <div className="p-20 text-center flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-400 animate-pulse font-medium">Loading volunteers...</p>
            </div>
          ) : filteredVolunteers.length === 0 ? (
            <div className="p-20 text-center text-gray-500">
              <div className="bg-white/5 p-6 rounded-full inline-block mb-6 border border-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-xl font-bold text-white mb-2">No matches found</p>
              <p className="text-sm">Try searching for a different name or room number.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0F111A] border-b border-white/5">
                    <th className="px-6 py-5 font-bold text-gray-400 uppercase text-xs tracking-wider">Volunteer Name</th>
                    <th className="px-6 py-5 font-bold text-gray-400 uppercase text-xs tracking-wider">Contact No.</th>
                    <th className="px-6 py-5 font-bold text-gray-400 uppercase text-xs tracking-wider">Room No.</th>
                    <th className="px-6 py-5 font-bold text-gray-400 uppercase text-xs tracking-wider">Time Slot</th>
                    <th className="px-6 py-5 font-bold text-gray-400 uppercase text-xs tracking-wider">Status</th>
                    <th className="px-6 py-5 font-bold text-gray-400 uppercase text-xs tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredVolunteers.map((volunteer) => (
                    <tr key={volunteer.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-5 font-bold text-white group-hover:text-blue-400 transition-colors">{volunteer.name}</td>
                      <td className="px-6 py-5 text-gray-400 text-sm font-medium">{volunteer.phone_no}</td>
                      <td className="px-6 py-5">
                        <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-md text-xs font-bold border border-blue-500/20 uppercase tracking-wide">
                          {volunteer.room_no}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-gray-400 font-medium text-sm">{volunteer.time_slot}</td>
                      <td className="px-6 py-5">
                        {volunteer.is_present ? (
                          <span className="inline-flex items-center gap-2 text-green-400 font-bold text-xs bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-red-400 font-bold text-xs bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => handlePresenceToggle(volunteer.id, volunteer.is_present)}
                          disabled={updatingId === volunteer.id}
                          className={`relative overflow-hidden px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mx-auto min-w-[130px] flex items-center justify-center ${
                            volunteer.is_present
                              ? 'bg-[#161822] text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50'
                              : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:to-blue-400 border border-transparent'
                          }`}
                        >
                          {updatingId === volunteer.id ? (
                            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                          ) : volunteer.is_present ? (
                            'Mark Absent'
                          ) : (
                            'Mark Present'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PCODuty;