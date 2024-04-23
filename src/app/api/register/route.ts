// @ts-nocheck
import type { NextRequest } from 'next/server'
import { AuthenticatorData, ClientDataJSON, GenericAttestation, User } from '~/types/register'
import { cache } from '~/lib/cache'
import { sha256 } from '~/utils/crypto'
import * as uuid from "uuid-parse";

import * as CBOR from 'cbor'
import { users } from '~/lib/users'


export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as any
    console.log({ payload })
    // do 18 steps of WebAuthn registration
    console.log({})
    const msg = await registerKey(payload.pkc, request.cookies.get('userId')?.value || '')
    return Response.json(msg, { status: msg.status })
  } catch (error: any) {
    console.error(error)
    return Response.json(error?.message || 'Error', { status: 500 })
  }
}


async function registerKey(keyCredentialObject: { [key: string]: any }, userName: string) {
  console.log({ keyCredentialObject, userName })
  //Step 3: Parse the clientDataJSON string to a JSON object
  const clientData: ClientDataJSON = JSON.parse(keyCredentialObject.clientDataJSON)
  console.log({ clientData })

  //Step 4: Verify that clientData.type is webauthn.create
  if (!(clientData.type === 'webauthn.create')) {
    return {
      status: 403,
      text: 'The operation specified in the clientDataJSON is not webauthn.create'
    }
  }

  //Step 5: Verify that clientData.challenge is the same as the base64 specified challenge in your browsers options.challenge
  //In our cache we store issued challenges and if they were already used (boolean). So if the attribute in our cache doesn't exist or is already true, we have to stop the process.
  if (cache.get(clientData.challenge) === true) {
    return {
      status: 403,
      text: 'The challenge of this request has already been resolved, Hint of replay attack'
    }
  }

  //Explicit check, as (cache[clientData.challenge] = undefined) == false => true
  else if (!cache.get(clientData.challenge) === false) {
    return {
      status: 403,
      text: 'The challenge of this request does not match any challenge issued'
    }
  } else cache.set(clientData.challenge, true)

  //Step 6: Check that clientData.origin is actually the origin you would expect
  if (clientData.origin) {
    // TODO create origin check
  }
  //Step 7: Verify that token bindings of clientDataJSON match the tokens of the request. If there is no tokenBinding object in the clientDataJSON, that means that the client doesn't support tokenBindings. The parameter and therefore this step is optional.
  if (clientData.tokenBinding) {
    //TODO Create TLS check
  }

  //Step 8: Hash clientDataJSON with the SHA256 algorithm
  //For understandability, we re-stringify clientData. We could have also used keyCredentialObject.clientDataJSON as this is already the "raw" JSON
  const clientDataHash = sha256(JSON.stringify(clientData))

  //Step 9: Decode the attestationObject using CBOR
  //In this step, we also convert the authData Buffer into an usable JSON
  const attestation: GenericAttestation = CBOR.decodeFirstSync(Buffer.from(keyCredentialObject.attestationObject, 'base64'))
  // const authenticatorData: AuthenticatorData = parseAuthenticatorData(attestation.authData);

  let potentialUser = await users.get(userName)
  console.log({ potentialUser, userName })
  if (potentialUser) {
    console.log('ALREADY REGISTERED')
    return {
      status: 401,
      text: 'The credentialId is already in use. Please re-attempt the registration'
    }
  }
  // const credential: User = {
  //   id: keyCredentialObject.id,
  //   credentialPublicKey: getPublicKey(attestation.authData),
  //   // credentialPublicKey: authenticatorData.attestedCredentialData.credentialPublicKey,
  //   signCount: 1,
  // }
  //Step 20: Register the new credentials in your storage
  const authenticatorData: AuthenticatorData = parseAuthenticatorData(attestation.authData);

  const credential: User = {
    id: keyCredentialObject.id,
    credentialPublicKey: authenticatorData.attestedCredentialData.credentialPublicKey,
    signCount: authenticatorData.signCount
  };
  users.create(userName, credential)
  console.log('AFTER REG', users.get(userName))

  return { status: 200, text: 'Registration successful!' }
}


