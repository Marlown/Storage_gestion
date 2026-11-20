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

> **Base déjà existante, ou après un `git pull` qui modifie `schema.sql` :** relancez le schéma.
> Il est rejouable sans risque (il n'ajoute que ce qui manque) :
> ```bash
> docker exec -i stock-postgres psql -U stock_user -d stock_db < backend/db/schema.sql
> ```

## API

| Méthode | Route                       | Description                         |
|---------|-----------------------------|-------------------------------------|
| GET     | `/api/products`             | Liste des produits                  |
| POST    | `/api/products`             | Créer un produit (`name`, `sku`, `quantity` = stock initial, tracé en mouvement, `minQuantity` = seuil d'alerte) |
| PUT     | `/api/products/:id`         | Modifier nom, SKU, seuil d'alerte (la quantité passe par les mouvements) |
| DELETE  | `/api/products/:id`         | Supprimer un produit (et ses mouvements) |
| GET     | `/api/stocks/movements`     | Historique (`?productId=` optionnel) |
| POST    | `/api/stocks/movements`     | Entrée/sortie (`productId`, `type` IN/OUT, `quantity`, `reason`) |
| POST    | `/api/stocks/inventory`     | Inventaire (`productId`, `countedQuantity`, `note`) : crée l'ajustement de l'écart |

## Métriques métier (Prometheus)

- `stock_products_count` : nombre de produits
- `stock_products_low_count` : produits en rupture ou sous leur seuil d'alerte
