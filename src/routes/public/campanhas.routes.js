const { Router } = require('express');
const campanhasController = require('../../modules/campanhas/campanhas.controller');

const router = Router();

router.get('/', campanhasController.listPublic);
router.get('/:slug/esteira', campanhasController.getEsteiraBySlug);
router.get('/:slug/esteira/stream', campanhasController.streamEsteiraBySlug);
router.get('/:slug', campanhasController.getPublicBySlug);

module.exports = router;
