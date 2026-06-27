const { Router } = require('express');
const campanhasController = require('../../modules/campanhas/campanhas.controller');

const router = Router();

router.get('/', campanhasController.listPublic);
router.get('/:slug', campanhasController.getPublicBySlug);

module.exports = router;
