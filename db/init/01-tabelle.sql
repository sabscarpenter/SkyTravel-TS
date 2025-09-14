create extension if not exists pgcrypto;

create table public.utenti (
  id integer not null,
  email character varying(255) not null,
  password character varying(255) not null,
  foto character varying(255) null,
  constraint utenti_pkey primary key (id),
  constraint utenti_email_key unique (email)
) TABLESPACE pg_default;

create unique INDEX IF not exists uq_email_ci on public.utenti using btree (lower((email)::text)) TABLESPACE pg_default;


create table public.compagnie (
  utente integer not null,
  nome character varying(100) not null,
  "codice_IATA" character varying(2) not null,
  contatto character varying(100) not null,
  nazione character varying(100) not null,
  constraint accountcompagnie_pkey primary key (utente),
  constraint accountcompagnie_codice_IATA_key unique ("codice_IATA"),
  constraint compagnie_utente_fkey foreign KEY (utente) references utenti (id) on update CASCADE on delete CASCADE,
  constraint chk_iata_comp check (
    (
      ("codice_IATA")::text = upper(("codice_IATA")::text)
    )
  )
) TABLESPACE pg_default;


create table public.passeggeri (
  utente integer not null,
  nome character varying(100) not null,
  cognome character varying(100) not null,
  codice_fiscale character varying(100) not null,
  data_nascita date not null,
  sesso character varying(1) not null,
  stripe character varying(100) null,
  constraint accountpasseggeri_pkey primary key (utente),
  constraint accountpasseggeri_codice_fiscale_key unique (codice_fiscale),
  constraint passeggeri_utente_fkey foreign KEY (utente) references utenti (id) on update CASCADE on delete CASCADE,
  constraint chk_eta18 check (
    (
      data_nascita <= (CURRENT_DATE - '18 years'::interval)
    )
  ),
  constraint chk_sesso check (
    (
      (sesso)::text = any (
        (
          array['M'::character varying, 'F'::character varying]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;


create table public.sessioni (
  jti text not null,
  utente integer not null,
  scadenza timestamp with time zone not null,
  revocato boolean null default false,
  data_creazione timestamp with time zone null default now(),
  constraint sessioni_pkey primary key (jti),
  constraint sessioni_utente_fkey foreign KEY (utente) references utenti (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;


create table public.modelli (
  nome character varying(100) not null,
  posti_economy integer not null,
  posti_business integer not null,
  posti_first integer not null,
  massima_distanza integer not null,
  layout character varying(100) not null,
  sigla character varying not null,
  constraint modelliaerei_pkey primary key (nome),
  constraint chk_distanza check ((massima_distanza > 0)),
  constraint chk_posti check (
    (
      (posti_economy >= 0)
      and (posti_business >= 0)
      and (posti_first >= 0)
    )
  )
) TABLESPACE pg_default;


create table public.aerei (
  numero character varying(100) not null,
  modello character varying(100) not null,
  compagnia integer not null,
  constraint aerei_pkey primary key (numero),
  constraint aerei_compagnia_fkey foreign KEY (compagnia) references compagnie (utente) on delete CASCADE,
  constraint aerei_modello_fkey foreign KEY (modello) references modelli (nome) on delete RESTRICT
) TABLESPACE pg_default;

create index IF not exists ix_aerei_comp on public.aerei using btree (compagnia) TABLESPACE pg_default;


create table public.aeroporti (
  "codice_IATA" character varying(3) not null,
  nome character varying(100) not null,
  citta character varying(100) not null,
  nazione character varying(100) not null,
  constraint aeroporti_pkey primary key ("codice_IATA"),
  constraint chk_iata_air check (
    (
      ("codice_IATA")::text = upper(("codice_IATA")::text)
    )
  )
) TABLESPACE pg_default;


create table public.tratte (
  numero character varying(100) not null,
  partenza character varying(100) not null,
  arrivo character varying(100) not null,
  durata_minuti integer not null,
  distanza integer not null,
  compagnia integer null,
  constraint tratte_pkey primary key (numero),
  constraint uq_tratta_rotta unique (compagnia, partenza, arrivo),
  constraint tratte_partenza_fkey foreign KEY (partenza) references aeroporti ("codice_IATA") on update CASCADE on delete CASCADE,
  constraint tratte_compagnia_fkey foreign KEY (compagnia) references compagnie (utente) on update CASCADE on delete CASCADE,
  constraint tratte_arrivo_fkey foreign KEY (arrivo) references aeroporti ("codice_IATA") on update CASCADE on delete CASCADE,
  constraint chk_tratta_diff check (((partenza)::text <> (arrivo)::text)),
  constraint chk_tratta_pos check (
    (
      (durata_minuti > 0)
      and (distanza > 0)
    )
  )
) TABLESPACE pg_default;


create table public.voli (
  numero character varying(100) not null,
  aereo character varying(100) not null,
  tratta character varying(100) not null,
  data_ora_partenza timestamp without time zone not null,
  constraint voli_pkey primary key (numero),
  constraint voli_aereo_fkey foreign KEY (aereo) references aerei (numero) on delete RESTRICT,
  constraint voli_tratta_fkey foreign KEY (tratta) references tratte (numero) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists ix_voli_tratta on public.voli using btree (tratta) TABLESPACE pg_default;


create table public.biglietti (
  numero character varying(100) not null,
  volo character varying(100) not null,
  utente integer null,
  prezzo double precision not null,
  classe character varying(1) not null,
  posto character varying(10) not null,
  nome character varying(100) not null,
  cognome character varying(100) not null,
  bagagli integer not null,
  scadenza timestamp with time zone null,
  constraint biglietti_pkey primary key (numero),
  constraint uq_volo_posto unique (volo, posto),
  constraint biglietti_utente_fkey foreign KEY (utente) references passeggeri (utente) on update CASCADE on delete set null,
  constraint biglietti_volo_fkey foreign KEY (volo) references voli (numero) on update CASCADE on delete CASCADE,
  constraint chk_bagagli check ((bagagli >= 0)),
  constraint chk_classe check (
    (
      (classe)::text = any (
        (
          array[
            'e'::character varying,
            'b'::character varying,
            'f'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint chk_prezzo check ((prezzo >= (0)::double precision))
) TABLESPACE pg_default;

create index IF not exists ix_bigs_volo on public.biglietti using btree (volo) TABLESPACE pg_default;

--create trigger trigger_ticket_cleanup BEFORE INSERT on biglietti for EACH row
--execute FUNCTION ticket_cleanup ();
