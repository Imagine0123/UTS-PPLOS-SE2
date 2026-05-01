<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Room extends Model
{
    protected $fillable = ['property_id', 'room_number', 'price', 'status'];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function facilities(): BelongsToMany
    {
        return $this->belongsToMany(Facility::class, 'room_facility');
    }

     public function scopeFilterByStatus($query, $status)
    {
        if ($status) {
            return $query->where('status', $status);
        }
        return $query;
    }

    public function scopeFilterByMaxPrice($query, $price)
    {
        if ($price) {
            return $query->where('price', '<=', $price);
        }
        return $query;
    }
}