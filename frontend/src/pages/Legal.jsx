import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Shield, FileText, Scale, Cookie, Mail } from 'lucide-react'

// Company info - Update these for your business
const COMPANY_INFO = {
  name: 'SEVEN T',
  legalName: 'SEVEN T SAS',
  address: '123 Avenue de l\'Innovation, 75001 Paris, France',
  email: 'contact@seven-t.com',
  siret: '123 456 789 00000',
  tva: 'FR12345678900',
  rcs: 'RCS Paris B 123 456 789',
  capital: '10 000 €',
  director: 'Nom du Dirigeant',
  host: 'OVH SAS - 2 rue Kellermann, 59100 Roubaix, France',
  dpo: 'dpo@seven-t.com',
  lastUpdate: '30 janvier 2026'
}

const TABS = [
  { id: 'terms', label: 'Conditions Générales', icon: FileText },
  { id: 'privacy', label: 'Confidentialité', icon: Shield },
  { id: 'cookies', label: 'Cookies', icon: Cookie },
  { id: 'legal', label: 'Mentions Légales', icon: Scale },
]

// Logo du SaaS (fichier public/logo.svg)
const Logo = () => (
  <img src="/logo.svg" alt="SEVEN T" className="h-8 w-auto object-contain sm:h-9" />
)

