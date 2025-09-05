import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from 'path';
import authRoutes from './routes/authRoutes';
import protectedRoutes from './routes/protectedRoutes';
import { passeggeroRouter } from './routes/passeggero';

dotenv.config();

const app: Application = express();
const PORT: number = 3000;

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:4200'],
  credentials: true,
}));

app.use('/auth', authRoutes);

// Static for uploaded profile pictures
app.use('/api/passeggero/uploads/profile-pictures', express.static(path.join(process.cwd(), 'uploads', 'profile-pictures')));

// API routes
app.use('/api/passeggero', passeggeroRouter);

// Rotta di prova
app.get("/", (req: Request, res: Response) => {
  res.send("Backend funzionante 🚀");
});

// Avvio server
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});