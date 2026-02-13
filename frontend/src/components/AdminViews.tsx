import { 
  IconUsers, 
  IconHome, 
  IconUserCheck, 
  IconMapPin, 
  IconSearch,
  IconArrowRight,
  IconShieldCheck,
  IconBriefcase
} from "@tabler/icons-react";

export const StatCard = ({ title, value, icon }: any) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-[2rem] p-6 shadow-sm group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-college-primary/10 text-college-primary rounded-2xl border border-college-primary/10 group-hover:bg-college-primary group-hover:text-white transition-all duration-300">
          {icon}
        </div>
      </div>
      <div>
        <span className="text-4xl font-bold tracking-tight text-neutral-900">{value}</span>
        <p className="text-xs font-bold text-neutral-500 mt-1 uppercase tracking-widest">{title}</p>
      </div>
    </div>
  );
};

export const ActionCard = ({ title, desc, onClick, icon }: any) => {
  return (
    <div 
      onClick={onClick} 
      className="group cursor-pointer bg-white border border-neutral-200 rounded-[2.5rem] p-8 shadow-sm hover:border-college-primary transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="p-4 rounded-2xl bg-college-primary/10 text-college-primary group-hover:bg-college-primary group-hover:text-white transition-all duration-300">
          {icon}
        </div>
        <IconArrowRight className="w-6 h-6 text-neutral-300 group-hover:text-college-primary transition-all duration-300" />
      </div>
      <h3 className="text-xl font-bold mb-3 text-neutral-900">{title}</h3>
      <p className="text-neutral-500 text-sm leading-relaxed mb-6">{desc}</p>
      <div className="flex items-center font-bold text-xs uppercase tracking-widest text-college-primary">
        Manage
        <div className="ml-2 h-px w-8 bg-college-primary transition-all duration-300 group-hover:w-12" />
      </div>
    </div>
  );
};

export const DashboardOverview = ({ stats }: any) => (
  <div className="space-y-12 py-8">
    <div className="flex flex-col gap-4 text-center md:text-left">
      <h1 className="text-5xl md:text-7xl font-black text-neutral-900 tracking-tighter">
        Welcome to <span className="text-college-primary">Hackaccino.</span>
      </h1>
      <p className="text-neutral-600 font-medium text-lg">System control and event overview.</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Teams" value={stats.totalTeams} icon={<IconUsers className="w-6 h-6" />} />
      <StatCard title="Teams Present" value={stats.presentTeams} icon={<IconUserCheck className="w-6 h-6" />} />
      <StatCard title="Total Participants" value={stats.totalParticipants} icon={<IconUsers className="w-6 h-6" />} />
      <StatCard title="Total Rooms" value={stats.totalRooms} icon={<IconHome className="w-6 h-6" />} />
    </div>
  </div>
);

export const RoleAssignmentView = ({ email, setEmail, password, setPassword, duty, setDuty, loading, message, onSubmit }: any) => (
  <div className="max-w-3xl mx-auto w-full space-y-10 py-8">
    <div className="text-center space-y-4">
      <div className="inline-flex p-4 rounded-2xl bg-college-primary/10 text-college-primary mb-2">
        <IconShieldCheck className="w-10 h-10" />
      </div>
      <h2 className="text-4xl font-black text-neutral-900 tracking-tight">Assign Staff Roles</h2>
      <p className="text-neutral-600 max-w-md mx-auto">Create and authorize staff accounts for specific event duties.</p>
    </div>

    {message.text && (
      <div className={`p-4 rounded-[1.5rem] text-sm font-bold text-center border ${message.type === 'success' ? 'bg-college-primary text-white border-college-primary' : 'bg-white text-neutral-900 border-neutral-200'}`}>
        {message.text}
      </div>
    )}

    <div className="bg-white border border-neutral-200 rounded-[3rem] p-10 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Email Address</label>
            <input 
              type="email" 
              placeholder="staff@event.com"
              value={email} 
              onChange={(e: any) => setEmail(e.target.value)} 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-neutral-900 outline-none focus:border-college-primary transition-all placeholder:text-neutral-300" 
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Secure Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={(e: any) => setPassword(e.target.value)} 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-neutral-900 outline-none focus:border-college-primary transition-all placeholder:text-neutral-300" 
              required 
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Duty Assignment</label>
          <select 
            value={duty} 
            onChange={(e: any) => setDuty(e.target.value)} 
            className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-neutral-900 outline-none focus:border-college-primary transition-all appearance-none cursor-pointer"
          >
            <option value="Registration">Registration Desk</option>
            <option value="Room Allocation">Room Logistics</option>
            <option value="PCO Assignment">PCO Coordination</option>
          </select>
        </div>
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full mt-8 bg-college-primary text-white font-bold py-5 rounded-2xl hover:bg-college-primary/90 transition-all duration-300 disabled:opacity-50 uppercase tracking-widest text-sm"
        >
          {loading ? 'Processing...' : 'Authorize Staff Role'}
        </button>
      </form>
    </div>
  </div>
);

