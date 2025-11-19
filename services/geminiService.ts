import { GoogleGenAI, Type } from "@google/genai";
import { ScanResult } from '../types';

// Safe initialization check
const apiKey = process.env.API_KEY || '';

export const analyzeDeviceImage = async (base64Image: string): Promise<ScanResult> => {
  if (!apiKey) {
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] // Remove data:image/jpeg;base64, prefix
          }
        },
        {
          text: `Analysiere dieses Bild für eine Home Assistant Inventar-App. 
          Erkenne, ob es sich um eine Batterie oder ein Gerät handelt, das Batterien benötigt (z.B. Thermostat, Sensor, Fernbedienung).
          Extrahiere:
          1. Einen passenden Gerätenamen (z.B. "Heizkörperthermostat" oder "Duracell AA").
          2. Den wahrscheinlichen Batterietyp (AA, AAA, CR2032, etc.).
          3. Die Anzahl der Batterien (Schätzung).
          
          Antworte im JSON Format.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            deviceName: { type: Type.STRING },
            batteryType: { type: Type.STRING },
            batteryCount: { type: Type.NUMBER },
            confidence: { type: Type.STRING, description: "High, Medium, or Low" }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return {};
    return JSON.parse(text) as ScanResult;

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return { deviceName: "Unbekanntes Gerät" };
  }
};