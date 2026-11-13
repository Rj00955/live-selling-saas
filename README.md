# Tiako Live – Social Selling Automation

Application SaaS d'automatisation des ventes en direct sur Facebook Live, développée dans le cadre d'un stage de 3 mois chez **Honey Group** (marque : *Tiako dia Tiako*).

Le projet vise à permettre à un vendeur de gérer ses ventes pendant un Facebook Live. Les clients commentent pour commander, le système reçoit les événements transmis par Meta et permet de gérer les produits, les stocks et les commandes depuis un dashboard.

## Statut du projet

**Développement en cours – Dashboard et intégration API disponibles.**

Le socle technique du projet est opérationnel. Le backend communique avec PostgreSQL et expose les fonctionnalités de gestion des produits et des commandes. Le frontend Next.js dispose d'un dashboard connecté à l'API.

Les fonctionnalités avancées d'analyse automatique des commentaires, d'attribution dynamique des stocks et d'automatisation complète des échanges Messenger restent à poursuivre et à valider.

## Fonctionnalités développées

### Dashboard vendeur
- Interface réalisée avec Next.js, TypeScript et Tailwind CSS.
- Navigation entre les différentes sections du dashboard.
- Affichage des indicateurs liés aux produits et aux stocks.
- Connexion du frontend au backend pour récupérer les données.

### Gestion des produits
- Récupération des produits depuis l'API.
- Affichage des informations des produits : code, nom, prix et stock.
- Intégration des fonctionnalités de gestion des produits.

### Gestion des commandes
- Récupération et affichage des commandes depuis l'API.
- Consultation des informations du client, du produit et de la quantité.
- Gestion des statuts des commandes.
- Possibilité de confirmer ou d'annuler une commande.

### Backend et intégration Meta
- Serveur backend développé avec Fastify et TypeScript.
- Connexion à PostgreSQL via Prisma.
- Réception des événements transmis par les Webhooks Meta.
- Vérification de la signature des requêtes entrantes.

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend | Node.js, Fastify, TypeScript (ESM) |
| Base de données | PostgreSQL, Prisma 6 |
| Validation | Zod |
| Intégration | Meta Graph API, Webhooks, Messenger |
| Tunnel de développement | ngrok |

## Structure du dépôt

```text
live-selling-saas/
├── frontend/
│   └── src/
│       └── app/
│           ├── page.tsx
│           ├── layout.tsx
│           └── globals.css
│
└── backend/
    ├── prisma/
    │   └── schema.prisma
    └── src/
        ├── server.ts
        ├── db.ts
        ├── webhook.ts
        ├── product-routes.ts
        ├── product-service.ts
        ├── order-routes.ts
        ├── order-service.ts
        └── order-parser.ts
```

## Prérequis

