(() => {
  const body = document.body;
  const toastStack = document.querySelector('[data-toast-stack]');

  const hasStorage = (() => {
    try {
      localStorage.setItem('__qa_cart_test', '1');
      localStorage.removeItem('__qa_cart_test');
      return true;
    } catch (_) {
      return false;
    }
  })();

  const createStore = (key, { json = false } = {}) => ({
    read() {
      if (!hasStorage) return null;
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      if (json) {
        try {
          return JSON.parse(raw);
        } catch (_) {
          return null;
        }
      }
      const qty = Number(raw);
      return Number.isFinite(qty) ? qty : null;
    },
    write(value) {
      if (!hasStorage) return;
      const content = json ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, content);
    },
    clear() {
      if (!hasStorage) return;
      localStorage.removeItem(key);
    },
  });

  const cartStore = createStore('qa-cart-qty');
  const itemsStore = createStore('qa-cart-items', { json: true });

  const getCartItems = () => itemsStore.read() || [];
  const setCartItems = (items) => {
    itemsStore.write(items);
    const totalQty = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
    persistCartQty(totalQty);
  };

  const showToast = ({ title, message, duration = 5000 }) => {
    if (!toastStack) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-header">
        <div>
          <p class="toast-title">${title}</p>
          <p class="toast-message">${message}</p>
        </div>
        <button class="toast-close" aria-label="Close" data-toast-close>&times;</button>
      </div>
    `;
    toastStack.appendChild(toast);
    const remove = () => {
      toast.classList.add('dismiss');
      setTimeout(() => toast.remove(), 180);
    };
    const timer = setTimeout(remove, duration);
    toast.querySelector('[data-toast-close]')?.addEventListener('click', () => {
      clearTimeout(timer);
      remove();
    });
  };

  const updateCartBadge = (qty) => {
    const badge = document.querySelector('.cart-count');
    if (badge) {
      const safeValue = Number.isFinite(qty) ? Math.max(0, qty) : 0;
      badge.textContent = safeValue;
    }
  };

  const persistCartQty = (qty) => {
    cartStore.write(qty);
    updateCartBadge(qty);
  };

  const clearCartState = () => {
    cartStore.write(0);
    itemsStore.write([]);
    updateCartBadge(0);
  };

  const existingItems = getCartItems();
  if (existingItems.length) {
    const totalQty = existingItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
    persistCartQty(totalQty);
  } else {
    const storedQty = cartStore.read();
    if (storedQty !== null) {
      updateCartBadge(storedQty);
    }
  }

  if (body.classList.contains('page-catalog')) {
    initCatalog();
  }
  if (body.classList.contains('page-cart')) {
    initCart();
  }
  if (body.classList.contains('page-checkout')) {
    initCheckout();
  }
  if (body.classList.contains('page-orders')) {
    initOrders();
  }
  if (body.classList.contains('page-order-detail')) {
    initOrderDetail();
  }

  function initCatalog() {
    const searchInput = document.querySelector('[data-catalog-search]');
    const hideOut = document.querySelector('[data-hide-out]');
    const sortSelect = document.querySelector('[data-sort]');
    const cards = Array.from(document.querySelectorAll('[data-product]'));
    const grid = document.querySelector('.product-grid');

    const applyFilters = () => {
      const query = (searchInput?.value || '').toLowerCase();
      cards.forEach((card) => {
        const matches =
          !query || card.dataset.name?.toLowerCase().includes(query);
        const isHidden = hideOut?.checked && card.dataset.stock === 'out';
        card.style.display = matches && !isHidden ? '' : 'none';
      });
    };

    const applySort = () => {
      const value = sortSelect?.value || 'name';
      const sorted = [...cards].sort((a, b) => {
        if (value === 'name') {
          return a.dataset.name.localeCompare(b.dataset.name);
        }
        if (value === 'price-asc') {
          return Number(a.dataset.price) - Number(b.dataset.price);
        }
        return Number(b.dataset.price) - Number(a.dataset.price);
      });
      sorted.forEach((card) => grid?.appendChild(card));
    };

    searchInput?.addEventListener('input', applyFilters);
    hideOut?.addEventListener('change', applyFilters);
    sortSelect?.addEventListener('change', applySort);
    applyFilters();
    applySort();

    document.querySelectorAll('[data-add-to-cart]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        const product = {
          id: button.dataset.productId,
          name: button.dataset.productName,
          sku: button.dataset.productSku,
          price: Number(button.dataset.productPrice),
          description: button.dataset.productDescription,
        };
        const items = getCartItems();
        const existing = items.find((item) => item.id === product.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          items.push({ ...product, quantity: 1 });
        }
        setCartItems(items);
        showToast({
          title: 'Added to cart',
          message: `${product.name} has been added to your cart.`,
        });
      });
    });
  }

  function initCart() {
    const listEl = document.querySelector('[data-cart-items]');
    const emptyEl = document.querySelector('[data-cart-empty]');
    const subtotalEl = document.querySelector('[data-subtotal]');
    const shippingEl = document.querySelector('[data-shipping]');
    const totalEl = document.querySelector('[data-total]');
    const summaryPanel = document.querySelector('.order-summary');
    if (!listEl || !summaryPanel) return;

    const shippingCost = Number(window.cartConfig?.shipping || 0);
    const confirmRemoval = () =>
      window.confirm('Are you sure you want to remove this item from cart?');

    const render = () => {
      const items = getCartItems();
      if (!items.length) {
        listEl.innerHTML = '';
        emptyEl?.classList.remove('hidden');
        summaryPanel.classList.add('hidden');
        persistCartQty(0);
        return;
      }

      emptyEl?.classList.add('hidden');
      summaryPanel.classList.remove('hidden');

      listEl.innerHTML = items
        .map(
          (item) => `
        <div class="cart-item" data-item-id="${item.id}">
          <div class="item-thumb">
            <span class="image-placeholder">IMG</span>
          </div>
          <div class="item-details">
            <div class="item-head">
              <div>
                <h2>${item.name}</h2>
                <p class="muted">£${Number(item.price).toFixed(2)} each</p>
                <p class="muted small">SKU: ${item.sku}</p>
              </div>
              <div class="item-price">
                £${(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
            <div class="item-actions">
              <div class="quantity-picker">
                <button class="btn icon" data-action="decrement" data-id="${item.id}">-</button>
                <span>${item.quantity}</span>
                <button class="btn icon" data-action="increment" data-id="${item.id}">+</button>
              </div>
              <button class="btn ghost danger small" data-action="remove" data-id="${item.id}">
                &#128465;
              </button>
            </div>
          </div>
        </div>
      `,
        )
        .join('');

      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      subtotalEl.textContent = subtotal.toFixed(2);
      shippingEl.textContent = shippingCost.toFixed(2);
      totalEl.textContent = (subtotal + shippingCost).toFixed(2);
    };

    const adjustQuantity = (id, delta) => {
      const items = getCartItems();
      const target = items.find((item) => item.id === id);
      if (!target) return;
      const nextQty = target.quantity + delta;
      if (nextQty < 1) {
        if (!confirmRemoval()) {
          render();
          return;
        }
        setCartItems(items.filter((item) => item.id !== id));
      } else {
        target.quantity = nextQty;
        setCartItems(items);
      }
      render();
    };

    const removeItem = (id) => {
      if (!confirmRemoval()) return;
      setCartItems(getCartItems().filter((item) => item.id !== id));
      render();
    };

    listEl.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { action, id } = button.dataset;
      if (action === 'increment') {
        adjustQuantity(id, 1);
      } else if (action === 'decrement') {
        adjustQuantity(id, -1);
      } else if (action === 'remove') {
        removeItem(id);
      }
    });

    render();
  }

  function initCheckout() {
    const shippingSelect = document.querySelector('[data-shipping-select]');
    const subtotalSpan = document.querySelectorAll('[data-subtotal]');
    const shippingSpan = document.querySelectorAll('[data-shipping]');
    const totalSpan = document.querySelectorAll('[data-total]');
    const summaryList = document.querySelector('[data-checkout-items]');
    const form = document.getElementById('checkout-form');
    const alertBox = document.querySelector('[data-alert]');

    if (!form || !summaryList) return;

    let items = getCartItems();
    if (!items.length) {
      window.location.href = '/';
      return;
    }

    const renderCheckoutItems = () => {
      items = getCartItems();
      if (!items.length) {
        window.location.href = '/';
        return;
      }
      summaryList.innerHTML = items
        .map(
          (item) => `
        <div class="checkout-line">
          <div>
            <strong>${item.name}</strong>
            <p class="muted small">SKU: ${item.sku}</p>
          </div>
          <div class="muted">${item.quantity} × £${item.price.toFixed(2)}</div>
        </div>
      `,
        )
        .join('');
    };
    renderCheckoutItems();

    const getShippingCost = () => {
      const option = shippingSelect?.selectedOptions?.[0];
      return Number(option?.dataset.cost || 0);
    };

    const updateTotals = () => {
      const shippingCost = getShippingCost();
      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const total = subtotal + shippingCost;
      subtotalSpan.forEach((el) => (el.textContent = subtotal.toFixed(2)));
      shippingSpan.forEach((el) => (el.textContent = shippingCost.toFixed(2)));
      totalSpan.forEach((el) => (el.textContent = total.toFixed(2)));
    };

    shippingSelect?.addEventListener('change', updateTotals);
    updateTotals();

    const togglePaymentPanels = () => {
      const selected = form?.paymentMethod?.value;
      document
        .querySelectorAll('[data-payment-panel]')
        .forEach((panel) =>
          panel.classList.toggle(
            'hidden',
            panel.dataset.paymentPanel !== selected,
          ),
        );
    };

    document
      .querySelectorAll('input[name="paymentMethod"]')
      .forEach((radio) =>
        radio.addEventListener('change', togglePaymentPanels),
      );
    togglePaymentPanels();

    const showAlert = (msg, type) => {
      if (!alertBox) return;
      alertBox.textContent = msg;
      alertBox.classList.remove('hidden', 'success', 'error');
      alertBox.classList.add(type === 'error' ? 'error' : 'success');
    };

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const paymentMethod = formData.get('paymentMethod');
      const shippingCost = getShippingCost();
      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const orderItems = items.map((item) => ({
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
      }));
      const paymentDetails = {};

      if (paymentMethod === 'Credit Card') {
        const cardNumber = (formData.get('cardNumber') || '')
          .toString()
          .replace(/\s+/g, '');
        if (cardNumber) {
          paymentDetails.cardEnding = cardNumber.slice(-4);
        }
        paymentDetails.cardName = formData.get('cardName');
      } else if (paymentMethod?.includes('PayPal')) {
        paymentDetails.note = 'PayPal sandbox authorization';
      } else {
        paymentDetails.reference = 'Bank transfer placeholder';
      }

      const payload = {
        customerName: formData.get('customerName'),
        email: formData.get('email'),
        streetAddress: formData.get('streetAddress'),
        city: formData.get('city'),
        zipCode: formData.get('zipCode'),
        shippingMethod:
          shippingSelect?.selectedOptions?.[0]?.textContent?.trim() ||
          'Standard',
        paymentMethod,
        paymentDetails,
        items: orderItems,
        subtotal,
        shipping: shippingCost,
        total: subtotal + shippingCost,
      };

      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error('Request failed');
        }
        const data = await response.json();
        showAlert(`Order ${data.orderNumber} created. Redirecting...`, 'success');
        clearCartState();
        setTimeout(() => {
          window.location.href = '/orders';
        }, 1200);
      } catch (error) {
        showAlert('Unable to place order. Please retry.', 'error');
      }
    });
  }

  function initOrders() {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'ordersHeight') {
        const iframe = document.querySelector('[data-orders-iframe]');
        if (iframe) {
          iframe.style.height = `${event.data.height}px`;
        }
      }
    });
  }

  function initOrderDetail() {
    const detail = window.orderDetail;
    if (!detail) return;

    const cancelBtn = document.querySelector('[data-cancel-order]');
    const modal = document.querySelector('[data-modal]');
    const confirmBtn = document.querySelector('[data-confirm-cancel]');
    const closeBtn = document.querySelector('[data-close-modal]');
    const alertBox = document.querySelector('[data-order-alert]');
    const statusBadge = document.querySelector('[data-order-status]');
    const cancelMessage = document.querySelector('[data-cancel-message]');

    const showAlert = (message, type) => {
      if (!alertBox) return;
      alertBox.textContent = message;
      alertBox.classList.remove('hidden', 'success', 'error');
      alertBox.classList.add(type === 'error' ? 'error' : 'success');
    };

    const openModal = () => modal?.classList.remove('hidden');
    const closeModal = () => modal?.classList.add('hidden');
    closeModal();

    cancelBtn?.addEventListener('click', () => {
      if (cancelBtn.disabled) return;
      openModal();
    });

    closeBtn?.addEventListener('click', closeModal);

    confirmBtn?.addEventListener('click', async () => {
      try {
        confirmBtn.disabled = true;
        const response = await fetch(
          `/api/orders/${detail.orderNumber}/cancel`,
          { method: 'POST' },
        );
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error || 'Unable to cancel order');
        }
        showAlert(`Order ${body.orderNumber} cancelled.`, 'success');
        cancelBtn.disabled = true;
        statusBadge.textContent = 'Cancelled';
        statusBadge.classList.add('status-cancelled');
        cancelMessage.textContent = 'This order has been cancelled.';
      } catch (error) {
        showAlert(error.message, 'error');
      } finally {
        confirmBtn.disabled = false;
        closeModal();
      }
    });
  }
})();
