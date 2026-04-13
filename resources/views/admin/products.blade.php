@php
    /** @var \Illuminate\Database\Eloquent\Collection|\App\Models\Product[] $products */
@endphp
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Admin - Products</title>
    <link rel="stylesheet" href="{{ asset('css/kiosk.css') }}">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <style>
        .admin-container { padding:20px; }
        .admin-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px; }
        .admin-card .card-info h3 { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .admin-actions { display:flex; gap:8px; margin-top:8px; }
        .admin-actions form { display:inline-block; margin:0; }
        .admin-edit-form { padding:12px; background:rgba(255,255,255,0.02); border-radius:12px; margin-top:12px; }
        .admin-edit-form input[type=text], .admin-edit-form textarea { width:100%; padding:8px; border-radius:8px; border:1px solid rgba(255,255,255,0.04); background:transparent; color:var(--on-surface); }
        .admin-edit-form .form-row { margin-top:8px; }
        .admin-edit-form .btn-row { display:flex; gap:8px; margin-top:10px; }
        .admin-badge { display:inline-block; padding:4px 8px; border-radius:999px; font-weight:700; font-size:12px; }
        .badge-popular { background: rgba(255,204,0,0.12); color: var(--primary); }
        .badge-unavailable { background: rgba(255,255,255,0.04); color: #999; }
    </style>
</head>
<body>
    <div class="admin-container">
        <div class="admin-header" style="display:flex; align-items:center; gap:16px; margin-bottom:12px;">
            <a class="admin-back-btn" href="/">← Back to kiosk</a>
            <h1 style="margin:0">Products</h1>
        </div>

        @if(session('status'))
            <div style="padding:8px;background:#e0ffe0;border:1px solid #b6f2b6">{{ session('status') }}</div>
        @endif

        <div class="admin-grid">
            @foreach($products as $p)
                <div class="menu-card admin-card" data-id="{{ $p->id }}" data-name="{{ htmlentities($p->name) }}" data-description="{{ htmlentities($p->description) }}" data-price="{{ $p->price }}" data-image="{{ $p->image }}" data-popular="{{ $p->popular ? '1' : '0' }}" data-available="{{ ($p->available ?? true) ? '1' : '0' }}">
                    <div class="card-img-container">
                        <img src="{{ $p->image ?? 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop' }}" alt="{{ $p->name }}" loading="lazy" decoding="async" onerror="this.src='https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop'">
                    </div>
                    <div class="card-info">
                        <h3>
                            <span>{{ $p->name }}</span>
                            <div style="display:flex; gap:8px; align-items:center;">
                                @if($p->popular)
                                    <span class="admin-badge badge-popular">Popular</span>
                                @endif
                                @if(!($p->available ?? true))
                                    <span class="admin-badge badge-unavailable">Unavailable</span>
                                @endif
                            </div>
                        </h3>
                        <p>{{ $p->description }}</p>
                        <div class="card-footer">
                            <span class="price">PHP {{ $p->price }}</span>
                        </div>

                        <div class="admin-controls">
                            <div class="admin-actions">
                                <button class="edit-btn">Edit</button>

                                <form action="/admin/products/{{ $p->id }}/delete" method="POST" onsubmit="return confirm('Delete this product?');">
                                    @csrf
                                    <button type="submit" class="delete-btn">Delete</button>
                                </form>

                                <form action="/admin/products/{{ $p->id }}/toggle-popular" method="POST">
                                    @csrf
                                    <button type="submit" class="toggle-popular">{{ $p->popular ? 'Unmark' : 'Mark' }}</button>
                                </form>

                                <form action="/admin/products/{{ $p->id }}/toggle-available" method="POST">
                                    @csrf
                                    <button type="submit" class="toggle-available">{{ ($p->available ?? true) ? 'Set Unavailable' : 'Set Available' }}</button>
                                </form>
                            </div>
                        </div>

                        <!-- edit handled via modal to reduce clutter -->
                    </div>
                </div>
            @endforeach
        </div>
    </div>

    <style>
        /* Modal for editing a product */
        .admin-modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:12000; align-items:center; justify-content:center; }
        .admin-modal.open { display:flex; }
        .admin-modal .modal-box { background:var(--surface); padding:18px; border-radius:14px; width:720px; max-width:94vw; color:var(--on-surface); }
        .admin-modal .modal-box h3 { margin:0 0 12px 0; }
        .admin-modal .modal-row { display:flex; gap:12px; }
        .admin-modal label { display:block; font-weight:700; margin-bottom:6px; }
        .admin-modal input[type=text], .admin-modal textarea { width:100%; padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.06); background:transparent; color:var(--on-surface); }
        .admin-modal .modal-actions { display:flex; gap:8px; margin-top:12px; justify-content:flex-end; }
    </style>

    <div id="admin-modal" class="admin-modal" aria-hidden="true">
        <div class="modal-box">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0">Edit Product</h3>
                <button id="m-close" type="button" style="background:transparent;border:0;color:var(--on-surface);font-size:22px;">&times;</button>
            </div>
            <form id="admin-edit-form" method="POST" action="">
                @csrf
                <div style="display:grid; grid-template-columns: 260px 1fr; gap:12px; align-items:start;">
                    <div style="min-height:140px;">
                        <img id="m-preview" src="" style="width:100%; border-radius:10px; object-fit:cover; height:160px; background:rgba(255,255,255,0.02); display:block;" alt="Preview">
                        <div style="margin-top:8px">
                            <label for="m-image">Image URL</label>
                            <input id="m-image" name="image" type="text">
                        </div>
                    </div>
                    <div>
                        <label for="m-name">Name</label>
                        <input id="m-name" name="name" type="text" required>

                        <div class="form-row" style="margin-top:8px">
                            <label for="m-desc">Description</label>
                            <textarea id="m-desc" name="description" rows="5"></textarea>
                        </div>

                        <div style="display:flex; gap:12px; margin-top:8px;">
                            <div style="flex:1;">
                                <label for="m-price">Price</label>
                                <input id="m-price" name="price" type="text">
                            </div>
                            <div style="width:140px;">
                                <label>Flags</label>
                                <div style="display:flex; gap:8px;">
                                    <label style="display:inline-flex; align-items:center; gap:6px;"><input id="m-popular" name="popular" type="checkbox" value="1"> Popular</label>
                                    <label style="display:inline-flex; align-items:center; gap:6px;"><input id="m-available" name="available" type="checkbox" value="1"> Available</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" id="m-cancel" class="cancel-btn">Cancel</button>
                    <button type="submit" class="save-btn">Save</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        (function(){
            const modal = document.getElementById('admin-modal');
            const form = document.getElementById('admin-edit-form');
            const nameInput = document.getElementById('m-name');
            const descInput = document.getElementById('m-desc');
            const priceInput = document.getElementById('m-price');
            const imageInput = document.getElementById('m-image');
            const previewImg = document.getElementById('m-preview');
            const popInput = document.getElementById('m-popular');
            const availInput = document.getElementById('m-available');
            const cancelBtn = document.getElementById('m-cancel');
            const closeBtn = document.getElementById('m-close');

            function openModalForCard(card){
                const id = card.dataset.id;
                form.action = '/admin/products/' + id + '/update';
                nameInput.value = card.dataset.name || '';
                descInput.value = card.dataset.description || '';
                priceInput.value = card.dataset.price || '';
                imageInput.value = card.dataset.image || '';
                previewImg.src = card.dataset.image || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop';
                popInput.checked = card.dataset.popular === '1';
                availInput.checked = card.dataset.available === '1';
                modal.classList.add('open');
                modal.setAttribute('aria-hidden','false');
            }

            document.querySelectorAll('.admin-card').forEach(function(card){
                const editBtn = card.querySelector('.edit-btn');
                if(editBtn){
                    editBtn.addEventListener('click', function(e){
                        e.preventDefault();
                        openModalForCard(card);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                }
            });

            cancelBtn.addEventListener('click', function(){
                modal.classList.remove('open');
                modal.setAttribute('aria-hidden','true');
            });

            // close button handler
            if(closeBtn){
                closeBtn.addEventListener('click', function(){
                    modal.classList.remove('open');
                    modal.setAttribute('aria-hidden','true');
                });
            }

            // live preview when image URL changes
            imageInput.addEventListener('input', function(){
                previewImg.src = imageInput.value || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop';
            });

            // close modal on backdrop click
            modal.addEventListener('click', function(e){
                if(e.target === modal) {
                    modal.classList.remove('open');
                    modal.setAttribute('aria-hidden','true');
                }
            });
        })();
    </script>
</body>
</html>
