const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/products', auth, adminAuth, async (req, res) => {
  try {
    const { name, description, price, image, category, stock } = req.body;

    // Validation
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({ message: 'Price must be a valid number' });
    }

    if (stock && (isNaN(stock) || stock < 0)) {
      return res.status(400).json({ message: 'Stock must be a valid number' });
    }

    const product = new Product({
      name,
      description: description || '',
      price,
      image: image || '',
      category: category || 'General',
      stock: stock || 0
    });

    await product.save();
    res.status(201).json({
      message: 'Product created successfully',
      product
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/products/:id', auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/products', auth, adminAuth, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.json({
      count: products.length,
      products
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;