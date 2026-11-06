export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    if (details) this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const notFound = (message = "Resource not found") => new HttpError(404, message);
export const conflict = (message, details) => new HttpError(409, message, details);

/** Parses :id params; throws 400 if it is not a positive integer. */
export function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("Invalid id");
  return id;
}
