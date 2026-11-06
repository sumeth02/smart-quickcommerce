import express from 'express';
import { db } from '../data/db.js';
import { notFound, parseId } from '../utils/httpError.js';

const router = express.Router();

router.get('/', (req, res) => {
  const safeCustomers = db.customers.map(c => {
    const copy = { ...c };
    delete copy.passwordHash;
    return copy;
  });
  res.status(200).json(safeCustomers);
});

router.get('/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const customer = db.customers.find(c => c.id === id);
    if (!customer) throw notFound('Customer not found');
    
    const safeCustomer = { ...customer };
    delete safeCustomer.passwordHash;
    res.json(safeCustomer);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const index = db.customers.findIndex(c => c.id === id);
    if (index === -1) throw notFound('Customer not found');

    const updates = { ...req.body };
    delete updates.passwordHash; 
    delete updates.id; 

    db.customers[index] = { ...db.customers[index], ...updates };
    
    const safeCustomer = { ...db.customers[index] };
    delete safeCustomer.passwordHash;
    res.json(safeCustomer);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const initialLen = db.customers.length;
    db.customers = db.customers.filter(c => c.id !== id);
    
    if (db.customers.length === initialLen) throw notFound('Customer not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;