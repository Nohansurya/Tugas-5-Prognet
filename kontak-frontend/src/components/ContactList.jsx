import { useState, useEffect } from "react";
import { apiFetch } from "../api";

export default function ContactList({ refreshKey }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch("/kontak")
      .then((data) => {
        setContacts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat kontak:", err);
        setLoading(false);
      });
  }, [refreshKey]); // reload saat ada kontak baru ditambahkan

  if (loading)
    return <p className="text-slate-400 text-center">Memuat data kontak...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <h3 className="text-lg font-bold text-white">
        Daftar Kontak ({contacts.length})
      </h3>
      {contacts.map((c) => (
        <div
          key={c.id}
          className="bg-slate-800 border border-slate-700 rounded-lg p-4"
        >
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
