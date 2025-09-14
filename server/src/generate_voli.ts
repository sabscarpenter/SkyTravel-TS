// generateVoli.ts
import crypto from "crypto";

// ======= PARAMETRI =======
const START_DATE = new Date(2025, 8, 6); // 6 settembre 2025 (mese 0-based -> 8 = settembre)
const DAYS = 7;                          // 7 giorni
const START_SUFFIX = 1;                  // 1 => 000001..000007

const BASE_SLOTS: [number, number][] = [
  [6, 15], [8, 45], [11, 15], [13, 45],
  [16, 15], [18, 45], [20, 15]
];
const TURNAROUND_OPTIONS = [60, 75, 90, 105, 120];

// ======= FUNZIONI HASH =======
function baseSlotForRoute(routeKey: string): [number, number] {
  const h = parseInt(crypto.createHash("md5").update(routeKey).digest("hex"), 16);
  return BASE_SLOTS[h % BASE_SLOTS.length];
}

function turnaroundForRoute(routeKey: string): number {
  const h = parseInt(crypto.createHash("sha1").update(routeKey).digest("hex"), 16);
  return TURNAROUND_OPTIONS[h % TURNAROUND_OPTIONS.length];
}

// ======= AEREI =======
const AEREI: [string, string, number, number][] = [
  ["FR-AT72-001","ATR 72-600",10,70], ["FR-DH8-001","De Havilland Dash 8 Q400",10,78],
  ["FR-E190-001","Embraer E190",10,88], ["FR-CRJ9-001","Bombardier CRJ900",10,76],
  ["FR-A320-001","Airbus A320neo",10,150], ["FR-B737-001","Boeing 737 MAX 8",10,162],
  ["FR-B787-001","Boeing 787-9 Dreamliner",10,220], ["FR-A350-001","Airbus A350-900",10,240],
  ["FR-B777-001","Boeing 777-300ER",10,270], ["FR-A380-001","Airbus A380-800",10,350],

  ["LH-AT72-001","ATR 72-600",11,70], ["LH-DH8-001","De Havilland Dash 8 Q400",11,78],
  ["LH-E190-001","Embraer E190",11,88], ["LH-CRJ9-001","Bombardier CRJ900",11,76],
  ["LH-A320-001","Airbus A320neo",11,150], ["LH-B737-001","Boeing 737 MAX 8",11,162],
  ["LH-B787-001","Boeing 787-9 Dreamliner",11,220], ["LH-A350-001","Airbus A350-900",11,240],
  ["LH-B777-001","Boeing 777-300ER",11,270], ["LH-A380-001","Airbus A380-800",11,350],

  ["EK-AT72-001","ATR 72-600",12,70], ["EK-DH8-001","De Havilland Dash 8 Q400",12,78],
  ["EK-E190-001","Embraer E190",12,88], ["EK-CRJ9-001","Bombardier CRJ900",12,76],
  ["EK-A320-001","Airbus A320neo",12,150], ["EK-B737-001","Boeing 737 MAX 8",12,162],
  ["EK-B787-001","Boeing 787-9 Dreamliner",12,220], ["EK-A350-001","Airbus A350-900",12,240],
  ["EK-B777-001","Boeing 777-300ER",12,270], ["EK-A380-001","Airbus A380-800",12,350],

  ["QR-AT72-001","ATR 72-600",13,70], ["QR-DH8-001","De Havilland Dash 8 Q400",13,78],
  ["QR-E190-001","Embraer E190",13,88], ["QR-CRJ9-001","Bombardier CRJ900",13,76],
  ["QR-A320-001","Airbus A320neo",13,150], ["QR-B737-001","Boeing 737 MAX 8",13,162],
  ["QR-B787-001","Boeing 787-9 Dreamliner",13,220], ["QR-A350-001","Airbus A350-900",13,240],
  ["QR-B777-001","Boeing 777-300ER",13,270], ["QR-A380-001","Airbus A380-800",13,350],

  ["DL-AT72-001","ATR 72-600",15,70], ["DL-DH8-001","De Havilland Dash 8 Q400",15,78],
  ["DL-E190-001","Embraer E190",15,88], ["DL-CRJ9-001","Bombardier CRJ900",15,76],
  ["DL-A320-001","Airbus A320neo",15,150], ["DL-B737-001","Boeing 737 MAX 8",15,162],
  ["DL-B787-001","Boeing 787-9 Dreamliner",15,220], ["DL-A350-001","Airbus A350-900",15,240],
  ["DL-B777-001","Boeing 777-300ER",15,270], ["DL-A380-001","Airbus A380-800",15,350],

  ["BA-AT72-001","ATR 72-600",16,70], ["BA-DH8-001","De Havilland Dash 8 Q400",16,78],
  ["BA-E190-001","Embraer E190",16,88], ["BA-CRJ9-001","Bombardier CRJ900",16,76],
  ["BA-A320-001","Airbus A320neo",16,150], ["BA-B737-001","Boeing 737 MAX 8",16,162],
  ["BA-B787-001","Boeing 787-9 Dreamliner",16,220], ["BA-A350-001","Airbus A350-900",16,240],
  ["BA-B777-001","Boeing 777-300ER",16,270], ["BA-A380-001","Airbus A380-800",16,350],

  ["AF-AT72-001","ATR 72-600",17,70], ["AF-DH8-001","De Havilland Dash 8 Q400",17,78],
  ["AF-E190-001","Embraer E190",17,88], ["AF-CRJ9-001","Bombardier CRJ900",17,76],
  ["AF-A320-001","Airbus A320neo",17,150], ["AF-B737-001","Boeing 737 MAX 8",17,162],
  ["AF-B787-001","Boeing 787-9 Dreamliner",17,220], ["AF-A350-001","Airbus A350-900",17,240],
  ["AF-B777-001","Boeing 777-300ER",17,270], ["AF-A380-001","Airbus A380-800",17,350],

  ["KL-AT72-001","ATR 72-600",18,70], ["KL-DH8-001","De Havilland Dash 8 Q400",18,78],
  ["KL-E190-001","Embraer E190",18,88], ["KL-CRJ9-001","Bombardier CRJ900",18,76],
  ["KL-A320-001","Airbus A320neo",18,150], ["KL-B737-001","Boeing 737 MAX 8",18,162],
  ["KL-B787-001","Boeing 787-9 Dreamliner",18,220], ["KL-A350-001","Airbus A350-900",18,240],
  ["KL-B777-001","Boeing 777-300ER",18,270], ["KL-A380-001","Airbus A380-800",18,350],

  ["AZ-AT72-001","ATR 72-600",19,70], ["AZ-DH8-001","De Havilland Dash 8 Q400",19,78],
  ["AZ-E190-001","Embraer E190",19,88], ["AZ-CRJ9-001","Bombardier CRJ900",19,76],
  ["AZ-A320-001","Airbus A320neo",19,150], ["AZ-B737-001","Boeing 737 MAX 8",19,162],
  ["AZ-B787-001","Boeing 787-9 Dreamliner",19,220], ["AZ-A350-001","Airbus A350-900",19,240],
  ["AZ-B777-001","Boeing 777-300ER",19,270], ["AZ-A380-001","Airbus A380-800",19,350],

  ["OS-AT72-001","ATR 72-600",14,70], ["OS-DH8-001","De Havilland Dash 8 Q400",14,78],
  ["OS-E190-001","Embraer E190",14,88], ["OS-CRJ9-001","Bombardier CRJ900",14,76],
  ["OS-A320-001","Airbus A320neo",14,150], ["OS-B737-001","Boeing 737 MAX 8",14,162],
  ["OS-B787-001","Boeing 787-9 Dreamliner",14,220], ["OS-A350-001","Airbus A350-900",14,240],
  ["OS-B777-001","Boeing 777-300ER",14,270], ["OS-A380-001","Airbus A380-800",14,350],
];

