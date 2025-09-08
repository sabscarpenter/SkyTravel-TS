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
