# Conformité RGPD – SEVEN T

## Ce qui est déjà en place (conforme)

| Exigence RGPD | Statut | Détail |
|---------------|--------|--------|
| **Information des personnes** | ✅ | Politique de confidentialité (finalités, bases légales, durées, droits, DPO). |
| **Droit d'accès** | ✅ | Export des données (Paramètres → « Exporter mes données ») : JSON complet (compte, agents, conversations, messages, produits, commandes, leads, bases de connaissances). |
| **Droit de rectification** | ✅ | Modification du profil (nom, entreprise) dans Paramètres. |
| **Exercice des droits** | ✅ | Contact DPO par email indiqué dans la politique et le DPA. |
| **Sous-traitants / transferts** | ✅ | Liste dans la politique (Google, OpenAI, Stripe, hébergeur) ; DPA et clauses contractuelles types pour transferts hors UE. |
| **Sécurité** | ✅ | HTTPS, mots de passe hashés (bcrypt), accès restreint, sauvegardes (décrits en politique). |
| **Durées de conservation** | ✅ | Tableau en politique (compte, conversations, factures, logs). |
| **DPA (B2B)** | ✅ | Accord de traitement des données (DPA) pour clients professionnels. |
| **Réclamation CNIL** | ✅ | Lien CNIL et contact DPO dans la politique. |
| **Acceptation des CGU** | ✅ | Mention à l’inscription : « En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité. » |

## Points renforcés (implémentés)

### 1. Droit à l’effacement (Art. 17 RGPD) — ✅ Implémenté

- **Route** : `DELETE /api/auth/me` (authentifiée) supprime le compte et toutes les données associées (déconnexion WhatsApp, suppression des sessions, puis suppression en base avec CASCADE).
- **Interface** : Paramètres → section « Supprimer mon compte » avec bouton et modal de confirmation. Après suppression, déconnexion et redirection vers /login.

### 2. Bandeau cookies — ✅ Aligné avec la réalité

- La politique cookies a été mise à jour : elle indique que **seuls des cookies essentiels** sont utilisés actuellement ; en cas d’ajout de cookies non essentiels, un mécanisme de consentement sera proposé. Plus de mention d’un bandeau déjà en place.

---

## Optionnel (recommandé)

### 3. Consentement explicite à l’inscription

- **Constat** : L’acceptation des CGU et de la politique de confidentialité repose sur une phrase sous le formulaire d’inscription, sans case à cocher.
- **Recommandation** : Ajouter une case à cocher « J’ai lu et j’accepte les conditions d’utilisation et la politique de confidentialité » (obligatoire) pour un consentement explicite et plus facilement démontrable.

---

## Synthèse

La solution est **alignée avec les exigences principales du RGPD** :

- ✅ Information (politique de confidentialité, DPA, durées, sous-traitants).  
- ✅ Droits : accès (export), rectification (profil), **effacement (suppression du compte)**.  
- ✅ Sécurité, contact DPO, réclamation CNIL.  
- ✅ Politique cookies cohérente (cookies essentiels uniquement pour l’instant).

**Recommandation optionnelle** : case à cocher d’acceptation des CGU / politique de confidentialité à l’inscription pour un consentement explicite et plus facilement démontrable.

Ce document peut être mis à jour au fil des évolutions (nouveaux traitements, sous-traitants, fonctionnalités).
