const express = require('express');
const router = express.Router();
const { createOrder, getOrders, getOrderById, deleteOrder } = require('../controllers/orderController');

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.delete('/:id', deleteOrder);

module.exports = router;
