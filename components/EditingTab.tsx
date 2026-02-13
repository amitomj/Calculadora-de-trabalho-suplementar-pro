
import React, { useState, useEffect } from 'react';
import { MonthData, WorkType, DetectedTable } from '../types';
import { MONTHS } from '../constants';

interface Props {
  tables: MonthData[];
  setTables: React.Dispatch<React.SetStateAction<MonthData[]>>;
  detectedCrops: DetectedTable[];
  onAdvance: () => void;
  onRelinkClick: () => void;
}

export const EditingTab: React.FC<Props> = ({ tables, setTables, detectedCrops, onAdvance, onRelinkClick }) => {
  const [selectedCrop, setSelectedCrop] = useState<DetectedTable | null>(null);
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  // Helper to convert Data URL to Blob URL for maximum stability
  useEffect(() => {
    if (selectedCrop && selectedCrop.previewUrl && selectedCrop.previewUrl.startsWith('data:')) {
      try {
        const parts = selectedCrop.previewUrl.split(',');
        const header = parts[0];
        const base64 = parts[1];
        const mime = header.match(/:(.*?);/)?.[1] || selectedCrop.mimeType;
        const binary = atob(base64);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
          array.push(binary.charCodeAt(i));
        }
        const blob = new Blob([new Uint8Array(array)], { type: mime });
        const url = URL.createObjectURL(blob);
        
        // Se for PDF, adicionamos o parâmetro de página ao URL do Blob
        const finalUrl = mime.includes('pdf') && selectedCrop.pageNumber 
          ? `${url}#page=${selectedCrop.pageNumber}` 
          : url;
          
        setModalUrl(finalUrl);
        
        return () => {
          if (url) URL.revokeObjectURL(url);
        };
      } catch (e) {
        console.error("Error creating blob URL:", e);
        setModalUrl(selectedCrop.previewUrl);
      }
    } else if (selectedCrop?.previewUrl) {
      const isPdf = selectedCrop.mimeType.includes('pdf');
      const finalUrl = isPdf && selectedCrop.pageNumber 
        ? `${selectedCrop.previewUrl}#page=${selectedCrop.pageNumber}`
        : selectedCrop.previewUrl;
      setModalUrl(finalUrl);
    } else {
      setModalUrl(null);
    }
  }, [selectedCrop]);

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

  const needsRelink = detectedCrops.some(c => !c.previewUrl || c.previewUrl.length < 100);

  return (
    <div className="space-y-8">
      {needsRelink && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="font-bold text-amber-900">Documentos Base não vinculados</p>
              <p className="text-sm text-amber-700">Para visualizar os originais, selecione os ficheiros correspondentes no seu computador.</p>
            </div>
          </div>
          <button 
            onClick={onRelinkClick}
            className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 shadow-sm transition-all whitespace-nowrap"
          >
            Vincular Ficheiros Base
          </button>
        </div>
      )}

      {tables.map(table => (
        <div key={table.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <div className="flex flex-col">
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
                {table.pageNumber && (
                  <span className="text-[10px] text-blue-600 font-bold px-3 uppercase tracking-wider">Origem: Página {table.pageNumber}</span>
                )}
              </div>
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
                className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center space-x-1 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <span>Ver Original (Pág. {table.pageNumber})</span>
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
          <div className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-white z-10">
              <div className="flex flex-col">
                <h4 className="font-bold text-gray-800">Visualização do Original</h4>
                <p className="text-xs text-gray-500 truncate max-w-md">
                  {selectedCrop.description} ({selectedCrop.fileName}) - PÁGINA {selectedCrop.pageNumber}
                </p>
              </div>
              <button onClick={() => setSelectedCrop(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center relative">
              {modalUrl ? (
                <>
                  {selectedCrop.mimeType.includes('pdf') ? (
                    <iframe 
                      src={modalUrl} 
                      className="w-full h-full border-none bg-white" 
                      title="Original PDF" 
                    />
                  ) : selectedCrop.mimeType.includes('image') ? (
                    <div className="w-full h-full overflow-auto p-4 flex items-start justify-center bg-gray-200">
                       <img 
                        src={modalUrl} 
                        alt="Original Image" 
                        className="max-w-none shadow-lg bg-white" 
                        style={{ minWidth: '100%' }}
                       />
                    </div>
                  ) : (
                    <div className="text-center p-10 bg-white rounded-2xl shadow-sm border max-w-md mx-auto">
                      <svg className="w-20 h-20 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      <p className="text-gray-800 font-bold text-xl">Ficheiro base não encontrado</p>
                      <p className="text-gray-600 mt-2 mb-6">Para visualizar este documento, precisa de vincular o ficheiro original do seu dispositivo.</p>
                      <button 
                        onClick={() => { setSelectedCrop(null); onRelinkClick(); }}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all"
                      >
                        Vincular Agora
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-400 font-medium">A preparar visualização...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button 
          onClick={onAdvance}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95"
        >
          Confirmar e Avançar
        </button>
      </div>
    </div>
  );
};
