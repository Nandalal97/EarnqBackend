// controllers/cartController.js
const Cart = require('../models/Cart');
const Book = require('../models/Book');
// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { userId, bookId, quantity = 1, format = 'ebook' } = req.body;

    // validation
    if (!userId || !bookId) {
      return res.status(400).json({
        success: false,
        status: 0,
        message: 'userId and bookId are required',
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        status: 0,
        message: 'Quantity must be at least 1',
      });
    }

    // check book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        status: 0,
        message: 'Book not found',
      });
    }

    // Determine format-specific prices
    let price, salePrice, discount;

    if (format === 'ebook') {
      price = book.ebookPrice;
      salePrice = book.ebookSalePrice;
      discount = book.ebookDiscount;
    } else {
      price = book.hardCopyPrice;
      salePrice = book.hardCopySalePrice;
      discount = book.hardCopyDiscount;
    }

    // find user cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      // if no cart, create new
      cart = new Cart({
        userId,
        items: [
          {
            bookId,
            title: book.title,
            price,
            salePrice,
            discount,
            coverImage: book.coverImage,
            bookUrl:book.bookUrl,
            totalPages:book.totalPages,
            quantity,
            format
          },
        ],
      });
    } else {
      // check if item already exists (same book & same format)
      const itemIndex = cart.items.findIndex(
        (item) => item.bookId.toString() === bookId && item.format === format
      );

      if (itemIndex > -1) {
        // increase quantity
        cart.items[itemIndex].quantity += quantity;
      } else {
        // push new item
        cart.items.push({
          bookId,
          title: book.title,
          price,
          salePrice,
          discount,
          coverImage: book.coverImage,
            bookUrl:book.bookUrl,
            totalPages:book.totalPages,
          quantity,
          format
        });
      }
    }

    // save cart
    await cart.save();

    return res.status(200).json({
      success: true,
      status: 1,
      message: 'Book added to cart successfully'
      // cart,
    });
  } catch (error) {
    console.error('AddToCart Error:', error);
    return res.status(500).json({
      success: false,
      status: 0,
      message: 'Internal Server Error',
    });
  }
};



const removeFromCart = async (req, res) => {
  try {
    const { userId, bookId } = req.body;

    if (!userId || !bookId) {
      return res.status(400).json({
        success: false,
        status: 0,
        message: 'userId and bookId are required',
      });
    }

    // find the cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        status: 0,
        message: 'Cart not found',
      });
    }

    // check if item exists in cart
    const itemIndex = cart.items.findIndex(
      (item) => item.bookId.toString() === bookId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        status: 0,
        message: 'Book not found in cart',
      });
    }

    // remove item
    cart.items.splice(itemIndex, 1);

    // save updated cart
    await cart.save();

    return res.status(200).json({
      success: true,
      status: 1,
      message: 'Book removed from cart successfully',
      cart,
    });
  } catch (error) {
    console.error('RemoveFromCart Error:', error);
    return res.status(500).json({
      success: false,
      status: 0,
      message: 'Internal Server Error',
    });
  }
};

// Get cart items for a particular user
const getCartItems = async (req, res) => {
  try {
    const { userId } = req.params; // assuming userId comes in URL params

    if (!userId) {
      return res.status(400).json({
        success: false,
        status: 0,
        message: 'userId is required',
      });
    }
    
    // Find the cart for this user
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return res.status(404).json({
        success: false,
        status: 0,
        message: 'Cart is empty',
        items: [],
        totalPrice,
        totalItems
      });
    }

    return res.status(200).json({
      success: true,
      status: 1,
      message: 'Cart items retrieved successfully',
      items: cart.items,
      totalPrice: cart.totalPrice,
      totalItems: cart.totalItems,
    });
  } catch (error) {
    console.error('GetCartItems Error:', error);
    return res.status(500).json({
      success: false,
      status: 0,
      message: 'Internal Server Error',
    });
  }
};



module.exports = {
  addToCart,
  removeFromCart,
  getCartItems
};
