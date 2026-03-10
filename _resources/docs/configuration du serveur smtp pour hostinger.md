Si vous hébergez votre application sur Hostinger, la gestion du serveur SMTP est assez simple car Hostinger inclut généralement un service de messagerie (Titan Mail ou Hostinger Email) dans ses plans d'hébergement.

Voici comment cela fonctionne et comment le configurer pour votre projet SEVEN T :

1. Obtenir les identifiants sur Hostinger
   Vous devez vous rendre dans votre hPanel (le panneau de contrôle d'Hostinger) :

Allez dans la section E-mails.
Créez une adresse e-mail (ex: noreply@votre-domaine.com).
Cliquez sur Paramètres de configuration ou Détails SMTP pour obtenir les informations suivantes :
Hôte SMTP : Généralement smtp.hostinger.com (ou smtp.titan.email).
Port : 465 (avec SSL) ou 587 (avec TLS).
Utilisateur : Votre adresse e-mail complète.
Mot de passe : Le mot de passe de l'adresse e-mail créée. 2. Configuration dans votre projet
Votre application est déjà prête à recevoir ces informations. Vous n'avez pas besoin de modifier le code, il suffit de remplir le fichier .env sur votre serveur Hostinger avec les valeurs récupérées :

env

# Configuration SMTP Hostinger

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@votre-domaine.com
SMTP_PASS=votre_mot_de_passe_securise
EMAIL_FROM="SEVEN T <noreply@votre-domaine.com>" 3. Comment Hostinger gère l'envoi
Fiabilité : En utilisant le SMTP d'Hostinger, vos e-mails ont beaucoup moins de chances de finir en spam par rapport à un envoi direct depuis le serveur.
Limites : Hostinger impose des limites d'envoi (par exemple, 200 à 500 e-mails par heure selon le plan). Pour une utilisation standard (résumés quotidiens, réinitialisation de mot de passe, bienvenue), c'est largement suffisant.
Sécurité : L'utilisation du port 465 avec SMTP_SECURE=true est recommandée chez Hostinger pour garantir que vos identifiants et le contenu des e-mails sont chiffrés.
💡 Un conseil important pour Hostinger (VPS vs Mutualisé)
Si vous utilisez un Hébergement Mutualisé : Hostinger bloque parfois l'envoi d'e-mails via des scripts externes sur d'autres ports que les leurs. Il est donc impératif d'utiliser leurs serveurs SMTP officiels.
Si vous utilisez un VPS : Vous avez une liberté totale, mais vous devrez quand même configurer un service comme Hostinger SMTP ou SendGrid pour éviter que votre adresse IP de VPS ne soit blacklistée par Google ou Outlook.
En résumé : Hostinger simplifie tout en vous fournissant directement le serveur SMTP. Il vous suffit de copier les paramètres dans votre fichier .env.
