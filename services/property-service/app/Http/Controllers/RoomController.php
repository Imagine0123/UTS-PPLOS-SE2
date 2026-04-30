<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index(Request $request)
    {
        //Validation
        $request->validate([
            'status' => 'nullable|in:available,occupied',
            'max_price' => 'nullable|numeric',
            'per_page' => 'nullable|integer|min:1|max:50'
        ]);

        $query = Room::with(['property', 'facilities']);

        //Filtering
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        //Paging
        $perPage = $request->input('per_page', 10);
        $rooms = $query->paginate($perPage);

        return response()->json($rooms, 200);
    }
}