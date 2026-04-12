<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MRBEAST BURGER</title>
    <link rel="icon" type="image/webp" href="{{ asset('images/MrBeast_Burger.webp') }}">
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
            <img src="{{ asset('images/MrBeast_Burger.webp') }}" alt="MrBeast Burger" class="start-image-logo">
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
                <img src="{{ asset('images/MrBeast_Burger.webp') }}" alt="MrBeast Burger" class="sidebar-logo-img">
            </div>
            <nav class="categories">
                @php
                    $menu = [];
                    $categories = [];
                    $groups = [];
                    try {
                        $menuPath = public_path('menu.json');
                        if (file_exists($menuPath)) {
                            $menu = json_decode(file_get_contents($menuPath), true) ?? [];
                        }
                        foreach ($menu as $item) {
                            $cat = $item['category'] ?? null;
                            $grp = $item['category_group'] ?? null;
                            if ($grp && !in_array($grp, $groups)) {
                                $groups[] = $grp;
                            }
                            if ($cat && !in_array($cat, $categories)) {
                                $categories[] = $cat;
                            }
                        }
                        // Build consolidated list: Popular, then groups, then remaining categories
                        $categories = array_values($categories);
                        $groups = array_values($groups);
                        $consolidated = [];
                        if (!empty($menu)) {
                            $consolidated[] = 'Popular';
                        }
                        foreach ($groups as $g) {
                            if (!in_array($g, $consolidated)) $consolidated[] = $g;
                        }
                        foreach ($categories as $c) {
                            if (!in_array($c, $consolidated)) $consolidated[] = $c;
                        }
                        $categories = $consolidated;
                        // Ensure Popular appears first
                        if (($i = array_search('Popular', $categories)) !== false) {
                            unset($categories[$i]);
                            array_unshift($categories, 'Popular');
                        }
                    } catch (\Exception $e) {
                        $categories = ['Popular','Combo','Burgers','Sandwiches','Sides'];
                    }

                    $iconMap = [
                        'Popular' => '🔥',
                        'Combo' => '🍱',
                        'Burgers' => '🍔',
                        'Sandwiches' => '🥪',
                        'Sides' => '🍟',
                    ];
                @endphp

                @foreach($categories as $idx => $cat)
                    <button class="nav-item {{ $idx === 0 ? 'active' : '' }}" data-category="{{ $cat }}">
                        <span class="icon">{{ $iconMap[$cat] ?? '🔖' }}</span>
                        <span class="label">{{ $cat }}</span>
                    </button>
                @endforeach
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
