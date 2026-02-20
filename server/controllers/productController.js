import database from "../database/db.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { v2 as cloudinary } from 'cloudinary';
import { filterKeywords } from "../utils/filterKeywords.js";
import { getAIRecommendation } from "../utils/getAIRecommendation.js";
import { priceConversion } from "../utils/priceConversion.js";

export const createProduct = catchAsyncErrors(async (req, res, next) => {
    const { name, description, price, category, stock } = req.body;
    const created_by = req.user.id;
    if (!name || !description || !price || !category || !stock) {
        return next(new ErrorHandler("Please Provide Complete Product Details!", 400));
    }
    const priceInPaise = priceConversion(price); // convert price in PAISE
    if (!priceInPaise) {
        return next(new ErrorHandler("Invalid Price. and Price Should be Greater Than 0 Rs.", 400));
    }

    let uploadedImages = [];
    if (req.files && req.files.images) {
        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        for (const image of images) {
            const result = await cloudinary.uploader.upload(image.tempFilePath, {
                folder: "Ecommerce_Product_images",
                width: 1000,
                crop: "scale",
            });
            uploadedImages.push({
                url: result.secure_url,
                public_id: result.public_id,
            });
        }
    }

    const product = await database.query(
        "INSERT INTO products (name, description, price, category, stock, images, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [name, description, priceInPaise, category, stock, JSON.stringify(uploadedImages), created_by]
    );

    res.status(201).json({
        success: true,
        message: "Product Created Successfull.",
        product: product.rows[0],
    });
});

export const fetchAllProducts = catchAsyncErrors(async (req, res, next) => {
    const { availability, price, category, ratings, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    let values = [];
    let index = 1;
    let paginationPlaceholders = {};

    //filter products by availability
    if (availability === "in-stock") {
        conditions.push("stock > 5");
    } else if (availability === "limited") {
        conditions.push("stock > 0 AND stock <=5");
    } else if (availability === "out-of-stock") {
        conditions.push("stock = 0");
    }

    //filter products by price

    if (price) {
        const [minPrice, maxPrice] = price.split("-");
        if (minPrice && maxPrice) {
            conditions.push(`price BETWEEN $${(index)} AND $${(index + 1)}`);
            values.push(minPrice, maxPrice);
            index += 2;
        }
    }

    //filter products by category
    if (category) {
        conditions.push(`category ILIKE $${index}`);
        values.push(`%${category}%`);
        index++;
    }

    //filter products by rating 
    if (ratings) {
        conditions.push(`ratings >= $${index}`);
        values.push(ratings);
        index++;
    }

    //Add Search query
    if (search) {
        conditions.push(`p.name ILIKE $${index} OR p.description ILIKE $${index}`);
        values.push(`%${search}%`);
        index++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    //Get count of filter products
    const totalProductsResult = await database.query(
        `SELECT COUNT(*) FROM products p ${whereClause}`,
        values
    );

    const totalProducts = parseInt(totalProductsResult.rows[0].count);

    paginationPlaceholders.limit = `$${index}`;
    values.push(limit);
    index++;

    paginationPlaceholders.offset = `$${index}`;
    values.push(offset);
    index++;

    //Fetch With Reviews
    const query = `SELECT p.*, COUNT(r.id) AS review_count FROM products p LEFT JOIN reviews r ON p.id = r.product_id ${whereClause} GROUP BY p.id ORDER BY p.created_at DESC LIMIT ${paginationPlaceholders.limit} OFFSET ${paginationPlaceholders.offset}`;

    const result = await database.query(query, values);

    //Query for fetching new products
    const newProductQuery = `SELECT p.*, COUNT(r.id) AS review_count FROM products p LEFT JOIN reviews r ON p.id = r.product_id WHERE p.created_at >= NOW() - INTERVAL '30 days' GROUP BY p.id ORDER BY p.created_at DESC LIMIT 8`;

    const newProductsResult = await database.query(newProductQuery);

    //Query for fetching top rated products (rating >= 4.5)
    const topRatedQuery = `SELECT p.*, COUNT(r.id) AS review_count FROM products p LEFT JOIN reviews r ON p.id = r.product_id WHERE p.ratings >= 4.5 GROUP BY p.id ORDER BY p.ratings DESC, p.created_at DESC LIMIT 8`;

    const topRatedResult = await database.query(topRatedQuery);

    res.status(200).json({
        success: true,
        products: result.rows,
        totalProducts,
        newProducts: newProductsResult.rows,
        topRatedProducts: topRatedResult.rows,
    });
});


// 4 hours 5 mins approx.
export const updateProduct = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.params;
    const { name, description, price, category, stock } = req.body;
    if (!name || !description || !price || !category || !stock) {
        return next(new ErrorHandler("Please Provide Complete Product Details!", 400));
    }
    const product = await database.query(
        "SELECT * FROM products WHERE id = $1", [productId]
    );
    if (product.rows.length === 0) {
        return next(new ErrorHandler("Product Not Found!", 404));
    }
    const priceInPaise = priceConversion(price); // convert price in PAISE
    if (!priceInPaise) {
        return next(new ErrorHandler("Invalid Price. and Price Should be Greater Than 0 Rs.", 400));
    }
    const result = await database.query(
        "UPDATE products SET name = $1, description = $2, price = $3, category = $4, stock = $5 WHERE id = $6 RETURNING *",
        [name, description, priceInPaise, category, stock, productId]
    );

    res.status(200).json({
        success: true,
        message: "Product Updated Successfully.",
        updatedProduct: result.rows[0],
    });
});

