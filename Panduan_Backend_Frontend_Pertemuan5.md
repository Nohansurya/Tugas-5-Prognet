# Panduan Lengkap: Backend Laravel REST API + Frontend React (Tailwind CSS)
### Studi Kasus: Aplikasi Kontak (Kontak App) — Pertemuan 5, Pemrograman Internet

Panduan ini disusun berdasarkan isi slide **Pertemuan 5** dan **Slide Suplemen Pertemuan 5**. Backend dan frontend dibuat sebagai **dua project terpisah** (bukan Laravel Blade), berkomunikasi lewat REST API + Bearer Token (Laravel Sanctum).

```
📁 kontak-api        → Backend Laravel 11 (REST API + SQLite + Sanctum)
📁 kontak-frontend    → Frontend React + Vite + Tailwind CSS (project terpisah)
```

---

## 0. Arsitektur Sistem

```
React (Vite + Tailwind) ──fetch()──▶ Laravel REST API (routes/api.php)
   localhost:5173                        localhost:8000/api
      │  localStorage: simpan Bearer Token
      └──── Header: Authorization: Bearer <token> ──▶ middleware('auth:sanctum')
```

- **Backend**: Laravel 11, database SQLite (1 file, tanpa perlu install MySQL server), autentikasi token via **Laravel Sanctum**.
- **Frontend**: React (Vite) + **Tailwind CSS**, konsumsi API dengan `fetch()` + `useEffect`.
- Relasi database: **1 Kontak punya Banyak Nomor Telepon** (`hasMany` / `belongsTo`).

### Prasyarat (jika pakai Ubuntu VM, sesuai slide suplemen)
```bash
# Update & Git
sudo apt update
sudo apt install -y git
git config --global user.name "Nama Anda"
git config --global user.email "email@example.com"

# PHP + ekstensi wajib Laravel + SQLite
sudo apt install -y php-cli php-mbstring php-xml php-curl \
  php-zip php-bcmath php-intl php-sqlite3 unzip
php -v

# Composer (package manager PHP)
sudo php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer
sudo rm composer-setup.php
composer --version

# Node.js & npm (untuk frontend React) — pastikan sudah terpasang
node -v
npm -v
```

---

# BAGIAN 1 — BACKEND: Laravel 11 REST API + SQLite + Sanctum

Project: **`kontak-api`**

## Langkah 1: Buat Project Laravel

```bash
composer create-project laravel/laravel kontak-api
cd kontak-api
```

## Langkah 2: Setup Database SQLite

```bash
# Buat file database SQLite kosong
touch database/db_kontak.sqlite
```

Edit file **`.env`**, ubah baris koneksi database menjadi:

```env
DB_CONNECTION=sqlite
DB_DATABASE=database/db_kontak.sqlite
```

> 💡 SQLite menyimpan seluruh data dalam 1 file `db_kontak.sqlite`, tanpa perlu install server MySQL terpisah.

## Langkah 3: Install Laravel API & Sanctum Authentication

```bash
php artisan install:api
```
Perintah ini otomatis mempublikasikan `routes/api.php`, menginstall package **Sanctum**, dan menyiapkan migration `personal_access_tokens`.

**⚠️ WAJIB (kritis):** tambahkan trait `HasApiTokens` di `app/Models/User.php`:

```php
// app/Models/User.php
use Laravel\Sanctum\HasApiTokens; // 👈 Import

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable; // 👈 Pasang Trait
}
```
> ⚠️ Tanpa trait `HasApiTokens`, method `createToken()` akan memicu `BadMethodCallException`.

## Langkah 4: Migration Tabel `kontak` & `kontak_phones`

```bash
php artisan make:model Contact -m
php artisan make:model ContactPhone -m
```

Buka migration `..._create_kontak_table.php` (cari file di `database/migrations/` sesuai nama model `Contact`, lalu ganti nama tabelnya) dan isi:

```php
// database/migrations/xxxx_xx_xx_create_contacts_table.php
public function up(): void
{
    Schema::create('kontak', function (Blueprint $table) {
        $table->id();
        $table->string('nama');
        $table->text('alamat');
        $table->date('tanggal_lahir');
        $table->timestamps();
    });
}
```

Buka migration `..._create_contact_phones_table.php` dan isi:

```php
// database/migrations/xxxx_xx_xx_create_contact_phones_table.php
public function up(): void
{
    Schema::create('kontak_phones', function (Blueprint $table) {
        $table->id();
        $table->foreignId('kontak_id')->constrained('kontak')->onDelete('cascade');
        $table->enum('jenis', ['Rumah', 'HP', 'Kantor'])->default('HP');
        $table->string('nomor_telepon');
        $table->timestamps();
    });
}
```

## Langkah 5: Eksekusi Migration

```bash
php artisan migrate
```
> 💡 Jika muncul error **"no such table: kontak"**, jalankan ulang `php artisan migrate` (atau `php artisan migrate:fresh` untuk reset total).

## Langkah 6: Model Eloquent & Relasi 1 to Many

```php
// app/Models/Contact.php
class Contact extends Model
{
    protected $table = 'kontak';
    protected $fillable = ['nama', 'alamat', 'tanggal_lahir'];

    // Relasi: 1 Kontak punya Banyak Nomor Telepon
    public function phones()
    {
        return $this->hasMany(ContactPhone::class, 'kontak_id');
    }
}
```

```php
// app/Models/ContactPhone.php
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
```

## Langkah 7: Controller Autentikasi (`AuthController`)

```bash
php artisan make:controller Api/AuthController
```

Sama seperti sebelumnya, **buka file `app/Http/Controllers/Api/AuthController.php` dan timpa seluruh isinya** dengan kode berikut:

```php
<?php
// app/Http/Controllers/Api/AuthController.php — isi lengkap, menggantikan isi bawaan hasil artisan
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $req = $request->validate([
            'name' => 'required',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
        ]);

        $user = User::create([
            'name' => $req['name'],
            'email' => $req['email'],
            'password' => Hash::make($req['password']),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Register Berhasil',
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login Berhasil',
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logout Berhasil']);
    }
}
```

## Langkah 8: Controller CRUD Kontak (`ContactController`)

```bash
php artisan make:controller Api/ContactController
```

Perintah di atas hanya membuat file kosong berisi *class* kosong. **Buka file `app/Http/Controllers/Api/ContactController.php`, lalu ganti (timpa) seluruh isinya** dengan kode lengkap berikut — bukan ditambahkan di atas kode bawaan:

```php
<?php
// app/Http/Controllers/Api/ContactController.php — isi lengkap, menggantikan isi bawaan hasil artisan
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactPhone;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function index()
    {
        return response()->json(Contact::with('phones')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama' => 'required',
            'alamat' => 'required',
            'tanggal_lahir' => 'required|date',
            'phones' => 'array',
        ]);

        $contact = Contact::create($request->only('nama', 'alamat', 'tanggal_lahir'));

        if ($request->has('phones')) {
            $contact->phones()->createMany($request->phones);
        }

        return response()->json($contact->load('phones'), 201);
    }

    public function show($id)
    {
        return response()->json(Contact::with('phones')->findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $contact = Contact::findOrFail($id);
        $contact->update($request->only('nama', 'alamat', 'tanggal_lahir'));
        return response()->json($contact->load('phones'));
    }

    public function destroy($id)
    {
        Contact::destroy($id);
        return response()->json(['message' => 'Kontak Terhapus']);
    }
}
```

## Langkah 9: Registrasi Route (`routes/api.php`)

```php
// routes/api.php
// ⚠️ WAJIB import di paling atas
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
```

## Langkah 10 (Tambahan Wajib — Frontend Terpisah): Aktifkan CORS

Karena frontend React berjalan di **origin berbeda** (mis. `http://localhost:5173`) dari backend Laravel (`http://localhost:8000`), browser akan memblokir request lintas-origin kecuali CORS diizinkan.

Buka `config/cors.php`, pastikan konfigurasi seperti ini:

```php
// config/cors.php
'paths' => ['api/*'],
'allowed_methods' => ['*'],
'allowed_origins' => ['http://localhost:5173'], // URL dev server React (Vite)
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'supports_credentials' => false, // token Bearer, bukan cookie-based
```

> Jika file `config/cors.php` belum ada, publish dulu: `php artisan config:publish cors` (atau cukup pastikan `allowed_origins` sudah benar bila file sudah ter-generate otomatis oleh Laravel 11).

## Langkah 11: Jalankan Server Backend

```bash
php artisan serve --host=0.0.0.0
```

Base URL REST API sekarang:
```
http://127.0.0.1:8000/api
```
> 💡 Gunakan `--host=0.0.0.0` agar server bisa diakses dari laptop host jika dijalankan di Virtual Machine.

## Langkah 12 (Opsional): API Tester Tanpa Postman

Buat file `public/api-tester.html` di project Laravel untuk menguji API langsung dari browser tanpa Postman:

```html
<!-- public/api-tester.html -->
<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>API Tester</title>
<style>
  body { font-family: sans-serif; background: #0f172a; color: #e2e8f0; padding: 15px; max-width: 800px; margin: 0 auto; }
  .card { background: #1e293b; border: 1px solid #334155; padding: 10px; border-radius: 8px; margin-bottom: 10px; }
  input, button { padding: 6px 10px; margin: 3px; border-radius: 4px; border: 1px solid #475569; background: #0f172a; color: #fff; font-size: 0.75rem; }
  button { background: #0284c7; color: white; font-weight: bold; cursor: pointer; border: none; }
  pre { background: #090d16; padding: 10px; border-radius: 6px; color: #4ade80; overflow-x: auto; font-size: 0.75rem; }
</style></head><body>
  <h3 style="color:#38bdf8;">🚀 Laravel REST API Tester</h3>
  <div class="card">
    <input type="text" id="token" placeholder="Bearer Token (Otomatis terisi saat Login)" style="width: 70%;">
    <input type="text" id="reg_name" value="Budi Santoso"> <input type="email" id="email" value="budi@gmail.com"> <input type="password" id="password" value="password123"><br>
    <button onclick="sendReq('/register','POST',{name:document.getElementById('reg_name').value,email:document.getElementById('email').value,password:document.getElementById('password').value})">Register</button>
    <button onclick="sendReq('/login','POST',{email:document.getElementById('email').value,password:document.getElementById('password').value},true)">Login</button>
  </div>
  <div class="card">
    <input type="text" id="kt_nama" value="Ayu Pertiwi"> <input type="text" id="kt_alamat" value="Jl. Udayana"> <input type="date" id="kt_tgl" value="2001-05-15"> <input type="text" id="kt_phone" value="081234567890"><br>
    <button onclick="sendReq('/kontak','GET',null,false,true)">Get Kontak</button>
    <button onclick="sendReq('/kontak','POST',{nama:document.getElementById('kt_nama').value,alamat:document.getElementById('kt_alamat').value,tanggal_lahir:document.getElementById('kt_tgl').value,phones:[{jenis:'HP',nomor_telepon:document.getElementById('kt_phone').value}]},false,true)">Tambah Kontak</button>
  </div>
  <div class="card">
    <div style="color:#f59e0b;font-weight:bold;margin-bottom:4px;">📝 Raw JSON Input</div>
    <textarea id="raw_json" rows="6" style="width:100%;font-family:monospace;background:#090d16;color:#fff;border:1px solid #475569;border-radius:4px;padding:6px;font-size:0.7rem;" placeholder='{"nama":"Ayu Pertiwi","alamat":"Jl. Udayana","tanggal_lahir":"2001-05-15","phones":[{"jenis":"HP","nomor_telepon":"081234567890"}]}'></textarea><br>
    <button onclick="sendReq('/kontak','POST',JSON.parse(document.getElementById('raw_json').value),false,true)">Send Raw JSON</button>
  </div>
  <div class="card"><pre id="out">Output Respon JSON...</pre></div>
  <script>
    async function sendReq(ep, m, body=null, isLogin=false, isAuth=false) {
      const h = {'Accept':'application/json','Content-Type':'application/json'};
      if(isAuth && document.getElementById('token').value) h['Authorization'] = 'Bearer ' + document.getElementById('token').value;
      const r = await fetch('/api'+ep, {method:m, headers:h, body:body?JSON.stringify(body):null});
      const d = await r.json(); document.getElementById('out').textContent = JSON.stringify(d, null, 2);
      if(isLogin && d.token) document.getElementById('token').value = d.token;
    }
  </script></body></html>
```

Akses lewat browser: `http://127.0.0.1:8000/api-tester.html`

## Langkah 13: Pengujian API dengan Postman (Rinci Langkah demi Langkah)

### 13.1 Install & Buka Postman
1. Download di [postman.com/downloads](https://www.postman.com/downloads/), install seperti aplikasi biasa.
2. Buka Postman. Boleh **Skip** kalau diminta login/sign up (tetap bisa dipakai tanpa akun untuk kebutuhan lokal).

### 13.2 Buat Collection & Environment (biar rapi & token otomatis tersimpan)

**a) Buat Collection**
1. Klik **Collections** di sidebar kiri → **+** → beri nama `Kontak API`.

**b) Buat Environment (untuk menyimpan `base_url` & `token` biar tidak ketik ulang manual)**
1. Klik ikon mata / **Environments** di sidebar kiri → **+**.
2. Beri nama `Kontak API - Local`.
3. Tambahkan 2 variable:

   | Variable | Initial Value | Current Value |
   |---|---|---|
   | `base_url` | `http://127.0.0.1:8000/api` | `http://127.0.0.1:8000/api` |
   | `token` | *(kosongkan)* | *(kosongkan)* |

4. Klik **Save**, lalu di pojok kanan atas Postman, pilih environment `Kontak API - Local` dari dropdown (defaultnya "No Environment").

> Dengan ini, di setiap request URL cukup ditulis `{{base_url}}/register` dsb — dan token bisa diisi otomatis lewat script (lihat langkah 13.4).

### 13.3 Request 1 — `POST /register`

1. Di collection `Kontak API`, klik kanan → **Add Request**, beri nama `Register`.
2. Set method ke **POST**, URL diisi: `{{base_url}}/register`
3. Klik tab **Headers**, tambahkan:
   | Key | Value |
   |---|---|
   | `Accept` | `application/json` |
   | `Content-Type` | `application/json` |
4. Klik tab **Body** → pilih **raw** → di dropdown kanan pilih **JSON** → isi:
   ```json
   { "name": "Budi Santoso", "email": "budi@gmail.com", "password": "password123" }
   ```
5. Klik **Send**. Response yang diharapkan (status **201 Created**):
   ```json
   { "message": "Register Berhasil", "token": "1|1A2b3C...xyz" }
   ```

### 13.4 Request 2 — `POST /login` (+ auto-simpan token)

1. Buat request baru: method **POST**, URL `{{base_url}}/login`.
2. Headers sama seperti Register (`Accept` & `Content-Type: application/json`).
3. Body → raw → JSON:
   ```json
   { "email": "budi@gmail.com", "password": "password123" }
   ```
4. **(Opsional tapi sangat membantu)** Klik tab **Scripts** (atau **Tests** di versi Postman lama) pada request ini, tambahkan script berikut supaya token otomatis tersimpan ke variable `{{token}}` setiap kali login berhasil:
   ```js
   const data = pm.response.json();
   if (data.token) {
     pm.environment.set("token", data.token);
   }
   ```
5. Klik **Send**. Response yang diharapkan (status **200 OK**):
   ```json
   { "message": "Login Berhasil", "token": "2|7X8y9Z...token" }
   ```
6. Cek: klik ikon mata di pojok kanan atas → variable `token` sudah otomatis terisi nilai token barusan.

### 13.5 Request 3 — `POST /kontak` (route terproteksi, pakai Bearer Token)

1. Buat request baru: method **POST**, URL `{{base_url}}/kontak`.
2. Klik tab **Authorization** → di dropdown **Type**, pilih **Bearer Token** → di kolom Token, isi `{{token}}` (bukan token mentah, cukup pakai variable ini supaya otomatis ikut ter-update tiap kali login ulang).
   - Alternatif manual: di tab **Headers**, tambahkan `Authorization` dengan value `Bearer {{token}}`.
3. Tab **Headers**, pastikan tetap ada `Accept: application/json`.
4. Tab **Body** → raw → JSON:
   ```json
   {
     "nama": "Budi Santoso",
     "alamat": "Jl. Sudirman No. 45, Denpasar",
     "tanggal_lahir": "1998-05-20",
     "phones": [
       { "jenis": "HP", "nomor_telepon": "081234567890" },
       { "jenis": "Rumah", "nomor_telepon": "0361123456" }
     ]
   }
   ```
5. Klik **Send**. Response yang diharapkan (status **201 Created**):
   ```json
   {
     "id": 1,
     "nama": "Budi Santoso",
     "phones": [
       { "id": 1, "jenis": "HP", "nomor_telepon": "081234567890" },
       { "id": 2, "jenis": "Rumah", "nomor_telepon": "0361123456" }
     ]
   }
   ```
6. Kalau muncul **401 Unauthorized**: cek lagi apakah environment `Kontak API - Local` sudah dipilih (dropdown kanan atas), dan apakah request Login sudah pernah di-`Send` sehingga `{{token}}` sudah terisi.

### 13.6 Request Tambahan (Lengkapi Collection)

Ulangi pola yang sama (method, headers, Bearer `{{token}}` untuk yang butuh login) untuk endpoint lain:

| Nama Request | Method | URL | Body |
|---|---|---|---|
| Get All Kontak | GET | `{{base_url}}/kontak` | — |
| Get Detail Kontak | GET | `{{base_url}}/kontak/1` | — |
| Update Kontak | PUT | `{{base_url}}/kontak/1` | `{ "nama": "...", "alamat": "...", "tanggal_lahir": "..." }` |
| Delete Kontak | DELETE | `{{base_url}}/kontak/1` | — |
| Logout | POST | `{{base_url}}/logout` | — |

> 💡 Untuk request **GET/DELETE** tanpa body, tab **Body** cukup dibiarkan **none**.

### 13.7 Tips Praktis
- Simpan tiap request dengan **Ctrl+S** (Windows) / **Cmd+S** (Mac) setelah dibuat, supaya tersimpan permanen di collection.
- Kalau ingin export & share ke teman/dosen: klik titik tiga di samping nama collection → **Export** → pilih format **Collection v2.1** → simpan sebagai file `.json`.
- Ganti nilai `base_url` di environment jika backend dijalankan di IP/port lain (misal saat backend ada di VM Ubuntu, isi dengan `http://<IP_VM>:8000/api`).

**Backend selesai ✅** — API siap diakses di `http://127.0.0.1:8000/api`.

---

# BAGIAN 2 — FRONTEND: React + Vite + Tailwind CSS (Project Terpisah)

Project: **`kontak-frontend`** (folder berbeda, tidak digabung dengan `kontak-api`)

## Langkah 1: Buat Project React dengan Vite

```bash
npm create vite@latest kontak-frontend -- --template react
cd kontak-frontend
npm install
```

## Langkah 2: Install & Konfigurasi Tailwind CSS

```bash
npm install tailwindcss @tailwindcss/vite
```

Edit `vite.config.js`:
```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

Edit `src/index.css` (hapus isi lama, ganti dengan):
```css
@import "tailwindcss";
```

Pastikan `src/main.jsx` mengimpor CSS tersebut:
```js
import './index.css'
```

## Langkah 3: Struktur Folder

```
src/
  ├── api.js                 // helper fetch + base URL + token
  ├── App.jsx
  ├── main.jsx
  └── components/
      ├── LoginForm.jsx
      ├── RegisterForm.jsx
      ├── ContactList.jsx
      └── ContactForm.jsx
```

## Langkah 4: Helper API (`src/api.js`)

```js
// src/api.js
const BASE_URL = 'http://127.0.0.1:8000/api'; // ganti sesuai IP/host backend

function getToken() {
  return localStorage.getItem('token');
}

export async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Terjadi kesalahan pada server');
  }
  return data;
}
```

## Langkah 5: Form Login (`src/components/LoginForm.jsx`)

```jsx
// src/components/LoginForm.jsx
import { useState } from 'react';
import { apiFetch } from '../api';

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.token);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto bg-slate-800 p-6 rounded-xl shadow-lg space-y-4">
      <h2 className="text-xl font-bold text-white">Login</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input
        type="email" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-sky-400"
      />
      <input
        type="password" placeholder="Password" value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-sky-400"
      />
      <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 rounded transition">
        Masuk
      </button>
    </form>
  );
}
```

## Langkah 6: Form Register (`src/components/RegisterForm.jsx`)

```jsx
// src/components/RegisterForm.jsx
import { useState } from 'react';
import { apiFetch } from '../api';

export default function RegisterForm({ onRegisterSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      localStorage.setItem('token', data.token);
      onRegisterSuccess();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto bg-slate-800 p-6 rounded-xl shadow-lg space-y-4">
      <h2 className="text-xl font-bold text-white">Daftar Akun</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input name="name" placeholder="Nama" value={form.name} onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-sky-400" />
      <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-sky-400" />
      <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-sky-400" />
      <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 rounded transition">
        Daftar
      </button>
    </form>
  );
}
```

## Langkah 7: Daftar Kontak (`src/components/ContactList.jsx`)

Sesuai slide "Integrasi Frontend React: Fetch API & useEffect", di-styling dengan Tailwind:

```jsx
// src/components/ContactList.jsx
import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

