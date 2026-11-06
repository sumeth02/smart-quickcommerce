import express from 'express';
import { db, nextId } from '../data/db.js';
import { feeConfig, getDemandMultiplier } from '../services/deliveryFee.js';
import { badRequest, notFound, parseId } from '../utils/httpError.js';

const router = express.Router();

router.get('/config', (req, res) => {
  res.json(feeConfig);
});

router.put('/config', (req, res, next) => {
  try {
    const { baseFee, smallCartThreshold, smallCartFee, freeDeliveryThreshold, maxMultiplier } = req.body;
    
    const values = [baseFee, smallCartThreshold, smallCartFee, freeDeliveryThreshold, maxMultiplier];
    if (values.some(v => typeof v !== 'number' || v < 0)) {
      throw badRequest('All config values must be numbers >= 0');
    }
    if (freeDeliveryThreshold <= smallCartThreshold) {
      throw badRequest('freeDeliveryThreshold must be > smallCartThreshold');
    }

    Object.assign(feeConfig, { baseFee, smallCartThreshold, smallCartFee, freeDeliveryThreshold, maxMultiplier });
    res.json(feeConfig);
  } catch (err) {
    next(err);
  }
});

router.get('/surge/:darkStoreId', (req, res, next) => {
  try {
    const darkStoreId = parseId(req.params.darkStoreId);
    
    const now = Date.now();
    const activeOrders = db.orders.filter(o => 
      o.darkStoreId === darkStoreId &&
      ['PLACED', 'PICKING', 'PACKED'].includes(o.status) &&
      new Date(o.createdAt).getTime() >= (now - 15 * 60 * 1000)
    ).length;

    const availableRiders = (db.riders || []).filter(r => 
      r.darkStoreId === darkStoreId && 
      r.status === 'AVAILABLE'
    ).length;

    res.json({
      darkStoreId,
      activeOrders,
      availableRiders,
      multiplier: getDemandMultiplier(darkStoreId)
    });
  } catch (err) {
    next(err);
  }
});

router.get('/rules', (req, res) => res.json(db.feeRules));

router.post('/rules', (req, res, next) => {
  try {
    const { label, startHour, endHour, multiplier } = req.body;
    if (startHour < 0 || endHour > 23 || multiplier < 1 || multiplier > 3) {
      throw badRequest('Invalid rule constraints');
    }
    const newRule = { id: nextId(db.feeRules), label, startHour, endHour, multiplier };
    db.feeRules.push(newRule);
    res.status(201).json(newRule);
  } catch (err) {
    next(err);
  }
});

router.delete('/rules/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const initialLen = db.feeRules.length;
    db.feeRules = db.feeRules.filter(r => r.id !== id);
    if (db.feeRules.length === initialLen) throw notFound('Rule not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;