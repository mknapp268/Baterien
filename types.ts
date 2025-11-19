export enum BatteryType {
  AA = 'AA',
  AAA = 'AAA',
  CR2032 = 'CR2032',
  CR2025 = 'CR2025',
  CR123A = 'CR123A',
  NINE_VOLT = '9V',
  OTHER = 'Andere'
}

export enum DeviceLocation {
  LIVING_ROOM = 'Wohnzimmer',
  KITCHEN = 'Küche',
  BEDROOM = 'Schlafzimmer',
  BATHROOM = 'Badezimmer',
  HALLWAY = 'Flur',
  OFFICE = 'Büro',
  BASEMENT = 'Keller',
  OUTSIDE = 'Draußen',
  OTHER = 'Sonstiges'
}

export interface InventoryItem {
  id: string;
  deviceName: string;
  location: DeviceLocation | string;
  batteryType: BatteryType | string;
  batteryCount: number;
  estimatedLevel?: number; // 0-100 percentage
  lastChanged: string; // ISO Date
  notes?: string;
  imageUrl?: string; // Optional image of device
  haEntityId?: string; // Link to Home Assistant Entity
}

export interface ScanResult {
  deviceName?: string;
  batteryType?: string;
  batteryCount?: number;
  confidence?: string;
}

export interface HASettings {
  url: string;
  token: string;
}