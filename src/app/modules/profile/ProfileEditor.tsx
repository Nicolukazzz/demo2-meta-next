import { BusinessProfile } from "@/lib/businessProfile";
import React from "react";

export type ProfileFormValues = {
  businessName: string;
  hours: { open: string; close: string; slotMinutes: number };
  branding: { logoUrl?: string };
};

export type StaffMember = { _id: string; name: string; role?: string; phone?: string; status?: string };
export type StaffFormValues = { name: string; role: string; phone: string };

type Props = {
  value: ProfileFormValues;
  onChange: (next: ProfileFormValues) => void;
  onSave: () => void;
  saving: boolean;
  error?: string | null;
  success?: string | null;
  profile?: BusinessProfile | null;
  staffList?: StaffMember[];
  staffLoading?: boolean;
  staffError?: string | null;
  staffForm?: StaffFormValues;
  onStaffFormChange?: (next: StaffFormValues) => void;
  onCreateStaff?: () => void;
  onDeleteStaff?: (id: string) => void;
};

export function ProfileEditor({
  value,
  onChange,
  onSave,
  saving,
  error,
  success,
  profile,
  staffList = [],
  staffLoading = false,
  staffError,
  staffForm,
  onStaffFormChange,
  onCreateStaff,
  onDeleteStaff,
}: Props) {
  const inputBase =
    "mt-3 w-full rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-400/35 bg-slate-900/90 p-8 shadow-[0_30px_120px_-50px_rgba(59,130,246,0.9)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div className="animate-pulse bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.22),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(45,212,191,0.18),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.16),transparent_40%)] h-full w-full" />
      </div>

      <div className="relative space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-200/70">Configuracion</p>
            <p className="mt-1 text-2xl font-semibold text-white">Editar informacion del negocio</p>
          </div>
          {profile?.branding?.logoUrl ? (
            <img
              src={profile.branding.logoUrl}
              alt="Logo"
              className="h-12 w-12 rounded-xl border border-white/10 object-cover bg-white/5 shadow-lg shadow-indigo-500/20"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-indigo-100">
              {profile?.businessName?.[0]?.toUpperCase() ?? "NB"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-indigo-100/80">
          <span className="inline-flex h-[3px] w-14 animate-pulse rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-300 shadow-[0_0_18px_rgba(94,234,212,0.45)]" />
          <span>Personaliza marca, horarios y branding</span>
        </div>
      </div>

      <div className="relative mt-7 space-y-7">
        <label className="block text-sm font-semibold text-slate-100">
          Nombre
          <input
            value={value.businessName}
            onChange={(e) => onChange({ ...value, businessName: e.target.value })}
            className={inputBase}
            type="text"
          />
        </label>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-100">
            Apertura
            <input
              type="time"
              value={value.hours.open}
              onChange={(e) => onChange({ ...value, hours: { ...value.hours, open: e.target.value } })}
              className={inputBase}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-100">
            Cierre
            <input
              type="time"
              value={value.hours.close}
              onChange={(e) => onChange({ ...value, hours: { ...value.hours, close: e.target.value } })}
              className={inputBase}
            />
          </label>
        </div>

        <label className="block text-sm font-semibold text-slate-100">
          Intervalo (min)
          <input
            type="number"
            min={5}
            value={value.hours.slotMinutes}
            onChange={(e) =>
              onChange({
                ...value,
                hours: { ...value.hours, slotMinutes: Number(e.target.value) || 0 },
              })
            }
            className={inputBase}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-100">
          Logo URL
          <input
            type="url"
            value={value.branding.logoUrl ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                branding: { ...value.branding, logoUrl: e.target.value },
              })
            }
            className={inputBase}
            placeholder="https://..."
          />
        </label>

        <div className="pt-4 flex items-center gap-4 border-t border-white/10">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl border border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_10px_40px_-20px_rgba(59,130,246,0.9)] transition hover:translate-y-[-2px] hover:shadow-[0_15px_50px_-18px_rgba(59,130,246,0.9)] disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>
          {error ? <span className="text-xs text-rose-200">{error}</span> : null}
          {success ? <span className="text-xs text-emerald-200">{success}</span> : null}
        </div>
      </div>

      {(onCreateStaff || onDeleteStaff) && (
        <div className="relative mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-indigo-200/70">Equipo</p>
              <h4 className="text-lg font-semibold text-white">Staff asignable</h4>
            </div>
            {staffLoading ? (
              <span className="text-xs text-slate-300">Cargando...</span>
            ) : staffError ? (
              <span className="text-xs text-rose-200">{staffError}</span>
            ) : null}
          </div>

          {staffForm && onStaffFormChange ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold text-slate-100">
                Nombre
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => onStaffFormChange({ ...staffForm, name: e.target.value })}
                  className={inputBase}
                  placeholder="Ana"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-100">
                Rol
                <input
                  type="text"
                  value={staffForm.role}
                  onChange={(e) => onStaffFormChange({ ...staffForm, role: e.target.value })}
                  className={inputBase}
                  placeholder="Barbero"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-100">
                Telefono
                <input
                  type="text"
                  value={staffForm.phone}
                  onChange={(e) => onStaffFormChange({ ...staffForm, phone: e.target.value })}
                  className={inputBase}
                  placeholder="+57..."
                />
              </label>
            </div>
          ) : null}

          {onCreateStaff ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onCreateStaff}
                className="rounded-xl border border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_10px_40px_-20px_rgba(59,130,246,0.9)] transition hover:translate-y-[-2px] hover:shadow-[0_15px_50px_-18px_rgba(59,130,246,0.9)]"
              >
                Agregar staff
              </button>
            </div>
          ) : null}

          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {staffList.length === 0 ? (
              <p className="text-sm text-slate-300">Sin staff registrado.</p>
            ) : (
              staffList.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{member.name}</p>
                    <p className="text-[11px] text-slate-300">
                      {member.role ?? "Staff"} {member.phone ? `· ${member.phone}` : ""}
                    </p>
                  </div>
                  {onDeleteStaff ? (
                    <button
                      className="rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-1 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/30"
                      onClick={() => onDeleteStaff(member._id)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileEditor;
