// script.js
// This script handles product rendering, checkout state, and admin simulation.

// USSD Phone Dial Handler
function dialUSSD(code) {
  // For web, we use tel: protocol which works on mobile devices
  // On desktop, it will prompt to choose a dialer app if available
  window.location.href = 'tel:' + code;
}

// Image URL to Base64 Converter
function loadImageFromURL() {
  const urlInput = document.getElementById('adminImageUrl');
  const imagePreview = document.getElementById('imagePreview');
  const message = document.getElementById('imageLoadMessage');
  const url = urlInput.value.trim();

  if (!url) {
    message.textContent = 'Please enter an image URL.';
    message.style.color = '#ef4444';
    return;
  }

  message.textContent = 'Loading image...';
  message.style.color = '#a0aec0';

  // Try fetching the image to convert to base64 first
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error('Failed to fetch image');
      return response.blob();
    })
    .then((blob) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
        message.textContent = 'Image loaded successfully! (stored locally as base64)';
        message.style.color = '#4ade80';
      };
      reader.readAsDataURL(blob);
    })
    .catch((error) => {
      console.warn('Image fetch failed, falling back to direct URL load:', error);
      const tempImage = new Image();
      tempImage.onload = () => {
        imagePreview.src = url;
        imagePreview.style.display = 'block';
        message.textContent = 'Image loaded from URL. It will be used directly if base64 could not be created.';
        message.style.color = '#f59e0b';
      };
      tempImage.onerror = () => {
        message.textContent = `Error loading image: ${error.message}. Try uploading the file instead.`;
        message.style.color = '#ef4444';
        console.error('Image load fallback failed:', error);
      };
      tempImage.src = url;
    });
}

// Clear All Products Function
function clearAllProducts() {
  if (confirm('Are you sure you want to delete ALL products? This action cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEYS.products);
    alert('All products have been cleared!');
    location.reload();
  }
}

// Authentication Functions
function getUsers() {
  const stored = localStorage.getItem(STORAGE_KEYS.users);
  return stored ? JSON.parse(stored) : [];
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function getCurrentUser() {
  const stored = localStorage.getItem(STORAGE_KEYS.currentUser);
  return stored ? JSON.parse(stored) : null;
}

function setCurrentUser(user) {
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  localStorage.removeItem(STORAGE_KEYS.adminSession);
  window.location.href = 'index.html';
}

function getSavedTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || 'light';
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark-mode', isDark);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.textContent = isDark ? '☀️' : '🌙';
  }
}

function toggleTheme() {
  const nextTheme = getSavedTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
}

function isAuthenticated() {
  return getCurrentUser() || isAdminLoggedIn();
}

function requireAuth(allowAdmin = false) {
  const user = getCurrentUser();
  const admin = isAdminLoggedIn();

  if (user) {
    return true;
  }

  if (allowAdmin && admin) {
    return true;
  }

  window.location.href = 'login.html';
  return false;
}

function getAdminSession() {
  const stored = localStorage.getItem(STORAGE_KEYS.adminSession);
  return stored ? JSON.parse(stored) : null;
}

function setAdminSession(admin) {
  localStorage.setItem(STORAGE_KEYS.adminSession, JSON.stringify(admin));
}

function clearAdminSession() {
  localStorage.removeItem(STORAGE_KEYS.adminSession);
}

function isAdminLoggedIn() {
  return getAdminSession() !== null;
}

function adminLogin(username, password) {
  // Simple hardcoded admin credentials for demo
  const adminCredentials = {
    username: 'admin',
    password: 'admin123'
  };

  console.log('Attempting admin login with:', username, password);

  if (username === adminCredentials.username && password === adminCredentials.password) {
    const admin = {
      username: username,
      loginTime: new Date().toISOString(),
      role: 'admin'
    };
    setAdminSession(admin);
    console.log('Admin login successful, session set');
    return { success: true, message: 'Admin login successful!' };
  }

  console.log('Admin login failed');
  return { success: false, message: 'Invalid admin credentials.' };
}

function requireAdminAuth() {
  if (!isAdminLoggedIn()) {
    // Show login form instead of redirecting
    return false;
  }
  return true;
}

