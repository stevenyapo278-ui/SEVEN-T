/**
 * Persiste la dernière page visitée (pathname + search) pour restaurer
 * la session après reconnexion (même page + filtres actifs).
 *
 * IMPORTANT : stockage **par utilisateur** pour éviter qu'un utilisateur
 * ne soit redirigé vers la dernière page d'un autre utilisateur sur le
 * même navigateur.
 */
const STORAGE_KEY = 'sevent_last_locations'

/** Routes dashboard valides pour la restauration (préfixes) */
const VALID_PREFIXES = ['/dashboard']

function readMap() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(map) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // localStorage full ou indisponible
  }
}

/**
 * Sauvegarde la dernière page pour un utilisateur donné.
 */
export function saveSessionLocation(userId, pathname, search = '') {
  if (typeof window === 'undefined') return
  if (!userId) return
  const fullPath = pathname + (search || '')
  if (!VALID_PREFIXES.some((p) => fullPath.startsWith(p))) return
  const map = readMap()
  map[userId] = fullPath
  writeMap(map)
}

/**
 * Retourne et supprime la dernière page pour un utilisateur donné.
 */
export function getAndClearSessionLocation(userId) {
  if (typeof window === 'undefined') return null
  if (!userId) return null
  const map = readMap()
  const value = map[userId] || null
  if (value) {
    delete map[userId]
    writeMap(map)
  }
  return value
}

/**
 * Lis la dernière page pour un utilisateur donné (sans la supprimer).
 */
export function getSessionLocation(userId) {
  if (typeof window === 'undefined') return null
  if (!userId) return null
  const map = readMap()
  return map[userId] || null
}
