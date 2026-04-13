<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\Admin\ProductSyncController;
use App\Http\Controllers\Admin\AdminProductController;

Route::get('/', function () {
    // If products table exists but is empty, auto-import menu.json into DB
    try {
        if (Schema::hasTable('products')) {
            $count = DB::table('products')->count();
            if ($count === 0) {
                $path = public_path('menu.json');
                if (file_exists($path)) {
                    $json = file_get_contents($path);
                    $items = json_decode($json, true) ?: [];
                    foreach ($items as $it) {
                        $id = isset($it['id']) ? intval($it['id']) : null;
                        $data = [
                            'name' => $it['name'] ?? '',
                            'price' => isset($it['price']) ? (float) $it['price'] : 0,
                            'description' => $it['description'] ?? null,
                            'category' => $it['category'] ?? null,
                            'category_group' => $it['category_group'] ?? null,
                            'image' => $it['image'] ?? null,
                            'popular' => !empty($it['popular']) ? 1 : 0,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                        if ($id) {
                            DB::table('products')->updateOrInsert(['id' => $id], $data);
                        } else {
                            DB::table('products')->insert($data);
                        }
                    }
                }
            }
        }
    } catch (\Throwable $e) {
        // don't block page load on import errors; log if logging present
        // optional: logger()->error('Product auto-import failed: '.$e->getMessage());
    }

    return view('welcome');
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/logout', [AuthController::class, 'logout']);

// Password reset (development-friendly token return)
Route::post('/password/forgot', [PasswordResetController::class, 'request']);
Route::post('/password/reset', [PasswordResetController::class, 'reset']);

// Cart and ordering
Route::get('/cart', [CartController::class, 'index']);
Route::post('/cart/add', [CartController::class, 'add']);
Route::post('/cart/remove', [CartController::class, 'remove']);

Route::post('/orders', [OrderController::class, 'place']);

// Admin product sync (import/export menu.json) - call manually
Route::post('/admin/products/import', [ProductSyncController::class, 'import']);
Route::post('/admin/products/export', [ProductSyncController::class, 'export']);
// convenience GET endpoints for local use (bypass CSRF restriction on POST)
Route::get('/admin/products/import', [ProductSyncController::class, 'import']);
Route::get('/admin/products/export', [ProductSyncController::class, 'export']);

// Admin product management API
Route::get('/admin/products', [AdminProductController::class, 'index']);
Route::post('/admin/products', [AdminProductController::class, 'store']);
Route::put('/admin/products/{product}', [AdminProductController::class, 'update']);
Route::delete('/admin/products/{product}', [AdminProductController::class, 'destroy']);
