import { Request, Response } from "express";
import { pool } from "../db";
import { parseISO, addMinutes, addHours, differenceInMinutes } from 'date-fns';

export interface Volo {
  numero: string;
  data_ora_partenza: Date;
  durata_minuti: number;
  distanza: number;
  tratta_partenza: string;
  tratta_arrivo: string;
  citta_partenza?: string;
  citta_arrivo?: string;
  modello: string;
  compagnia: string;
}

function fmtDurata(minuti: number): string {
  const h = Math.floor(minuti / 60);
  const m = minuti % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatDateTimeLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function calcolaOre(dataAndata: string, dataRitorno: string): number {
  const dtAndata = parseISO(dataAndata);
  const dtRitorno = parseISO(dataRitorno);
  const diffOre = (dtRitorno.getTime() - dtAndata.getTime()) / 3600000;
  if (diffOre < 24) return 24;
  if (diffOre > 72) return 72;
  return Math.round(diffOre);
}

async function cercaItinerari(
  partenza: string,
  arrivo: string,
  dataOraPartenza: Date,
  maxScali = 2,
  searchWindowHours = 72,
  minConnMinutes = 120,
  maxConnHours = 12,
  maxTotalHours = 36
): Promise<Volo[][]> {
  try {
    const itinerari: Volo[][] = [];
    const finestraRicerca = addHours(dataOraPartenza, searchWindowHours);

    const result = await pool.query(
      `
      SELECT v.numero,
             v.data_ora_partenza,
             t.durata_minuti,
             t.distanza,
             t.partenza AS tratta_partenza,
             t.arrivo   AS tratta_arrivo,
             ap.citta   AS citta_partenza,
             aa.citta   AS citta_arrivo,
             a.modello,
             c.nome     AS compagnia
      FROM voli v
      JOIN tratte t      ON v.tratta = t.numero
      JOIN aeroporti ap  ON t.partenza = ap."codice_IATA"
      JOIN aeroporti aa  ON t.arrivo   = aa."codice_IATA"
      JOIN aerei a       ON v.aereo    = a.numero
      JOIN compagnie c   ON a.compagnia = c.utente
      WHERE v.data_ora_partenza BETWEEN $1 AND $2
      ORDER BY v.data_ora_partenza ASC
      `,[dataOraPartenza, finestraRicerca]
    );

    const tuttiVoli: Volo[] = (result.rows as any[]).map(r => ({
      numero: r.numero,
      data_ora_partenza: new Date(r.data_ora_partenza),
      durata_minuti: r.durata_minuti,
      distanza: r.distanza,
      tratta_partenza: r.tratta_partenza,
      tratta_arrivo: r.tratta_arrivo,
      citta_partenza: r.citta_partenza,
      citta_arrivo: r.citta_arrivo,
      modello: r.modello,
      compagnia: r.compagnia,
    }));

    const voliPerPartenza: Record<string, Volo[]> = {};
    for (const volo of tuttiVoli) {
      const ap = volo.tratta_partenza;
      if (!voliPerPartenza[ap]) voliPerPartenza[ap] = [];
      voliPerPartenza[ap].push(volo);
    }

    const minConn = minConnMinutes;
    const maxConn = maxConnHours * 60;
    const maxTotal = maxTotalHours * 60;

    const arrivoVolo = (v: Volo): Date => addMinutes(v.data_ora_partenza, v.durata_minuti);

    const okConnessione = (vPrev: Volo, vNext: Volo): boolean => {
      const earliest = addMinutes(arrivoVolo(vPrev), minConn);
      const latest = addMinutes(arrivoVolo(vPrev), maxConn);
      return vNext.data_ora_partenza >= earliest && vNext.data_ora_partenza <= latest;
    };

    const okTotale = (itin: Volo[]): boolean => {
      if (!itin.length) return false;
      const durata = differenceInMinutes(arrivoVolo(itin[itin.length - 1]), itin[0].data_ora_partenza);
      return durata <= maxTotal;
    };
    
    for (const v of voliPerPartenza[partenza] || []) {
      if (v.tratta_arrivo === arrivo && okTotale([v])) itinerari.push([v]);
    }

    for (const v1 of voliPerPartenza[partenza] || []) {
      if (v1.tratta_arrivo === arrivo) continue;
      const intermedio = v1.tratta_arrivo;
      for (const v2 of voliPerPartenza[intermedio] || []) {
        if (v2.tratta_arrivo !== arrivo) continue;
        if (!okConnessione(v1, v2)) continue;
        const itin = [v1, v2];
        if (okTotale(itin)) itinerari.push(itin);
      }
    }

    if (maxScali >= 2) {
      for (const v1 of voliPerPartenza[partenza] || []) {
        if (v1.tratta_arrivo === arrivo) continue;
        const intermedio1 = v1.tratta_arrivo;
        for (const v2 of voliPerPartenza[intermedio1] || []) {
          if ([arrivo, partenza].includes(v2.tratta_arrivo)) continue;
          if (!okConnessione(v1, v2)) continue;
          const intermedio2 = v2.tratta_arrivo;
            for (const v3 of voliPerPartenza[intermedio2] || []) {
              if (v3.tratta_arrivo !== arrivo) continue;
              if (!okConnessione(v2, v3)) continue;
              const itin = [v1, v2, v3];
              if (okTotale(itin)) itinerari.push(itin);
            }
        }
      }
    }

    itinerari.sort((a, b) => {
      const da = a[0].data_ora_partenza.getTime();
      const db = b[0].data_ora_partenza.getTime();
      if (da !== db) return da - db;
      const duraA = differenceInMinutes(arrivoVolo(a[a.length - 1]), a[0].data_ora_partenza);
      const duraB = differenceInMinutes(arrivoVolo(b[b.length - 1]), b[0].data_ora_partenza);
      if (duraA !== duraB) return duraA - duraB;
      return a.length - b.length;
    });

    const seen = new Set<string>();
    const unique: Volo[][] = [];
    for (const it of itinerari) {
      const sig = it.map(v => v.numero).join("-");
      if (seen.has(sig)) continue;
      seen.add(sig);
      unique.push(it);
    }

    return unique.slice(0, 5);
  } catch (err) {
    console.error("Errore in cercaItinerari:", err);
    return [];
  }
}

export async function getSolutions (req: Request, res: Response) {
  try {
    const { partenza, arrivo, data_andata, data_ritorno } = req.query;
    if (!partenza || !arrivo || !data_andata) {
      return res.status(400).json({ error: "Parametri mancanti" });
    }

    const dtAndata = parseISO(String(data_andata));

    const toDict = (itin: Volo[]) => {
      const oraP = itin[0].data_ora_partenza;
      const oraA = addMinutes(itin[itin.length - 1].data_ora_partenza, itin[itin.length - 1].durata_minuti);
      return {
        durata_totale: fmtDurata(differenceInMinutes(oraA, oraP)),
        voli: itin.map(v => ({
          numero: v.numero,
          compagnia: v.compagnia,
          partenza: v.tratta_partenza,
          arrivo: v.tratta_arrivo,
          citta_partenza: v.citta_partenza ?? "",
          citta_arrivo: v.citta_arrivo ?? "",
          ora_partenza: formatDateTimeLocal(v.data_ora_partenza),
          ora_arrivo: formatDateTimeLocal(addMinutes(v.data_ora_partenza, v.durata_minuti)),
          modello: v.modello,
          distanza: v.distanza,
        })),
      };
    };

    if (!data_ritorno) {
      const andataItinerari = await cercaItinerari(
        String(partenza),
        String(arrivo),
        dtAndata
      );
      return res.json(andataItinerari.map(toDict));
    }

    const andataItinerari = await cercaItinerari(
      String(partenza),
      String(arrivo),
      dtAndata,
      2,
      calcolaOre(String(data_andata), String(data_ritorno))
    );

    const ritornoItinerari = await cercaItinerari(
      String(arrivo),
      String(partenza),
      parseISO(String(data_ritorno))
    );

    return res.json({
      andata: andataItinerari.map(toDict),
      ritorno: ritornoItinerari.map(toDict),
    });
  } catch (err) {
    console.error("Errore generale in ricercaSoluzioni:", err);
    return res.status(500).json({ error: "Errore interno del server" });
  }
}