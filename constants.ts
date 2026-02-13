
import { WorkType } from './types';

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const DEFAULT_PERCENTAGES = {
  [WorkType.SUPLEMENTAR]: { firstHour: 25, subsequentHours: 37.5 },
  [WorkType.NOTURNO]: { firstHour: 25, subsequentHours: 25 },
  [WorkType.DESCANSO_OBRIGATORIO]: { firstHour: 50, subsequentHours: 50 },
  [WorkType.DESCANSO_COMPLEMENTAR]: { firstHour: 50, subsequentHours: 50 },
  [WorkType.FERIADO]: { firstHour: 50, subsequentHours: 50 },
};
