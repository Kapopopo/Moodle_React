import { describe, expect, it } from 'vitest';
import { loginEmail } from './login-email.js';
describe('Demo login identifiers', () => {
  it.each([[' Maéna@gmail.com ', 'maena@gmail.com'], ['Théo@gmail.com', 'theo@gmail.com'], ['The\u0301o@gmail.com', 'theo@gmail.com'], ['Wilson@gmail.com', 'wilson@gmail.com']])('accepts %s', (input, result) => {
    expect(loginEmail.parse(input)).toBe(result);
  });
  it.each(['invalid', 'name@', 'name@@gmail.com'])('rejects malformed identifiers %s', input => {
    expect(loginEmail.safeParse(input).success).toBe(false);
  });
});