export const RoomManagementView = ({ block, setBlock, roomName, setRoomName, capacity, setCapacity, loading, roomMessage, onSubmit }: any) => (
  <div className="max-w-3xl mx-auto w-full space-y-10 py-8">
    <div className="text-center space-y-4">
      <div className="inline-flex p-4 rounded-2xl bg-college-primary/10 text-college-primary mb-2">
        <IconMapPin className="w-10 h-10" />
      </div>
      <h2 className="text-4xl font-black text-neutral-900 tracking-tight">Room Configuration</h2>
      <p className="text-neutral-600 max-w-md mx-auto">Add new physical spaces and define their team hosting capacity.</p>
    </div>

    {roomMessage.text && (
      <div className={`p-4 rounded-[1.5rem] text-sm font-bold text-center border ${roomMessage.type === 'success' ? 'bg-college-primary text-white border-college-primary' : 'bg-white text-neutral-900 border-neutral-200'}`}>
        {roomMessage.text}
      </div>
    )}

    <div className="bg-white border border-neutral-200 rounded-[3rem] p-10 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Campus Block</label>
            <select 
              value={block} 
              onChange={(e: any) => setBlock(e.target.value)} 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-black outline-none focus:border-black transition-all appearance-none cursor-pointer"
            >
              <option value="N Block">N Block (Main)</option>
              <option value="P Block">P Block (Science)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Room Identity</label>
            <input 
              type="text" 
              placeholder="e.g. LAB-101"
              value={roomName} 
              onChange={(e: any) => setRoomName(e.target.value)} 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-neutral-900 outline-none focus:border-college-primary transition-all placeholder:text-neutral-300" 
              required 
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Team Capacity</label>
          <input 
            type="number" 
            placeholder="Max number of teams"
            value={capacity} 
            onChange={(e: any) => setCapacity(e.target.value)} 
            className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-neutral-900 outline-none focus:border-college-primary transition-all" 
            required 
          />
        </div>
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full mt-8 bg-college-primary text-white font-bold py-5 rounded-2xl hover:bg-college-primary/90 transition-all duration-300 disabled:opacity-50 uppercase tracking-widest text-sm"
        >
          {loading ? 'Creating...' : 'Register New Venue'}
        </button>
      </form>
    </div>
  </div>
);

export const VolunteerAllocationView = ({ name, setName, phone, setPhone, room, setRoom, time, setTime, loading, message, onSubmit }: any) => (
  <div className="max-w-3xl mx-auto w-full space-y-10 py-8">
    <div className="text-center space-y-4">
      <div className="inline-flex p-4 rounded-2xl bg-college-primary/10 text-college-primary mb-2">
        <IconBriefcase className="w-10 h-10" />
      </div>
      <h2 className="text-4xl font-black text-neutral-900 tracking-tight">Volunteer Allocation</h2>
      <p className="text-neutral-600 max-w-md mx-auto">Dispatch volunteers to their designated event stations and shifts.</p>
    </div>

    {message.text && (
      <div className={`p-4 rounded-[1.5rem] text-sm font-bold text-center border ${message.type === 'success' ? 'bg-college-primary text-white border-college-primary' : 'bg-white text-neutral-900 border-neutral-200'}`}>
        {message.text}
      </div>
    )}

    <div className="bg-white border border-neutral-200 rounded-[3rem] p-10 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Full Name</label>
            <input 
              type="text" 
              placeholder="John Doe"
              value={name} 
              onChange={(e: any) => setName(e.target.value)} 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-neutral-900 outline-none focus:border-college-primary transition-all placeholder:text-neutral-300" 
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Contact Number</label>
            <input 
              type="text" 
              placeholder="+91 98765 43210"
              value={phone} 
              onChange={(e: any) => setPhone(e.target.value)} 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-neutral-900 outline-none focus:border-college-primary transition-all placeholder:text-neutral-300" 
              required 
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Assigned Room</label>
            <input 
              type="text" 
              placeholder="e.g. 204"
              value={room} 
              onChange={(e: any) => setRoom(e.target.value)} 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-neutral-900 outline-none focus:border-college-primary transition-all placeholder:text-neutral-300" 
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 ml-1">Time Slot</label>
            <input 
              type="text" 
              placeholder="e.g. 09:00 AM - 01:00 PM"
              value={time} 
              onChange={(e: any) => setTime(e.target.value)} 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-5 py-4 text-neutral-900 outline-none focus:border-college-primary transition-all placeholder:text-neutral-300" 
              required 
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full mt-8 bg-college-primary text-white font-bold py-5 rounded-2xl hover:bg-college-primary/90 transition-all duration-300 disabled:opacity-50 uppercase tracking-widest text-sm"
        >
          {loading ? 'Allocating...' : 'Assign Volunteer Station'}
        </button>
      </form>
    </div>
  </div>
);

