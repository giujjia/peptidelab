import { z } from 'zod';

// Mesmas regras do servidor (app/schemas/user.py): espacos nas pontas sao removidos,
// o restante do e-mail nao pode ter espaco nem quebra de linha
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 6;

// Conta pontos de codigo Unicode, como len() no Python; emoji conta 1 e nao 2
export const passwordLength = (value: string) => [...value].length;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const emailSchema = z
  .string()
  .transform(normalizeEmail)
  .refine((v) => v.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(v), 'Invalid email address');

export const newPasswordSchema = z
  .string()
  .refine((v) => passwordLength(v) >= PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
