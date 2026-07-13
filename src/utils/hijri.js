const ARABIC_MONTHS = [
  'Muharram', 'Safar', 'Rabiul Awwal', 'Rabiul Akhir',
  'Jumadil Awwal', 'Jumadil Akhir', 'Rajab', 'Syaban',
  'Ramadan', 'Syawal', 'Zulqadah', 'Zulhijjah',
];

const INDONESIAN_MONTHS = [
  'Muharram', 'Safar', 'Rabiul Awal', 'Rabiul Akhir',
  'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban',
  'Ramadan', 'Syawal', 'Zulqadah', 'Zulhijjah',
];

function julianDay(gy, gm, gd) {
  let y = gy, m = gm, d = gd;
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

export function gregorianToHijri(date = new Date()) {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  const jd = julianDay(gy, gm, gd);

  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - n * 10631;
  const m = Math.floor((l2 - 1 + 0.5) / 354.366);
  const l3 = l2 - Math.floor(354.366 * m + 0.5);
  const hy = Math.floor(n * 30 + m - 1) + 1;
  const hm = Math.floor(m) + 1;
  const hd = Math.floor(l3);

  const months = hm - 1;
  return { hy, hm: months + 1, hd: Math.max(1, hd) };
}

export function getHijriDateString(date = new Date(), lang = 'id') {
  const { hy, hm, hd } = gregorianToHijri(date);
  const months = lang === 'en' ? ARABIC_MONTHS : INDONESIAN_MONTHS;
  const monthName = months[hm - 1] || '';
  return `${hd} ${monthName} ${hy} H`;
}

export function getHijriDate(date = new Date()) {
  const { hy, hm, hd } = gregorianToHijri(date);
  return { year: hy, month: hm, day: hd };
}

function hijriMonthDays(hy, hm) {
  const jd1 = julianDay(hy, hm, 1);
  const jd2 = hm === 12 ? julianDay(hy + 1, 1, 1) : julianDay(hy, hm + 1, 1);
  return Math.round(jd2 - jd1);
}

export function getHijriMonthGrid(hy, hm) {
  const firstDayJd = julianDay(hy, hm, 1);
  const firstGregorian = new Date(Math.round((firstDayJd - 2440587.5) * 86400000));
  const startDay = firstGregorian.getDay();
  const daysInMonth = hijriMonthDays(hy, hm);
  const grid = [];
  let week = [];
  for (let i = 0; i < startDay; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return { grid, daysInMonth, startDay };
}

export const hijriMonths = ARABIC_MONTHS;
export const hijriMonthsId = INDONESIAN_MONTHS;