//4 hours 20 mins approx.
export const deleteProduct = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.params;
    const product = await database.query(
        "SELECT * FROM products WHERE id = $1", [productId]
    );
    if (product.rows.length === 0) {
        return next(new ErrorHandler("Product Not Found!", 404));
    }
    const images = product.rows[0].images;
    const deleteResult = await database.query(
        "DELETE FROM products WHERE id = $1 RETURNING *",
        [productId]
    );
    if (deleteResult.rows.length === 0) {
        return next(new ErrorHandler("Failed to Delete Product!", 500));
    }
    //Delete Images From Cloudinary
    if (images && images.length > 0) {
        for (const image of images) {
            await cloudinary.uploader.destroy(image.public_id);
        }
    }
    res.status(200).json({
        success: true,
        message: "Product Deleted Successfully.",
        deletedProduct: deleteResult.rows[0],
    });
});

// 4 hours 26 mins approx. 
export const fetchSingleProduct = catchAsyncErrors(async (req, res, next) => {

    const { productId } = req.params;

    const result = await database.query(`SELECT p.*, COALESCE(
        json_agg(
            json_build_object(
                'review_id', r.id, 
                'rating', r.rating,
                'comment', r.comment, 
                'reviewer', json_build_object( 
                'id', u.id,
                'name', u.name, 
                'avatar', u.avatar
                ) 
            )
        ) FILTER( WHERE r.id IS NOT NULL), '[]')
          AS reviews FROM products p LEFT JOIN reviews r ON p.id = r.product_id 
          LEFT JOIN users u ON r.user_id = u.id 
          WHERE p.id = $1 GROUP BY p.id `, [productId]
    );
    res.status(200).json({
        success: true,
        message: "Product Fetched Successfully.",
        product: result.rows[0],
    })
});

//4 hours 38 mins
export const postProductReview = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    if (!rating || !comment) {
        return next(new ErrorHandler("Please Provide Rating and Comment!", 400));
    }

    const purchasedCheckQuery = `
        SELECT oi.product_id 
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN payments p ON p.order_id = o.id
        WHERE o.buyer_id = $1
        AND oi.product_id = $2
        AND p.payment_status = 'Paid'
        LIMIT 1
    `;
    const { rows } = await database.query(purchasedCheckQuery, [req.user.id, productId]);
    if (rows.length === 0) {
        return res.status(403).json({
            success: false,
            message: "You Can Only Review a Product When You've Purchased!",
        });
    }
    const product = await database.query(
        "SELECT * FROM products WHERE id = $1",
        [productId]
    );
    if (product.rows[0].length === 0) {
        return next(new ErrorHandler("Product Not Found!", 404));
    }

    const isAlreadyReviewed = await database.query(
        `
        SELECT * FROM reviews WHERE product_id = $1 AND user_id = $2
        `,
        [productId, req.user.id]
    );
    let review;
    if (isAlreadyReviewed.rows.length > 0) {
        review = await database.query(
            "UPDATE reviews SET rating = $1, comment = $2 WHERE product_id = $3 AND user_id = $4 RETURNING *",
            [rating, comment, productId, req.user.id]
        );
    } else {
        review = await database.query(
            "INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *",
            [productId, req.user.id, rating, comment]
        );
    }
    const allReviews = await database.query(
        "SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = $1",
        [productId]
    );
    const newAvgRating = allReviews.rows[0].avg_rating;
    const updatedProduct = await database.query(
        "UPDATE products SET ratings = $1 WHERE product_id = $2 RETURNING *",
        [newAvgRating, productId]
    );
    res.status(200).join({
        success: true,
        message: "Review Posted Successfully.",
        review: review.rows[0],
        product: updatedProduct.rows[0],

    })
});

//5 hours 01 min 
export const deleteReview = catchAsyncErrors(async (req, res, next) => {
    const { productId } = req.params;
    const review = await database.query(
        "DELETE FROM reviews WHERE product_id = $1 AND user_id = $2 RETURNING *",
        [productId, req.user.id]
    );
    if (review.rows.length === 0) {
        return next(new ErrorHandler("Review Not Found!", 404));
    }

    const allReviews = await database.query(
        "SELECT AVG(rating) AS avg_rating FROM reviews WHERE product_id = $1",
        [productId]
    );
    const newAvgRating = allReviews.rows[0].avg_rating;
    const updatedProduct = await database.query(
        "UPDATE products SET ratings = $1 WHERE product_id = $2 RETURNING *",
        [newAvgRating, productId]
    );
    res.status(200).join({
        success: true,
        message: "Your Review Has Been Deleted.",
        review: review.rows[0],
        product: updatedProduct.rows[0],
    });
});

//5 hours 6 mins
export const fetchAIFilteredProducts = catchAsyncErrors(async (req, res, next) => {
    const { userPrompt } = req.body;
    if (!userPrompt) {
        return next(new ErrorHandler("Provide a Valid Prompt!", 400));
    }

    const keywords = filterKeywords(userPrompt);

    //STEP:1 Basic SQL Filtering
    const result = await database.query(
        "SELECT * FROM products WHERE name ILIKE ANY($1) OR description ILIKE ANY($1) OR category ILIKE ANY($1) LIMIT  200;",
        [keywords]
    );
    const filteredProducts = result.rows;
    if (filteredProducts.length === 0) {
        return res.status(200).json({
            success: true,
            message: "No Products Found Matching Your Prompt.",
            product: [],
        });
    }

    //STEP:2 AI Filtering
    const { success, products } = await getAIRecommendation(req, res, userPrompt, filteredProducts);

    res.status(200).json({
        success: success,
        message: "AI Filtered Products.",
        product: products,
    })
});



