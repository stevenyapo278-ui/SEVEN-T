import { BookOpen, MessagesSquare, Settings, ShieldCheck, Mail, PlayCircle, ExternalLink, HelpCircle, FileText, Zap, ShoppingCart, Workflow, CreditCard, ChevronRight, LifeBuoy, Bot, Megaphone, Package, MessageSquare, Bell, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTheme } from '../contexts/ThemeContext'

export default function Help() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  usePageTitle(t('nav.help', 'Aide & Support'))

  const faqs = [
    {
      q: "Comment l'IA trouve-t-elle les réponses pour mes clients ?",
      a: "L'IA utilise 3 sources : le 'System Prompt' (Instructions système) défini dans les paramètres de l'agent, le catalogue Produits (pour les agents e-commerce), et les documents/sites web ajoutés dans sa Base de Connaissances."
    },
    {
      q: "Comment fonctionne le type d'agent 'E-commerce' ?",
      a: "En paramétrant un agent en 'E-commerce', il acquiert la capacité de parcourir vos Produits. Lorsqu'un client choisit des articles, l'IA génère automatiquement une commande dans l'onglet 'Commandes'. Vous pouvez ensuite envoyer un lien de paiement manuel ou laisser l'IA le faire si configuré."
    },
    {
      q: "Qu'est-ce que le Flow Builder ?",
      a: "Le Flow Builder vous permet de créer des séquences de messages automatisées visuellement (sans IA complète), parfaites pour l'accueil, les menus à choix multiples, ou les campagnes marketing ciblées."
    },
    {
      q: "Puis-je reprendre la main sur une conversation gérée par l'IA ?",
      a: "Absolument. Allez dans 'Conversations', ouvrez le chat et envoyez un message. Si le transfert humain est configuré (via des mots-clés dans les paramètres de l'agent), l'IA se mettra automatiquement en pause."
    },
    {
      q: "Comment gérer les relances ou envois en masse ?",
      a: "Utilisez l'onglet 'Campagnes' et les 'Templates' approuvés par WhatsApp. Vous pouvez ainsi envoyer des messages promotionnels ou des alertes à une liste de contacts spécifiques."
    }
  ]

  const guides = [
    {
      title: "Configurer son agent E-commerce",
      icon: <ShoppingCart className="w-5 h-5 text-gold-400" />,
      desc: "Liez votre catalogue produits pour que l'IA détecte l'intention d'achat et crée des commandes.",
      href: "/dashboard/agents"
    },
    {
      title: "Gérer la Base de Connaissances",
      icon: <BookOpen className="w-5 h-5 text-blue-400" />,
      desc: "Importez PDF/URL/YouTube pour rendre votre agent expert sur votre business.",
      href: "/dashboard/knowledge"
    },
    {
      title: "Créer un flux automatisé (Flow Builder)",
      icon: <Workflow className="w-5 h-5 text-emerald-400" />,
      desc: "Dessinez des parcours conversationnels sans code avec des blocs visuels.",
      href: "/dashboard/flows"
    },
    {
      title: "Commandes et Paiements",
      icon: <CreditCard className="w-5 h-5 text-cyan-400" />,
      desc: "Validez les commandes détectées par l'IA et générez des liens de paiement.",
      href: "/dashboard/orders"
    }
  ]

  const quickLinks = [
    { title: "Tickets support", desc: "Créer une demande et suivre les réponses.", icon: <LifeBuoy className="w-5 h-5 text-blue-400" />, href: "/dashboard/tickets" },
    { title: "Conversations", desc: "Suivre les messages et reprendre la main.", icon: <MessageSquare className="w-5 h-5 text-emerald-400" />, href: "/dashboard/conversations" },
    { title: "Agents", desc: "Créer, configurer et connecter WhatsApp.", icon: <Bot className="w-5 h-5 text-violet-400" />, href: "/dashboard/agents" },
    { title: "Campagnes", desc: "Relances et envois en masse via templates.", icon: <Megaphone className="w-5 h-5 text-amber-400" />, href: "/dashboard/campaigns" },
    { title: "Produits", desc: "Catalogue (e‑commerce) pour commandes auto.", icon: <Package className="w-5 h-5 text-cyan-400" />, href: "/dashboard/products" },
    { title: "Notifications", desc: "Voir les alertes et événements récents.", icon: <Bell className="w-5 h-5 text-blue-300" />, href: "/dashboard/notifications" },
  ]

  const troubleshooting = [
    {
      title: "WhatsApp ne se connecte pas",
      items: [
        "Vérifie que ton téléphone a du réseau et que WhatsApp est à jour.",
        "Dans Agents → Outils WhatsApp, régénère le QR code puis rescannne.",
        "Évite d'avoir WhatsApp Web ouvert ailleurs (ça peut déconnecter).",
      ]
    },
    {
      title: "L’IA répond à côté",
      items: [
        "Vérifie le System Prompt (Agents → Paramètres) et rends-le plus précis.",
        "Ajoute/actualise ta Base de connaissances (PDF/URL) et supprime les sources obsolètes.",
        "Si e‑commerce: vérifie tes Produits (noms, prix, catégories).",
      ]
    },
    {
      title: "Je ne vois pas mes actions / stats",
      items: [
        "Vérifie ton plan et tes modules activés dans Paramètres.",
        "Recharge la page et vérifie les permissions si tu es un compte support.",
      ]
    },
  ]

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0 pb-12">
      {/* Header Hero */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url(${isDark ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"})` }}
          aria-hidden
        />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className="p-2 bg-gold-400/10 rounded-xl flex-shrink-0">
                  <HelpCircle className="w-6 h-6 text-gold-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Centre d'Aide & Support
                </h1>
              </div>
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Retrouvez toutes les ressources nécessaires pour tirer le meilleur parti de votre plateforme SEVEN T.
              </p>
            </div>
            <a
              href="mailto:support@seven-t.com"
              className="btn-primary whitespace-nowrap inline-flex items-center gap-2 flex-shrink-0"
            >
              <Mail className="w-4 h-4" />
              Contacter le support
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Guides */}
        <div className="lg:col-span-2 space-y-6">
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
            <h2 className={`text-xl font-display font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              <Sparkles className="w-5 h-5 text-gold-400" />
              Accès rapide
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickLinks.map((q, idx) => (
                <Link
                  key={idx}
                  to={q.href}
                  className={`p-4 rounded-xl border transition-all group ${isDark ? 'border-space-700 bg-space-800/30 hover:bg-space-800 hover:border-space-600' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${isDark ? 'bg-space-900' : 'bg-white'}`}>
                      {q.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`font-semibold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{q.title}</h3>
                      <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{q.desc}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
            <h2 className={`text-xl font-display font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              <PlayCircle className="w-5 h-5 text-blue-400" />
              Guides rapides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guides.map((guide, idx) => (
                <Link key={idx} to={guide.href} className={`p-4 rounded-xl border transition-all cursor-pointer group ${isDark ? 'border-space-700 bg-space-800/50 hover:bg-space-800 hover:border-space-600' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${isDark ? 'bg-space-900' : 'bg-white'}`}>
                      {guide.icon}
                    </div>
                    <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{guide.title}</h3>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{guide.desc}</p>
                  <div className="mt-3 flex justify-end">
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
            <h2 className={`text-xl font-display font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Dépannage rapide
            </h2>
            <div className="space-y-4">
              {troubleshooting.map((b, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${isDark ? 'border-space-700 bg-space-800/30' : 'border-gray-100 bg-gray-50'}`}>
                  <h3 className={`font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{b.title}</h3>
                  <ul className={`space-y-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {b.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-400 font-bold mt-[2px]">•</span>
                        <span className="flex-1">{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
            <h2 className={`text-xl font-display font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              <MessagesSquare className="w-5 h-5 text-gold-400" />
              Foire Aux Questions (FAQ)
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${isDark ? 'border-space-700 bg-space-800/30' : 'border-gray-100 bg-gray-50'}`}>
                  <h3 className={`font-medium mb-2 flex items-start gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    <span className="text-blue-400 font-bold">Q.</span>
                    {faq.q}
                  </h3>
                  <p className={`text-sm flex items-start gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className="text-emerald-400 font-bold">R.</span>
                    <span className="flex-1">{faq.a}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col - Docs & Resources */}
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
            <h2 className={`text-xl font-display font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              <LifeBuoy className="w-5 h-5 text-blue-400" />
              Support & Tickets
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Un bug, une question, une demande d’amélioration ? Crée un ticket pour garder l’historique et suivre la résolution.
            </p>
            <div className="space-y-2">
              <Link to="/dashboard/tickets" className="btn-primary w-full inline-flex items-center justify-center gap-2">
                <LifeBuoy className="w-4 h-4" />
                Ouvrir mes tickets
              </Link>
              <a href="mailto:support@seven-t.com" className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${isDark ? 'border-space-700 bg-space-950/40 text-gray-200 hover:bg-white/5' : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'}`}>
                <Mail className="w-4 h-4" />
                Email support
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Astuce: mets un maximum de détails (captures, étapes, résultat attendu) pour accélérer la résolution.
            </p>
          </div>

        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
            <h2 className={`text-xl font-display font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              <BookOpen className="w-5 h-5 text-cyan-400" />
              Ressources
            </h2>
            <div className="space-y-3">
              <Link to="/dashboard/docs" className={`flex items-center justify-between p-3 rounded-xl transition-colors border border-transparent group ${isDark ? 'hover:bg-space-800 hover:border-space-700' : 'hover:bg-gray-50 hover:border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Documentation technique</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </Link>
              <Link to="/dashboard/settings" className={`flex items-center justify-between p-3 rounded-xl transition-colors border border-transparent group ${isDark ? 'hover:bg-space-800 hover:border-space-700' : 'hover:bg-gray-50 hover:border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-400 group-hover:text-gold-400 transition-colors" />
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Paramètres & préférences</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </Link>
              <a href="https://youtu.be/SevenT" target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between p-3 rounded-xl transition-colors border border-transparent group ${isDark ? 'hover:bg-space-800 hover:border-space-700' : 'hover:bg-gray-50 hover:border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <PlayCircle className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Tutoriels YouTube</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
              <a href="https://discord.gg/sevent" target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between p-3 rounded-xl transition-colors border border-transparent group ${isDark ? 'hover:bg-space-800 hover:border-space-700' : 'hover:bg-gray-50 hover:border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <MessagesSquare className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                  <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Communauté Discord</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-b from-space-800 to-space-900 border-gold-400/20">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h2 className="text-lg font-display font-bold text-gray-100">Statut du système</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Tous les systèmes sont opérationnels. Les modèles IA et les serveurs WhatsApp répondent de manière optimale.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">WhatsApp API</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  En ligne
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">OpenAI Services</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  En ligne
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
