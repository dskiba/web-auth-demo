import type { NextRequest } from 'next/server'
import { users } from '~/lib/users'
import { ClientDataJSON } from '~/types/register'
import crypto from 'crypto'
import jwkToPem, { JWK } from 'jwk-to-pem'
import { sha256 } from '~/utils/crypto'


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const msg = await verify(body.pkc, body.user)
    return Response.json(msg, { status: 200 })
  } catch (e) {
    console.error(e)
    return Response.json({ message: 'Error while auth user' }, { status: 500 })
  }
}

async function verify(assertion: any, userName: string) {
  //Steps 1 - 3 already fulfilled at the client
  //Step 4: Look up the user in your database
  const user = await users.get(userName)
  if (!user) {
    return {
      status: 403,
      text: 'This user is not registered at our server!'
    }
  }

  // @ts-ignore
  const clientData: ClientDataJSON = JSON.parse(assertion.response.clientDataJSON)
  //Step 8: Verify that the type of the request is webauthn.get
  if (clientData.type !== 'webauthn.get') {
    return {
      status: 403,
      text: 'The operation specified in the clientDataJSON is not webauthn.get'
    }
  }

  console.log({ assertion })
  let hash = sha256(assertion.response.clientDataJSON)

  const sig = Buffer.from(assertion.response.signature, 'base64')
  let authDataBuffer = Buffer.from(assertion.response.authenticatorData, 'base64')
  // @ts-ignore
  const verify = (user.creds.credentialPublicKey.kty === 'RSA') ? crypto.createVerify('RSA-SHA256') : crypto.createVerify('sha256')
  console.log('1111111111')
  verify.update(authDataBuffer)
  verify.update(hash)
  console.log('66666666666666666', user, sig)
  // @ts-ignore
  if (!verify.verify(jwkToPem(user.creds.credentialPublicKey as JWK), sig)) {
    console.log('2222222')
    return {
      status: 403,
      text: 'Could not verify the client signature!'
    }
  }
  console.log('33333333333')
  return { status: 200, text: 'OK' }
}
