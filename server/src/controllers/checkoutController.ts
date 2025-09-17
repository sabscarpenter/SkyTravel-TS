import { Request, Response } from "express";
import { pool } from "../db";
import Stripe from "stripe";
import { getStripe, isStripeConfigured } from "../utils/stripe";

export async function insertTickets(req: Request, res: Response) {
    try {
        await pool.query("BEGIN");

        const tickets = req.body as any[];
        const id = req.user?.sub;
        if (!tickets || tickets.length === 0) return res.status(400).json({ error: "Nessun biglietto fornito" });
        
        for (const t of tickets) {
            const check = await pool.query(
                `
                SELECT 1
                FROM biglietti
                WHERE volo = $1
                AND posto = $2
                AND utente = $3
                AND scadenza IS NOT NULL
                AND scadenza >= NOW()
                LIMIT 1
                `, [t.flightNumber, t.seatNumber, id]
            );

            if (check.rowCount === 0) {
                await pool.query("ROLLBACK");
                return res.status(409).json({error: "Tempo di prenotazione scaduto"});
            }
        }

        for (const t of tickets) {
            const ticketId = `${t.flightNumber}-${t.seatNumber}`;
            let ticketClass: "e" | "b" | "f" = "e";
            if (t.seatClass === "first") ticketClass = "f";
            else if (t.seatClass === "business") ticketClass = "b";

            await pool.query(
                `
                INSERT INTO biglietti
                (numero, volo, utente, prezzo, classe, posto, nome, cognome, bagagli, scadenza)
                VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)
                `,
                [ ticketId, t.flightNumber, id, t.seatPrice, ticketClass,
                  t.seatNumber, t.firstName, t.lastName, t.extraBags ]
            );
        }

        await pool.query("COMMIT");
        return res.status(200).json({ message: "Checkout avvenuto con successo" });
    } catch (err: any) {
        await pool.query("ROLLBACK");
        console.error("Errore in /insert-tickets:", err);
        return res.status(500).json({
            error: "Errore server durante il checkout",
            details: err.message,
        });
    }
}

export async function createPaymentIntent(req: Request, res: Response) {
    try {
        if (!isStripeConfigured()) {
            return res.status(503).json({ error: "Pagamento non configurato" });
        }
        const { amount, currency = "eur", orderId, customerEmail } = req.body;

        if (!amount || typeof amount !== "number" || amount <= 0) 
            return res.status(400).json({ error: "amount deve essere un numero > 0 (in centesimi)" });
        
        const intent = await getStripe().paymentIntents.create({
            amount,
            currency,
            automatic_payment_methods: { enabled: true },
            receipt_email: customerEmail,
            metadata: orderId ? { orderId } : undefined,
        });

        return res.status(200).json({
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id,
        });
    } catch (err: any) {
        console.error("Errore nella creazione del PaymentIntent:", err);
        return res.status(500).json({
            error: "Errore server nella creazione del pagamento",
            details: err.message,
        });
    }
}

export async function getPaymentIntent(req: Request, res: Response) {
    try {
        if (!isStripeConfigured()) {
            return res.status(503).json({ error: "Pagamento non configurato" });
        }
        const { pi_id } = req.params;
        const intent = await getStripe().paymentIntents.retrieve(pi_id);

        return res.status(200).json({ status: intent.status });
    } catch (err: any) {
        console.error("Errore nel recupero del PaymentIntent:", err);
        return res.status(400).json({ error: err.message });
    }
}

export async function stripeWebhook(req: Request, res: Response) {
    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
    const sigHeader = req.headers["stripe-signature"] as string;
    if (!webhookSecret) {
        console.error('Webhook secret non configurato');
        return res.status(503).send('Webhook non configurato');
    }
    const payload = req.body as Buffer;
    if (!Buffer.isBuffer(payload)) return res.status(400).send('Payload non valido');

    let event: Stripe.Event;

    try {
        event = Stripe.webhooks.constructEvent(payload, sigHeader, webhookSecret);
    } catch (err: any) {
        if (err.type === "StripeSignatureVerificationError") {
            console.error("❌ Signature verification failed:", err.message);
            return res.status(400).send("Invalid signature");
        }
        console.error("❌ Webhook bad request:", err.message);
        return res.status(400).send("Bad request");
    }

    console.log(`✅ Evento ricevuto: ${event.type}`);

    return res.status(200).send("ok");
}

