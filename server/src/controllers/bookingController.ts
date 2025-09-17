import { Request, Response } from "express";
import { pool } from "../db";

export async function getModelConfiguration(req: Request, res: Response) {
  try {
    const nome = (req.query.nome as string)?.trim();
    if (!nome) return res.status(400).json({ message: 'Parametro nome mancante' });

    const result = await pool.query(
      'SELECT nome, posti_economy, posti_business, posti_first, layout FROM modelli WHERE nome = $1',
      [nome]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Modello non trovato' });
    }
    const r = result.rows[0];
    const model = {
      nome: r.nome,
      totale_posti: r.posti_economy + r.posti_business + r.posti_first,
      posti_economy: r.posti_economy,
      posti_business: r.posti_business,
      posti_first: r.posti_first,
      layout: r.layout
    };
    res.json(model);
  } catch (error: any) {
    console.error('Errore fetching modello posti:', error);
    res.status(500).json({ message: 'Errore server nel recupero della configurazione del modello', error: error.message });
  }
}

export async function getOccupiedSeats(req: Request, res: Response) {
const client = await pool.connect();
    try {
        const { volo } = req.query;
        const id = req.user?.sub;

        if (!volo) return res.status(400).json({ error: "Parametro volo obbligatorio" });
        if (!id) return res.status(401).json({ error: "Non autorizzato" });

        const result = await client.query(
            `
            SELECT posto 
            FROM biglietti 
            WHERE volo = $1 
                AND (scadenza IS NULL OR (scadenza >= NOW() AND utente != $2))
            `, [volo, id]
        );

        const occupied = result.rows.map(r => r.posto).sort();

        return res.status(200).json({ occupied });
    } catch (error: any) {
        console.error("Errore nel recupero dei posti occupati:", error);
        return res.status(500).json({ error: error.message });
    }
}

export async function reserveSeats(req: Request, res: Response) {
    try {
        await pool.query("BEGIN");

        const tickets = req.body;
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ error: "Non autorizzato" });

        if (!tickets || tickets.length === 0) {
            return res.status(400).json({ error: "I biglietti da trattenere sono obbligatori" });
        }

        const volo = tickets[0].volo;
        if (!volo) return res.status(400).json({ error: "Volo mancante" });

        const postiRichiesti = tickets.map((t: any) => t.posto).filter((p: string) => p);

        if (postiRichiesti.length === 0) {
        return res.status(400).json({ error: "Nessun posto specificato" });
        }

        await pool.query(
            `
            DELETE FROM biglietti
            WHERE scadenza IS NOT NULL
                AND scadenza < NOW()
                AND volo = $1
            `, [volo]
        );

        await pool.query(
            `
            DELETE FROM biglietti
            WHERE scadenza IS NOT NULL
                AND volo = $1
                AND utente = $2
            `, [volo, userId]
        );

        const occupatiRes = await pool.query(
            `
            SELECT posto
            FROM biglietti
            WHERE volo = $1
                AND posto = ANY($2)
                AND (scadenza IS NULL OR scadenza >= NOW())
            `, [volo, postiRichiesti]
        );

        if (occupatiRes.rowCount! > 0) {
            const occupati = occupatiRes.rows.map(r => r.posto).join(", ");
            await pool.query("ROLLBACK");
            return res.status(409).json({
                message: `Uno o più posti sono già occupati: ${occupati}`,
            });
        }

        const mappaClasse: Record<string, string> = {
            economy: "e",
            business: "b",
            first: "f",
            e: "e",
            b: "b",
            f: "f",
        };

        for (const ticket of tickets) {
            const classeRaw = (ticket.classe || "").toLowerCase();
            const classe = mappaClasse[classeRaw];
            if (!classe) {
                await pool.query("ROLLBACK");
                return res.status(400).json({
                error: `Classe non valida: ${ticket.classe}`,
                });
            }

            const numero = `${ticket.volo}-${ticket.posto}`;
            await pool.query(
                `
                INSERT INTO biglietti
                (numero, classe, prezzo, posto, volo, utente, nome, cognome, bagagli, scadenza)
                VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '15 minutes')
                `, [ numero, classe, ticket.prezzo, ticket.posto, volo,
                    userId, ticket.nome, ticket.cognome, ticket.bagagli ]
            );
        }

        await pool.query("COMMIT");
        return res.status(200).json({ success: true });
    } catch (err: any) {
        await pool.query("ROLLBACK");
        console.error("Errore in POST /trattieni:", err);
        return res.status(500).json({
            message: "Errore server nel tentativo di trattenere i posti.",
            error: err.message,
        });
    }
}