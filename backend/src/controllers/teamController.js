const supabase = require('../config/supabaseClient');

// Get all teams or search
const getTeams = async (req, res) => {
  const { query } = req.query;

  try {
    let apiQuery = supabase.from('teams').select('*').order('team_id', { ascending: true });

    // If there's a query, we'll fetch all and filter in memory to support complex search
    // (searching inside JSONB array and multiple columns)
    const { data, error } = await apiQuery;

    if (error) {
      throw error;
    }

    let result = data;

    if (query) {
      const lowerQuery = query.toLowerCase();
      result = data.filter(team => {
        // Search basic fields
        if (
          team.team_leader_name?.toLowerCase().includes(lowerQuery) ||
          team.registered_email?.toLowerCase().includes(lowerQuery) ||
          team.registered_phone?.toLowerCase().includes(lowerQuery) ||
          String(team.team_id).includes(lowerQuery) ||
          team.allocated_room?.toLowerCase().includes(lowerQuery)
        ) {
          return true;
        }

        // Search inside team_members (JSONB array)
        if (Array.isArray(team.team_members)) {
            // Check if any member name matches
            return team.team_members.some(member => 
                (typeof member === 'string' && member.toLowerCase().includes(lowerQuery)) ||
                (member.name && member.name.toLowerCase().includes(lowerQuery))
            );
        }
        
        return false;
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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

    if (error) {
      throw error;
    }

    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Assign room to a team
const assignRoom = async (req, res) => {
  const { id } = req.params;
  const { room_name } = req.body;

  if (!room_name) {
      return res.status(400).json({ error: 'Room name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('teams')
      .update({ allocated_room: room_name })
      .eq('team_id', id)
      .select();

    if (error) {
      throw error;
    }

    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error assigning room:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getTeams,
  updateTeamStatus,
  assignRoom
};
