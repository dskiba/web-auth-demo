// @ts-nocheck
import { type NextRequest } from 'next/server'
import { RegisterPayload } from '~/types/register'
import { cache } from '~/lib/cache'
import { users } from '~/lib/users'
import { PrismaClient } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as { user: string, isReg: boolean }
    // const user = users.get(payload.user)
    const user = await users.get(payload.user)
console.log({ user })
    if (payload.isReg) {
      if (user) {
        return Response.json({ message: 'User already exists' }, { status: 400 })
      }
      const options = getOptions(payload)
      console.log('before', { payload })
      cache.set(payload.user, options)
      return Response.json({ message: 'Sending options', options }, { status: 200 })
    } else {
      if (user) {
        const options = {
          challenge: getRandomString(),
          timeout: 60000,
          // userVerification: "discouraged",
          // rpId: process.env.RPID,
          allowCredentials: [
            { type: 'public-key', id: user.creds.id }
          ],

          // transports: ["internal", "usb", "nfc", "ble"]
        }
        return Response.json({ message: 'Sending options', options }, { status: 200 })
      }
      return Response.json({ message: 'User does not exist' }, { status: 400 })
    }
  } catch (error: any) {
    console.error(error)
    return Response.json(error?.message || 'Error', { status: 500 })
  }
}


const createCredentials = async ({ user }: { user: string }) => {
  const options = getOptions({ user })

  const cred = await generateCred(options)
  if (!cred) throw new Error('no cred')

  const id = cred.id //The ID for the newly generated credential; it will be used to identify the credential when authenticating the user

  // @ts-expect-error
  const assertion = cred.response.attestationObject //used also to validate the registration event.

  const utf8Decoder = new TextDecoder('utf-8')
  // @ts-expect-error
  const decodedClientData = utf8Decoder.decode(cred.response.clientDataJSON)

  const clientDataObj = JSON.parse(decodedClientData)
}

const randomStringFromServer = 'SERVER_CHALLENGE'

const USER_ID = 'USER_1'

const getChallenge = () => {
  return Uint8Array.from(randomStringFromServer, c => c.charCodeAt(0))
}

const getRandomId = (): string => {
  return Math.random().toString(36).substring(2)
}

const getRandomString = () => {
  return Math.random().toString(36).substring(2)
}

const getOptions = ({ user }: {
  user: string
}): RegisterPayload => {
  return {
    challenge: getRandomString(),
    rp: {
      name: 'Evil Corp',
      id: 'localhost', // Forcing the identifier of the website at registration to match the current hostname.
    },
    user: {
      name: user,
      displayName: 'Test Demo',
      id: getRandomId(),
    },
    // @ts-expect-error
    user_verification: "preferred",
    // to prevent replay attacks. It’s a unique high-entropy string you as the web app developer must provide.
    // This challenge will be returned in the response and you must register they are the same.
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
    authenticatorSelection: {},
    timeout: 60000,
  }
}

const generateCred = (options: CredentialCreationOptions) => {
  return navigator.credentials.create(options)
}
