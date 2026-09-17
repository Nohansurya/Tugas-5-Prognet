import { useState } from "react";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import ContactForm from "./components/ContactForm";
import ContactList from "./components/ContactList";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [showRegister, setShowRegister] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleLogout() {
    localStorage.removeItem("token");
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
          {showRegister
            ? "Sudah punya akun? Login"
            : "Belum punya akun? Daftar"}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4">
      <div className="flex justify-between items-center max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-white">📇 Kontak App</h1>
        <button
          onClick={handleLogout}
          className="text-red-400 text-sm hover:underline"
        >
          Logout
        </button>
      </div>
      <ContactForm onAdded={() => setRefreshKey((k) => k + 1)} />
      <ContactList refreshKey={refreshKey} />
    </div>
  );
}
