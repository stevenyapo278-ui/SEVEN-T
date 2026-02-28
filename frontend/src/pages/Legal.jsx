import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Shield, FileText, Scale, Cookie, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'

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
  { id: 'terms', label: 'legal.terms', icon: FileText },
  { id: 'privacy', label: 'legal.privacy', icon: Shield },
  { id: 'dpa', label: 'legal.dpa', icon: FileText },
  { id: 'cookies', label: 'legal.cookies', icon: Cookie },
  { id: 'rgpd', label: 'legal.rgpd', icon: Shield },
  { id: 'legal', label: 'legal.mentions', icon: Scale },
]

// Logo du SaaS (fichier public/logo.svg)
const Logo = () => (
  <img src="/logo.svg" alt="SEVEN T" className="h-8 w-auto object-contain sm:h-9" />
)

export default function Legal() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
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
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 transition-transform hover:scale-105">
              <Logo />
            </Link>
            <Link 
              to="/"
              className="group flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-400 hover:text-gold-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
              {t('legal.backToHome')}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* Tabs - Scrollable on mobile with hidden scrollbar */}
        <div className="flex flex-nowrap overflow-x-auto gap-2.5 mb-8 sm:mb-12 pb-4 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-[13px] sm:text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 touch-target ${
                activeTab === tab.id
                  ? 'bg-gold-400 text-space-950 shadow-xl shadow-gold-400/25 scale-105 z-10'
                  : 'bg-space-800/80 text-gray-400 hover:text-gray-100 border border-space-700/50 hover:border-space-600'
              }`}
            >
              <tab.icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${activeTab === tab.id ? 'text-space-950' : 'text-gray-500'}`} />
              {t(tab.label)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={`rounded-[2rem] overflow-hidden border shadow-2xl ${isDark ? 'bg-space-900/50 border-space-700/50 backdrop-blur-sm' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50'}`}>
          <div className={`p-6 sm:p-12 md:p-16 legal-content max-w-none prose ${isDark ? 'prose-invert prose-gold' : 'prose-slate'} prose-sm sm:prose-base md:prose-lg !max-w-full leading-relaxed`}>
            {activeTab === 'terms' && <TermsContent />}
            {activeTab === 'privacy' && <PrivacyContent />}
            {activeTab === 'dpa' && <DPAContent />}
            {activeTab === 'cookies' && <CookiesContent />}
            {activeTab === 'rgpd' && <RgpdContent />}
            {activeTab === 'legal' && <LegalMentionsContent />}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 sm:mt-10 text-center text-xs sm:text-sm text-gray-500 pb-8">
          <p>{t('legal.lastUpdate')} : {COMPANY_INFO.lastUpdate}</p>
          <p className="mt-2">
            {t('legal.questions')}{' '}
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
      <div className="table-wrapper">
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
      </div>

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
      <div className="table-wrapper">
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
      </div>

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

function DPAContent() {
  return (
    <>
      <h1>Accord de traitement des données (DPA)</h1>
      <p className="lead">
        Le présent accord définit les conditions dans lesquelles {COMPANY_INFO.legalName} (« le Sous-traitant »)
        traite les données personnelles pour le compte du client (« le Responsable du traitement ») dans le cadre
        des services {COMPANY_INFO.name}, conformément au Règlement (UE) 2016/679 (RGPD).
      </p>

      <h2>1. Objet et définitions</h2>
      <p>
        Le Sous-traitant s'engage à traiter les données personnelles uniquement sur instruction documentée du
        Responsable du traitement, pour les finalités décrites dans les Conditions d'utilisation et la Politique
        de confidentialité. Les termes « données personnelles », « traitement », « Responsable du traitement »,
        « Sous-traitant » et « données concernées » ont le sens défini à l'article 4 du RGPD.
      </p>

      <h2>2. Obligations du Sous-traitant</h2>
      <p>Le Sous-traitant s'engage à :</p>
      <ul>
        <li>Traiter les données personnelles uniquement pour les finalités et la durée convenues</li>
        <li>Garantir la confidentialité des personnes autorisées à traiter les données</li>
        <li>Mettre en œuvre des mesures techniques et organisationnelles appropriées (sécurité, pseudonymisation, chiffrement)</li>
        <li>Faire appel à des sous-traitants uniquement avec l'accord préalable du Responsable du traitement et sous un engagement écrit équivalent</li>
        <li>Assister le Responsable du traitement pour répondre aux demandes d'exercice des droits des personnes concernées</li>
        <li>Assister le Responsable du traitement pour garantir la conformité aux obligations relatives à la sécurité, aux notifications de violation et aux analyses d'impact</li>
        <li>Restituer ou détruire les données personnelles à la fin de la prestation, selon le choix du Responsable du traitement</li>
        <li>Mettre à disposition toutes les informations nécessaires pour démontrer le respect des obligations du présent accord</li>
      </ul>

      <h2>3. Sous-traitants et transferts</h2>
      <p>
        Les données peuvent être traitées par des sous-traitants (hébergement, fournisseurs d'IA, paiement).
        La liste des sous-traitants et leurs garanties sont disponibles sur demande à {COMPANY_INFO.email}.
        Tout transfert de données hors UE/EEE est encadré par les clauses contractuelles types de la Commission
        européenne ou des garanties appropriées (décision d'adéquation, BCR, etc.).
      </p>

      <h2>4. Durée et résiliation</h2>
      <p>
        Le présent accord s'applique pour la durée de la fourniture des services. À la fin du contrat, le
        Sous-traitant restitue ou détruit les données personnelles dans un délai raisonnable, sauf obligation
        légale de conservation. Le Responsable du traitement peut demander une copie des données avant résiliation.
      </p>

      <h2>5. Audit et contrôle</h2>
      <p>
        Le Responsable du traitement peut vérifier le respect du présent accord par des audits ou des
        questionnaires. Le Sous-traitant fournit les éléments de preuve nécessaires. En cas d'audit sur site,
        celui-ci est notifié à l'avance et réalisé pendant les heures ouvrables, sans perturber l'activité du
        Sous-traitant.
      </p>

      <h2>6. Contact</h2>
      <p>
        Pour toute question relative au présent DPA : <a href={`mailto:${COMPANY_INFO.dpo}`}>{COMPANY_INFO.dpo}</a>
        (Délégué à la Protection des Données).
      </p>
      <p>
        <strong>{COMPANY_INFO.legalName}</strong><br />
        {COMPANY_INFO.address}<br />
        Dernière mise à jour : {COMPANY_INFO.lastUpdate}
      </p>
    </>
  )
}

function RgpdContent() {
  return (
    <>
      <h1>Conformité RGPD</h1>
      <p className="lead">
        Ce document résume les mesures prises par {COMPANY_INFO.name} pour respecter le Règlement général sur la protection des données (RGPD).
      </p>

      <h2>1. Ce qui est en place (conforme)</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Exigence RGPD</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Information des personnes</td><td>Politique de confidentialité (finalités, bases légales, durées, droits, DPO).</td></tr>
            <tr><td>Droit d&apos;accès</td><td>Export des données (Paramètres → « Exporter mes données ») : JSON complet (compte, agents, conversations, messages, produits, commandes, leads, bases de connaissances).</td></tr>
            <tr><td>Droit de rectification</td><td>Modification du profil (nom, entreprise) dans Paramètres.</td></tr>
            <tr><td>Droit à l&apos;effacement</td><td>Suppression du compte par l&apos;utilisateur (Paramètres → « Supprimer mon compte »). Route DELETE /api/auth/me.</td></tr>
            <tr><td>Exercice des droits</td><td>Contact DPO par email indiqué dans la politique et le DPA.</td></tr>
            <tr><td>Sous-traitants / transferts</td><td>Liste dans la politique ; DPA et clauses contractuelles types pour transferts hors UE.</td></tr>
            <tr><td>Sécurité</td><td>HTTPS, mots de passe hashés (bcrypt), accès restreint, sauvegardes.</td></tr>
            <tr><td>Durées de conservation</td><td>Tableau en politique (compte, conversations, factures, logs).</td></tr>
            <tr><td>DPA (B2B)</td><td>Accord de traitement des données pour clients professionnels.</td></tr>
            <tr><td>Réclamation CNIL</td><td>Lien CNIL et contact DPO dans la politique.</td></tr>
            <tr><td>Consentement explicite</td><td>Case à cocher obligatoire à l&apos;inscription (CGU et politique de confidentialité).</td></tr>
            <tr><td>Cookies / stockage local</td><td>Politique dédiée ; bandeau d&apos;information ; pas de cookies de suivi.</td></tr>
          </tbody>
        </table>
      </div>

      <h2>2. Synthèse</h2>
      <p>
        La solution est alignée avec les exigences principales du RGPD : information, droits (accès, rectification, effacement, portabilité via export), sécurité, contact DPO, réclamation CNIL, politique cookies et stockage local cohérente.
      </p>
      <p>
        Pour toute question : <a href={`mailto:${COMPANY_INFO.dpo}`}>{COMPANY_INFO.dpo}</a> (DPO).
      </p>
      <p className="text-sm text-gray-500 mt-4">
        Dernière mise à jour : {COMPANY_INFO.lastUpdate}
      </p>
    </>
  )
}

function CookiesContent() {
  return (
    <>
      <h1>Politique Cookies et stockage local</h1>
      <p className="lead">
        Cette page explique ce que {COMPANY_INFO.name} enregistre dans votre navigateur (stockage local et, le cas échéant, cookies).
      </p>

      <h2>1. Ce que nous utilisons : le stockage local (localStorage)</h2>
      <p>
        Notre application utilise le <strong>stockage local</strong> (localStorage) de votre navigateur, et non des cookies HTTP, pour le fonctionnement du service. Aucun cookie de suivi ou publicitaire n’est déposé.
      </p>

      <h2>2. Données enregistrées dans le navigateur</h2>
      <p className="text-sm text-gray-500 mb-3">Clés utilisées par l’application et finalités.</p>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Clé (localStorage)</th>
              <th>Finalité</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>token</td>
              <td>Authentification (session utilisateur)</td>
              <td>Jusqu’à déconnexion / expiration</td>
            </tr>
            <tr>
              <td>locale</td>
              <td>Langue de l’interface (fr, en)</td>
              <td>Jusqu’à suppression</td>
            </tr>
            <tr>
              <td>seven-t-theme</td>
              <td>Thème d’affichage (clair / sombre)</td>
              <td>Jusqu’à suppression</td>
            </tr>
            <tr>
              <td>currency</td>
              <td>Devise préférée (après connexion)</td>
              <td>Jusqu’à suppression</td>
            </tr>
            <tr>
              <td>cookie_consent</td>
              <td>Enregistrement de votre choix sur le bandeau d’information</td>
              <td>1 an</td>
            </tr>
            <tr>
              <td>Autres clés (onboarding, favoris, etc.)</td>
              <td>Préférences d’utilisation de l’application</td>
              <td>Jusqu’à suppression</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>3. Bandeau d’information et consentement</h2>
      <p>
        Lors de votre première visite, un bandeau en bas de page vous informe de l’utilisation du stockage local. En cliquant sur « Tout accepter », vous confirmez avoir pris connaissance de cette politique. Votre choix est enregistré (clé <code className="text-sm bg-space-800 px-1 rounded">cookie_consent</code>) pour ne plus afficher le bandeau. Vous pouvez à tout moment vider le stockage local via les paramètres de votre navigateur.
      </p>

      <h2>4. Gestion et suppression</h2>
      <h3>4.1 Via votre navigateur</h3>
      <p>Vous pouvez gérer ou supprimer les données du site (cookies et stockage local) via les paramètres de votre navigateur :</p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">Chrome</a></li>
        <li><a href="https://support.mozilla.org/fr/kb/cookies-informations-sites-enregistrent" target="_blank" rel="noopener">Firefox</a></li>
        <li><a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener">Safari</a></li>
        <li><a href="https://support.microsoft.com/fr-fr/microsoft-edge/supprimer-les-cookies-dans-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener">Edge</a></li>
      </ul>

      <h3>4.2 Conséquences de la suppression du stockage local</h3>
      <p>Si vous supprimez les données du site :</p>
      <ul>
        <li>Vous serez déconnecté (le token sera supprimé)</li>
        <li>La langue et le thème reviendront aux valeurs par défaut</li>
        <li>Le bandeau d’information cookies réapparaîtra à la prochaine visite</li>
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
