import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../config';
import { io, Socket } from 'socket.io-client';
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavToggle,
  MobileNavMenu,
} from '../ui/resizable-navbar';

interface TeamMember {
  name: string;
  email?: string;
  role: 'Leader' | 'Member';
  is_present: boolean;
  id_card_issued: boolean;
  leader_present?: boolean;
  leader_id_issued?: boolean;
}

type DbTeam = Omit<Team, 'team_members'> & { team_members?: unknown };
type TeamsRealtimePayload = {
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: DbTeam;
  old?: DbTeam;
};

interface Team {
  team_id: string;
  team_name?: string;
  team_leader_name: string;
  team_members: TeamMember[];
  registered_email: string;
  registered_phone: string;
  allocated_room?: string;
  team_status?: string;
  current_phase?: string;
  invite_status?: string;
  mentors_assigned?: string;
}

// ── Stat pill shown in team card header ──────────────────────────────────────
const StatusBadge = ({ label, color }: { label: string; color: string }) => (
  <span
    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border whitespace-nowrap inline-block ${color}`}
  >
    {label}
  </span>
);

// ── Individual team card ──────────────────────────────────────────────────────
const TeamCard = ({ team, onClick }: { team: Team; onClick: () => void }) => {
  const presentCount = team.team_members?.filter((m) => m.is_present).length ?? 0;
  const totalCount = team.team_members?.length ?? 0;
  const allIdIssued = totalCount > 0 && team.team_members?.every((m) => m.id_card_issued);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="group relative rounded-2xl cursor-pointer overflow-hidden
        border border-gray-200 dark:border-white/[0.07]
        bg-white dark:bg-white/[0.03]
        hover:bg-gray-50/80 dark:hover:bg-white/[0.05]
        hover:border-gray-300 dark:hover:border-white/[0.13]
        transition-all duration-300
        shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)]
        dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.55)]
        h-full flex flex-col"
    >
      {/* Neon accent line on hover */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Card header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight truncate group-hover:text-emerald-600 dark:group-hover:text-neon-green transition-colors duration-200"
              title={team.team_name || 'Unnamed Team'}
            >
              {team.team_name || 'Unnamed Team'}
            </h3>
            <p className="text-[9px] font-mono text-gray-400 dark:text-white/20 tracking-widest uppercase shrink-0">
              #{team.team_id.slice(-4)}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            {team.allocated_room && (
              <StatusBadge
                label={team.allocated_room}
                color="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25"
              />
            )}
            {presentCount > 0 && (
              <StatusBadge
                label={`${presentCount}/${totalCount} Present`}
                color="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25"
              />
            )}
            {allIdIssued && (
              <StatusBadge
                label="IDs Issued"
                color="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25"
              />
            )}
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 space-y-4 flex-1">
        {/* Leader */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-white/25 mb-1">
            Team Leader
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-white/90 leading-tight truncate">
            {team.team_leader_name}
          </p>
        </div>

        {/* Meta rows */}
        <div className="space-y-2.5">
          <MetaRow
            icon={
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            text={team.registered_email}
          />

          {team.current_phase && (
            <MetaRow
              icon={
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              }
              text={team.current_phase}
              mono
            />
          )}

          {team.mentors_assigned && team.mentors_assigned !== 'N/A' && (
            <MetaRow
              icon={
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              text={`Mentor: ${team.mentors_assigned}`}
              accent
            />
          )}
        </div>

        {/* Footer row */}
        <div className="pt-3 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between gap-2 mt-auto">
          {/* Member avatars */}
          <div className="flex -space-x-1.5 shrink-0">
            {team.team_members?.slice(0, 3).map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/[0.07] border border-gray-200 dark:border-white/10 flex items-center justify-center text-[9px] font-bold text-gray-500 dark:text-white/50 ring-1 ring-white dark:ring-black"
              >
                {i + 1}
              </div>
            ))}
            {(team.team_members?.length ?? 0) > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/[0.07] border border-gray-200 dark:border-white/10 flex items-center justify-center text-[9px] font-bold text-gray-500 dark:text-white/50 ring-1 ring-white dark:ring-black">
                +{team.team_members.length - 3}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-hidden">
            {team.team_status && (
              <span
                className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border truncate shrink-0 ${team.team_status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                  : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                  }`}
              >
                {team.team_status}
              </span>
            )}
            <span className="text-[9px] font-black text-emerald-600 dark:text-neon-green/50 uppercase tracking-widest group-hover:text-emerald-700 dark:group-hover:text-neon-green transition-colors shrink-0">
              Manage →
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Small icon+text row inside card ──────────────────────────────────────────
const MetaRow = ({
  icon,
  text,
  mono,
  accent,
}: {
  icon: React.ReactNode;
  text: string;
  mono?: boolean;
  accent?: boolean;
}) => (
  <div className="flex items-center gap-2 overflow-hidden">
    <span className="text-gray-400 dark:text-white/25 shrink-0">{icon}</span>
    <p
      className={`text-[11px] truncate ${accent
        ? 'text-emerald-700 dark:text-neon-green/60 font-bold'
        : mono
          ? 'text-gray-500 dark:text-white/40 font-bold uppercase tracking-wider'
          : 'text-gray-500 dark:text-white/50'
        }`}
    >
      {text}
    </p>
  </div>
);