function normalizePhone(phone) {
  return phone ? phone.replace(/\D/g, '') : '';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digits = normalizePhone(phone);
  return digits.length >= 7 && digits.length <= 15;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getUserById(userId) {
  return getUsers().find((user) => user.id === userId) || null;
}

function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const normalized = identifier.trim();
  const emailIdentifier = normalized.toLowerCase();
  const phoneIdentifier = normalizePhone(normalized);

  return getUsers().find((user) => {
    const emailMatch = user.email && user.email.toLowerCase() === emailIdentifier;
    const phoneMatch = user.phone && normalizePhone(user.phone) === phoneIdentifier;
    return emailMatch || (phoneIdentifier && phoneMatch);
  }) || null;
}

function updateUser(updatedUser) {
  const users = getUsers();
  const nextUsers = users.map((user) => (user.id === updatedUser.id ? updatedUser : user));
  saveUsers(nextUsers);
}

function sendVerificationCode(user) {
  const code = generateOTP();
  updateUser({ ...user, verificationCode: code });
  return code;
}

function sendResetCode(user) {
  const code = generateOTP();
  updateUser({ ...user, resetCode: code });
  return code;
}

function registerUser(name, email, phone, password) {
  const users = getUsers();
  const normalizedEmail = email ? email.toLowerCase().trim() : '';
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedEmail && !normalizedPhone) {
    return { success: false, message: 'Please enter an email or phone number.' };
  }

  if (normalizedEmail && users.find((user) => user.email === normalizedEmail)) {
    return { success: false, message: 'Email already registered. Please login instead.' };
  }

  if (normalizedPhone && users.find((user) => user.phone === normalizedPhone)) {
    return { success: false, message: 'Phone already registered. Please login instead.' };
  }

  const newUser = {
    id: `user_${Date.now()}`,
    name,
    email: normalizedEmail,
    phone: normalizedPhone,
    password, // In a real app this would be hashed
    verified: false,
    verificationCode: generateOTP(),
    resetCode: null,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return { success: true, user: newUser };
}

function loginUser(identifier, password) {
  const user = findUserByIdentifier(identifier);

  if (!user || user.password !== password) {
    return { success: false, message: 'Invalid email/phone or password.' };
  }

  if (!user.verified) {
    return { success: false, message: 'Your account is not verified. Enter the OTP sent to your email or phone.', unverified: true, userId: user.id };
  }

  setCurrentUser({ id: user.id, name: user.name, email: user.email, phone: user.phone });
  return { success: true, message: 'Login successful!' };
}

const STORAGE_KEYS = {
  products: 'voucherStoreProducts',
  selectedProductId: 'voucherStoreSelectedProductId',
  selectedQuantity: 'voucherStoreSelectedQuantity',
  orderHistory: 'voucherStoreOrders',
  lastOrder: 'voucherStoreLastOrder',
  users: 'voucherStoreUsers',
  currentUser: 'voucherStoreCurrentUser',
  adminSession: 'voucherStoreAdminSession',
  theme: 'voucherStoreTheme'
};

const defaultProducts = [];

const availableVoucherCodes = [
  'BECE-VC-1024',
  'WASSCE-VR-4321',
  'UNI-APP-7865',
  'DIGI-VOU-5590',
  'FAST-VCH-9082'
];

let adminEditProductId = null;

function getProducts() {
  const stored = localStorage.getItem(STORAGE_KEYS.products);
  return stored ? JSON.parse(stored) : null;
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
}

function getOrders() {
  const stored = localStorage.getItem(STORAGE_KEYS.orderHistory);
  return stored ? JSON.parse(stored) : [];
}

function saveOrder(order) {
  const orders = getOrders();
  orders.push(order);
  localStorage.setItem(STORAGE_KEYS.orderHistory, JSON.stringify(orders));
  localStorage.setItem(STORAGE_KEYS.lastOrder, JSON.stringify(order));
}

function getLastOrder() {
  const stored = localStorage.getItem(STORAGE_KEYS.lastOrder);
  return stored ? JSON.parse(stored) : null;
}

function getSelectedProductId() {
  return localStorage.getItem(STORAGE_KEYS.selectedProductId);
}

function setSelectedProductId(productId) {
  localStorage.setItem(STORAGE_KEYS.selectedProductId, productId);
}

function getSelectedQuantity() {
  const quantity = localStorage.getItem(STORAGE_KEYS.selectedQuantity);
  return quantity ? parseInt(quantity) : 1;
}

function setSelectedQuantity(quantity) {
  localStorage.setItem(STORAGE_KEYS.selectedQuantity, quantity.toString());
}

function clearSelectedProductId() {
  localStorage.removeItem(STORAGE_KEYS.selectedProductId);
  localStorage.removeItem(STORAGE_KEYS.selectedQuantity);
}

