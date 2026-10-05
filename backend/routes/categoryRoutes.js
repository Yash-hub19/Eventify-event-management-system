const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
