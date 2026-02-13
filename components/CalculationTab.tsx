
import React from 'react';
import { CalculationConfig, MonthData, WorkType, PercentageConfig } from '../types';
import { DEFAULT_PERCENTAGES, MONTHS } from '../constants';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, BorderStyle, WidthType } from 'https://esm.sh/docx@9.1.0';

interface Props {
  processNumber: string;
  tables: MonthData[];
  config: CalculationConfig;
  setConfig: React.Dispatch<React.SetStateAction<CalculationConfig>>;
}

export const CalculationTab: React.FC<Props> = ({ processNumber, tables, config, setConfig }) => {
  
  const hourlyRate = (config.salary * 12) / (52 * config.weeklyHours);

  const calculateTotalsByMonth = (table: MonthData) => {
    let totalHours = 0;
    let totalValue = 0;

    table.days.forEach(day => {
      if (day.type === WorkType.NORMAL) return;
      
      const type = day.type as Exclude<WorkType, WorkType.NORMAL>;
      const perc = config.percentages[type];
      
      if (day.hours > 0) {
        totalHours += day.hours;
        const firstHourValue = hourlyRate * (1 + perc.firstHour / 100);
        const remainingHours = Math.max(0, day.hours - 1);
        const remainingValue = remainingHours * hourlyRate * (1 + perc.subsequentHours / 100);
        
        totalValue += (day.hours > 1 ? firstHourValue : day.hours * hourlyRate * (1 + perc.firstHour / 100)) + remainingValue;
      }
    });

    return { totalHours, totalValue };
  };

  const calculateGrandTotals = () => {
    const totalsByType = {
      [WorkType.SUPLEMENTAR]: { h: 0, v: 0 },
      [WorkType.NOTURNO]: { h: 0, v: 0 },
      [WorkType.DESCANSO_OBRIGATORIO]: { h: 0, v: 0 },
      [WorkType.DESCANSO_COMPLEMENTAR]: { h: 0, v: 0 },
      [WorkType.FERIADO]: { h: 0, v: 0 },
    };

    tables.forEach(table => {
      table.days.forEach(day => {
        if (day.type === WorkType.NORMAL) return;
        const type = day.type as Exclude<WorkType, WorkType.NORMAL>;
        const perc = config.percentages[type];
        if (day.hours > 0) {
          const firstHourValue = hourlyRate * (1 + perc.firstHour / 100);
          const remainingHours = Math.max(0, day.hours - 1);
          const remainingValue = remainingHours * hourlyRate * (1 + perc.subsequentHours / 100);
          
          totalsByType[type].h += day.hours;
          totalsByType[type].v += (day.hours > 1 ? firstHourValue : day.hours * hourlyRate * (1 + perc.firstHour / 100)) + remainingValue;
        }
      });
    });
    return totalsByType;
  };

  const grandTotals = calculateGrandTotals();
  const totalGlobalValue = Object.values(grandTotals).reduce((a, b) => a + b.v, 0);
  const totalGlobalHours = Object.values(grandTotals).reduce((a, b) => a + b.h, 0);

  const downloadWord = async () => {
    const sections = [];

    // Header Info
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `Relatório de Cálculo - Processo ${processNumber || 'N/A'}`, bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `DADOS BASE:`, bold: true, size: 24 }),
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Salário Base Mensal: `, bold: true }),
          new TextRun({ text: `${config.salary.toFixed(2)}€` }),
        ],
        indent: { left: 400 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Carga Horária Semanal: `, bold: true }),
          new TextRun({ text: `${config.weeklyHours}h/semana` }),
        ],
        indent: { left: 400 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Valor Hora (Calculado): `, bold: true }),
          new TextRun({ text: `${hourlyRate.toFixed(2)}€/h` }),
        ],
        indent: { left: 400 },
        spacing: { after: 200 }
      })
    );

    // Percentages Info
    sections.push(new Paragraph({ text: "PERCENTAGENS APLICADAS:", bold: true, size: 24, spacing: { before: 200, after: 100 } }));
    Object.entries(config.percentages).forEach(([type, p]) => {
      const perc = p as PercentageConfig;
      sections.push(new Paragraph({
        children: [new TextRun({ text: `• ${type}: `, bold: true }), new TextRun({ text: `1ª hora +${perc.firstHour}%, restantes +${perc.subsequentHours}%` })],
        indent: { left: 400 }
      }));
    });

    // Tables per Month
    for (const table of tables) {
      const { totalHours, totalValue } = calculateTotalsByMonth(table);
      if (totalHours === 0) continue;

      sections.push(new Paragraph({
        children: [new TextRun({ text: `Detalhamento: ${MONTHS[table.month - 1]} ${table.year}`, bold: true, size: 28 })],
        spacing: { before: 400, after: 200 }
      }));

      const rows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Dia", bold: true })], shading: { fill: "f3f4f6" } }),
            new TableCell({ children: [new Paragraph({ text: "Horas", bold: true })], shading: { fill: "f3f4f6" } }),
            new TableCell({ children: [new Paragraph({ text: "Tipo de Trabalho", bold: true })], shading: { fill: "f3f4f6" } }),
            new TableCell({ children: [new Paragraph({ text: "Valor (€)", bold: true })], shading: { fill: "f3f4f6" } }),
          ]
        })
      ];

      table.days.forEach(day => {
        if (day.type === WorkType.NORMAL) return;
        const type = day.type as Exclude<WorkType, WorkType.NORMAL>;
        const p = config.percentages[type];
        const val = (day.hours > 1 ? hourlyRate * (1 + p.firstHour / 100) : day.hours * hourlyRate * (1 + p.firstHour / 100)) + Math.max(0, day.hours - 1) * hourlyRate * (1 + p.subsequentHours / 100);

        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: day.day.toString() })] }),
            new TableCell({ children: [new Paragraph({ text: day.hours.toString() })] }),
            new TableCell({ children: [new Paragraph({ text: day.type })] }),
            new TableCell({ children: [new Paragraph({ text: `${val.toFixed(2)}€` })] }),
          ]
        }));
      });

      // Month Total Footer Row
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: "TOTAL DO MÊS", bold: true })], shading: { fill: "e5e7eb" } }),
          new TableCell({ children: [new Paragraph({ text: totalHours.toString(), bold: true })], shading: { fill: "e5e7eb" } }),
          new TableCell({ children: [new Paragraph({ text: "" })], shading: { fill: "e5e7eb" } }),
          new TableCell({ children: [new Paragraph({ text: `${totalValue.toFixed(2)}€`, bold: true })], shading: { fill: "e5e7eb" } }),
        ]
      }));

      sections.push(new Table({
        rows: rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        spacing: { after: 300 }
      }));
    }

    // Final Summary
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `RESUMO GLOBAL`, bold: true, size: 32 })],
        spacing: { before: 600, after: 200 },
        alignment: AlignmentType.CENTER,
      })
    );

    const summaryRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: "Tipo de Trabalho", bold: true })], shading: { fill: "1d4ed8" } }),
          new TableCell({ children: [new Paragraph({ text: "Horas Totais", bold: true })], shading: { fill: "1d4ed8" } }),
          new TableCell({ children: [new Paragraph({ text: "Valor Acumulado", bold: true })], shading: { fill: "1d4ed8" } }),
        ]
      })
    ];

    Object.entries(grandTotals).forEach(([type, data]) => {
      if (data.h > 0) {
        summaryRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: type })] }),
            new TableCell({ children: [new Paragraph({ text: data.h.toString() })] }),
            new TableCell({ children: [new Paragraph({ text: `${data.v.toFixed(2)}€` })] }),
          ]
        }));
      }
    });

    // Grand Total Row
    summaryRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "VALOR GLOBAL DEVIDO", bold: true })], shading: { fill: "dbeafe" } }),
        new TableCell({ children: [new Paragraph({ text: totalGlobalHours.toString(), bold: true })], shading: { fill: "dbeafe" } }),
        new TableCell({ children: [new Paragraph({ text: `${totalGlobalValue.toFixed(2)}€`, bold: true })], shading: { fill: "dbeafe" } }),
      ]
    }));

    sections.push(new Table({
      rows: summaryRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    }));

    const doc = new Document({
      sections: [{ children: sections }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${processNumber ? processNumber.replace(/[/\\?%*:|"<>]/g, '_') : 'projeto'}_calculo.docx`;
    link.click();
  };

  const updatePerc = (type: Exclude<WorkType, WorkType.NORMAL>, field: 'firstHour' | 'subsequentHours', val: number) => {
    setConfig(prev => ({
      ...prev,
      percentages: {
        ...prev.percentages,
        [type]: {
          ...prev.percentages[type],
          [field]: val
        }
      }
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Configuração Base</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Salário Base Mensal (€)</label>
              <input 
                type="number" 
                value={config.salary}
                onChange={(e) => setConfig(prev => ({ ...prev, salary: parseFloat(e.target.value) || 0 }))}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Carga Horária Semanal</label>
              <input 
                type="number" 
                value={config.weeklyHours}
                onChange={(e) => setConfig(prev => ({ ...prev, weeklyHours: parseFloat(e.target.value) || 0 }))}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-xl flex justify-between items-center">
            <span className="text-blue-800 font-medium">Valor Hora Calculado:</span>
            <span className="text-2xl font-bold text-blue-900">{hourlyRate.toFixed(2)}€ / hora</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Percentagens por Situação</h3>
          <div className="space-y-4">
            {Object.keys(DEFAULT_PERCENTAGES).map(key => {
              const type = key as Exclude<WorkType, WorkType.NORMAL>;
              return (
                <div key={type} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <p className="font-semibold text-gray-700 mb-3">{type}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">1ª Hora (%)</label>
                      <input 
                        type="number" 
                        value={config.percentages[type].firstHour}
                        onChange={(e) => updatePerc(type, 'firstHour', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Restantes (%)</label>
                      <input 
                        type="number" 
                        value={config.percentages[type].subsequentHours}
                        onChange={(e) => updatePerc(type, 'subsequentHours', parseFloat(e.target.value) || 0)}
                        className="w-full border rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl sticky top-8">
          <h3 className="text-lg font-medium opacity-80 mb-2">Total Estimado Devido</h3>
          <div className="text-5xl font-extrabold mb-8">{totalGlobalValue.toFixed(2)}€</div>
          
          <div className="space-y-4 border-t border-white/20 pt-6">
            {Object.entries(grandTotals).map(([type, data]) => (
              <div key={type} className="flex justify-between items-center">
                <div className="flex flex-col">
                   <span className="text-sm opacity-90">{type}</span>
                   <span className="text-[10px] opacity-60">{data.h} horas</span>
                </div>
                <span className="font-bold">{data.v.toFixed(2)}€</span>
              </div>
            ))}
          </div>
          
          <div className="mt-8 space-y-3">
            <button 
              onClick={downloadWord}
              className="w-full py-4 bg-white text-blue-700 rounded-2xl font-bold hover:bg-blue-50 shadow-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              <span>Descarregar Word</span>
            </button>
            <button 
              className="w-full py-4 bg-blue-500/20 text-white border border-white/20 rounded-2xl font-bold hover:bg-blue-500/30 transition-all"
              onClick={() => window.print()}
            >
              Imprimir PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
