import { PassportStatic } from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import prisma from '../config/database_client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function configurePassport(passport: PassportStatic): void {
  // Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          // Input validation
          if (!email || !password) {
            return done(null, false, {
              message: 'Email and password are required'
            });
          }

          const user = await prisma.user.findUnique({
            where: { email }
          });

          if (!user) {
            return done(null, false, {
              message: 'No user found with this email'
            });
          }

          if (!user.password) {
            return done(null, false, {
              message: 'Invalid user account state'
            });
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, {
              message: 'Invalid password'
            });
          }

          return done(null, user);
        } catch (error) {
          console.error('LocalStrategy Error:', error);
          return done(
            error instanceof Error ? error : new Error('Authentication error')
          );
        }
      }
    )
  );

  // JWT Strategy
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: JWT_SECRET
      },
      async (jwtPayload, done) => {
        try {
          if (!jwtPayload.id) {
            return done(null, false, {
              message: 'Invalid token payload',
              code: 'INVALID_TOKEN'
            });
          }

          const user = await prisma.user.findUnique({
            where: { id: jwtPayload.id }
          });

          if (!user) {
            return done(null, false, {
              message: 'User not found',
              code: 'USER_NOT_FOUND'
            });
          }

          // Optional: Check if token is blacklisted or user is active
          if (user.isBlocked) {
            return done(null, false, {
              message: 'User account is blocked',
              code: 'ACCOUNT_BLOCKED'
            });
          }

          return done(null, user);
        } catch (error) {
          console.error('JwtStrategy Error:', error);
          return done(
            error instanceof Error
              ? error
              : new Error('Token verification error')
          );
        }
      }
    )
  );
}
