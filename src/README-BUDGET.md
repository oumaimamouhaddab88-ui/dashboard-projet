# Module Budget — version ES Modules (compatible avec votre server.js)

## Ce qui a changé par rapport au premier zip

Votre backend utilise `import`/`export` (ES modules), pas `require`/`module.exports`
(CommonJS). Tous les fichiers backend ont été réécrits en conséquence :

- `models/Bac.js`, `models/Poste.js`, `models/Attachement.js`
- `controllers/budgetController.js` (renommé sans point, comme `taskRoutes.js`)
- `routes/budgetRoutes.js`
- `middleware/authMiddleware.js` (**à ignorer si vous avez déjà un middleware d'auth** — voir plus bas)
- `seed/seedBudget.js`
- `server.js` — **copie exacte du vôtre + les 2 lignes ajoutées**, à comparer et fusionner

Le frontend (`Budget.jsx`, `PosteDrawer.jsx`, `AttachementFormModal.jsx`, `BudgetCharts.jsx`,
`utils/budgetCalculations.js`, `budget.css`) est inchangé — React/JSX est déjà en ES modules,
rien à convertir de ce côté.

## Étapes exactes

### 1. Backend — copier les fichiers

```
backend/models/Bac.js
backend/models/Poste.js
backend/models/Attachement.js
backend/controllers/budgetController.js
backend/routes/budgetRoutes.js
backend/utils/budgetCalculations.js
backend/seed/seedBudget.js
backend/seed/rawData.json
```

**Concernant `middleware/authMiddleware.js`** : si vous avez déjà un fichier d'auth utilisé
par `taskRoutes.js` (souvent `middleware/auth.js` ou `middleware/verifyToken.js`), **utilisez
le vôtre** — remplacez juste cette ligne dans `budgetRoutes.js` :
```javascript
import { requireAuth } from "../middleware/authMiddleware.js";
```
par l'import de votre middleware existant (le nom de la fonction exportée peut différer,
adaptez `requireAuth` en conséquence dans tout le fichier). Si vous n'en avez pas, copiez
`middleware/authMiddleware.js` tel quel — il attend un JWT classique dans
`Authorization: Bearer <token>` et lit `process.env.JWT_SECRET` (renommez si votre `.env`
utilise un autre nom de variable, ex. `SECRET_KEY`).

### 2. Backend — créer le dossier d'upload

`budgetRoutes.js` écrit les documents/photos dans `backend/uploads/budget/`. Ce dossier
doit exister (Multer ne le crée pas automatiquement) :
```bash
mkdir -p backend/uploads/budget
```
Il est ensuite servi automatiquement par la ligne déjà présente dans votre `server.js` :
```javascript
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
```

### 3. Backend — modifier `server.js`

Deux lignes à ajouter (voir `server.js` fourni ici, identique au vôtre + ces 2 lignes) :
```javascript
import budgetRoutes from "./routes/budgetRoutes.js"; // en haut, avec les autres imports

app.use("/api/budget", budgetRoutes); // avec les autres app.use("/api/...")
```

### 4. Backend — lancer le seed

```bash
node backend/seed/seedBudget.js
```
Peuple **Bac 3** avec les 20 postes réels extraits de votre Excel (les 7 attachements/dates
d'origine). **Bac 10** est créé vide — dupliquez `rawData.json` avec ses vraies valeurs
quand vous les aurez.

### 5. Frontend — copier les fichiers (inchangé depuis la dernière fois)

```
src/pages/Budget.jsx
src/components/PosteDrawer.jsx
src/components/AttachementFormModal.jsx
src/components/BudgetCharts.jsx
src/utils/budgetCalculations.js
src/budget.css
```
Et dans `App.jsx`, la route `/budget` pointe vers `<Budget />` (déjà fait selon nos échanges
précédents).

## Vérification rapide

Une fois le serveur relancé :
```bash
curl -H "Authorization: Bearer VOTRE_TOKEN" http://localhost:5000/api/budget/bacs
```
doit renvoyer `[{"nom":"Bac 3",...},{"nom":"Bac 10",...}]` après le seed (et non plus un 404).
