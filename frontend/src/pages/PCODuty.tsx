import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { io, Socket } from 'socket.io-client';

interface Volunteer {
  id: number;
  name: string;
  phone_no: string;
  room_no: string;
  time_slot: string;
  is_present: boolean;
  created_at: string;
}

const PCODuty: React.FC<{ isModal?: boolean }> = ({ isModal }) => {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const socketRef = useRef<Socket | null>(null);

  // Socket.io initialization and listeners
  useEffect(() => {
    const socket = io(API_BASE_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to PCO WebSocket server');
    });

    socket.on('volunteerPresenceUpdate', (updatedVolunteer: Volunteer) => {
      console.log('Live volunteer presence update received:', updatedVolunteer);
      setVolunteers(prev => 
        prev.map(v => v.id === updatedVolunteer.id ? { ...v, ...updatedVolunteer } : v)
      );
    });

    socket.on('newVolunteerAssignment', (newVolunteer: Volunteer) => {
      console.log('Live new volunteer assignment received:', newVolunteer);
      setVolunteers(prev => [newVolunteer, ...prev]);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      if (!userDuties.includes('PCO Assignment') && !isModal) {
        alert('Access Denied: Your assigned duties do not permit access to this page.');
        navigate('/');
      }
    } catch (e) {
      localStorage.removeItem('staffUser');
      if (!isModal) navigate('/');
    }

    fetchVolunteers();
  }, [navigate, isModal]);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/api/admin/volunteers`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch volunteers');
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error('Server returned non-JSON response. Please check if the backend is running.');
      }

      const data = await response.json();
      setVolunteers(data);
    } catch (err: any) {
      setError(err.message || 'Error loading volunteers. Please ensure backend is running.');
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
    <div className={`${isModal ? 'bg-transparent p-0' : 'min-h-screen bg-college-bg p-6'} relative overflow-hidden`}>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[110] transition-all duration-500 animate-bounce-short`}>
          <div className={`${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]`}>
            {toast.type === 'success' ? (
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <span className="font-bold tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}

      <div className={`container mx-auto ${isModal ? 'max-w-none' : 'max-w-6xl'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex-1">
            {!isModal && <h1 className={`text-3xl font-bold ${isModal ? 'text-white' : 'text-gray-800'}`}>PCO Duty Dashboard</h1>}
            <p className={`${isModal ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Manage volunteer attendance and room assignments</p>
          </div>
          
          <div className="w-full md:w-96 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name or room no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 border rounded-xl leading-5 ${isModal ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:ring-neon-green' : 'bg-white border-gray-300 placeholder-gray-500 focus:ring-college-primary'} focus:outline-none focus:ring-2 sm:text-sm transition-all shadow-sm`}
            />
          </div>

          {!isModal && (
            <div className="flex gap-3">
              <button 
                onClick={fetchVolunteers}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button 
                onClick={() => navigate('/')}
                className="bg-college-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-college-primary/90 transition-colors"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <div className={`${isModal ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'} rounded-2xl shadow-xl overflow-hidden border`}>
          {loading ? (
            <div className="p-12 text-center">
              <div className={`inline-block animate-spin rounded-full h-8 w-8 border-4 ${isModal ? 'border-neon-green' : 'border-college-primary'} border-t-transparent mb-4`}></div>
              <p className="text-gray-500">Loading volunteers...</p>
            </div>
          ) : filteredVolunteers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-xl font-medium">No matches found for "{searchQuery}"</p>
              <p className="mt-2">Try searching for a different name or room number.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`${isModal ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} border-b`}>
                    <th className={`px-6 py-4 font-bold ${isModal ? 'text-gray-300' : 'text-gray-700'} uppercase text-xs tracking-wider`}>Volunteer Name</th>
                    <th className={`px-6 py-4 font-bold ${isModal ? 'text-gray-300' : 'text-gray-700'} uppercase text-xs tracking-wider`}>Contact No.</th>
                    <th className={`px-6 py-4 font-bold ${isModal ? 'text-gray-300' : 'text-gray-700'} uppercase text-xs tracking-wider`}>Room No.</th>
                    <th className={`px-6 py-4 font-bold ${isModal ? 'text-gray-300' : 'text-gray-700'} uppercase text-xs tracking-wider`}>Time Slot</th>
                    <th className={`px-6 py-4 font-bold ${isModal ? 'text-gray-300' : 'text-gray-700'} uppercase text-xs tracking-wider`}>Status</th>
                    <th className={`px-6 py-4 font-bold ${isModal ? 'text-gray-300' : 'text-gray-700'} uppercase text-xs tracking-wider text-center`}>Action</th>
                  </tr>
                </thead>
                <tbody className={`${isModal ? 'divide-white/5' : 'divide-gray-100'} divide-y`}>
                  {filteredVolunteers.map((volunteer) => (
                    <tr key={volunteer.id} className={`${isModal ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/50'} transition-colors`}>
                      <td className={`px-6 py-4 font-medium ${isModal ? 'text-white' : 'text-gray-900'}`}>{volunteer.name}</td>
                      <td className={`px-6 py-4 ${isModal ? 'text-gray-400' : 'text-gray-600'}`}>{volunteer.phone_no}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${isModal ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                          {volunteer.room_no}
                        </span>
                      </td>
                      <td className={`px-6 py-4 ${isModal ? 'text-gray-400' : 'text-gray-600'} font-medium`}>{volunteer.time_slot}</td>
                      <td className="px-6 py-4">
                        {volunteer.is_present ? (
                          <span className={`flex items-center gap-2 font-bold text-sm px-3 py-1 rounded-full border w-fit ${isModal ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Present
                          </span>
                        ) : (
                          <span className={`flex items-center gap-2 font-bold text-sm px-3 py-1 rounded-full border w-fit ${isModal ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-100'}`}>
                            <span className="h-2 w-2 rounded-full bg-red-500"></span>
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handlePresenceToggle(volunteer.id, volunteer.is_present)}
                          disabled={updatingId === volunteer.id}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                            volunteer.is_present
                              ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95'
                              : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                          } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto min-w-[120px]`}
                        >
                          {updatingId === volunteer.id ? (
                            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
