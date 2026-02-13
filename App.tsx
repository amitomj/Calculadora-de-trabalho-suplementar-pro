
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
  /* Fix: Declare AIStudio within global scope to prevent type mismatches with existing environment declarations */
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  /* Fix: Restored readonly and optional modifiers to match environment-provided Window interface and resolve modifier collision */
  interface Window {
    readonly aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
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
      // Se estivermos no AI Studio, verificamos a chave
      if (window.aistudio) {
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } catch (e) {
          console.error("Erro ao verificar chave no AI Studio:", e);
          setHasKey(true); // Fallback
        }
      } else {
        // Se estivermos fora (ex: Vercel), assumimos que process.env.API_KEY está configurada
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
    /* Fix: Assume key selection was successful to avoid race conditions as per guidelines */
    setHasKey(true);
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

  const relinkFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    
    const updatedCrops = [...detectedCrops];
    let count = 0;

    for (const file of files) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      updatedCrops.forEach((crop, index) => {
        if (crop.fileName === file.name) {
          updatedCrops[index] = { ...crop, previewUrl: base64, mimeType: file.type };
          count++;
        }
      });
    }

    setDetectedCrops(updatedCrops);
    alert(`${count} tabelas vinculadas com sucesso aos ficheiros originais.`);
    e.target.value = '';
  };

  if (hasKey === null) return null;

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg mx-auto text-3xl">€</div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-gray-900">Bem-vindo ao LaborCalc</h1>
            <p className="text-gray-500">Para começar, é necessário configurar uma chave API do Gemini.</p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-2xl text-left space-y-3">
            <p className="text-sm text-blue-800 font-medium">Requisitos Importantes:</p>
            <ul className="text-xs text-blue-700 space-y-2 list-disc list-inside">
              <li>A chave deve pertencer a um projeto Google Cloud com faturação ativa.</li>
              <li>Pode gerir as suas chaves e faturação no AI Studio.</li>
            </ul>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-center text-xs font-bold text-blue-600 hover:underline pt-2"
            >
              Documentação de Faturação
            </a>
          </div>

          <button 
            onClick={handleSelectKey}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl transition-all active:scale-95 text-lg"
          >
            Selecionar Chave API
          </button>
        </div>
      </div>
    );
  }

  const renderTab = () => {
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
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <input type="file" id="relink-input" multiple onChange={relinkFiles} className="hidden" />
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
          
          <nav className="flex space-x-1 p-1 bg-gray-100 rounded-xl">
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

        {renderTab()}
      </main>

      <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t h-16 flex items-center justify-center sm:hidden z-40">
         <span className="text-xs text-gray-400">© 2024 LaborCalc - Inteligência Artificial Flash</span>
      </footer>
    </div>
  );
};

export default App;
