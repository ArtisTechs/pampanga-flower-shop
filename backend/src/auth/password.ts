import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Stored format: scrypt$N$r$p$<salt base64>$<key base64> (also used by db/seeds/005_demo_users.sql).
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

const deriveKey = (password: string, salt: Buffer, keyLength: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => (error ? reject(error) : resolve(key)));
  });

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LENGTH, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${key.toString("base64")}`;
};

export const verifyPassword = async (password: string, stored: string) => {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64");
  const key = await deriveKey(password, Buffer.from(salt, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p)
  });
  return timingSafeEqual(key, expected);
};

// Verified against when an email is unknown, so failed logins take the same time either way.
export const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