- Node.js LTS et npm
- Git
- PostgreSQL 16 ou plus récent
- Un compte [Meta for Developers](https://developers.facebook.com) et une Page Facebook de test
- [ngrok](https://ngrok.com) version 3.20 ou plus récente pour exposer le webhook en HTTPS

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Rj00955/live-selling-saas.git
cd live-selling-saas
```

### 2. Configurer PostgreSQL

Créer une base de données vide :

```sql
CREATE DATABASE live_selling;
```

### 3. Installer et lancer le backend

```bash
cd backend
npm install
```

Créer le fichier `.env` à partir du fichier d'exemple :

```bash
copy .env.example .env
```

Sur macOS ou Linux :

```bash
cp .env.example .env
```

Renseigner les variables d'environnement :

| Variable | Rôle |
|---|---|
| `PORT` | Port du serveur (4000 par défaut) |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `META_VERIFY_TOKEN` | Token utilisé pour vérifier le webhook Meta |
| `META_APP_SECRET` | Clé secrète de l'application Meta |
| `META_PAGE_ACCESS_TOKEN` | Token d'accès de la Page Facebook |

Créer ou appliquer les migrations de la base de données :

```bash
npx prisma migrate dev
```

Lancer le serveur backend :

```bash
npm run dev
```

Le backend est accessible par défaut sur :

```text
http://localhost:4000
```

### 4. Installer et lancer le frontend

Ouvrir un deuxième terminal :

```bash
cd frontend
npm install
```

Créer un fichier `.env.local` si nécessaire et configurer l'adresse de l'API :

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Lancer le frontend :

```bash
npm run dev
```

Le dashboard est accessible sur :

```text
http://localhost:3000
```

## Routes du backend

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/health` | Vérifie que le serveur répond |
| GET | `/health/db` | Vérifie la connexion à PostgreSQL |
| GET | `/webhook` | Vérification du webhook demandée par Meta |
| POST | `/webhook` | Réception des événements Meta |
| GET | `/products` | Récupération de la liste des produits |
| GET | `/orders` | Récupération de la liste des commandes |
| PATCH | `/orders/:id/confirm` | Confirmation d'une commande |
| PATCH | `/orders/:id/cancel` | Annulation d'une commande |

Le backend comporte également des fonctionnalités de gestion des produits. Pour connaître les routes disponibles et leurs paramètres exacts, consulter les fichiers `product-routes.ts` et `order-routes.ts`.

## Configuration du webhook Meta

1. Lancer le backend dans le dossier `backend`.
2. Dans un autre terminal, lancer :

```bash
ngrok http 4000
```

3. Copier l'adresse HTTPS fournie par ngrok.
4. Dans la console Meta, ouvrir les paramètres de l'application et la configuration Messenger.
5. Renseigner l'URL de rappel :

```text
https://ADRESSE-NGROK/webhook
```

6. Renseigner le même token de vérification que celui configuré dans `META_VERIFY_TOKEN`.
7. Associer la Page Facebook de test et configurer les abonnements aux événements nécessaires.

Avec la version gratuite de ngrok, l'adresse peut changer à chaque lancement du tunnel. Il faut alors mettre à jour l'URL dans la console Meta.

## Modèle de données

Le schéma Prisma (`backend/prisma/schema.prisma`) comprend notamment les entités suivantes :

- **Product** : informations sur les produits, prix et stock.
- **LiveSession** : sessions de vente en direct.
- **Comment** : commentaires reçus pendant un Live.
- **Order** : commandes et leur statut (`PENDING`, `CONFIRMED`, `PAID`, `CANCELLED`).

## Vérifications effectuées

Les vérifications suivantes ont été réalisées sur la version actuelle :

- Vérification TypeScript du backend avec `npx tsc --noEmit`.
- Vérification du frontend avec `npm run lint`.
- Compilation du frontend avec `npm run build`.
- Vérification de la disponibilité du backend avec `/health`.
- Récupération des produits et des commandes depuis l'API.
- Vérification de l'affichage des données dans le dashboard.

## Prochaines étapes

Les travaux à poursuivre comprennent :

- Finaliser et tester le moteur d'analyse automatique des commentaires Facebook Live.
- Améliorer l'identification des produits à partir des commentaires.
- Mettre en place et valider l'attribution dynamique des stocks.
- Poursuivre l'automatisation des échanges Messenger pour finaliser les commandes.
- Effectuer des tests complets dans des conditions réelles de vente.
- Améliorer la stabilité, la sécurité et la documentation de l'application.
- Préparer la livraison du projet.

## Limites connues

- Le tunnel ngrok est utilisé pour le développement et les tests.
- L'utilisation en production nécessite une configuration adaptée de Meta.
- La validation de l'application Meta et l'obtention des permissions nécessaires seront requises pour certaines fonctionnalités en production.
- Les fonctionnalités avancées d'automatisation doivent encore être finalisées et testées.

## Auteur

**RAZAFIMAHALEO Rojotiana**  
Étudiant en L3 à l'École Nationale d'Informatique (ENI), Université de Fianarantsoa.

**Encadreur professionnel :** Robert Samson RAKOTOARISON, gérant de Honey Group Madagascar.