function seedProducts() {
  if (!getProducts()) {
    saveProducts(defaultProducts);
  }
}

function findProductById(productId) {
  const products = getProducts();
  return products ? products.find((product) => product.id === productId) : null;
}

function resetAdminProductForm() {
  adminEditProductId = null;
  document.getElementById('adminProductForm').reset();
  document.getElementById('adminProductSubmitBtn').textContent = 'Add Product';
  const cancelBtn = document.getElementById('adminCancelEditBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  const imagePreview = document.getElementById('imagePreview');
  if (imagePreview) {
    imagePreview.style.display = 'none';
    imagePreview.src = '';
  }
  const message = document.getElementById('adminProductMessage');
  if (message) message.textContent = '';
}

function editProduct(productId) {
  const product = findProductById(productId);
  if (!product) return;

  adminEditProductId = productId;
  document.getElementById('adminTitle').value = product.title;
  document.getElementById('adminShortDesc').value = product.shortDescription;
  document.getElementById('adminDescription').value = product.description;
  document.getElementById('adminPrice').value = product.price;
  const imagePreview = document.getElementById('imagePreview');
  if (imagePreview) {
    imagePreview.src = product.image || '';
    imagePreview.style.display = product.image ? 'block' : 'none';
  }
  document.getElementById('adminProductSubmitBtn').textContent = 'Update Product';
  const cancelBtn = document.getElementById('adminCancelEditBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  const message = document.getElementById('adminProductMessage');
  if (message) message.textContent = 'Editing product. Update the fields and save.';
}

function cancelEditProduct() {
  resetAdminProductForm();
}

function formatCurrency(value) {
  return `GHS ${value.toFixed(2)}`;
}

function renderHomePage() {
  // Allow either a normal user or the admin to see available products on the home page
  if (!requireAuth(true)) return;

  seedProducts();
  const productGrid = document.getElementById('productGrid');
  if (!productGrid) return;

  const products = (getProducts() || []).filter((product) => product.active !== false);
  if (products.length === 0) {
    productGrid.innerHTML = '<p>There are no active products available right now.</p>';
    return;
  }

  productGrid.innerHTML = products
    .map(
      (product) => `
      <article class="product-card">
        ${product.image ? `<img src="${product.image}" alt="${product.title}" class="product-image">` : '<div class="product-image-placeholder">🛍️</div>'}
        <div>
          <h3>${product.title}</h3>
          <p>${product.shortDescription}</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="viewProduct('${product.id}')">Buy Now</button>
        </div>
      </article>
    `
    )
    .join('');
}

function viewProduct(productId) {
  const product = findProductById(productId);
  if (!product || product.active === false) {
    alert('This product is not available.');
    return;
  }
  setSelectedProductId(productId);
  window.location.href = 'product.html';
}

function renderProductPage() {
  // Allow either a normal user or the admin to view product details
  if (!requireAuth(true)) return;

  const productDetail = document.getElementById('productDetail');
  if (!productDetail) return;

  const productId = getSelectedProductId();
  const product = findProductById(productId);

  if (!product) {
    productDetail.innerHTML = `
      <div>
        <h2>Product not found</h2>
        <p>Please return to the <a href="index.html">home page</a> and select a product.</p>
      </div>
    `;
    return;
  }

  productDetail.innerHTML = `
    ${product.image ? `<img src="${product.image}" alt="${product.title}" class="product-image" style="width: 100%; max-width: 400px; margin-bottom: 2rem;">` : ''}
    <h2>${product.title}</h2>
    <p>${product.description}</p>
    <div class="product-price">${formatCurrency(product.price)}</div>

    <div class="quantity-selector" style="margin: 2rem 0;">
      <label for="productQuantity" style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Quantity:</label>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <button type="button" onclick="updateQuantity(-1)" class="btn btn-secondary" style="padding: 0.5rem 1rem;">-</button>
        <input type="number" id="productQuantity" value="1" min="1" max="99" style="width: 80px; text-align: center; padding: 0.5rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);" />
        <button type="button" onclick="updateQuantity(1)" class="btn btn-secondary" style="padding: 0.5rem 1rem;">+</button>
      </div>
    </div>

    <button class="btn btn-primary" onclick="proceedToCheckout()">Proceed to Checkout</button>
  `;
}

function updateQuantity(change) {
  const quantityInput = document.getElementById('productQuantity');
  const currentValue = parseInt(quantityInput.value) || 1;
  const newValue = Math.max(1, Math.min(99, currentValue + change));
  quantityInput.value = newValue;
}

function proceedToCheckout() {
  // Require authentication before proceeding to checkout
  if (!requireAuth()) return;

  const productId = getSelectedProductId();
  const product = findProductById(productId);
  if (!product) {
    window.location.href = 'index.html';
    return;
  }

  const quantity = parseInt(document.getElementById('productQuantity').value) || 1;
  setSelectedQuantity(quantity);
  window.location.href = 'checkout.html';
}

function renderCheckoutPage() {
  // Require authentication before checkout
  if (!requireAuth()) return;

  const checkoutSummary = document.getElementById('checkoutSummary');
  const form = document.getElementById('checkoutForm');
  if (!checkoutSummary || !form) return;

  const productId = getSelectedProductId();
  const product = findProductById(productId);
  const quantity = getSelectedQuantity();

  if (!product) {
    checkoutSummary.innerHTML = `
      <p>There is no selected product. <a href="index.html">Choose a product</a> first.</p>
    `;
    form.style.display = 'none';
    return;
  }

  const totalPrice = product.price * quantity;

  checkoutSummary.innerHTML = `
    <strong>${product.title}</strong>
    <span>${product.shortDescription}</span>
    <span>Quantity: ${quantity}</span>
    <span>Unit Price: ${formatCurrency(product.price)}</span>
    <span class="product-price">Total: ${formatCurrency(totalPrice)}</span>
  `;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleCheckoutSubmit(product, quantity, totalPrice);
  });
}

