import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Cache storage for GET requests
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Routes de polling temps-réel → jamais mises en cache
// Le QR code WhatsApp change toutes les ~20-60s, les messages arrivent en continu
const NO_CACHE_PATTERNS = [
  /\/whatsapp\/status\//,
  /\/whatsapp\/qr\//,
  /\/whatsapp\/new-messages\//,
  /\/whatsapp\/sync-status\//,
  /\/conversations\/updates/,
  /\/conversations\/.*\/new-messages/,
]

const shouldSkipCache = (url) =>
  NO_CACHE_PATTERNS.some((pattern) => pattern.test(url))

let isRefreshing = false
let failedQueue = []

const processQueue = (error) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

api.interceptors.request.use((config) => {
  // Add token to requests; allow FormData to set Content-Type (multipart)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  // Basic Cache logic for GET requests (exclut les routes temps-réel)
  if (config.method?.toLowerCase() === 'get' && !shouldSkipCache(config.url)) {
    const cacheKey = config.url + JSON.stringify(config.params || {})
    const cachedData = cache.get(cacheKey)
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
      // Return a custom object that the response interceptor will handle
      config.adapter = () => {
        return Promise.resolve({
          data: cachedData.data,
          status: 200,
          statusText: 'OK',
          headers: config.headers,
          config: config,
          request: {}
        })
      }
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    // Store in cache if it's a GET request (et pas une route temps-réel)
    if (
      response.config.method?.toLowerCase() === 'get' &&
      !shouldSkipCache(response.config.url)
    ) {
      const cacheKey = response.config.url + JSON.stringify(response.config.params || {})
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      })
    } else if (['post', 'put', 'delete', 'patch'].includes(response.config.method?.toLowerCase())) {
      // Clear cache on successful state-changing requests
      cache.clear()
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response && error.response.status === 401) {
      const url = originalRequest?.url

      // Session probes: do not attempt refresh (avoid noise/loops)
      // Special session probes should still allow refresh if possible,
      // but we shouldn't trigger global logout too aggressively on background polls
      if (url && (url.includes('/partner/auth/me') || url.includes('/conversations/updates'))) {
        window.dispatchEvent(new Event('auth:unauthorized'))
        return Promise.reject(error)
      }

      // Avoid looping on auth endpoints
      if (
        url && 
        (url.includes('/auth/login') || 
         url.includes('/auth/register') || 
         url.includes('/auth/refresh') || 
         url.includes('/auth/logout'))
      ) {
        return Promise.reject(error)
      }

      // Special case: /auth/me on initial load is expected to sometimes be 401, but we STILL want to try and refresh it
      // if we have a refresh token.

      if (!originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then(() => {
              return api(originalRequest)
            })
            .catch((err) => {
              return Promise.reject(err)
            })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          await axios.post('/api/auth/refresh', {}, { withCredentials: true })
          isRefreshing = false
          processQueue(null)
          return api(originalRequest)
        } catch (refreshError) {
          isRefreshing = false
          processQueue(refreshError)
          window.dispatchEvent(new Event('auth:unauthorized'))
          return Promise.reject(refreshError)
        }
      } else {
        window.dispatchEvent(new Event('auth:unauthorized'))
      }
    }
    return Promise.reject(error)
  }
)

// ==================== SYNC HELPERS ====================

// Sync chats for an agent
export const syncChats = async (agentId) => {
  const response = await api.post(`/whatsapp/sync/${agentId}`)
  return response.data
}

// Get sync status
export const getSyncStatus = async (agentId) => {
  const response = await api.get(`/whatsapp/sync-status/${agentId}`)
  return response.data
}

// Sync messages for a conversation
export const syncMessages = async (agentId, conversationId, limit = 50) => {
  const response = await api.post(`/whatsapp/sync-messages/${agentId}/${conversationId}`, { limit })
  return response.data
}

// Get contacts
export const getContacts = async (agentId) => {
  const response = await api.get(`/whatsapp/contacts/${agentId}`)
  return response.data
}

// Send message to conversation
export const sendToConversation = async (agentId, conversationId, message) => {
  const response = await api.post(`/whatsapp/send-to-conversation/${agentId}/${conversationId}`, { message })
  return response.data
}

// Get new messages for an agent (polling)
export const getNewMessages = async (agentId, since) => {
  const response = await api.get(`/whatsapp/new-messages/${agentId}`, { params: { since } })
  return response.data
}

// Get conversation updates (polling)
export const getConversationUpdates = async (since) => {
  const response = await api.get('/conversations/updates/all', { params: { since } })
  return response.data
}

// Get messages with pagination
export const getMessagesWithPagination = async (conversationId, { limit, offset, before } = {}) => {
  const response = await api.get(`/conversations/${conversationId}/messages`, { 
    params: { limit, offset, before } 
  })
  return response.data
}

// Delete messages (selection and/or all)
export const deleteMessages = async (conversationId, { message_ids, delete_all } = {}) => {
  const response = await api.delete(`/conversations/${conversationId}/messages`, {
    data: { message_ids, delete_all }
  })
  return response.data
}

// Get new messages for a conversation
export const getNewConversationMessages = async (conversationId, since) => {
  const response = await api.get(`/conversations/${conversationId}/new-messages`, { params: { since } })
  return response.data
}

// Mark messages as read
export const markConversationRead = async (conversationId) => {
  const response = await api.post(`/conversations/${conversationId}/mark-read`)
  return response.data
}

export default api
