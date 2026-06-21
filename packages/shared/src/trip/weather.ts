/**
 * Open-Meteo forecast parsing (Task 9.1, rahi-docs/07 §5). Keyless, free. Pure
 * parser so the trip-pack can cache a corridor's forecast offline and the result
 * is testable. We fetch the daily forecast for the route window and keep a small
 * summary on-device.
 */
export interface DailyForecast {
  date: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  precipMm: number | null;
  windMaxKmh: number | null;
  weatherCode: number | null;
}

/** Shape of the Open-Meteo `daily` response block we request. */
export interface OpenMeteoDaily {
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
    weather_code?: (number | null)[];
  };
}

export const OPEN_METEO_DAILY_PARAMS =
  'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code';

export function buildOpenMeteoUrl(base: string, lat: number, lng: number): string {
  const u = new URL('/v1/forecast', base);
  u.searchParams.set('latitude', String(lat));
  u.searchParams.set('longitude', String(lng));
  u.searchParams.set('daily', OPEN_METEO_DAILY_PARAMS);
  u.searchParams.set('timezone', 'auto');
  return u.toString();
}

export function parseOpenMeteoDaily(body: OpenMeteoDaily): DailyForecast[] {
  const d = body.daily;
  if (!d?.time) return [];
  return d.time.map((date, i) => ({
    date,
    tempMaxC: d.temperature_2m_max?.[i] ?? null,
    tempMinC: d.temperature_2m_min?.[i] ?? null,
    precipMm: d.precipitation_sum?.[i] ?? null,
    windMaxKmh: d.wind_speed_10m_max?.[i] ?? null,
    weatherCode: d.weather_code?.[i] ?? null,
  }));
}

/** Flag riding-relevant rough days (heavy rain or high wind) for the trip pack. */
export function roughDays(forecast: DailyForecast[]): DailyForecast[] {
  return forecast.filter((f) => (f.precipMm ?? 0) >= 20 || (f.windMaxKmh ?? 0) >= 40);
}
