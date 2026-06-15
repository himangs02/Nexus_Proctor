import express from 'express';
import { executeCode, judgeCode, getLanguages, getTemplates } from '../controllers/compilerController.js';

const router = express.Router();

router.post('/execute',   executeCode);
router.post('/judge',     judgeCode);
router.get('/languages',  getLanguages);
router.get('/templates',  getTemplates);

export default router;
