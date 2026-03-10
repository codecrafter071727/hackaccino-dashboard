
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Route to assign a new role
router.post('/assign-role', adminController.assignRole);

// Route to get all assigned roles
router.get('/assignments', adminController.getAssignments);

// Route for Staff Login
router.post('/staff-login', adminController.staffLogin);

// Route to create a room
router.post('/create-room', adminController.createRoom);

// Route to get all rooms
router.get('/rooms', adminController.getRooms);

// Route to assign a volunteer to a room
router.post('/assign-volunteer-room', adminController.assignVolunteerRoom);

// Route to get all volunteers
router.get('/volunteers', adminController.getVolunteers);

// Route to update volunteer presence
router.patch('/update-volunteer-presence', adminController.updateVolunteerPresence);

module.exports = router;
