export interface StoredAddress {
  address: string;
  latitude: number;
  longitude: number;
}

const ADDRESS_STORAGE_KEY = 'nyc-school-finder-home-address';

export function getStoredAddress(): StoredAddress | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(ADDRESS_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setStoredAddress(address: StoredAddress): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(address));
  } catch (error) {
    console.error('Failed to store address:', error);
  }
}

export function clearStoredAddress(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(ADDRESS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear address:', error);
  }
}
