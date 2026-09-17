<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;

// Public Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected Routes (Bearer Token Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::apiResource('kontak', ContactController::class);
});
