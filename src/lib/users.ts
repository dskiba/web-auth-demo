type User = {
  name: string
  creds: string
}
type Db = Record<string, User>
const db: Db  = {}

const get = async (userName: string) => {
  console.log({ db })
  const user = db[userName]
  if(!user) return null
  return user
}

const create = async (name: string, credentials: Object) => {
  const user: User = {
    name,
    creds: JSON.stringify(credentials)
  }
  db[name] = user
  user.creds = JSON.parse(user.creds)
  return user
}
export const users = { get, create }




