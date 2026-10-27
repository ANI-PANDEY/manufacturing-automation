const express = require('express');
const router = express.Router();
const {
  createOrder,
  bulkImportOrders,
  getOrders,
  getOrderById,
  deleteOrder,
} = require('../controllers/orderController');

router.post('/', createOrder);
router.post('/bulk-import', bulkImportOrders);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.delete('/:id', deleteOrder);

module.exports = router;
