export interface CityData {
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: CityData[] = [
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Oslo", lat: 59.9139, lng: 10.7522 },
  { name: "Ottawa", lat: 45.4215, lng: -75.6972 },
  { name: "Athens", lat: 37.9838, lng: 23.7275 },
  { name: "Seoul", lat: 37.5665, lng: 126.978 },
  { name: "Lima", lat: -12.0464, lng: -77.0428 },
  { name: "Amsterdam", lat: 52.3676, lng: 4.9041 },
  { name: "Moscow", lat: 55.7558, lng: 37.6173 },
  { name: "Warsaw", lat: 52.2297, lng: 21.0122 },
  { name: "Wellington", lat: -41.2865, lng: 174.7762 },
  { name: "Nairobi", lat: -1.2921, lng: 36.8219 },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Nicosia", lat: 35.1856, lng: 33.3823 },
  { name: "Ankara", lat: 39.9334, lng: 32.8597 },
  { name: "Algiers", lat: 36.7538, lng: 3.0588 },
  { name: "Stockholm", lat: 59.3293, lng: 18.0686 },
  { name: "Manila", lat: 14.5995, lng: 120.9842 },
  { name: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
  { name: "Islamabad", lat: 33.6844, lng: 73.0479 },
  { name: "Dublin", lat: 53.3498, lng: -6.2603 },
  { name: "New Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Riga", lat: 56.9496, lng: 24.1052 },
  { name: "Accra", lat: 5.6037, lng: -0.187 },
  { name: "Addis Ababa", lat: 9.025, lng: 38.7469 },
  { name: "Bogota", lat: 4.711, lng: -74.0721 },
  { name: "Minsk", lat: 53.9006, lng: 27.559 },
  { name: "Kyiv", lat: 50.4501, lng: 30.5234 },
  { name: "Vienna", lat: 48.2082, lng: 16.3738 },
  { name: "Havana", lat: 23.1136, lng: -82.3666 },
  { name: "Baku", lat: 40.4093, lng: 49.8671 },
  { name: "Ulaanbaatar", lat: 47.8864, lng: 106.9057 },
  { name: "Rome", lat: 41.9028, lng: 12.4964 },
  { name: "Edinburgh", lat: 55.9533, lng: -3.1883 },
  { name: "Helsinki", lat: 60.1699, lng: 24.9384 },
];

export function findCity(name: string): CityData | undefined {
  return CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export function isCityValid(name: string): boolean {
  return CITIES.some((c) => c.name.toLowerCase() === name.toLowerCase());
}
