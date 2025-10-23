import { format } from 'date-fns';

// formats numeric amounts as USD currency with proper locale support and fixed decimal places
// defaults to US locale but accepts custom locale parameter for internationalization
export const formatCurrency = (amount: number, locale: string = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// formats Date objects into human-readable strings with full day/date information and time
// returns format like "Monday, January 1st, 2024 at 14:30" for clear temporal context
export const formatDateTime = (date: Date): string => {
  return format(date, "EEEE, MMMM do, yyyy 'at' HH:mm");
};
