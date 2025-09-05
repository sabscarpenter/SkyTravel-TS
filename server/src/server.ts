import express, { Application, Request, Response } from "express";

const app: Application = express();
const PORT: number = 3000;

// Rotta di prova
app.get("/", (req: Request, res: Response) => {
  res.send("Backend funzionante 🚀");
});

// Avvio server
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});