function handleCheckoutSubmit(product, quantity, totalPrice) {
  const name = document.getElementById('customerName').value.trim();
  const email = document.getElementById('customerEmail').value.trim();

  if (!name || !email) {
    alert('Please enter your name and email.');
    return;
  }

  const order = {
    id: `order_${Date.now()}`,
    productId: product.id,
    productName: product.title,
    price: product.price,
    quantity: quantity,
    totalPrice: totalPrice,
    customerName: name,
    customerEmail: email,
    createdAt: new Date().toISOString()
  };

  payWithPaystack(order);
}

function payWithPaystack(order) {
  // In a real app, you would create a transaction on the backend and verify it after payment.
  // This frontend demo only simulates the Paystack flow.

  const handler = PaystackPop.setup({
    key: 'pk_test_6f8c0f8daadd5d5b23d270d892b5e18bea0dd4f5',
    email: order.customerEmail,
    amount: Math.round(order.totalPrice * 100),
    currency: 'GHS',
    ref: `${order.id}`,
    metadata: {
      custom_fields: [
        {
          display_name: 'Customer Name',
          variable_name: 'customer_name',
          value: order.customerName
        },
        {
          display_name: 'Quantity',
          variable_name: 'quantity',
          value: order.quantity.toString()
        }
      ]
    },
    callback: function (response) {
      // The payment was successful in the sandbox/demo mode.
      // Normally verify the payment on the backend here before granting access.
      completeOrder(order, response.reference);
    },
    onClose: function () {
      alert('Payment window closed. Your order was not completed.');
    }
  });
  handler.openIframe();
}

function completeOrder(order, paymentReference) {
  order.paymentReference = paymentReference;
  order.voucherCode = assignVoucherCode();
  saveOrder(order);
  clearSelectedProductId();
  window.location.href = 'success.html';
}

function assignVoucherCode() {
  const randomIndex = Math.floor(Math.random() * availableVoucherCodes.length);
  return availableVoucherCodes[randomIndex];
}

function renderNavigation() {
  const navElement = document.getElementById('mainNav');
  if (!navElement) return;

  const currentUser = getCurrentUser();
  const adminSession = getAdminSession();
  const currentPath = window.location.pathname.split('/').pop();

  let navHtml = '';

  if (currentUser) {
    // Normal user navigation
    navHtml = `
      <a href="index.html" class="${currentPath === 'index.html' || currentPath === '' ? 'active' : ''}">Home</a>
      <a href="index.html#buy-checkers">Buy Checkers</a>
      <a href="checkout.html" class="${currentPath === 'checkout.html' ? 'active' : ''}">Buy Now!</a>
      <a href="#contact">Contact</a>
      <span class="user-greeting">Welcome, ${currentUser.name}</span>
      <button onclick="logout()" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;">Logout</button>
    `;
  } else if (adminSession) {
    // Admin navigation after admin is logged in
    navHtml = `
      <a href="index.html" class="${currentPath === 'index.html' || currentPath === '' ? 'active' : ''}">Home</a>
      <a href="#contact">Contact</a>
      <a href="admin.html" class="${currentPath === 'admin.html' ? 'active' : ''}">Admin</a>
      <button onclick="logout()" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.9rem;">Logout</button>
    `;
  } else {
    // Not logged in at all
    navHtml = `
      <a href="#contact">Contact</a>
      <a href="login.html" class="${currentPath === 'login.html' ? 'active' : ''}">Login</a>
    `;
  }

  const themeIcon = getSavedTheme() === 'dark' ? '☀️' : '🌙';
  navHtml += `<button id="themeToggleBtn" class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme">${themeIcon}</button>`;
  navElement.innerHTML = navHtml;
}

