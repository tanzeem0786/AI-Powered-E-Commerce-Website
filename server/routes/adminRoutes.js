import express from 'express';
import { isAuthenticated, isAuthorized } from '../middlewares/authMiddleware.js';
import { 
    dashboardStats,
    deleteUser,
    getAllUsers,
} from '../controllers/adminController.js';


const router = express.Router();

//  DASHBOARD

router.get("/getallusers", isAuthenticated, isAuthorized("Admin"), getAllUsers); 

router.delete("/delete/:id", isAuthenticated, isAuthorized("Admin"),deleteUser);

router.get("/fetch/dashboard-stats", isAuthenticated, isAuthorized("Admin"), dashboardStats);


export default router;