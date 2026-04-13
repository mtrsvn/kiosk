<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductSyncController extends Controller
{
    // Import products from public/menu.json into `products` table (upsert)
    public function import(Request $request)
    {
        $path = public_path('menu.json');
        if (! file_exists($path)) {
            return response()->json(['success' => false, 'message' => 'menu.json not found'], 404);
        }

        try {
            $json = file_get_contents($path);
            $items = json_decode($json, true) ?: [];
            $count = 0;

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
                    'updated_at' => now(),
                ];

                if ($id) {
                    DB::table('products')->updateOrInsert(['id' => $id], array_merge($data, ['created_at' => now()]));
                } else {
                    DB::table('products')->insert(array_merge($data, ['created_at' => now()]));
                }
                $count++;
            }

            return response()->json(['success' => true, 'imported' => $count]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Import failed', 'error' => $e->getMessage()], 500);
        }
    }

    // Export products table to public/menu.json (overwrites)
    public function export(Request $request)
    {
        try {
            $rows = DB::table('products')->orderBy('id')->get();
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Export failed', 'error' => $e->getMessage()], 500);
        }
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
            ];
        }

        $path = public_path('menu.json');
        $ok = file_put_contents($path, json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

        if ($ok === false) {
            return response()->json(['success' => false, 'message' => 'Failed to write menu.json'], 500);
        }

        return response()->json(['success' => true, 'exported' => count($out)]);
    }
}
