import { Request, Response } from 'express';
import { pool } from '../db';

export async function getAeroporti(req: Request, res: Response) {
    try {
        const rows = await pool.query("SELECT * FROM aeroporti ORDER BY nazione");

        let perNazione = new Map<string, any[]>();
        rows.rows.forEach((row) => {
            const nazione = row.nazione;
            if (!perNazione.has(nazione)) {
                perNazione.set(nazione, []);
            }
            perNazione.get(nazione)?.push({
                iata: row.codice_IATA,
                name: row.nome,
                city: row.citta,
                country: row.nazione,
            });
        });
        res.json(Array.from(perNazione.entries()).map(([nazione, aeroporti]) => ({ nazione, aeroporti })));
        
    } catch (error: any) {
        console.error("Errore nel recupero degli aeroporti:", error);
        res.status(500).json({ message: "Errore interno del server", error: error.message });
    }
}

