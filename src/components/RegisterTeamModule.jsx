import React, { useState } from "react";

export function RegisterTeamModule({ onRegisterSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({ team_name: "", full_name: "", user_email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/auth/register-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert("🎉 ¡Workspace de " + formData.team_name + " creado con éxito!");
      onRegisterSuccess(data.token, data.user);
    } catch (err) {
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-2xl border border-slate-200 shadow-lg space-y-4">
      <h2 className="text-xl font-bold text-slate-900 text-center">Registrar Nueva Empresa en Núcleo RH</h2>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="font-bold block mb-1">Nombre de la Empresa / Equipo *</label>
          <input
            type="text"
            required
            value={formData.team_name}
            onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
            placeholder="Ej. Grupo Comercial RH"
            className="w-full px-3 py-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="font-bold block mb-1">Tu Nombre Completo *</label>
          <input
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Ej. María González"
            className="w-full px-3 py-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="font-bold block mb-1">Correo Electrónico Administrador *</label>
          <input
            type="email"
            required
            value={formData.user_email}
            onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
            placeholder="admin@tuempresa.com"
            className="w-full px-3 py-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="font-bold block mb-1">Contraseña *</label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            className="w-full px-3 py-2 border rounded-xl"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[#1B4B43] text-white font-bold rounded-xl cursor-pointer"
        >
          {loading ? "Creando Workspace..." : "Crear Equipo y Comenzar"}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 pt-2 border-t">
        ¿Ya tienes cuenta?{" "}
        <button onClick={onSwitchToLogin} className="text-[#1B4B43] font-bold underline">
          Iniciar Sesión
        </button>
      </p>
    </div>
  );
}