
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
