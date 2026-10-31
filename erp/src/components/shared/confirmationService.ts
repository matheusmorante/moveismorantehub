export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
}

type ConfirmationHandler = (options: ConfirmationOptions) => Promise<boolean>;

let confirmationHandler: ConfirmationHandler | null = null;

export const registerConfirmationHandler = (handler: ConfirmationHandler): (() => void) => {
  confirmationHandler = handler;
  return () => {
    if (confirmationHandler === handler) confirmationHandler = null;
  };
};

export const requestConfirmation = (options: ConfirmationOptions): Promise<boolean> =>
  confirmationHandler ? confirmationHandler(options) : Promise.resolve(false);
