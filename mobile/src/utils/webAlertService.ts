export interface WebAlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface WebAlertEntry {
  id: number;
  title: string;
  message: string;
  buttons: WebAlertButton[];
  cancelable: boolean;
}

type AlertListener = (entry: WebAlertEntry | null) => void;

let nextId = 1;
let queue: WebAlertEntry[] = [];
let listener: AlertListener | null = null;

const publish = () => listener?.(queue[0] || null);

export const enqueueWebAlert = (
  title: string,
  message?: string,
  buttons?: WebAlertButton[],
  options?: { cancelable?: boolean }
) => {
  queue = [...queue, {
    id: nextId++,
    title,
    message: message || '',
    buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    cancelable: options?.cancelable === true,
  }];
  publish();
};

export const registerWebAlertListener = (nextListener: AlertListener) => {
  listener = nextListener;
  publish();
  return () => {
    if (listener === nextListener) listener = null;
  };
};

export const resolveWebAlert = (id: number, buttonIndex?: number) => {
  const current = queue[0];
  if (!current || current.id !== id) return;
  queue = queue.slice(1);
  publish();
  if (buttonIndex !== undefined) current.buttons[buttonIndex]?.onPress?.();
};

export const dismissWebAlert = (entry: WebAlertEntry) => {
  const cancelIndex = entry.buttons.findIndex((button) => button.style === 'cancel');
  if (cancelIndex >= 0) {
    resolveWebAlert(entry.id, cancelIndex);
  } else if (entry.cancelable) {
    resolveWebAlert(entry.id);
  }
};
