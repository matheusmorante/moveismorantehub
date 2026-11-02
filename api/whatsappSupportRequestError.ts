export class RequestBodyError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}
