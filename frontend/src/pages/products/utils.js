// URL relative pour les images hébergées par l'API (ex. téléphone sur le même réseau)
export function getProductImageUrl(url) {
  if (!url?.trim()) return url
  const u = url.trim()
  // URL absolue externe → la retourner telle quelle
  if (u.startsWith('http')) {
    // Si c'est une URL absolue vers notre propre API (ex: http://localhost:3001/api/products/image/...)
    // on extrait juste le pathname pour éviter les problèmes de domaine
    if (u.includes('/api/products/image/')) {
      try { return new URL(u).pathname } catch { return u }
    }
    return u
  }
  // URL relative déjà complète (ex: /api/products/image/xxx.jpg) → retourner telle quelle
  if (u.startsWith('/api/') || u.startsWith('/products/')) return u
  // Juste un nom de fichier → construire l'URL complète
  return `/api/products/image/${u}`
}
