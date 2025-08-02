import jwt from 'jsonwebtoken';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
  throw new Error('Missing SUPABASE_JWT_SECRET in environment variables');
}

export interface SupabaseJwtPayload {
  sub: string;
  email: string;
  email_confirmed_at?: string;
  role?: string;
  [key: string]: any;
}

export function verifySupabaseJWT(token: string): SupabaseJwtPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      SUPABASE_JWT_SECRET,
    ) as SupabaseJwtPayload;
    return decoded;
  } catch (error) {
    console.error('Invalid Supabase token:', error);
    return null;
  }
}
