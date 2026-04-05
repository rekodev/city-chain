export type CityData = {
  name: string;
  lat: number;
  lng: number;
};

export type ChainEntry = {
  city: CityData;
  player?: 0 | 1;
};
