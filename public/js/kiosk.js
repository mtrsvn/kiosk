document.addEventListener('DOMContentLoaded', () => {
    const menuGrid = document.getElementById('menu-grid');
    const categoryTitle = document.getElementById('category-title');
    const navItems = document.querySelectorAll('.nav-item');
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
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' },
                body: formData
            });
            const json = await res.json();
            if (res.ok && json.success) {
                window.isAuthenticated = true;
                hideAuth();
                return true;
            }
            // show errors
            if (json.errors) {
                const msgs = [];
                Object.values(json.errors).forEach(arr => { if (Array.isArray(arr)) msgs.push(...arr); });
                errorsEl.textContent = msgs.join(' ');
            } else if (json.message) {
                errorsEl.textContent = json.message;
            } else {
                errorsEl.textContent = 'Authentication failed.';
            }
        } catch (err) {
            errorsEl.textContent = 'Network error. Please try again.';
            console.error(err);
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

    // Fetch Menu Data with sessionStorage cache
    const cached = sessionStorage.getItem('menuData');
    if (cached) {
        try {
            menuData = JSON.parse(cached);
            renderMenu('Popular');
        } catch (e) {
            sessionStorage.removeItem('menuData');
        }
    }

    fetch('/menu.json')
        .then(response => response.json())
        .then(data => {
            menuData = data;
            try { sessionStorage.setItem('menuData', JSON.stringify(data)); } catch (e) {}
            renderMenu('Popular');
        })
        .catch(err => console.error('Error loading menu:', err));

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
                matchesCategory = (item.category === category) || (item.category_group === category);
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

    // Category Navigation (existing buttons) — animate main content and move shared indicator
    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            // If already active, do nothing
            if (btn.classList.contains('active')) return;

            // Mark active immediately for visual feedback in sidebar
            navItems.forEach(n => n.classList.remove('active'));
            btn.classList.add('active');

            // move the shared indicator to the clicked item
            moveSidebarIndicator(btn);

            // If mainContent exists, animate slide-out, update, then slide-in
            if (mainContent) {
                mainContent.classList.add('slide-out');

                const onTransitionEnd = (e) => {
                    if (e.propertyName !== 'opacity') return;
                    mainContent.removeEventListener('transitionend', onTransitionEnd);

                    // update content while out of view
                    renderMenu(btn.dataset.category);

                    // force reflow then play slide-in
                    void mainContent.offsetWidth;
                    mainContent.classList.remove('slide-out');
                    mainContent.classList.add('slide-in');

                    // remove slide-in class after animation finishes
                    setTimeout(() => mainContent.classList.remove('slide-in'), 380);
                };

                mainContent.addEventListener('transitionend', onTransitionEnd);
            } else {
                renderMenu(btn.dataset.category);
            }

            searchInput.value = ''; // Clear search on category change
        });
    });

    // position indicator at the initially active nav item
    const initiallyActive = document.querySelector('.nav-item.active');
    if (initiallyActive) moveSidebarIndicator(initiallyActive);

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
    }

    function removeFromCart(id) {
        const index = cart.findIndex(c => c.id === id);
        if (index !== -1) {
            if (cart[index].qty > 1) {
                cart[index].qty--;
            } else {
                cart.splice(index, 1);
            }
        }
        updateCart();
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
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return;

        const orderCode = 'MB-' + Math.floor(1000 + Math.random() * 9000);
        showOrderSuccess(orderCode);
        
        // Clear cart
        cart = [];
        updateCart();
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

        modal.style.display = 'block';

        modalBody.querySelector('.order-again-btn').onclick = () => {
            modal.style.display = 'none';
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

        modal.style.display = 'block';

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
            modal.style.display = 'none';
        };

        const closeBtn = document.querySelector('.close-modal');
        closeBtn.onclick = () => modal.style.display = 'none';
        
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        };
    }
});
