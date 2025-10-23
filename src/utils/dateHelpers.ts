import { format } from 'date-fns';

export const formatCurrency = (amount: number, locale: string = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDateTime = (date: Date): string => {
  return format(date, "EEEE, MMMM do, yyyy 'at' HH:mm");
};
