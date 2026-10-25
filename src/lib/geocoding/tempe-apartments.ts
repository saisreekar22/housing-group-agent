export interface ApartmentEntry {
  name: string;
  aliases: string[];
  address: string;
  latitude: number;
  longitude: number;
}

export interface AreaCenter {
  label: string;
  latitude: number;
  longitude: number;
}

export const DEFAULT_AREA: AreaCenter = {
  label: "Tempe, AZ 85281",
  latitude: 33.4242,
  longitude: -111.9281,
};

export const TEMPE_APARTMENTS: ApartmentEntry[] = [
  {
    name: "University House Tempe",
    aliases: ["university house", "uh tempe", "uh"],
    address: "1000 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4153,
    longitude: -111.926,
  },
  {
    name: "Vista del Sol",
    aliases: ["vista del sol", "vista", "vds"],
    address: "701 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4248,
    longitude: -111.934,
  },
  {
    name: "Paseo on University",
    aliases: ["paseo on university", "paseo", "paseo tempe"],
    address: "1000 S Terrace Rd, Tempe, AZ 85281",
    latitude: 33.4216,
    longitude: -111.9326,
  },
  {
    name: "Nine20 Tempe",
    aliases: ["nine20", "nine 20", "920 tempe"],
    address: "920 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4188,
    longitude: -111.9388,
  },
  {
    name: "West 6th",
    aliases: ["west 6th", "west sixth", "west6"],
    address: "1250 W 6th St, Tempe, AZ 85281",
    latitude: 33.4244,
    longitude: -111.94,
  },
  {
    name: "Vertex",
    aliases: ["vertex", "vertex tempe"],
    address: "1111 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4147,
    longitude: -111.9279,
  },
  {
    name: "District on Apache",
    aliases: ["district on apache", "district", "district tempe"],
    address: "1400 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4145,
    longitude: -111.931,
  },
  {
    name: "Union Tempe",
    aliases: ["union tempe", "union", "the union"],
    address: "750 S Packard Dr, Tempe, AZ 85281",
    latitude: 33.4237,
    longitude: -111.9283,
  },
  {
    name: "Canvas Tempe",
    aliases: ["canvas", "canvas tempe"],
    address: "1010 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.422,
    longitude: -111.936,
  },
  {
    name: "Rise on Apache",
    aliases: ["rise on apache", "rise", "rise tempe"],
    address: "1525 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.416,
    longitude: -111.937,
  },
  {
    name: "Apollo",
    aliases: ["apollo", "apollo tempe"],
    address: "1000 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.414,
    longitude: -111.935,
  },
  {
    name: "Gateway at Tempe",
    aliases: ["gateway at tempe", "gateway", "gateway tempe"],
    address: "1655 E University Dr, Tempe, AZ 85281",
    latitude: 33.4217,
    longitude: -111.9404,
  },
  {
    name: "University Trails",
    aliases: ["university trails", "trails", "trails tempe"],
    address: "2121 E Broadway Rd, Tempe, AZ 85281",
    latitude: 33.4088,
    longitude: -111.931,
  },
  {
    name: "The Standard Tempe",
    aliases: ["the standard", "standard tempe", "standard"],
    address: "730 S Farmer Ave, Tempe, AZ 85281",
    latitude: 33.4213,
    longitude: -111.9432,
  },
  {
    name: "Sterling 920",
    aliases: ["sterling 920", "sterling"],
    address: "920 S Terrace Rd, Tempe, AZ 85281",
    latitude: 33.4196,
    longitude: -111.9333,
  },
  {
    name: "Oliv Tempe",
    aliases: ["oliv", "oliv tempe"],
    address: "1015 E 8th St, Tempe, AZ 85281",
    latitude: 33.4198,
    longitude: -111.9279,
  },
  {
    name: "Sol Tempe",
    aliases: ["sol", "sol tempe", "sol apartments"],
    address: "1900 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4149,
    longitude: -111.9056,
  },
  {
    name: "Redpoint Tempe",
    aliases: ["redpoint", "redpoint tempe", "red point"],
    address: "1815 E Broadway Rd, Tempe, AZ 85282",
    latitude: 33.4067,
    longitude: -111.9082,
  },
  {
    name: "Onnix Tempe",
    aliases: ["onnix", "onnix tempe", "onnix apartments"],
    address: "1520 E Broadway Rd, Tempe, AZ 85282",
    latitude: 33.4078,
    longitude: -111.9136,
  },
  {
    name: "Agave Apartments",
    aliases: ["agave", "agave tempe", "agave apartments"],
    address: "1290 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4148,
    longitude: -111.9182,
  },
  {
    name: "Sanitas on University",
    aliases: ["sanitas", "sanitas on university", "sanitas tempe"],
    address: "1840 E University Dr, Tempe, AZ 85281",
    latitude: 33.4222,
    longitude: -111.9073,
  },
  {
    name: "Park Place Tempe",
    aliases: ["park place", "park place tempe"],
    address: "1315 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4142,
    longitude: -111.9175,
  },
  {
    name: "Alight Tempe",
    aliases: ["alight", "alight tempe"],
    address: "1820 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4149,
    longitude: -111.9078,
  },
  {
    name: "Tempe Metro",
    aliases: ["tempe metro", "metro tempe"],
    address: "1811 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4141,
    longitude: -111.9083,
  },
  {
    name: "The Carmin",
    aliases: ["the carmin", "carmin", "carmin tempe"],
    address: "711 S Rural Rd, Tempe, AZ 85281",
    latitude: 33.4223,
    longitude: -111.9258,
  },
  {
    name: "Atmosphere Tempe",
    aliases: ["atmosphere", "atmosphere tempe"],
    address: "707 S Forest Ave, Tempe, AZ 85281",
    latitude: 33.4225,
    longitude: -111.9365,
  },
  {
    name: "922 Place",
    aliases: ["922 place", "922 tempe"],
    address: "922 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4147,
    longitude: -111.9252,
  },
  {
    name: "Mirabella at ASU",
    aliases: ["mirabella", "mirabella at asu"],
    address: "65 E University Dr, Tempe, AZ 85281",
    latitude: 33.4216,
    longitude: -111.9389,
  },
  {
    name: "Skywater at Town Lake",
    aliases: ["skywater", "skywater tempe", "tempe town lake"],
    address: "600 E Curry Rd, Tempe, AZ 85281",
    latitude: 33.4368,
    longitude: -111.9296,
  },
  {
    name: "Culdesac Tempe",
    aliases: ["culdesac", "culdesac tempe"],
    address: "2025 E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4143,
    longitude: -111.8995,
  },
  {
    name: "Lemon Street / Dorsey Corridor",
    aliases: ["lemon st", "lemon street", "dorsey", "dorsey ln", "dorsey lane"],
    address: "E Lemon St & S Dorsey Ln, Tempe, AZ 85281",
    latitude: 33.4177,
    longitude: -111.9163,
  },
  {
    name: "Mill Avenue District",
    aliases: ["mill ave", "mill avenue", "downtown tempe"],
    address: "S Mill Ave, Tempe, AZ 85281",
    latitude: 33.4255,
    longitude: -111.9403,
  },
  {
    name: "McClintock & Apache",
    aliases: ["mcclintock", "mcclintock dr", "mcclintock and apache"],
    address: "S McClintock Dr & E Apache Blvd, Tempe, AZ 85281",
    latitude: 33.4147,
    longitude: -111.9091,
  },
  {
    name: "Rural & Broadway",
    aliases: ["rural and broadway", "broadway rd", "broadway road", "rural rd"],
    address: "S Rural Rd & E Broadway Rd, Tempe, AZ 85282",
    latitude: 33.4074,
    longitude: -111.9261,
  },
  {
    name: "ASU Downtown Phoenix Campus",
    aliases: ["asu downtown", "downtown phoenix campus", "roosevelt row"],
    address: "411 N Central Ave, Phoenix, AZ 85004",
    latitude: 33.4535,
    longitude: -112.0732,
  },
  {
    name: "ASU Polytechnic Campus",
    aliases: ["asu poly", "polytechnic", "poly campus"],
    address: "7001 E Williams Field Rd, Mesa, AZ 85212",
    latitude: 33.3064,
    longitude: -111.6788,
  },
];

