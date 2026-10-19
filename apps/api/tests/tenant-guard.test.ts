import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Product } from '../src/modules/products/product.model';
import { closeTestDb, connectTestDb } from './helpers';

beforeAll(connectTestDb);
afterAll(closeTestDb);

describe('tenant-guard (rede de segurança)', () => {
  const companyId = new mongoose.Types.ObjectId();

  it('bloqueia queries no model sem company_id', async () => {
    await expect(Product.find({})).rejects.toThrow(/tenant-guard/);
    await expect(Product.findOne({ name: 'x' })).rejects.toThrow(/tenant-guard/);
    await expect(Product.countDocuments({})).rejects.toThrow(/tenant-guard/);
    await expect(Product.deleteMany({})).rejects.toThrow(/tenant-guard/);
    await expect(Product.updateMany({}, { $set: { name: 'x' } })).rejects.toThrow(/tenant-guard/);
    await expect(Product.findOneAndDelete({ _id: new mongoose.Types.ObjectId() })).rejects.toThrow(/tenant-guard/);
    await expect(Product.aggregate([{ $group: { _id: '$category' } }])).rejects.toThrow(/tenant-guard/);
  });

  it('não aceita company_id undefined (bug comum de variável vazia)', async () => {
    await expect(Product.find({ company_id: undefined })).rejects.toThrow(/tenant-guard/);
  });

  it('permite quando company_id está no filtro', async () => {
    await expect(Product.find({ company_id: companyId })).resolves.toEqual([]);
    await expect(Product.aggregate([{ $match: { company_id: companyId } }])).resolves.toEqual([]);
  });

  it('só libera com skipTenantGuard explícito', async () => {
    await expect(Product.find({}, null, { skipTenantGuard: true })).resolves.toBeDefined();
  });
});
