export type RegisterPayload = Omit<PublicKeyCredentialCreationOptions, 'challenge' | 'user'> & {
  challenge: string,
  user: { name: string, displayName: string, id: string }
  allowCredentials: any
}

/*
https://w3c.github.io/webauthn/#client-data
  */
export interface ClientDataJSON {
  challenge: string;
  origin: string;
  type: 'webauthn.create' | 'webauthn.get';
  tokenBinding?: {
    status: 'supported' | 'present';
    id: string;
  }
}

/**
 * Generic representation of a ClientAttestation. Specific attestation types are specified in types -> fido -> Attestation Statement Format
 * https://w3c.github.io/webauthn/#attestation-statement
 */
export interface GenericAttestation {
  authData: Buffer;
  fmt: string;
  attStmt:
    {
      // alg: number;
      // certInfo: ArrayBuffer;
      // sig: ArrayBuffer;
      // pubArea: ArrayBuffer;
      // ver: string;
      // x5c: Array<ArrayBuffer>;
    }
}

export interface JSONWebKey {
  e: string;
  kty: string;
  n: string;
}

/**
 * Specification: https://w3c.github.io/webauthn/#sctn-attested-credential-data
 */
export interface AttestedCredentialData {
  aaguid: string;
  credentialId: Buffer;
  credentialIdLength: number;
  credentialPublicKey: JSONWebKey;
}


/**
 * In its original form, AuthenticatorData is represented as a bit buffer. The encoding of these bits can be found in the specification.
 * https://w3c.github.io/webauthn/#sctn-authenticator-data
 */
export interface AuthenticatorData {
  flags: number;
  attestedCredentialData: AttestedCredentialData;
  extensions?: {[key:string]:any}
  rpIdHash: Buffer;
  signCount: number;
}


export interface User {
  id: string;
  signCount: number;
  credentialPublicKey: JSONWebKey;
}
