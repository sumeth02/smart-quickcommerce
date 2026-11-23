import { verifyToken } from "../services/authService.js";
import { HttpError } from "../utils/httpError.js";

/**
 * Express middleware that requires a valid "Authorization: Bearer <token>" header.
 * Populates req.user with the decoded token payload, or throws 401.
 */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    throw new HttpError(401, "Authorization token required");
  }

  const token = header.slice("Bearer ".length).trim();
  const payload = verifyToken(token);
  if (!payload) {
    throw new HttpError(401, "Invalid or expired token");
  }

  req.user = payload;
  next();
}