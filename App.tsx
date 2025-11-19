import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Battery, LayoutDashboard, List, Search, X, Sparkles, Zap, Save, Settings, RefreshCw, Download } from 'lucide-react';
import { InventoryItem, BatteryType, DeviceLocation, HASettings } from './types';
import { saveInventory, loadInventory } from './services/storageService';
import { analyzeDeviceImage } from './services/geminiService';
import { fetchHABatteries } from './services/haService';
import { InventoryItemCard } from './components/InventoryItemCard';
import { StatCard } from './components/StatCard';
import { CameraScanner } from './components/CameraScanner';
import { SettingsModal } from './components/SettingsModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Tabs
enum Tab {
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  ADD = 'add'
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [haSettings, setHaSettings] = useState<HASettings>({ url: '', token: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    location: string;
    type: string;
    count: number;
    level: number;
    haEntityId?: string;
  }>({ name: '', location: DeviceLocation.LIVING_ROOM, type: BatteryType.AA, count: 2, level: 100 });

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const data = loadInventory();
    setInventory(data);
    
    // Load Settings
    const storedSettings = localStorage.getItem('ha_settings');
    if (storedSettings) {
      setHaSettings(JSON.parse(storedSettings));
    }
  }, []);

  useEffect(() => {
    saveInventory(inventory);
  }, [inventory]);

  const saveSettings = (newSettings: HASettings) => {
    setHaSettings(newSettings);
    localStorage.setItem('ha_settings', JSON.stringify(newSettings));
  };

  const handleSyncHA = async () => {
    if (!haSettings.url || !haSettings.token) {
      setShowSettings(true);
      return;
    }

    setIsSyncing(true);
    try {
      const haItems = await fetchHABatteries(haSettings);
      
      setInventory(prevInventory => {
        const newInventory = [...prevInventory];
        let addedCount = 0;
        let updatedCount = 0;

        haItems.forEach(haItem => {
          // Check if item already exists based on Entity ID
          const existingIndex = newInventory.findIndex(i => i.haEntityId === haItem.haEntityId);
          
          if (existingIndex >= 0) {
            // Update existing
            const existing = newInventory[existingIndex];
            newInventory[existingIndex] = {
              ...existing,
              estimatedLevel: haItem.estimatedLevel,
              lastChanged: haItem.lastChanged // Update timestamp from HA
            };
            updatedCount++;
          } else {
            // Add new
            newInventory.push(haItem);
            addedCount++;
          }
        });

        alert(`Sync erfolgreich!\n${addedCount} neue Geräte hinzugefügt.\n${updatedCount} Geräte aktualisiert.`);
        return newInventory;
      });
      
      setActiveTab(Tab.INVENTORY);
    } catch (error) {
      alert("Synchronisation fehlgeschlagen. Bitte Einstellungen prüfen (CORS?).");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (formData.id) {
      // Edit mode
      setInventory(prev => prev.map(item => 
        item.id === formData.id 
        ? { 
            ...item, 
            deviceName: formData.name, 
            location: formData.location, 
            batteryType: formData.type, 
            batteryCount: Number(formData.count),
            estimatedLevel: Number(formData.level),
            lastChanged: Number(formData.level) === 100 && item.estimatedLevel !== 100 ? new Date().toISOString() : item.lastChanged,
            haEntityId: formData.haEntityId
          }
        : item
      ));
    } else {
      // Add mode
      const newItem: InventoryItem = {
        id: crypto.randomUUID(),
        deviceName: formData.name,
        location: formData.location,
        batteryType: formData.type,
        batteryCount: Number(formData.count),
        estimatedLevel: Number(formData.level),
        lastChanged: new Date().toISOString(),
        haEntityId: formData.haEntityId
      };
      setInventory([...inventory, newItem]);
    }
    
    resetForm();
    setActiveTab(Tab.INVENTORY);
  };

  const resetForm = () => {
    setFormData({ id: undefined, name: '', location: DeviceLocation.LIVING_ROOM, type: BatteryType.AA, count: 2, level: 100, haEntityId: undefined });
  };

  const deleteItem = (id: string) => {
    if (window.confirm('Eintrag wirklich löschen?')) {
      setInventory(inventory.filter(i => i.id !== id));
    }
  };

  const editItem = (item: InventoryItem) => {
    setFormData({
      id: item.id,
      name: item.deviceName,
      location: item.location,
      type: item.batteryType,
      count: item.batteryCount,
      level: item.estimatedLevel !== undefined ? item.estimatedLevel : 100,
      haEntityId: item.haEntityId
    });
    setActiveTab(Tab.ADD);
  };

  const handleScan = async (imageSrc: string) => {
    setShowCamera(false);
    setIsAnalyzing(true);
    setActiveTab(Tab.ADD);
    
    try {
      const result = await analyzeDeviceImage(imageSrc);
      setFormData(prev => ({
        ...prev,
        name: result.deviceName || prev.name,
        type: result.batteryType || prev.type,
        count: result.batteryCount || prev.count,
        level: 100 // Assume new batteries on scan usually
      }));
    } catch (err) {
      alert("KI Analyse fehlgeschlagen.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => 
      item.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventory, searchTerm]);

  const stats = useMemo(() => {
    const totalBatteries = inventory.reduce((acc, curr) => acc + curr.batteryCount, 0);
    const totalDevices = inventory.length;
    
    const lowBatteryCount = inventory.filter(i => {
       const level = i.estimatedLevel !== undefined ? i.estimatedLevel : 
         Math.max(0, 100 - ((new Date().getTime() - new Date(i.lastChanged).getTime()) / (1000 * 3600 * 24 * 365) * 100));
       return level < 20;
    }).length;

    const typeDistribution = inventory.reduce((acc, curr) => {
      acc[curr.batteryType] = (acc[curr.batteryType] || 0) + curr.batteryCount;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.keys(typeDistribution).map(key => ({
      name: key,
      value: typeDistribution[key]
    }));

    return { totalBatteries, totalDevices, lowBatteryCount, chartData };
  }, [inventory]);

  const exportToYAML = () => {
    let yaml = "# Home Assistant Inventory Export\n\n";
    inventory.forEach(item => {
      yaml += `- device: "${item.deviceName}"\n`;
      yaml += `  location: "${item.location}"\n`;
      yaml += `  battery_type: "${item.batteryType}"\n`;
      yaml += `  count: ${item.batteryCount}\n`;
      yaml += `  level: ${item.estimatedLevel}\n`;
      if (item.haEntityId) yaml += `  ha_entity: "${item.haEntityId}"\n`;
      yaml += "\n";
    });
    
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.yaml';
    a.click();
  };

  if (showCamera) {
    return <CameraScanner onCapture={handleScan} onClose={() => setShowCamera(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 pb-20">
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        onSave={saveSettings}
        initialSettings={haSettings}
      />

      {/* Header - HA Style */}
      <header className="bg-[#03a9f4] p-4 shadow-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
             <Battery className="w-6 h-6 text-white" />
             <h1 className="text-xl font-bold text-white tracking-tight">Batterie Manager</h1>
          </div>
          <div className="flex items-center space-x-2">
             <button 
               onClick={() => setShowSettings(true)}
               className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
               title="Einstellungen"
             >
               <Settings className="w-5 h-5" />
             </button>
             {activeTab === Tab.INVENTORY && (
               <button onClick={exportToYAML} className="text-white p-2 hover:bg-white/10 rounded-full transition" title="YAML Export">
                 <Download className="w-5 h-5" />
               </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        
        {/* DASHBOARD TAB */}
        {activeTab === Tab.DASHBOARD && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard 
                title="Geräte" 
                value={stats.totalDevices} 
                icon={Zap} 
                colorClass="bg-blue-500" 
              />
              <StatCard 
                title="Batterien" 
                value={stats.totalBatteries} 
                icon={Battery} 
                colorClass="bg-green-500" 
              />
               <StatCard 
                title="Wechsel nötig" 
                value={stats.lowBatteryCount} 
                icon={stats.lowBatteryCount > 0 ? Battery : Sparkles} 
                colorClass={stats.lowBatteryCount > 0 ? "bg-red-500" : "bg-gray-500"} 
              />
            </div>
            
            {/* Quick Actions */}
             <div className="flex space-x-3">
              <button 
                onClick={handleSyncHA}
                disabled={isSyncing}
                className="flex-1 bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-center space-x-2 hover:bg-gray-750 transition-colors"
              >
                 <RefreshCw className={`w-5 h-5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                 <span className="font-medium text-gray-200">Sync mit Home Assistant</span>
              </button>
            </div>

            {stats.chartData.length > 0 ? (
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Batterietyp Verteilung</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Noch keine Daten vorhanden.
              </div>
            )}
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === Tab.INVENTORY && (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3.5">
                    <X className="w-5 h-5 text-gray-400 hover:text-white" />
                  </button>
                )}
              </div>
              <button 
                onClick={handleSyncHA}
                disabled={isSyncing}
                className="bg-gray-800 border border-gray-700 text-blue-400 p-3 rounded-lg hover:bg-gray-700 transition-colors"
                title="Sync HA"
              >
                <RefreshCw className={`w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2">
              {filteredInventory.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  Keine Einträge gefunden.
                </div>
              ) : (
                filteredInventory.map(item => (
                  <InventoryItemCard 
                    key={item.id} 
                    item={item} 
                    onDelete={deleteItem}
                    onEdit={editItem}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ADD TAB */}
        {activeTab === Tab.ADD && (
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {formData.id ? 'Gerät bearbeiten' : 'Gerät hinzufügen'}
                </h2>
                {!formData.id && (
                  <button 
                    onClick={() => setShowCamera(true)}
                    className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">KI Scan</span>
                  </button>
                )}
              </div>

              {isAnalyzing && (
                <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg flex items-center text-blue-200 animate-pulse">
                  <Sparkles className="w-5 h-5 mr-3 animate-spin" />
                  Bild wird analysiert...
                </div>
              )}

              <form onSubmit={handleAddItem} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Gerätename</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="z.B. Thermostat Wohnzimmer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Batterietyp</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {Object.values(BatteryType).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Anzahl</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.count}
                      onChange={e => setFormData({...formData, count: parseInt(e.target.value) || 1})}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {formData.haEntityId && (
                   <div className="text-xs text-blue-400 bg-blue-900/20 p-2 rounded border border-blue-500/20">
                     Verknüpft mit HA Entity: <span className="font-mono">{formData.haEntityId}</span>
                   </div>
                )}
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-400">Aktueller Status</label>
                    <span className={`text-sm font-bold ${formData.level < 20 ? 'text-red-400' : formData.level < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {formData.level}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={formData.level}
                    onChange={e => setFormData({...formData, level: parseInt(e.target.value)})}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    disabled={!!formData.haEntityId} 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.haEntityId ? 'Wird durch Home Assistant gesteuert.' : 'Tipp: Setze auf 100%, wenn du neue Batterien einlegst.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Ort</label>
                  <select
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.values(DeviceLocation).map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => { resetForm(); setActiveTab(Tab.DASHBOARD); }}
                    className="flex-1 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg transition-colors font-medium flex justify-center items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Speichern</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 pb-safe z-40">
        <div className="flex justify-around items-center h-16 max-w-4xl mx-auto">
          <button 
            onClick={() => setActiveTab(Tab.DASHBOARD)}
            className={`flex flex-col items-center justify-center w-full h-full ${activeTab === Tab.DASHBOARD ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <LayoutDashboard className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Übersicht</span>
          </button>
          
          <button 
            onClick={() => { resetForm(); setActiveTab(Tab.ADD); }}
            className="flex flex-col items-center justify-center w-full h-full"
          >
            <div className={`p-3 rounded-full ${activeTab === Tab.ADD ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'} transform -translate-y-4 border-4 border-gray-900 transition-all`}>
              <Plus className="w-6 h-6" />
            </div>
            <span className={`text-xs font-medium -mt-3 ${activeTab === Tab.ADD ? 'text-blue-400' : 'text-gray-500'}`}>Neu</span>
          </button>

          <button 
            onClick={() => setActiveTab(Tab.INVENTORY)}
            className={`flex flex-col items-center justify-center w-full h-full ${activeTab === Tab.INVENTORY ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <List className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Inventar</span>
          </button>
        </div>
      </nav>
    </div>
  );
}