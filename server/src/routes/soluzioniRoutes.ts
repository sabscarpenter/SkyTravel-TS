import { Router } from "express";
import { getSolutions } from "../controllers/soluzioniController";

const soluzioniRouter = Router();

soluzioniRouter.get("/ricerca", getSolutions);

export default soluzioniRouter;
