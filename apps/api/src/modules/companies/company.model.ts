import { Schema, model, type InferSchemaType } from 'mongoose';

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

export type CompanyDoc = InferSchemaType<typeof companySchema>;
export const Company = model('Company', companySchema);
