import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const get = async (userName: string) => {
  const user =  await prisma.user.findFirst({
    where: {
      name: userName
    }
  })
  if(!user) return null
  user.creds = JSON.parse(user.creds)
  return user
}

const create = async (name: string, credentials: Object) => {
  const user = await prisma.user.create({
    data: {
      name: name,
      creds: JSON.stringify(credentials),
    }
  })
  user.creds = JSON.parse(user.creds)
  return user
}
export const users = { get, create }




