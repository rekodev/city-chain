import { createServerFn } from '@tanstack/react-start';
import { type CityData } from '@/types/city';

const BASE_URL = 'https://api.api-ninjas.com/v1/city';

type ApiCity = {
  name: string;
  latitude: number;
  longitude: number;
};

export const fetchCity = createServerFn()
  .inputValidator((name: string) => name)
  .handler(async ({ data: name }): Promise<CityData | null> => {
    const url = new URL(BASE_URL);
    url.searchParams.set('name', name);

    const res = await fetch(url.toString(), {
      headers: { 'X-Api-Key': process.env.API_NINJAS_KEY! }
    });

    if (!res.ok) throw new Error('Failed to fetch city');

    const data: ApiCity[] = await res.json();
    const inputNorm = name.trim().toLowerCase();
    const match = data.find((c) => {
      const cityNorm = c.name.trim().toLowerCase();
      if (cityNorm.includes('-')) {
        return inputNorm === cityNorm.split('-')[0].trim();
      }
      return inputNorm === cityNorm;
    });
    if (!match) return null;

    return {
      name: match.name,
      lat: match.latitude,
      lng: match.longitude
    };
  });
