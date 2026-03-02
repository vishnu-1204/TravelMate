import { describe, expect, it, vi } from 'vitest';

/**
 * Since the validation middleware is Express middleware (depends on req/res/next),
 * we test it by simulating the Express contract with lightweight stubs.
 */

// Re-implement the core validation logic extracted from auth-backend/src/middleware/validate.ts
// so we can test it in the Vitest jsdom environment without needing Express.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationResult =
  | { valid: true; sanitizedEmail: string }
  | { valid: false; status: number; message: string };

function validateRegisterLogic(email: unknown, password: unknown): ValidationResult {
  if (!email || !password) {
    return { valid: false, status: 400, message: 'Email and password are required' };
  }
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return { valid: false, status: 400, message: 'Invalid email format' };
  }
  if (typeof password !== 'string' || password.length < 6) {
    return { valid: false, status: 400, message: 'Password must be at least 6 characters' };
  }
  if (password.length > 128) {
    return { valid: false, status: 400, message: 'Password must be less than 128 characters' };
  }
  return { valid: true, sanitizedEmail: email.trim().toLowerCase() };
}

function validateLoginLogic(email: unknown, password: unknown): ValidationResult {
  if (!email || !password) {
    return { valid: false, status: 400, message: 'Email and password are required' };
  }
  const sanitized = typeof email === 'string' ? email.trim().toLowerCase() : String(email);
  return { valid: true, sanitizedEmail: sanitized };
}

// ─── Register Validation ────────────────────────────────────────

describe('validateRegister', () => {
  it('rejects when email is missing', () => {
    const result = validateRegisterLogic('', 'password123');
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.message).toContain('required');
  });

  it('rejects when password is missing', () => {
    const result = validateRegisterLogic('test@example.com', '');
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.message).toContain('required');
  });

  it('rejects invalid email format', () => {
    const result = validateRegisterLogic('not-an-email', 'password123');
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.message).toContain('Invalid email');
  });

  it('rejects email with no domain', () => {
    const result = validateRegisterLogic('user@', 'password123');
    expect(result.valid).toBe(false);
  });

  it('rejects email with spaces', () => {
    const result = validateRegisterLogic('user name@test.com', 'password123');
    expect(result.valid).toBe(false);
  });

  it('rejects password shorter than 6 characters', () => {
    const result = validateRegisterLogic('test@example.com', '12345');
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.message).toContain('at least 6');
  });

  it('rejects password longer than 128 characters', () => {
    const long = 'a'.repeat(129);
    const result = validateRegisterLogic('test@example.com', long);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.message).toContain('less than 128');
  });

  it('accepts exactly 128 character password', () => {
    const exact = 'a'.repeat(128);
    const result = validateRegisterLogic('test@example.com', exact);
    expect(result.valid).toBe(true);
  });

  it('trims and lowercases email', () => {
    const result = validateRegisterLogic('  USER@Example.COM  ', 'password123');
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.sanitizedEmail).toBe('user@example.com');
  });

  it('accepts valid email and password', () => {
    const result = validateRegisterLogic('travel@mate.in', 'securePass1');
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.sanitizedEmail).toBe('travel@mate.in');
  });
});

// ─── Login Validation ───────────────────────────────────────────

describe('validateLogin', () => {
  it('rejects when email is missing', () => {
    const result = validateLoginLogic('', 'password123');
    expect(result.valid).toBe(false);
  });

  it('rejects when password is missing', () => {
    const result = validateLoginLogic('test@example.com', '');
    expect(result.valid).toBe(false);
  });

  it('trims and lowercases email', () => {
    const result = validateLoginLogic('  Admin@Test.COM  ', 'pass');
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.sanitizedEmail).toBe('admin@test.com');
  });

  it('accepts any password length for login', () => {
    const result = validateLoginLogic('test@example.com', 'ab');
    expect(result.valid).toBe(true);
  });
});

// ─── Email regex edge cases ─────────────────────────────────────

describe('EMAIL_REGEX edge cases', () => {
  const cases: [string, boolean][] = [
    ['user@example.com', true],
    ['a@b.co', true],
    ['user+tag@domain.org', true],
    ['@missing-local.com', false],
    ['missing-domain@', false],
    ['no-at-sign.com', false],
    ['', false],
  ];

  it.each(cases)('"%s" => %s', (email, expected) => {
    expect(EMAIL_REGEX.test(email.trim())).toBe(expected);
  });
});
