import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import database from "../database/db.js";
import { generatePaymentIntent } from '../utils/generatePaymentIntent.js';
import { priceConversion } from '../utils/priceConversion.js';

export const placeNewOrder = catchAsyncErrors(async (req, res, next) => {
    const {
        full_name,
        state,
        city,
        country,
        address,
        pincode,
        phone,
        orderedItem,
    } = req.body;
    if (!full_name ||
        !state ||
        !city ||
        !country ||
        !address ||
        !pincode ||
        !phone
    ) {
        return next(new ErrorHandler("Please Provide Complete Shipping Details.", 400));
    }

    let items;
    try {
        items = Array.isArray(orderedItem) ? orderedItem : JSON.parse(orderedItem);
    } catch {
        return next(new ErrorHandler("Invalid Order Items.", 400));
    }
    if (!items || items.length === 0) {
        return next(new ErrorHandler("No Items in Cart.", 400));
    }

    const productIds = [...new Set(items.map((item) => item.product?.id))];
    if (productIds.some((id) => !id)) {
        return next(new ErrorHandler("Invalid Product in Cart.", 400));
    }
    const { rows: products } = await database.query(
        "SELECT id, price, stock, name FROM products WHERE id = ANY($1::uuid[])",
        [productIds]
    );
    const requestedQuantities = new Map();
    items.forEach((item) => {
        requestedQuantities.set(item.product.id, (requestedQuantities.get(item.product.id) || 0) + Number(item.quantity));
    });
    const cartItems = [...requestedQuantities.entries()].map(([productId, quantity]) => ({
        productId,
        quantity,
        item: items.find((cartItem) => cartItem.product.id === productId),
    }));
    let total_price = 0;
    const values = [];
    const placeholders = [];
    let hasError = false;
    cartItems.forEach(({ productId, quantity, item }, index) => {
        if (hasError) return; // Skip if error already found
        const product = products.find((p) => p.id === productId);
        if (!product) {
            next(new ErrorHandler(`Product Not Found for ID: ${productId}`, 404));
            hasError = true;
            return;
        }
        if (!Number.isInteger(quantity) || quantity <= 0 || quantity > product.stock) {
            next(new ErrorHandler(`Only ${product.stock} Units Available for ${product.name}`, 400));
            hasError = true;
            return;
        }
        const itemTotal = product.price * quantity;
        total_price += itemTotal;
        values.push(null, product.id, quantity, product.price, item.product.images?.[0]?.url || "", product.name);

        const offset = index * 6;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
    });

    if (hasError) return; // Don't proceed to create order

    const subtotal = total_price;
    const tax = 2.5; // 2.5% TAX
    const shipping_price = total_price >= 50000 ? 0 : 10000; // shipping_price in INR in PAISE
    const tax_price = Math.round((subtotal * tax) / 100);
    total_price = subtotal + tax_price + shipping_price;

    if (!total_price) {
        return res.status(400).json({
            success: false,
            message: "You Should Add Any Item into Cart",
        });
    }

    await database.query("BEGIN");
    try {
        const orderResult = await database.query(
            "INSERT INTO orders (buyer_id, total_price, tax_price, shipping_price) VALUES ($1, $2, $3, $4) RETURNING id",
            [req.user.id, total_price, tax_price, shipping_price]
        );

        const orderId = orderResult.rows[0].id;
        for (let i = 0; i < values.length; i += 6) values[i] = orderId;

        await database.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price, image, title)
            VALUES ${placeholders.join(", ")} RETURNING *`,
            values
        );
        await database.query(
            `INSERT INTO shipping_info (order_id, full_name, state, city, country, address, pincode, phone) VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [orderId, full_name, state, city, country, address, pincode, phone]
        );
        const paymentResponse = await generatePaymentIntent(orderId, total_price, database);
        if (!paymentResponse.success) throw new Error("Payment Failed");
        await database.query("COMMIT");
        return res.status(200).json({
        success: true,
        message: "Order Placed Successfully. Please Proceed to Payment.",
        orderId,
        paymentIntent: paymentResponse.clientSecret,
        total_price: total_price / 100,
        });
    } catch (error) {
        await database.query("ROLLBACK");
        return next(new ErrorHandler("Payment Failed Try Again!", 500));
    }
});

