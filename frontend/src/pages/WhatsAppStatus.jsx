import { useState, useEffect } from 'react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import {
  Radio,
  Type,
  Image,
  Video,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2,
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS = [
  '#128C7E', '#25D366', '#075E54',
  '#1a1a2e', '#16213e', '#0f3460',
  '#e94560', '#f5a623', '#9b59b6',
  '#2c3e50', '#e74c3c', '#3498db',
  '#ffffff', '#000000', '#f39c12',
]

const FONTS = [
  { id: 0, label: 'Sans (défaut)' },
  { id: 1, label: 'Serif' },
  { id: 2, label: 'Monospace' },
  { id: 3, label: 'Cursif' },
  { id: 4, label: 'Fantaisie' },
]

const HISTORY_KEY = 'wa_status_history'
const MAX_HISTORY = 20

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveToHistory(entry) {
  const history = loadHistory()
  const updated = [entry, ...history].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  return updated
}

function PhonePreview({ type, text, backgroundColor, font, mediaUrl, caption, isDark }) {
  const fontMap = { 0: 'sans-serif', 1: 'Georgia, serif', 2: 'monospace', 3: 'cursive', 4: 'fantasy' }
  const fontFamily = fontMap[font] || 'sans-serif'

  return (
    <div className="flex items-center justify-center">
      <div
        className="relative w-48 h-80 rounded-[2rem] border-4 border-gray-700 shadow-2xl overflow-hidden flex items-center justify-center"
        style={{ background: type === 'text' ? (backgroundColor || '#128C7E') : '#000' }}
      >
        {/* "Status" bar top */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-black/30 flex items-center justify-between px-3">
          <span className="text-white/70 text-[8px]">Mon statut</span>
          <div className="flex gap-1">
            <div className="w-8 h-0.5 bg-white/60 rounded-full" />
          </div>
        </div>

        {type === 'text' && (
          <p
            className="text-white text-center px-4 text-sm font-medium leading-relaxed"
            style={{ fontFamily, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
          >
            {text || 'Votre texte apparaîtra ici…'}
          </p>
        )}

        {type === 'image' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {mediaUrl ? (
              <img
                src={mediaUrl}
                alt="preview"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : (
              <Image className="w-10 h-10 text-white/40" />
            )}
            {caption && (
              <div className="absolute bottom-8 left-0 right-0 px-3">
                <p className="text-white text-[10px] text-center bg-black/50 rounded-lg p-1.5">{caption}</p>
              </div>
            )}
          </div>
        )}

        {type === 'video' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
            <Video className="w-10 h-10 text-white/40 mb-2" />
            <p className="text-white/50 text-[9px] text-center px-4">{mediaUrl || 'URL vidéo'}</p>
            {caption && (
              <div className="absolute bottom-8 left-0 right-0 px-3">
                <p className="text-white text-[10px] text-center bg-black/50 rounded-lg p-1.5">{caption}</p>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/40 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[#25D366]/80 flex items-center justify-center">
            <Send className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WhatsAppStatus() {
  const { isDark } = useTheme()
  const [agents, setAgents] = useState([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState('')
  const [tab, setTab] = useState('text') // 'text' | 'image' | 'video'
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState(loadHistory)

  // Text fields
  const [text, setText] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('#128C7E')
  const [font, setFont] = useState(0)

  // Media fields
  const [mediaUrl, setMediaUrl] = useState('')
  const [caption, setCaption] = useState('')

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setLoadingAgents(true)
    try {
      const res = await api.get('/agents')
      const connected = (res.data?.agents || []).filter(a => a.whatsapp_connected)
      setAgents(connected)
      if (connected.length === 1) setSelectedAgent(connected[0].id)
    } catch {
      toast.error('Impossible de charger les agents')
    } finally {
      setLoadingAgents(false)
    }
  }

  const handleSend = async () => {
    if (!selectedAgent) {
      toast.error('Sélectionnez un agent WhatsApp connecté')
      return
    }
    if (tab === 'text' && !text.trim()) {
      toast.error('Saisissez un texte pour votre statut')
      return
    }
    if ((tab === 'image' || tab === 'video') && !mediaUrl.trim()) {
      toast.error(`Saisissez l'URL ${tab === 'image' ? "de l'image" : "de la vidéo"}`)
      return
    }

    setSending(true)
    try {
      const payload = {
        type: tab,
        ...(tab === 'text' && { text: text.trim(), backgroundColor, font }),
        ...(tab !== 'text' && { mediaUrl: mediaUrl.trim(), caption: caption.trim() }),
      }

      await api.post(`/whatsapp/status/${selectedAgent}`, payload)

      const agentName = agents.find(a => a.id === selectedAgent)?.name || 'Agent'
      const historyEntry = {
        id: Date.now(),
        agentName,
        type: tab,
        text: tab === 'text' ? text.trim() : caption.trim() || mediaUrl.trim(),
        backgroundColor: tab === 'text' ? backgroundColor : null,
        sentAt: new Date().toISOString(),
        success: true
      }
      setHistory(saveToHistory(historyEntry))

      toast.success('Statut WhatsApp publié avec succès ! 🚀')

      // Reset form
      setText('')
      setMediaUrl('')
      setCaption('')
    } catch (error) {
      const msg = error.response?.data?.error || 'Erreur lors de l\'envoi du statut'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
    toast.success('Historique effacé')
  }

  const tabs = [
    { id: 'text', label: 'Texte', icon: Type },
    { id: 'image', label: 'Image', icon: Image },
    { id: 'video', label: 'Vidéo', icon: Video },
  ]

  return (
    <div className="max-w-full mx-auto w-full pb-12 px-4 sm:px-6 lg:px-8 space-y-6">

      {/* Hero Header */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-6 sm:p-8 ${
        isDark
          ? 'bg-gradient-to-br from-emerald-900/30 via-space-900 to-space-800 border-emerald-700/30'
          : 'bg-gradient-to-br from-emerald-50 via-white to-green-50 border-green-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/15 rounded-2xl flex-shrink-0">
              <Radio className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-2xl sm:text-3xl font-display font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Statut WhatsApp
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                  Module 12
                </span>
              </div>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Publiez des Stories WhatsApp (texte, image, vidéo) depuis vos agents connectés
              </p>
            </div>
          </div>
          <button
            onClick={loadAgents}
            disabled={loadingAgents}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 text-sm ${
              isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loadingAgents ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Info box */}
        <div className={`mt-5 flex items-start gap-3 p-3 rounded-xl border text-sm ${
          isDark ? 'bg-blue-500/5 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Les statuts sont envoyés à <code className="font-mono text-xs bg-black/20 px-1 py-0.5 rounded">status@broadcast</code> et visibles par tous vos contacts WhatsApp pendant 24 h.</p>
        </div>
      </div>

      {/* No agents warning */}
      {!loadingAgents && agents.length === 0 && (
        <div className={`flex items-center gap-4 p-5 rounded-2xl border ${
          isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
        }`}>
          <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
          <div>
            <p className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Aucun agent WhatsApp connecté</p>
            <p className={`text-sm mt-1 ${isDark ? 'text-amber-400/70' : 'text-amber-700'}`}>
              Connectez un agent WhatsApp depuis la page <strong>Agents</strong> pour pouvoir publier des statuts.
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Composer */}
        <div className="lg:col-span-2 space-y-5">

          {/* Agent selector */}
          <div className={`card p-5 space-y-3`}>
            <label className={`block text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Agent expéditeur *
            </label>
            {loadingAgents ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
              </div>
            ) : (
              <select
                value={selectedAgent}
                onChange={e => setSelectedAgent(e.target.value)}
                className="input-dark w-full py-3 px-4 rounded-xl text-sm"
              >
                <option value="">— Choisir un agent —</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.whatsapp_number || 'Connecté'})</option>
                ))}
              </select>
            )}
          </div>

          {/* Type tabs */}
          <div className={`card p-1 flex gap-1`}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  tab === t.id
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                    : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Text composer */}
          {tab === 'text' && (
            <div className="card p-5 space-y-5">
              <div className="space-y-2">
                <label className={`block text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Texte du statut *
                </label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  maxLength={700}
                  rows={4}
                  className="input-dark w-full py-3 px-4 rounded-xl text-sm resize-none"
                  placeholder="Saisissez votre message de statut…"
                />
                <p className={`text-right text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{text.length}/700</p>
              </div>

              {/* Background color */}
              <div className="space-y-2">
                <label className={`block text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Couleur de fond
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setBackgroundColor(color)}
                      title={color}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        backgroundColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={e => setBackgroundColor(e.target.value)}
                    title="Couleur personnalisée"
                    className="w-8 h-8 rounded-full border-2 border-dashed border-gray-500 cursor-pointer bg-transparent"
                  />
                </div>
              </div>

              {/* Font */}
              <div className="space-y-2">
                <label className={`block text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Police
                </label>
                <div className="flex flex-wrap gap-2">
                  {FONTS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFont(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-200 border ${
                        font === f.id
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : isDark ? 'text-gray-400 border-space-700 hover:border-space-600 hover:text-gray-200' : 'text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Image / Video composer */}
          {(tab === 'image' || tab === 'video') && (
            <div className="card p-5 space-y-4">
              <div className="space-y-2">
                <label className={`block text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  URL {tab === 'image' ? "de l'image" : 'de la vidéo'} *
                </label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  className="input-dark w-full py-3 px-4 rounded-xl text-sm"
                  placeholder={tab === 'image' ? 'https://example.com/image.jpg' : 'https://example.com/video.mp4'}
                />
              </div>
              <div className="space-y-2">
                <label className={`block text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Légende (optionnel)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  maxLength={200}
                  className="input-dark w-full py-3 px-4 rounded-xl text-sm"
                  placeholder="Ajoutez une description…"
                />
              </div>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || agents.length === 0 || !selectedAgent}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-base transition-all duration-200 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Publication en cours…
              </>
            ) : (
              <>
                <Radio className="w-5 h-5" />
                Publier le statut
              </>
            )}
          </button>
        </div>

        {/* Right panel: Preview + History */}
        <div className="space-y-5">
          {/* Live preview */}
          <div className="card p-5">
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Aperçu
            </h3>
            <PhonePreview
              type={tab}
              text={text}
              backgroundColor={backgroundColor}
              font={font}
              mediaUrl={mediaUrl}
              caption={caption}
              isDark={isDark}
            />
          </div>

          {/* History */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Historique
              </h3>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Effacer
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-6">
                <Clock className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Aucun statut envoyé</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {history.map(entry => (
                  <div
                    key={entry.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      isDark ? 'border-space-700/50 bg-space-800/40' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      entry.type === 'text' ? 'bg-emerald-500/20' : entry.type === 'image' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                    }`}>
                      {entry.type === 'text' ? <Type className="w-3.5 h-3.5 text-emerald-400" /> :
                       entry.type === 'image' ? <Image className="w-3.5 h-3.5 text-blue-400" /> :
                       <Video className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span className={`text-xs font-medium truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {entry.agentName}
                        </span>
                        {entry.backgroundColor && (
                          <span className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: entry.backgroundColor }} />
                        )}
                      </div>
                      <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        {entry.text || '—'}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>
                        {new Date(entry.sentAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
