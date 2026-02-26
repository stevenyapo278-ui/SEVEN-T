// URL relative pour les images hébergées par l'API (ex. téléphone sur le même réseau)
export function getProductImageUrl(url) {
  if (!url?.trim()) return url
  const u = url.trim()
  if (/^https?:\/\//i.test(u) && u.includes('/api/products/image/')) {
    try {
      return new URL(u).pathname
    } catch {
      return u
    }
  }
  return u
}
