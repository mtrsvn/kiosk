<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (!Schema::hasColumn('products', 'popular')) {
                    $table->boolean('popular')->default(false)->after('image');
                }
                if (!Schema::hasColumn('products', 'available')) {
                    $table->boolean('available')->default(true)->after('popular');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (Schema::hasColumn('products', 'available')) {
                    $table->dropColumn('available');
                }
                if (Schema::hasColumn('products', 'popular')) {
                    $table->dropColumn('popular');
                }
            });
        }
    }
};
