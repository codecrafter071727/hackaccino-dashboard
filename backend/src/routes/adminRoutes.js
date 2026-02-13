
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Route to assign a new role
router.post('/assign-role', adminController.assignRole);

// Route to get all assigned roles
router.get('/assignments', adminController.getAssignments);

// Route for Staff Login
router.post('/staff-login', adminController.staffLogin);

// Route to add a judge
router.post('/add-judge', adminController.addJudge);

// Route to create a room
router.post('/create-room', adminController.createRoom);

// Route to assign a volunteer to a room
router.post('/assign-volunteer-room', adminController.assignVolunteerRoom);

module.exports = router;
