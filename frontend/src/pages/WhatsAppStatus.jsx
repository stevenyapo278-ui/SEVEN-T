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
  Info,
  Calendar,
  X,
  UploadCloud
} from 'lucide-react'
import toast from 'react-hot-toast'
import DatePicker, { registerLocale } from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import fr from 'date-fns/locale/fr'

registerLocale('fr', fr)

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

function PhonePreview({ type, text, backgroundColor, font, mediaUrl, caption, isDark, selectedFile }) {
  const fontMap = { 0: 'sans-serif', 1: 'Georgia, serif', 2: 'monospace', 3: 'cursive', 4: 'fantasy' }
  const fontFamily = fontMap[font] || 'sans-serif'
  
  // Create an object URL for previewing local file uploads
  const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : mediaUrl

  return (
    <div className="flex items-center justify-center">
      <div
        className="relative w-48 h-80 rounded-[2rem] border-4 border-gray-700 shadow-2xl overflow-hidden flex items-center justify-center"
        style={{ background: type === 'text' ? (backgroundColor || '#128C7E') : '#000' }}
      >
        <div className="absolute top-0 left-0 right-0 h-8 bg-black/30 flex items-center justify-between px-3 z-10">
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
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : (
              <Image className="w-10 h-10 text-white/40" />
            )}
            {caption && (
              <div className="absolute bottom-8 left-0 right-0 px-3 z-10">
                <p className="text-white text-[10px] text-center bg-black/50 rounded-lg p-1.5">{caption}</p>
              </div>
            )}
          </div>
        )}

        {type === 'video' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
            {previewUrl ? (
                <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop />
            ) : (
                <>
                    <Video className="w-10 h-10 text-white/40 mb-2" />
                    <p className="text-white/50 text-[9px] text-center px-4">Aperçu vidéo</p>
                </>
            )}
            {caption && (
              <div className="absolute bottom-8 left-0 right-0 px-3 z-10">
                <p className="text-white text-[10px] text-center bg-black/50 rounded-lg p-1.5">{caption}</p>
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/40 flex items-center justify-center z-10">
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
  const [tab, setTab] = useState('text')
  const [sending, setSending] = useState(false)
  
  const [history, setHistory] = useState([])
  const [pending, setPending] = useState([])
  const [historyTab, setHistoryTab] = useState('pending') // 'pending' | 'sent'
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Text fields
  const [text, setText] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('#128C7E')
  const [font, setFont] = useState(0)

  // Media fields
  const [mediaUrl, setMediaUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [caption, setCaption] = useState('')

  // Scheduling
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(null)

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    if (selectedAgent) {
        loadHistoryData()
    }
  }, [selectedAgent])

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

  const loadHistoryData = async () => {
      if (!selectedAgent) return;
      setLoadingHistory(true)
      try {
          const res = await api.get(`/whatsapp/statuses/${selectedAgent}`)
          const allStatuses = res.data?.statuses || []
          setPending(allStatuses.filter(s => s.status === 'scheduled'))
          setHistory(allStatuses.filter(s => s.status !== 'scheduled'))
      } catch (err) {
          console.error(err)
      } finally {
          setLoadingHistory(false)
      }
  }

  const handleDeleteScheduled = async (id) => {
      try {
          await api.delete(`/whatsapp/statuses/${id}`)
          toast.success('Statut programmé annulé')
          loadHistoryData()
      } catch (err) {
          toast.error('Erreur lors de la suppression')
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
    if ((tab === 'image' || tab === 'video') && !mediaUrl.trim() && !selectedFile) {
      toast.error(`Saisissez une URL ou uploadez un fichier ${tab === 'image' ? "d'image" : "vidéo"}`)
      return
    }
    if (isScheduled && !scheduledAt) {
      toast.error('Veuillez séléctionner une date et heure de programmation')
      return
    }
    if (isScheduled && scheduledAt < new Date()) {
      toast.error('La date de programmation doit être dans le futur')
      return
    }

    setSending(true)
    try {
      let finalMediaUrl = mediaUrl.trim()

      if ((tab === 'image' || tab === 'video') && selectedFile) {
          const formData = new FormData()
          formData.append('file', selectedFile)
          const uploadRes = await api.post('/whatsapp/status/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          })
          if (uploadRes.data?.url) {
              finalMediaUrl = uploadRes.data.url
          }
      }

      const payload = {
        type: tab,
        scheduled_at: isScheduled ? scheduledAt.toISOString() : null,
        ...(tab === 'text' && { text: text.trim(), backgroundColor, font }),
        ...(tab !== 'text' && { mediaUrl: finalMediaUrl, caption: caption.trim() }),
      }

      const res = await api.post(`/whatsapp/status/${selectedAgent}`, payload)

      if (isScheduled) {
          toast.success('Statut WhatsApp programmé avec succès ! 📅')
      } else {
          toast.success('Statut WhatsApp publié avec succès ! 🚀')
      }

      // Reset form
      setText('')
      setMediaUrl('')
      setSelectedFile(null)
      setCaption('')
      setIsScheduled(false)
      setScheduledAt(null)

      loadHistoryData()
    } catch (error) {
      const msg = error.response?.data?.error || 'Erreur lors de l\\'envoi du statut'
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (e) => {
      const file = e.target.files[0]
      if (!file) return
      
      // Basic validation
      if (tab === 'image' && !file.type.startsWith('image/')) {
          toast.error("Veuillez sélectionner une image valide")
          return
      }
      if (tab === 'video' && !file.type.startsWith('video/')) {
          toast.error("Veuillez sélectionner une vidéo valide")
          return
      }
      
      setSelectedFile(file)
      setMediaUrl('') // clear URL if user uploads a file
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
                Publiez ou programmez des Stories WhatsApp (texte, image, vidéo)
              </p>
            </div>
          </div>
          <button
            onClick={() => { loadAgents(); loadHistoryData(); }}
            disabled={loadingAgents || loadingHistory}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 text-sm ${
              isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${(loadingAgents || loadingHistory) ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Info box */}
        <div className={`mt-5 flex items-start gap-3 p-3 rounded-xl border text-sm ${
          isDark ? 'bg-blue-500/5 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Les statuts sont envoyés à <code className="font-mono text-xs bg-black/20 px-1 py-0.5 rounded">status@broadcast</code> et sont visibles par vos contacts pendant 24 h. <b>L'application utilise un CRON pour publier les statuts programmés automatiquement.</b></p>
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
                onClick={() => {
                    setTab(t.id)
                    setSelectedFile(null)
                    setMediaUrl('')
                }}
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
            <div className="card p-5 space-y-5">
              <div className="space-y-3">
                <label className={`block text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Média ({tab === 'image' ? 'Image' : 'Vidéo'}) *
                </label>
                
                {/* Upload or URL switcher */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Upload File */}
                    <div className="relative">
                        <input
                            type="file"
                            accept={tab === 'image' ? 'image/*' : 'video/*'}
                            id="statusUploadFile"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <label 
                            htmlFor="statusUploadFile"
                            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                selectedFile 
                                    ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500' 
                                    : (isDark ? 'border-white/10 hover:border-white/20 hover:bg-white/5' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50')
                            }`}
                        >
                            <UploadCloud className="w-8 h-8 mb-2 opacity-70" />
                            <span className="text-sm font-medium text-center">
                                {selectedFile ? selectedFile.name : `Importer une ${tab === 'image' ? 'image' : 'vidéo'}`}
                            </span>
                            {selectedFile && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setSelectedFile(null);
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </label>
                    </div>

                    {/* Or URL */}
                    <div className="flex flex-col justify-center space-y-2">
                        <span className={`text-xs text-center font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>— OU via URL —</span>
                        <input
                            type="url"
                            value={mediaUrl}
                            onChange={e => {
                                setMediaUrl(e.target.value)
                                setSelectedFile(null)
                            }}
                            className={`input-dark w-full py-4 px-4 rounded-xl text-sm ${selectedFile ? 'opacity-50' : ''}`}
                            placeholder={tab === 'image' ? 'https://example.com/img.jpg' : 'https://example.com/vid.mp4'}
                        />
                    </div>
                </div>
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

          {/* Scheduling switch */}
          <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isScheduled ? 'bg-primary-500/20 text-primary-400' : (isDark ? 'bg-space-800 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                          <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Programmer ce statut</p>
                          <p className={`text-[10px] font-medium uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Publier ultérieurement de façon automatique</p>
                      </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isScheduled} 
                        onChange={(e) => {
                            setIsScheduled(e.target.checked)
                            if (e.target.checked && !scheduledAt) {
                                // Default to +5 minutes from now if turning on and no date selected
                                const d = new Date()
                                d.setMinutes(d.getMinutes() + 5)
                                setScheduledAt(d)
                            }
                        }} 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-space-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {isScheduled && (
                  <div className="pt-4 border-t border-dashed border-gray-500/30 flex justify-end">
                      <DatePicker
                        selected={scheduledAt}
                        onChange={(date) => setScheduledAt(date)}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        timeCaption="Heure"
                        dateFormat="d MMMM yyyy  -  HH:mm"
                        locale="fr"
                        minDate={new Date()}
                        className="input-dark w-full sm:w-[300px] py-3 text-center !rounded-xl text-sm cursor-pointer border hover:border-primary-500/50 transition-colors"
                        placeholderText="Sélectionner la date..."
                        popperPlacement="bottom-end"
                      />
                  </div>
              )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || agents.length === 0 || !selectedAgent}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-base transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                isScheduled
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-500/25'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-500/25'
            }`}
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isScheduled ? 'Programmation en cours…' : 'Publication en cours…'}
              </>
            ) : (
              <>
                {isScheduled ? <Calendar className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
                {isScheduled ? 'Programmer le statut' : 'Publier le statut'}
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
              selectedFile={selectedFile}
              caption={caption}
              isDark={isDark}
            />
          </div>

          {/* History */}
          <div className="card p-0 overflow-hidden flex flex-col h-[400px]">
              
            {/* Tabs for pending vs sent */}
            <div className={`flex border-b border-white/5 bg-black/10`}>
                <button 
                  onClick={() => setHistoryTab('pending')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                      historyTab === 'pending' 
                        ? (isDark ? 'text-primary-400 border-b-2 border-primary-500' : 'text-primary-600 border-b-2 border-primary-500') 
                        : 'text-gray-500 hover:bg-black/5'
                  }`}
                >
                    <Clock className="w-3.5 h-3.5" />
                    En attente ({pending.length})
                </button>
                <button 
                  onClick={() => setHistoryTab('sent')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                      historyTab === 'sent' 
                        ? (isDark ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-emerald-600 border-b-2 border-emerald-500') 
                        : 'text-gray-500 hover:bg-black/5'
                  }`}
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Historique
                </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                {loadingHistory ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                        <p className="text-xs">Chargement...</p>
                    </div>
                ) : historyTab === 'pending' ? (
                    pending.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
                            <Calendar className="w-8 h-8 opacity-50" />
                            <p className="text-xs text-center px-4">Aucun statut programmé en file d'attente</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pending.map(entry => (
                                <div key={entry.id} className={`p-3 rounded-xl border relative group ${isDark ? 'bg-space-800/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex gap-3 items-start">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/20`}>
                                            {entry.type === 'text' ? <Type className="w-4 h-4 text-blue-400" /> : entry.type === 'image' ? <Image className="w-4 h-4 text-blue-400" /> : <Video className="w-4 h-4 text-blue-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className={`text-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                {entry.type === 'text' ? entry.content : 'Média'}
                                            </p>
                                            <p className={`text-[10px] mt-1 font-semibold ${isDark ? 'text-yellow-400/80' : 'text-yellow-600'}`}>
                                                Programmé pour : {new Date(entry.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteScheduled(entry.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                        title="Annuler ce statut"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    history.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
                            <CheckCircle2 className="w-8 h-8 opacity-50" />
                            <p className="text-xs text-center px-4">Aucun statut envoyé précédemment</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map(entry => (
                                <div key={entry.id} className={`p-3 rounded-xl border ${isDark ? 'bg-space-800/30 border-white/5' : 'bg-white border-gray-100'}`}>
                                    <div className="flex gap-3 items-start">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                            entry.status === 'failed' ? 'bg-red-500/20' : 'bg-emerald-500/20'
                                        }`}>
                                            {entry.status === 'failed' ? (
                                                <AlertCircle className="w-4 h-4 text-red-400" />
                                            ) : (
                                                entry.type === 'text' ? <Type className="w-4 h-4 text-emerald-400" /> : entry.type === 'image' ? <Image className="w-4 h-4 text-emerald-400" /> : <Video className="w-4 h-4 text-emerald-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {entry.type === 'text' ? entry.content : 'Média'}
                                            </p>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    Le {new Date(entry.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <span className={`text-[9px] font-black uppercase ${entry.status === 'failed' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {entry.status === 'failed' ? 'Échoué' : 'Publié'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