const authState = {
  flow: null,
  userId: null
};

function renderLoginPage() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const forgotForm = document.getElementById('forgotForm');
  const loginMessage = document.getElementById('loginMessage');
  const registerMessage = document.getElementById('registerMessage');
  const forgotMessage = document.getElementById('forgotMessage');
  const forgotLink = document.getElementById('forgotLink');
  const forgotCancelBtn = document.getElementById('forgotCancelBtn');
  const verifySubmitBtn = document.getElementById('verifySubmitBtn');
  const verifyCancelBtn = document.getElementById('verifyCancelBtn');

  if (!loginForm || !registerForm || !forgotForm) return;

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleLogin();
  });

  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleRegister();
  });

  forgotForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleForgot();
  });

  if (forgotLink) {
    forgotLink.addEventListener('click', (event) => {
      event.preventDefault();
      showForgotForm();
    });
  }

  if (forgotCancelBtn) {
    forgotCancelBtn.addEventListener('click', showLoginTab);
  }

  if (verifySubmitBtn) {
    verifySubmitBtn.addEventListener('click', handleVerificationSubmit);
  }

  if (verifyCancelBtn) {
    verifyCancelBtn.addEventListener('click', cancelVerification);
  }

  switchTab('login');
  resetAuthForms();
}

function handleLogin() {
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const message = document.getElementById('loginMessage');

  if (!identifier || !password) {
    message.textContent = 'Please enter both your email/phone and password.';
    return;
  }

  const result = loginUser(identifier, password);
  message.textContent = result.message;
  message.className = 'auth-message' + (result.success ? ' success' : ' error');

  if (result.unverified) {
    const user = getUserById(result.userId);
    if (user) {
      showVerificationStep('register', user, user.email || user.phone);
    }
    return;
  }

  if (result.success) {
    window.location.href = 'index.html';
  }
}

function handleRegister() {
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const confirmPassword = document.getElementById('registerConfirmPassword').value.trim();
  const message = document.getElementById('registerMessage');

  if (!name || !password || !confirmPassword) {
    message.textContent = 'Please complete all required fields.';
    return;
  }

  if (!email && !phone) {
    message.textContent = 'Please provide either an email address or phone number.';
    return;
  }

  if (email && !isValidEmail(email)) {
    message.textContent = 'Please enter a valid email address.';
    return;
  }

  if (phone && !isValidPhone(phone)) {
    message.textContent = 'Please enter a valid phone number.';
    return;
  }

  if (password !== confirmPassword) {
    message.textContent = 'Passwords do not match.';
    return;
  }

  if (password.length < 6) {
    message.textContent = 'Use a password with at least 6 characters.';
    return;
  }

  const result = registerUser(name, email, phone, password);
  if (!result.success) {
    message.textContent = result.message;
    message.className = 'auth-message error';
    return;
  }

  const user = result.user;
  const contactMethod = user.email ? `email ${user.email}` : `phone ${user.phone}`;
  showVerificationStep('register', user, contactMethod);
}

function handleForgot() {
  const identifier = document.getElementById('forgotIdentifier').value.trim();
  const message = document.getElementById('forgotMessage');

  if (!identifier) {
    message.textContent = 'Enter your email or phone number.';
    message.className = 'auth-message error';
    return;
  }

  const user = findUserByIdentifier(identifier);
  if (!user) {
    message.textContent = 'No account found for that email or phone.';
    message.className = 'auth-message error';
    return;
  }

  const resetCode = sendResetCode(user);
  showVerificationStep('reset', user, user.email ? `email ${user.email}` : `phone ${user.phone}`);
  const verifyMessage = document.getElementById('verifyMessage');
  if (verifyMessage) {
    verifyMessage.textContent = `A reset code was sent to ${user.email || user.phone}. In this demo, use ${resetCode}.`;
    verifyMessage.className = 'auth-message success';
  }
}

