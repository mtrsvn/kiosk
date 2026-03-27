<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MRBEAST BURGER</title>
    <link rel="icon" type="image/png" href="{{ asset('images/logo.png') }}">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/kiosk.css') }}">
    <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
</head>
<body>
    <div id="loading-screen" class="loading-screen">
        <div class="loader"></div>
    </div>

    <!-- Start Screen Overlay -->
    <div id="start-screen" class="start-screen">
        <div class="start-content">
            <h1 class="start-text-logo">MRBEAST<br>BURGER</h1>
            <div class="tap-to-start">
                <span class="pulsing-text">TOUCH TO START ORDER</span>
            </div>
        </div>
        <div class="start-bg-overlay"></div>
    </div>

    <div class="app-container">
        <!-- Sidebar Navigation -->
        <aside class="sidebar">
            <div class="logo-container">
                <div class="sidebar-text-logo">MRBEAST<span>BURGER</span></div>
            </div>
            <nav class="categories">
                <button class="nav-item active" data-category="Popular">
                    <span class="icon">🔥</span>
                    <span class="label">Popular</span>
                </button>
                <button class="nav-item" data-category="Combo">
                    <span class="icon">🍱</span>
                    <span class="label">Combos</span>
                </button>
                <button class="nav-item" data-category="Burgers">
                    <span class="icon">🍔</span>
                    <span class="label">Burgers</span>
                </button>
                <button class="nav-item" data-category="Sandwiches">
                    <span class="icon">🥪</span>
                    <span class="label">Sandwiches</span>
                </button>
                <button class="nav-item" data-category="Sides">
                    <span class="icon">🍟</span>
                    <span class="label">Sides</span>
                </button>
            </nav>
        </aside>

        <!-- Main Content Area -->
        <main class="main-content">
            <header class="header">
                <div class="search-bar">
                    <input type="text" placeholder="Search for your favorites...">
                </div>
            </header>

            <section class="menu-section">
                <h1 id="category-title">Popular Items</h1>
                <div id="menu-grid" class="menu-grid">
                    <!-- Menu items will be injected here via JS -->
                </div>
            </section>
        </main>

        <!-- Order Summary Side Panel -->
        <aside class="cart-panel">
            <div class="cart-header">
                <h2>My Order</h2>
            </div>
            <div id="cart-items" class="cart-items">
                <!-- Cart items will be injected here -->
                <div class="empty-cart">
                    <p>Your cart is empty.</p>
                </div>
            </div>
            <div class="cart-footer">
                <div class="total-row">
                    <span>Total</span>
                    <span id="total-amount">₱ 0</span>
                </div>
                <button class="checkout-btn" disabled>Checkout</button>
            </div>
        </aside>
    </div>

    <!-- Product Modal -->
    <div id="product-modal" class="modal">
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <div class="modal-body" id="modal-body-content">
                <!-- Data will be injected -->
            </div>
        </div>
    </div>

    <script src="{{ asset('js/kiosk.js') }}"></script>
</body>
</html>
