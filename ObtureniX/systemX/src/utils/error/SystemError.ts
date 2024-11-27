export class SystemError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'SYSTEM_ERROR'
  ) {
    super(message);
    this.name = 'SystemError';
  }
}