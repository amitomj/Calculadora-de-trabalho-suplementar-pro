
export interface WorkDay {
  id: string;
  day: number;
  hours: number;
  type: WorkType;
}

export enum WorkType {
  NORMAL = 'Normal',
  SUPLEMENTAR = 'Suplementar',
  NOTURNO = 'Noturno',
  DESCANSO_OBRIGATORIO = 'Descanso Obrigatório',
  DESCANSO_COMPLEMENTAR = 'Descanso Complementar',
  FERIADO = 'Feriado'
}

export interface MonthData {
  id: string;
  year: number;
  month: number;
  days: WorkDay[];
  sourceCropId?: string;
  pageNumber?: number;
}

export interface PercentageConfig {
  firstHour: number;
  subsequentHours: number;
}

export interface CalculationConfig {
  salary: number;
  weeklyHours: number;
  percentages: {
    [key in Exclude<WorkType, WorkType.NORMAL>]: PercentageConfig;
  };
}

export interface DetectedTable {
  id: string;
  fileName: string;
  previewUrl: string;
  mimeType: string;
  boundingBox?: [number, number, number, number];
  description: string;
  pageNumber?: number;
  extractedData?: MonthData;
}

export interface ProjectState {
  processNumber: string;
  tables: MonthData[];
  config: CalculationConfig;
  detectedCrops: DetectedTable[];
}
