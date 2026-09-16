export const getCurrentYearStr = (): string => {
    return String(new Date().getFullYear());
};

export const getPreviousYearStr = (): string => {
    return String(new Date().getFullYear() - 1);
};

export const getYearDateBounds = (yearStr: string) => {
    const y = parseInt(yearStr, 10);
    if (isNaN(y)) return null;
    const start = `${yearStr}-01-01T00:00:00.000Z`;
    const end = `${yearStr}-12-31T23:59:59.999Z`;
    return { start, end };
};

export const getCurrentYearMonthStr = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

export const getPreviousYearMonthStr = (): string => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

export const getMonthDateBounds = (yearMonth: string) => {
    if (!yearMonth || !yearMonth.includes('-')) return null;
    const [yStr, mStr] = yearMonth.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(y) || isNaN(m)) return null;
    const paddedM = String(m).padStart(2, '0');
    const start = `${yStr}-${paddedM}-01T00:00:00.000Z`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const end = `${yStr}-${paddedM}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;
    return { start, end };
};
