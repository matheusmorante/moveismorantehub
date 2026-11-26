export class OrderReadContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderReadContractError';
  }
}
