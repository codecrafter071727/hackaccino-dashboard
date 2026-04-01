const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

router.get('/', teamController.getTeams);
router.put('/:id', teamController.updateTeamStatus);
router.put('/:id/assign-room', teamController.assignRoom);
router.patch('/:id/attendance', teamController.toggleAttendance);
router.patch('/:id/idcard', teamController.toggleIdCard);
router.patch('/:id/members', teamController.updateMembers);
router.post('/verify-qr', teamController.verifyQR);

module.exports = router;
