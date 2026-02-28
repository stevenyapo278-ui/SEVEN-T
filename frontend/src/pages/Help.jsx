import { BookOpen, MessagesSquare, Settings, ShieldCheck, Mail, PlayCircle, ExternalLink, HelpCircle, FileText, Zap, ShoppingCart, Workflow, CreditCard, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Help() {
  const { t } = useTranslation()
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
      desc: "Apprenez à lier votre catalogue produits pour que l'IA puisse détecter les intentions d'achat et créer des commandes."
    },
    {
      title: "Gérer la Base de Connaissances",
      icon: <BookOpen className="w-5 h-5 text-blue-400" />,
      desc: "Découvrez comment importer des PDF, des URL YouTube ou des sites Web pour rendre votre agent expert sur votre entreprise."
    },
    {
      title: "Créer un flux automatisé (Flow Builder)",
      icon: <Workflow className="w-5 h-5 text-emerald-400" />,
      desc: "Un guide pas-à-pas pour dessiner le parcours conversationnel de vos clients avec des blocs visuels."
    },
    {
      title: "Commandes et Paiements",
      icon: <CreditCard className="w-5 h-5 text-cyan-400" />,
      desc: "Comment valider les commandes détectées par l'IA et générer des liens de paiement sécurisés."
    }
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="card p-6 sm:p-8 bg-gradient-to-br from-space-800 to-space-900 border-space-700">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-gold-400/20 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-8 h-8 text-gold-400" />
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-100 mb-2">
              Centre d'Aide & Support
            </h1>
            <p className="text-gray-400 max-w-2xl">
              Retrouvez toutes les ressources nécessaires pour tirer le meilleur parti de votre plateforme SEVEN T. Parcourez nos guides ou contactez notre équipe.
            </p>
          </div>
          <a
            href="mailto:support@seven-t.com"
            className="btn-primary whitespace-nowrap inline-flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Contacter le support
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Guides */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-display font-bold text-gray-100 mb-6 flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-blue-400" />
              Guides rapides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guides.map((guide, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-space-700 bg-space-800/50 hover:bg-space-800 hover:border-space-600 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-space-900 rounded-lg group-hover:scale-110 transition-transform">
                      {guide.icon}
                    </div>
                    <h3 className="font-semibold text-gray-100">{guide.title}</h3>
                  </div>
                  <p className="text-sm text-gray-400">{guide.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-display font-bold text-gray-100 mb-6 flex items-center gap-2">
              <MessagesSquare className="w-5 h-5 text-gold-400" />
              Foire Aux Questions (FAQ)
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-space-700 bg-space-800/30">
                  <h3 className="font-medium text-gray-100 mb-2 flex items-start gap-2">
                    <span className="text-blue-400 font-bold">Q.</span>
                    {faq.q}
                  </h3>
                  <p className="text-gray-400 text-sm flex items-start gap-2">
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
          <div className="card p-6">
            <h2 className="text-xl font-display font-bold text-gray-100 mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              Ressources
            </h2>
            <div className="space-y-3">
              <Link to="/dashboard/docs" className="flex items-center justify-between p-3 rounded-xl hover:bg-space-800 transition-colors border border-transparent hover:border-space-700 group">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                  <span className="font-medium text-gray-200">Documentation technique</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </Link>
              <a href="https://youtu.be/SevenT" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl hover:bg-space-800 transition-colors border border-transparent hover:border-space-700 group">
                <div className="flex items-center gap-3">
                  <PlayCircle className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
                  <span className="font-medium text-gray-200">Tutoriels YouTube</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
              <a href="https://discord.gg/sevent" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl hover:bg-space-800 transition-colors border border-transparent hover:border-space-700 group">
                <div className="flex items-center gap-3">
                  <MessagesSquare className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                  <span className="font-medium text-gray-200">Communauté Discord</span>
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
