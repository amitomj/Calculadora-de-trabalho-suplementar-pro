
import React, { useState } from 'react';
import { DetectedTable, MonthData } from '../types';
import { detectTablesInFile, extractDataFromCrop } from '../services/geminiService';

interface Props {
  processNumber: string;
  setProcessNumber: (val: string) => void;
  detectedCrops: DetectedTable[];
  setDetectedCrops: React.Dispatch<React.SetStateAction<DetectedTable[]>>;
  onTablesReady: (tables: MonthData[]) => void;
}

export const LoadingTab: React.FC<Props> = ({ 
  processNumber, 
  setProcessNumber, 
  detectedCrops, 
  setDetectedCrops, 
  onTablesReady 
}) => {
  const [status, setStatus] = useState<'idle' | 'detecting' | 'extracting'>('idle');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    setStatus('detecting');
    const selectedFiles = Array.from(e.target.files) as File[];

    for (const file of selectedFiles) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const tables = await detectTablesInFile(base64, file.type, file.name);
      
      const newCrops = tables.map(t => ({
        ...t,
        id: t.id!,
        fileName: t.fileName!,
        previewUrl: t.previewUrl!,
        mimeType: t.mimeType!,
        description: t.description!
      })) as DetectedTable[];

      setDetectedCrops(prev => [...prev, ...newCrops]);
    }
    setStatus('idle');
  };

  const removeCrop = (id: string) => {
    setDetectedCrops(detectedCrops.filter(c => c.id !== id));
  };

  const handleAdvance = async () => {
    if (detectedCrops.length === 0) return;
    
    setStatus('extracting');
    const finalData: MonthData[] = [];

    for (const crop of detectedCrops) {
      const data = await extractDataFromCrop(crop);
      if (data) {
        finalData.push({
          ...data,
          sourceCropId: crop.id
        });
      }
    }

    onTablesReady(finalData);
    setStatus('idle');
  };

  return (
    <div className="space-y-8">
      {/* Process Info */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
          Número do Processo
        </label>
        <input 
          type="text"
          value={processNumber}
          onChange={(e) => setProcessNumber(e.target.value)}
          placeholder="Ex: 1234/2024"
          className="w-full md:w-1/2 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg font-medium"
        />
      </div>

      {/* Upload Area */}
      <div className={`
        bg-white p-10 rounded-2xl border-2 border-dashed transition-all duration-300
        ${status === 'detecting' ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}
        flex flex-col items-center justify-center space-y-4
      `}>
        <div className={`p-5 rounded-full ${status === 'detecting' ? 'bg-blue-100 animate-pulse' : 'bg-blue-50'}`}>
          <svg className={`w-10 h-10 text-blue-600 ${status === 'detecting' ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-800">Carregar Documentos</p>
          <p className="text-sm text-gray-500 mt-1">Imagens (JPG, PNG), PDF ou Word (DOCX)</p>
        </div>
        
        <input 
          type="file" 
          multiple 
          onChange={handleFileUpload}
          className="hidden" 
          id="file-upload" 
          accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        />
        <label 
          htmlFor="file-upload" 
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold cursor-pointer hover:bg-blue-700 transition-all shadow-lg active:scale-95"
        >
          {status === 'detecting' ? 'A detetar tabelas...' : 'Selecionar Ficheiros'}
        </label>
      </div>

      {/* Detected Crops Display */}
      {detectedCrops.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-lg font-bold text-gray-700">Tabelas Detetadas ({detectedCrops.length})</h3>
            <p className="text-sm text-gray-500">Elimine as que não pretende processar</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {detectedCrops.map(crop => (
              <div key={crop.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden group relative">
                <button 
                  onClick={() => removeCrop(crop.id)}
                  className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-20 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                
                <div className="h-48 bg-gray-50 relative overflow-hidden flex items-center justify-center">
                  {crop.mimeType.includes('image') && crop.boundingBox ? (
                    <div 
                      className="absolute w-full h-full bg-no-repeat transition-transform duration-500 group-hover:scale-110"
                      style={{
                        backgroundImage: `url(${crop.previewUrl})`,
                        backgroundPosition: `${crop.boundingBox[1] / 10}% ${crop.boundingBox[0] / 10}%`,
                        backgroundSize: '300%', 
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="text-xs font-bold uppercase tracking-wider">{crop.mimeType.split('/')[1]}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <div className="text-white">
                      <p className="text-xs opacity-80 truncate mb-0.5">{crop.fileName}</p>
                      <p className="text-sm font-bold leading-tight">{crop.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Status/Action */}
      {status === 'extracting' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h4 className="text-xl font-bold text-gray-800">A extrair dados...</h4>
            <p className="text-gray-500">O Gemini está a ler as tabelas selecionadas. Isto pode demorar alguns segundos.</p>
          </div>
        </div>
      )}

      {detectedCrops.length > 0 && status === 'idle' && (
        <div className="flex justify-end pt-6 border-t">
          <button 
            onClick={handleAdvance}
            className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black text-lg hover:bg-green-700 shadow-xl transform active:scale-95 transition-all flex items-center space-x-2"
          >
            <span>Extrair Dados e Avançar</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      )}
    </div>
  );
};
