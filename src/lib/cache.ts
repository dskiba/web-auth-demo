function getCache() {
  return {} as Record<string, any>
}

const cacheInstance = getCache()

function get(key: string) {
  return cacheInstance[key]
}

function set(key: string, value: any) {
  cacheInstance[key] = value
}

export const cache = { get, set }


