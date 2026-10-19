import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ROLES } from '../../shared/auth-context';
import { tenantGuard } from '../../shared/tenant-guard';

const userSchema = new Schema(
  {
    company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // E-mail único globalmente: uma pessoa pertence a uma única empresa (ver README)
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: 'user' },
  },
  { timestamps: true },
);

userSchema.plugin(tenantGuard);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);
