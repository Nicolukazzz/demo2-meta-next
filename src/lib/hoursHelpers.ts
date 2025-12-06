import { Hours, getEffectiveBusinessHoursForDate } from "./businessProfile";

/**
 * Devuelve la siguiente fecha (a partir de `fromDate`) en la que el negocio está abierto.
 * Si no encuentra en 60 días, retorna null.
 */
export function getNextWorkingDate(hours: Hours | undefined, fromDate = new Date()): Date | null {
  if (!hours) return null;
  for (let i = 0; i < 60; i++) {
    const d = new Date(fromDate);
    d.setDate(fromDate.getDate() + i);
    const match = getEffectiveBusinessHoursForDate(d, hours);
    if (match && match.open && match.close && match.open < match.close) {
      return d;
    }
  }
  return null;
}

