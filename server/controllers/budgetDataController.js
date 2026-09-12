import Bac from "../models/Bac.js";
import Poste from "../models/Poste.js";
import Attachement from "../models/Attachement.js";

// GET /api/budget/data?projectId=...&bacId=...
export const getBudgetData = async (req, res) => {
  try {
    const { projectId } = req.query;
    let { bacId } = req.query;

    // =========================================================
    // 1. Vérification du projectId
    // =========================================================
    if (!projectId) {
      return res.status(400).json({
        message: "projectId requis",
      });
    }

    // =========================================================
    // 2. Récupérer les BAC du projet
    //    Une seule requête MongoDB
    // =========================================================
    const bacs = await Bac.find({ projectId })
      .sort({ nom: 1 })
      .lean();

    // Aucun BAC dans ce projet
    if (!bacs.length) {
      return res.json({
        bacId: null,
        bacNom: null,
        bacs: [],
        items: [],
        attachments: [],
      });
    }

    // =========================================================
    // 3. Si aucun bacId n'est fourni,
    //    prendre automatiquement le premier BAC
    // =========================================================
    if (!bacId) {
      bacId = bacs[0]._id.toString();
    }

    // =========================================================
    // 4. Vérifier que le BAC appartient bien au projet
    // =========================================================
    const bac = bacs.find(
      (b) => b._id.toString() === bacId
    );

    if (!bac) {
      return res.status(404).json({
        message: "Bac introuvable pour ce projet",
      });
    }

    // =========================================================
    // 5. Récupérer les postes du BAC
    // =========================================================
    const postes = await Poste.find({ bacId })
      .sort({ numero: 1 })
      .lean();

    const posteIds = postes.map((p) => p._id);

    // =========================================================
    // 6. Récupérer les attachements
    // =========================================================
    let attachementsDb = [];

    if (posteIds.length > 0) {
      attachementsDb = await Attachement.find({
        posteId: { $in: posteIds },
      })
        .sort({ numero: 1, date: 1 })
        .lean();
    }

    // =========================================================
    // 7. Regrouper les attachements par numéro
    // =========================================================
    const numeroGroups = {};

    attachementsDb.forEach((att) => {
      if (!numeroGroups[att.numero]) {
        numeroGroups[att.numero] = [];
      }

      numeroGroups[att.numero].push(att);
    });

    // =========================================================
    // 8. Construire la liste des attachements
    // =========================================================
    const attachments = Object.keys(numeroGroups)
      .map(Number)
      .sort((a, b) => a - b)
      .map((numero) => {
        const group = numeroGroups[numero];

        const dates = group
          .map((a) => a.date)
          .filter(Boolean);

        const earliestDate =
          dates.length > 0
            ? new Date(
                Math.min(
                  ...dates.map((d) => new Date(d))
                )
              )
            : null;

        const allRealise = group.every(
          (a) => a.statut === "realise"
        );

        return {
          id: `att-${numero}`,
          numero,
          name: `Attachement ${numero}`,
          date: earliestDate,
          status: allRealise ? "realise" : "planned",
        };
      });

    // =========================================================
    // 9. Créer une Map des attachements par poste
    //    Cela évite de refaire .filter() plusieurs fois
    // =========================================================
    const attachmentsByPoste = new Map();

    for (const att of attachementsDb) {
      const posteKey = att.posteId.toString();

      if (!attachmentsByPoste.has(posteKey)) {
        attachmentsByPoste.set(posteKey, new Map());
      }

      attachmentsByPoste
        .get(posteKey)
        .set(att.numero, att);
    }

    // =========================================================
    // 10. Construire les items du budget
    // =========================================================
    const items = postes.map((poste) => {
      const budgetHT =
        (poste.quantite || 0) *
        (poste.prixUnitaire || 0);

      const posteAttachements =
        attachmentsByPoste.get(
          poste._id.toString()
        ) || new Map();

      const percentages = {};
      const attachementIds = {};
      const realise = {};

      // -------------------------------------------------------
      // Pour chaque attachement
      // -------------------------------------------------------
      attachments.forEach((att) => {
        const match = posteAttachements.get(
          att.numero
        );

        attachementIds[att.id] = match
          ? match._id.toString()
          : null;

        realise[att.id] = match
          ? match.statut === "realise"
          : false;

        // Aucun attachement pour ce poste
        if (!match) {
          percentages[att.id] = 0;
          return;
        }

        // Pourcentage renseigné
        if (match.pourcentage != null) {
          percentages[att.id] =
            match.pourcentage / 100;
        }

        // Montant manuel renseigné
        else if (
          match.montantHTManuel != null &&
          budgetHT > 0
        ) {
          percentages[att.id] = Math.min(
            match.montantHTManuel / budgetHT,
            1
          );
        }

        // Aucun montant
        else {
          percentages[att.id] = 0;
        }
      });

      // -------------------------------------------------------
      // Documents
      // -------------------------------------------------------
      const documents = [];

      for (const a of posteAttachements.values()) {
        if (a.document) {
          documents.push({
            name: `Att. ${a.numero} - document`,
            url: a.document,
            uploadedAt: a.date,
          });
        }

        (a.photos || []).forEach((photo, i) => {
          documents.push({
            name: `Att. ${a.numero} - photo ${i + 1}`,
            url: photo,
            uploadedAt: a.date,
          });
        });
      }

      // -------------------------------------------------------
      // Objet final du poste
      // -------------------------------------------------------
      return {
        _id: poste._id,
        name: poste.designation,
        rubrique: poste.rubrique || "Autre",
        fullDescription: poste.designation,
        unit: poste.unite,
        quantity: poste.quantite,
        unitCost: poste.prixUnitaire,
        percentages,
        realise,
        attachementIds,
        documents,
      };
    });

    // =========================================================
    // 11. Réponse finale
    // =========================================================
    return res.json({
      bacId,
      bacNom: bac.nom,
      bacs: bacs.map((b) => ({
        _id: b._id,
        nom: b.nom,
      })),
      items,
      attachments,
    });
  } catch (err) {
    console.error(
      "❌ Erreur getBudgetData:",
      err
    );

    return res.status(500).json({
      message:
        "Erreur lors du chargement des données budget",
    });
  }
};