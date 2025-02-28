import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        required: true
    }
}, { _id: false });

// Create index on _id for faster lookups
productSchema.index({ _id: 1 });
// Create index on category for analytics queries
productSchema.index({ category: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;