// Auto-detect upcoming/current Indian festivals based on date
// Dates are approximate (some festivals shift by lunar calendar)

export interface FestivalInfo {
  name: string;
  emoji: string;
  greeting: string;
}

interface FestivalDate {
  month: number; // 1-12
  day: number;
  range: number; // days before/after to consider "active"
  info: FestivalInfo;
}

// Fixed/approximate dates (lunar festivals use approximate Gregorian dates)
const FESTIVAL_DATES: FestivalDate[] = [
  {
    month: 1, day: 14, range: 3,
    info: { name: "Pongal", emoji: "🌾", greeting: "Happy Pongal! Pongal O Pongal!" },
  },
  {
    month: 1, day: 26, range: 2,
    info: { name: "Republic Day", emoji: "🇮🇳", greeting: "Happy Republic Day!" },
  },
  {
    month: 3, day: 14, range: 5,
    info: { name: "Holi", emoji: "🎨", greeting: "Happy Holi! Rang Barse!" },
  },
  {
    month: 4, day: 10, range: 5,
    info: { name: "Eid", emoji: "🌙", greeting: "Eid Mubarak!" },
  },
  {
    month: 8, day: 15, range: 2,
    info: { name: "Independence Day", emoji: "🇮🇳", greeting: "Happy Independence Day!" },
  },
  {
    month: 8, day: 19, range: 5,
    info: { name: "Raksha Bandhan", emoji: "🪢", greeting: "Happy Raksha Bandhan!" },
  },
  {
    month: 9, day: 7, range: 10,
    info: { name: "Ganesh Chaturthi", emoji: "🐘", greeting: "Ganpati Bappa Morya!" },
  },
  {
    month: 9, day: 20, range: 10,
    info: { name: "Navratri", emoji: "🪔", greeting: "Happy Navratri!" },
  },
  {
    month: 8, day: 26, range: 5,
    info: { name: "Onam", emoji: "🌸", greeting: "Happy Onam! Onam Ashamsakal!" },
  },
  {
    month: 10, day: 20, range: 7,
    info: { name: "Diwali", emoji: "🪔", greeting: "Happy Diwali! Shubh Deepawali!" },
  },
  {
    month: 12, day: 25, range: 3,
    info: { name: "Christmas", emoji: "🎄", greeting: "Merry Christmas!" },
  },
  {
    month: 12, day: 31, range: 2,
    info: { name: "New Year", emoji: "🎆", greeting: "Happy New Year!" },
  },
  {
    month: 1, day: 1, range: 2,
    info: { name: "New Year", emoji: "🎆", greeting: "Happy New Year!" },
  },
];

export function detectCurrentFestival(date: Date = new Date()): FestivalInfo | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  for (const fd of FESTIVAL_DATES) {
    const diff = Math.abs(
      (month - fd.month) * 30 + (day - fd.day)
    );
    if (diff <= fd.range) {
      return fd.info;
    }
  }
  return null;
}

export const ALL_FESTIVALS = [
  "None",
  "Diwali",
  "Holi",
  "Eid",
  "Raksha Bandhan",
  "Onam",
  "Pongal",
  "Navratri",
  "Ganesh Chaturthi",
  "Christmas",
  "New Year",
  "Republic Day",
  "Independence Day",
];
