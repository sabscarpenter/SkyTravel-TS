import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { getProfile, getLogoImage, getStatistics, getAircrafts, getRoutes, 
         getBestRoutes, getFlights, addFlights, addRoute, deleteRoute, setupCompany,
         getModels, addAircraft, deleteAircraft } from '../controllers/compagniaController';

const compagniaRouter = Router();

compagniaRouter.get('/profile', requireAuth, requireRole('COMPAGNIA'), getProfile);
compagniaRouter.post('/setup', requireAuth, requireRole('COMPAGNIA'), setupCompany);
compagniaRouter.get('/uploads/compagnie/:filename', getLogoImage);
compagniaRouter.get('/statistics', requireAuth, requireRole('COMPAGNIA'), getStatistics);
compagniaRouter.get('/aircrafts', requireAuth, requireRole('COMPAGNIA'), getAircrafts);
compagniaRouter.post('/aircrafts', requireAuth, requireRole('COMPAGNIA'), addAircraft);
compagniaRouter.delete('/aircrafts/:numero', requireAuth, requireRole('COMPAGNIA'), deleteAircraft);
compagniaRouter.get('/models', requireAuth, requireRole('COMPAGNIA'), getModels);
compagniaRouter.get('/routes', requireAuth, requireRole('COMPAGNIA'), getRoutes);
compagniaRouter.get('/routes/best', requireAuth, requireRole('COMPAGNIA'), getBestRoutes);
compagniaRouter.get('/flights', requireAuth, requireRole('COMPAGNIA'), getFlights);
compagniaRouter.post('/flights', requireAuth, requireRole('COMPAGNIA'), addFlights);
compagniaRouter.post('/routes', requireAuth, requireRole('COMPAGNIA'), addRoute);
compagniaRouter.delete('/routes/:numero', requireAuth, requireRole('COMPAGNIA'), deleteRoute);

export default compagniaRouter;