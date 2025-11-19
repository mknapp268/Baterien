import { InventoryItem } from '../types';

const STORAGE_KEY = 'ha_battery_inventory';

export const saveInventory = (items: InventoryItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save inventory", error);
  }
};

export const loadInventory = (): InventoryItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load inventory", error);
    return [];
  }
};