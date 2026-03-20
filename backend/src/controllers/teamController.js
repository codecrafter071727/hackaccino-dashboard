const supabase = require('../config/supabaseClient');

// Get all teams or search with pagination
const getTeams = async (req, res) => {
  const { query, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Optimization: Select only necessary fields
    let apiQuery = supabase
      .from('teams')
      .select('team_id, team_leader_name, team_members, registered_email, registered_phone, leader_present, leader_id_issued, allocated_room', { count: 'exact' })
      .order('team_id', { ascending: true });

    if (query) {
      // Search in basic fields (team_leader_name, email, phone)
      // If query is a number, also search in team_id
      let searchFilter = `team_leader_name.ilike.%${query}%,registered_email.ilike.%${query}%,registered_phone.ilike.%${query}%`;
      
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

// Update team status (leader and members)
const updateTeamStatus = async (req, res) => {
  const { id } = req.params;
  const { leader_present, leader_id_issued, team_members } = req.body;

  try {
    const { data, error } = await supabase
      .from('teams')
      .update({ 
        leader_present, 
        leader_id_issued, 
        team_members 
      })
      .eq('team_id', id)
      .select();

    if (error) throw error;

    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error updating team status:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

// Assign room to team (Atomic with Capacity Check)
const assignRoom = async (req, res) => {
  const { id } = req.params;
  const { room_name } = req.body;

  if (!room_name) {
    return res.status(400).json({ error: 'Room name is required.' });
  }

  try {
    // 1. Call atomic RPC to decrement capacity by 1 only if > 0
    const { data: roomData, error: rpcError } = await supabase.rpc('decrement_room_capacity', { 
      target_room_name: room_name 
    });

    if (rpcError) throw rpcError;

    // 2. Check if room update was successful (if data is empty, room was full)
    if (!roomData || roomData.length === 0) {
      return res.status(400).json({ 
        error: 'Room is full!', 
        message: `The room "${room_name}" has reached its maximum capacity.` 
      });
    }

    // 3. Assign room to team in the teams table
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .update({ allocated_room: room_name })
      .eq('team_id', id)
      .select();

    if (teamError) {
      // Rollback: if team update fails, increment room capacity back
      await supabase
        .from('rooms')
        .update({ capacity: roomData[0].capacity + 1 })
        .eq('room_name', room_name);
      throw teamError;
    }

    res.status(200).json({
      message: 'Room assigned successfully',
      team: teamData[0],
      room: roomData[0]
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
