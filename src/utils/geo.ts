
import { Site } from "../types";

// Calculates the distance between two points in meters
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const isWithinRange = (
  userLat: number,
  userLng: number,
  siteLat: number,
  siteLng: number,
  radiusMeters: number = 100
): boolean => {
  const distance = calculateDistance(userLat, userLng, siteLat, siteLng);
  return distance <= radiusMeters;
};

export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
    } else {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      });
    }
  });
};

export const findNearestSite = (lat: number, lng: number, sites: Site[]): Site | null => {
  if (sites.length === 0) return null;
  
  let nearest: Site | null = null;
  let minDistance = Infinity;

  sites.forEach(site => {
    const dist = calculateDistance(lat, lng, site.latitude, site.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = site;
    }
  });

  return nearest;
};
