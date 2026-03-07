# 🚀 Guide de lancement local SEVEN-T (PostgreSQL)

Ce guide vous aidera à configurer votre environnement local pour faire tourner SEVEN-T avec une base de données PostgreSQL.

## 1. Problème de Permissions (Important) ⚠️

Actuellement, les fichiers du projet dans `/home/styapo/Projet/SEVEN-T` appartiennent à l'utilisateur `root`. Cela empêche l'installation des dépendances et l'exécution de l'application par votre utilisateur courant (`styapo`).

**Action requise :** Exécutez la commande suivante dans votre terminal pour reprendre possession des fichiers :

```bash
sudo chown -R $USER:$USER /home/styapo/Projet/SEVEN-T
```

---

## 2. Configuration de PostgreSQL 🐘

L'application utilise désormais PostgreSQL. Voici comment préparer votre base de données :

### Création de la base de données
Connectez-vous à PostgreSQL et créez la base `seven_t` :

```bash
sudo -u postgres psql -c "CREATE DATABASE seven_t;"
```

### Configuration de l'authentification
Pour que le backend puisse se connecter via une URL de type `postgres://...`, vous devez définir un mot de passe pour l'utilisateur `postgres` :

```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

> [!TIP]
> Si la connexion est refusée avec une erreur "peer authentication", vous devrez peut-être modifier votre fichier `pg_hba.conf` (généralement dans `/etc/postgresql/16/main/pg_hba.conf` ou `/var/lib/pgsql/data/pg_hba.conf`) pour changer `peer` en `md5` ou `trust` pour les connexions locales.

---

## 3. Configuration de l'environnement (.env) ⚙️

Créez un fichier `.env` à la racine du projet :

```env
# Server
PORT=3001
JWT_SECRET=un-secret-tres-long-et-securise

# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/seven_t

# AI (Optionnel mais recommandé)
GEMINI_API_KEY=votre-cle-gemini

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## 4. Installation et Premier Lancement 🚀

Une fois les permissions corrigées :

1. **Installer les dépendances** :
   ```bash
   npm install && cd frontend && npm install && cd ..
   ```

2. **Créer le compte Administrateur** :
   ```bash
   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password123 ADMIN_NAME=Admin npm run db:create-admin
   ```

3. **Lancer l'application** (Backend + Frontend) :
   ```bash
   npm run dev
   ```

---

## 🔍 Analyse de la Base de Code

- **Backend** : Node.js avec Express.
- **Base de données** : Le fichier `backend/database/init.js` gère automatiquement la création des tables dès le démarrage du serveur.
- **Migrations** : Le projet utilise un wrapper `db` (dans `init.js`) qui traduit les anciennes requêtes SQLite en PostgreSQL dynamiquement.
- **WhatsApp** : Géré par le service `baileys` dans `backend/services/whatsapp.js`.