export const TeamListView = ({ teams, loading }: any) => (
  <div className="space-y-8 py-4">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Registered Teams</h2>
        <p className="text-neutral-600 font-medium text-sm">Detailed list of all teams and their participation status.</p>
      </div>
      <div className="relative">
        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input 
          type="text" 
          placeholder="Search teams..." 
          className="bg-white border border-neutral-200 rounded-2xl pl-12 pr-6 py-3 outline-none focus:border-college-primary w-full md:w-80 transition-all placeholder:text-neutral-300"
        />
      </div>
    </div>

    <div className="bg-white border border-neutral-200 rounded-[2rem] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-neutral-400">Team ID</th>
              <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-neutral-400">Leader Name</th>
              <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-neutral-400">Contact</th>
              <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-neutral-400">Room</th>
              <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-neutral-400 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-20 text-center text-neutral-400">Loading team data...</td></tr>
            ) : !Array.isArray(teams) || teams.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-20 text-center text-neutral-400 italic">No teams found.</td></tr>
            ) : teams.map((team: any) => (
              <tr key={team.team_id} className="hover:bg-college-primary/5 transition-colors">
                <td className="px-6 py-5 font-bold text-neutral-900">#{team.team_id}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-neutral-900">{team.team_leader_name}</span>
                    <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">{team.registered_email}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-xs font-bold text-neutral-500">{team.registered_phone}</td>
                <td className="px-6 py-5">
                  {team.allocated_room ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-college-primary/10 text-college-primary text-[10px] font-bold border border-college-primary/20">
                      <IconMapPin className="w-3 h-3" />
                      {team.allocated_room}
                    </span>
                  ) : (
                    <span className="text-neutral-300 text-[10px] italic font-bold uppercase tracking-widest">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${team.leader_present ? 'bg-college-primary text-white border-college-primary' : 'bg-white text-neutral-200 border-neutral-100'}`}>
                      {team.leader_present ? 'Present' : 'Absent'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export const RoomListView = ({ rooms, loading }: any) => (
  <div className="space-y-8 py-4">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Event Venues</h2>
        <p className="text-neutral-600 font-medium text-sm">Real-time status of room allocations and team occupancy.</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading ? (
        <div className="col-span-full py-20 text-center text-neutral-400 animate-pulse">Loading room data...</div>
      ) : !Array.isArray(rooms) || rooms.length === 0 ? (
        <div className="col-span-full py-20 text-center text-neutral-400 italic">No rooms configured.</div>
      ) : rooms.map((room: any) => (
        <div key={room.id} className="bg-white border border-neutral-200 rounded-[2rem] p-6 shadow-sm hover:border-college-primary transition-all group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-college-primary/10 text-college-primary rounded-2xl group-hover:bg-college-primary group-hover:text-white transition-all">
              <IconHome className="w-6 h-6" />
            </div>
            <span className="px-3 py-1 rounded-full bg-college-primary/10 border border-college-primary/20 text-[10px] font-bold uppercase tracking-widest text-college-primary">
              {room.block}
            </span>
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-1">{room.room_name}</h3>
          <p className="text-neutral-500 text-xs mb-6 uppercase tracking-widest font-bold">Capacity: {room.capacity || 0} Teams</p>
          
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              <span>Occupancy</span>
              <span>{(room.occupied || 0)} / {room.capacity || 0}</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-50 rounded-full overflow-hidden border border-neutral-100">
              <div 
                className="h-full bg-college-primary transition-all duration-500" 
                style={{ width: `${room.capacity > 0 ? Math.min(((room.occupied || 0) / room.capacity) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
