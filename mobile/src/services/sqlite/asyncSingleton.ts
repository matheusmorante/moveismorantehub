export const createAsyncSingleton = <T extends object>(factory: () => Promise<T>) => {
  let instance: T | null = null;
  let opening: Promise<T> | null = null;

  return (): Promise<T> => {
    if (instance) return Promise.resolve(instance);
    if (opening) return opening;

    opening = Promise.resolve().then(factory).then(
      (value) => {
        instance = value;
        return value;
      },
      (error) => {
        opening = null;
        throw error;
      },
    );
    return opening;
  };
};
