
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
    const totals = {
      [WorkType.SUPLEMENTAR]: 0,
      [WorkType.NOTURNO]: 0,
      [WorkType.DESCANSO_OBRIGATORIO]: 0,
      [WorkType.DESCANSO_COMPLEMENTAR]: 0,
      [WorkType.FERIADO]: 0,
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
          totals[type] += (day.hours > 1 ? firstHourValue : day.hours * hourlyRate * (1 + perc.firstHour / 100)) + remainingValue;
        }
      });
    });
    return totals;
  };

  const grandTotals = calculateGrandTotals();
  const totalDue = Object.values(grandTotals).reduce((a, b) => a + b, 0);

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
          new TextRun({ text: `Salário Mensal: `, bold: true }),
          new TextRun({ text: `${config.salary.toFixed(2)}€` }),
          new TextRun({ text: `   |   Carga Horária: `, bold: true }),
          new TextRun({ text: `${config.weeklyHours}h/semana` }),
          new TextRun({ text: `   |   Valor Hora: `, bold: true }),
          new TextRun({ text: `${hourlyRate.toFixed(2)}€/h` })
        ],
        spacing: { after: 200 }
      })
    );

    // Percentages Info
    sections.push(new Paragraph({ text: "Percentagens Aplicadas:", bold: true, spacing: { before: 200, after: 100 } }));
    // Fix: Explicitly cast the value to PercentageConfig as Object.entries often returns unknown or string|any values
    Object.entries(config.percentages).forEach(([type, p]) => {
      const perc = p as PercentageConfig;
      sections.push(new Paragraph({
        children: [new TextRun({ text: `• ${type}: `, bold: true }), new TextRun({ text: `1ª hora ${perc.firstHour}%, restantes ${perc.subsequentHours}%` })],
        indent: { left: 720 }
      }));
    });

    // Tables
    for (const table of tables) {
      const { totalHours, totalValue } = calculateTotalsByMonth(table);
      if (totalHours === 0) continue;

      sections.push(new Paragraph({
        children: [new TextRun({ text: `${MONTHS[table.month - 1]} ${table.year}`, bold: true, size: 24 })],
        spacing: { before: 400, after: 200 }
      }));

      const rows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Dia", bold: true })], shading: { fill: "f3f4f6" } }),
            new TableCell({ children: [new Paragraph({ text: "Horas", bold: true })], shading: { fill: "f3f4f6" } }),
            new TableCell({ children: [new Paragraph({ text: "Tipo", bold: true })], shading: { fill: "f3f4f6" } }),
            new TableCell({ children: [new Paragraph({ text: "Valor Estimado", bold: true })], shading: { fill: "f3f4f6" } }),
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

      // Month Total Row
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: "TOTAL MÊS", bold: true })], columnSpan: 1, shading: { fill: "e5e7eb" } }),
          new TableCell({ children: [new Paragraph({ text: totalHours.toString(), bold: true })], shading: { fill: "e5e7eb" } }),
          new TableCell({ children: [new Paragraph({ text: "" })], shading: { fill: "e5e7eb" } }),
          new TableCell({ children: [new Paragraph({ text: `${totalValue.toFixed(2)}€`, bold: true })], shading: { fill: "e5e7eb" } }),
        ]
      }));

      sections.push(new Table({
        rows: rows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      }));
    }

    // Final Total
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `VALOR GLOBAL DEVIDO: ${totalDue.toFixed(2)}€`, bold: true, size: 28, color: "1d4ed8" })],
        alignment: AlignmentType.RIGHT,
        spacing: { before: 600 }
      })
    );

    const doc = new Document({
      sections: [{ children: sections }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${processNumber ? processNumber.replace(/[/\\?%*:|"<>]/g, '_') : 'relatorio'}_calculo.docx`;
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
                onChange={(e) => setConfig(prev => ({ ...prev, salary: parseFloat(e.target.value) }))}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Carga Horária Semanal</label>
              <input 
                type="number" 
                value={config.weeklyHours}
                onChange={(e) => setConfig(prev => ({ ...prev, weeklyHours: parseFloat(e.target.value) }))}
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
                        onChange={(e) => updatePerc(type, 'firstHour', parseFloat(e.target.value))}
                        className="w-full border rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Restantes (%)</label>
                      <input 
                        type="number" 
                        value={config.percentages[type].subsequentHours}
                        onChange={(e) => updatePerc(type, 'subsequentHours', parseFloat(e.target.value))}
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
          <div className="text-5xl font-extrabold mb-8">{totalDue.toFixed(2)}€</div>
          
          <div className="space-y-4 border-t border-white/20 pt-6">
            {Object.entries(grandTotals).map(([type, value]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm opacity-90">{type}</span>
                <span className="font-bold">{value.toFixed(2)}€</span>
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
