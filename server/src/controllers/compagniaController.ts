import { pool } from '../db';
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';

export async function setupCompany(req: Request, res: Response) {
    const userId = req.user!.sub;
    const { nome, codiceIATA, contatto, nazione, password } = req.body;
    if (!nome || !codiceIATA || !contatto || !nazione || !password) {
        return res.status(400).json({ message: 'Parametri mancanti' });
    }
    if (codiceIATA.length !== 2 || codiceIATA.toUpperCase() !== codiceIATA) {
        return res.status(400).json({ message: 'Codice IATA non valido' });
    }
    if (!/^[+]?([0-9 ]+)$/.test(contatto) || contatto.replace(/\s+/g,'').length < 7) {
        return res.status(400).json({ message: 'Telefono non valido' });
    }
    try {
        const exists = await pool.query('SELECT 1 FROM compagnie WHERE utente = $1', [userId]);
        if (exists.rowCount) return res.status(409).json({ message: 'Profilo già configurato' });
        const hash = await bcrypt.hash(password, 12);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE utenti SET password = $1 WHERE id = $2', [hash, userId]);
            await client.query(
                'INSERT INTO compagnie (utente, nome, "codice_IATA", contatto, nazione) VALUES ($1,$2,$3,$4,$5)',
                [userId, nome, codiceIATA, contatto, nazione]
            );
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        return res.status(201).json({ nome, codice_iata: codiceIATA, contatto, nazione });
    } catch (error) {
        console.error('Errore setup compagnia:', error);
        return res.status(500).json({ message: 'Errore interno del server' });
    }
}

