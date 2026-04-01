const supabase = require('../config/supabaseClient');
const { getIO } = require('../socket');
const { generateQR } = require('../services/qrService');
const { sendQREmail } = require('../services/emailService');

// Get all teams or search with pagination
const getTeams = async (req, res) => {
  const { query, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let apiQuery = supabase
      .from('teams')
      .select(
        'team_id, team_name, team_leader_name, team_members, registered_email, registered_phone, team_status, current_phase, total_members_count, invite_status, mentors_assigned, allocated_room, leader_present, leader_id_issued, email_sent',
        { count: 'exact' }
      )
      .order('team_id', { ascending: true });

    if (query) {
      let searchFilter = `team_name.ilike.%${query}%,team_leader_name.ilike.%${query}%,registered_email.ilike.%${query}%,registered_phone.ilike.%${query}%`;
      if (!isNaN(query)) {
        searchFilter += `,team_id.eq.${query}`;
      }
      apiQuery = apiQuery.or(searchFilter);
      apiQuery = apiQuery.range(offset, offset + limit - 1);
      const { data, count, error } = await apiQuery;
      if (error) throw error;
      return res.status(200).json({ data, total: count, page: parseInt(page), limit: parseInt(limit) });
    }

    apiQuery = apiQuery.range(offset, offset + limit - 1);
    const { data, count, error } = await apiQuery;
    if (error) throw error;

    res.status(200).json({ data, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

// Update team status and trigger QR + email when a member is first marked present
const updateTeamStatus = async (req, res) => {
  const { id } = req.params;
  const { team_members } = req.body;

  try {
    const { data: currentTeam, error: fetchError } = await supabase
      .from('teams')
      .select('team_id, team_name, team_leader_name, registered_email, total_members_count, email_sent')
      .eq('team_id', id)
      .single();

    if (fetchError) throw fetchError;

    const allPresent = team_members && team_members.length > 0 && team_members.every(m => m.is_present);
    const updateData = {
      team_members,
      team_status: allPresent ? 'Approved' : 'Pending',
    };

    // ── Step 3: Save updated team data to Supabase ───────────────────────────
    const { data, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('team_id', id)
      .select();

    if (error) throw error;

    try {
      const io = getIO();
      io.emit('teamUpdate', data[0]);
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    let qrGenerated = false;
    let emailDispatched = false;

    const hasAnyPresent = team_members && team_members.some(m => m.is_present);

    if (!currentTeam.email_sent && hasAnyPresent) {
      try {
        const presentMembers = team_members
          .filter(m => m.is_present)
          .map(m => m.name);

        const { qrImage, payload } = await generateQR({
          teamId: id,
          teamName: currentTeam.team_name || `Team #${id}`,
          presentCount: presentMembers.length,
        });

        const { error: qrInsertError } = await supabase
          .from('team_qr_codes')
          .upsert(
            {
              team_id: id,
              qr_image: qrImage,
              qr_payload: payload,
              attendance_uses_remaining: 2,
              refreshment_uses_remaining: 2,
              total_members: currentTeam.total_members_count || team_members.length,
              present_members: presentMembers,
              present_count: presentMembers.length,
            },
            { onConflict: 'team_id' }
          );

        if (qrInsertError) {
          console.error('[teamController] Error saving QR to Supabase:', qrInsertError);
        } else {
          qrGenerated = true;
          console.log(`[teamController] QR code stored for team ${id}`);
        }

        if (currentTeam.registered_email) {
          await sendQREmail({
            toEmail: currentTeam.registered_email,
            leaderName: currentTeam.team_leader_name || 'Team Leader',
            teamName: currentTeam.team_name || `Team #${id}`,
            teamId: id,
            presentMembers,
            presentCount: presentMembers.length,
            totalMembers: currentTeam.total_members_count || team_members.length,
            qrBase64: qrImage,
          });
          emailDispatched = true;
          console.log(`[teamController] QR email sent to ${currentTeam.registered_email}`);

          await supabase
            .from('teams')
            .update({ email_sent: true })
            .eq('team_id', id);
        } else {
          console.warn(`[teamController] Team ${id} has no registered_email — skipping email.`);
        }
      } catch (qrEmailError) {
        console.error('[teamController] QR/Email error (non-fatal):', qrEmailError.message);
      }
    } else if (currentTeam.email_sent) {
      console.log(`[teamController] Team ${id} already has email_sent=true — skipping QR/email.`);
    }

    res.status(200).json({
      ...data[0],
      qr_generated: qrGenerated,
      email_dispatched: emailDispatched,
    });
  } catch (error) {
    console.error('Error updating team status:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

// Assign room to team (Unified Atomic RPC)
const assignRoom = async (req, res) => {
  const { id } = req.params;
  const { room_name } = req.body;

  if (!room_name) {
    return res.status(400).json({ error: 'Room name is required.' });
  }

  try {
    const { data: result, error: rpcError } = await supabase.rpc('allocate_room_atomic', {
      p_team_id: id,
      p_room_name: room_name,
    });

    if (rpcError) throw rpcError;

    if (!result.success) {
      return res.status(400).json({ error: result.error, message: result.message });
    }

    try {
      const io = getIO();
      io.emit('roomUpdate', {
        team: result.team,
        room: result.room,
        old_room: result.old_room,
        old_room_name: result.old_room_name,
      });
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    res.status(200).json({ message: 'Room assigned successfully', team: result.team, room: result.room });
  } catch (error) {
    console.error('Error assigning room:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message || 'Failed to assign room' });
  }
};

// Toggle attendance for a team (leader_present + syncs leader member is_present)
const toggleAttendance = async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch current team data
    const { data: teamArr, error: fetchError } = await supabase
      .from('teams')
      .select('team_id, leader_present, team_members')
      .eq('team_id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!teamArr) return res.status(404).json({ error: 'Team not found' });

    const newPresent = !teamArr.leader_present;

    // Sync ALL entries inside team_members array
    const updatedMembers = Array.isArray(teamArr.team_members)
      ? teamArr.team_members.map(m => ({ ...m, is_present: newPresent }))
      : teamArr.team_members;

    const { data, error } = await supabase
      .from('teams')
      .update({ leader_present: newPresent, team_members: updatedMembers })
      .eq('team_id', id)
      .select()
      .single();

    if (error) throw error;

    try {
      const io = getIO();
      io.emit('teamUpdate', data);
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error toggling attendance:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

// Toggle ID card issuance (leader_id_issued + syncs leader member id_card_issued)
const toggleIdCard = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: teamArr, error: fetchError } = await supabase
      .from('teams')
      .select('team_id, leader_id_issued, team_members')
      .eq('team_id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!teamArr) return res.status(404).json({ error: 'Team not found' });

    const newIssued = !teamArr.leader_id_issued;

    const updatedMembers = Array.isArray(teamArr.team_members)
      ? teamArr.team_members.map(m => ({ ...m, id_card_issued: newIssued }))
      : teamArr.team_members;

    const { data, error } = await supabase
      .from('teams')
      .update({ leader_id_issued: newIssued, team_members: updatedMembers })
      .eq('team_id', id)
      .select()
      .single();

    if (error) throw error;

    try {
      const io = getIO();
      io.emit('teamUpdate', data);
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error toggling ID card:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

// Update individual members' status (attendance + ID cards)
const updateMembers = async (req, res) => {
  const { id } = req.params;
  const { team_members } = req.body;

  if (!Array.isArray(team_members)) {
    return res.status(400).json({ error: 'team_members must be an array.' });
  }

  try {
    // 1. Determine team-level status (only if ALL members are ticked)
    const allPresent = team_members.length > 0 && team_members.every(m => !!m.is_present);
    const allIdIssued = team_members.length > 0 && team_members.every(m => !!m.id_card_issued);
    
    const updateData = { 
      team_members,
      leader_present: allPresent,
      leader_id_issued: allIdIssued
    };
    
    if (allPresent) {
      updateData.team_status = 'Approved';
    } else {
      updateData.team_status = 'Pending';
    }

    const { data, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('team_id', id)
      .select()
      .single();

    if (error) throw error;

    // Emit socket event for team status update
    try {
      const io = getIO();
      io.emit('teamUpdate', data);
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating members:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

// Valid scan slot types
const VALID_SCAN_TYPES = ['attendance_1', 'attendance_2', 'refreshment_1', 'refreshment_2'];

// Verify and record a QR code scan — uses service key to bypass RLS
const verifyQR = async (req, res) => {
  const { qr_data, scan_type } = req.body;
  if (!qr_data || !scan_type) return res.status(400).json({ status: 'error', message: 'qr_data and scan_type are required.' });
  if (!VALID_SCAN_TYPES.includes(scan_type)) return res.status(400).json({ status: 'error', message: 'Invalid scan_type.' });

  try {
    let payload;
    try { payload = typeof qr_data === 'string' ? JSON.parse(qr_data) : qr_data; }
    catch { return res.status(200).json({ status: 'invalid', message: 'Invalid QR code — not a Hackaccino QR.' }); }

    // Support both new short-key format {i,t,n} and old format {team_id,team_name,...}
    const teamId = String(payload.i || payload.team_id || '');
    const teamName = payload.t || payload.team_name || '';

    if (!teamId) {
      return res.status(200).json({ status: 'invalid', message: 'Invalid QR code — not a recognized Hackaccino QR.' });
    }

    const { data: qrRecord, error: fetchError } = await supabase
      .from('team_qr_codes').select('*').eq('team_id', teamId).single();

    if (fetchError || !qrRecord) {
      console.error('[verifyQR] Lookup error:', fetchError?.message);
      return res.status(200).json({ status: 'invalid', message: 'QR code not found. Verify team registration.' });
    }

    const slotField = `${scan_type}_scanned`;
    if (qrRecord[slotField] === true) {
      return res.status(200).json({
        status: 'already_scanned',
        message: `Already scanned for ${scan_type.replace('_', ' ')}!`,
        teamName, teamId,
        leaderName: qrRecord.qr_payload?.leader_name || '',
        presentMembers: qrRecord.present_members || [],
      });
    }

    const { error: updateError } = await supabase
      .from('team_qr_codes').update({ [slotField]: true }).eq('team_id', teamId);

    if (updateError) {
      console.error('[verifyQR] Update error:', updateError.message);
      return res.status(500).json({ status: 'error', message: updateError.message });
    }

    console.log(`[verifyQR] ✅ ${scan_type} marked for team ${teamId} (${teamName})`);
    return res.status(200).json({
      status: 'success',
      message: `${scan_type.replace('_', ' ')} recorded successfully!`,
      teamName, teamId,
      leaderName: qrRecord.qr_payload?.leader_name || '',
      presentMembers: qrRecord.present_members || [],
    });
  } catch (error) {
    console.error('[verifyQR] Unexpected error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getTeams,
  updateTeamStatus,
  assignRoom,
  toggleAttendance,
  toggleIdCard,
  updateMembers,
  verifyQR,
};
