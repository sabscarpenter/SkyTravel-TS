import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app: Application = express();
const PORT: number = 3000;

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:4200"],
  credentials: true
}));

// Rotta di prova
app.get("/", (req: Request, res: Response) => {
  res.send("Backend funzionante 🚀");
});

// Avvio server
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});