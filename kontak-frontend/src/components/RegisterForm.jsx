import { useState } from "react";
import { apiFetch } from "../api";

export default function RegisterForm({ onRegisterSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await apiFetch("/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("token", data.token);
      onRegisterSuccess();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-sm mx-auto bg-slate-800 p-6 rounded-xl shadow-lg space-y-4"
    >
      <h2 className="text-xl font-bold text-white">Daftar Akun</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input
        name="name"
        placeholder="Nama"
        value={form.name}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-sky-400"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-sky-400"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-sky-400"
      />
      <button
        type="submit"
        className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 rounded transition"
      >
        Daftar
      </button>
    </form>
  );
}
