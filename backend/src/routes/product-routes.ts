
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../config/db.js";
import {
  findProductByCode,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../services/product-service.js";

const productCodeSchema = z.object({
  code: z.string().trim().min(1, "Code produit obligatoire."),
});

const productIdSchema = z.object({
  id: z.string().trim().min(1, "Identifiant produit obligatoire."),
});

const variantSchema = z.object({
  size: z.string().trim().min(1).nullable().optional(),
  color: z.string().trim().min(1).nullable().optional(),
  stock: z.number().int().min(0),
}).strict();

const createProductSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
  hasVariants: z.boolean().optional(),
  variants: z.array(variantSchema).optional(),
}).strict();

const updateProductSchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  price: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
  variants: z.array(variantSchema).optional(),
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

function isPrismaError(
  error: unknown,
): error is { code: string; message?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}

// Liste explicite des erreurs de validation connues
// provenant de product-service.ts.
const PRODUCT_VALIDATION_MESSAGES = new Set([
  "Au moins une variante est obligatoire.",
  "Chaque variante doit avoir une taille ou une couleur.",
  "Le stock de chaque variante doit être positif ou nul.",
  "Toutes les variantes doivent utiliser les mêmes dimensions.",
  "Deux variantes ont la même combinaison.",
  "Le code produit est obligatoire.",
  "Le nom du produit est obligatoire.",
  "Le prix doit être un entier positif.",
  "Le stock doit être un entier positif ou nul.",
  "Le stock global doit être égal à zéro pour un produit avec variantes.",
  "Un produit simple ne peut pas contenir de variantes.",
  "Modifie le stock des variantes, pas le stock global du produit.",
  "Les dimensions des variantes ne peuvent pas être modifiées.",
  "Certaines variantes existantes sont absentes. Leur suppression doit être explicite.",
  "Un produit simple ne peut pas recevoir de variantes sans conversion explicite.",
]);

function isProductValidationError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    PRODUCT_VALIDATION_MESSAGES.has(error.message)
  );
}

export const productRoutes: FastifyPluginAsync = async (app) => {
  // Protection commune à toutes les routes produits.
  // Ces routes restent accessibles uniquement en développement
  // lorsque ENABLE_DEV_PRODUCT_ROUTES=true.
  app.addHook("preHandler", async (_request, reply) => {
    if (!areDevProductRoutesEnabled()) {
      return reply.code(403).send({
        success: false,
        message: "Routes produits désactivées.",
      });
    }
  });

  // Lister les produits avec leurs variantes.
  app.get("/products", async () => {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      count: products.length,
      products,
    };
  });

  // Rechercher un produit par son code.
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

      return {
        success: true,
        product,
      };
    },
  );

  // Ajouter un produit simple ou avec variantes.
  app.post("/products", async (request, reply) => {
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
      if (isPrismaError(error) && error.code === "P2002") {
        return reply.code(409).send({
          success: false,
          message: "Ce code produit existe déjà.",
        });
      }

      if (isProductValidationError(error)) {
        return reply.code(400).send({
          success: false,
          message: error.message,
        });
      }

      throw error;
    }
  });

  // Modifier un produit et éventuellement ses stocks de variantes.
  app.patch<{ Params: { id: string } }>(
    "/products/:id",
    async (request, reply) => {
      const parsedParams = productIdSchema.safeParse(request.params);
      const parsedBody = updateProductSchema.safeParse(request.body);

      if (!parsedParams.success || !parsedBody.success) {
        return reply.code(400).send({
          success: false,
          message: "Données de modification invalides.",
          errors: !parsedParams.success
            ? parsedParams.error.issues
            : !parsedBody.success
              ? parsedBody.error.issues
              : undefined,
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
          error instanceof Error &&
          error.message === "PRODUCT_NOT_FOUND"
        ) {
          return reply.code(404).send({
            success: false,
            message: "Produit introuvable.",
          });
        }

        if (isPrismaError(error) && error.code === "P2002") {
          return reply.code(409).send({
            success: false,
            message: "Ce code produit existe déjà.",
          });
        }

        if (isProductValidationError(error)) {
          return reply.code(400).send({
            success: false,
            message: error.message,
          });
        }

        throw error;
      }
    },
  );

  // Supprimer un produit sans compromettre son historique.
  app.delete<{ Params: { id: string } }>(
    "/products/:id",
    async (request, reply) => {
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
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "PRODUCT_NOT_FOUND"
        ) {
          return reply.code(404).send({
            success: false,
            message: "Produit introuvable.",
          });
        }

        if (
          error instanceof Error &&
          error.message === "PRODUCT_HAS_HISTORY"
        ) {
          return reply.code(409).send({
            success: false,
            message:
              "Ce produit possède un historique de stock ou de commandes et ne peut pas être supprimé.",
          });
        }

        if (isPrismaError(error) && error.code === "P2003") {
          return reply.code(409).send({
            success: false,
            message:
              "Ce produit est associé à des données qui empêchent sa suppression.",
          });
        }

        request.log.error(
          { error },
          "Product deletion failed",
        );

        throw error;
      }
    },
  );
};
