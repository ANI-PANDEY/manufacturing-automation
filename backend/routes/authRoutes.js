const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authController.getMe);
router.put('/profile', authController.updateProfile);

module.exports = router;
