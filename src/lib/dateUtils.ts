import { format, parse } from "date-fns";

/**
 * Formats a date to DD/MM/YYYY format
 */
export const formatDateDDMMYYYY = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy');
};

/**
 * Formats a date to DD/MM/YYYY with time
 */
export const formatDateTimeDDMMYYYY = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm');
};

/**
 * Parses DD/MM/YYYY string to Date
 */
export const parseDateDDMMYYYY = (dateStr: string): Date => {
  return parse(dateStr, 'dd/MM/yyyy', new Date());
};

/**
 * Converts Date to YYYY-MM-DD for HTML input
 */
export const formatDateForInput = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
};

/**
 * Converts YYYY-MM-DD from HTML input to Date
 */
export const parseDateFromInput = (dateStr: string): Date => {
  return new Date(dateStr);
};