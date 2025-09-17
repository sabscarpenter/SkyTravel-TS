import { Request, Response } from 'express';
import { pool } from '../db';
import bcrypt from 'bcrypt';
import { getStripe, isStripeConfigured } from '../utils/stripe';

export async function getProfile(req: Request, res: Response) {
  try {
    const sub  = req.user!.sub;
    if (!sub) return res.status(400).json({ message: 'id Mancante' });

    const q = `SELECT u.id, u.email, p.nome, p.cognome, p.codice_fiscale, p.data_nascita, p.sesso, u.foto
                FROM utenti u
                JOIN passeggeri p ON p.utente = u.id
                WHERE u.id = $1`;

    const params = [sub];
    const { rows } = await pool.query(q, params);

    if (!rows.length) return res.status(404).json({ message: 'Passeggero non trovato' });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: 'Errore recupero profilo', error: err.message });
  }
}

export async function updateProfilePhoto(req: Request, res: Response) {
  try {
    const sub  = req.user!.sub;
    if (!sub) return res.status(400).json({ message: 'id Mancante' });
    const filename = (req.file && req.file.filename) || ''; 
    if (!filename) return res.status(400).json({ message: 'Nessun file caricato' });
    const q = 'UPDATE utenti SET foto = $1 WHERE id = $2';
    const params = [filename, sub];
    await pool.query(q, params);
    res.json({ message: 'Foto profilo aggiornata', filename });
  } catch (err: any) {
    res.status(500).json({ message: 'Errore aggiornamento foto profilo', error: err.message });
  }
}

export async function getReservations(req: Request, res: Response) {
  try {
    const sub  = req.user!.sub;
    if (!sub) return res.status(400).json({ message: 'id Mancante' });
    const query = `SELECT b.*, v.*, t.*, ap.citta AS citta_partenza, aa.citta AS citta_arrivo
                  FROM biglietti b
                  JOIN voli v ON b.volo = v.numero
                  JOIN tratte t ON v.tratta = t.numero
                  JOIN aeroporti ap ON t.partenza = ap."codice_IATA"
                  JOIN aeroporti aa ON t.arrivo = aa."codice_IATA"
                  WHERE b.utente = $1`;
    const { rows } = await pool.query(query, [sub]);

    const reservations = rows.map((row) => {
      let seat_class = row.classe === 'e' ? 'economy' : row.classe === 'b' ? 'business' : 'first';
      return {  
        firstName: row.nome,
        lastName: row.cognome,
        flightNumber: row.volo,
        from: row.partenza,
        to: row.arrivo,
        cityFrom: row.citta_partenza,
        cityTo: row.citta_arrivo,
        departureDate: row.data_partenza,
        departureTime: row.ora_partenza,
        seatNumber: row.posto,
        seatClass: seat_class,
        seatPrice: row.prezzo,
        extraBags: row.bagagli
      };
    });
    res.json(reservations);
  } catch (err: any) {
    res.status(500).json({ message: 'Errore recupero prenotazioni', error: err.message });
  }
}

export async function getStatistics(req: Request, res: Response) {
  try {
    const sub  = req.user!.sub;
    if (!sub) return res.status(400).json({ message: 'id Mancante' });
    let query = `SELECT COUNT(DISTINCT t.arrivo) AS visited_countries, COALESCE(SUM(t.distanza), 0) AS total_km, COUNT(v.numero) AS total_flights
                 FROM biglietti b
                 JOIN voli v ON b.volo = v.numero
                 JOIN tratte t ON v.tratta = t.numero
                 WHERE b.utente = $1`;
    let result = await pool.query(query, [sub]);

    query = `SELECT COUNT(*) AS flights_this_year FROM biglietti b
             JOIN voli v ON b.volo = v.numero
             WHERE b.utente = $1 AND EXTRACT(YEAR FROM v.data_ora_partenza) = EXTRACT(YEAR FROM CURRENT_DATE)`;
    let flights_this_year = await pool.query(query, [sub]);

    const stats = {
      totalFlights: result.rows[0].total_flights,
      visitedCountries: result.rows[0].visited_countries,
      kilometersFlown: result.rows[0].total_km,
      flightsThisYear: flights_this_year.rows[0].flights_this_year,
    };
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ message: 'Errore recupero statistiche', error: err.message });
  }
}

export async function updateEmail(req: Request, res: Response) {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email mancante' });
    const sub  = req.user!.sub;
    if (!sub) return res.status(400).json({ message: 'id Mancante' });
    if (!/\S+@\S+\.\S+/.test(email)) return res.status(404).json({ message: 'Email non valida' });

    try {
        const query = 'SELECT * FROM utenti WHERE email = $1';
        const { rows } = await pool.query(query, [email]);
        if (rows.length) return res.status(405).json({ message: 'Email già in uso' });
        
        const q = 'UPDATE utenti SET email = $1 WHERE id = $2';
        const params = [email, sub];
        await pool.query(q, params);
        res.json({ message: 'Email aggiornata con successo' });
    } catch (err: any) {
        return res.status(500).json({ message: 'Errore aggiornamento email', error: err.message });
    }
}

