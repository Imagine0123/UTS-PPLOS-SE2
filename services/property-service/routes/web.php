<?php

use App\Models\Property;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Property::all(); 
});