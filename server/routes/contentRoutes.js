const express = require('express');
const router = express.Router();
const { getPublicLandingPageConfig, createPublicTestLead } = require('../controllers/landingPageController');

router.get('/landing-page/:pageKey', getPublicLandingPageConfig);
router.post('/public-test/lead', createPublicTestLead);

module.exports = router;
