# Suivi de Projet — Dashboard OCP

Application web de suivi et de gestion de tâches organisées par rubriques, avec visualisation de l'avancement, gestion documentaire et planification (Gantt / calendrier).

## Aperçu

Ce projet est un tableau de bord (dashboard) permettant à une équipe de :
- Suivre l'avancement global d'un projet, réparti par **rubriques** (catégories de tâches).
- Visualiser la charge de travail par **responsable**.
- Gérer les **documents** attachés à chaque tâche (PDF, images...).
- Consulter un **planning Gantt** imprimable, avec vue par rubrique.
- Naviguer les tâches via un **calendrier** mensuel.
- Filtrer, éditer et supprimer des tâches depuis une table centralisée.

## Fonctionnalités principales

### 🏠 Dashboard (`Dashboard.jsx`)
- Statistiques clés : rubriques actives, tâches terminées, en attente, en retard.
- Graphique en anneau (donut) de répartition des statuts.
- Barres d'avancement par rubrique.
- Graphique en barres de charge par rubrique (à faire / terminées / en retard).
- Vue de charge de travail par membre de l'équipe (avec avatars).

### ✅ Toutes les tâches (`Tasks.jsx`)
- Table complète des tâches avec filtres par **rubrique** et **statut** (terminée / à faire / en retard).
- Édition (`TaskEditModal`) et suppression (avec confirmation) des tâches.
- Gestion des documents attachés directement depuis la table.
- Lien rapide vers la vue Gantt.

### 📁 Fichiers (`Files.jsx`)
- Vue des documents regroupés par rubrique, avec rubriques repliables/dépliables.
- Compteur de documents par rubrique et au global.
- Filtre "afficher uniquement les tâches avec documents".

### 📅 Calendrier
- Vue mensuelle avec indicateurs visuels (pastilles) par statut de tâche (terminé / à faire / en retard).
- Panneau latéral affichant les tâches du jour sélectionné.

### 📊 Gantt
- Vue Gantt avec bandes par rubrique, ligne "aujourd'hui", et popover de détails au clic.
- Export/impression paginée (une page par rubrique).

## Structure technique

- **Frontend** : React (hooks `useState`, `useEffect`, `useMemo`), React Router (`react-router-dom`), icônes `react-icons/fi`.
- **Style** : CSS avec variables personnalisées (`--ocp-green`, `--text-dark`, `--radius-card`, etc.), thème vert (couleurs OCP).
- **API** : communication via `fetchWithAuth` (utilitaire d'authentification) vers l'endpoint `/tasks`.
- **Composants réutilisables** :
  - `DashboardLayout` — mise en page commune (sidebar + contenu).
  - `StatCard`, `DonutChart`, `BarChart`, `Avatar` — visualisations.
  - `TaskDocuments` — gestion de l'upload/suppression de documents liés à une tâche.
  - `TaskEditModal`, `ConfirmDialog` — modales d'édition et de confirmation.

## Modèle de données (Tâche)

Chaque tâche possède (entre autres) les champs suivants :
- `rubrique` — catégorie de la tâche
- `task` — nom de la tâche
- `responsable` — personne assignée
- `dateDebut`, `dateFin`, `dateFinReelle` — dates de suivi
- `ponderation` — poids de la tâche dans le calcul de l'avancement pondéré
- `progress` — avancement (0 à 1)
- `documents` — liste des fichiers attachés

## Statuts

| Statut     | Condition                                              |
|------------|---------------------------------------------------------|
| Terminée   | `progress === 1`                                        |
| En retard  | `progress !== 1` et `dateFin` dépassée                   |
| À faire    | Aucune des conditions ci-dessus                          |

## Installation

```bash
npm install
npm run dev
```

## Licence

Projet interne — usage réservé.