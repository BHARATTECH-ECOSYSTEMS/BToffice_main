const express = require('express');
const router = express.Router();
const { getUsers, getUser } = require('../controllers/userController');
const auth = require('../middleware/auth');

router.get('/', auth, getUsers);
router.get('/:id', auth, getUser);

module.exports = router;