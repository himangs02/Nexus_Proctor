import bcrypt from 'bcryptjs';

/**
 * Password utilities — extracted from Sequelize User model hooks.
 *
 * With Sequelize, password hashing was handled automatically by
 * beforeCreate/beforeUpdate hooks inside User.js. Prisma has no
 * model lifecycle hooks, so we hash explicitly before every
 * create/update call.
 */

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password.
 * Call this BEFORE `prisma.user.create()` or `prisma.user.update()`.
 */
export const hashPassword = async (plaintext) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plaintext, salt);
};

/**
 * Compare a plaintext password against a bcrypt hash.
 * Replaces the Sequelize `User.prototype.matchPassword()` instance method.
 */
export const comparePassword = async (plaintext, hash) => {
  return bcrypt.compare(plaintext, hash);
};