function getPublicKey(authData: any) {
  // get the length of the credential ID
  const dataView = new DataView(
    new ArrayBuffer(2))
  const idLenBytes = authData.slice(53, 55)
  idLenBytes.forEach(
    (value, index) => dataView.setUint8(
      index, value))
  const credentialIdLength = dataView.getUint16()

// get the credential ID
  const credentialId = authData.slice(
    55, 55 + credentialIdLength)

// get the public key object
  const publicKeyBytes = authData.slice(
    55 + credentialIdLength)

// the publicKeyBytes are encoded again as CBOR
  const publicKeyObject = CBOR.decode(
    publicKeyBytes.buffer)
  console.log(publicKeyObject)
  return publicKeyObject
}


function parseAuthenticatorData(authData: Buffer) {
  try {
    const authenticatorData: any = {};


    authenticatorData.rpIdHash = authData.slice(0, 32);
    authenticatorData.flags = authData[32];
    authenticatorData.signCount = (authData[33] << 24) | (authData[34] << 16) | (authData[35] << 8) | (authData[36]);

    //Check if the client sent attestedCredentialdata, which is necessary for every new public key scheduled. This is indicated by the 6th bit of the flag byte being 1 (See specification at function start for reference)
    if (authenticatorData.flags & 64) {
      //Extract the data from the Buffer. Reference of the structure can be found here: https://w3c.github.io/webauthn/#sctn-attested-credential-data
      const attestedCredentialData: { [key: string]: any } = {};
      attestedCredentialData.aaguid = uuid.unparse(authData.slice(37, 53)).toUpperCase();
      attestedCredentialData.credentialIdLength = (authData[53] << 8) | authData[54];
      attestedCredentialData.credentialId = authData.slice(55, 55 + attestedCredentialData.credentialIdLength);
      //Public key is the first CBOR element of the remaining buffer
      const publicKeyCoseBuffer = authData.slice(55 + attestedCredentialData.credentialIdLength, authData.length);

      //convert public key to JWK for storage
      attestedCredentialData.credentialPublicKey = coseToJwk(publicKeyCoseBuffer);

      authenticatorData.attestedCredentialData = attestedCredentialData;
    }

    //Check for extension data in the authData, which is indicated by the 7th bit of the flag byte being 1 (See specification at function start for reference)
    if (authenticatorData.flags & 128) {
      //has extension data

      let extensionDataCbor;

      if (authenticatorData.attestedCredentialData) {
        //if we have attesttestedCredentialData, then extension data is
        //the second element
        extensionDataCbor = CBOR.decodeAllSync(authData.slice(55 + authenticatorData.attestedCredentialData.credentialIdLength, authData.length));
        extensionDataCbor = extensionDataCbor[1];
      } else {
        //Else it's the first element
        extensionDataCbor = CBOR.decodeFirstSync(authData.slice(37, authData.length));
      }

      authenticatorData.extensionData = CBOR.encode(extensionDataCbor).toString('base64');
    }

    return authenticatorData;
  } catch (e) {
    throw new Error("Authenticator Data could not be parsed")
  }
}

function coseToJwk(cose: any) {
  try {
    let publicKeyJwk = {};
    const publicKeyCbor = CBOR.decodeFirstSync(cose);
    //Determine which encryption method was used to create the public key
    if (publicKeyCbor.get(3) == -7) {
      publicKeyJwk = {
        kty: "EC",
        crv: "P-256",
        x: publicKeyCbor.get(-2).toString('base64'),
        y: publicKeyCbor.get(-3).toString('base64')
      }
    } else if (publicKeyCbor.get(3) == -257) {
      publicKeyJwk = {
        kty: "RSA",
        n: publicKeyCbor.get(-1).toString('base64'),
        e: publicKeyCbor.get(-2).toString('base64')
      }
    } else {
      throw new Error("Unknown public key algorithm");
    }

    return publicKeyJwk;
  } catch (e) {
    throw new Error("Could not decode COSE Key");
  }
}
