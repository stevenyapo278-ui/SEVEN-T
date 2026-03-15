import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests; allow FormData to set Content-Type (multipart)
// allow FormData to set Content-Type (multipart)
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401 on a route OTHER than login/register, it means the session is invalid or expired.
    if (error.response && error.response.status === 401) {
      const url = error.config?.url;
      if (url && !url.includes('/auth/login') && !url.includes('/auth/register')) {
        window.dispatchEvent(new Event('auth:unauthorized'));
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
