export interface Store {
  uid?: string;
  n: string; // name
  f?: string; // features
  do?: string;
  eat?: string;
  w?: string; // warning
  r?: string; // review
  tips?: string;
  price?: string;
  minSpend?: string;
  zone?: string;
  cuisine?: string;
  hours?: string;
  lat?: number;
  lng?: number;
  img?: string;
}

export interface RouteItem {
  uid: string;
  n: string;
  date?: string; // YYYY-MM-DD
}

export interface LiveLocation {
  lat: number;
  lng: number;
  timestamp: number;
}
