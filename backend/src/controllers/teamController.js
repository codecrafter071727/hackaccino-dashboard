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
      .select('team_id, team_name, team_leader_name, team_members, registered_email, registered_phone, team_status, current_phase, total_members_count, invite_status, mentors_assigned, allocated_room, email_sent', { count: 'exact' })
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
    // ── Step 1: Fetch current team to check email_sent flag ──────────────────
    const { data: currentTeamArr, error: fetchError } = await supabase
      .from('teams')
      .select('team_id, team_name, team_leader_name, registered_email, total_members_count, email_sent')
      .eq('team_id', id)
      .single();

    if (fetchError) throw fetchError;
    const currentTeam = currentTeamArr;

    // ── Step 2: Determine new team_status ────────────────────────────────────
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

    // Emit socket event for real-time updates
    try {
      const io = getIO();
      io.emit('teamUpdate', data[0]);
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    // ── Step 4: QR + Email flow ───────────────────────────────────────────────
    let qrGenerated = false;
    let emailDispatched = false;

    // Only trigger if:
    //   a) email hasn't been sent yet (no duplicate emails ever)
    //   b) at least 1 team member is present
    const hasAnyPresent = team_members && team_members.some(m => m.is_present);

    if (!currentTeam.email_sent && hasAnyPresent) {
      try {
        const presentMembers = team_members
          .filter(m => m.is_present)
          .map(m => m.name);

        // ── 4a: Generate the QR code (minimal payload for fast scanning) ────
        const { qrImage, payload } = await generateQR({
          teamId: id,
          teamName: currentTeam.team_name || `Team #${id}`,
          presentCount: presentMembers.length,
        });

        // ── 4b: Store QR in Supabase (upsert so reruns don't duplicate) ──────
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

        // ── 4c: Send email to team leader ────────────────────────────────────
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

          // ── 4d: Mark email_sent = true so we never re-send ─────────────────
          await supabase
            .from('teams')
            .update({ email_sent: true })
            .eq('team_id', id);
        } else {
          console.warn(`[teamController] Team ${id} has no registered_email — skipping email.`);
        }
      } catch (qrEmailError) {
        // Non-fatal: log but still return success to the frontend
        console.error('[teamController] QR/Email error (non-fatal):', qrEmailError.message);
      }
    } else if (currentTeam.email_sent) {
      console.log(`[teamController] Team ${id} already has email_sent=true — skipping QR/email.`);
    }

    // ── Step 5: Respond ───────────────────────────────────────────────────────
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

module.exports = { getTeams, updateTeamStatus, assignRoom, verifyQR };
