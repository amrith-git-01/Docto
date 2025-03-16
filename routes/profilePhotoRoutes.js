const express = require('express');
const profilePhotoController = require('../controllers/profilePhotoController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.post('/upload', profilePhotoController.upload);

router.patch('/modify', profilePhotoController.modify);

router.delete('/remove', profilePhotoController.remove);

module.exports = router;
