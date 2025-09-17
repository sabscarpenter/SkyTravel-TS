import { Router } from 'express';
import { getAeroporti } from '../controllers/aeroportiController';

const aeroportiRouter = Router();

aeroportiRouter.get("/list", getAeroporti);

export default aeroportiRouter;