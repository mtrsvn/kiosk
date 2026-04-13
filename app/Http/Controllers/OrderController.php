<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Cart;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function place(Request $request)
    {
        $user = Auth::user();
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|string',
            'items.*.product_name' => 'required|string',
            'items.*.price' => 'required|numeric',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($user, $data) {
            $total = 0;
            foreach ($data['items'] as $it) { $total += $it['price'] * $it['quantity']; }

            $order = Order::create([
                'user_id' => $user ? $user->id : null,
                'total' => $total,
                'status' => 'pending',
            ]);

            foreach ($data['items'] as $it) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $it['product_id'],
                    'product_name' => $it['product_name'],
                    'price' => $it['price'],
                    'quantity' => $it['quantity'],
                ]);
            }

            // optional: clear user's cart if present
            if ($user) { Cart::where('user_id', $user->id)->delete(); }

            return response()->json(['success' => true, 'order_id' => $order->id]);
        });
    }
}
