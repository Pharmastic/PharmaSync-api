import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.ENV === 'dev' ? ['query', 'error', 'warn'] : ['error']
  });

if (process.env.ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
