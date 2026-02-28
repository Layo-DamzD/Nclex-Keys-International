const express = require('express');
const router = express.Router();
const { getPublicLandingPageConfig } = require('../controllers/landingPageController');

router.get('/landing-page/:pageKey', getPublicLandingPageConfig);

module.exports = router;