function handleVerificationSubmit() {
  const code = document.getElementById('verifyCode').value.trim();
  const message = document.getElementById('verifyMessage');
  const user = getUserById(authState.userId);

  if (!user) {
    message.textContent = 'Verification information is missing. Please try again.';
    message.className = 'auth-message error';
    return;
  }

  if (!code) {
    message.textContent = 'Please enter the 6-digit code.';
    message.className = 'auth-message error';
    return;
  }

  if (authState.flow === 'register') {
    if (code !== user.verificationCode) {
      message.textContent = 'That code is not valid. Please check and try again.';
      message.className = 'auth-message error';
      return;
    }

    updateUser({ ...user, verified: true, verificationCode: null });
    message.textContent = 'Your account has been verified. You can now log in.';
    message.className = 'auth-message success';
    setTimeout(() => {
      showLoginTab();
    }, 1200);
    return;
  }

  if (authState.flow === 'reset') {
    const newPassword = document.getElementById('resetPassword').value.trim();
    const newPasswordConfirm = document.getElementById('resetConfirmPassword').value.trim();

    if (code !== user.resetCode) {
      message.textContent = 'Incorrect reset code. Please try again.';
      message.className = 'auth-message error';
      return;
    }

    if (!newPassword || !newPasswordConfirm) {
      message.textContent = 'Enter and confirm your new password.';
      message.className = 'auth-message error';
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      message.textContent = 'Passwords do not match.';
      message.className = 'auth-message error';
      return;
    }

    if (newPassword.length < 6) {
      message.textContent = 'Use a password with at least 6 characters.';
      message.className = 'auth-message error';
      return;
    }

    updateUser({ ...user, password: newPassword, resetCode: null });
    message.textContent = 'Password reset successful. Please log in with your new password.';
    message.className = 'auth-message success';
    setTimeout(() => {
      showLoginTab();
    }, 1200);
    return;
  }
}

function showVerificationStep(flow, user, contactLabel) {
  authState.flow = flow;
  authState.userId = user.id;

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const forgotForm = document.getElementById('forgotForm');
  const verifySection = document.getElementById('verifySection');
  const verifyTitle = document.getElementById('verifyTitle');
  const verificationPrompt = document.getElementById('verificationPrompt');
  const resetPasswordFields = document.getElementById('resetPasswordFields');
  const verifyMessage = document.getElementById('verifyMessage');

  if (loginForm) loginForm.style.display = 'none';
  if (registerForm) registerForm.style.display = 'none';
  if (forgotForm) forgotForm.style.display = 'none';
  if (verifySection) verifySection.style.display = 'flex';

  verifyTitle.textContent = flow === 'reset' ? 'Reset Your Password' : 'Verify Your Account';
  verificationPrompt.textContent = `Enter the 6-digit code sent to ${contactLabel}.`;
  if (verifyMessage) {
    const code = flow === 'register' ? user.verificationCode : user.resetCode;
    verifyMessage.textContent = `Sending code... In this demo, use ${code}.`;
    verifyMessage.className = 'auth-message';
  }

  if (resetPasswordFields) {
    resetPasswordFields.style.display = flow === 'reset' ? 'flex' : 'none';
  }
}

function showLoginTab() {
  resetAuthForms();
  switchTab('login');
}

function showForgotForm() {
  resetAuthForms();
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('forgotForm').style.display = 'flex';
  document.getElementById('loginTab').classList.remove('active');
  document.getElementById('registerTab').classList.remove('active');
}

function cancelVerification() {
  resetAuthForms();
  showLoginTab();
}

function togglePasswordVisibility(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  const button = input.parentElement?.querySelector('.password-toggle');
  if (button) {
    button.textContent = isHidden ? '🙈' : '👁️';
  }
}

function resetAuthForms() {
  authState.flow = null;
  authState.userId = null;

  const loginMessage = document.getElementById('loginMessage');
  const registerMessage = document.getElementById('registerMessage');
  const forgotMessage = document.getElementById('forgotMessage');
  const verifyMessage = document.getElementById('verifyMessage');

  if (loginMessage) {
    loginMessage.textContent = '';
    loginMessage.className = 'auth-message';
  }
  if (registerMessage) {
    registerMessage.textContent = '';
    registerMessage.className = 'auth-message';
  }
  if (forgotMessage) {
    forgotMessage.textContent = '';
    forgotMessage.className = 'auth-message';
  }
  if (verifyMessage) {
    verifyMessage.textContent = '';
    verifyMessage.className = 'auth-message';
  }

  const verifySection = document.getElementById('verifySection');
  if (verifySection) {
    verifySection.style.display = 'none';
  }
}

