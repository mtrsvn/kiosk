<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AdminProductController extends Controller
{
    private function authorizeAdmin()
    {
        $user = Auth::user();
        if (!$user || $user->role !== 'admin') {
            abort(403, 'Unauthorized');
        }
    }

    private function syncMenuJson()
    {
        $rows = DB::table('products')->orderBy('id')->get();
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => $r->id,
                'name' => $r->name,
                'price' => (float) $r->price,
                'description' => $r->description,
                'category' => $r->category,
                'category_group' => $r->category_group,
                'image' => $r->image,
                'popular' => (bool) $r->popular,
                'available' => (bool) $r->available,
            ];
        }
        file_put_contents(
            public_path('menu.json'),
            json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );
    }

    public function index()
    {
        $this->authorizeAdmin();
        $products = Product::orderBy('name')->get();
        return response()->json(['products' => $products]);
    }

    public function update(Request $request, Product $product)
    {
        $this->authorizeAdmin();

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'image' => 'sometimes|nullable|string|max:2048',
            'category' => 'sometimes|nullable|string|max:255',
            'category_group' => 'sometimes|nullable|string|max:255',
            'popular' => 'sometimes|boolean',
            'available' => 'sometimes|boolean',
        ]);

        $product->update($data);
        $this->syncMenuJson();

        return response()->json(['success' => true, 'product' => $product->fresh()]);
    }

    public function destroy(Product $product)
    {
        $this->authorizeAdmin();
        $product->delete();
        $this->syncMenuJson();
        return response()->json(['success' => true]);
    }
}
