import Order from "../../../types/order.type";

export const getHour = (time?: string) => {
    if (!time) return -1;
    const t = time.toLowerCase();
    
    // Fallbacks for named periods
    if (t.includes('manhã') || t.includes('manha')) return 9;
    if (t.includes('tarde')) return 13;
    if (t.includes('noite')) return 18;

    // Handle both HH:mm and strings like "13h" or "13:00 às 18:00"
    const match = t.match(/(\d+)/);
    if (!match) return -1;
    return parseInt(match[0], 10);
};

export const getStartAndEnd = (order: any) => {
    if (!order) return { start: -1, end: -1 };

    const sched = order.shipping?.scheduling;
    const directPeriod = order.period || order.time || "";
    const directStart = order.startTime;
    const directEnd = order.endTime;

    let start = getHour(directStart || sched?.startTime || sched?.time || directPeriod);
    let end = (sched?.type === 'range' || order.type === 'range') 
        ? getHour(directEnd || sched?.endTime) 
        : start + 1;

    // Detect range in time string if not explicitly marked as range
    const timeStr = (sched?.time || directPeriod || "").toLowerCase();
    if (timeStr.includes(' às ') || timeStr.includes(' as ') || timeStr.includes('-') || timeStr.includes(' até ')) {
        const parts = timeStr.split(/ às | as |-| até /);
        if (parts.length >= 2) {
            const possibleStart = getHour(parts[0]);
            const possibleEnd = getHour(parts[1]);
            if (possibleStart !== -1 && possibleEnd !== -1 && possibleEnd > possibleStart) {
                start = possibleStart;
                end = possibleEnd;
            }
        }
    }

    // Sanity check: minimum 1 hour window
    if (start !== -1 && end <= start) end = start + 1;

    return { start, end };
};

export const calculateLanes = (orders: Order[]): Order[][] => {
    const lanes: Order[][] = [];

    const sortedOrders = [...orders].sort((a, b) => {
        const { start: startA } = getStartAndEnd(a);
        const { start: startB } = getStartAndEnd(b);
        return startA - startB;
    });

    sortedOrders.forEach((order) => {
        const { start } = getStartAndEnd(order);
        let placed = false;

        for (const lane of lanes) {
            const lastInLane = lane[lane.length - 1];
            const { end: endHourLast } = getStartAndEnd(lastInLane);

            if (endHourLast <= start) {
                lane.push(order);
                placed = true;
                break;
            }
        }

        if (!placed) {
            lanes.push([order]);
        }
    });

    return lanes.length > 0 ? lanes : [[]];
};
