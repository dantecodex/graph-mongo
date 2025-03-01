import mongoose from 'mongoose';

const productItemSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    priceAtPurchase: {
        type: Number,
        required: true
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    customerId: {
        type: String,
        required: true,
        ref: 'Customer'
    },
    products: {
        type: [productItemSchema],
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    orderDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'canceled']
    }
}, { _id: false });

orderSchema.index({ customerId: 1 });
orderSchema.index({ orderDate: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'products.productId': 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;