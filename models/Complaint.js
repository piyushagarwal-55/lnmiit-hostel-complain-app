const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  roomNo: {
    type: String,
    required: true,
  },
  mobileNo: {
    type: String,
    required: true,
  },
  rollNo: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Resolved'],
    default: 'Pending',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model that stores user data
    required: true,
  },
}, { timestamps: true });

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;
