# Tiako Live – Social Selling Automation

Logiciel SaaS d'automatisation des ventes en direct sur Facebook Live, développé dans le cadre d'un stage de 3 mois chez **Honey Group** (marque : *Tiako dia Tiako*).

Un vendeur lance un Live sur sa Page Facebook. Les clients commentent pour commander. Le logiciel capte ces commentaires en temps réel, attribue le stock, puis automatise l'échange Messenger pour finaliser la commande.

> **Statut : Phase 1 (Skeleton) en cours.** Le squelette tourne de bout en bout et le webhook Meta reçoit de vrais événements. Le moteur d'analyse des commentaires et le dashboard viennent aux phases suivantes.

## Stack technique

| Couche | Technologie |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend | Node.js, Fastify, TypeScript (ESM) |
| Base de données | PostgreSQL, Prisma 6 |
| Validation | Zod |
| Intégration | Meta Graph API, Webhooks, Messenger |
| Tunnel de développement | ngrok |

## Structure du dépôt

```
live-selling-saas/
├── frontend/          Application Next.js (dashboard vendeur, à venir)
└── backend/
    ├── prisma/        Schéma de la base et migrations
    └── src/
        ├── server.ts  Point d'entrée Fastify
        ├── db.ts      Client Prisma
        └── webhook.ts Routes /webhook (vérification et réception Meta)
```

## Prérequis

- Node.js LTS et npm
- Git
- PostgreSQL 16 ou plus récent, en local
- Un compte [Meta for Developers](https://developers.facebook.com) et une Page Facebook de test
- [ngrok](https://ngrok.com) (version 3.20 ou plus récente) pour exposer le webhook en HTTPS

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Rj00955/live-selling-saas.git
cd live-selling-saas
```

### 2. Base de données

Créer une base vide dans PostgreSQL :

```sql
CREATE DATABASE live_selling;
```

### 3. Backend

```bash
cd backend
npm install
```

Copier le fichier d'exemple, puis renseigner les valeurs :

```bash
copy .env.example .env     # Windows
cp .env.example .env       # macOS / Linux
```

| Variable | Rôle |
| --- | --- |
| `PORT` | Port du serveur (4000 par défaut) |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `META_VERIFY_TOKEN` | Phrase secrète choisie par le développeur, saisie aussi dans la console Meta |
| `META_APP_SECRET` | Clé secrète de l'app Meta, sert à vérifier la signature des webhooks |
| `META_PAGE_ACCESS_TOKEN` | Jeton d'accès de la Page, pour appeler l'API Messenger |

Le fichier `.env` contient des secrets : il est ignoré par Git et ne doit jamais être publié.

Créer les tables, puis lancer le serveur :

```bash
npx prisma migrate dev
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application s'ouvre sur `http://localhost:3000`.

## Routes du backend

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET | `/health` | Vérifie que le serveur répond |
| GET | `/health/db` | Vérifie la connexion à PostgreSQL |
| GET | `/webhook` | Vérification demandée par Meta (token et challenge) |
| POST | `/webhook` | Réception des événements Meta, avec contrôle de la signature `X-Hub-Signature-256` |

## Configurer le webhook Meta

1. Lancer le backend : `npm run dev` (dossier `backend`).
2. Lancer le tunnel dans un autre terminal : `ngrok http 4000`. Relever l'adresse `https://….ngrok-free.dev`.
3. Dans la console Meta, ouvrir l'app, puis le cas d'utilisation Messenger, puis *Paramètres de l'API Messenger*.
4. Renseigner l'**URL de rappel** `https://….ngrok-free.dev/webhook` et le **token de vérification** (valeur de `META_VERIFY_TOKEN`), puis valider.
5. Associer la Page de test, générer le token d'accès, et s'abonner aux champs `messages`, `messaging_postbacks` et `feed`.

L'adresse ngrok change à chaque lancement de la version gratuite : il faut alors la mettre à jour dans la console Meta.

## Tester le webhook

Après la configuration, envoyer un message à la Page de test depuis un compte qui a un rôle sur l'app. Le terminal du backend affiche une ligne `webhook event` contenant le message, et la requête répond `200`.

En mode développement, seuls les comptes ayant un rôle sur l'app Meta déclenchent des événements.

## Modèle de données

Le schéma Prisma (`backend/prisma/schema.prisma`) contient quatre tables :

- **Product** : code, nom, prix, stock
- **LiveSession** : session de vente en direct
- **Comment** : commentaires reçus pendant un Live
- **Order** : commandes, avec un statut (`PENDING`, `CONFIRMED`, `PAID`, `CANCELLED`)

## Planning

- **Phase 1 – Skeleton** : architecture, base de données, webhook Meta de test *(en cours, webhook opérationnel)*
- **Phase 2** : moteur d'analyse des commentaires en direct, attribution dynamique des stocks, automatisation du tunnel Messenger
- **Phase 3** : dashboard vendeur (stocks et commandes), recettes, tests en conditions réelles, documentation et livraison

## Limites connues

- Le tunnel ngrok est réservé au développement.
- L'utilisation avec de vrais vendeurs exigera la validation de l'app par Meta (App Review) pour obtenir les permissions en production.

## Auteur

RAZAFIMAHALEO Rojotiana, étudiant en L3 à l'École Nationale d'Informatique (ENI), Université de Fianarantsoa.
Encadreur professionnel : Robert Samson RAKOTOARISON, gérant de Honey Group.
