import { useState } from "react";
import { apiFetch } from "../api";

export default function ContactForm({ onAdded }) {
  const [form, setForm] = useState({ nama: "", alamat: "", tanggal_lahir: "" });
  const [phone, setPhone] = useState({ jenis: "HP", nomor_telepon: "" });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/kontak", {
        method: "POST",
        body: JSON.stringify({ ...form, phones: [phone] }),
      });
      setForm({ nama: "", alamat: "", tanggal_lahir: "" });
      setPhone({ jenis: "HP", nomor_telepon: "" });
      onAdded(); // trigger reload ContactList
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto bg-slate-800 p-6 rounded-xl shadow-lg space-y-3 mb-6"
    >
      <h3 className="text-lg font-bold text-white">Tambah Kontak</h3>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input
        name="nama"
        placeholder="Nama"
        value={form.nama}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600"
        required
      />
      <input
        name="alamat"
        placeholder="Alamat"
        value={form.alamat}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600"
        required
      />
      <input
        name="tanggal_lahir"
        type="date"
        value={form.tanggal_lahir}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600"
        required
      />
      <div className="flex gap-2">
        <select
          value={phone.jenis}
          onChange={(e) => setPhone({ ...phone, jenis: e.target.value })}
          className="px-3 py-2 rounded bg-slate-900 text-white border border-slate-600"
        >
          <option>HP</option>
          <option>Rumah</option>
          <option>Kantor</option>
        </select>
        <input
          placeholder="Nomor Telepon"
          value={phone.nomor_telepon}
          onChange={(e) =>
            setPhone({ ...phone, nomor_telepon: e.target.value })
          }
          className="flex-1 px-3 py-2 rounded bg-slate-900 text-white border border-slate-600"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 rounded transition"
      >
        Simpan Kontak
      </button>
    </form>
  );
}
