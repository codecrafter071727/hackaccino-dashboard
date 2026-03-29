const supabase = require('../config/supabaseClient');
const { getIO } = require('../socket');

// Get all teams or search with pagination
const getTeams = async (req, res) => {
  const { query, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Optimization: Select only necessary fields
    let apiQuery = supabase
      .from('teams')
      .select('team_id, team_name, team_leader_name, team_members, registered_email, registered_phone, team_status, current_phase, total_members_count, invite_status, mentors_assigned, allocated_room', { count: 'exact' })
      .order('team_id', { ascending: true });

    if (query) {
      // Search in basic fields (team_name, team_leader_name, email, phone)
      // If query is a number, also search in team_id
      let searchFilter = `team_name.ilike.%${query}%,team_leader_name.ilike.%${query}%,registered_email.ilike.%${query}%,registered_phone.ilike.%${query}%`;
      
      if (!isNaN(query)) {
        searchFilter += `,team_id.eq.${query}`;
      }
      
      apiQuery = apiQuery.or(searchFilter);
      
      // For JSONB search, we might need to handle it differently with pagination.
      // But for now, let's just do the basic search with limit/offset.
      apiQuery = apiQuery.range(offset, offset + limit - 1);
      
      const { data, count, error } = await apiQuery;
      if (error) throw error;

      return res.status(200).json({
        data,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    // Apply pagination
    apiQuery = apiQuery.range(offset, offset + limit - 1);

    const { data, count, error } = await apiQuery;
    if (error) throw error;
    
    res.status(200).json({
      data,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

// Update team status (Unified team_members array)
const updateTeamStatus = async (req, res) => {
  const { id } = req.params;
  const { team_members } = req.body; // Array containing everyone's status

  try {
    // Logic: Auto-approve team if all members are present
    const allPresent = team_members && team_members.length > 0 && team_members.every(m => m.is_present);
    const updateData = { team_members };
    
    if (allPresent) {
      updateData.team_status = 'Approved';
    } else {
      // Optional: Reset to Pending if someone is unmarked as present
      // Only reset if it was previously Approved or is currently Pending
      updateData.team_status = 'Pending';
    }

    const { data, error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('team_id', id)
      .select();

    if (error) throw error;

    // Emit socket event for team status update
    try {
      const io = getIO();
      io.emit('teamUpdate', data[0]);
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    res.status(200).json(data[0]);
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
    // Call the single unified RPC function that handles everything
    // It decrements capacity AND updates the team in ONE transaction
    const { data: result, error: rpcError } = await supabase.rpc('allocate_room_atomic', { 
      p_team_id: id,
      p_room_name: room_name 
    });

    if (rpcError) throw rpcError;

    // Check the result from the RPC
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error, 
        message: result.message 
      });
    }

    // Emit socket event for real-time updates
    try {
      const io = getIO();
      io.emit('roomUpdate', {
        team: result.team,
        room: result.room,
        old_room: result.old_room,
        old_room_name: result.old_room_name
      });
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    res.status(200).json({
      message: 'Room assigned successfully',
      team: result.team,
      room: result.room
    });
  } catch (error) {
    console.error('Error assigning room:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message || 'Failed to assign room' 
    });
  }
};

module.exports = {
  getTeams,
  updateTeamStatus,
  assignRoom
};
