import express from 'express';
import { isAuthenticated, isAuthorized } from '../middlewares/authMiddleware.js';
import { 
    deleteOrder,
    fetchAllOrders,
    fetchMyOrders,
    fetchSingleOrder,
    placeNewOrder,
    updateOrderStatus,
 } from '../controllers/orderController.js';



const router = express.Router();

router.post("/new", isAuthenticated, placeNewOrder);
router.get("/:orderId", isAuthenticated, fetchSingleOrder);
router.get("/orders/me", isAuthenticated, fetchMyOrders);
router.get("/admin/get-all-orders", isAuthenticated,isAuthorized("Admin"), fetchAllOrders);
router.put("/admin/update/:orderId", isAuthenticated, isAuthorized("Admin"), updateOrderStatus);
router.delete("/admin/delete/:orderId", isAuthenticated, isAuthorized("Admin"), deleteOrder)

export default router;