import crypto from "crypto";

export function sha256(data: any) {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest();
}
