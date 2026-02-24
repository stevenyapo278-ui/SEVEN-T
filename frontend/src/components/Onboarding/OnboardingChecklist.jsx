import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  CheckCircle, 
  Circle, 
  Bot, 
  MessageSquare, 
  Package, 
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Rocket
} from 'lucide-react'

const CHECKLIST_ITEMS = [
  {
    id: 'create_agent',
    titleKey: 'onboarding.checklistCreateAgent',
    descKey: 'onboarding.checklistCreateAgentDesc',
    icon: Bot,
    href: '/dashboard/agents?create=true',
    check: (data) => data.agentsCount > 0
  },
  {
    id: 'connect_whatsapp',
    titleKey: 'onboarding.checklistWhatsApp',
    descKey: 'onboarding.checklistWhatsAppDesc',
    icon: MessageSquare,
    href: '/dashboard/agents',
    check: (data) => data.whatsappConnected > 0
  },
  {
    id: 'add_product',
    titleKey: 'onboarding.checklistAddProduct',
    descKey: 'onboarding.checklistAddProductDesc',
    icon: Package,
    href: '/dashboard/products?create=true',
    check: (data) => data.productsCount > 0,
    optional: true
  },
  {
    id: 'add_knowledge',
    titleKey: 'onboarding.checklistAddKnowledge',
    descKey: 'onboarding.checklistAddKnowledgeDesc',
    icon: BookOpen,
    href: '/dashboard/knowledge',
    check: (data) => data.knowledgeCount > 0,
    optional: true
  },
  {
    id: 'test_agent',
    titleKey: 'onboarding.checklistTestAgent',
    descKey: 'onboarding.checklistTestAgentDesc',
    icon: Sparkles,
    href: '/dashboard/conversations',
    check: (data) => data.messagesCount > 0
  }
]

export default function OnboardingChecklist({ data, onDismiss }) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  // Check localStorage for dismissed state
  useEffect(() => {
    const isDismissed = localStorage.getItem('onboarding_checklist_dismissed')
    if (isDismissed === 'true') {
      setDismissed(true)
    }
  }, [])

  if (!data || dismissed) return null

  // Required = non-optional items (create agent, connect WhatsApp, test agent)
  const requiredItems = CHECKLIST_ITEMS.filter(item => !item.optional)
  const totalItems = CHECKLIST_ITEMS.length
  const completedItems = CHECKLIST_ITEMS.filter(item => item.check(data))
  const completedCount = completedItems.length
  const requiredCompleted = requiredItems.every(item => item.check(data))
  const progress = Math.round((completedCount / totalItems) * 100)
  
  // SVG circle calculation
  const radius = 16
  const circumference = 2 * Math.PI * radius // ≈ 100.53
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Disappear when all required actions are done (or all items including optional)
  if (requiredCompleted || completedCount === totalItems) {
    return null
  }

  const handleDismiss = () => {
    localStorage.setItem('onboarding_checklist_dismissed', 'true')
    setDismissed(true)
    if (onDismiss) onDismiss()
  }

  return (
    <div className="card overflow-hidden mb-6 border-gold-400/30">
      {/* Header */}
      <div 
        className="p-4 bg-gradient-to-r from-gold-400/10 to-blue-500/10 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-blue-500 rounded-xl flex items-center justify-center">
              <Rocket className="w-5 h-5 icon-on-gradient" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-100">{t('onboarding.checklistTitle')}</h3>
              <p className="text-sm text-gray-400">
                {t('onboarding.checklistSteps', { count: completedCount, total: totalItems })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress circle */}
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-space-700"
                />
                <circle
                  cx="20"
                  cy="20"
                  r={radius}
                  stroke="url(#progress-gradient)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
                <defs>
                  <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F5D47A" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-100">
                {progress}%
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Checklist */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {CHECKLIST_ITEMS.map((item) => {
            const isComplete = item.check(data)
            const ItemIcon = item.icon
            
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                  isComplete 
                    ? 'bg-emerald-500/10 border border-emerald-500/20' 
                    : 'bg-space-800 border border-space-700 hover:border-gold-400/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isComplete 
                    ? 'bg-emerald-500/20' 
                    : 'bg-space-700'
                }`}>
                  <ItemIcon className={`w-5 h-5 ${
                    isComplete ? 'text-emerald-400' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${
                      isComplete ? 'text-emerald-400' : 'text-gray-100'
                    }`}>
                      {t(item.titleKey)}
                    </h4>
                    {item.optional && (
                      <span className="px-1.5 py-0.5 text-xs bg-space-700 text-gray-400 rounded">
                        {t('onboarding.optional')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{t(item.descKey)}</p>
                </div>
                {isComplete ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-600 flex-shrink-0" />
                )}
              </Link>
            )
          })}

          {/* Dismiss button - show after 60% completion */}
          {completedCount >= 3 && (
            <button
              onClick={handleDismiss}
              className="w-full mt-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              {t('onboarding.hideGuide')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
