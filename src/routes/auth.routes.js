import express from 'express';
import { db, nextId } from '../data/db.js';
import { hashPassword, verifyPassword, signToken } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest, conflict } from '../utils/httpError.js';

const router = express.Router();

router.post('/register', (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) throw badRequest('Missing required fields');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw badRequest('Invalid email format');
    if (password.length < 8) throw badRequest('Password must be at least 8 characters');

    if (db.customers.find(c => c.email === email)) {
      throw conflict('Email already registered');
    }

    const newCustomer = {
      id: nextId(db.customers),
      name,
      email,
      phone,
      passwordHash: hashPassword(password)
    };
    db.customers.push(newCustomer);

    const token = signToken({ id: newCustomer.id });
    
    const customerData = { ...newCustomer };
    delete customerData.passwordHash;

    res.status(201).json({ customer: customerData, token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;
    const customer = db.customers.find(c => c.email === email);

    if (!customer || !verifyPassword(password, customer.passwordHash)) {
      return res.status(401).json({ error: true, message: 'Invalid credentials' });
    }

    const token = signToken({ id: customer.id });
    
    const customerData = { ...customer };
    delete customerData.passwordHash;

    res.status(200).json({ customer: customerData, token });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  const customerData = { ...req.user };
  delete customerData.passwordHash;
  res.status(200).json(customerData);
});

export default router;