// ── Detail modal for a selected team ─────────────────────────────────────────
const TeamDetailModal = ({
  team,
  editMembers,
  updating,
  onClose,
  onMemberChange,
  onUpdate,
}: {
  team: Team;
  editMembers: TeamMember[];
  updating: boolean;
  onClose: () => void;
  onMemberChange: (index: number, field: 'is_present' | 'id_card_issued', value: boolean) => void;
  onUpdate: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-8"
  >
    <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-lg" onClick={onClose} />

    <motion.div
      initial={{ scale: 0.96, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.96, opacity: 0, y: 16 }}
      className="relative w-full max-w-4xl max-h-[88vh]
        bg-white dark:bg-[#0a0a0a]/95
        backdrop-blur-2xl
        border border-gray-200 dark:border-white/[0.08]
        rounded-2xl sm:rounded-[2rem]
        shadow-[0_32px_80px_rgba(0,0,0,0.12)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.7)]
        overflow-hidden flex flex-col"
    >
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />

      {/* Modal header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 py-4 sm:py-5 gap-3 sm:gap-4
        border-b border-gray-100 dark:border-white/[0.06]
        bg-gray-50/80 dark:bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-none truncate">
              {team.team_name || 'Unnamed Team'}
            </h2>
            <p className="text-[10px] font-mono text-gray-400 dark:text-white/25 tracking-widest uppercase mt-0.5 truncate">
              #{team.team_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onUpdate}
            disabled={updating}
            className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-wider hover:shadow-[0_0_20px_rgba(163,255,18,0.35)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {updating ? (
              <>
                <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Update Status
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl
              bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1]
              border border-gray-200 dark:border-white/[0.08]
              flex items-center justify-center
              text-gray-500 hover:text-gray-900 dark:text-white/40 dark:hover:text-white
              transition-all group shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modal body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-gray-50/50 dark:bg-transparent">
        {/* Team info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact block */}
          <div className="bg-white dark:bg-white/[0.025] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 space-y-3 shadow-sm dark:shadow-none">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-white/25 mb-4">
              Contact Information
            </p>
            <InfoLine label="Email" value={team.registered_email} />
            <InfoLine label="Phone" value={team.registered_phone} />
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-wider">Room</span>
              {team.allocated_room ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md
                  bg-violet-100 text-violet-700 border border-violet-200
                  dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25
                  tracking-wider uppercase">
                  {team.allocated_room}
                </span>
              ) : (
                <span className="text-[10px] text-gray-400 dark:text-white/20 italic">Not Assigned</span>
              )}
            </div>
          </div>

          {/* Status block */}
          <div className="bg-white dark:bg-white/[0.025] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm dark:shadow-none">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-white/25 mb-4">
              Event Status
            </p>
            <div className="flex flex-wrap gap-2">
              {team.team_status && (
                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${team.team_status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                  : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                  }`}>
                  {team.team_status}
                </span>
              )}
              {team.current_phase && (
                <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider
                  bg-blue-100 text-blue-700 border border-blue-200
                  dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                  {team.current_phase}
                </span>
              )}
              {team.invite_status && (
                <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider
                  bg-gray-100 text-gray-600 border border-gray-200
                  dark:bg-white/[0.05] dark:text-white/40 dark:border-white/[0.07]">
                  Invites: {team.invite_status}
                </span>
              )}
              {team.mentors_assigned && team.mentors_assigned !== 'N/A' && (
                <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider
                  bg-emerald-100 text-emerald-700 border border-emerald-200
                  dark:bg-neon-green/[0.08] dark:text-neon-green/70 dark:border-neon-green/15">
                  Mentor: {team.mentors_assigned}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Members table */}
        <div className="overflow-hidden">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-white/25 mb-4">
            Team Members — Attendance & ID Tracking
          </p>

          <div className="border border-gray-200 dark:border-white/[0.07] rounded-2xl overflow-x-auto
            bg-white dark:bg-transparent shadow-sm dark:shadow-none">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/[0.06]">
                  {['Role', 'Name', 'Present?', 'ID Issued?'].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 dark:text-white/30 ${h.includes('?') ? 'text-center' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {editMembers.map((member, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border inline-block ${member.role === 'Leader'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-neon-green/10 dark:text-neon-green dark:border-neon-green/20'
                          : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/[0.04] dark:text-white/30 dark:border-white/[0.06]'
                          }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white/85 truncate max-w-[150px]">{member.name}</p>
                      {member.email && (
                        <p className="text-[10px] text-gray-400 dark:text-white/25 mt-0.5 truncate max-w-[150px]">{member.email}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <CheckboxCell
                        checked={member.is_present}
                        onChange={(v) => onMemberChange(i, 'is_present', v)}
                        color="neon-green"
                      />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <CheckboxCell
                        checked={member.id_card_issued}
                        onChange={(v) => onMemberChange(i, 'id_card_issued', v)}
                        color="blue"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

// ── Key-value info line ───────────────────────────────────────────────────────
const InfoLine = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline gap-2 overflow-hidden">
    <span className="text-[10px] font-bold text-gray-400 dark:text-white/25 uppercase tracking-wider shrink-0 w-12">
      {label}
    </span>
    <span className="text-sm text-gray-700 dark:text-white/70 truncate">{value}</span>
  </div>
);

// ── Custom styled checkbox ────────────────────────────────────────────────────
const CheckboxCell = ({
  checked,
  onChange,
  color,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  color: 'neon-green' | 'blue';
}) => {
  const accent =
    color === 'neon-green'
      ? 'border-emerald-400 bg-emerald-100 dark:border-neon-green/40 dark:bg-neon-green/20 dark:shadow-[0_0_8px_rgba(163,255,18,0.2)]'
      : 'border-blue-400 bg-blue-100 dark:border-blue-400/40 dark:bg-blue-500/20 dark:shadow-[0_0_8px_rgba(96,165,250,0.2)]';
  const icon =
    color === 'neon-green'
      ? 'text-emerald-600 dark:text-neon-green'
      : 'text-blue-600 dark:text-blue-400';

  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all duration-200 ${checked
        ? accent
        : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/20'
        }`}
    >
      {checked && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-3.5 h-3.5 ${icon}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const StudentRegistration: React.FC<{ isModal?: boolean }> = ({ isModal }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [editMembers, setEditMembers] = useState<TeamMember[]>([]);
  const [updating, setUpdating] = useState(false);
  const [qrEmailToast, setQrEmailToast] = useState<{ show: boolean; teamName: string }>({ show: false, teamName: '' });
  const socketRef = useRef<Socket | null>(null);
  const updatingRef = useRef(false);
  const selectedTeamRef = useRef<Team | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('staffUser');
    if (!storedUser) { if (!isModal) { navigate('/'); } return; }
    try {
      const user = JSON.parse(storedUser);
      const duties = user.duties || [user.duty];
      if (!duties.includes('Registration') && !isModal) navigate('/');
    } catch {
      localStorage.removeItem('staffUser');
      if (!isModal) navigate('/');
    }
  }, [navigate, isModal]);

  useEffect(() => {
    updatingRef.current = updating;
  }, [updating]);

  useEffect(() => {
    selectedTeamRef.current = selectedTeam;
  }, [selectedTeam]);

  // Socket.io initialization and listeners
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      withCredentials: true,
      path: '/socket.io'
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Registration WebSocket server');
    });

    socket.on('connect_error', (error) => {
      console.error('Registration socket connect_error:', error);
    });

    socket.on('teamUpdate', (updatedTeam: Team) => {
      console.log('Live team update received in registration:', updatedTeam);
      setTeams(prev =>
        prev.map(t => t.team_id?.toString() === updatedTeam.team_id?.toString() ? { ...t, ...updatedTeam } : t)
      );

      if (selectedTeamRef.current && selectedTeamRef.current.team_id?.toString() === updatedTeam.team_id?.toString()) {
        setSelectedTeam(prev => prev ? { ...prev, ...updatedTeam } : prev);
        if (!updatingRef.current) {
          setEditMembers(updatedTeam.team_members);
        }
      }
    });

    socket.on('roomUpdate', (data: { team: Team }) => {
      const { team: updatedTeam } = data;
      setTeams(prev =>
        prev.map(t => t.team_id?.toString() === updatedTeam.team_id?.toString() ? { ...t, ...updatedTeam } : t)
      );
      if (selectedTeamRef.current && selectedTeamRef.current.team_id?.toString() === updatedTeam.team_id?.toString()) {
        setSelectedTeam(prev => prev ? { ...prev, ...updatedTeam } : prev);
        if (!updatingRef.current) {
          setEditMembers(updatedTeam.team_members);
        }
      }
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const fetchTeams = async (query: string = '') => {
    setLoading(true);
    try {
      // Ensure no double slashes in URL
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const url = query
        ? `${baseUrl}/api/teams?query=${encodeURIComponent(query)}&limit=100`
        : `${baseUrl}/api/teams?limit=100`;

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error fetching teams:', error);
      alert(`Error fetching teams: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    const subscription = supabase
      .channel('teams_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        (payload) => {
          const p = payload as unknown as TeamsRealtimePayload;
          const eventType = p.eventType;
          const nextTeamRaw = p.new;
          const oldTeamRaw = p.old;
          const keyId = (nextTeamRaw?.team_id ?? oldTeamRaw?.team_id)?.toString();

          if (!keyId) return;

          const nextTeam: Team | undefined = nextTeamRaw
            ? ({
              ...nextTeamRaw,
              team_id: nextTeamRaw.team_id?.toString(),
              // Preserve existing team_members if realtime payload doesn't include them
              // (Supabase sometimes omits JSONB columns in realtime payloads)
              team_members: (() => {
                if (Array.isArray(nextTeamRaw.team_members) && nextTeamRaw.team_members.length > 0) {
                  return nextTeamRaw.team_members as TeamMember[];
                }
                // Will be merged with existing below
                return null;
              })()
            } as unknown as Team)
            : undefined;

          setTeams((prevTeams) => {
            if (!prevTeams || prevTeams.length === 0) return prevTeams;

            if (eventType === 'DELETE') {
              return prevTeams.filter(t => t.team_id?.toString() !== keyId);
            }

            const has = prevTeams.some(t => t.team_id?.toString() === keyId);
            if (has && nextTeam) {
              return prevTeams.map(t => {
                if (t.team_id?.toString() !== keyId) return t;
                const merged = { ...t, ...nextTeam };
                // Keep existing team_members if realtime payload had none
                if (!nextTeam.team_members) merged.team_members = t.team_members;
                return merged;
              });
            }

            if (!has && nextTeam) {
              return [nextTeam, ...prevTeams];
            }

            return prevTeams;
          });

          setSelectedTeam((prevSelected) => {
            if (prevSelected && prevSelected.team_id?.toString() === keyId) {
              if (eventType === 'DELETE') return null;
              if (nextTeam) {
                const merged = { ...prevSelected, ...nextTeam };
                if (!nextTeam.team_members) merged.team_members = prevSelected.team_members;
                return merged;
              }
            }
            return prevSelected;
          });

          if (
            selectedTeamRef.current &&
            selectedTeamRef.current.team_id?.toString() === keyId &&
            !updatingRef.current &&
            nextTeam
          ) {
            setEditMembers(nextTeam.team_members);
          }
        }
      )
      .subscribe((status) => {
        console.log('Registration teams realtime status:', status);
      });

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
    // Use unified team_members array from DB
    const members = team.team_members || [];
    setEditMembers(members);
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
        setTeams(teams.map(t => t.team_id === data.team_id ? data : t));
        setSelectedTeam(null);
        // Show QR toast if a QR code was generated and email was sent
        if (data.qr_generated && data.email_dispatched) {
          setQrEmailToast({ show: true, teamName: selectedTeam.team_name || `Team #${selectedTeam.team_id}` });
          setTimeout(() => setQrEmailToast({ show: false, teamName: '' }), 6000);
        } else {
          alert('Team updated successfully!');
        }
      } else {
        console.error('Update failed:', data);
        if (data.error && data.error.includes('does not exist')) {
          alert(`Database Error: The database schema is outdated.\n\nPlease run the SQL script provided in 'backend/schema.sql' to add the missing columns (leader_present, etc.).\n\nTechnical Error: ${data.error}`);
        } else {
          alert(`Failed to update team: ${data.error || response.statusText}`);
        }
      }
    } catch (error: unknown) {
      console.error('Error updating team:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Error updating team: ${errorMessage || 'Network error'}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    localStorage.clear(); sessionStorage.clear();
    try { await supabase.auth.signOut(); } catch { }
    window.location.href = window.location.origin;
  };

  const loggedInUser = (() => {
    try { return JSON.parse(localStorage.getItem('staffUser') || 'null'); } catch { return null; }
  })();

  const navItems = [{ name: 'Dashboard', link: '/' }, { name: 'Teams', link: '/registration' }];

  const totalPresent = teams.reduce((a, t) => a + (t.team_members?.filter((m) => m.is_present).length ?? 0), 0);
  const totalMembers = teams.reduce((a, t) => a + (t.team_members?.length ?? 0), 0);
  const totalIdIssued = teams.reduce((a, t) => a + (t.team_members?.filter((m) => m.id_card_issued).length ?? 0), 0);

  const sharedContent = (
    <RegistrationContent
      teams={teams} loading={loading} searchQuery={searchQuery}
      totalPresent={totalPresent} totalMembers={totalMembers} totalIdIssued={totalIdIssued}
      onSearchChange={setSearchQuery} onSearchSubmit={handleSearch} onCardClick={handleCardClick}
      isModal={isModal} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage}
    />
  );

  const detailModal = (
    <AnimatePresence>
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam} editMembers={editMembers} updating={updating}
          onClose={() => setSelectedTeam(null)} onMemberChange={handleMemberChange} onUpdate={handleUpdate}
        />
      )}
    </AnimatePresence>
  );

  if (!isModal) {
    return (
      <div className={`min-h-screen ${isModal ? 'bg-transparent' : 'bg-college-bg'} font-sans flex flex-col`}>

        {/* QR Code Success Toast */}
        {qrEmailToast.show && (
          <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-right">
            <div className="flex items-start gap-3 bg-[#0a1a00] border border-neon-green/30 rounded-2xl p-4 shadow-2xl shadow-neon-green/10 max-w-sm">
              <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">QR Code Sent! 🎉</p>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  QR code generated and emailed to the leader of <span className="text-neon-green font-semibold">{qrEmailToast.teamName}</span>.
                </p>
              </div>
              <button
                onClick={() => setQrEmailToast({ show: false, teamName: '' })}
                className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0 mt-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/[0.06] dark:bg-neon-green/[0.03] rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-blue-400/[0.08] dark:bg-blue-500/[0.07] rounded-full blur-[120px]" />
          <div className="absolute inset-0
            [background-size:40px_40px]
            [background-image:linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)]
            dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]
            [mask-image:linear-gradient(to_bottom,black_0%,transparent_40%)]" />
        </div>

        <div className="fixed top-0 inset-x-0 z-[100] w-full">
          <Navbar>
            <NavBody>
              <div className="flex-1 flex justify-start">
                <NavbarLogo onClick={() => navigate('/')} />
              </div>
              <div className="flex-1 flex justify-center">
                <NavItems items={navItems} />
              </div>
              <div className="flex-1 flex justify-end">
                <div className="hidden md:flex items-center gap-4">
                  {loggedInUser ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full pl-2 pr-4 py-1.5 shadow-sm dark:shadow-none">
                        <div className="w-7 h-7 rounded-full bg-neon-green flex items-center justify-center text-black font-bold text-xs">
                          {(loggedInUser.name || loggedInUser.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col -space-y-0.5">
                          <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                            {loggedInUser.name || loggedInUser.email?.split('@')[0]}
                          </span>
                          <span className="text-[9px] text-emerald-600 dark:text-neon-green font-black uppercase tracking-widest opacity-80">
                            {loggedInUser.duties?.join(' • ') || loggedInUser.duty || 'Staff'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <NavbarButton variant="secondary" onClick={() => navigate('/admin/login')}>
                      Superadmin
                    </NavbarButton>
                  )}
                </div>
                <MobileNav>
                  <NavbarLogo onClick={() => navigate('/')} />
                  <MobileNavToggle isOpen={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
                </MobileNav>
              </div>
            </NavBody>
            <MobileNavMenu isOpen={isMobileMenuOpen}>
              <div className="flex flex-col gap-4 p-6">
                {navItems.map((item, i) => (
                  <button key={i} onClick={() => { navigate(item.link); setIsMobileMenuOpen(false); }}
                    className="text-left text-lg font-medium text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-neon-green transition-colors">
                    {item.name}
                  </button>
                ))}
                <hr className="border-gray-200 dark:border-white/10" />
                {loggedInUser ? (
                  <button onClick={handleLogout} className="w-full py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 font-bold">
                    Logout
                  </button>
                ) : (
                  <NavbarButton variant="secondary" onClick={() => navigate('/admin/login')}>Superadmin</NavbarButton>
                )}
              </div>
            </MobileNavMenu>
          </Navbar>
        </div>

        {sharedContent}
        {detailModal}
      </div>
    );
  }

  return (
    <div className="text-gray-900 dark:text-white">
      {sharedContent}
      {detailModal}
    </div>
  );
};

// ── Shared content (stats + search + grid) ────────────────────────────────────
const RegistrationContent = ({
  teams, loading, searchQuery, totalPresent, totalMembers, totalIdIssued,
  onSearchChange, onSearchSubmit, onCardClick, isModal,
  currentPage, setCurrentPage, itemsPerPage,
}: {
  teams: Team[]; loading: boolean; searchQuery: string;
  totalPresent: number; totalMembers: number; totalIdIssued: number;
  onSearchChange: (v: string) => void; onSearchSubmit: (e: React.FormEvent) => void;
  onCardClick: (t: Team) => void; isModal?: boolean;
  currentPage?: number; setCurrentPage?: (n: number) => void; itemsPerPage?: number;
}) => {
  const totalPages = itemsPerPage ? Math.ceil(teams.length / itemsPerPage) : 1;
  const displayedTeams = (currentPage && itemsPerPage && setCurrentPage)
    ? teams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : teams;

  return (
    <div className={`relative z-10 flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 ${isModal ? 'pt-6' : 'pt-28 sm:pt-32'} pb-12 sm:pb-20`}>

      {/* Page heading */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-neon-green/60 mb-1">
          Student Registration
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          Team Management
        </h1>
        <p className="text-gray-400 dark:text-white/30 text-sm mt-1">
          {teams.length} team{teams.length !== 1 ? 's' : ''} loaded
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {[
          { label: 'Total Teams', value: teams.length, icon: '⬡' },
          { label: 'Present', value: `${totalPresent}/${totalMembers}`, icon: '◎' },
          { label: 'IDs Issued', value: totalIdIssued, icon: '◈' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-white/[0.025] border border-gray-200 dark:border-white/[0.06] rounded-2xl px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 shadow-sm dark:shadow-none">
            <span className="text-emerald-500 dark:text-neon-green/40 text-xl font-mono shrink-0">{s.icon}</span>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{s.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-white/25 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <form onSubmit={onSearchSubmit} className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl">
        <div className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by team name, leader, or email…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full
              bg-white dark:bg-white/[0.04]
              border border-gray-200 dark:border-white/[0.08]
              text-gray-900 dark:text-white
              text-sm
              placeholder-gray-400 dark:placeholder-white/20
              rounded-xl pl-11 pr-5 py-3
              focus:outline-none
              focus:border-emerald-400 dark:focus:border-neon-green/30
              focus:ring-2 focus:ring-emerald-100 dark:focus:ring-0
              shadow-sm dark:shadow-none
              transition-all"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-neon-green text-black text-sm font-black uppercase tracking-wider hover:shadow-[0_0_20px_rgba(163,255,18,0.3)] transition-all shrink-0"
        >
          Search
        </button>
      </form>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-10 h-10 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
          <p className="text-gray-400 dark:text-white/20 text-xs font-black uppercase tracking-widest animate-pulse">Fetching Teams…</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <p className="text-5xl opacity-20 text-gray-500 dark:text-white">⬡</p>
          <p className="text-gray-400 dark:text-white/20 text-sm font-bold uppercase tracking-widest">No teams found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayedTeams.map((team, i) => (
              <motion.div
                key={team.team_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="h-full"
              >
                <TeamCard team={team} onClick={() => onCardClick(team)} />
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && setCurrentPage && (
            <div className="flex justify-center flex-wrap items-center mt-12 gap-6">
              <button
                onClick={() => setCurrentPage(Math.max(1, (currentPage || 1) - 1))}
                disabled={(currentPage || 1) === 1}
                className="px-5 py-2.5 rounded-xl
                  bg-white dark:bg-white/5
                  border border-gray-200 dark:border-white/10
                  text-gray-700 dark:text-white
                  font-bold text-sm
                  shadow-sm dark:shadow-none
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:bg-gray-50 dark:hover:bg-white/10
                  transition-all"
              >
                Previous
              </button>
              <div className="text-sm font-bold text-gray-700 dark:text-white min-w-[100px] text-center">
                Page <span className="text-emerald-600 dark:text-neon-green">{currentPage}</span> of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, (currentPage || 1) + 1))}
                disabled={(currentPage || 1) === totalPages}
                className="px-5 py-2.5 rounded-xl
                  bg-white dark:bg-white/5
                  border border-gray-200 dark:border-white/10
                  text-gray-700 dark:text-white
                  font-bold text-sm
                  shadow-sm dark:shadow-none
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:bg-gray-50 dark:hover:bg-white/10
                  transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentRegistration;