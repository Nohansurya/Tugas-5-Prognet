<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactPhone extends Model
{
    protected $table = 'kontak_phones';
    protected $fillable = ['kontak_id', 'jenis', 'nomor_telepon'];

    // Relasi Inverse: Nomor Telepon milik 1 Kontak
    public function contact()
    {
        return $this->belongsTo(Contact::class, 'kontak_id');
    }
}