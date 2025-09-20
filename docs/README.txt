SkyTravel — Guida Rapida di Esecuzione

Questa guida spiega come avviare l’app completa (backend Node.js/Express.js + frontend Angular) in locale e con Docker.

---

Breve spiegazione della token rotation (server/.env)

Imposta in server/.env:
- ROTATE_SECRETS_ON_START=1 → ad ogni riavvio le chiavi segrete con cui si firmano i JWT vengono cambiate e tutte le sessioni esistenti vengono invalidate.
- ROTATE_SECRETS_ON_START=0 → nessun cambio automatico.

---

Avvio in locale

Frontend (Angular)

1) Installa Node.js
2) Installa Angular CLI (globale) e, se necessario, Tailwind/DaisyUI sono già configurati nel progetto
3) In una finestra PowerShell/cmd vai nella cartella client del progetto (cd "c:\\...\\client") ed esegui:

npm install
ng serve

- Il frontend sarà su: http://localhost:4200

Backend (Node.js ed Express.js)

1) Scegli il DB in server/src/db.ts
2) Decidi se vuoi la token rotation modificando ROTATE_SECRETS_ON_START in server/.env (vedi sopra)
3) In un’altra finestra PowerShell/cmd vai nella cartella server del progetto (cd "c:\\...\\server") e avvia:

npm install
npx tsx watch src/server.ts

- Il backend sarà su: http://localhost:3000

---

Stripe (Windows)

1) Scarica la Stripe CLI per Windows da GitHub (zip), decomprimi ed aggiungi il percorso al file stripe.exe alla variabile d’ambiente Path.

2) In PowerShell verifica l’installazione (adattando il percorso):

& "C:\\...\\stripe.exe" --version

3) Esegui il login (si aprirà il browser):

& "C:\\...\\stripe.exe" login

4) Avvia l’ascolto del webhook e inoltra al backend (porta 3000):

& "C:\\...\\stripe.exe" listen --forward-to http://localhost:3000/api/checkout/stripe-webhook

5) Aggiorna le variabili:
- server/.env: STRIPE_SECRET_KEY (chiave segreta) e STRIPE_WEBHOOK_SECRET (valore whsec_... mostrato dopo il comando listen)
- client/src/environments/environment.ts: stripePublishableKey (chiave pubblicabile)

---

Avvio con Docker

1) Installa e avvia Docker Desktop
2) (Opzionale) Installa l’estensione Docker per VS Code
3) Scegli il DB apposito in server/src/db.ts
4) Decidi la token rotation in server/.env (vedi sopra)
5) Dal root del progetto (cd "c:\\...\\SkyTravel TS") esegui:

docker-compose up --build

Servizi esposti:
- Client: http://localhost:4200
- Server: http://localhost:3000
- Postgres: 5432 (mappato su localhost)
