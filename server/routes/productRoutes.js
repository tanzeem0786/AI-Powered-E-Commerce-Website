import express from 'express';
import { isAuthenticated, isAuthorized } from '../middlewares/authMiddleware.js';
import { 
    createProduct,
    deleteProduct, 
    deleteReview, 
    fetchAIFilteredProducts, 
    fetchAllProducts, 
    fetchSingleProduct, 
    postProductReview, 
    updateProduct,    
} from '../controllers/productController.js';

const router = express.Router();

router.post("/admin/create",isAuthenticated, isAuthorized("Admin"), createProduct);

router.get("/",isAuthenticated, fetchAllProducts);

router.put("/admin/update/:productId",isAuthenticated, isAuthorized("Admin"), updateProduct);

router.delete("/admin/delete/:productId",isAuthenticated, isAuthorized("Admin"), deleteProduct);

router.get("/singleProduct/:productId", isAuthenticated, fetchSingleProduct);

router.put("/post-new/review/:productId", isAuthenticated, postProductReview);

router.delete("/delete/review/:productId", isAuthenticated, deleteReview);

router.post("/ai-search", isAuthenticated, fetchAIFilteredProducts);

export default router;