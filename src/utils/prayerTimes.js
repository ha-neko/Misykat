import {
  PrayerTimes,
  Coordinates,
  CalculationMethod,
  Madhab,
  HighLatitudeRule,
} from 'adhan';

export function calculatePrayerTimes(latitude, longitude, date = new Date()) {
  const coordinates = new Coordinates(latitude, longitude);
  const params = CalculationMethod.Singapore();
  params.madhab = Madhab.Shafi;
  params.highLatitudeRule = HighLatitudeRule.TwilightAngle;

  const times = new PrayerTimes(coordinates, date, params);

  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

export const prayerNames = {
  fajr: 'Subuh',
  dhuhr: 'Dzuhur',
  asr: 'Ashar',
  maghrib: 'Maghrib',
  isha: 'Isya',
};

export const prayerOrder = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export function formatPrayerTime(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getNextPrayer(prayerTimes) {
  const now = new Date();
  for (const prayer of prayerOrder) {
    if (prayerTimes[prayer] > now) {
      return { name: prayerNames[prayer], key: prayer, time: prayerTimes[prayer] };
    }
  }
  const tomorrow = calculatePrayerTimes(
    prayerTimes.fajr.getFullYear,
    null,
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  );
  return { name: prayerNames.fajr, key: 'fajr', time: tomorrow.fajr };
}
