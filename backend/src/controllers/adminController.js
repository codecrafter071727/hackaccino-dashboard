const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabaseClient');
const { getIO } = require('../socket');

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

    // Emit socket event for new room creation
    try {
      const io = getIO();
      io.emit('roomCreated', data[0]);
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

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

    // Emit socket event for new volunteer assignment
    try {
      const io = getIO();
      io.emit('newVolunteerAssignment', data[0]);
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

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

    // Emit socket event for volunteer presence update
    try {
      const io = getIO();
      io.emit('volunteerPresenceUpdate', data[0]);
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    res.status(200).json({ message: 'Presence updated successfully', data });
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({ error: error.message });
  }
};

// Refresh teams from students-detail.json
exports.refreshTeams = async (req, res) => {
  try {
    const jsonFilePath = path.join(__dirname, '../../students-detail.json');
    
    if (!fs.existsSync(jsonFilePath)) {
      return res.status(404).json({ error: 'students-detail.json not found' });
    }

    console.log('Reading students-detail.json...');
    const rawData = fs.readFileSync(jsonFilePath, 'utf8');
    const teamsRaw = JSON.parse(rawData);

    console.log(`Found ${teamsRaw.length} teams to import.`);

    // 1. Delete existing data from teams table
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .neq('team_id', -1); // Delete all rows

    if (deleteError) throw deleteError;

    // 2. Transform and batch import
    const teams = teamsRaw.map(team => {
      // Parse members string into array of objects
      const memberNames = team["Members Names"] ? team["Members Names"].split(',').map(n => n.trim()) : [];
      const memberMails = team["Members Mail"] ? team["Members Mail"].split(',').map(m => m.trim()) : [];
      const leaderName = (team["Leader Name"] || '').trim().toLowerCase();

      // Deduplicate: the source JSON includes the leader in both "Leader Name" AND "Members Names"
      // Remove exactly the first occurrence that matches the leader name (case-insensitive)
      let leaderDropped = false;
      const team_members = memberNames.reduce((acc, name, idx) => {
        if (!leaderDropped && name.trim().toLowerCase() === leaderName) {
          leaderDropped = true; // skip this one duplicate
          return acc;
        }
        acc.push({
          name: name,
          email: memberMails[idx] || '',
          is_present: false,
          id_card_issued: false,
        });
        return acc;
      }, []);


      return {
        team_id: team["Team ID"],
        team_name: team["Team Name"],
        team_leader_name: team["Leader Name"],
        registered_email: team["Leader Mail"],
        registered_phone: team["Leader Phone"] || 'N/A', // Using N/A if not present in new JSON
        leader_present: false,
        leader_id_issued: false,
        team_members: team_members,
        total_members_count: parseInt(team["Total Members Count"] || "0"),
        invite_status: team["Invite Status Summary"],
        team_status: team["Team Status"],
        mentors_assigned: team["Mentors Assigned"],
        current_phase: team["Current Phase"],
        created_at_json: team["Created At"]
      };
    });

    // Import in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < teams.length; i += BATCH_SIZE) {
      const batch = teams.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('teams')
        .insert(batch);

      if (insertError) throw insertError;

    // Emit socket event for teams refreshed
    try {
      const io = getIO();
      io.emit('teamsRefreshed', { message: 'Teams refreshed from source JSON', count: teams.length });
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    res.status(200).json({ 
      message: 'Teams refreshed successfully!', 
      count: teams.length 
    });
    }

    // Emit socket event for teams refreshed
    try {
      const io = getIO();
      io.emit('teamsRefreshed', { message: 'Teams refreshed from source JSON', count: teams.length });
    } catch (socketError) {
      console.error('Socket emission failed:', socketError);
    }

    res.status(200).json({ 
      message: 'Teams refreshed successfully!', 
      count: teams.length 
    });
  } catch (error) {
    console.error('Error refreshing teams:', error);
    res.status(500).json({ error: error.message });
  }
};
