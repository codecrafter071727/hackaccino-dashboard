const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

router.get('/', teamController.getTeams);
router.put('/:id', teamController.updateTeamStatus);

module.exports = router;
