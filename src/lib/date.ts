export const toDateOnly = (date: string) => new Date(`${date}T00:00:00.000Z`);
export const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

export const todayKey = () => toDateKey(new Date());

export const isValidDateKey = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateKey(toDateOnly(value)) === value;
};
