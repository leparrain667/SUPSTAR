const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const placesService = require('../services/places.service');
const { optionalNumber, optionalStatus } = require('../utils/queryValidation');
const { createNotification } = require('../services/notifications.service');

const VALID_MEMBER_ROLES = [
  'editor',
  'commentator',
  'reader',
];

/*
 * CREATE LIST
 */
const createList = asyncHandler(async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const description = req.body.description == null ? null : String(req.body.description).trim();

  if (!name || name.length > 150) throw new AppError('Nom de liste invalide', 400);
  if (description && description.length > 2000) throw new AppError('Description trop longue', 400);

  const list = await prisma.list.create({
    data: {
      name,
      description,
      ownerId: req.user.id,
      members: {
        create: {
          userId: req.user.id,
          role: 'creator',
        },
      },
    },
  });

  res.status(201).json({ list });
});

/*
 * GET MY LISTS
 */
const getMyLists = asyncHandler(async (req, res) => {
  const lists = await prisma.list.findMany({
    where: {
      members: {
        some: {
          userId: req.user.id,
        },
      },
    },
    include: {
      _count: {
        select: {
          places: true,
          members: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({ lists });
});

const updateList = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = req.body.description == null ? null : String(req.body.description).trim();
  if (!name || name.length > 150) throw new AppError('Nom de liste invalide', 400);
  if (description && description.length > 2000) throw new AppError('Description trop longue', 400);
  const list = await prisma.list.update({
    where: { id: req.params.listId },
    data: { name, description },
  });
  res.json({ list });
});

const deleteList = asyncHandler(async (req, res) => {
  const list = await prisma.list.findUnique({ where: { id: req.params.listId } });
  if (!list) throw new AppError('Liste non trouvée', 404);
  if (list.isPersonal) throw new AppError('La liste personnelle ne peut pas être supprimée', 403);
  await prisma.list.delete({ where: { id: list.id } });
  res.status(204).send();
});

/*
 * GET ONE LIST
 *
 * Retourne également les membres et le rôle
 * de l'utilisateur connecté.
 */
const getListById = asyncHandler(async (req, res) => {
  const { listId } = req.params;

  const membership = await prisma.listMember.findUnique({
    where: {
      listId_userId: {
        listId,
        userId: req.user.id,
      },
    },
  });

  if (!membership) {
    throw new AppError(
      'Liste non trouvée ou accès interdit',
      404
    );
  }

  const list = await prisma.list.findUnique({
    where: {
      id: listId,
    },
    include: {
      owner: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },

      members: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },

      _count: {
        select: {
          places: true,
          members: true,
        },
      },
    },
  });

  if (!list) {
    throw new AppError(
      'Liste non trouvée',
      404
    );
  }

  res.json({
    list,
    role: membership.role,
  });
});

/*
 * INVITE / ADD MEMBER
 *
 * L'utilisateur doit déjà avoir un compte SUPSTAR.
 */
const inviteMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const { listId } = req.params;

  if (!email || !email.trim()) {
    throw new AppError(
      'Adresse email requise',
      400
    );
  }

  if (!VALID_MEMBER_ROLES.includes(role)) {
    throw new AppError(
      'Rôle invalide',
      400
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase(),
    },
  });

  if (!user) {
    throw new AppError(
      'Utilisateur non trouvé. Il doit d’abord créer un compte SUPSTAR.',
      404
    );
  }

  /*
   * Le créateur ne doit pas pouvoir être ajouté
   * comme un deuxième membre avec un autre rôle.
   */
  const existingMember =
    await prisma.listMember.findUnique({
      where: {
        listId_userId: {
          listId,
          userId: user.id,
        },
      },
    });

  if (existingMember) {
    throw new AppError(
      'Cet utilisateur est déjà membre de la liste.',
      409
    );
  }

  const member =
    await prisma.listMember.create({
      data: {
        listId,
        userId: user.id,
        role,
      },

      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

  const list = await prisma.list.findUnique({ where: { id: listId }, select: { name: true } });
  await createNotification({
    userId: user.id,
    type: 'list_invitation',
    title: 'Vous avez rejoint une liste',
    message: `Vous avez été ajouté à « ${list?.name || 'une liste'} » avec le rôle ${role}.`,
    data: { listId },
  });

  res.status(201).json({
    message: 'Membre ajouté avec succès.',
    member,
  });
});

