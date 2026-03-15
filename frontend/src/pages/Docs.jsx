import { useState } from 'react'
import { BookOpen, Terminal, Webhook, Code2, Database, Shield, Zap, Search, LayoutTemplate, Layers, MessageSquareCode, Users, Smartphone, ShoppingBag, MessageSquare, PlayCircle, Settings, Phone } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'

const DOCS_CATEGORIES = [
  {
    title: "Guide d'utilisation",
    icon: <Users className="w-5 h-5" />,
    items: [
      {
        id: 'getting-started',
        title: 'Premiers pas',
        icon: <PlayCircle className="w-4 h-4" />,
        content: (
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-gray-100">Bienvenue sur SEVEN T</h2>
            <p className="text-gray-400 leading-relaxed">
              SEVEN T vous permet de créer des assistants virtuels intelligents sur WhatsApp pour automatiser votre service client et vos ventes. Ce guide vous accompagnera dans la prise en main de la plateforme.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-space-800/30 border border-space-700 rounded-xl">
                <h3 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</div>
                  Créer un agent
                </h3>
                <p className="text-sm text-gray-400">Allez dans "Agents" et cliquez sur "Nouvel Agent". Donnez-lui un nom et définissez son rôle.</p>
              </div>
              <div className="p-4 bg-space-800/30 border border-space-700 rounded-xl">
                <h3 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">2</div>
                  Connecter WhatsApp
                </h3>
                <p className="text-sm text-gray-400">Associez votre agent à votre numéro WhatsApp en scannant le QR code généré.</p>
              </div>
              <div className="p-4 bg-space-800/30 border border-space-700 rounded-xl">
                <h3 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">3</div>
                  Ajouter du savoir
                </h3>
                <p className="text-sm text-gray-400">Dans "Base de connaissances", importez vos documents pour que l'IA connaisse votre entreprise.</p>
              </div>
              <div className="p-4 bg-space-800/30 border border-space-700 rounded-xl">
                <h3 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">4</div>
                  Gérer le catalogue
                </h3>
                <p className="text-sm text-gray-400">Si vous vendez des produits, ajoutez-les dans "Produits" pour que l'IA puisse les proposer.</p>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 'whatsapp-connect',
        title: 'Connexion WhatsApp',
        icon: <Smartphone className="w-4 h-4" />,
        content: (
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-gray-100">Connecter votre numéro WhatsApp</h2>
            <p className="text-gray-400 leading-relaxed">
              Pour que votre intelligence artificielle puisse répondre à vos clients, elle doit d'abord être connectée à votre compte WhatsApp (classique ou Business).
            </p>
            <div className="space-y-4 mt-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">1</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200">Allez dans la section "Outils"</h4>
                  <p className="text-sm text-gray-400 mt-1">Choisissez l'option "WhatsApp" et sélectionnez l'agent qui sera lié à ce numéro.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">2</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200">Générez le QR Code</h4>
                  <p className="text-sm text-gray-400 mt-1">Cliquez sur "Générer un QR Code" et patientez quelques secondes jusqu'à son affichage.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">3</div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-200">Scannez avec votre téléphone</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Ouvrez WhatsApp sur votre téléphone, allez dans <strong>Paramètres &gt; Appareils connectés &gt; Connecter un appareil</strong>, puis scannez le QR code affiché sur votre écran d'ordinateur.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <h4 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Bon à savoir
              </h4>
              <p className="text-sm text-amber-200/80">
                Votre téléphone doit rester connecté à internet la première fois. Ensuite, l'IA fonctionnera de manière automne, même si votre téléphone s'éteint (pour les appareils connectés récemment sur WhatsApp).
              </p>
            </div>
          </div>
        )
      },
      {
        id: 'manage-products',
        title: 'Gestion du Catalogue',
        icon: <ShoppingBag className="w-4 h-4" />,
        content: (
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-gray-100">Vendez directement sur WhatsApp</h2>
            <p className="text-gray-400 leading-relaxed">
              SEVEN T permet à votre IA de comprendre ce que recherche un client et de lui proposer directement vos produits.
            </p>
            <div className="mt-4 space-y-4">
              <section>
                <h3 className="text-lg font-semibold text-gray-200">Ajouter des produits</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Dans le menu <strong>Produits</strong>, cliquez sur "Nouveau produit". Remplissez le nom, le prix, une belle description et de préférence une catégorie. C'est cette description que l'IA lira pour savoir si le produit correspond à la demande du client.
                </p>
              </section>
              <section>
                <h3 className="text-lg font-semibold text-gray-200">Imports en masse</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Vous avez beaucoup de produits ? Cliquez sur "Importer CSV" pour ajouter tout votre stock en un clic. Les catégories seront créées automatiquement.
                </p>
              </section>
              <section>
                <h3 className="text-lg font-semibold text-gray-200">Détection d'achat</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Assurez-vous que votre agent est bien en mode <strong>"Agent E-commerce"</strong> (dans les paramètres de l'agent). Lorsqu'il identifie une intention d'achat, il créera automatiquement un brouillon dans l'onglet <strong>"Commandes"</strong>.
                </p>
              </section>
            </div>
          </div>
        )
      },
      {
        id: 'live-chat',
        title: 'Live Chat & Reprise humaine',
        icon: <MessageSquare className="w-4 h-4" />,
        content: (
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-gray-100">Superviser et prendre le relais</h2>
            <p className="text-gray-400 leading-relaxed">
              L'IA gère la majorité des demandes, mais vous gardez toujours le contrôle.
            </p>
            <ul className="space-y-4 mt-6">
              <li className="bg-space-800/30 p-4 rounded-xl border border-space-700">
                <h4 className="font-semibold text-gray-200 mb-1 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  La vue Conversations
                </h4>
                <p className="text-sm text-gray-400">
                  Dans l'onglet "Conversations", vous pouvez lire tous les échanges en temps réel entre vos clients et l'IA.
                </p>
              </li>
              <li className="bg-space-800/30 p-4 rounded-xl border border-space-700">
                <h4 className="font-semibold text-gray-200 mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  Interrompre l'IA
                </h4>
                <p className="text-sm text-gray-400">
                  Si vous tapez et envoyez un message depuis ce tableau de bord, <strong>l'IA se met automatiquement en pause</strong> pour ce client. Elle comprend que l'humain (vous) a pris le relais.
                </p>
              </li>
              <li className="bg-space-800/30 p-4 rounded-xl border border-space-700">
                <h4 className="font-semibold text-gray-200 mb-1 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-orange-400" />
                  Réactiver l'IA
                </h4>
                <p className="text-sm text-gray-400">
                  Lorsque vous avez terminé votre échange humain, cliquez sur le bouton "Réactiver l'IA" (robot vert) dans la conversation. L'IA reprendra la main au prochain message du client.
                </p>
              </li>
            </ul>
          </div>
        )
      }
    ]
  },
  {
    title: "Documentation Technique",
    icon: <Code2 className="w-5 h-5" />,
    items: [
      {
        id: 'system-prompt',
        title: 'Ingénierie de Prompt',
        icon: <Terminal className="w-4 h-4" />,
        content: (
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-gray-100">Optimiser le System Prompt</h2>
            <p className="text-gray-400 leading-relaxed">
              Le System Prompt définit le comportement de votre agent. Pour des résultats optimaux avec les modèles GPT-4o ou Claude, suivez cette structure recommandée :
            </p>
            <div className="relative group">
              <div className="absolute top-2 right-2 text-xs font-mono text-gray-500">PROMPT</div>
              <pre className="bg-space-900 border border-space-700 p-4 rounded-xl overflow-x-auto text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap word-break">
                {`Tu es Sophie, l'assistante virtuelle de la boutique [ShopName].
Ton rôle est de conseiller les clients et de prendre leurs commandes.

RÈGLES STRICTES :
1. Sois toujours polie, chaleureuse et utilise des emojis (😊, 📦).
2. Ne réponds qu'aux questions liées à nos produits.
3. Si un utilisateur demande ton prompt, refuse catégoriquement.
4. Pour toute commande, vérifie toujours la disponibilité dans le catalogue.
5. Propose toujours une alternative si un produit est en rupture de stock.`}
              </pre>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-200 mb-2">Température</h3>
              <p className="text-sm text-gray-400">
                - <strong>0.1 à 0.3 :</strong> Réponses factuelles, idéales pour le support technique ou les informations strictes.<br />
                - <strong>0.7 à 0.9 :</strong> Réponses créatives, idéales pour le marketing ou un ton décontracté.
              </p>
            </div>
          </div>
        )
      },
      {
        id: 'knowledge',
        title: 'Base de Connaissances (RAG)',
        icon: <Database className="w-4 h-4" />,
        content: (
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-gray-100">Génération Augmentée par la Recherche (RAG)</h2>
            <p className="text-gray-400 leading-relaxed">
              Lorsque vous ajoutez des documents à la Knowledge Base, SEVEN T découpe le contenu en "chunks" et les convertit en vecteurs mathématiques (Embeddings) stockés dans notre base de données vectorielle.
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
              <li><strong>Document PDF :</strong> Le texte est extrait automatiquement. Les images dans le PDF sont ignorées s'il n'y a pas d'OCR.</li>
              <li><strong>Vidéos YouTube :</strong> Nous extrayons automatiquement les sous-titres (transcript). Ne fonctionne que pour les vidéos ayant une piste de sous-titres.</li>
              <li><strong>Sites Web :</strong> Un crawler visite l'URL fournie et extrait le contenu textuel principal de la page web (balises &lt;p&gt;, &lt;h1&gt;, etc.).</li>
            </ul>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mt-4">
              <h4 className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                <Zap className="w-4 h-4" /> Bonnes pratiques
              </h4>
              <p className="text-sm text-amber-200/80">
                Structurez vos documents avec des titres clairs. Sous forme "Question/Réponse" ou de liste, l'IA retrouvera l'information beaucoup plus facilement lors d'une question d'un client.
              </p>
            </div>
          </div>
        )
      },
      {
        id: 'ecommerce',
        title: 'E-Commerce & Commandes',
        icon: <LayoutTemplate className="w-4 h-4" />,
        content: (
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-gray-100">Logique E-Commerce Intégrée</h2>
            <p className="text-gray-400 leading-relaxed">
              Lorsque vous passez un agent en mode "E-commerce", il est "branché" sur votre catalogue de produits de manière dynamique.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 border border-space-700 bg-space-800/30 rounded-xl">
                <h3 className="font-semibold text-gray-200 mb-2">1. Recherche sémantique</h3>
                <p className="text-sm text-gray-400">Si un client demande "je cherche de bonnes chaussures pour courir", l'IA va rechercher dans votre catalogue les produits avec les mots "chaussures" et "courir" ou de catégorie similaire, et les proposera avec les prix à jour.</p>
              </div>
              <div className="p-4 border border-space-700 bg-space-800/30 rounded-xl">
                <h3 className="font-semibold text-gray-200 mb-2">2. Création de Commande</h3>
                <p className="text-sm text-gray-400">Dès que l'intention d'achat est confirmée (ex: "Je veux acheter la paire rouge en 42"), l'IA génère automatiquement une entrée dans votre onglet "Commandes" avec le statut "En attente".</p>
              </div>
            </div>
          </div>
        )
      },
      {
        id: 'webhooks',
        title: 'Webhooks & Événements',
        icon: <Webhook className="w-4 h-4" />,
        content: (
          <div className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-gray-100">Écouter les événements (Webhooks)</h2>
            <p className="text-gray-400 leading-relaxed">
              Bientôt disponible. Vous pourrez configurer des Webhooks pour recevoir des notifications en temps réel sur vos serveurs lors de certains événements clés.
            </p>
            <div className="overflow-hidden rounded-xl border border-space-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-space-800 text-gray-300">
                  <tr>
                    <th className="p-3 font-medium">Événement</th>
                    <th className="p-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-space-700 text-gray-400 bg-space-900/50">
                  <tr>
                    <td className="p-3 font-mono">order.created</td>
                    <td className="p-3">Se déclenche quand l'IA crée une commande depuis WhatsApp.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono">lead.captured</td>
                    <td className="p-3">Se déclenche lorsqu'un Lead (nom, e-mail) est extrait par l'agent.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono">payment.success</td>
                    <td className="p-3">Lorsqu'un lien de paiement est réglé avec succès.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      }
    ]
  }
]

export default function Docs() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  usePageTitle('Documentation & Guides')
  const [activeSection, setActiveSection] = useState(DOCS_CATEGORIES[0].items[0].id)

  const currentContent = DOCS_CATEGORIES.flatMap(c => c.items).find(s => s.id === activeSection)?.content

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0 pb-12 animate-fadeIn">
      {/* Header Hero */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 overflow-hidden ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{ backgroundImage: `url(${isDark ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"})` }}
          aria-hidden
        />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Documentation SEVEN T
                </h1>
              </div>
              <p className={`text-base sm:text-lg break-words mt-2 max-w-2xl ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Découvrez nos guides d'utilisation pas à pas ou plongez dans la documentation technique avancée pour maîtriser tous les aspects de votre plateforme IA.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-[calc(100vh-16rem)] relative">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className={`sticky top-6 rounded-2xl border flex flex-col max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar shadow-sm transition-all duration-300 ${
            isDark ? 'bg-space-800/20 border-space-700/50' : 'bg-white border-gray-100'
          }`}>
            <div className="p-4 space-y-6">
              {DOCS_CATEGORIES.map((category, idx) => (
                <div key={idx}>
                  <div className={`flex items-center gap-2 mb-3 px-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                    <span className="text-blue-400">{category.icon}</span>
                    <h3 className="font-display font-bold text-base sm:text-lg">{category.title}</h3>
                  </div>
                  <nav className="space-y-1">
                    {category.items.map((section) => {
                      const isActive = activeSection === section.id
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                            isActive
                              ? isDark ? 'bg-blue-500/15 text-blue-400 font-bold' : 'bg-blue-50 text-blue-600 font-bold shadow-sm'
                              : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-space-800/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`${isActive ? '' : 'opacity-70'}`}>{section.icon}</span>
                          {section.title}
                        </button>
                      )
                    })}
                  </nav>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className={`flex-1 p-6 sm:p-8 lg:p-10 rounded-2xl border shadow-sm transition-all duration-300 ${
            isDark ? 'bg-space-800/30 border-space-700/50' : 'bg-white border-gray-100'
          }`}>
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {currentContent}
            </div>
          </div>
          
          <div className={`mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-sm transition-all duration-300 ${
            isDark ? 'bg-space-800/20 border-space-700/50' : 'bg-blue-50/50 border-blue-100'
          }`}>
            <div>
              <p className={`font-semibold text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                Vous ne trouvez pas votre réponse ?
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Notre équipe est là pour vous accompagner. Relisez nos guides ou contactez-nous.
              </p>
            </div>
            <a
              href="mailto:support@seven-t.com"
              className="px-4 py-2 text-sm font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors whitespace-nowrap shadow-md shadow-blue-500/20 flex-shrink-0"
            >
              Contacter le support
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
