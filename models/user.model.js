const mongoose = require('mongoose');
const createHttpError = require('http-errors');
const bcrypt = require('bcryptjs');

const { roles }= require('../utils/constants' ) ;

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    hostelNumber:{
        type:Number,
        required:true
    },
    role: {
    type: String,
    enum: [roles.admin1,roles.admin2,roles.admin3,roles.admin4,roles.moderator, roles.client],
    default: roles.client,
  },
});

// Hash the password before saving to the database
userSchema.pre('save', async function (next) {
    try {
        if (this.isNew) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(this.password, salt);
            this.password = hashedPassword;
            if (this.email === process.env.ADMIN1_EMAIL.toLowerCase()) {
                this.role = roles.admin1;
              }
              if (this.email === process.env.ADMIN2_EMAIL.toLowerCase()) {
                this.role = roles.admin2;
              }
              if (this.email === process.env.ADMIN3_EMAIL.toLowerCase()) {
                this.role = roles.admin3;
              }
              if (this.email === process.env.ADMIN4_EMAIL.toLowerCase()) {
                this.role = roles.admin4;
              }
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare entered password with stored hash
userSchema.methods.isValidPassword = async function (password) {
    try {
        const isMatch = await bcrypt.compare(password, this.password);  // Compare the entered password with the stored hash
        return isMatch;  // Return the result of comparison
    } catch (error) {
        throw createHttpError.InternalServerError(error.message);
    }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
