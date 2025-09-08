import { pool } from '../db';
import { Request, Response } from 'express';
import { parseISO, addMinutes, addHours, differenceInMinutes } from 'date-fns';
import path from 'path';
import fs from 'fs';
import compagniaRouter from '../routes/compagniaRoutes';

export async function getProfile(req: Request, res: Response) {
    try {
        const id  = req.user!.sub;
        const query = await pool.query('SELECT * FROM compagnie c JOIN utenti u ON c.utente = u.id WHERE u.id = $1', [id]);
        if (!query) {
            return res.status(404).json({ message: 'Compagnia non trovata' });
        }
        const result = {
            nome: query.rows[0].nome,
            codice_iata: query.rows[0].codice_iata,
            contatto: query.rows[0].contatto,
            nazione: query.rows[0].nazione,
            foto: query.rows[0].foto
        };

        res.json(result);
    } catch (error) {
        console.error('Errore recupero profilo compagnia:', error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
}

const uploadsDir = path.join(process.cwd(), 'uploads', 'logo');
// DA VERIFICARE
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

        // numero destinazioni uniche
        const numDestResult = await pool.query(
            `
            SELECT COUNT(DISTINCT t.arrivo) AS num_dest
            FROM tratte t
            WHERE t.compagnia = $1
            `, [id]
        );
        const numDest = parseInt(numDestResult.rows[0].num_dest, 10) || 0;

        // numero aerei
        const numAereiResult = await pool.query(
            `SELECT COUNT(*) AS num_aerei FROM aerei WHERE compagnia = $1`, [id]
        );
        const numAerei = parseInt(numAereiResult.rows[0].num_aerei, 10) || 0;

        // numero voli di oggi
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

        // numero passeggeri (biglietti emessi)
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

        // ricavi mese corrente
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

        // ricavi totali
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
        const result = await pool.query('SELECT * FROM aerei WHERE compagnia = $1', [id]);
        const aircrafts = result.rows.map(row => ({
            numero: row.numero,
            modello: row.modello
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
        if (!id) {
            return res.status(401).json({ message: "Non autorizzato" });
        }

        // Query alle tratte della compagnia
        const result = await pool.query(
            `
            SELECT t.numero, t.partenza, t.arrivo, t.durata_minuti, t.distanza,
                    ap.nome AS partenza_nome, aa.nome AS arrivo_nome
            FROM tratte t
            JOIN aeroporti ap ON t.partenza = ap.codice
            JOIN aeroporti aa ON t.arrivo = aa.codice
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
        if (!id) {
            return res.status(401).json({ message: "Non autorizzato" });
        }
        // Query alle tratte della compagnia con più biglietti venduti
        const result = await pool.query(
            `
            SELECT t.numero, t.partenza, t.arrivo, t.durata_minuti, t.distanza,
                     ap.nome AS partenza_nome, aa.nome AS arrivo_nome,
                     COUNT(b.id) AS biglietti_venduti
            FROM tratte t
            JOIN aeroporti ap ON t.partenza = ap.codice
            JOIN aeroporti aa ON t.arrivo = aa.codice
            LEFT JOIN biglietti b ON t.numero = b.tratta
            WHERE t.compagnia = $1
            GROUP BY t.numero, t.partenza, t.arrivo, t.durata_minuti, t.distanza, ap.nome, aa.nome
            ORDER BY biglietti_venduti DESC
            LIMIT 5
            `, [id]
        );

        const bestRoutes = result.rows.map(r => ({
            numero: r.numero,
            partenza: r.partenza,
            arrivo: r.arrivo,
            durata_min: r.durata_minuti,
            lunghezza_km: r.distanza,
            partenza_nome: r.partenza_nome,
            arrivo_nome: r.arrivo_nome,
            biglietti_venduti: r.biglietti_venduti
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
