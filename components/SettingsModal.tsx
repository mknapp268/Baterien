import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Save, Server } from 'lucide-react';
import { HASettings } from '../types';
import { validateConnection } from '../services/haService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: HASettings) => void;
  initialSettings: HASettings;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialSettings }) => {
  const [url, setUrl] = useState(initialSettings.url);
  const [token, setToken] = useState(initialSettings.token);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      setUrl(initialSettings.url);
      setToken(initialSettings.token);
      setStatus('idle');
    }
  }, [isOpen, initialSettings]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    setStatus('testing');
    const settings = { url, token };
    const success = await validateConnection(settings);
    
    if (success) {
      setStatus('success');
      setTimeout(() => {
        onSave(settings);
        onClose();
      }, 1000);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 w-full max-w-md rounded-xl border border-gray-700 shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Home Assistant Verbindung</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Home Assistant URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://homeassistant.local:8123"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Muss inkl. http:// oder https:// sein.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Long-Lived Access Token</label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full h-24 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Profil &rarr; Sicherheit &rarr; Langlebige Zugangstoken erstellen
            </p>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-700/50 p-3 rounded text-xs text-yellow-200 flex items-start">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Wichtig:</strong> Damit diese App zugreifen kann, musst du CORS in deiner HA <code>configuration.yaml</code> aktivieren:
              <pre className="mt-1 bg-black/30 p-1 rounded overflow-x-auto">
                http:<br/>
                &nbsp;&nbsp;cors_allowed_origins:<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;- https://deine-app-url<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;- *
              </pre>
            </div>
          </div>

          {status === 'error' && (
             <div className="text-red-400 text-sm flex items-center bg-red-900/20 p-2 rounded">
               <AlertTriangle className="w-4 h-4 mr-2" />
               Verbindung fehlgeschlagen. Prüfe URL, Token und CORS.
             </div>
          )}

          {status === 'success' && (
             <div className="text-green-400 text-sm flex items-center bg-green-900/20 p-2 rounded">
               <Check className="w-4 h-4 mr-2" />
               Verbindung erfolgreich!
             </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={handleTestAndSave}
            disabled={status === 'testing'}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 disabled:opacity-50 transition-colors"
          >
            {status === 'testing' ? (
              <span>Prüfe...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Speichern & Verbinden</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};