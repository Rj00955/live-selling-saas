import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "./db.js";
import {
  findProductByCode,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./product-service.js";

const productCodeSchema = z.object({
  code: z.string().trim().min(1, "Code produit obligatoire."),
});

const productIdSchema = z.object({
  id: z.string().trim().min(1, "Identifiant produit obligatoire."),
});

const createProductSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
}).strict();

const updateProductSchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  price: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  "Au moins un champ doit être fourni.",
);

function areDevProductRoutesEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_DEV_PRODUCT_ROUTES === "true"
  );
}

export const productRoutes: FastifyPluginAsync = async (app) => {
  // Lister les produits
  app.get("/products", async () => {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      count: products.length,
      products,
    };
  });

  // Rechercher un produit par son code
  app.get<{ Params: { code: string } }>(
    "/products/:code",
    async (request, reply) => {
      const parsed = productCodeSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          message: "Code produit invalide.",
        });
      }

      const product = await findProductByCode(parsed.data.code);

      if (!product) {
        return reply.code(404).send({
          success: false,
          message: "Produit introuvable.",
        });
      }

      return { success: true, product };
    },
  );

  // Ajouter un produit
  app.post("/products", async (request, reply) => {
    if (!areDevProductRoutesEnabled()) {
      return reply.code(403).send({
        success: false,
        message: "Ajout de produits désactivé.",
      });
    }

    const parsed = createProductSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        message: "Données du produit invalides.",
        errors: parsed.error.issues,
      });
    }

    try {
      const product = await createProduct(parsed.data);

      return reply.code(201).send({
        success: true,
        message: "Produit créé avec succès.",
        product,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return reply.code(409).send({
          success: false,
          message: "Ce code produit existe déjà.",
        });
      }

      throw error;
    }
  });

  // Modifier un produit
  app.patch<{ Params: { id: string } }>(
    "/products/:id",
    async (request, reply) => {
      if (!areDevProductRoutesEnabled()) {
        return reply.code(403).send({
          success: false,
          message: "Modification de produits désactivée.",
        });
      }

      const parsedParams = productIdSchema.safeParse(request.params);
      const parsedBody = updateProductSchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({
          success: false,
          message: "Données de modification invalides.",
        });
      }

      try {
        const product = await updateProduct(
          parsedParams.data.id,
          parsedBody.data,
        );

        return reply.code(200).send({
          success: true,
          message: "Produit modifié avec succès.",
          product,
        });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error
        ) {
          if (error.code === "P2025") {
            return reply.code(404).send({
              success: false,
              message: "Produit introuvable.",
            });
          }

          if (error.code === "P2002") {
            return reply.code(409).send({
              success: false,
              message: "Ce code produit existe déjà.",
            });
          }
        }

        throw error;
      }
    },
  );

  // Supprimer un produit
  app.delete<{ Params: { id: string } }>(
    "/products/:id",
    async (request, reply) => {
      if (!areDevProductRoutesEnabled()) {
        return reply.code(403).send({
          success: false,
          message: "Suppression de produits désactivée.",
        });
      }

      const parsedParams = productIdSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.code(400).send({
          success: false,
          message: "Identifiant produit invalide.",
        });
      }

      try {
        const product = await deleteProduct(parsedParams.data.id);

        return reply.code(200).send({
          success: true,
          message: "Produit supprimé avec succès.",
          product,
        });
      }
       
             catch (error) {
        if (typeof error === "object" && error !== null) {
          const err = error as {
            code?: string;
            message?: string;
            meta?: {
              code?: string;
            };
          };

          if (err.code === "P2025") {
            return reply.code(404).send({
              success: false,
              message: "Produit introuvable.",
            });
          }

          if (
            err.code === "P2003" ||
            err.meta?.code === "23001" ||
            err.message?.includes("violates RESTRICT setting of foreign key")
          ) {
            return reply.code(409).send({
              success: false,
              message:
                "Ce produit est déjà associé à une ou plusieurs commandes. Pour conserver l'historique des ventes, il ne peut pas être supprimé.",
            });
          }
        }

        request.log.error(error);
        return reply.code(500).send({
          success: false,
          message: "Une erreur est survenue lors de la suppression du produit.",
        });
      }
    },
  );
};
