import { useState } from "react";
import { apiFetch } from "../api";

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("token", data.token);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-sm mx-auto bg-slate-800 p-6 rounded-xl shadow-lg space-y-4"
    >
      <h2 className="text-xl font-bold text-white">Login</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-sky-400"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-3 py-2 rounded bg-slate-900 text-white border border-slate-600 focus:outline-none focus:border-sky-400"
      />
      <button
        type="submit"
        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 rounded transition"
      >
        Masuk
      </button>
    </form>
  );
}