/*
 * UPDATE MEMBER ROLE
 */
const updateMemberRole = asyncHandler(
  async (req, res) => {
    const { listId, userId } = req.params;
    const { role } = req.body;

    if (!VALID_MEMBER_ROLES.includes(role)) {
      throw new AppError(
        'Rôle invalide',
        400
      );
    }

    const member =
      await prisma.listMember.findUnique({
        where: {
          listId_userId: {
            listId,
            userId,
          },
        },
      });

    if (!member) {
      throw new AppError(
        'Membre non trouvé',
        404
      );
    }

    /*
     * Protection supplémentaire :
     * le créateur ne peut jamais être transformé
     * en editor/commentator/reader.
     */
    if (member.role === 'creator') {
      throw new AppError(
        'Le rôle du créateur ne peut pas être modifié.',
        403
      );
    }

    const updatedMember =
      await prisma.listMember.update({
        where: {
          listId_userId: {
            listId,
            userId,
          },
        },

        data: {
          role,
        },

        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

    const list = await prisma.list.findUnique({ where: { id: listId }, select: { name: true } });
    await createNotification({
      userId,
      type: 'role_changed',
      title: 'Votre rôle a changé',
      message: `Votre rôle dans « ${list?.name || 'une liste'} » est maintenant ${role}.`,
      data: { listId },
    });

    res.json({
      message: 'Rôle modifié avec succès.',
      member: updatedMember,
    });
  }
);

/*
 * REMOVE MEMBER
 */
const removeMember = asyncHandler(
  async (req, res) => {
    const { listId, userId } = req.params;

    const member =
      await prisma.listMember.findUnique({
        where: {
          listId_userId: {
            listId,
            userId,
          },
        },
      });

    if (!member) {
      throw new AppError(
        'Membre non trouvé',
        404
      );
    }

    /*
     * Le créateur ne peut pas être retiré.
     */
    if (member.role === 'creator') {
      throw new AppError(
        'Le créateur de la liste ne peut pas être retiré.',
        403
      );
    }

    await prisma.listMember.delete({
      where: {
        listId_userId: {
          listId,
          userId,
        },
      },
    });

    const list = await prisma.list.findUnique({ where: { id: listId }, select: { name: true } });
    await createNotification({
      userId,
      type: 'removed_from_list',
      title: 'Vous avez été retiré d’une liste',
      message: `Vous n’avez plus accès à « ${list?.name || 'cette liste'} ».`,
      data: { listId },
    });

    res.json({
      message: 'Membre retiré avec succès.',
    });
  }
);

/*
 * SEARCH IN LIST
 */
const searchInList = asyncHandler(
  async (req, res) => {
    const {
      q,
      category,
      minRating,
    } = req.query;

    const places = await placesService.findByList({
      listId: req.params.listId,
      categoryId: optionalNumber(category, 'Catégorie', { integer: true, min: 1 }),
      city: req.query.city,
      minRating: optionalNumber(minRating, 'Note minimale', { min: 0, max: 5 }),
      maxPrice: optionalNumber(req.query.maxPrice, 'Prix maximum', { min: 0 }),
      status: optionalStatus(req.query.status),
      search: q,
      userId: req.user.id,
    });

    res.json({ places });
  }
);

module.exports = {
  createList,
  getMyLists,
  getListById,
  inviteMember,
  updateMemberRole,
  removeMember,
  searchInList,
  updateList,
  deleteList,
};
