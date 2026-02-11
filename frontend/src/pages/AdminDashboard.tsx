
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  // Role Assignment Modal State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [duty, setDuty] = useState('Registration');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // Room Allocation Modal State
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [block, setBlock] = useState('N Block');
  const [roomName, setRoomName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [roomMessage, setRoomMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // Volunteer Room Allocation Modal State
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerPhone, setVolunteerPhone] = useState('');
  const [volunteerRoom, setVolunteerRoom] = useState('');
  const [volunteerTime, setVolunteerTime] = useState('');
  const [volunteerMessage, setVolunteerMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // System Analytics State
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [stats] = useState({
    totalTeams: 0,
    presentTeams: 0,
    totalRooms: 0,
    totalParticipants: 0
  });

  useEffect(() => {
    // Simple auth check
    const auth = localStorage.getItem('isAdminAuthenticated');
    if (auth !== 'true') {
      navigate('/admin/login');
    } else {
      setIsAdmin(true);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    navigate('/admin/login');
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/assign-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, duty }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Role assigned successfully!' });
        setEmail('');
        setPassword('');
        setDuty('Registration');
        setTimeout(() => {
             setShowRoleModal(false);
             setMessage({ type: '', text: '' });
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to assign role' });
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      setMessage({ type: 'error', text: 'Network error. Ensure backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRoomMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block, room_name: roomName, capacity }),
      });

      const data = await response.json();

      if (response.ok) {
        setRoomMessage({ type: 'success', text: 'Room created successfully!' });
        setBlock('N Block');
        setRoomName('');
        setCapacity('');
        setTimeout(() => {
             setShowRoomModal(false);
             setRoomMessage({ type: '', text: '' });
        }, 1500);
      } else {
        setRoomMessage({ type: 'error', text: data.error || 'Failed to create room' });
      }
    } catch (error) {
      console.error('Error creating room:', error);
      setRoomMessage({ type: 'error', text: 'Network error. Ensure backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignVolunteerRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setVolunteerMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/assign-volunteer-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: volunteerName, 
          phone_no: volunteerPhone, 
          room_no: volunteerRoom, 
          time_slot: volunteerTime 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setVolunteerMessage({ type: 'success', text: 'Volunteer room allocated successfully!' });
        setVolunteerName('');
        setVolunteerPhone('');
        setVolunteerRoom('');
        setVolunteerTime('');
        setTimeout(() => {
             setShowVolunteerModal(false);
             setVolunteerMessage({ type: '', text: '' });
        }, 1500);
      } else {
        setVolunteerMessage({ type: 'error', text: data.error || 'Failed to allocate room' });
      }
    } catch (error) {
      console.error('Error allocating volunteer room:', error);
      setVolunteerMessage({ type: 'error', text: 'Network error. Ensure backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    navigate('/admin/analytics');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Navbar */}
      <nav className="bg-black/50 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent cursor-pointer" onClick={() => navigate('/')}>
              Hackaccino
            </div>
            <span className="text-sm px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
              Superadmin
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Role Assigned Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 group-hover:bg-purple-500/30 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-full">Active</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Role Assignment</h3>
            <p className="text-gray-400 text-sm mb-4">
              Manage and assign roles to registered users and team members.
            </p>
            <button 
              onClick={() => setShowRoleModal(true)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors cursor-pointer"
            >
              Manage Roles →
            </button>
          </div>

          {/* Room Allocation Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 group-hover:bg-amber-500/30 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-full">New</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Room Management</h3>
            <p className="text-gray-400 text-sm mb-4">
              Create and manage rooms, allocate capacities for blocks.
            </p>
            <button 
              onClick={() => setShowRoomModal(true)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors cursor-pointer"
            >
              Manage Rooms →
            </button>
          </div>

          {/* System Analytics Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-full">Real-time</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">System Analytics</h3>
            <p className="text-gray-400 text-sm mb-4">
              View real-time statistics, participation data, and event overview.
            </p>
            <button 
              onClick={fetchStats}
              disabled={loading}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'View Analytics →'}
            </button>
          </div>

          {/* Volunteer Room Allocation Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:bg-emerald-500/30 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-full">Volunteer</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Volunteer Room Allocation</h3>
            <p className="text-gray-400 text-sm mb-4">
              Allocate rooms and time slots for event volunteers and staff.
            </p>
            <button 
              onClick={() => setShowVolunteerModal(true)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors cursor-pointer"
            >
              Allocate Room →
            </button>
          </div>

        </div>
      </div>

      {/* Role Assignment Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button 
              onClick={() => setShowRoleModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Assign Staff Role
            </h2>

            {message.text && (
              <div className={`mb-4 p-3 rounded-lg text-sm text-center ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleAssignRole} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                  placeholder="staff@hackaccino.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Duty Assignment</label>
                <div className="relative">
                  <select
                    value={duty}
                    onChange={(e) => setDuty(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all cursor-pointer"
                  >
                    <option value="Registration" className="bg-gray-900">Registration</option>
                    <option value="Room Allocation" className="bg-gray-900">Room Allocation</option>
                    <option value="PCO Assignment" className="bg-gray-900">PCO Assignment</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Assigning...' : 'Assign Role'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Room Creation Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button 
              onClick={() => setShowRoomModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent">
              Add New Room
            </h2>

            {roomMessage.text && (
              <div className={`mb-4 p-3 rounded-lg text-sm text-center ${roomMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {roomMessage.text}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Block</label>
                <div className="relative">
                  <select
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all cursor-pointer"
                  >
                    <option value="N Block" className="bg-gray-900">N Block</option>
                    <option value="P Block" className="bg-gray-900">P Block</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Room Name/Number</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                  placeholder="e.g. 101, Conference Hall"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Capacity (Number of Teams)</label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                  placeholder="e.g. 5"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* System Analytics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-full max-w-2xl relative shadow-2xl">
            <button 
              onClick={() => setShowStatsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-600 bg-clip-text text-transparent">
              System Analytics Overview
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white mb-1">{stats.totalTeams}</span>
                <span className="text-sm text-gray-400">Total Teams</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-green-400 mb-1">{stats.presentTeams}</span>
                <span className="text-sm text-gray-400">Teams Present</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-blue-400 mb-1">{stats.totalParticipants}</span>
                <span className="text-sm text-gray-400">Total Participants</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-purple-400 mb-1">{stats.totalRooms}</span>
                <span className="text-sm text-gray-400">Total Rooms</span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-center gap-3 text-blue-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-sm">Attendance Summary</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-1000" 
                  style={{ width: `${stats.totalTeams > 0 ? (stats.presentTeams / stats.totalTeams) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {stats.totalTeams > 0 ? Math.round((stats.presentTeams / stats.totalTeams) * 100) : 0}% of registered teams have checked in.
              </p>
            </div>

            <button
              onClick={() => setShowStatsModal(false)}
              className="w-full mt-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-colors"
            >
              Close Overview
            </button>
          </div>
        </div>
      )}

      {/* Volunteer Allocation Modal */}
      {showVolunteerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button 
              onClick={() => setShowVolunteerModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-teal-600 bg-clip-text text-transparent">
              Volunteer Allocation
            </h2>

            {volunteerMessage.text && (
              <div className={`mb-4 p-3 rounded-lg text-sm text-center ${volunteerMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {volunteerMessage.text}
              </div>
            )}

            <form onSubmit={handleAssignVolunteerRoom} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Volunteer Name</label>
                <input
                  type="text"
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Phone Number</label>
                <input
                  type="tel"
                  value={volunteerPhone}
                  onChange={(e) => setVolunteerPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Room No.</label>
                <input
                  type="text"
                  value={volunteerRoom}
                  onChange={(e) => setVolunteerRoom(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="e.g. 101, Lab A"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Time Slot</label>
                <input
                  type="text"
                  value={volunteerTime}
                  onChange={(e) => setVolunteerTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  placeholder="e.g. 09:00 AM - 12:00 PM"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Allocating...' : 'Allocate Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