export async function getProfile(req: Request, res: Response) {
    try {
        const id  = req.user!.sub;
        const query = await pool.query(
            'SELECT c.nome, c."codice_IATA" AS codice_iata, c.contatto, c.nazione, u.foto FROM compagnie c JOIN utenti u ON c.utente = u.id WHERE u.id = $1',
            [id]
        );
        if (query.rowCount === 0) {
            return res.status(404).json({ code: 'PROFILE_MISSING', message: 'Profilo compagnia non configurato' });
        }
        const row = query.rows[0];
        return res.json({
            nome: row.nome,
            codice_iata: row.codice_iata,
            contatto: row.contatto,
            nazione: row.nazione,
            foto: row.foto || ''
        });
    } catch (error) {
        console.error('Errore recupero profilo compagnia:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
}

const uploadsDir = path.join(process.cwd(), 'uploads', 'compagnie');
export async function getLogoImage(req: Request, res: Response) { 
    try {
        const { filename } = req.params;
        const filePath = path.join(uploadsDir, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Logo non trovato' });
        }
        res.sendFile(filePath);
    } catch (error) {
        console.error('Errore recupero logo compagnia:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
}

export async function getStatistics(req: Request, res: Response) {
    try {
        const id = req.user!.sub; 

        const numDestResult = await pool.query(
            `
            SELECT COUNT(DISTINCT t.arrivo) AS num_dest
            FROM tratte t
            WHERE t.compagnia = $1
            `, [id]
        );
        const numDest = parseInt(numDestResult.rows[0].num_dest, 10) || 0;

        const numAereiResult = await pool.query(
            `SELECT COUNT(*) AS num_aerei FROM aerei WHERE compagnia = $1`, [id]
        );
        const numAerei = parseInt(numAereiResult.rows[0].num_aerei, 10) || 0;

        const numVoliOggiResult = await pool.query(
            `
            SELECT COUNT(*) AS num_voli
            FROM voli v
            JOIN aerei a ON v.aereo = a.numero
            WHERE a.compagnia = $1
                AND v.data_ora_partenza >= CURRENT_DATE
                AND v.data_ora_partenza < CURRENT_DATE + interval '1 day'
            `, [id]
        );
        const numVoliOggi = parseInt(numVoliOggiResult.rows[0].num_voli, 10) || 0;

        const numPasseggeriResult = await pool.query(
            `
            SELECT COUNT(*) AS num_passeggeri
            FROM biglietti b
            JOIN voli v ON b.volo = v.numero
            JOIN aerei a ON v.aereo = a.numero
            WHERE a.compagnia = $1
            `, [id]
        );
        const numPasseggeri = parseInt(numPasseggeriResult.rows[0].num_passeggeri, 10) || 0;

        const ricaviMeseResult = await pool.query(
            `
            SELECT COALESCE(SUM(b.prezzo), 0) AS ricavi_mese
            FROM biglietti b
            JOIN voli v ON b.volo = v.numero
            JOIN aerei a ON v.aereo = a.numero
            WHERE a.compagnia = $1
                AND v.data_ora_partenza >= date_trunc('month', CURRENT_DATE)
                AND v.data_ora_partenza < date_trunc('month', CURRENT_DATE + interval '1 month')
            `, [id]
        );
        const ricaviMese = parseFloat(ricaviMeseResult.rows[0].ricavi_mese) || 0;

        const ricaviTotResult = await pool.query(
            `
            SELECT COALESCE(SUM(b.prezzo), 0) AS ricavi_tot
            FROM biglietti b
            JOIN voli v ON b.volo = v.numero
            JOIN aerei a ON v.aereo = a.numero
            WHERE a.compagnia = $1
            `, [id]
        );
        const ricaviTot = parseFloat(ricaviTotResult.rows[0].ricavi_tot) || 0;

        return res.json({
            numero_destinazioni: numDest,
            numero_aerei: numAerei,
            numero_voli_oggi: numVoliOggi,
            numero_passeggeri: numPasseggeri,
            ricavi_mensili: ricaviMese,
            ricavi_totali: ricaviTot,
        });
    } catch (error) {
        console.error('Errore recupero statistiche:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
}

export async function getAircrafts(req: Request, res: Response) {
    try {
        const id = req.user!.sub;
        const result = await pool.query('SELECT * FROM aerei JOIN modelli ON aerei.modello = modelli.nome WHERE aerei.compagnia = $1', [id]);
        const aircrafts = result.rows.map(row => ({
            numero: row.numero,
            modello: row.modello,
            posti_economy: row.posti_economy,
            posti_business: row.posti_business,
            posti_first: row.posti_first
        }));
        res.json(aircrafts);
    } catch (error) {
        console.error('Errore recupero aerei:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
}

export async function getRoutes(req: Request, res: Response) {
    try {
        const id = req.user!.sub;

        const result = await pool.query(
            `
            SELECT t.numero, t.partenza, t.arrivo, t.durata_minuti, t.distanza,
                    ap.nome AS partenza_nome, aa.nome AS arrivo_nome
            FROM tratte t
            JOIN aeroporti ap ON t.partenza = ap."codice_IATA"
            JOIN aeroporti aa ON t.arrivo = aa."codice_IATA"
            WHERE t.compagnia = $1
            ORDER BY t.numero
            `, [id]
        );

        const routes = result.rows.map(r => ({
            numero: r.numero,
            partenza: r.partenza,
            arrivo: r.arrivo,
            durata_min: r.durata_minuti,
            lunghezza_km: r.distanza,
            partenza_nome: r.partenza_nome,
            arrivo_nome: r.arrivo_nome,
        }));

        return res.status(200).json(routes);
    } catch (err: any) {
        console.error("Errore in get_company_routes:", err);
        return res.status(500).json({
            message: "Errore server durante il recupero delle tratte",
            error: err.message,
        });
    }
}

export async function getBestRoutes(req: Request, res: Response) {
    try {
        const id = req.user!.sub;
 
        const result = await pool.query(
            `
            WITH flights AS (
                SELECT  v.numero AS volo_numero,
                        v.tratta AS tratta_numero,
                        (m.posti_economy + m.posti_business + m.posti_first) AS seats
                FROM voli v
                JOIN aerei a   ON v.aereo = a.numero
                JOIN modelli m ON a.modello = m.nome
                WHERE a.compagnia = $1
            ),
            seats_by_route AS (
                SELECT f.tratta_numero, SUM(f.seats) AS posti_totali
                FROM flights f
                GROUP BY f.tratta_numero
            ),
            passengers_by_route AS (
                SELECT v.tratta AS tratta_numero, COUNT(b.numero) AS passeggeri_totali
                FROM voli v
                JOIN biglietti b ON b.volo = v.numero
                JOIN aerei a ON v.aereo = a.numero
                WHERE a.compagnia = $1
                GROUP BY v.tratta
            )
            SELECT t.partenza, t.arrivo,
                COALESCE(p.passeggeri_totali, 0) AS passeggeri_totali,
                COALESCE(s.posti_totali, 0)      AS posti_totali
            FROM tratte t
            JOIN seats_by_route s           ON s.tratta_numero = t.numero
            LEFT JOIN passengers_by_route p ON p.tratta_numero = t.numero
            WHERE t.compagnia = $1
            ORDER BY passeggeri_totali DESC
            LIMIT 5;
            `, [id]
        );

        const bestRoutes = result.rows.map(r => ({
            partenza: r.partenza,
            arrivo: r.arrivo,
            passeggeri_totali: parseInt(r.passeggeri_totali, 10) || 0,
            posti_totali: parseInt(r.posti_totali, 10) || 0,
            riempimento_percent: r.posti_totali > 0 ? ((r.passeggeri_totali / r.posti_totali) * 100): "0.00"
        }));

        return res.status(200).json(bestRoutes);
    } catch (err: any) {
        console.error("Errore in get_best_routes:", err);
        return res.status(500).json({
            message: "Errore server durante il recupero delle tratte migliori",
            error: err.message,
        });
    }
}


export async function getFlights(req: Request, res: Response) {
    try {
        const id = req.user!.sub;
        if (!id) return res.status(400).json({ message: "Non autorizzato" });

        const soldRows = await pool.query(
            `
            SELECT b.volo, COUNT(b.numero) AS cnt
            FROM biglietti b
            JOIN voli v ON b.volo = v.numero
            JOIN aerei a ON v.aereo = a.numero
            WHERE a.compagnia = $1
            GROUP BY b.volo
            `, [id]
        );

        const soldMap: Record<string, number> = {};
        for (const row of soldRows.rows) {
            soldMap[row.volo] = parseInt(row.cnt, 10);
        }

        const result = await pool.query(
            `
            SELECT v.numero, v.tratta, v.data_ora_partenza,
                    a.modello, m.posti_economy, m.posti_business, m.posti_first,
                    t.durata_minuti
            FROM voli v
            JOIN aerei a ON v.aereo = a.numero
            JOIN modelli m ON a.modello = m.nome
            JOIN tratte t ON v.tratta = t.numero
            WHERE a.compagnia = $1
            ORDER BY v.data_ora_partenza
        `, [id]
        );

        const flights = result.rows.map(row => {
            const postiTotali = row.posti_economy + row.posti_business + row.posti_first;
            const postiOccupati = soldMap[row.numero] || 0;
            const postiDisponibili = postiTotali - postiOccupati;

            const dtPart = new Date(row.data_ora_partenza);
            const dtArr = new Date(dtPart.getTime() + row.durata_minuti * 60 * 1000);

            const partenza = dtPart.toISOString().slice(0, 16).replace("T", " ");
            const arrivo = dtArr.toISOString().slice(0, 16).replace("T", " ");

            return {
                numero: row.numero,
                partenza,
                arrivo,
                tratta_id: row.tratta,
                aereo_nome: row.modello,
                posti_disponibili: postiDisponibili,
            };
        });

        return res.status(200).json(flights);
    } catch (err: any) {
        console.error("Errore in get_company_flights:", err);
        return res.status(500).json({
            message: "Errore server durante il recupero dei voli",
            error: err.message,
        });
    }
}

export async function addRoute(req: Request, res: Response) {
    try {
        const id = req.user!.sub;
        const data = req.body;
        if ( !data.numero || !data.partenza || !data.arrivo || !data.durata_min || !data.lunghezza_km ) {
            return res.status(400).json({ message: "Parametri mancanti" });
        }

        await pool.query(
            `
            INSERT INTO tratte (numero, partenza, arrivo, durata_minuti, distanza, compagnia)
            VALUES ($1, $2, $3, $4, $5, $6)
            `, [ data.numero, data.partenza, data.arrivo, data.durata_min, data.lunghezza_km, id ]
        );

        return res.status(201).json({ message: "Tratta aggiunta con successo" });
    } catch (err: any) {
        console.error("Errore in POST /routes:", err);
        return res.status(500).json({
            message: "Errore server durante l'inserimento della tratta",
            error: err.message,
        });
    }
}

export async function deleteRoute(req: Request, res: Response) {
    try {
        const id = req.user!.sub;
        if (!id) return res.status(400).json({ message: "Non autorizzato" });

        const { numero } = req.params;

        const result = await pool.query(
            `
            DELETE FROM tratte
            WHERE numero = $1 AND compagnia = $2
            RETURNING *
            `, [numero, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Tratta non trovata" });
        }

        return res.status(200).json(result.rows[0]);
    } catch (err: any) {
        console.error("Errore in delete_route:", err);
        return res.status(500).json({
            message: "Errore server durante la cancellazione della tratta",
            error: err.message,
        });
    }
}

export async function addFlights(req: Request, res: Response) {
    try {
        const id = req.user!.sub;
        if (!id) return res.status(400).json({ message: "Non autorizzato" });

        const { routeNumber, aircraftNumber, frequency, departureTime, days, startDate, weeksCount=1 } = req.body;
        if ( !routeNumber || !aircraftNumber || !frequency || !departureTime || !startDate ) {
            return res.status(400).json({ message: "Parametri mancanti" });
        }

        let startDt: Date;
        let depHour: number, depMin: number;
        const [y, m, d] = startDate.split("-").map((x: string) => parseInt(x, 10));
        startDt = new Date(y, m - 1, d);
        const [hh, mm] = departureTime.split(":").map((x: string) => parseInt(x, 10));
        depHour = hh;
        depMin = mm;

        const createDates: Date[] = [];
        if (frequency === "giornaliero") {
            const totalDays = weeksCount * 7;
            for (let offset = 0; offset < totalDays; offset++) {
                const dte = new Date(startDt);
                dte.setDate(startDt.getDate() + offset);
                createDates.push(dte);
            }
        } else {
            const dayMap: Record<string, number> = {
                Lun: 0, Mar: 1, Mer: 2, Gio: 3, Ven: 4, Sab: 5, Dom: 6,
            };

            const desiredIdxs = (days || []).map((d: string) => dayMap[d])
                                .filter((x: number | undefined) => x !== undefined)
                                .sort((a: number, b: number) => a - b);

            if (!desiredIdxs.length) {
                return res.status(400).json({ error: "Giorni settimanali non validi." });
            }

            const startWd = startDt.getDay();
            for (let w = 0; w < weeksCount; w++) {
                const base = new Date(startDt);
                base.setDate(startDt.getDate() + w * 7);

                for (const di of desiredIdxs) {
                    let delta = (di - (startWd === 0 ? 6 : startWd - 1)) % 7;
                    if (delta < 0) delta += 7;

                    let target = new Date(base);
                    target.setDate(base.getDate() + delta);

                    if (w === 0 && target < startDt) {
                        target.setDate(target.getDate() + 7);
                    }
                    createDates.push(target);
                }
            }
        }

        const prefix = `${routeNumber}-`;

        const maxRes = await pool.query(
            `
            SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM '([0-9]{6})$') AS INT)), 0) AS max_seq
            FROM voli
            WHERE numero LIKE $1
            `, [prefix + "%"]
        );

        let nextSeq = (maxRes.rows[0]?.max_seq || 0) + 1;

        const created: string[] = [];
        for (const dte of createDates) {
            const dt = new Date(dte);
            dt.setHours(depHour, depMin, 0, 0);

            const numero = `${prefix}${String(nextSeq).padStart(6, "0")}`;
            nextSeq++;

            await pool.query(
                `
                INSERT INTO voli (numero, aereo, tratta, data_ora_partenza)
                VALUES ($1, $2, $3, $4)
                `,
                [numero, aircraftNumber, routeNumber, dt.toISOString()]
            );

            created.push(numero);
        }

        return res.status(201).json({
            message: "Voli aggiunti con successo",
            created,
        });
    } catch (err: any) {
        console.error("Errore in POST /flights:", err);
        return res.status(500).json({
        message: "Errore server durante l'inserimento dei voli.",
        error: err.message,
        });
    }
}

export async function getModels(req: Request, res: Response) {
    try {
        const result = await pool.query(
            'SELECT nome, sigla FROM modelli ORDER BY nome'
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Errore recupero modelli aerei:', error);
        return res.status(500).json({ message: 'Errore interno del server' });
    }
}

export async function addAircraft(req: Request, res: Response) {
    try {
        const compagniaId = req.user!.sub;
        const { modello } = req.body as { modello?: string };
        if (!modello) return res.status(400).json({ message: 'modello è obbligatorio' });

        const compRes = await pool.query('SELECT "codice_IATA" AS iata FROM compagnie WHERE utente = $1', [compagniaId]);
        if (compRes.rowCount === 0) return res.status(400).json({ message: 'Profilo compagnia non configurato' });
        const iata: string = compRes.rows[0].iata;

        const modRes = await pool.query('SELECT sigla FROM modelli WHERE nome = $1', [modello]);
        if (modRes.rowCount === 0) return res.status(400).json({ message: 'Modello inesistente' });
        const sigla: string = modRes.rows[0].sigla;

        const prefix = `${iata}-${sigla}-`;

        const seqRes = await pool.query(
            `SELECT TO_CHAR(COALESCE(MAX(CAST(SPLIT_PART(numero, '-', 3) AS INT)), 0) + 1, 'FM000') AS next_seq
             FROM aerei
             WHERE compagnia = $1 AND numero LIKE $2`,
            [compagniaId, `${prefix}%`]
        );
        const nextSeqPadded: string = seqRes.rows[0]?.next_seq || '001';
        const numero = `${prefix}${nextSeqPadded}`;

        await pool.query(
            'INSERT INTO aerei (numero, modello, compagnia) VALUES ($1, $2, $3)',
            [numero, modello, compagniaId]
        );

        return res.status(201).json({ numero, modello });
    } catch (error) {
        console.error('Errore creazione aereo:', error);
        return res.status(500).json({ message: 'Errore interno del server' });
    }
}

export async function deleteAircraft(req: Request, res: Response) {
    try {
        const compagniaId = req.user!.sub;
        const { numero } = req.params as { numero: string };
        if (!numero) return res.status(400).json({ message: 'Numero aereo mancante' });

        const ownRes = await pool.query(
            'SELECT 1 FROM aerei WHERE numero = $1 AND compagnia = $2',
            [numero, compagniaId]
        );
        if (ownRes.rowCount === 0) {
            return res.status(404).json({ message: 'Aereo non trovato' });
        }
        
        await pool.query(
            'DELETE FROM aerei WHERE numero = $1 AND compagnia = $2',
            [numero, compagniaId]
        );

        return res.status(200).json({ message: 'Aereo eliminato' });
    } catch (error: any) {
        console.error('Errore eliminazione aereo:', error);
        return res.status(500).json({ message: 'Errore interno del server', error: error?.message });
    }
}