// 7 hours 30 mins
export const fetchSingleOrder = catchAsyncErrors(async (req, res, next) => {
    const { orderId } = req.params;
    const result = await database.query(
        `SELECT o.*, COALESCE(
                        json_agg(
                            json_build_object(
                                'order_item_id', oi.id,
                                'order_id', oi.order_id,
                                'product_id', oi.product_id,
                                'quantity', oi.quantity,
                                'price', oi.price
                            )
                        ) FILTER (WHERE oi.id IS NOT NULL), '[]'
                    ) AS order_items,
                    json_build_object(
                        'full_name', s.full_name,
                        'state', s.state,
                        'city', s.city,
                        'country', s.country,
                        'address', s.address,
                        'pincode', s.pincode,
                        'phone', s.phone
                    ) AS shipping_info,
                    p.payment_status AS payment_status,
                    p.failure_reason AS payment_failure_reason
                    FROM orders o
                    LEFT JOIN order_items oi ON o.id = oi.order_id
                    LEFT JOIN shipping_info s ON o.id = s.order_id
                    LEFT JOIN payments p ON p.order_id = o.id
                    WHERE o.id = $1 AND o.buyer_id = $2
                    GROUP BY o.id, s.id, p.id;
`,
        [orderId, req.user.id]);
    if(result.rows.length === 0) {
        // res.status(404).json({
        //     success: false,
        //     message: "No Orders Found for This Item!"
        // })
        return next(new ErrorHandler("No Orders Found for This Item!", 404));
    }
    res.status(200).json({
        success: true,
        message: "Orders Fetched",
        orders: result.rows[0],
    });
});

// 7 hours 44 mins
export const fetchMyOrders = catchAsyncErrors(async (req, res, next) => {
    const result = await database.query(
        `SELECT o.*, COALESCE(
                        json_agg(
                            json_build_object(
                                'order_item_id', oi.id,
                                'order_id', oi.order_id,
                                'product_id', oi.product_id,
                                'quantity', oi.quantity,
                                'price', oi.price,
                                'image', oi.image,
                                'title', oi.title
                            )
                        ) FILTER (WHERE oi.id IS NOT NULL), '[]'
                    ) AS order_items,
                    json_build_object(
                        'full_name', s.full_name,
                        'state', s.state,
                        'city', s.city,
                        'country', s.country,
                        'address', s.address,
                        'pincode', s.pincode,
                        'phone', s.phone
                    ) AS shipping_info FROM orders o
                    LEFT JOIN order_items oi ON o.id = oi.order_id
                    LEFT JOIN shipping_info s ON o.id = s.order_id
                    WHERE o.buyer_id = $1
                    GROUP BY o.id, s.id
                    `,
        [req.user.id]);

    res.status(200).json({
        success: true,
        message: "All Your Orders are Fetched.",
        myOrders: result.rows,
    });
});

// 7 hours 48 mins
export const fetchAllOrders = catchAsyncErrors(async(req, res, next) => {
    const result = await database.query(
        `SELECT o.*,
COALESCE(json_agg(
json_build_object(
'order_item_id', oi.id,
'order_id', oi.order_id,
'product_id', oi.product_id,
'quantity', oi.quantity,
'price', oi.price,
'image', oi.image,
'title', oi.title
)
) FILTER (WHERE oi.id IS NOT NULL), '[]' ) AS order_items,
json_build_object(
'full_name', s.full_name,
'state', s.state,
'city', s.city,
'country', s.country,
'address', s.address,
'pincode', s.pincode,
'phone', s.phone
) AS shipping_info
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN shipping_info s ON o.id = s.order_id
GROUP BY o.id, s.id`
    )
if(result.rows.length === 0 ) {
    return next(new ErrorHandler("No Orders Found!", 404));
}
    res.status(200).json({
        success: true,
        message: "All Orders Fetched Successfully.",
        allOrders: result.rows,
    })
});

// 7 hours 52 mins
export const updateOrderStatus = catchAsyncErrors(async(req, res, next) => {
    const {status} = req.body;
    if(!status) {
        return next(new ErrorHandler("Provide a Valid Status For Order!", 400));
    }
    const {orderId} = req.params;
    const results = await database.query(
        "SELECT * FROM orders WHERE id = $1",
        [orderId]
    );
    if(results.rows.length === 0 ) {
        return next(new ErrorHandler("Invalid Order ID!", 404));
    }
    const updateOrderStatus = await database.query(
        "UPDATE orders SET order_status = $1 WHERE id = $2 RETURNING *",
        [status, orderId]
    );
    res.status(200).json({
        success: true,
        message: "Order Status Updated.",
        updateOrderStatus: updateOrderStatus.rows[0],
    })
});

// 7 hours 58 mins
export const deleteOrder = catchAsyncErrors(async(req, res, next) => {
    const {orderId} = req.params;
    const result = await database.query(
        "DELETE FROM orders WHERE id = $1 RETURNING *",
        [orderId]
    );
    if(result.rows.length === 0 ) {
        return next(new ErrorHandler("Invalid Order ID", 404));
    }
    res.status(200).json({
        success: true,
        message: "Order Deleted Successfully.",
        order: result.rows[0],
    })
})