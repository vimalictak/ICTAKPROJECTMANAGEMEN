/**
 * Passport.js Configuration
 * @description JWT and Google OAuth2 strategies
 */

const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const logger = require('./logger');

// ─── JWT Strategy ─────────────────────────────────────────────────────────────

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    // Extract from Authorization header
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    // Extract from cookie
    (req) => {
      let token = null;
      if (req && req.cookies) {
        token = req.cookies['access_token'];
      }
      return token;
    },
  ]),
  secretOrKey: process.env.JWT_SECRET,
  issuer: 'projectflow',
  audience: 'projectflow-client',
};

passport.use(
  'jwt',
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      const user = await User.findById(jwtPayload.id)
        .select('-password -refreshTokens')
        .populate('organization', 'name slug logo');

      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      if (!user.isActive) {
        return done(null, false, { message: 'User account is deactivated' });
      }

      return done(null, user);
    } catch (error) {
      logger.error('JWT Strategy error:', error);
      return done(error, false);
    }
  })
);

// ─── Google OAuth Strategy ────────────────────────────────────────────────────

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(null, false, { message: 'No email found in Google profile' });
          }

          // Check if user exists
          let user = await User.findOne({ email }).populate('organization');

          if (user) {
            // Update Google profile info
            if (!user.googleId) {
              user.googleId = profile.id;
            }
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            user.lastLogin = new Date();
            await user.save();
            return done(null, user);
          }

          // Create new user from Google profile
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email,
            avatar: profile.photos?.[0]?.value,
            isEmailVerified: true, // Google emails are verified
            authProvider: 'google',
            isActive: true,
            lastLogin: new Date(),
          });

          return done(null, user);
        } catch (error) {
          logger.error('Google OAuth Strategy error:', error);
          return done(error, false);
        }
      }
    )
  );
}

module.exports = passport;