export async function updatePassword(req: Request, res: Response) {
    const { passwordAttuale, nuovaPassword } = req.body || {};
    if (!passwordAttuale || !nuovaPassword) return res.status(400).json({ message: 'Password mancanti' });
    const sub  = req.user!.sub;
    if (!sub) return res.status(400).json({ message: 'id Mancante' });

    try {
        const user = await pool.query('SELECT * FROM utenti WHERE id = $1', [sub]);
        if (!user.rows.length) return res.status(404).json({ message: 'Utente non trovato' });
        const isMatch = await bcrypt.compare(passwordAttuale, user.rows[0].password);
        if (!isMatch) return res.status(402).json({ message: 'Password attuale non valida' });

        const hashedNewPassword = await bcrypt.hash(nuovaPassword, 12);
        const query = 'UPDATE utenti SET password = $1 WHERE id = $2';
        await pool.query(query, [hashedNewPassword, sub]);
        res.json({ message: 'Password aggiornata con successo' });
    } catch (err: any) {
        return res.status(500).json({ message: 'Errore aggiornamento password', error: err.message });
    }
}

async function getOrCreateStripeCustomerByUserId(userId: number): Promise<string> {
  if (!isStripeConfigured()) throw new Error('Stripe non inizializzato');
    const q = `SELECT p.stripe, p.nome, p.cognome, u.email
              FROM passeggeri p JOIN utenti u ON u.id = p.utente
              WHERE p.utente = $1`;
    const { rows } = await pool.query(q, [userId]);
    if (!rows.length) throw new Error('Passeggero non trovato');
    const r = rows[0];
    if (r.stripe) return r.stripe;
  const customer = await getStripe().customers.create({
        email: r.email,
        name: `${r.nome} ${r.cognome}`,
        metadata: { app_user_id: userId.toString() }
    });
    try {
        await pool.query('UPDATE passeggeri SET stripe = $1 WHERE utente = $2', [customer.id, userId]);
    } catch (e) {
        console.error('[stripe] errore salvataggio customer id:', e);
    }
    return customer.id;
}

export async function createSetupIntent(req: Request, res: Response) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ error: 'Non autorizzato' });
    if (!isStripeConfigured()) return res.status(503).json({ error: 'Pagamento non configurato' });
        const customerId = await getOrCreateStripeCustomerByUserId(userId);
    const setupIntent = await getStripe().setupIntents.create({
            customer: customerId,
            payment_method_types: ['card'],
            usage: 'off_session'
        });
        return res.status(200).json({ clientSecret: setupIntent.client_secret });
    } catch (err: any) {
        console.error('[stripe] setup-intent error:', err);
        return res.status(500).json({ message: 'Errore creazione SetupIntent', error: err.message });
    }
}

export async function listPaymentMethods(req: Request, res: Response) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ error: 'Non autorizzato' });
    if (!isStripeConfigured()) return res.status(503).json({ error: 'Pagamento non configurato' });
        const customerId = await getOrCreateStripeCustomerByUserId(userId);
    const pms = await getStripe().paymentMethods.list({ customer: customerId, type: 'card' });
        const list = pms.data.map(pm => ({
            id: pm.id,
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year,
            funding: pm.card?.funding,
            country: pm.card?.country
        }));
        return res.status(200).json(list);
    } catch (err: any) {
        console.error('[stripe] list payment methods error:', err);
        return res.status(500).json({ message: 'Errore recupero metodi pagamento', error: err.message });
    }
}

export async function deletePaymentMethod(req: Request, res: Response) {
    try {
        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ error: 'Non autorizzato' });
    if (!isStripeConfigured()) return res.status(503).json({ error: 'Pagamento non configurato' });
        const { pmId } = req.params as { pmId?: string };
        if (!pmId) return res.status(400).json({ error: 'pmId mancante' });
        const customerId = await getOrCreateStripeCustomerByUserId(userId);
    const pm = await getStripe().paymentMethods.retrieve(pmId);
        if (pm.customer !== customerId) return res.status(403).json({ error: 'Metodo non appartiene al cliente' });
    await getStripe().paymentMethods.detach(pmId);
        return res.status(200).json({ message: 'Metodo rimosso', id: pmId });
    } catch (err: any) {
        console.error('[stripe] delete payment method error:', err);
        return res.status(500).json({ message: 'Errore rimozione metodo pagamento', error: err.message });
    }
    }