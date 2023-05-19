/* -------------------Logique métier niveau sauce------------------------------- */

const Sauce = require("../models/sauce");
const fs = require("fs");

/* Créer une sauce */
exports.createSauce = (req, res, next) => {
  console.log(req.body.sauce);
  const sauceObject = JSON.parse(req.body.sauce);
  delete sauceObject._id;
  delete sauceObject._userId;
  const sauce = new Sauce({
    ...sauceObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
  });

  sauce
    .save()
    .then(() => {
      res.status(201).json({ message: "Objet enregistré !" });
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

/* -----------------------Afficher une sauce précise----------------------------------- */
exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({
    _id: req.params.id,
  })
    .then((sauce) => {
      res.status(200).json(sauce);
    })
    .catch((error) => {
      res.status(404).json({
        error: error,
      });
    });
};

/* -------------------------------Modifier sauce------------------------------------ */
exports.modifySauce = (req, res, next) => {
  const sauceObject = req.file
    ? {
        ...JSON.parse(req.body.sauce),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          req.file.filename
        }`,
      }
    : { ...req.body };

  delete sauceObject._userId;
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        Sauce.updateOne(
          { _id: req.params.id },
          { ...sauceObject, _id: req.params.id }
        )
          .then(() => res.status(200).json({ message: "Objet modifié!" }))
          .catch((error) => res.status(401).json({ error }));
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

/* -------------------------------------Supprimer sauce-------------------------------- */
exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        const filename = sauce.imageUrl.split("/images/")[1];
        fs.unlink(`images/${filename}`, () => {
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => {
              res.status(200).json({ message: "Objet supprimé !" });
            })
            .catch((error) => res.status(401).json({ error }));
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

/* ----------------------------------Afficher toutes les sauces------------------------------- */
exports.getAllSauce = (req, res, next) => {
  Sauce.find()
    .then((sauces) => {
      res.status(200).json(sauces);
    })
    .catch((error) => {
      res.status(400).json({
        error: error,
      });
    });
};

/* --------------------------------Système like et dislike sauce-------------------------------- */
exports.likeSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      /* Vérifier si user a déjà liké ou pas */

      if (req.body.like === 1) {
        if (sauce.usersLiked.includes(req.auth.userId)) {
          res.status(400).json({ error: "Avis déjà pris en compte" });
          return;
        }
        /* Verifier si dislike existant */
        if (sauce.usersDisliked.includes(req.auth.userId)) {
          Sauce.updateOne(
            {
              _id: req.params.id,
            },
            /* Retirer le dislike et l'userId de l'array usersDisliked */
            {
              $inc: { dislikes: -1 },
              $pull: { usersDisliked: req.auth.userId },
            }
          )
            .then((sauce) => {
              res.status(201).json({ message: "Dislike supprimé" });
            })
            .catch((error) => res.status(400).json({ error }));
        } else {
          /* Si user like */
          Sauce.updateOne(
            {
              _id: req.params.id,
            },
            /* Ajouter un like et l'userId dans l'Array usersLiked */
            {
              $inc: { likes: 1 },
              $push: { usersLiked: req.auth.userId },
            }
          )
            .then((sauce) => res.status(201).json({ message: "Like sauce" }))
            .catch((error) => res.status(400).json({ error }));
        }
      }

      if (req.body.like === -1) {
        if (sauce.usersDisliked.includes(req.auth.userId)) {
          res.status(400).json({ error: "Avis déjà pris en compte" });
          return;
        }

        /* Vérifier si like existant */
        if (sauce.usersLiked.includes(req.auth.userId)) {
          Sauce.updateOne(
            {
              _id: req.params.id,
            },
            {
              $inc: { likes: -1 },
              $pull: { usersLiked: req.auth.userId },
            }
          )
            .then((sauce) => {
              res.status(201).json({ message: "Like supprimé" });
            })
            .catch((error) => res.status(400).json({ error }));
        } else {
          /* User dislike la sauce */
          Sauce.updateOne(
            {
              _id: req.params.id,
            },
            {
              $inc: { dislikes: 1 },
              $push: { usersDisliked: req.auth.userId },
            }
          )
            .then((sauce) => res.status(201).json({ message: "Dislike sauce" }))
            .catch((error) => res.status(400).json({ error }));
        }
      }

      /* Annuler le like */
      if (req.body.like === 0) {
        if (sauce.usersLiked.includes(req.auth.userId)) {
          Sauce.updateOne(
            {
              _id: req.params.id,
            },
            {
              $inc: { likes: -1 },
              $pull: { usersLiked: req.auth.userId },
            }
          )
            .then((sauce) => {
              res.status(201).json({ message: "Like supprimé" });
            })
            .catch((error) => res.status(400).json({ error }));
        } else if (sauce.usersDisliked.includes(req.auth.userId)) {
          /* Annuler le Dislike */
          Sauce.updateOne(
            {
              _id: req.params.id,
            },
            {
              $inc: { dislikes: -1 },
              $pull: { usersDisliked: req.auth.userId },
            }
          )
            .then((sauce) => {
              res.status(201).json({ message: "Dislike supprimé" });
            })
            .catch((error) => res.status(400).json({ error }));
        }
      }
    })
    .catch((error) => res.status(400).json({ error }));
};
