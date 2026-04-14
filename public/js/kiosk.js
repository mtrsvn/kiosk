document.addEventListener('DOMContentLoaded', () => {
    const menuGrid = document.getElementById('menu-grid');
    const categoryTitle = document.getElementById('category-title');
    const categoriesNav = document.getElementById('categories');
    const loadingScreen = document.getElementById('loading-screen');
    const startScreen = document.getElementById('start-screen');
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');

    // Create a shared animated indicator for the sidebar
    const sidebarIndicator = document.createElement('div');
    sidebarIndicator.className = 'sidebar-indicator';
    if (sidebar) {
        sidebar.appendChild(sidebarIndicator);
        // anchor the indicator at top:0 so translateY is a stable transform baseline
        sidebarIndicator.style.top = '0px';
        sidebarIndicator.style.transform = 'translateY(0)';
    }

    let indicatorRaf = null;
    const INDICATOR_HEIGHT = 40; // px, should match CSS

    function moveSidebarIndicator(target) {
        if (!target || !sidebarIndicator || !sidebar) return;

        // cancel in-flight rAF
        if (indicatorRaf) cancelAnimationFrame(indicatorRaf);

        indicatorRaf = requestAnimationFrame(() => {
            // compute offset relative to sidebar using offsetTop to avoid extra layout reads
            // center the indicator inside the target element
            const top = Math.round(target.offsetTop + (target.offsetHeight / 2) - (INDICATOR_HEIGHT / 2));

            // safety: ensure top is at least 0 and within sidebar bounds
            const maxTop = Math.max(0, sidebar.scrollHeight - INDICATOR_HEIGHT - 8);
            const clampedTop = Math.min(Math.max(0, top), maxTop);

            // use transform for smooth GPU-accelerated animation
            sidebarIndicator.style.transform = `translateY(${clampedTop}px)`;
            // ensure height stays consistent
            sidebarIndicator.style.height = INDICATOR_HEIGHT + 'px';
        });
    }
    const cartItemsContainer = document.getElementById('cart-items');
    const totalAmountSpan = document.getElementById('total-amount');
    const checkoutBtn = document.querySelector('.checkout-btn');
    const searchInput = document.querySelector('.search-bar input');

    let menuData = [];
    let cart = [];

    // Hide loading screen after 1s
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 1000);

    // Start Order — fade out then hide from layout
    // Auth modal elements and behavior
    const authOverlay = document.getElementById('auth-overlay');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginErrors = document.getElementById('login-errors');
    const registerErrors = document.getElementById('register-errors');

    function showAuth() {
        if (!authOverlay) return;
        authOverlay.classList.add('show');
        authOverlay.setAttribute('aria-hidden', 'false');
    }

    function hideAuth() {
        if (!authOverlay) return;
        authOverlay.classList.remove('show');
        authOverlay.setAttribute('aria-hidden', 'true');
    }

    const authTrack = document.getElementById('auth-track');
    const authCarousel = document.getElementById('auth-carousel');
    // tab switching with slide animation
    function switchTo(tab) {
        if (!tabLogin || !tabRegister || !authTrack) return;
        const carouselWidth = (authCarousel && authCarousel.clientWidth) ? authCarousel.clientWidth : 420;
        if (tab === 'login') {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            authTrack.style.transform = `translateX(0px)`;
            if (loginForm) loginForm.classList.add('visible');
            if (registerForm) registerForm.classList.remove('visible');
        } else {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            authTrack.style.transform = `translateX(-${carouselWidth}px)`;
            if (registerForm) registerForm.classList.add('visible');
            if (loginForm) loginForm.classList.remove('visible');
        }

        
    }

    if (tabLogin) tabLogin.addEventListener('click', () => switchTo('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchTo('register'));

    // If not authenticated, show auth modal on load
    if (typeof window.isAuthenticated !== 'undefined' && !window.isAuthenticated) {
        showAuth();
        // ensure initial tab/form is visible
        switchTo('login');
    }

    // Start Order — fade out then hide from layout (gated by auth)
    startScreen.addEventListener('click', () => {
        if (typeof window.isAuthenticated !== 'undefined' && !window.isAuthenticated) {
            showAuth();
            return;
        }

        startScreen.classList.add('hidden');

        const onTransitionEnd = (e) => {
            // wait for opacity transition to finish
            if (e.propertyName === 'opacity') {
                startScreen.style.display = 'none';
                startScreen.removeEventListener('transitionend', onTransitionEnd);
            }
        };

        startScreen.addEventListener('transitionend', onTransitionEnd);
    });

    // Attach login/register submission handlers
    const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
    const csrfToken = csrfTokenMeta ? csrfTokenMeta.getAttribute('content') : null;

    async function submitForm(url, form, errorsEl) {
        errorsEl.textContent = '';
        const formData = new FormData(form);
        // ensure CSRF token is included in the form body as a fallback
        if (csrfToken && !formData.has('_token')) {
            formData.append('_token', csrfToken);
        }
        // disable form controls while request is in-flight to avoid UI confusion
        const controls = Array.from(form.elements).filter(el => el.tagName !== 'FIELDSET');
        controls.forEach(el => el.disabled = true);
        try {
            const res = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' },
                body: formData
            });

            let json = {};
            try { json = await res.json(); } catch (e) { /* ignore JSON parse errors */ }

            if (res.ok && json.success) {
                window.isAuthenticated = true;
                window.userRole = json.role || null;
                hideAuth();
                try { await flushPendingCartAdds(); } catch (e) { console.error('flush after auth failed', e); }
                // reveal Exit button after successful auth
                const btn = document.querySelector('.logout-btn');
                if (btn) btn.classList.remove('hidden');
                // reveal admin Edit button if admin
                const adminBtn = document.querySelector('.admin-edit-btn');
                if (adminBtn) {
                    if (window.userRole === 'admin') adminBtn.classList.remove('hidden');
                    else adminBtn.classList.add('hidden');
                }
                return true;
            }

            // show errors
            if (json && json.errors) {
                const msgs = [];
                Object.values(json.errors).forEach(arr => { if (Array.isArray(arr)) msgs.push(...arr); });
                errorsEl.textContent = msgs.join(' ');
            } else if (json && json.message) {
                errorsEl.textContent = json.message;
            } else if (!res.ok) {
                errorsEl.textContent = `Error: ${res.status} ${res.statusText}`;
            } else {
                errorsEl.textContent = 'Authentication failed.';
            }

            // focus the password field so user can correct it immediately
            const pw = form.querySelector('input[name="password"]');
            if (pw) pw.focus();

        } catch (err) {
            errorsEl.textContent = 'Network error. Please try again.';
            console.error(err);
        } finally {
            // re-enable controls so user can try again
            controls.forEach(el => el.disabled = false);
        }

        return false;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitForm('/login', loginForm, loginErrors);
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const ok = await submitForm('/register', registerForm, registerErrors);
            if (ok) {
                // optionally switch to logged-in state
            }
        });
    }

    // Logout button: show/hide and click behavior
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        if (typeof window.isAuthenticated !== 'undefined' && !window.isAuthenticated) {
            logoutBtn.classList.add('hidden');
        } else {
            logoutBtn.classList.remove('hidden');
        }

        logoutBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/logout', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' }
                });
                if (res.ok) {
                    window.isAuthenticated = false;
                    window.userRole = null;
                    logoutBtn.classList.add('hidden');
                    const adminBtn = document.querySelector('.admin-edit-btn');
                    if (adminBtn) adminBtn.classList.add('hidden');
                    showAuth();
                } else {
                    console.error('Logout failed');
                }
            } catch (err) {
                console.error('Logout error', err);
            }
        });
    }

    // initialize lucide icons now that DOM is ready
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    } else if (window.lucide && typeof window.lucide.replace === 'function') {
        window.lucide.replace();
    }

    // Build sidebar from menuData
    function buildSidebarFromMenu() {
        if (!categoriesNav) return;
        // derive categories from menuData (exclude Combo)
        const cats = [];
        if (Array.isArray(menuData) && menuData.length > 0) {
            menuData.forEach(item => {
                const c = item.category || '';
                if (!c) return;
                if (c === 'Combo') return; // exclude combo
                if (!cats.includes(c)) cats.push(c);
            });
        }

        const consolidated = [];
        if (menuData && menuData.length > 0) consolidated.push('Popular');
        cats.forEach(c => { if (!consolidated.includes(c)) consolidated.push(c); });

        // clear and build buttons
        categoriesNav.innerHTML = '';
        consolidated.forEach((cat, idx) => {
            const btn = document.createElement('button');
            btn.className = 'nav-item' + (idx === 0 ? ' active' : '');
            btn.dataset.category = cat;
            btn.innerHTML = `<span class="icon"></span><span class="label">${cat}</span>`;
            btn.addEventListener('click', () => {
                // handle active state
                categoriesNav.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
                moveSidebarIndicator(btn);
                // animate main content then render
                if (mainContent) {
                    mainContent.classList.add('slide-out');
                    const onTransitionEnd = (e) => {
                        if (e.propertyName !== 'opacity') return;
                        mainContent.removeEventListener('transitionend', onTransitionEnd);
                        renderMenu(btn.dataset.category);
                        void mainContent.offsetWidth;
                        mainContent.classList.remove('slide-out');
                        mainContent.classList.add('slide-in');
                        setTimeout(() => mainContent.classList.remove('slide-in'), 380);
                    };
                    mainContent.addEventListener('transitionend', onTransitionEnd);
                } else {
                    renderMenu(btn.dataset.category);
                }
                const si = document.querySelector('.search-bar input'); if (si) si.value = '';
            });
            categoriesNav.appendChild(btn);
        });

        // position indicator at the initially active nav item
        const initiallyActive = categoriesNav.querySelector('.nav-item.active');
        if (initiallyActive) moveSidebarIndicator(initiallyActive);
    }

    // Fetch Menu Data with sessionStorage cache
    const cached = sessionStorage.getItem('menuData');
    if (cached) {
        try {
            menuData = JSON.parse(cached);
            buildSidebarFromMenu();
            renderMenu('Popular');
        } catch (e) {
            sessionStorage.removeItem('menuData');
        }
    }

    fetch('/menu.json')
        .then(response => response.json())
        .then(data => {
            // exclude Combo items from client menu data
            menuData = Array.isArray(data) ? data.filter(d => (d.category || d.category_group || '') !== 'Combo').map(d => ({
                id: d.id,
                name: d.name,
                price: d.price,
                description: d.description || '',
                // prefer category_group field from legacy file if present
                category: d.category_group ?? d.category ?? '',
                image: d.image || '',
                popular: !!d.popular
            })) : [];
            try { sessionStorage.setItem('menuData', JSON.stringify(menuData)); } catch (e) {}
            buildSidebarFromMenu();
            renderMenu('Popular');
        })
        .catch(err => console.error('Error loading menu:', err));

    // If authenticated, load server-side cart and merge into local cart
    if (typeof window.isAuthenticated !== 'undefined' && window.isAuthenticated) {
        fetch('/cart', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
            .then(r => r.json())
            .then(json => {
                if (json && Array.isArray(json.items)) {
                    // convert server items to local shape
                    cart = json.items.map(it => ({ id: it.product_id, product_id: it.product_id, product_name: it.product_name, name: it.product_name, price: Number(it.price), qty: Number(it.quantity), image: it.image || '' }));
                    updateCart();
                }
            })
            .catch(err => console.error('Failed to load server cart', err));
    }

    // Render Menu Items
    function renderMenu(category, query = '') {
        // Clear and build with a document fragment to minimize reflows
        menuGrid.innerHTML = '';
        categoryTitle.textContent = category === 'Popular' ? 'Most ordered right now' : category;

        const filtered = menuData.filter(item => {
            let matchesCategory = false;
            if (category === 'Popular') {
                matchesCategory = item.popular === true;
            } else {
                matchesCategory = (item.category === category);
            }
            const matchesSearch = item.name.toLowerCase().includes(query.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            menuGrid.innerHTML = '<div class="no-results">No items found.</div>';
            return;
        }

        const frag = document.createDocumentFragment();

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-card';
            card.dataset.id = item.id;
            card.innerHTML = `
                <div class="card-img-container">
                    <img src="${item.image}" alt="${item.name}" loading="lazy" decoding="async" onerror="this.src='https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop'">
                </div>
                <div class="card-info">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                        <div class="card-footer">
                            <span class="price">PHP ${item.price}</span>
                            <button class="add-btn" data-id="${item.id}">+</button>
                        </div>
                </div>
            `;

            frag.appendChild(card);
        });

        menuGrid.appendChild(frag);
    }

    // (Sidebar navigation is built dynamically by buildSidebarFromMenu)

    // Event delegation on menu grid to reduce listeners
    menuGrid.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-btn');
        if (addBtn) {
            const id = Number(addBtn.dataset.id);
            const item = menuData.find(m => m.id === id);
            if (item) showDetails(item); // open modal first so user can choose qty
            return;
        }

        const card = e.target.closest('.menu-card');
        if (card) {
            const id = Number(card.dataset.id);
            const item = menuData.find(m => m.id === id);
            if (item) showDetails(item);
        }
    });

    // Search Functionality — debounced to reduce render churn
    function debounce(fn, wait) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    const onSearch = debounce((e) => {
        const activeCategory = document.querySelector('.nav-item.active').dataset.category;
        renderMenu(activeCategory, e.target.value);
    }, 300);

    searchInput.addEventListener('input', onSearch);

    // Cart Functions
    function addToCart(item, qty = 1) {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({ ...item, qty: qty });
        }
        updateCart();
        // persist to server cart if authenticated, otherwise queue for flush after login
        const payload = { product_id: Number(item.id || item.product_id || item.sku), quantity: qty || 1 };
        if (typeof window.isAuthenticated !== 'undefined' && window.isAuthenticated) {
            try {
                fetch('/cart/add', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }).then(res => res.json()).then(json => {
                    // server responded; optionally refresh local cart from server
                    if (json && json.cart) {
                        cart = json.cart.map(it => ({ id: it.product_id, name: it.product_name, price: Number(it.price), qty: Number(it.quantity), image: it.image || '' }));
                        updateCart();
                    }
                }).catch(err => console.error('cart add failed', err));
            } catch (e) { console.error(e); }
        } else {
            // queue pending adds in sessionStorage
            try {
                const key = 'pendingCartAdds';
                const pending = JSON.parse(sessionStorage.getItem(key) || '[]');
                pending.push(payload);
                sessionStorage.setItem(key, JSON.stringify(pending));
                // show auth modal so user can sign in to persist
                showAuth();
            } catch (e) { console.error('failed to queue pending cart add', e); }
        }
    }

    // Flush pending cart adds saved in sessionStorage after successful login
    async function flushPendingCartAdds() {
        try {
            const key = 'pendingCartAdds';
            const pending = JSON.parse(sessionStorage.getItem(key) || '[]');
            if (!Array.isArray(pending) || pending.length === 0) return;
            for (const p of pending) {
                try {
                    await fetch('/cart/add', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' },
                        body: JSON.stringify(p)
                    });
                } catch (e) { console.error('flush pending add failed', e); }
            }
            sessionStorage.removeItem(key);
            // refresh server cart
            try {
                const res = await fetch('/cart', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
                const json = await res.json();
                if (json && Array.isArray(json.items)) {
                    cart = json.items.map(it => ({ id: it.product_id, product_id: it.product_id, product_name: it.product_name, name: it.product_name, price: Number(it.price), qty: Number(it.quantity), image: it.image || '' }));
                    updateCart();
                }
            } catch (e) { console.error('refresh cart after flush failed', e); }
        } catch (e) { console.error(e); }
    }

    function removeFromCart(id) {
        const index = cart.findIndex(c => c.id === id);
        if (index === -1) return;

        // If authenticated, request server to remove the product (server will return updated cart)
        if (typeof window.isAuthenticated !== 'undefined' && window.isAuthenticated) {
            try {
                fetch('/cart/remove', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' },
                    body: JSON.stringify({ product_id: id })
                }).then(res => res.json()).then(json => {
                    if (json && Array.isArray(json.cart)) {
                        cart = json.cart.map(it => ({ id: it.product_id, product_id: it.product_id, product_name: it.product_name, name: it.product_name, price: Number(it.price), qty: Number(it.quantity), image: it.image || '' }));
                        updateCart();
                    } else {
                        // fallback: update local copy
                        if (cart[index].qty > 1) cart[index].qty--; else cart.splice(index, 1);
                        updateCart();
                    }
                }).catch(err => {
                    console.error('cart remove failed', err);
                    // local fallback
                    if (cart[index].qty > 1) cart[index].qty--; else cart.splice(index, 1);
                    updateCart();
                });
            } catch (e) {
                console.error(e);
                if (cart[index].qty > 1) cart[index].qty--; else cart.splice(index, 1);
                updateCart();
            }
        } else {
            // local guest cart update
            if (cart[index].qty > 1) cart[index].qty--; else cart.splice(index, 1);
            updateCart();
        }
    }

    function updateCart() {
        cartItemsContainer.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<div class="empty-cart"><p>Your cart is empty.</p></div>';
            checkoutBtn.disabled = true;
            totalAmountSpan.textContent = 'PHP 0';
            return;
        }

        cart.forEach(item => {
            total += item.price * item.qty;
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop'">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">PHP ${item.price} x ${item.qty}</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn minus" data-id="${item.id}">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn plus" data-id="${item.id}">+</button>
                </div>
            `;
            
            cartItem.querySelector('.minus').addEventListener('click', () => removeFromCart(item.id));
            cartItem.querySelector('.plus').addEventListener('click', () => addToCart(item));

            cartItemsContainer.appendChild(cartItem);
        });

        totalAmountSpan.textContent = `PHP ${total.toLocaleString()}`;
        checkoutBtn.disabled = false;
        
        // Dynamic text for checkout button
        checkoutBtn.textContent = `Checkout (PHP ${total.toLocaleString()})`;
    }

    // Checkout Action
    checkoutBtn.addEventListener('click', async () => {
        if (cart.length === 0) return;

        if (typeof window.isAuthenticated === 'undefined' || !window.isAuthenticated) {
            showAuth();
            return;
        }

        // prepare items payload
        const items = cart.map(i => ({ product_id: i.id || i.product_id, product_name: i.name || i.product_name, price: i.price, quantity: i.qty }));

        try {
            const res = await fetch('/orders', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' },
                body: JSON.stringify({ items })
            });

            const json = await res.json();
            if (res.ok && json.success) {
                const orderId = json.order_id || json.id || Math.floor(1000 + Math.random() * 9000);
                showOrderSuccess('MB-' + orderId);
                // clear local cart
                cart = [];
                updateCart();
            } else {
                console.error('Order failed', json);
                alert('Order failed. Please try again.');
            }
        } catch (err) {
            console.error('Order error', err);
            alert('Network error while placing order.');
        }
    });

    function showOrderSuccess(code) {
        const modal = document.getElementById('product-modal');
        const modalBody = document.getElementById('modal-body-content');
        
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 5rem; margin-bottom: 2rem;"></div>
                <h2 style="font-size: 3rem; font-weight: 800; margin-bottom: 1rem; color: var(--primary);">ORDER SUCCESSFUL!</h2>
                <p style="font-size: 1.2rem; color: var(--on-surface-variant); margin-bottom: 2rem;">Your order is being prepared by the Beast team.</p>
                
                <div style="background: rgba(255, 204, 0, 0.1); border: 2px dashed var(--primary); padding: 2rem; border-radius: 20px; margin-bottom: 3rem;">
                    <span style="font-size: 1rem; text-transform: uppercase; letter-spacing: 2px; color: var(--on-surface-variant);">Your Order Code</span>
                    <h3 style="font-size: 4rem; font-weight: 800; color: var(--primary); margin: 10px 0;">#${code}</h3>
                </div>

                <button class="checkout-btn order-again-btn" style="width: 100%; font-size: 1.5rem; padding: 1.5rem;">Order Again</button>
            </div>
        `;

        modal.classList.add('show');

        modalBody.querySelector('.order-again-btn').onclick = () => {
            modal.classList.remove('show');
        };
    }

    // Modal details
    function showDetails(item) {
        const modal = document.getElementById('product-modal');
        const modalBody = document.getElementById('modal-body-content');
        
        modalBody.innerHTML = `
            <div style="display: flex; gap: 2rem;">
                <div style="flex: 1;">
                    <img src="${item.image}" style="width: 100%; border-radius: 20px;" onerror="this.src='https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop'">
                </div>
                <div style="flex: 1; display: flex; flex-direction: column;">
                    <h2 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem;">${item.name}</h2>
                    <p style="font-size: 1.1rem; color: var(--on-surface-variant); margin-bottom: 2rem; line-height: 1.6;">${item.description}</p>
                    <div style="margin-top: auto;">
                        <label style="display:block; margin-bottom:0.5rem; font-weight:600;">Quantity</label>
                        <div class="qty-controls" style="margin-bottom:1rem;">
                            <button class="qty-btn minus" type="button">-</button>
                            <span>1</span>
                            <button class="qty-btn plus" type="button">+</button>
                            <span style="margin-left:auto; font-size:2rem; font-weight:800; color:var(--primary);">PHP ${item.price}</span>
                        </div>
                        <button class="checkout-btn addToCartFromModal" style="width: 100%;">Add Order to Basket</button>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('show');

        const minusBtn = modalBody.querySelector('.qty-controls .minus');
        const plusBtn = modalBody.querySelector('.qty-controls .plus');
        const qtySpan = modalBody.querySelector('.qty-controls span');

        // ensure the first span is the numeric display
        const qtyDisplay = qtySpan; // already selects the first span inside qty-controls
        qtyDisplay.textContent = '1';

        minusBtn.onclick = () => {
            const v = Math.max(1, parseInt(qtyDisplay.textContent || '1') - 1);
            qtyDisplay.textContent = v;
        };

        plusBtn.onclick = () => {
            const v = Math.max(1, parseInt(qtyDisplay.textContent || '1') + 1);
            qtyDisplay.textContent = v;
        };

        modalBody.querySelector('.addToCartFromModal').onclick = () => {
            const qty = Math.max(1, parseInt(qtyDisplay.textContent || '1'));
            addToCart(item, qty);
            modal.classList.remove('show');
        };

        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('show');

        window.onclick = (event) => {
            if (event.target == modal) {
                modal.classList.remove('show');
            }
        };
    }

    // ── Admin Edit Button & Modal ──
    const adminEditBtn = document.querySelector('.admin-edit-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminModalClose = document.querySelector('.admin-modal-close');
    const adminProductsGrid = document.getElementById('admin-products-grid');
    const adminSearch = document.getElementById('admin-search');
    const adminEditModal = document.getElementById('admin-edit-modal');
    const adminEditClose = document.querySelector('.admin-edit-close');
    const adminEditForm = document.getElementById('admin-edit-form');
    const adminDeleteBtn = document.getElementById('admin-delete-btn');
    const adminAddBtn = document.getElementById('admin-add-btn');

    let adminProducts = [];
    let adminEditMode = 'edit'; // 'edit' or 'create'

    // Show/hide admin button on page load based on role
    if (adminEditBtn) {
        if (window.userRole === 'admin') {
            adminEditBtn.classList.remove('hidden');
        } else {
            adminEditBtn.classList.add('hidden');
        }
    }

    function openAdminModal() {
        if (!adminModal) return;
        adminModal.classList.add('show');
        loadAdminProducts();
    }

    function closeAdminModal() {
        if (!adminModal) return;
        adminModal.classList.remove('show');
    }

    async function loadAdminProducts() {
        try {
            const res = await fetch('/admin/products', {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json' }
            });
            const json = await res.json();
            if (json.products) {
                adminProducts = json.products;
                renderAdminProducts();
            }
        } catch (err) {
            console.error('Failed to load admin products', err);
        }
    }

    function renderAdminProducts(query = '') {
        if (!adminProductsGrid) return;
        adminProductsGrid.innerHTML = '';
        const q = query.toLowerCase();
        const filtered = q ? adminProducts.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)) : adminProducts;

        if (filtered.length === 0) {
            adminProductsGrid.innerHTML = '<div class="no-results" style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--on-surface-variant);">No products found.</div>';
            return;
        }

        const frag = document.createDocumentFragment();
        filtered.forEach(product => {
            const card = document.createElement('div');
            card.className = 'admin-product-card' + (product.available === false || product.available === 0 ? ' unavailable' : '');
            const badges = [];
            if (product.category) badges.push(`<span class="admin-badge category-badge">${product.category}</span>`);
            if (product.popular) badges.push('<span class="admin-badge popular">Popular</span>');
            if (product.available === false || product.available === 0) badges.push('<span class="admin-badge unavailable-badge">Unavailable</span>');
            else badges.push('<span class="admin-badge available-badge">Available</span>');

            card.innerHTML = `
                <div class="admin-card-img">
                    <img src="${product.image || ''}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop'">
                </div>
                <div class="admin-card-body">
                    <h4>${product.name}</h4>
                    <p>${product.description || ''}</p>
                    <div class="admin-card-badges">${badges.join('')}</div>
                </div>
                <div class="admin-card-footer">
                    <span class="admin-card-price">PHP ${product.price}</span>
                    <button class="admin-card-edit-btn" data-id="${product.id}">Edit</button>
                </div>
            `;
            frag.appendChild(card);
        });
        adminProductsGrid.appendChild(frag);
    }

    // Admin search
    if (adminSearch) {
        const adminSearchDebounce = debounce((e) => {
            renderAdminProducts(e.target.value);
        }, 250);
        adminSearch.addEventListener('input', adminSearchDebounce);
    }

    // Open admin modal on Edit button click
    if (adminEditBtn) {
        adminEditBtn.addEventListener('click', openAdminModal);
    }

    // Add Product button
    if (adminAddBtn) {
        adminAddBtn.addEventListener('click', () => openAddProduct());
    }

    function openAddProduct() {
        adminEditMode = 'create';
        document.getElementById('admin-edit-id').value = '';
        document.getElementById('admin-edit-name').value = '';
        document.getElementById('admin-edit-price').value = '';
        document.getElementById('admin-edit-description').value = '';
        document.getElementById('admin-edit-image').value = '';
        document.getElementById('admin-edit-popular').checked = false;
        document.getElementById('admin-edit-available').checked = true;
        document.getElementById('admin-edit-title').textContent = 'Add New Product';
        populateCategoryDropdowns({ category: '' });
        adminDeleteBtn.style.display = 'none';
        adminEditModal.classList.add('show');
    }

    // Close admin modal
    if (adminModalClose) {
        adminModalClose.addEventListener('click', closeAdminModal);
    }
    if (adminModal) {
        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) closeAdminModal();
        });
    }

    // Delegate click on edit buttons in admin grid
    if (adminProductsGrid) {
        adminProductsGrid.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.admin-card-edit-btn');
            if (editBtn) {
                const id = Number(editBtn.dataset.id);
                const product = adminProducts.find(p => p.id === id);
                if (product) openEditProduct(product);
            }
        });
    }

    function openEditProduct(product) {
        if (!adminEditModal) return;
        adminEditMode = 'edit';
        document.getElementById('admin-edit-id').value = product.id;
        document.getElementById('admin-edit-name').value = product.name || '';
        document.getElementById('admin-edit-price').value = product.price || '';
        document.getElementById('admin-edit-description').value = product.description || '';
        document.getElementById('admin-edit-image').value = product.image || '';
        populateCategoryDropdowns(product);
        document.getElementById('admin-edit-popular').checked = !!product.popular;
        document.getElementById('admin-edit-available').checked = product.available !== false && product.available !== 0;
        document.getElementById('admin-edit-title').textContent = 'Edit: ' + product.name;
        adminDeleteBtn.style.display = '';
        adminEditModal.classList.add('show');
    }

    function populateCategoryDropdowns(currentProduct) {
        const catEl = document.getElementById('admin-edit-category');
        const datalist = document.getElementById('admin-category-list');
        if (!catEl || !datalist) return;

        // Collect unique categories from all products (use existing category values)
        const categories = [...new Set(adminProducts.map(p => p.category).filter(Boolean))].sort();

        // If element is a select (legacy), build options, otherwise set datalist suggestions
        if (catEl.tagName === 'SELECT') {
            catEl.innerHTML = '<option value="">-- None --</option>' + categories.map(c =>
                `<option value="${c}"${c === (currentProduct.category || '') ? ' selected' : ''}>${c}</option>`
            ).join('');
            if (currentProduct && currentProduct.category) catEl.value = currentProduct.category;
        } else {
            catEl.value = currentProduct.category || '';
            datalist.innerHTML = categories.map(c => `<option value="${c}"></option>`).join('');
        }
    }

    function closeEditProduct() {
        if (!adminEditModal) return;
        adminEditModal.classList.remove('show');
    }

    if (adminEditClose) {
        adminEditClose.addEventListener('click', closeEditProduct);
    }
    if (adminEditModal) {
        adminEditModal.addEventListener('click', (e) => {
            if (e.target === adminEditModal) closeEditProduct();
        });
    }

    // Save product (create or edit)
    if (adminEditForm) {
        adminEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('admin-edit-id').value;
            const payload = {
                name: document.getElementById('admin-edit-name').value,
                price: parseFloat(document.getElementById('admin-edit-price').value) || 0,
                description: document.getElementById('admin-edit-description').value,
                image: document.getElementById('admin-edit-image').value,
                category: document.getElementById('admin-edit-category').value || null,
                popular: document.getElementById('admin-edit-popular').checked,
                available: document.getElementById('admin-edit-available').checked,
            };

            const isCreate = adminEditMode === 'create';
            const url = isCreate ? '/admin/products' : '/admin/products/' + id;
            const method = isCreate ? 'POST' : 'PUT';

            try {
                const res = await fetch(url, {
                    method: method,
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    closeEditProduct();
                    // If server returned the created/updated product, update client state immediately
                    try {
                        if (json.product) {
                            // update adminProducts list
                            const existingIdx = adminProducts.findIndex(p => p.id === json.product.id);
                            if (existingIdx !== -1) {
                                adminProducts[existingIdx] = json.product;
                            } else {
                                adminProducts.push(json.product);
                            }

                            // update menuData if product is available and not a Combo
                            const prodAvailable = json.product.available !== false && json.product.available !== 0;
                            const prodCategory = json.product.category || '';
                            if (prodAvailable && prodCategory && prodCategory !== 'Combo') {
                                const exists = menuData.find(m => m.id === json.product.id);
                                const mapped = {
                                    id: json.product.id,
                                    name: json.product.name,
                                    price: json.product.price,
                                    description: json.product.description || '',
                                    category: json.product.category || '',
                                    image: json.product.image || '',
                                    popular: !!json.product.popular
                                };
                                if (exists) {
                                    Object.assign(exists, mapped);
                                } else {
                                    menuData.push(mapped);
                                }
                            } else {
                                // if product became unavailable or is Combo, remove from menuData
                                menuData = menuData.filter(m => m.id !== json.product.id);
                            }

                            try { sessionStorage.setItem('menuData', JSON.stringify(menuData)); } catch (e) {}
                            buildSidebarFromMenu();
                        }
                    } catch (e) { console.error('Immediate UI update failed', e); }

                    // refresh server-side copies and rebuild sidebar (await to avoid race)
                    try {
                        await loadAdminProducts();
                    } catch (e) { /* ignore */ }
                    try {
                        await refreshMenuData();
                    } catch (e) { /* ignore */ }
                } else {
                    const msg = json.message || (isCreate ? 'Failed to add product.' : 'Failed to save changes.');
                    alert(msg);
                }
            } catch (err) {
                console.error('Admin save error', err);
                alert('Network error while saving.');
            }
        });
    }

    // Delete product
    if (adminDeleteBtn) {
        adminDeleteBtn.addEventListener('click', async () => {
            const id = document.getElementById('admin-edit-id').value;
            if (!confirm('Are you sure you want to delete this product? This cannot be undone.')) return;
            try {
                const res = await fetch('/admin/products/' + id, {
                    method: 'DELETE',
                    credentials: 'same-origin',
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json'
                    }
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    closeEditProduct();
                    loadAdminProducts();
                    refreshMenuData();
                } else {
                    alert('Failed to delete product.');
                }
            } catch (err) {
                console.error('Admin delete error', err);
                alert('Network error while deleting.');
            }
        });
    }

    // Refresh the kiosk menu data from the server-side products
    async function refreshMenuData() {
        try {
            const res = await fetch('/admin/products', {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json' }
            });
            const json = await res.json();
            if (json.products) {
                // map DB products to the shape used by the menu renderer
                menuData = json.products.filter(p => p.available !== false && p.available !== 0 && p.category !== 'Combo').map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    description: p.description || '',
                    category: p.category || '',
                    image: p.image || '',
                    popular: !!p.popular
                }));
                try { sessionStorage.setItem('menuData', JSON.stringify(menuData)); } catch (e) {}
                buildSidebarFromMenu();
                const activeCat = document.querySelector('.nav-item.active');
                renderMenu(activeCat ? activeCat.dataset.category : 'Popular');
            }
        } catch (err) {
            console.error('Failed to refresh menu', err);
        }
    }
});
