import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Plus,
  Trash2,
  Settings,
  MessageSquare,
  HelpCircle,
  GitBranch,
  Clock,
  Bot,
  User,
  X,
  Loader2,
  Copy,
  Zap
} from 'lucide-react'

const NODE_ICONS = {
  start: Zap,
  message: MessageSquare,
  question: HelpCircle,
  condition: GitBranch,
  action: Settings,
  delay: Clock,
  ai_response: Bot,
  human: User,
  end: X
}

const NODE_COLORS = {
  start: 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
  message: 'bg-blue-500/20 border-blue-500 text-blue-400',
  question: 'bg-violet-500/20 border-violet-500 text-violet-400',
  condition: 'bg-amber-500/20 border-amber-500 text-amber-400',
  action: 'bg-cyan-500/20 border-cyan-500 text-cyan-400',
  delay: 'bg-gray-500/20 border-gray-500 text-gray-400',
  ai_response: 'bg-pink-500/20 border-pink-500 text-pink-400',
  human: 'bg-orange-500/20 border-orange-500 text-orange-400',
  end: 'bg-red-500/20 border-red-500 text-red-400'
}

const NODE_LABELS = {
  start: 'Début',
  message: 'Message',
  question: 'Question',
  condition: 'Condition',
  action: 'Action',
  delay: 'Délai',
  ai_response: 'Réponse IA',
  human: 'Transfert humain',
  end: 'Fin'
}

