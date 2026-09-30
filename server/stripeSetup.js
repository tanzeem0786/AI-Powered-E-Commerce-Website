import Stripe from 'stripe';
import database from './database/db.js';
import express from 'express';

//6:43

export const stripeSetup = (app) => {

    app.use("/api/v1/payment/webhook", express.raw({ type: "application/json" }),
        async (req, res,) => {
            const sig = req.headers["stripe-signature"];
            let event;
            try {
                event = Stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
            } catch (error) {
                return res.status(400).send(`Webhook Error: ${error.message || error}`);
            }
            // Handling Event
            if (event.type === "payment_intent.succeeded") {
                const paymentIntentId = event.data.object.id;
                try {
                    await database.query("BEGIN");
                    const paymentTableUpdateResult = await database.query(
                        "UPDATE payments SET payment_status = 'Paid' WHERE payment_intent_id = $1 AND payment_status <> 'Paid' RETURNING *",
                        [paymentIntentId]
                    );
                    if (paymentTableUpdateResult.rows.length === 0) {
                        await database.query("ROLLBACK");
                        return res.status(200).send({ received: true });
                    }
                    await database.query(
                        "UPDATE orders SET paid_at = NOW() WHERE id = $1 RETURNING *",
                        [paymentTableUpdateResult.rows[0].order_id]
                    );

                    // Reduce Stock for Each Product 
                    const orderId = paymentTableUpdateResult.rows[0].order_id;
                    const { rows: orderedItems } = await database.query(`
                SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
                        [orderId]
                    );

                    // For Each Ordered Items, Reduce the product item 
                    for (const item of orderedItems) {
                        const stockUpdate = await database.query(
                            "UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1",
                            [item.quantity, item.product_id]
                        );
                        if (stockUpdate.rowCount !== 1) {
                            throw new Error("Insufficient stock while completing payment.");
                        }
                    }
                    await database.query("COMMIT");
                } catch (error) {
                    await database.query("ROLLBACK");
                    return res.status(500).send(`Error Updating paid_at Timestamp in orders table`);
                }
            }
            res.status(200).send({ received: true });
        });
};