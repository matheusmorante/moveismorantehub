export const getCurrentDatetimeLocal = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const formatToStorageDate = (datetimeLocalStr: string): string => {
    if (!datetimeLocalStr) return new Date().toISOString();
    const date = new Date(datetimeLocalStr);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

export const parseStorageDateToLocal = (dateStr: string): string => {
    if (!dateStr) return getCurrentDatetimeLocal();
    
    let date: Date;
    if (dateStr.includes('T') && dateStr.includes('-')) {
        date = new Date(dateStr);
    } else {
        try {
            const [datePart, timePart] = dateStr.split(', ');
            const [d, m, y] = datePart.split('/');
            const [hh, mm] = (timePart || '00:00').split(':');
            date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
        } catch {
            return getCurrentDatetimeLocal();
        }
    }

    if (isNaN(date.getTime())) return getCurrentDatetimeLocal();

    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d}T${h}:${mi}`;
};
