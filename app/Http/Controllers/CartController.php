<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Cart;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;

class CartController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['items' => []]);
        }

        $items = $user->cart ?? [];
        return response()->json(['items' => $items]);
    }

    public function add(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required|numeric',
            'quantity' => 'nullable|integer',
        ]);
        $user = Auth::user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $cart = $user->cart ?? [];

        // look up product in DB
        $product = Product::find($data['product_id']);
        $qty = $data['quantity'] ?? 1;

        $found = null;
        foreach ($cart as &$it) {
            if (isset($it['product_id']) && intval($it['product_id']) === intval($data['product_id'])) {
                $it['quantity'] = ($it['quantity'] ?? 0) + $qty;
                $found = $it;
                break;
            }
        }

        if (! $found) {
            $new = [
                'product_id' => (int) $data['product_id'],
                'product_name' => $product ? $product->name : 'Item',
                'price' => $product ? (float) $product->price : 0,
                'image' => $product ? $product->image : null,
                'quantity' => $qty,
                'added_at' => now()->toDateTimeString(),
            ];
            $cart[] = $new;
            $found = $new;
        }

        $user->cart = $cart;
        $user->save();

        return response()->json(['success' => true, 'item' => $found, 'cart' => $cart]);
    }

    public function remove(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'nullable|numeric',
            'index' => 'nullable|integer'
        ]);

        $user = Auth::user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $cart = $user->cart ?? [];

        if (isset($data['product_id'])) {
            $pid = intval($data['product_id']);
            $cart = array_values(array_filter($cart, function ($it) use ($pid) {
                return intval($it['product_id'] ?? 0) !== $pid;
            }));
        } elseif (isset($data['index'])) {
            if (isset($cart[$data['index']])) unset($cart[$data['index']]);
            $cart = array_values($cart);
        }

        $user->cart = $cart;
        $user->save();

        return response()->json(['success' => true, 'cart' => $cart]);
    }
}
