
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Route to assign a new role
router.post('/assign-role', adminController.assignRole);

// Route to get all assigned roles
router.get('/assignments', adminController.getAssignments);

// Route for Staff Login
router.post('/staff-login', adminController.staffLogin);

// Route to create a new room
router.post('/create-room', adminController.createRoom);

// Route to get rooms
router.get('/rooms', adminController.getRooms);

// Route to get system stats
router.get('/stats', adminController.getStats);

// Route for volunteer room allocation
router.post('/assign-volunteer-room', adminController.assignVolunteerRoom);

// Route to get all volunteer assignments
router.get('/volunteers', adminController.getVolunteers);

// Route to update volunteer presence
router.patch('/update-volunteer-presence', adminController.updateVolunteerPresence);

module.exports = router;
