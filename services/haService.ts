import { InventoryItem, BatteryType, DeviceLocation, HASettings } from '../types';

export const validateConnection = async (settings: HASettings): Promise<boolean> => {
  try {
    const cleanUrl = settings.url.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/`, {
      headers: {
        'Authorization': `Bearer ${settings.token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error("HA Connection Error:", error);
    return false;
  }
};

export const fetchHABatteries = async (settings: HASettings): Promise<InventoryItem[]> => {
  try {
    const cleanUrl = settings.url.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/states`, {
      headers: {
        'Authorization': `Bearer ${settings.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch states");
    }

    const states = await response.json();

    // Filter for batteries
    // 1. device_class: battery
    // 2. entity_id ends with _battery_level or _battery
    // 3. unit_of_measurement is %
    const batteryEntities = states.filter((entity: any) => {
      const attrs = entity.attributes || {};
      const id = entity.entity_id;
      
      const isBatteryClass = attrs.device_class === 'battery';
      const looksLikeBattery = id.endsWith('_battery_level') || id.endsWith('_battery');
      const hasPercentage = attrs.unit_of_measurement === '%';
      
      // Ignore binary_sensors (good/bad) for now, focus on percentage sensors
      const isSensor = id.startsWith('sensor.');

      return isSensor && (isBatteryClass || (looksLikeBattery && hasPercentage));
    });

    return batteryEntities.map((entity: any) => {
      const level = parseFloat(entity.state);
      const lastUpdated = entity.last_updated; // ISO string from HA
      
      // Try to guess location from name
      let location = DeviceLocation.OTHER;
      const friendlyName = entity.attributes.friendly_name || "";
      
      if (friendlyName.toLowerCase().includes('wohnzimmer')) location = DeviceLocation.LIVING_ROOM;
      else if (friendlyName.toLowerCase().includes('küche')) location = DeviceLocation.KITCHEN;
      else if (friendlyName.toLowerCase().includes('schlafzimmer')) location = DeviceLocation.BEDROOM;
      else if (friendlyName.toLowerCase().includes('bad')) location = DeviceLocation.BATHROOM;
      else if (friendlyName.toLowerCase().includes('flur')) location = DeviceLocation.HALLWAY;
      else if (friendlyName.toLowerCase().includes('büro')) location = DeviceLocation.OFFICE;
      else if (friendlyName.toLowerCase().includes('keller')) location = DeviceLocation.BASEMENT;

      // Create a temp item
      return {
        id: crypto.randomUUID(), // Will be handled by merger if entity_id exists
        deviceName: friendlyName.replace(' Battery Level', '').replace(' Batteriestatus', ''),
        location: location,
        batteryType: BatteryType.OTHER, // HA usually doesn't know the physical type
        batteryCount: 1, // Assumption
        estimatedLevel: isNaN(level) ? 0 : level,
        lastChanged: lastUpdated,
        haEntityId: entity.entity_id
      } as InventoryItem;
    });

  } catch (error) {
    console.error("Error fetching HA entities:", error);
    throw error;
  }
};