// ======= TRATTE =======
const TRATTE: [string, string, string, number, number][] = [
  ["OS-VIE-ZRH","VIE","ZRH",85,620], ["OS-ZRH-VIE","ZRH","VIE",85,620],
  ["OS-VIE-BER","VIE","BER",85,550], ["OS-BER-VIE","BER","VIE",85,550],
  ["OS-VIE-CDG","VIE","CDG",120,1035], ["OS-CDG-VIE","CDG","VIE",120,1035],
  ["OS-VIE-AMS","VIE","AMS",115,975], ["OS-AMS-VIE","AMS","VIE",115,975],
  ["OS-VIE-BRU","VIE","BRU",110,915], ["OS-BRU-VIE","BRU","VIE",110,915],

  ["AZ-FCO-MXP","FCO","MXP",70,510], ["AZ-MXP-FCO","MXP","FCO",70,510],
  ["AZ-NAP-CDG","NAP","CDG",150,1290], ["AZ-CDG-NAP","CDG","NAP",150,1290],
  ["AZ-VCE-BRU","VCE","BRU",130,940], ["AZ-BRU-VCE","BRU","VCE",130,940],
  ["AZ-PMO-MAD","PMO","MAD",160,1470], ["AZ-MAD-PMO","MAD","PMO",160,1470],
  ["AZ-BLQ-AMS","BLQ","AMS",135,1100], ["AZ-AMS-BLQ","AMS","BLQ",135,1100],

  ["AF-CDG-MXP","CDG","MXP",90,850], ["AF-MXP-CDG","MXP","CDG",90,850],
  ["AF-FCO-BRU","FCO","BRU",125,1180], ["AF-BRU-FCO","BRU","FCO",125,1180],
  ["AF-AMS-MAD","AMS","MAD",155,1460], ["AF-MAD-AMS","MAD","AMS",155,1460],
  ["AF-BER-ATH","BER","ATH",160,1800], ["AF-ATH-BER","ATH","BER",160,1800],
  ["AF-DUB-LHR","DUB","LHR",70,450], ["AF-LHR-DUB","LHR","DUB",70,450],

  ["BA-LHR-AMS","LHR","AMS",75,370], ["BA-AMS-LHR","AMS","LHR",75,370],
  ["BA-FCO-MAD","FCO","MAD",150,1365], ["BA-MAD-FCO","MAD","FCO",150,1365],
  ["BA-ATH-CDG","ATH","CDG",195,2100], ["BA-CDG-ATH","CDG","ATH",195,2100],
  ["BA-BER-CPH","BER","CPH",65,360], ["BA-CPH-BER","CPH","BER",65,360],
  ["BA-DUB-BRU","DUB","BRU",105,785], ["BA-BRU-DUB","BRU","DUB",105,785],

  ["DL-CDG-BRU","CDG","BRU",55,260], ["DL-BRU-CDG","BRU","CDG",55,260],
  ["DL-AMS-FCO","AMS","FCO",150,1295], ["DL-FCO-AMS","FCO","AMS",150,1295],
  ["DL-MAD-ZRH","MAD","ZRH",125,1240], ["DL-ZRH-MAD","ZRH","MAD",125,1240],
  ["DL-BER-VIE","BER","VIE",85,550], ["DL-VIE-BER","VIE","BER",85,550],
  ["DL-LHR-CPH","LHR","CPH",115,950], ["DL-CPH-LHR","CPH","LHR",115,950],

  ["QR-FCO-VIE","FCO","VIE",95,780], ["QR-VIE-FCO","VIE","FCO",95,780],
  ["QR-BER-ZRH","BER","ZRH",95,670], ["QR-ZRH-BER","ZRH","BER",95,670],
  ["QR-MXP-BRU","MXP","BRU",100,685], ["QR-BRU-MXP","BRU","MXP",100,685],
  ["QR-CDG-AMS","CDG","AMS",75,430], ["QR-AMS-CDG","AMS","CDG",75,430],
  ["QR-LHR-DUB","LHR","DUB",70,450], ["QR-DUB-LHR","DUB","LHR",70,450],

  ["EK-FCO-ATH","FCO","ATH",120,1060], ["EK-ATH-FCO","ATH","FCO",120,1060],
  ["EK-CDG-MXP","CDG","MXP",90,850], ["EK-MXP-CDG","MXP","CDG",90,850],
  ["EK-MAD-LIS","MAD","LIS",75,505], ["EK-LIS-MAD","LIS","MAD",75,505],
  ["EK-AMS-OSL","AMS","OSL",120,1150], ["EK-OSL-AMS","OSL","AMS",120,1150],
  ["EK-BER-PRG","BER","PRG",70,280], ["EK-PRG-BER","PRG","BER",70,280],

  ["LH-FRA-VIE","BER","VIE",85,550], ["LH-VIE-FRA","VIE","BER",85,550],
  ["LH-MXP-FRA","MXP","BER",95,675], ["LH-FRA-MXP","BER","MXP",95,675],
  ["LH-AMS-WAW","AMS","WAW",120,1095], ["LH-WAW-AMS","WAW","AMS",120,1095],
  ["LH-ZRH-BRU","ZRH","BRU",85,490], ["LH-BRU-ZRH","BRU","ZRH",85,490],
  ["LH-CPH-FRA","CPH","BER",80,370], ["LH-FRA-CPH","BER","CPH",80,370],

  ["FR-FCO-CDG","FCO","CDG",135,1105], ["FR-CDG-FCO","CDG","FCO",135,1105],
  ["FR-BCN-MXP","MAD","MXP",120,1180], ["FR-MXP-BCN","MXP","MAD",120,1180],
  ["FR-DUB-BRU","DUB","BRU",105,785], ["FR-BRU-DUB","BRU","DUB",105,785],
  ["FR-VCE-ATH","VCE","ATH",150,1275], ["FR-ATH-VCE","ATH","VCE",150,1275],
  ["FR-BER-AMS","BER","AMS",95,655], ["FR-AMS-BER","AMS","BER",95,655],

  ["KL-AMS-BER","AMS","BER",95,655], ["KL-BER-AMS","BER","AMS",95,655],
  ["KL-FCO-VCE","FCO","VCE",65,410], ["KL-VCE-FCO","VCE","FCO",65,410],
  ["KL-CDG-LHR","CDG","LHR",75,340], ["KL-LHR-CDG","LHR","CDG",75,340],
  ["KL-MAD-BCN","MAD","BCN",70,500], ["KL-BCN-MAD","BCN","MAD",70,500],
  ["KL-ZRH-VIE","ZRH","VIE",95,620], ["KL-VIE-ZRH","VIE","ZRH",95,620],
];

