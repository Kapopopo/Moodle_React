import { z } from 'zod';

// Demo login identifiers accept names typed with or without French accents.
export const loginEmail = z.string().trim().max(254)
  .transform(value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())
  .pipe(z.string().email());
