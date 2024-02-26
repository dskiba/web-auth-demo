'use client'
import { useState } from 'react'
import { RegisterPayload } from '~/types/register'
import { base64encode, bufferDecode, bufferEncode, bufferToUTF8String } from '~/utils/buffer'
import { arrayBufferToString } from 'next/dist/server/app-render/action-encryption-utils'

type SubmitEvent = React.FormEvent<HTMLFormElement> & {
  nativeEvent: { submitter: HTMLButtonElement }
}

export default function Home() {
  const [serverResp, setServerResp] = useState<any | null>(null)

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    try {
      const isRegister = e.nativeEvent.submitter.name === 'reg'
      const isAuth = e.nativeEvent.submitter.name === 'auth'

      const getServerOptions = async () => {
        const res = await fetch('/api/options', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user, isReg: isRegister }),
        })
        if (res.status !== 200) {
          const msg = await res.json()
          throw new Error()
        }
        const json = await res.json() as {
          message: string,
          options: RegisterPayload
        }
        setServerResp(json)
        return json.options
      }

      const user = e.currentTarget[fieldname].value
      const serverOptions = await getServerOptions()
      console.log({ serverOptions })
      if (isRegister) {
        const options: CredentialCreationOptions = {
          publicKey: {
            ...serverOptions,
            challenge: Uint8Array.from(serverOptions.challenge, c => c.charCodeAt(0)),
            user: {
              ...serverOptions.user,
              id: Uint8Array.from(serverOptions.user.id, c => c.charCodeAt(0)),
            }
          },
        }
        document.cookie = `userId=${serverOptions.user.name}`
        const credential = await navigator.credentials.create(options) as any
        // ts-expect-error
        const { id, response, type } = credential
        let userHandle = undefined
        if (response.userHandle) {
          userHandle = bufferToUTF8String(response.userHandle)
        }
        // Convert values to base64 to make it easier to send back to the server
        const rawId = new Uint8Array(credential.rawId)

        //The credential object is secured by the client and can for example not be sent directly to the server. Therefore we extract all relevant information from the object, transform it to a securely encoded and server-interpretable format and then send it to our server for further verification.
        let attestation = {
          id: bufferEncode(rawId),
          readableId: credential.id,
          clientDataJSON: arrayBufferToString(credential.response.clientDataJSON),
          attestationObject: base64encode(credential.response.attestationObject)
        }

        const regResponse = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pkc: attestation
          }),
        })
        if (regResponse.status !== 200) {
          const msg = await regResponse.json()
          throw new Error(msg)
        }
        console.log({ verifyResponse: regResponse })
      } else {
        let publicKeyCredentialRequestOptions = { ...serverOptions }
        // @ts-expect-error
        publicKeyCredentialRequestOptions.challenge = Uint8Array.from(
          publicKeyCredentialRequestOptions.challenge, c => c.charCodeAt(0)).buffer
        publicKeyCredentialRequestOptions.allowCredentials[0].id = bufferDecode(publicKeyCredentialRequestOptions.allowCredentials[0].id)

        console.log(publicKeyCredentialRequestOptions)
        //Here the user is prompted to register. If the verification succeeds, the client returns an object with all relevant credentials of the user.
        const assertion = await navigator.credentials.get({
          // @ts-expect-error
          publicKey: publicKeyCredentialRequestOptions
        })
        if (!assertion) {
          throw new Error('No assertion')
        }

        //The credential object is secured by the client and can for example not be sent directly to the server. Therefore we extract all relevant information from the object, transform it to a securely encoded and server-interpretable format and then send it to our server for further verification.
        const readableAssertion = {
          id: base64encode(assertion.rawId),
          rawId: base64encode(assertion.rawId),
          response: {
            clientDataJSON: arrayBufferToString(assertion.response.clientDataJSON),
            authenticatorData: base64encode(assertion.response.authenticatorData),
            signature: base64encode(assertion.response.signature),
            userHandle: base64encode(assertion.response.userHandle),
          }

        }

        const verifyResponse = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pkc: readableAssertion,
            user,
          })
        })
        console.log({ verifyResponse })
        const json = await verifyResponse.json()
        console.log({ json })
        setServerResp(json)
        // auth
      }

    } catch (err) {
      console.error('ERR', err)
      setServerResp(err.message)
    }
  }

  const fieldname = 'auth_user'
  return (
    <main className="flex min-h-screen flex-col p-10 mb-4">
      <form className={'flex flex-col gap-2 max-w-[300px] justify-center mx-auto w-full'}
            onSubmit={handleSubmit}>
        <h2 className={'mb-2'}>Biometric auth demo</h2>
        <label className={'text-xs flex flex-col'}>
          User
          <input
            id={fieldname} name={fieldname} autoComplete={'off'} autoCorrect={'off'}
            autoCapitalize={'off'} autoFocus
            className={'rounded py-1 px-0.5 color text-xs text-gray-900'}
          />
        </label>
        <button type={'submit'} className={'bg-fuchsia-400 rounded mt-4'}
                name={'reg'}
        >register
        </button>
        <button type={'submit'} className={'bg-fuchsia-400 rounded mb-4'}
                name={'auth'}
        >auth
        </button>
        {serverResp && <div>
          server response: {JSON.stringify(serverResp, null, 2)}
        </div>}
      </form>
    </main>
  )
}
