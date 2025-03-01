import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true
    }
}, { _id: false });

customerSchema.index({ _id: 1 });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;