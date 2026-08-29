const router = require('express').Router();

const {
  createList,
  getMyLists,
  getListById,
  inviteMember,
  updateMemberRole,
  removeMember,
  searchInList,
  updateList,
  deleteList,
} = require('../controllers/lists.controller');

const {
  requireAuth,
  requireListRole,
} = require('../middleware/auth');
const { exportList, importList } = require('../controllers/transfer.controller');

router.use(requireAuth);

// Lists
router.post('/', createList);
router.get('/', getMyLists);
router.get('/:listId/export', requireListRole('creator', 'editor', 'reader', 'commentator'), exportList);
router.post('/:listId/import', requireListRole('creator', 'editor'), importList);
router.get('/:listId/search', requireListRole('creator', 'editor', 'reader', 'commentator'), searchInList);
router.put('/:listId', requireListRole('creator'), updateList);
router.delete('/:listId', requireListRole('creator'), deleteList);
router.get('/:listId', getListById);

// Members
// Seul le créateur peut gérer les membres.
router.post(
  '/:listId/members',
  requireListRole('creator'),
  inviteMember
);

router.put(
  '/:listId/members/:userId',
  requireListRole('creator'),
  updateMemberRole
);

router.delete(
  '/:listId/members/:userId',
  requireListRole('creator'),
  removeMember
);

module.exports = router;
