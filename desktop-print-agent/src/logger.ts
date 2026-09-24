export const logPrintEvent = (
    type: string,
    identifier: string,
    printer: string,
    status: 'queued' | 'rendering' | 'sent_to_spooler' | 'failed',
    details?: string
): void => {
    const timestamp = new Date().toLocaleString('pt-BR');
    const msg = `[${timestamp}] [${type.toUpperCase()}] #${identifier} -> ${printer} [${status}]${details ? ` - ${details}` : ''}`;
    console.log(msg);
};
