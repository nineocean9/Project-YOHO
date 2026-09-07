export class DataFoundationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "DataFoundationError";
    this.code = code;
    this.details = details;
  }
}

export function fail(code, message, details) {
  throw new DataFoundationError(code, message, details);
}
