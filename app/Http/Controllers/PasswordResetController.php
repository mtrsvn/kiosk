<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;

class PasswordResetController extends Controller
{
    public function request(Request $request)
    {
        $data = $request->validate(['email' => 'required|email']);

        $token = Str::random(60);
        $now = now();

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $data['email']],
            ['token' => $token, 'created_at' => $now]
        );

        // If mail is configured, you may send the token via email here.
        // For development, return token in response so you can use it to reset.
        return response()->json(['success' => true, 'token' => $token]);
    }

    public function reset(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|confirmed|min:6',
        ]);

        $row = DB::table('password_reset_tokens')->where('email', $data['email'])->first();
        if (! $row || ! hash_equals($row->token, $data['token'])) {
            return response()->json(['success' => false, 'message' => 'Invalid token'], 422);
        }

        $user = User::where('email', $data['email'])->first();
        if (! $user) { return response()->json(['success' => false, 'message' => 'User not found'], 404); }

        $user->password = Hash::make($data['password']);
        $user->save();

        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return response()->json(['success' => true]);
    }
}