export default function ContactList({ refreshKey }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/kontak')
      .then((data) => {
        setContacts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Gagal memuat kontak:', err);
        setLoading(false);
      });
  }, [refreshKey]); // reload saat ada kontak baru ditambahkan

  if (loading) return <p className="text-slate-400 text-center">Memuat data kontak...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <h3 className="text-lg font-bold text-white">Daftar Kontak ({contacts.length})</h3>
      {contacts.map((c) => (
        <div key={c.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-white font-semibold">{c.nama}</p>
          <p className="text-slate-400 text-sm">{c.alamat}</p>
          <ul className="mt-2 space-y-1">
            {c.phones?.map((p) => (
              <li key={p.id} className="text-sky-400 text-sm">
                {p.jenis}: {p.nomor_telepon}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

> **Catatan mekanisme (dari slide):**
> - `useEffect` dengan dependency `[]`/`[refreshKey]` bertindak sebagai *side-effect trigger* yang menjalankan `fetch()` saat komponen pertama kali di-*mount* / saat data berubah.
> - Header `Authorization: Bearer <token>` wajib disertakan agar request lolos middleware `auth:sanctum`.
> - Field nested `phones` (hasil `Contact::with('phones')`) langsung dirender dengan `c.phones.map(...)`.
> - State `loading` memberi indikator visual sebelum data selesai diterima dari server.

## Langkah 8: Form Tambah Kontak (`src/components/ContactForm.jsx`)

```jsx
// src/components/ContactForm.jsx
import { useState } from 'react';
import { apiFetch } from '../api';

export default function ContactForm({ onAdded }) {
  const [form, setForm] = useState({ nama: '', alamat: '', tanggal_lahir: '' });
  const [phone, setPhone] = useState({ jenis: 'HP', nomor_telepon: '' });
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/kontak', {
        method: 'POST',
        body: JSON.stringify({ ...form, phones: [phone] }),
      });
      setForm({ nama: '', alamat: '', tanggal_lahir: '' });
      setPhone({ jenis: 'HP', nomor_telepon: '' });
      onAdded(); // trigger reload ContactList
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-slate-800 p-6 rounded-xl shadow-lg space-y-3 mb-6">
      <h3 className="text-lg font-bold text-white">Tambah Kontak</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input name="nama" placeholder="Nama" value={form.nama} onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600" required />
      <input name="alamat" placeholder="Alamat" value={form.alamat} onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600" required />
      <input name="tanggal_lahir" type="date" value={form.tanggal_lahir} onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600" required />
      <div className="flex gap-2">
        <select value={phone.jenis} onChange={(e) => setPhone({ ...phone, jenis: e.target.value })}
          className="px-3 py-2 rounded bg-slate-900 text-white border border-slate-600">
          <option>HP</option>
          <option>Rumah</option>
          <option>Kantor</option>
        </select>
        <input placeholder="Nomor Telepon" value={phone.nomor_telepon}
          onChange={(e) => setPhone({ ...phone, nomor_telepon: e.target.value })}
          className="flex-1 px-3 py-2 rounded bg-slate-900 text-white border border-slate-600" required />
      </div>
      <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 rounded transition">
        Simpan Kontak
      </button>
    </form>
  );
}
```

## Langkah 9: Rangkai di `src/App.jsx`

```jsx
// src/App.jsx
import { useState } from 'react';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ContactForm from './components/ContactForm';
import ContactList from './components/ContactList';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [showRegister, setShowRegister] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleLogout() {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        {showRegister ? (
          <RegisterForm onRegisterSuccess={() => setIsLoggedIn(true)} />
        ) : (
          <LoginForm onLoginSuccess={() => setIsLoggedIn(true)} />
        )}
        <button
          onClick={() => setShowRegister(!showRegister)}
          className="text-sky-400 text-sm hover:underline"
        >
          {showRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4">
      <div className="flex justify-between items-center max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-white">📇 Kontak App</h1>
        <button onClick={handleLogout} className="text-red-400 text-sm hover:underline">
          Logout
        </button>
      </div>
      <ContactForm onAdded={() => setRefreshKey((k) => k + 1)} />
      <ContactList refreshKey={refreshKey} />
    </div>
  );
}
```

## Langkah 10: Jalankan Frontend

```bash
npm run dev
```

Buka browser ke URL yang ditampilkan (default `http://localhost:5173`).

## Langkah 11: Uji Coba End-to-End

1. Buka `http://localhost:5173` → klik **Daftar** → isi form → submit (memanggil `POST /api/register`, token otomatis tersimpan di `localStorage`).
2. Setelah login, form **Tambah Kontak** akan memanggil `POST /api/kontak` dengan header `Authorization: Bearer <token>`.
3. Daftar kontak otomatis termuat lewat `GET /api/kontak` (relasi `phones` ikut ditampilkan).
4. Logout menghapus token dari `localStorage` dan mengembalikan ke halaman login.

---

# BAGIAN 3 — Troubleshooting Umum

| Masalah | Penyebab | Solusi |
|---|---|---|
| `BadMethodCallException` saat `createToken()` | Trait `HasApiTokens` belum ditambahkan di `User.php` | Tambahkan `use HasApiTokens, HasFactory, Notifiable;` |
| `SQLSTATE... no such table: kontak` | Migration belum dijalankan | `php artisan migrate` atau `php artisan migrate:fresh` |
| `401 Unauthorized` di route terproteksi | Header `Authorization: Bearer <token>` tidak dikirim / token salah | Pastikan frontend menyimpan & mengirim token dari hasil login |
| Request dari React diblokir browser (CORS error) | Origin frontend tidak diizinkan backend | Set `allowed_origins` di `config/cors.php` sesuai URL dev server React |
| `422 Unprocessable Entity` | Validasi `$request->validate()` gagal | Cek field wajib (`nama`, `alamat`, `tanggal_lahir`, dst.) sesuai body request |
| Data `phones` kosong saat GET kontak | Query tidak eager-load relasi | Pastikan controller memakai `Contact::with('phones')` |

---

## Ringkasan Alur Kerja

1. **Backend** → `composer create-project` → setup SQLite → `install:api` + Sanctum → migration & model relasi → controller Auth & Contact → routing `api.php` → aktifkan CORS → `php artisan serve`.
2. **Frontend** → `npm create vite` → install Tailwind (`@tailwindcss/vite`) → helper `api.js` → komponen Login/Register/ContactList/ContactForm → `npm run dev`.
3. Kedua project berjalan bersamaan di port berbeda (`8000` backend, `5173` frontend), berkomunikasi murni via REST API + Bearer Token — **tidak digabung dalam satu project**.
