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
    <!-- Lucide icons -->
    <script src="https://cdn.jsdelivr.net/npm/lucide@0.259.0/dist/lucide.min.js"></script>
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body>
    {{-- Auth overlay shown before using kiosk when not authenticated --}}
    <div id="auth-overlay" class="auth-overlay" aria-hidden="true">
        <div class="auth-modal-content" id="auth-modal-content">
                <div class="auth-left">
                <img src="{{ asset('images/MrBeast_Burger.webp') }}" class="auth-logo" alt="logo">
                <div class="auth-slogan">WELCOME TO MRBEAST BURGER</div>
            </div>
            <div class="auth-right">
                <div class="auth-tabs" id="auth-tabs">
                    <button id="tab-login" class="active">Login</button>
                    <button id="tab-register">Register</button>
                </div>

                <div class="auth-carousel" id="auth-carousel">
                    <div class="auth-track" id="auth-track">
                        <form id="login-form" class="auth-form" autocomplete="off">
                            <input type="email" name="email" placeholder="Email" class="auth-input" required>
                            <div class="form-row" style="height:8px"></div>
                            <input type="password" name="password" placeholder="Password" class="auth-input" required>
                            <div class="auth-errors" id="login-errors"></div>
                            <div style="height:12px"></div>
                            <button type="submit" class="auth-btn">Sign In</button>
                        </form>

                        <form id="register-form" class="auth-form" autocomplete="off">
                            <input type="text" name="name" placeholder="Full name" class="auth-input" required>
                            <div class="form-row" style="height:8px"></div>
                            <input type="email" name="email" placeholder="Email" class="auth-input" required>
                            <div class="form-row" style="height:8px"></div>
                            <input type="password" name="password" placeholder="Password" class="auth-input" required>
                            <div class="form-row" style="height:8px"></div>
                            <input type="password" name="password_confirmation" placeholder="Confirm password" class="auth-input" required>
                            <div class="auth-errors" id="register-errors"></div>
                            <div style="height:12px"></div>
                            <button type="submit" class="auth-btn">Create Account</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>window.isAuthenticated = {!! json_encode(auth()->check()) !!};</script>
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
                        'Popular' => '',
                        'Combo' => '',
                        'Burgers' => '',
                        'Sandwiches' => '',
                        'Sides' => '',
                    ];
                @endphp

                @foreach($categories as $idx => $cat)
                    <button class="nav-item {{ $idx === 0 ? 'active' : '' }}" data-category="{{ $cat }}">
                        <span class="icon">{{ $iconMap[$cat] ?? '' }}</span>
                        <span class="label">{{ $cat }}</span>
                    </button>
                @endforeach
            </nav>
            <!-- Logout button bottom-left (shows only when authenticated) -->
            <button class="logout-btn" title="Exit" aria-label="Exit">Exit</button>
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
                    <span id="total-amount">PHP 0</span>
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