function switchTab(tab) {
  resetAuthForms();
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');

  if (tab === 'login') {
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    loginTab.classList.remove('active');
    registerTab.classList.add('active');
  }
}

function renderSuccessPage() {
  // Require authentication to view order confirmation
  if (!requireAuth()) return;

  const successContent = document.getElementById('successContent');
  if (!successContent) return;

  const lastOrder = getLastOrder();
  if (!lastOrder) {
    successContent.innerHTML = `
      <div class="success-message">
        <h2>No Order Found</h2>
        <p>It seems there was an issue with your order. Please contact support if you believe this is an error.</p>
        <a href="index.html" class="btn btn-primary">Return to Home</a>
      </div>
    `;
    return;
  }

  successContent.innerHTML = `
    <div class="success-message">
      <div class="success-icon">✅</div>
      <h2>Order Confirmed!</h2>
      <p>Thank you for your purchase. Your voucher code has been generated and is ready for use.</p>

      <div class="order-details">
        <h3>Order Details</h3>
        <p><strong>Product:</strong> ${lastOrder.productName}</p>
        <p><strong>Quantity:</strong> ${lastOrder.quantity || 1}</p>
        <p><strong>Total Paid:</strong> ${formatCurrency(lastOrder.totalPrice || lastOrder.price)}</p>
        <p><strong>Voucher Code:</strong> <span class="voucher-code">${lastOrder.voucherCode}</span></p>
        <p><strong>Reference:</strong> ${lastOrder.paymentReference || 'N/A'}</p>
      </div>

      <div class="success-actions">
        <a href="index.html" class="btn btn-primary">Continue Shopping</a>
        <button onclick="printVoucher()" class="btn btn-secondary">Print Voucher</button>
      </div>

      <div class="voucher-instructions">
        <h4>How to Use Your Voucher</h4>
        <ol>
          <li>Save this voucher code: <strong>${lastOrder.voucherCode}</strong></li>
          <li>Visit the relevant platform (WAEC, University portal, etc.)</li>
          <li>Enter the voucher code when prompted for payment</li>
          <li>Complete your verification or application process</li>
        </ol>
      </div>
    </div>
  `;
}

function adminLogout() {
  clearAdminSession();
  window.location.href = 'admin.html'; // Re-render to show login form
}

