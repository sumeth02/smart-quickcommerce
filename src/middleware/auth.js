import { verifyToken } from '../services/authService.js';
import { db } from '../data/db.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: true, message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload || !payload.id) {
    return res.status(401).json({ error: true, message: 'Invalid or expired token' });
  }

  const customer = db.customers.find(c => c.id === payload.id);
  if (!customer) {
    return res.status(401).json({ error: true, message: 'Customer not found' });
  }

  req.user = customer;
  next();
}