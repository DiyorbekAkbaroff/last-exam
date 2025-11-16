const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');

router.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/cart', auth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // ❗ Product mavjudligini tekshirish
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) cart = new Cart({ user: req.user._id, items: [] });

    const existingItem = cart.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    await cart.populate('items.product');

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/cart/:itemId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter(
      item => item._id.toString() !== req.params.itemId
    );

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/cart/:itemId/increase', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    item.quantity += 1;

    await cart.save();
    await cart.populate('items.product');

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/cart', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product');

    if (!cart) return res.json({ items: [] });

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/address', auth, async (req, res) => {
  try {
    const { street, city, zipCode, country, isDefault } = req.body;

    if (isDefault) {
      await Address.updateMany(
        { user: req.user._id },
        { isDefault: false }
      );
    }

    const address = new Address({
      user: req.user._id,
      street,
      city,
      zipCode,
      country,
      isDefault: isDefault || false
    });

    await address.save();
    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/address', auth, async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/order', auth, async (req, res) => {
  try {
    const { addressId, deliveryType = 'standard' } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: 'Cart is empty' });

    const address = await Address.findById(addressId);
    if (!address) return res.status(404).json({ message: 'Address not found' });

    if (address.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your address" });
    }

    const items = cart.items.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price
    }));

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const qrText = `ORDER-${req.user._id}-${Date.now()}`;
    const qrCode = await QRCode.toDataURL(qrText);

    const order = new Order({
      user: req.user._id,
      items,
      totalAmount,
      deliveryType,
      address: addressId,
      qrCode
    });

    await order.save();

    cart.items = [];
    await cart.save();

    await order.populate('items.product');
    await order.populate('address');

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .populate('address');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
