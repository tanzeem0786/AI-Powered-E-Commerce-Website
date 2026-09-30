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
                        "UPDATE payments SET payment_status = 'Paid' WHERE payment_intent_id = $1 AND payment_status = 'Pending' RETURNING *",
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
                            const error = new Error("Insufficient stock while completing payment.");
                            error.code = "INSUFFICIENT_STOCK";
                            throw error;
                        }
                    }
                    await database.query("COMMIT");
                } catch (error) {
                    await database.query("ROLLBACK");
                    if (error.code === "INSUFFICIENT_STOCK") {
                        try {
                            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                            await stripe.refunds.create(
                                { payment_intent: paymentIntentId },
                                { idempotencyKey: `stock-refund-${paymentIntentId}` }
                            );
                            await database.query(
                                "UPDATE payments SET payment_status = 'Failed', failure_reason = $1 WHERE payment_intent_id = $2 AND payment_status = 'Pending'",
                                ["Insufficient stock. The payment was refunded.", paymentIntentId]
                            );
                            return res.status(200).send({ received: true });
                        } catch (refundError) {
                            console.error("Failed to refund payment after stock validation:", refundError);
                            return res.status(500).send("Payment succeeded but stock changed; automatic refund needs retry.");
                        }
                    }
                    return res.status(500).send(`Error Updating paid_at Timestamp in orders table`);
                }
            }
            res.status(200).send({ received: true });
        });
};