import React from 'react';
import { InventoryItem, BatteryType } from '../types';
import { Battery, MapPin, Clock, Trash2, Edit, AlertTriangle, CheckCircle2, Home } from 'lucide-react';

interface Props {
  item: InventoryItem;
  onDelete: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
}

export const InventoryItemCard: React.FC<Props> = ({ item, onDelete, onEdit }) => {
  
  // Helper to get color based on battery type
  const getBatteryTypeColor = (type: string) => {
    switch (type) {
      case BatteryType.AA: return 'text-green-400 border-green-400/30 bg-green-400/10';
      case BatteryType.AAA: return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case BatteryType.CR2032: return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
      case BatteryType.NINE_VOLT: return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      default: return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
    }
  };

  // Calculate health based on estimated level OR date
  const getBatteryHealth = () => {
    let level = item.estimatedLevel;
    let isEstimatedByDate = false;

    if (level === undefined) {
      // Fallback: Calculate based on 1 year expected life
      const lastChanged = new Date(item.lastChanged).getTime();
      const now = new Date().getTime();
      const daysDiff = (now - lastChanged) / (1000 * 3600 * 24);
      
      // Linear decay over 365 days
      level = Math.max(0, 100 - (daysDiff / 365 * 100));
      isEstimatedByDate = true;
    }

    let statusColor = 'bg-green-500';
    let textColor = 'text-green-400';
    let icon = CheckCircle2;

    if (level < 20) {
      statusColor = 'bg-red-500';
      textColor = 'text-red-400';
      icon = AlertTriangle;
    } else if (level < 50) {
      statusColor = 'bg-yellow-500';
      textColor = 'text-yellow-400';
      icon = Battery;
    }

    return { level: Math.round(level), statusColor, textColor, Icon: icon, isEstimatedByDate };
  };

  // Format date relative
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `Vor ${diffDays} Tagen`;
    if (diffDays < 365) return `Vor ${Math.floor(diffDays / 30)} Monaten`;
    return `Vor >1 Jahr`;
  };

  const { level, statusColor, textColor, Icon } = getBatteryHealth();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-3 shadow-sm hover:border-gray-600 transition-all relative group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-white tracking-wide mr-2">{item.deviceName}</h3>
            {item.haEntityId && (
              <div title="Mit Home Assistant verknüpft" className="bg-blue-500/20 p-1 rounded-full">
                <Home className="w-3 h-3 text-blue-400" />
              </div>
            )}
          </div>
          <div className="flex items-center text-gray-400 text-sm mt-1">
            <MapPin className="w-3 h-3 mr-1" />
            <span>{item.location}</span>
          </div>
        </div>
        
        <div className={`px-2 py-1 rounded text-xs font-mono font-bold border flex items-center ${getBatteryTypeColor(item.batteryType)}`}>
          <span className="mr-1">{item.batteryCount}x</span>
          {item.batteryType}
        </div>
      </div>

      {/* Status Section */}
      <div className="bg-gray-900/50 rounded-lg p-3 mt-2">
        <div className="flex justify-between items-end mb-1">
          <div className="flex items-center space-x-2">
            <Icon className={`w-4 h-4 ${textColor}`} />
            <span className={`text-sm font-medium ${textColor}`}>
              {level}% {level < 20 ? 'Wechseln' : 'Batteriestatus'}
            </span>
          </div>
          <div className="text-xs text-gray-500 flex items-center" title={new Date(item.lastChanged).toLocaleDateString('de-DE')}>
            <Clock className="w-3 h-3 mr-1" />
            {getRelativeTime(item.lastChanged)}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mt-1 overflow-hidden">
          <div 
            className={`h-2 rounded-full ${statusColor} transition-all duration-500`} 
            style={{ width: `${level}%` }}
          ></div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="mt-3 flex justify-end space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
         <button 
          onClick={() => onEdit(item)}
          className="p-2 rounded-lg bg-gray-700 hover:bg-blue-600 text-white transition-colors"
          title="Bearbeiten"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-lg bg-gray-700 hover:bg-red-600 text-white transition-colors"
          title="Löschen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};