import type { Types } from 'mongoose';
import { Company } from './company.model';

export const companyRepository = {
  create(name: string) {
    return Company.create({ name });
  },
  findById(id: Types.ObjectId) {
    return Company.findById(id);
  },
  deleteById(id: Types.ObjectId) {
    return Company.deleteOne({ _id: id });
  },
};
