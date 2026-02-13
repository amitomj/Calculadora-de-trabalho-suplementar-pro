
import React, { useState } from 'react';
import { MonthData, WorkType, DetectedTable } from '../types';
import { MONTHS } from '../constants';

interface Props {
  tables: MonthData[];
  setTables: React.Dispatch<React.SetStateAction<MonthData[]>>;
  detectedCrops: DetectedTable[];
  onAdvance: () => void;
}

export const EditingTab: React.FC<Props> = ({ tables, setTables, detectedCrops, onAdvance }) => {
  const [selectedCrop, setSelectedCrop] = useState<DetectedTable | null>(null);

  const updateDay = (tableId: string, dayId: string, field: 'day' | 'hours' | 'type', value: any) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return {
        ...t,
        days: t.days.map(d => {
          if (d.id !== dayId) return d;
          return { ...d, [field]: value };
        })
      };
    }));
  };

  const removeDay = (tableId: string, dayId: string) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return { ...t, days: t.days.filter(d => d.id !== dayId) };
    }));
  };

  const bulkSetType = (tableId: string, type: WorkType) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return {
        ...t,
        days: t.days.map(d => ({ ...d, type }))
      };
    }));
  };

  const updateTableInfo = (tableId: string, field: 'month' | 'year', value: number) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return { ...t, [field]: value };
    }));
  };

  const openOriginal = (sourceId?: string) => {
    const crop = detectedCrops.find(c => c.id === sourceId);
    if (crop) setSelectedCrop(crop);
  };

  return (
    <div className="space-y-8">
      {tables.map(table => (
        <div key={table.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <select 
                value={table.month} 
                onChange={(e) => updateTableInfo(table.id, 'month', parseInt(e.target.value))}
                className="font-bold text-gray-800 bg-transparent border-none focus:ring-0 cursor-pointer"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <input 
                type="number" 
                value={table.year}
                onChange={(e) => updateTableInfo(table.id, 'year', parseInt(e.target.value))}
                className="w-20 font-bold text-gray-800 bg-transparent border-none focus:ring-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-xs font-bold text-gray-500 uppercase">Classificar Mês:</span>
                <select 
                  onChange={(e) => bulkSetType(table.id, e.target.value as WorkType)}
                  className="text-sm font-semibold text-blue-600 focus:ring-0 outline-none bg-transparent cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Selecionar...</option>
                  {Object.values(WorkType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => openOriginal(table.sourceCropId)}
                className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <span>Ver Original</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                  <th className="px-6 py-3 border-b">Dia</th>
                  <th className="px-6 py-3 border-b">Horas</th>
                  <th className="px-6 py-3 border-b">Tipo de Trabalho</th>
                  <th className="px-6 py-3 border-b text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {table.days.map(day => (
                  <tr key={day.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <input 
                        type="number" 
                        value={day.day} 
                        onChange={(e) => updateDay(table.id, day.id, 'day', parseInt(e.target.value))}
                        className="w-16 border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <input 
                        type="number" 
                        step="0.5"
                        value={day.hours} 
                        onChange={(e) => updateDay(table.id, day.id, 'hours', parseFloat(e.target.value))}
                        className="w-20 border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <select 
                        value={day.type} 
                        onChange={(e) => updateDay(table.id, day.id, 'type', e.target.value as WorkType)}
                        className="border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none w-full max-w-[200px]"
                      >
                        {Object.values(WorkType).map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button 
                        onClick={() => removeDay(table.id, day.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Verification Modal */}
      {selectedCrop && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-800">Original: {selectedCrop.description}</h4>
              <button onClick={() => setSelectedCrop(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-900 p-4 flex items-center justify-center">
              <img src={selectedCrop.previewUrl} alt="Original" className="max-w-full h-auto shadow-lg" />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button 
          onClick={onAdvance}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all"
        >
          Confirmar e Avançar
        </button>
      </div>
    </div>
  );
};