export const AREA_CENTERS: Record<string, AreaCenter> = {
  "85281": { label: "Tempe, AZ 85281", latitude: 33.4242, longitude: -111.9281 },
  "85282": { label: "Tempe, AZ 85282", latitude: 33.3974, longitude: -111.9315 },
  "85283": { label: "Tempe, AZ 85283", latitude: 33.3665, longitude: -111.9299 },
  "85284": { label: "Tempe, AZ 85284", latitude: 33.338, longitude: -111.9294 },
  "85004": { label: "Phoenix, AZ 85004", latitude: 33.4484, longitude: -112.074 },
  "85201": { label: "Mesa, AZ 85201", latitude: 33.4314, longitude: -111.8338 },
  "85251": { label: "Scottsdale, AZ 85251", latitude: 33.4942, longitude: -111.9261 },
  "85719": { label: "Tucson, AZ 85719", latitude: 32.2384, longitude: -110.9492 },
  tempe: { label: "Tempe, AZ", latitude: 33.4255, longitude: -111.94 },
  "tempe az": { label: "Tempe, AZ", latitude: 33.4255, longitude: -111.94 },
  "tempe, az": { label: "Tempe, AZ", latitude: 33.4255, longitude: -111.94 },
  phoenix: { label: "Phoenix, AZ", latitude: 33.4484, longitude: -112.074 },
  mesa: { label: "Mesa, AZ", latitude: 33.4152, longitude: -111.8315 },
  scottsdale: { label: "Scottsdale, AZ", latitude: 33.4942, longitude: -111.9261 },
  tucson: { label: "Tucson, AZ", latitude: 32.2226, longitude: -110.9747 },
  chandler: { label: "Chandler, AZ", latitude: 33.3062, longitude: -111.8413 },
  gilbert: { label: "Gilbert, AZ", latitude: 33.3528, longitude: -111.789 },
};

export function normalizeAreaKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findApartment(text: string): ApartmentEntry | null {
  const normalized = normalizeAreaKey(text);
  if (!normalized) return null;

  let best: ApartmentEntry | null = null;
  let bestLength = 0;

  for (const apartment of TEMPE_APARTMENTS) {
    const candidates = [apartment.name, ...apartment.aliases];
    for (const candidate of candidates) {
      const key = normalizeAreaKey(candidate);
      if (!key) continue;
      const matches =
        normalized === key ||
        new RegExp(`(^|\\s)${escapeRegExp(key)}($|\\s)`).test(normalized);
      if (matches && key.length > bestLength) {
        best = apartment;
        bestLength = key.length;
      }
    }
  }

  return best;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
