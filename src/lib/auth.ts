import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { db } from './db';
import * as schema from './db/schema';
import { sendVerificationEmail } from './email';

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true
  },
  emailVerification: {
    sendVerificationEmail,
    autoSignInAfterVerification: true
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema
  }),
  plugins: [tanstackStartCookies()]
});
