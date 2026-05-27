import NextAuth from 'next-auth';
import { authConfig } from '../../../lib/auth.config.js';

export default NextAuth(authConfig);