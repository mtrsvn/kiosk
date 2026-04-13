<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'price', 'description', 'category', 'category_group', 'image', 'popular', 'available',
    ];

    protected $casts = [
        'popular' => 'boolean',
        'available' => 'boolean',
    ];
}
