<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Room;

class RoomController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'status' => 'nullable|in:available,occupied',
            'max_price' => 'nullable|numeric',
            'per_page' => 'nullable|integer|min:1|max:50'
        ]);

        $rooms = Room::with(['property', 'facilities'])
            ->filterByStatus($request->status)
            ->filterByMaxPrice($request->max_price)
            ->paginate($request->input('per_page', 10));

        return response()->json($rooms, 200);
    }

    public function show($id)
    {
        $room = Room::with(['property', 'facilities'])->find($id);

        if (!$room) {
            return response()->json(['message' => 'Room not found'], 404);
        }

        return response()->json($room, 200);
    }
}