
const supabase = require('../config/supabaseClient');

// Create a new staff assignment
exports.assignRole = async (req, res) => {
  const { email, duty } = req.body;

  if (!email || !duty) {
    return res.status(400).json({ error: 'Email and duty are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('staff_assignments')
      .upsert(
        { email, duty, password: 'google-auth-only' },
        { onConflict: 'email' }
      )
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Role assigned/updated successfully', data });
  } catch (error) {
    console.error('Error assigning role:', error);
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
        console.error('Error fetching assignments:', error);
        res.status(500).json({ error: error.message });
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

// Create a room
exports.createRoom = async (req, res) => {
  const { block, room_name, capacity } = req.body;

  if (!block || !room_name || !capacity) {
    return res.status(400).json({ error: 'Block, room name, and capacity are required.' });
  }

  try {
    // Assuming there's a 'rooms' table
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ block, room_name, capacity: parseInt(capacity) }])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Room created successfully', data });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all rooms (optionally filtered by block)
exports.getRooms = async (req, res) => {
    const { block } = req.query;
    try {
        let query = supabase.from('rooms').select('*').order('room_name');
        
        if (block) {
            query = query.eq('block', block);
        }

        const { data, error } = await query;

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: error.message });
    }
};

// Assign volunteer to room
exports.assignVolunteerRoom = async (req, res) => {
  const { name, phone_no, room_no, time_slot } = req.body;

  if (!name || !phone_no || !room_no || !time_slot) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Assuming there's a 'volunteer_assignments' table
    const { data, error } = await supabase
      .from('volunteer_assignments')
      .insert([{ name, phone_no, room_no, time_slot }])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Volunteer assigned successfully', data });
  } catch (error) {
    console.error('Error assigning volunteer:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all volunteers
exports.getVolunteers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('volunteer_assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
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
    return res.status(400).json({ error: 'ID and is_present status are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('volunteer_assignments')
      .update({ is_present })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.status(200).json({ message: 'Presence updated successfully', data });
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({ error: error.message });
  }
};
