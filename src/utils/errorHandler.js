// Global error handler (Lab 4 DEVOPS-3, Lab 6 §1.4).
export function errorHandler(err, _req, res, _next) {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const body = {
    error: true,
    message: err?.message || "Internal server error"
  };
  if (err?.details) body.details = err.details;
  if (status === 500 && process.env.NODE_ENV !== "test") console.error(err);
  res.status(status).json(body);
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: true, message: `Route ${req.method} ${req.originalUrl} not found` });
}
