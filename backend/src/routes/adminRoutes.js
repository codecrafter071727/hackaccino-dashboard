
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

module.exports = router;
