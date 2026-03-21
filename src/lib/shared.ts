import type { DrinkType } from "./types";

// ─── GS1 prefix → country mapping ───────────────────────────────
const GS1_PREFIXES: Array<[number, number, string]> = [
  [0, 19, "USA/Kanada"],
  [300, 379, "Prantsusmaa"],
  [380, 380, "Bulgaaria"],
  [383, 383, "Sloveenia"],
  [385, 385, "Horvaatia"],
  [387, 387, "Bosnia"],
  [400, 440, "Saksamaa"],
  [450, 459, "Jaapan"],
  [460, 469, "Venemaa"],
  [470, 470, "Kõrgõzstan"],
  [471, 471, "Taiwan"],
  [474, 474, "Eesti"],
  [475, 475, "Läti"],
  [476, 476, "Aserbaidžaan"],
  [477, 477, "Leedu"],
  [478, 478, "Usbekistan"],
  [480, 480, "Filipiinid"],
  [481, 481, "Valgevene"],
  [482, 482, "Ukraina"],
  [484, 484, "Moldova"],
  [485, 485, "Armeenia"],
  [486, 486, "Gruusia"],
  [487, 487, "Kasahstan"],
  [489, 489, "Hongkong"],
  [490, 499, "Jaapan"],
  [500, 509, "Suurbritannia"],
  [520, 521, "Kreeka"],
  [528, 528, "Liibanon"],
  [529, 529, "Küpros"],
  [530, 530, "Albaania"],
  [531, 531, "Põhja-Makedoonia"],
  [535, 535, "Malta"],
  [539, 539, "Iirimaa"],
  [540, 549, "Belgia/Luksemburg"],
  [560, 560, "Portugal"],
  [569, 569, "Island"],
  [570, 579, "Taani"],
  [590, 590, "Poola"],
  [594, 594, "Rumeenia"],
  [599, 599, "Ungari"],
  [600, 601, "Lõuna-Aafrika"],
  [608, 608, "Bahrein"],
  [609, 609, "Mauritius"],
  [611, 611, "Maroko"],
  [613, 613, "Alžeeria"],
  [615, 615, "Nigeeria"],
  [616, 616, "Kenya"],
  [619, 619, "Tuneesia"],
  [620, 620, "Tansaania"],
  [621, 621, "Süüria"],
  [622, 622, "Egiptus"],
  [624, 624, "Liibüa"],
  [625, 625, "Jordaania"],
  [626, 626, "Iraan"],
  [628, 628, "Saudi Araabia"],
  [629, 629, "AÜE"],
  [640, 649, "Soome"],
  [690, 695, "Hiina"],
  [700, 709, "Norra"],
  [729, 729, "Iisrael"],
  [730, 739, "Rootsi"],
  [740, 740, "Guatemala"],
  [741, 741, "El Salvador"],
  [742, 742, "Honduras"],
  [743, 743, "Nicaragua"],
  [744, 744, "Costa Rica"],
  [745, 745, "Panama"],
  [746, 746, "Dominikaani Vabariik"],
  [750, 750, "Mehhiko"],
  [754, 755, "Kanada"],
  [759, 759, "Venezuela"],
  [760, 769, "Šveits"],
  [770, 771, "Colombia"],
  [773, 773, "Uruguay"],
  [775, 775, "Peruu"],
  [777, 777, "Boliivia"],
  [779, 779, "Argentina"],
  [780, 780, "Tšiili"],
  [784, 784, "Paraguay"],
  [786, 786, "Ecuador"],
  [789, 790, "Brasiilia"],
  [800, 839, "Itaalia"],
  [840, 849, "Hispaania"],
  [850, 850, "Kuuba"],
  [858, 858, "Slovakkia"],
  [859, 859, "Tšehhi"],
  [860, 860, "Serbia"],
  [865, 865, "Mongoolia"],
  [867, 867, "Põhja-Korea"],
  [868, 869, "Türgi"],
  [870, 879, "Holland"],
  [880, 880, "Lõuna-Korea"],
  [884, 884, "Kambodža"],
  [885, 885, "Tai"],
  [888, 888, "Singapur"],
  [890, 890, "India"],
  [893, 893, "Vietnam"],
  [896, 896, "Pakistan"],
  [899, 899, "Indoneesia"],
  [900, 919, "Austria"],
  [930, 939, "Austraalia"],
  [940, 949, "Uus-Meremaa"],
  [955, 955, "Malaisia"],
  [958, 958, "Macau"],
];

export function countryFromEAN(ean: string): string {
  if (!ean || ean.length < 3) return "";
  const prefix = parseInt(ean.substring(0, 3), 10);
  if (isNaN(prefix)) return "";
  for (const [min, max, country] of GS1_PREFIXES) {
    if (prefix >= min && prefix <= max) return country;
  }
  return "";
}

// ─── Volume parsing ──────────────────────────────────────────────
export function parseVolumeML(volume: string): number | null {
  if (!volume) return null;
  const lower = volume.toLowerCase();

  // Multipacks: "6x500 ml", "12 x 330 ml", "6 x 568 ml"
  const multiMatch = lower.match(/(\d+)\s*x\s*([\d.,]+)\s*(ml|cl|l)/);
  if (multiMatch) {
    const count = parseInt(multiMatch[1], 10);
    const num = parseFloat(multiMatch[2].replace(",", "."));
    const unit = multiMatch[3];
    let singleML = num;
    if (unit === "l") singleML = num * 1000;
    else if (unit === "cl") singleML = num * 10;
    return Math.round(count * singleML);
  }

  // Single: "500 ml", "2 L", "330ml", "0.5l", "75 cl"
  const match = lower.match(/([\d.,]+)\s*(ml|cl|l|litr)/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(",", "."));
  const unit = match[2];
  if (unit === "l" || unit === "litr") return Math.round(num * 1000);
  if (unit === "cl") return Math.round(num * 10);
  return Math.round(num);
}

// ─── Drink type detection (shared — works for all stores) ───────
export function detectDrinkType(name: string): DrinkType {
  const lower = name.toLowerCase();

  if (
    lower.includes("energiajook") ||
    lower.includes("energy drink") ||
    lower.includes("red bull") ||
    lower.includes("monster energy") ||
    lower.includes("battery") ||
    lower.includes("hell energy")
  )
    return "energiajook";
  if (lower.includes("siider") || lower.includes("cider")) return "siider";
  if (lower.includes("long drink") || lower.includes("longdrink"))
    return "long drink";
  if (
    lower.includes("kokteil") ||
    lower.includes("cocktail") ||
    lower.includes("spritz") ||
    lower.includes("mojito") ||
    lower.includes("breezer") ||
    lower.includes("cooler") ||
    lower.includes("garage") ||
    lower.includes("muu alkohoolne") ||
    lower.includes("alkoholisegu")
  )
    return "kokteil";
  if (
    lower.includes("õlu") ||
    lower.includes("beer") ||
    lower.includes("lager") ||
    lower.includes("ale") ||
    lower.includes("ipa") ||
    lower.includes("stout") ||
    lower.includes("porter") ||
    lower.includes("pilsner") ||
    lower.includes("weizen") ||
    lower.includes("weissbier") ||
    lower.includes("hefe") ||
    lower.includes("neipa") ||
    lower.includes("gose")
  )
    return "õlu";

  return "muu";
}

export function detectAlcoholFree(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("alkoholivaba") ||
    lower.includes("alcohol-free") ||
    lower.includes("0.0%") ||
    lower.includes("0,0%") ||
    lower.includes("a.vaba") ||
    lower.includes("zero")
  );
}
