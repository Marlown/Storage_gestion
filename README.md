# Storage_gestion

Application web de gestion de stock (quantité et qualité) pour une distribution plus efficace.

- **backend/** : API Node.js / Express + PostgreSQL, métriques Prometheus sur `/metrics`
- **frontend/** : interface React (Vite)
- **docker-compose.yml** : PostgreSQL, Prometheus et Grafana

## Démarrage rapide

1. Lancer l'infrastructure (le schéma `backend/db/schema.sql` est appliqué au premier démarrage de Postgres) :
   ```bash
   docker compose up -d
   ```
2. Lancer l'API :
   ```bash
   cd backend && cp .env.example .env && npm install && npm run dev
   ```
3. Lancer le frontend :
   ```bash
   cd frontend && cp .env.example .env && npm install && npm run dev
   ```

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:5173        |
| API        | http://localhost:3000        |
| Santé API  | http://localhost:3000/health |
| Prometheus | http://localhost:9090        |
| Grafana    | http://localhost:3001 (admin / admin) |

> Base déjà créée avant l'ajout du schéma ? Appliquez-le à la main :
> `psql -h localhost -U stock_user -d stock_db -f backend/db/schema.sql`

## API

| Méthode | Route                       | Description                         |
|---------|-----------------------------|-------------------------------------|
| GET     | `/api/products`             | Liste des produits                  |
| POST    | `/api/products`             | Créer un produit (`name`, `sku`, `quantity`) |
| PUT     | `/api/products/:id`         | Modifier un produit                 |
| DELETE  | `/api/products/:id`         | Supprimer un produit (et ses mouvements) |
| GET     | `/api/stocks/movements`     | Historique (`?productId=` optionnel) |
| POST    | `/api/stocks/movements`     | Entrée/sortie (`productId`, `type` IN/OUT, `quantity`, `reason`) |