// ======= MAPPE =======
const mapTriplaToNum = new Map<[string, string, string], string>();
const numToCols = new Map<string, [string, string, string, number]>();

for (const [num, dep, arr, durata, _km] of TRATTE) {
  const comp = num.split("-")[0];
  mapTriplaToNum.set([comp, dep, arr], num);
  numToCols.set(num, [comp, dep, arr, durata]);
}

function pairKeyCols(comp: string, dep: string, arr: string): string {
  const [a, b] = [dep, arr].sort();
  return `${comp}-${a}-${b}`;
}

// ======= FLOTTA PER COMPAGNIA =======
const fleetByComp = new Map<string, string[]>();
for (const [aNum] of AEREI) {
  const comp = aNum.split("-")[0];
  if (!fleetByComp.has(comp)) fleetByComp.set(comp, []);
  fleetByComp.get(comp)!.push(aNum);
}

// ======= GENERAZIONE VOLI =======
type Row = [string, string, string, string];
const rows: Row[] = [];
const seenPairs = new Set<string>();
const planeForPair = new Map<string, string>();

for (const [num, dep, arr, durata, _km] of TRATTE) {
  const comp = num.split("-")[0];
  const pairKey = pairKeyCols(comp, dep, arr);
  if (seenPairs.has(pairKey)) continue;
  seenPairs.add(pairKey);

  if (!planeForPair.has(pairKey)) {
    const fleet = fleetByComp.get(comp)!;
    const plane = fleet.shift()!;
    fleet.push(plane); // round robin
    planeForPair.set(pairKey, plane);
  }
  const aereo = planeForPair.get(pairKey)!;

  const numAndata = TRATTE.find(t => t[1] === dep && t[2] === arr && t[0].startsWith(comp))?.[0];
  const numRitorno = TRATTE.find(t => t[1] === arr && t[2] === dep && t[0].startsWith(comp))?.[0];

  const baseRef = `${comp}-${[dep, arr].sort().join("-")}`;
  const [baseH, baseM] = baseSlotForRoute(baseRef);
  const tta = turnaroundForRoute(baseRef);

  for (let i = 0; i < DAYS; i++) {
    const suffix = START_SUFFIX + i;
    const suf = `-${suffix.toString().padStart(6, "0")}`;
    const depDt = new Date(START_DATE);
    depDt.setDate(depDt.getDate() + i);
    depDt.setHours(baseH, baseM, 0, 0);

    // ANDATA
    if (numAndata) {
      const durataA = numToCols.get(numAndata)![3];
      rows.push([numAndata + suf, aereo, numAndata, depDt.toISOString().slice(0, 19).replace("T", " ")]);
      const arrDt = new Date(depDt.getTime() + durataA * 60000);

      // RITORNO
      if (numRitorno) {
        const depRet = new Date(arrDt.getTime() + tta * 60000);
        rows.push([numRitorno + suf, aereo, numRitorno, depRet.toISOString().slice(0, 19).replace("T", " ")]);
      }
    }
  }
}

// ======= STAMPA SQL =======
console.log("-- VOLI generati (TypeScript)");
console.log("INSERT INTO voli (numero, aereo, tratta, data_ora_partenza) VALUES");
rows.forEach((r, i) => {
  const sep = i < rows.length - 1 ? "," : ";";
  console.log(`('${r[0]}', '${r[1]}', '${r[2]}', '${r[3]}')${sep}`);
});