export default function Legal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'terms'

  const setTab = (tab) => {
    setSearchParams({ tab })
  }

  return (
    <div className="min-h-screen bg-space-950">
      {/* Header */}
      <header className="border-b border-space-700 sticky top-0 z-50 bg-space-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <Logo />
            </Link>
            <Link 
              to="/"
              className="flex items-center gap-2 text-gray-400 hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gold-400 text-space-950'
                  : 'bg-space-800 text-gray-400 hover:text-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card p-8 prose prose-invert prose-gold max-w-none">
          {activeTab === 'terms' && <TermsContent />}
          {activeTab === 'privacy' && <PrivacyContent />}
          {activeTab === 'cookies' && <CookiesContent />}
          {activeTab === 'legal' && <LegalMentionsContent />}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Dernière mise à jour : {COMPANY_INFO.lastUpdate}</p>
          <p className="mt-2">
            Des questions ? Contactez-nous à{' '}
            <a href={`mailto:${COMPANY_INFO.email}`} className="text-gold-400 hover:underline">
              {COMPANY_INFO.email}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

function TermsContent() {
  return (
    <>
      <h1>Conditions Générales d'Utilisation</h1>
      <p className="lead">
        Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation de la plateforme {COMPANY_INFO.name}.
      </p>

      <h2>1. Objet</h2>
      <p>
        {COMPANY_INFO.name} est une plateforme SaaS d'automatisation des conversations WhatsApp utilisant l'intelligence artificielle.
        Ces CGU définissent les conditions d'utilisation du service entre {COMPANY_INFO.legalName} et l'utilisateur.
      </p>

      <h2>2. Inscription et Compte</h2>
      <h3>2.1 Conditions d'inscription</h3>
      <ul>
        <li>Être âgé d'au moins 18 ans ou avoir l'autorisation d'un représentant légal</li>
        <li>Fournir des informations exactes et à jour</li>
        <li>Disposer d'un compte WhatsApp valide</li>
        <li>Accepter les présentes CGU</li>
      </ul>

      <h3>2.2 Sécurité du compte</h3>
      <p>
        L'utilisateur est responsable de la confidentialité de ses identifiants et de toute activité sur son compte.
        En cas de compromission suspectée, l'utilisateur doit nous en informer immédiatement.
      </p>

      <h2>3. Services proposés</h2>
      <ul>
        <li>Création d'agents IA personnalisés</li>
        <li>Connexion WhatsApp via QR code</li>
        <li>Réponses automatiques intelligentes</li>
        <li>Base de connaissances personnalisable</li>
        <li>Historique des conversations</li>
        <li>Tableaux de bord et statistiques</li>
      </ul>

      <h2>4. Tarification et Crédits</h2>
      <h3>4.1 Plans tarifaires</h3>
      <p>
        Différents plans sont disponibles avec des quotas de crédits mensuels.
        Les détails sont disponibles sur la page de tarification.
      </p>

      <h3>4.2 Système de crédits</h3>
      <ul>
        <li>Chaque message IA consomme des crédits selon le modèle utilisé</li>
        <li>Les crédits non utilisés ne sont pas reportables</li>
        <li>Les crédits sont réinitialisés chaque mois à la date d'anniversaire</li>
      </ul>

      <h2>5. Utilisation acceptable</h2>
      <h3>5.1 Usages interdits</h3>
      <p>L'utilisateur s'engage à ne pas :</p>
      <ul>
        <li>Envoyer de spam ou de messages non sollicités</li>
        <li>Utiliser le service à des fins illégales</li>
        <li>Usurper l'identité d'un tiers</li>
        <li>Diffuser du contenu haineux, diffamatoire ou offensant</li>
        <li>Tenter de contourner les limitations techniques</li>
        <li>Revendre l'accès au service</li>
        <li>Collecter des données personnelles sans consentement</li>
      </ul>

      <h3>5.2 Respect des CGU de WhatsApp</h3>
      <p>
        L'utilisateur s'engage à respecter les conditions d'utilisation de WhatsApp.
        {COMPANY_INFO.name} n'est pas responsable des sanctions appliquées par WhatsApp.
      </p>

      <h2>6. Propriété intellectuelle</h2>
      <p>
        Tous les éléments de la plateforme (code, design, marques, contenus) sont la propriété de {COMPANY_INFO.legalName}.
        L'utilisateur conserve la propriété de ses données et contenus.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        {COMPANY_INFO.name} est fourni "tel quel". Nous ne garantissons pas une disponibilité de 100%.
        Nous ne sommes pas responsables des décisions prises par les utilisateurs sur la base des réponses IA.
      </p>

      <h2>8. Résiliation</h2>
      <ul>
        <li>L'utilisateur peut résilier à tout moment depuis les paramètres</li>
        <li>Nous pouvons suspendre ou résilier un compte en cas de violation des CGU</li>
        <li>Les données peuvent être conservées 30 jours après résiliation</li>
      </ul>

      <h2>9. Modification des CGU</h2>
      <p>
        Nous pouvons modifier ces CGU à tout moment. Les utilisateurs seront notifiés par email.
        La continuation de l'utilisation vaut acceptation des nouvelles conditions.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Ces CGU sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents de Paris.
      </p>

      <h2>11. Contact</h2>
      <p>
        Pour toute question : <a href={`mailto:${COMPANY_INFO.email}`}>{COMPANY_INFO.email}</a>
      </p>
    </>
  )
}

function PrivacyContent() {
  return (
    <>
      <h1>Politique de Confidentialité</h1>
      <p className="lead">
        Cette politique décrit comment {COMPANY_INFO.name} collecte, utilise et protège vos données personnelles,
        conformément au RGPD.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        <strong>{COMPANY_INFO.legalName}</strong><br />
        {COMPANY_INFO.address}<br />
        Email : {COMPANY_INFO.email}<br />
        DPO : {COMPANY_INFO.dpo}
      </p>

      <h2>2. Données collectées</h2>
      <h3>2.1 Données d'inscription</h3>
      <ul>
        <li>Nom et prénom</li>
        <li>Adresse email</li>
        <li>Nom de l'entreprise (optionnel)</li>
        <li>Mot de passe (hashé)</li>
      </ul>

      <h3>2.2 Données d'utilisation</h3>
      <ul>
        <li>Historique des conversations WhatsApp</li>
        <li>Configuration des agents IA</li>
        <li>Base de connaissances</li>
        <li>Statistiques d'utilisation</li>
        <li>Logs de connexion</li>
      </ul>

      <h3>2.3 Données techniques</h3>
      <ul>
        <li>Adresse IP</li>
        <li>Type de navigateur</li>
        <li>Appareil utilisé</li>
      </ul>

      <h2>3. Finalités du traitement</h2>
      <table>
        <thead>
          <tr>
            <th>Finalité</th>
            <th>Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fourniture du service</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Amélioration du service</td>
            <td>Intérêt légitime</td>
          </tr>
          <tr>
            <td>Communication marketing</td>
            <td>Consentement</td>
          </tr>
          <tr>
            <td>Facturation</td>
            <td>Obligation légale</td>
          </tr>
          <tr>
            <td>Sécurité</td>
            <td>Intérêt légitime</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Partage des données</h2>
      <p>Vos données peuvent être partagées avec :</p>
      <ul>
        <li><strong>Google (Gemini AI)</strong> - Génération des réponses IA</li>
        <li><strong>OpenAI</strong> - Génération des réponses IA (alternative)</li>
        <li><strong>Stripe</strong> - Traitement des paiements</li>
        <li><strong>Hébergeur (OVH)</strong> - Stockage des données</li>
      </ul>
      <p>Nous ne vendons jamais vos données à des tiers.</p>

      <h2>5. Durée de conservation</h2>
      <table>
        <thead>
          <tr>
            <th>Type de données</th>
            <th>Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Compte utilisateur</td>
            <td>Durée du compte + 3 ans</td>
          </tr>
          <tr>
            <td>Conversations</td>
            <td>12 mois glissants</td>
          </tr>
          <tr>
            <td>Factures</td>
            <td>10 ans (obligation légale)</td>
          </tr>
          <tr>
            <td>Logs de sécurité</td>
            <td>1 an</td>
          </tr>
        </tbody>
      </table>

      <h2>6. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Accès</strong> - Obtenir une copie de vos données</li>
        <li><strong>Rectification</strong> - Corriger vos données</li>
        <li><strong>Effacement</strong> - Supprimer vos données</li>
        <li><strong>Portabilité</strong> - Exporter vos données</li>
        <li><strong>Opposition</strong> - Refuser certains traitements</li>
        <li><strong>Limitation</strong> - Restreindre le traitement</li>
      </ul>
      <p>
        Pour exercer vos droits : <a href={`mailto:${COMPANY_INFO.dpo}`}>{COMPANY_INFO.dpo}</a>
      </p>

      <h2>7. Sécurité</h2>
      <p>Nous mettons en œuvre des mesures de sécurité appropriées :</p>
      <ul>
        <li>Chiffrement des données en transit (HTTPS/TLS)</li>
        <li>Hashage des mots de passe (bcrypt)</li>
        <li>Accès restreint aux données</li>
        <li>Surveillance et alertes de sécurité</li>
        <li>Sauvegardes régulières</li>
      </ul>

      <h2>8. Transferts internationaux</h2>
      <p>
        Certains de nos prestataires (Google, OpenAI) peuvent traiter des données aux États-Unis.
        Ces transferts sont encadrés par les clauses contractuelles types de la Commission Européenne.
      </p>

      <h2>9. Réclamation</h2>
      <p>
        Vous pouvez déposer une réclamation auprès de la CNIL :{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener">www.cnil.fr</a>
      </p>

      <h2>10. Contact DPO</h2>
      <p>
        Délégué à la Protection des Données : <a href={`mailto:${COMPANY_INFO.dpo}`}>{COMPANY_INFO.dpo}</a>
      </p>
    </>
  )
}

function CookiesContent() {
  return (
    <>
      <h1>Politique de Cookies</h1>
      <p className="lead">
        Cette politique explique comment {COMPANY_INFO.name} utilise les cookies et technologies similaires.
      </p>

      <h2>1. Qu'est-ce qu'un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte stocké sur votre appareil lors de la visite d'un site web.
        Il permet de mémoriser vos préférences et d'améliorer votre expérience.
      </p>

      <h2>2. Types de cookies utilisés</h2>
      
      <h3>2.1 Cookies essentiels</h3>
      <p>Nécessaires au fonctionnement du site. Ils ne peuvent pas être désactivés.</p>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Finalité</th>
            <th>Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>auth_token</td>
            <td>Authentification</td>
            <td>7 jours</td>
          </tr>
          <tr>
            <td>session_id</td>
            <td>Session utilisateur</td>
            <td>Session</td>
          </tr>
        </tbody>
      </table>

      <h3>2.2 Cookies analytiques</h3>
      <p>Nous aident à comprendre comment les visiteurs utilisent le site.</p>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Finalité</th>
            <th>Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>_ga</td>
            <td>Google Analytics</td>
            <td>2 ans</td>
          </tr>
          <tr>
            <td>_gid</td>
            <td>Google Analytics</td>
            <td>24 heures</td>
          </tr>
        </tbody>
      </table>

      <h3>2.3 Cookies de préférence</h3>
      <p>Mémorisent vos choix (thème, langue, etc.).</p>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Finalité</th>
            <th>Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>theme</td>
            <td>Thème d'affichage</td>
            <td>1 an</td>
          </tr>
          <tr>
            <td>cookie_consent</td>
            <td>Choix cookies</td>
            <td>1 an</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Gestion des cookies</h2>
      <h3>3.1 Via notre bandeau</h3>
      <p>
        Lors de votre première visite, un bandeau vous permet d'accepter ou de refuser les cookies non essentiels.
      </p>

      <h3>3.2 Via votre navigateur</h3>
      <p>Vous pouvez également gérer les cookies via les paramètres de votre navigateur :</p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Chrome</a></li>
        <li><a href="https://support.mozilla.org/fr/kb/cookies-informations-sites-enregistrent" target="_blank" rel="noopener">Firefox</a></li>
        <li><a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener">Safari</a></li>
        <li><a href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener">Edge</a></li>
      </ul>

      <h2>4. Conséquences du refus</h2>
      <p>
        Si vous refusez les cookies non essentiels :
      </p>
      <ul>
        <li>Le site fonctionnera normalement</li>
        <li>Nous ne pourrons pas analyser votre utilisation</li>
        <li>Certaines préférences ne seront pas mémorisées</li>
      </ul>

      <h2>5. Contact</h2>
      <p>
        Questions sur les cookies : <a href={`mailto:${COMPANY_INFO.email}`}>{COMPANY_INFO.email}</a>
      </p>
    </>
  )
}

function LegalMentionsContent() {
  return (
    <>
      <h1>Mentions Légales</h1>
      
      <h2>1. Éditeur du site</h2>
      <p>
        <strong>{COMPANY_INFO.legalName}</strong><br />
        Société par Actions Simplifiée au capital de {COMPANY_INFO.capital}<br />
        {COMPANY_INFO.address}<br /><br />
        SIRET : {COMPANY_INFO.siret}<br />
        RCS : {COMPANY_INFO.rcs}<br />
        N° TVA : {COMPANY_INFO.tva}<br /><br />
        Directeur de la publication : {COMPANY_INFO.director}<br />
        Email : <a href={`mailto:${COMPANY_INFO.email}`}>{COMPANY_INFO.email}</a>
      </p>

      <h2>2. Hébergement</h2>
      <p>
        <strong>{COMPANY_INFO.host}</strong>
      </p>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L'ensemble du contenu de ce site (textes, images, vidéos, logos, marques) est protégé par le droit d'auteur 
        et le droit des marques. Toute reproduction, même partielle, est interdite sans autorisation préalable.
      </p>
      <p>
        La marque "{COMPANY_INFO.name}" et le logo associé sont des marques déposées de {COMPANY_INFO.legalName}.
      </p>

      <h2>4. Liens hypertextes</h2>
      <p>
        Ce site peut contenir des liens vers des sites tiers. {COMPANY_INFO.name} n'exerce aucun contrôle 
        sur ces sites et décline toute responsabilité quant à leur contenu.
      </p>

      <h2>5. Limitation de responsabilité</h2>
      <p>
        {COMPANY_INFO.legalName} s'efforce de fournir des informations exactes et à jour, mais ne peut garantir 
        l'exactitude, la complétude ou l'actualité des informations diffusées sur le site.
      </p>
      <p>
        {COMPANY_INFO.legalName} ne pourra être tenue responsable des dommages directs ou indirects résultant 
        de l'utilisation de ce site ou de l'impossibilité de l'utiliser.
      </p>

      <h2>6. Droit applicable</h2>
      <p>
        Le présent site et ses mentions légales sont régis par le droit français. 
        En cas de litige, les tribunaux français seront seuls compétents.
      </p>

      <h2>7. Contact</h2>
      <p>
        Pour toute question ou réclamation concernant le site :<br />
        <a href={`mailto:${COMPANY_INFO.email}`}>{COMPANY_INFO.email}</a>
      </p>

      <h2>8. Crédits</h2>
      <ul>
        <li>Design et développement : {COMPANY_INFO.legalName}</li>
        <li>Icônes : <a href="https://lucide.dev" target="_blank" rel="noopener">Lucide Icons</a></li>
        <li>Police : <a href="https://rsms.me/inter/" target="_blank" rel="noopener">Inter</a></li>
      </ul>
    </>
  )
}
