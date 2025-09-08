import { Router } from 'express';
import { getAeroporti } from '../controllers/aeroportiController';

export const aeroportiRouter = Router();

// GET /api/aeroporti
aeroportiRouter.get("/list", getAeroporti);

export default aeroportiRouter;