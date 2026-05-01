<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\Property;
use App\Models\Room;

class RoomSeeder extends Seeder
{
    public function run()
    {
        // 1. Create a Property
        $prop = Property::create([
            'name' => 'Kos Mentari',
            'address' => 'Jl. Merdeka No. 10',
            'owner_id' => 1
        ]);

        // 2. Create Rooms
        Room::create(['property_id' => $prop->id, 'room_number' => 'A1', 'price' => 1500000, 'status' => 'available']);
        Room::create(['property_id' => $prop->id, 'room_number' => 'A2', 'price' => 2000000, 'status' => 'occupied']);
        Room::create(['property_id' => $prop->id, 'room_number' => 'B1', 'price' => 1200000, 'status' => 'available']);
    }
}