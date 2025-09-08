import { Router} from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { getProfile, getLogoImage, getStatistics, getAircrafts, getRoutes, getBestRoutes } from '../controllers/compagniaController';

const compagniaRouter = Router();

compagniaRouter.get('/profile', getProfile);
compagniaRouter.get('/uploads/logo/:filename', requireAuth, requireRole('COMPAGNIA'), getLogoImage);
compagniaRouter.get('/statistics', getStatistics);
compagniaRouter.get('/aircrafts', getAircrafts);
compagniaRouter.get('/routes', getRoutes);
compagniaRouter.get('/routes/best', getBestRoutes); 

export default compagniaRouter;