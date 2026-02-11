
const supabase = require('../config/supabaseClient');

// Create a new staff assignment
exports.assignRole = async (req, res) => {
  const { email, password, duty } = req.body;

  if (!email || !password || !duty) {
    return res.status(400).json({ error: 'Email, password, and duty are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('staff_assignments')
      .insert([
        { email, password, duty }
      ])
      .select();

    if (error) {
        if (error.code === '23505') { // Unique violation code for Postgres
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }
        throw error;
    }

    res.status(201).json({ message: 'Role assigned successfully', data });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new room allocation
exports.createRoom = async (req, res) => {
  const { block, room_name, capacity } = req.body;

  if (!block || !room_name || !capacity) {
    return res.status(400).json({ error: 'Block, room name, and capacity are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('room_allocations')
      .insert([
        { block, room_name, capacity: parseInt(capacity) }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Room created successfully', data });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get rooms by block
exports.getRooms = async (req, res) => {
  const { block } = req.query;

  try {
    let query = supabase.from('room_allocations').select('*');
    
    if (block) {
      query = query.eq('block', block);
    }

    const { data, error } = await query.order('room_name', { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all staff assignments (optional, for listing in dashboard later)
exports.getAssignments = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('staff_assignments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new volunteer room allocation
exports.assignVolunteerRoom = async (req, res) => {
  const { name, phone_no, room_no, time_slot } = req.body;

  if (!name || !phone_no || !room_no || !time_slot) {
    return res.status(400).json({ error: 'Name, phone number, room number, and time slot are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('volunteer_room_assignments')
      .insert([
        { name, phone_no, room_no, time_slot }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Volunteer room allocation successful', data });
  } catch (error) {
    console.error('Error assigning volunteer room:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all volunteer assignments
exports.getVolunteers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('volunteer_room_assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) {
      console.log('Volunteer data structure sample:', data[0]);
    }
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching volunteers:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update volunteer presence
exports.updateVolunteerPresence = async (req, res) => {
  const { id, is_present } = req.body;

  if (id === undefined || is_present === undefined) {
    return res.status(400).json({ error: 'Volunteer ID and presence status are required.' });
  }

  try {
    console.log(`Updating presence for volunteer ID: ${id} to ${is_present}`);
    const { data, error } = await supabase
      .from('volunteer_room_assignments')
      .update({ is_present })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase error updating presence:', error);
      throw error;
    }
    res.status(200).json({ message: 'Presence updated successfully', data });
  } catch (error) {
    console.error('Error updating volunteer presence:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Staff Login
exports.staffLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('staff_assignments')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Login successful
    res.status(200).json({ 
      message: 'Login successful', 
      user: {
        email: data.email,
        duty: data.duty
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get system analytics stats
exports.getStats = async (req, res) => {
  try {
    // Get total teams
    const { count: totalTeams, error: teamsError } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true });

    if (teamsError) throw teamsError;

    // Get present teams
    const { count: presentTeams, error: presentError } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('leader_present', true);

    if (presentError) throw presentError;

    // Get total rooms
    const { count: totalRooms, error: roomsError } = await supabase
      .from('room_allocations')
      .select('*', { count: 'exact', head: true });

    if (roomsError) throw roomsError;

    // Get total participants (sum of members + leader)
    const { data: teamsData, error: dataError } = await supabase
      .from('teams')
      .select('team_members');

    if (dataError) throw dataError;

    let totalParticipants = 0;
    teamsData.forEach(team => {
      // Leader is always 1
      totalParticipants += 1;
      // Add members
      if (Array.isArray(team.team_members)) {
        totalParticipants += team.team_members.length;
      }
    });

    res.status(200).json({
      totalTeams: totalTeams || 0,
      presentTeams: presentTeams || 0,
      totalRooms: totalRooms || 0,
      totalParticipants
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
};
