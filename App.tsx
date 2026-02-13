
import React, { useState, useRef, useEffect } from 'react';
import { MonthData, CalculationConfig, WorkType, ProjectState, DetectedTable } from './types';
import { LoadingTab } from './components/LoadingTab';
import { EditingTab } from './components/EditingTab';
import { CalculationTab } from './components/CalculationTab';
import { DEFAULT_PERCENTAGES } from './constants';

enum Tab {
  CARREGAMENTO = 'Carregamento',
  EDICAO = 'Edição',
  CALCULO = 'Cálculo'
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [tempKey, setTempKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CARREGAMENTO);
  const [processNumber, setProcessNumber] = useState('');
  const [tables, setTables] = useState<MonthData[]>([]);
  const [detectedCrops, setDetectedCrops] = useState<DetectedTable[]>([]);
  const [config, setConfig] = useState<CalculationConfig>({
    salary: 1000,
    weeklyHours: 40,
    percentages: DEFAULT_PERCENTAGES
  });

  const projectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      // Prioridade 1: Chave local (localStorage)
      const localKey = localStorage.getItem('LABORCALC_USER_KEY');
      if (localKey) {
        setHasKey(true);
        return;
      }

      // Prioridade 2: Chave de ambiente (Vercel/Build)
      const envKey = process.env.API_KEY;
      if (envKey && envKey !== "undefined" && envKey !== "") {
        setHasKey(true);
        return;
      }

      // Prioridade 3: AI Studio
      if (window.aistudio) {
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } catch (e) {
          setHasKey(false);
        }
      } else {
        setHasKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSaveCustomKey = () => {
    if (tempKey.trim().length < 20) {
      alert("Por favor, insira uma chave API válida.");
      return;
    }
    localStorage.setItem('LABORCALC_USER_KEY', tempKey.trim());
    setHasKey(true);
    setShowKeyInput(false);
    window.location.reload(); // Recarregar para garantir que o serviço lê a nova chave
  };

  const handleClearKey = () => {
    if (confirm("Deseja remover a chave API guardada neste navegador?")) {
      localStorage.removeItem('LABORCALC_USER_KEY');
      setHasKey(false);
      window.location.reload();
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    } else {
      setShowKeyInput(true);
    }
  };

  const handleTablesReady = (newTables: MonthData[]) => {
    setTables(newTables);
    setActiveTab(Tab.EDICAO);
  };

  const saveProject = () => {
    const state: ProjectState = { processNumber, tables, config, detectedCrops };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeNum = processNumber.replace(/[/\\?%*:|"<>]/g, '_');
    link.href = url;
    link.download = `${safeNum || 'projeto'}_calculo_laboral.json`;
    link.click();
  };

  const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const state = JSON.parse(event.target?.result as string) as ProjectState;
        setProcessNumber(state.processNumber || '');
        setTables(state.tables || []);
        setConfig(state.config || { salary: 1000, weeklyHours: 40, percentages: DEFAULT_PERCENTAGES });
        setDetectedCrops(state.detectedCrops || []);
        if (state.tables?.length > 0) setActiveTab(Tab.EDICAO);
      } catch (err) {
        alert('Erro ao carregar o ficheiro JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (hasKey === null) return null;

  if (!hasKey || showKeyInput) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg mx-auto text-3xl">€</div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-gray-900">Configuração de Chave API</h1>
            <p className="text-gray-500">Esta aplicação é pública e requer que utilize a sua própria chave para processar documentos.</p>
          </div>
          
          <div className="space-y-4 text-left">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-2">Cole aqui a sua Gemini API Key:</label>
              <input 
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
              />
              <p className="mt-3 text-xs text-blue-700 leading-relaxed">
                A chave será guardada apenas no seu navegador (Local Storage) e utilizada exclusivamente para as chamadas à API do Gemini. 
                Pode obter uma chave gratuita em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-bold underline">Google AI Studio</a>.
              </p>
            </div>
            
            <button 
              onClick={handleSaveCustomKey}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl transition-all active:scale-95 text-lg"
            >
              Guardar e Iniciar
            </button>
            
            {showKeyInput && (
              <button 
                onClick={() => setShowKeyInput(false)}
                className="w-full py-2 text-gray-400 text-sm hover:text-gray-600"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="pt-6 border-t flex items-center justify-center space-x-2 text-xs text-gray-400 font-medium">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             <span>Os seus dados e ficheiros nunca saem do seu computador (exceto para análise direta na API Google).</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <input type="file" id="relink-input" multiple onChange={(e) => {}} className="hidden" />
      <input type="file" ref={projectInputRef} onChange={loadProject} accept=".json" className="hidden" />

      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg">€</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-none">LaborCalc Pro</h1>
              {processNumber && <span className="text-[10px] text-gray-400 font-mono">PROC: {processNumber}</span>}
            </div>
          </div>
          
          <nav className="hidden md:flex space-x-1 p-1 bg-gray-100 rounded-xl">
            {Object.values(Tab).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={tab !== Tab.CARREGAMENTO && tables.length === 0}
                className={`
                  px-4 py-2 rounded-lg text-sm font-semibold transition-all
                  ${activeTab === tab 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  }
                  ${(tab !== Tab.CARREGAMENTO && tables.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => projectInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Abrir Projeto (.json)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1m-6 9a2 2 0 01-2-2V5" /></svg>
            </button>
            <button 
              onClick={saveProject}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Guardar Projeto"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            </button>
            <div className="w-px h-6 bg-gray-200 mx-2"></div>
            <button 
              onClick={handleClearKey}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Limpar Chave API / Definições"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        <div className="mb-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                {activeTab}
              </h2>
              <p className="mt-2 text-lg text-gray-500">
                {activeTab === Tab.CARREGAMENTO && "Inicie o processo identificando o processo e carregando os documentos."}
                {activeTab === Tab.EDICAO && "Revise os dados extraídos. Pode classificar meses inteiros ou ajustar dia a dia."}
                {activeTab === Tab.CALCULO && "Resultados finais. Pode descarregar o relatório detalhado em Word."}
              </p>
            </div>
          </div>
        </div>

        {(() => {
          switch (activeTab) {
            case Tab.CARREGAMENTO:
              return (
                <LoadingTab 
                  processNumber={processNumber}
                  setProcessNumber={setProcessNumber}
                  detectedCrops={detectedCrops}
                  setDetectedCrops={setDetectedCrops}
                  onTablesReady={handleTablesReady} 
                />
              );
            case Tab.EDICAO:
              return (
                <EditingTab 
                  tables={tables} 
                  setTables={setTables} 
                  detectedCrops={detectedCrops}
                  onAdvance={() => setActiveTab(Tab.CALCULO)}
                  onRelinkClick={() => document.getElementById('relink-input')?.click()}
                />
              );
            case Tab.CALCULO:
              return (
                <CalculationTab 
                  processNumber={processNumber}
                  tables={tables} 
                  config={config} 
                  setConfig={setConfig} 
                />
              );
          }
        })()}
      </main>

      <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t h-16 flex items-center justify-center sm:hidden z-40">
         <span className="text-xs text-gray-400">© 2024 LaborCalc - Inteligência Artificial Flash</span>
      </footer>
    </div>
  );
};

export default App;
