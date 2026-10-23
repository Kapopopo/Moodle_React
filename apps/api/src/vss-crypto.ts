import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
export function vssKeyReady() { return /^[a-f0-9]{64}$/i.test(process.env.VSS_ENCRYPTION_KEY || ''); }
function key() { if (!vssKeyReady()) throw new Error('VSS encryption is not configured'); return Buffer.from(process.env.VSS_ENCRYPTION_KEY!, 'hex'); }
/** Bind ciphertext to this report/team so encrypted records cannot be swapped. */
export function encryptVss(value: unknown, reportId: string, teamId: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(`${reportId}:${teamId}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
}
export function decryptVss(value: string, reportId: string, teamId: string): unknown {
  const [iv, tag, encrypted] = value.split('.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(`${reportId}:${teamId}`)); decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8'));
}
