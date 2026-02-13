
import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { Sidebar, SidebarBody, SidebarLink } from "../components/ui/sidebar";
import {
  IconBrandTabler,
  IconUserBolt,
  IconChartBar,
  IconUsers,
  IconArrowLeft,
  IconHome,
  IconBriefcase
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import {
  DashboardOverview,
  RoleAssignmentView,
  RoomManagementView,
  VolunteerAllocationView,
  RoomListView
} from "../components/AdminViews";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [open, setOpen] = useState(false);

  // Role Assignment State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [duty, setDuty] = useState('Registration');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // Room Allocation State
  const [block, setBlock] = useState('N Block');
  const [roomName, setRoomName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [roomMessage, setRoomMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // Volunteer Room Allocation State
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerPhone, setVolunteerPhone] = useState('');
  const [volunteerRoom, setVolunteerRoom] = useState('');
  const [volunteerTime, setVolunteerTime] = useState('');
  const [volunteerMessage, setVolunteerMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  // Data State
  const [teams, setTeams] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // System Analytics State
  const [stats, setStats] = useState({
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
      fetchDashboardData();
    }
  }, [navigate]);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchTeams(),
        fetchRooms()
      ]);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`);
      const data = await response.json();
      if (response.ok) {
        setStats({
          totalTeams: data.totalTeams || 0,
          presentTeams: data.presentTeams || 0,
          totalRooms: data.totalRooms || 0,
          totalParticipants: data.totalParticipants || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams`);
      const data = await response.json();
      if (response.ok) {
        setTeams(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setTeams([]);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/rooms`);
      const data = await response.json();
      if (response.ok) {
        setRooms(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setRooms([]);
    }
  };

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
        setEmail(''); setPassword(''); setDuty('Registration');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to assign role' });
      }
    } catch (error) {
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
        body: JSON.stringify({ block, room_name: roomName, capacity: parseInt(capacity) }),
      });
      const data = await response.json();
      if (response.ok) {
        setRoomMessage({ type: 'success', text: 'Room created successfully!' });
        setBlock('N Block'); setRoomName(''); setCapacity('');
        fetchDashboardStats(); // Refresh stats
      } else {
        setRoomMessage({ type: 'error', text: data.error || 'Failed to create room' });
      }
    } catch (error) {
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
        body: JSON.stringify({ name: volunteerName, phone_no: volunteerPhone, room_no: volunteerRoom, time_slot: volunteerTime }),
      });
      const data = await response.json();
      if (response.ok) {
        setVolunteerMessage({ type: 'success', text: 'Volunteer room allocated successfully!' });
        setVolunteerName(''); setVolunteerPhone(''); setVolunteerRoom(''); setVolunteerTime('');
      } else {
        setVolunteerMessage({ type: 'error', text: data.error || 'Failed to allocate room' });
      }
    } catch (error) {
      setVolunteerMessage({ type: 'error', text: 'Network error. Ensure backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  const links = [
    {
      label: "Dashboard",
      href: "",
      icon: <IconBrandTabler className="h-6 w-6 shrink-0 text-white" />,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setActiveSection("Dashboard");
      }
    },
    {
      label: "Role Assignment",
      href: "#",
      icon: <IconUserBolt className="h-6 w-6 shrink-0 text-white" />,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setActiveSection("Role Assignment");
      }
    },
    {
      label: "Room Management",
      href: "#",
      icon: <IconHome className="h-6 w-6 shrink-0 text-white" />,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setActiveSection("Room Management");
      }
    },
    {
      label: "Volunteer Allocation",
      href: "#",
      icon: <IconBriefcase className="h-6 w-6 shrink-0 text-white" />,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setActiveSection("Volunteer Allocation");
      }
    },
    {
      label: "System Analytics",
      href: "#",
      icon: <IconChartBar className="h-6 w-6 shrink-0 text-white" />,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        navigate('/admin/analytics');
      }
    },
    {
      label: "Logout",
      href: "#",
      icon: <IconArrowLeft className="h-6 w-6 shrink-0 text-white" />,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        handleLogout();
      }
    },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-college-bg text-college-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-college-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row bg-college-bg w-full flex-1 mx-auto border border-neutral-200 overflow-hidden h-screen font-sans">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 bg-college-primary border-r border-college-primary/20">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink 
                  key={idx} 
                  link={link} 
                  onClick={link.onClick} 
                  className="hover:bg-white/10 rounded-2xl transition-all duration-300 py-3 px-4 group" 
                />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "Super Admin",
                href: "#",
                icon: (
                  <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-white text-college-primary text-[12px] font-black">
                    SA
                  </div>
                ),
              }}
              className="py-4 px-4 hover:bg-white/10 rounded-2xl transition-all duration-300"
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex flex-1 overflow-y-auto bg-college-bg">
        <div className="p-4 md:p-10 rounded-tl-[4rem] border-t border-l border-neutral-200 bg-white flex flex-col gap-2 flex-1 w-full h-full shadow-[inset_0_2px_10px_rgba(30,58,138,0.05)]">
          {activeSection === "Dashboard" && (
            <DashboardOverview 
              stats={stats} 
              setActiveSection={setActiveSection} 
              teams={teams}
              rooms={rooms}
              loading={dataLoading}
            />
          )}
          {activeSection === "Role Assignment" && (
            <RoleAssignmentView 
              email={email} setEmail={setEmail} 
              password={password} setPassword={setPassword} 
              duty={duty} setDuty={setDuty} 
              loading={loading} message={message} 
              onSubmit={handleAssignRole} 
            />
          )}
          {activeSection === "Room Management" && (
            <div className="space-y-12">
              <RoomManagementView 
                block={block} setBlock={setBlock} 
                roomName={roomName} setRoomName={setRoomName} 
                capacity={capacity} setCapacity={setCapacity} 
                loading={loading} roomMessage={roomMessage} 
                onSubmit={handleCreateRoom} 
              />
              <RoomListView rooms={rooms} loading={dataLoading} />
            </div>
          )}
          {activeSection === "Volunteer Allocation" && (
            <VolunteerAllocationView 
              name={volunteerName} setName={setVolunteerName} 
              phone={volunteerPhone} setPhone={setVolunteerPhone} 
              room={volunteerRoom} setRoom={setVolunteerRoom} 
              time={volunteerTime} setTime={setVolunteerTime} 
              loading={loading} message={volunteerMessage} 
              onSubmit={handleAssignVolunteerRoom} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

const Logo = () => (
  <a href="dashboard" className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-white">
    <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-white" />
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-black text-xl tracking-tighter whitespace-pre text-white">
      Hackaccino
    </motion.span>
  </a>
);

const LogoIcon = () => (
  <a href="#" className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-white">
    <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-white" />
  </a>
);

export default AdminDashboard;
