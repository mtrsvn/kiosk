<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'category_group')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('category_group');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('products') && !Schema::hasColumn('products', 'category_group')) {
            Schema::table('products', function (Blueprint $table) {
                $table->string('category_group')->nullable();
            });
        }
    }
};