function renderAdminPage() {
  const loginCard = document.getElementById('adminLoginCard');
  const adminContent = document.getElementById('adminContent');

  if (!loginCard || !adminContent) {
    console.log('Admin DOM elements not found');
    return;
  }

  console.log('Admin logged in:', isAdminLoggedIn());

  if (isAdminLoggedIn()) {
    // Show admin content
    loginCard.style.display = 'none';
    adminContent.style.display = 'block';

    // Initialize admin functionality
    const form = document.getElementById('adminProductForm');
    const orderList = document.getElementById('adminOrderList');
    const message = document.getElementById('adminProductMessage');
    const imageInput = document.getElementById('adminImage');
    const imagePreview = document.getElementById('imagePreview');

    if (!form || !orderList) return;

    // Only add event listeners if they haven't been added yet
    if (!form.hasAttribute('data-listeners-added')) {
      // Handle file upload preview
      imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      });

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const title = document.getElementById('adminTitle').value.trim();
        const shortDescription = document.getElementById('adminShortDesc').value.trim();
        const description = document.getElementById('adminDescription').value.trim();
        const price = parseFloat(document.getElementById('adminPrice').value);
        const imageBase64 = imagePreview.style.display === 'block' ? imagePreview.src : null;

        if (!title || !shortDescription || !description || Number.isNaN(price) || price <= 0) {
          message.textContent = 'Please fill in all product fields with valid values.';
          return;
        }

        const products = getProducts() || [];
        if (adminEditProductId) {
          const updated = products.map((product) => {
            if (product.id === adminEditProductId) {
              return {
                ...product,
                title,
                shortDescription,
                description,
                price,
                image: imageBase64 || product.image
              };
            }
            return product;
          });
          saveProducts(updated);
          message.textContent = 'Product updated successfully!';
        } else {
          products.push({
            id: `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            title,
            shortDescription,
            description,
            price,
            image: imageBase64,
            active: true
          });
          saveProducts(products);
          message.textContent = 'Product added successfully!';
        }

        resetAdminProductForm();
        document.getElementById('adminImageUrl').value = '';
        document.getElementById('imageLoadMessage').textContent = '';
        renderHomePage();
        renderAdminProducts();
      });

      // Mark that listeners have been added
      form.setAttribute('data-listeners-added', 'true');
      setupAdminFormControls();
    }

    renderAdminProducts();

    const orders = getOrders();
    if (orders.length === 0) {
      orderList.innerHTML = '<p>No orders yet.</p>';
      return;
    }

    orderList.innerHTML = orders
      .map(
        (order) => `
        <div class="order-item">
          <p><strong>${order.customerName}</strong> (${order.customerEmail})</p>
          <p>Product: ${order.productName}</p>
          <p>Quantity: ${order.quantity || 1}</p>
          <p>Unit Price: ${formatCurrency(order.price)}</p>
          <p>Total Paid: ${formatCurrency(order.totalPrice || order.price)}</p>
          <p>Voucher: ${order.voucherCode || 'Pending'}</p>
          <p class="hint">Ref: ${order.paymentReference || 'N/A'}</p>
        </div>
      `
      )
      .join('');
  } else {
    // Show login form
    loginCard.style.display = 'block';
    adminContent.style.display = 'none';

    const loginForm = document.getElementById('adminLoginForm');
    const loginMessage = document.getElementById('adminLoginMessage');

    if (!loginForm) return;

    // Only add login form listener if not already added
    if (!loginForm.hasAttribute('data-login-listener-added')) {
      loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const username = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value.trim();

        if (!username || !password) {
          loginMessage.textContent = 'Please enter both username and password.';
          return;
        }

        const result = adminLogin(username, password);
        loginMessage.textContent = result.message;

        if (result.success) {
          // Re-render to show admin content
          renderAdminPage();
        }
      });

      // Mark that login listener has been added
      loginForm.setAttribute('data-login-listener-added', 'true');
    }
  }
}

function setupAdminFormControls() {
  const cancelBtn = document.getElementById('adminCancelEditBtn');
  if (cancelBtn && !cancelBtn.hasAttribute('data-cancel-listener-added')) {
    cancelBtn.addEventListener('click', cancelEditProduct);
    cancelBtn.setAttribute('data-cancel-listener-added', 'true');
  }
}

function runPage() {
  applyTheme(getSavedTheme());
  renderNavigation();
  const path = window.location.pathname.split('/').pop();

  if (path === 'index.html' || path === '') {
    renderHomePage();
  } else if (path === 'product.html') {
    renderProductPage();
  } else if (path === 'checkout.html') {
    renderCheckoutPage();
  } else if (path === 'success.html') {
    renderSuccessPage();
  } else if (path === 'admin.html') {
    renderAdminPage();
    seedProducts();
  } else if (path === 'login.html') {
    renderLoginPage();
  }
}

function renderAdminProducts() {
  const productList = document.getElementById('adminProductList');
  if (!productList) return;

  const products = getProducts() || [];
  if (products.length === 0) {
    productList.innerHTML = '<p>No products have been added yet.</p>';
    return;
  }

  productList.innerHTML = products
    .map((product) => `
      <div class="admin-product-item">
        <div class="product-summary">
          <strong>${product.title}</strong>
          <span class="product-status ${product.active ? 'active' : 'inactive'}">${product.active ? 'ACTIVE' : 'INACTIVE'}</span>
        </div>
        <p>${product.shortDescription}</p>
        <p>Price: ${formatCurrency(product.price)}</p>
        <div class="admin-product-actions">
          <button class="btn btn-secondary" onclick="toggleProductActive('${product.id}')">${product.active ? 'Deactivate' : 'Activate'}</button>
          <button class="btn btn-secondary" onclick="editProduct('${product.id}')">Edit</button>
          <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">Delete</button>
        </div>
      </div>
    `)
    .join('');
}

function deleteProduct(productId) {
  const products = getProducts() || [];
  const updated = products.filter((product) => product.id !== productId);
  saveProducts(updated);
  if (getSelectedProductId() === productId) {
    clearSelectedProductId();
  }
  renderAdminProducts();
  renderHomePage();
}

function toggleProductActive(productId) {
  const products = getProducts() || [];
  const updated = products.map((product) => {
    if (product.id === productId) {
      return { ...product, active: !product.active };
    }
    return product;
  });
  saveProducts(updated);
  renderAdminProducts();
  renderHomePage();
}

runPage();
