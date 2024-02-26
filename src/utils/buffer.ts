import { base64js } from '~/lib/base64js'

/**
 * Convert the given array buffer into a Base64URL-encoded string. Ideal for converting various
 * credential response ArrayBuffers to string for sending back to the server as JSON.
 *
 * Helper method to compliment `base64URLStringToBuffer`
 */
export function bufferToBase64URLString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''

  for (const charCode of bytes) {
    str += String.fromCharCode(charCode)
  }

  const base64String = btoa(str)

  return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * A helper method to convert an arbitrary ArrayBuffer, returned from an authenticator, to a UTF-8
 * string.
 */
export function bufferToUTF8String(value: ArrayBuffer): string {
  return new TextDecoder('utf-8').decode(value);
}

const attachments: AuthenticatorAttachment[] = ['cross-platform', 'platform'];

/**
 * If possible coerce a `string` value into a known `AuthenticatorAttachment`
 */
export function toAuthenticatorAttachment(
  attachment: string | null,
): AuthenticatorAttachment | undefined {
  if (!attachment) {
    return;
  }

  if (attachments.indexOf(attachment as AuthenticatorAttachment) < 0) {
    return;
  }

  return attachment as AuthenticatorAttachment;
}

//Function that correctly encodes the rawId of the credentials object into a string that should match credential.Id
export function bufferEncode(value: ArrayBuffer) {
  return base64js.fromByteArray(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

//Function that converts an ArrayBuffer to a string
export function arrayBufferToString(arrayBuffer: any) {
  return String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
}

//Function that encodes a UInt8Array to a base64 encoded string
export function base64encode(arrayBuffer: any) {
  if (!arrayBuffer || arrayBuffer.length == 0)
    return undefined;

  return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
}

//Function to correctly decode credential.Id
export function bufferDecode(value: string) {
  value = value
    .replace(/\-/g, "+")
    .replace(/\_/g, "/");
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