export default function FlowBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const canvasRef = useRef(null)

  const [flow, setFlow] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [connecting, setConnecting] = useState(null)
  const [showNodePanel, setShowNodePanel] = useState(false)

  useEffect(() => {
    if (id) {
      loadFlow()
    }
  }, [id])

  const loadFlow = async () => {
    try {
      const res = await api.get(`/flows/${id}`)
      setFlow(res.data.flow)
      setNodes(res.data.flow.nodes || [])
      setEdges(res.data.flow.edges || [])
    } catch (error) {
      console.error('Error loading flow:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/flows/${id}`, {
        nodes,
        edges
      })
      toast.success('Flow enregistré')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    try {
      const res = await api.post(`/flows/${id}/toggle`)
      setFlow(prev => ({ ...prev, is_active: res.data.is_active }))
      toast.success(res.data.is_active ? 'Flow activé' : 'Flow désactivé')
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const addNode = (type) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 250, y: (nodes.length + 1) * 120 },
      data: {
        label: NODE_LABELS[type],
        message: type === 'message' ? 'Votre message ici...' : undefined,
        question: type === 'question' ? 'Votre question ici...' : undefined,
        options: type === 'question' ? ['Option 1', 'Option 2'] : undefined,
        delay: type === 'delay' ? 5 : undefined
      }
    }
    setNodes(prev => [...prev, newNode])
    setSelectedNode(newNode)
    setShowNodePanel(false)
  }

  const updateNode = (nodeId, updates) => {
    setNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
    ))
    if (selectedNode?.id === nodeId) {
      setSelectedNode(prev => ({ ...prev, data: { ...prev.data, ...updates } }))
    }
  }

  const deleteNode = (nodeId) => {
    if (nodes.find(n => n.id === nodeId)?.type === 'start') {
      toast.error('Impossible de supprimer le noeud de départ')
      return
    }
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
    setSelectedNode(null)
  }

  const addEdge = (source, target) => {
    if (source === target) return
    if (edges.some(e => e.source === source && e.target === target)) return
    
    setEdges(prev => [...prev, {
      id: `e-${source}-${target}`,
      source,
      target
    }])
  }

  const deleteEdge = (edgeId) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId))
  }

  const handleNodeDrag = (nodeId, e) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - 75
    const y = e.clientY - rect.top - 30

    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, position: { x: Math.max(0, x), y: Math.max(0, y) } } : n
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button 
            onClick={() => navigate('/dashboard/flows')}
            className={`p-2 rounded-lg flex-shrink-0 touch-target ${isDark ? 'hover:bg-space-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className={`font-display font-bold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {flow?.name}
            </h1>
            <p className={`text-sm truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {nodes.length} noeuds · {edges.length} connexions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggle}
            className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 touch-target ${
              flow?.is_active
                ? 'bg-emerald-500/20 text-emerald-400'
                : isDark ? 'bg-space-800 text-gray-400' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {flow?.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {flow?.is_active ? 'Actif' : 'Inactif'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center justify-center gap-2 touch-target"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <div className={`w-16 border-r flex flex-col items-center py-4 gap-2 ${
          isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'
        }`}>
          <button
            onClick={() => setShowNodePanel(!showNodePanel)}
            className={`p-3 rounded-xl transition-colors ${
              showNodePanel
                ? 'bg-gold-400 text-space-900'
                : isDark ? 'bg-space-800 hover:bg-space-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            title="Ajouter un noeud"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Node Panel */}
        {showNodePanel && (
          <div className={`w-64 border-r p-4 ${
            isDark ? 'bg-space-800 border-space-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <h3 className={`font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Ajouter un noeud
            </h3>
            <div className="space-y-2">
              {Object.entries(NODE_LABELS).filter(([type]) => type !== 'start').map(([type, label]) => {
                const Icon = NODE_ICONS[type]
                return (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 transition-all hover:scale-105 ${NODE_COLORS[type]}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div 
          ref={canvasRef}
          className={`flex-1 relative overflow-auto ${isDark ? 'bg-space-950' : 'bg-gray-100'}`}
          style={{
            backgroundImage: isDark 
              ? 'radial-gradient(circle, #374151 1px, transparent 1px)'
              : 'radial-gradient(circle, #D1D5DB 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* SVG for edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '100%', minWidth: '100%' }}>
            {edges.map(edge => {
              const sourceNode = nodes.find(n => n.id === edge.source)
              const targetNode = nodes.find(n => n.id === edge.target)
              if (!sourceNode || !targetNode) return null

              const x1 = sourceNode.position.x + 75
              const y1 = sourceNode.position.y + 60
              const x2 = targetNode.position.x + 75
              const y2 = targetNode.position.y

              return (
                <g key={edge.id}>
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                    stroke={isDark ? '#6B7280' : '#9CA3AF'}
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              )
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={isDark ? '#6B7280' : '#9CA3AF'}
                />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const Icon = NODE_ICONS[node.type]
            const isSelected = selectedNode?.id === node.id
            
            return (
              <div
                key={node.id}
                className={`absolute w-40 rounded-xl border-2 cursor-move transition-all ${NODE_COLORS[node.type]} ${
                  isSelected ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-space-950' : ''
                }`}
                style={{
                  left: node.position.x,
                  top: node.position.y
                }}
                onClick={() => setSelectedNode(node)}
                draggable
                onDrag={(e) => {
                  if (e.clientX > 0 && e.clientY > 0) {
                    handleNodeDrag(node.id, e)
                  }
                }}
              >
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{node.data.label}</span>
                  </div>
                  {node.type === 'message' && node.data.message && (
                    <p className="text-xs opacity-70 truncate">{node.data.message}</p>
                  )}
                  {node.type === 'question' && node.data.question && (
                    <p className="text-xs opacity-70 truncate">{node.data.question}</p>
                  )}
                  {node.type === 'delay' && (
                    <p className="text-xs opacity-70">{node.data.delay}s</p>
                  )}
                </div>

                {/* Connection point */}
                {node.type !== 'end' && (
                  <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-current cursor-crosshair"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (connecting) {
                        addEdge(connecting, node.id)
                        setConnecting(null)
                      } else {
                        setConnecting(node.id)
                      }
                    }}
                  />
                )}
                {node.type !== 'start' && (
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-current cursor-crosshair"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (connecting) {
                        addEdge(connecting, node.id)
                        setConnecting(null)
                      }
                    }}
                  />
                )}
              </div>
            )
          })}

          {connecting && (
            <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg ${
              isDark ? 'bg-space-800 text-gray-300' : 'bg-white text-gray-700'
            } shadow-lg`}>
              Cliquez sur un autre noeud pour connecter, ou
              <button 
                onClick={() => setConnecting(null)}
                className="ml-2 text-red-400 hover:text-red-300"
              >
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className={`w-80 border-l p-4 overflow-y-auto ${
            isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                Propriétés
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className={isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Label
                </label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
                  }`}
                />
              </div>

              {selectedNode.type === 'message' && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Message
                  </label>
                  <textarea
                    value={selectedNode.data.message || ''}
                    onChange={(e) => updateNode(selectedNode.id, { message: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border h-24 ${
                      isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
                    }`}
                  />
                </div>
              )}

              {selectedNode.type === 'question' && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Question
                    </label>
                    <textarea
                      value={selectedNode.data.question || ''}
                      onChange={(e) => updateNode(selectedNode.id, { question: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border h-20 ${
                        isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Options de réponse
                    </label>
                    {(selectedNode.data.options || []).map((opt, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(selectedNode.data.options || [])]
                            newOpts[i] = e.target.value
                            updateNode(selectedNode.id, { options: newOpts })
                          }}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                            isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
                          }`}
                        />
                        <button
                          onClick={() => {
                            const newOpts = (selectedNode.data.options || []).filter((_, idx) => idx !== i)
                            updateNode(selectedNode.id, { options: newOpts })
                          }}
                          className="p-2 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newOpts = [...(selectedNode.data.options || []), 'Nouvelle option']
                        updateNode(selectedNode.id, { options: newOpts })
                      }}
                      className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter une option
                    </button>
                  </div>
                </>
              )}

              {selectedNode.type === 'delay' && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Délai (secondes)
                  </label>
                  <input
                    type="number"
                    value={selectedNode.data.delay || 5}
                    onChange={(e) => updateNode(selectedNode.id, { delay: parseInt(e.target.value) || 5 })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
                    }`}
                    min="1"
                  />
                </div>
              )}

              {selectedNode.type !== 'start' && (
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="w-full mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer ce noeud
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
