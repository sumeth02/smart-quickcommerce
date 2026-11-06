import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/app.js';
import { resetDb, db } from '../src/data/db.js';

describe('Fees API', () => {
  beforeEach(() => {
    resetDb();
  });

  it('gets and updates fee config with validation', async () => {
    const getRes = await request(app).get('/api/fees/config');
    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveProperty('baseFee');

    const validUpdate = { ...getRes.body, baseFee: 3.00 };
    const putRes = await request(app).put('/api/fees/config').send(validUpdate);
    expect(putRes.status).toBe(200);
    expect(putRes.body.baseFee).toBe(3.00);

    const invalidUpdate = { ...getRes.body, smallCartThreshold: 50, freeDeliveryThreshold: 40 };
    const badPut = await request(app).put('/api/fees/config').send(invalidUpdate);
    expect(badPut.status).toBe(400);
  });

  it('calculates surge pricing properly', async () => {
    db.orders.push(
      { id: 991, darkStoreId: 1, status: 'PLACED', createdAt: new Date().toISOString() },
      { id: 992, darkStoreId: 1, status: 'PICKING', createdAt: new Date().toISOString() },
      { id: 993, darkStoreId: 1, status: 'PACKED', createdAt: new Date().toISOString() }
    );

    const res = await request(app).get('/api/fees/surge/1');
    expect(res.status).toBe(200);
    expect(res.body.multiplier).toBe(1.25);
  });

  it('manages fee rules CRUD', async () => {
    const newRule = { label: 'Evening rush', startHour: 18, endHour: 21, multiplier: 1.5 };
    const postRes = await request(app).post('/api/fees/rules').send(newRule);
    expect(postRes.status).toBe(201);
    expect(postRes.body).toHaveProperty('id');

    const getRes = await request(app).get('/api/fees/rules');
    expect(getRes.body.length).toBeGreaterThan(0);

    const delRes = await request(app).delete(`/api/fees/rules/${postRes.body.id}`);
    expect(delRes.status).toBe(204);
  });
});