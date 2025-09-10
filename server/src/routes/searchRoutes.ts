import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { leadService } from '../services/leadService.js';

const router = Router();

router.use(authenticate);

router.get('/suggestions', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ data: [] });
    const data = await leadService.suggestions(q);
    res.json({ data });
  } catch (e) { next(e); }
});

export default router;

