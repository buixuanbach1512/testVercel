const { json } = require('body-parser');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');
const slugify = require('slugify');
const validateMongoDbId = require('../utils/validateMongoDbId');
const cloudinaryUploadImg = require('../utils/cloundinary');
const fs = require('fs');
const cloudinary = require('cloudinary');

const createProduct = asyncHandler(async (req, res) => {
    try {
        if (req.body.name) {
            req.body.slug = slugify(req.body.name);
        }
        const newProduct = await Product.create(req.body);
        res.json(newProduct);
    } catch (e) {
        throw new Error(e);
    }
});

const getAProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        const getOne = await Product.findById({ _id: id })
            .populate('brand')
            .populate('category')
            .populate('color')
            .populate('ratings.postedBy')
            .populate('size');
        res.json(getOne);
    } catch (e) {
        throw new Error(e);
    }
});

const getAllProduct = asyncHandler(async (req, res) => {
    try {
        // Filter
        const queryObj = { ...req.query };
        const excludeFields = ['sort', 'fields'];
        excludeFields.forEach((el) => delete queryObj[el]);
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
        let query = Product.find(JSON.parse(queryStr)).populate('brand').populate('category').populate('color');

        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.collation({ locale: 'vi' }).sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        // Limiting the fields
        // if (req.query.fields) {
        //     const fields = req.query.fields.split(',').join(' ');
        //     query = query.select(fields);
        // } else {
        //     query = query.select('-__v');
        // }

        const product = await query;
        res.json(product);
    } catch (e) {
        throw new Error(e);
    }
});

const updateProduct = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (req.body.name) {
            req.body.slug = slugify(req.body.name);
        }
        const updatePro = await Product.findByIdAndUpdate({ _id: id }, req.body, {
            new: true,
        });
        res.json(updatePro);
    } catch (e) {
        throw new Error(e);
    }
});

const addToWishlist = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const { prodId } = req.body;
    try {
        const user = await User.findById(_id);
        const alreadyadded = user.wishlist.find((id) => id.toString() === prodId);
        if (alreadyadded) {
            let user = await User.findByIdAndUpdate(
                _id,
                {
                    $pull: { wishlist: prodId },
                },
                {
                    new: true,
                },
            );
            res.json(user);
        } else {
            let user = await User.findByIdAndUpdate(
                _id,
                {
                    $push: { wishlist: prodId },
                },
                {
                    new: true,
                },
            );
            res.json(user);
        }
    } catch (error) {
        throw new Error(error);
    }
});

const rating = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const { star, prodId, comment } = req.body;
    try {
        const product = await Product.findById(prodId);
        let alreadyRated = product.ratings.find((userId) => userId.postedBy.toString() === _id.toString());
        if (alreadyRated) {
            const updateRating = await Product.updateOne(
                {
                    ratings: { $elemMatch: alreadyRated },
                },
                {
                    $set: { 'ratings.$.star': star, 'ratings.$.comment': comment },
                },
                {
                    new: true,
                },
            );
        } else {
            const rateProduct = await Product.findByIdAndUpdate(
                prodId,
                {
                    $push: { ratings: { star: star, postedBy: _id, comment: comment } },
                },
                { new: true },
            );
        }
        const getAllRatings = await Product.findById(prodId);
        let totalRating = getAllRatings.ratings.length;
        let ratingsum = getAllRatings.ratings.map((item) => item.star).reduce((prev, curr) => prev + curr, 0);
        let actualRating = Math.round(ratingsum / totalRating);
        let allProduct = await Product.findByIdAndUpdate(
            prodId,
            {
                totalRating: actualRating,
            },
            { new: true },
        );
        res.json(allProduct);
    } catch (e) {
        throw new Error(e);
    }
});

const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateMongoDbId(id);
    try {
        const aProd = await Product.findById(id);
        const imgId = aProd.images[0].public_id;
        const deletePro = await Product.findByIdAndDelete({ _id: id });
        res.json({
            message: 'Delete Product Successfully',
        });
    } catch (e) {
        throw new Error(e);
    }
});

module.exports = {
    createProduct,
    getAProduct,
    getAllProduct,
    updateProduct,
    deleteProduct,
    addToWishlist,
    rating,
};
