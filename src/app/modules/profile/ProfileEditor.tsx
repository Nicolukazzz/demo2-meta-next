import React, { useMemo, useState } from "react";
import { BusinessProfile, StaffHours, StaffMember } from "@/lib/businessProfile";

export type ProfileFormValues = {
  branding: {
    businessName: string;
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
  };
  hours: { open: string; close: string; slotMinutes: number };
  staff: StaffMember[];
};

type Props = {
  value: ProfileFormValues;
  onChange: (next: ProfileFormValues) => void;
  onSave: () => void;
  saving: boolean;
  error?: string | null;
  success?: string | null;
  profile?: BusinessProfile | null;
};

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
};

function updateStaffHours(
  member: StaffMember,
  hours: Partial<StaffHours> | null,
  fallbackSlotMinutes: number,
): StaffMember {
  if (!hours) {
    const { hours: _omit, ...rest } = member;
    return rest as StaffMember;
  }
  const nextHours: StaffHours = {
    open: hours.open ?? member.hours?.open ?? "",
    close: hours.close ?? member.hours?.close ?? "",
    slotMinutes: hours.slotMinutes ?? member.hours?.slotMinutes ?? fallbackSlotMinutes,
    daysOfWeek: hours.daysOfWeek ?? member.hours?.daysOfWeek,
  };
  return { ...member, hours: nextHours };
}

export function ProfileEditor({
  value,
  onChange,
  onSave,
  saving,
  error,
  success,
  profile,
}: Props) {
  const inputBase =
    "mt-3 w-full rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40";

  const [newStaff, setNewStaff] = useState<{ name: string; role: string; phone: string }>({
    name: "",
    role: "",
    phone: "",
  });

  const businessHours = useMemo(() => value.hours, [value.hours]);

  const handleStaffChange = (id: string, updater: (current: StaffMember) => StaffMember) => {
    const updated = value.staff.map((member) => (member.id === id ? updater(member) : member));
    onChange({ ...value, staff: updated });
  };

  const handleAddStaff = () => {
    if (!newStaff.name.trim()) return;
    const member: StaffMember = {
      id: generateId(),
      name: newStaff.name.trim(),
      role: newStaff.role.trim(),
      phone: newStaff.phone.trim(),
      active: true,
      hours: { ...businessHours },
    };
    onChange({ ...value, staff: [...(value.staff ?? []), member] });
    setNewStaff({ name: "", role: "", phone: "" });
  };

  const handleRemoveStaff = (id: string) => {
    onChange({ ...value, staff: (value.staff ?? []).filter((member) => member.id !== id) });
  };

  const toggleDay = (id: string, dayIndex: number) => {
    handleStaffChange(id, (member) => {
      const current = member.hours?.daysOfWeek ?? [];
      const exists = current.includes(dayIndex);
      const nextDays = exists ? current.filter((d) => d !== dayIndex) : [...current, dayIndex].sort();
      return updateStaffHours(
        member,
        { ...(member.hours ?? { open: businessHours.open, close: businessHours.close }), daysOfWeek: nextDays },
        businessHours.slotMinutes,
      );
    });
  };

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
              {profile?.branding?.businessName?.[0]?.toUpperCase() ?? "NB"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-indigo-100/80">
          <span className="inline-flex h-[3px] w-14 animate-pulse rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-300 shadow-[0_0_18px_rgba(94,234,212,0.45)]" />
          <span>Personaliza marca, horarios y staff</span>
        </div>
      </div>

      <div className="relative mt-7 space-y-7">
        <label className="block text-sm font-semibold text-slate-100">
          Nombre
          <input
            value={value.branding.businessName}
            onChange={(e) =>
              onChange({
                ...value,
                branding: { ...value.branding, businessName: e.target.value },
              })
            }
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

        <div className="relative mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-indigo-200/70">Equipo</p>
              <h4 className="text-lg font-semibold text-white">Staff asignable</h4>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-100">
              Nombre
              <input
                type="text"
                value={newStaff.name}
                onChange={(e) => setNewStaff((prev) => ({ ...prev, name: e.target.value }))}
                className={inputBase}
                placeholder="Ana"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-100">
              Rol
              <input
                type="text"
                value={newStaff.role}
                onChange={(e) => setNewStaff((prev) => ({ ...prev, role: e.target.value }))}
                className={inputBase}
                placeholder="Barbero"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-100">
              Telefono
              <input
                type="text"
                value={newStaff.phone}
                onChange={(e) => setNewStaff((prev) => ({ ...prev, phone: e.target.value }))}
                className={inputBase}
                placeholder="+57..."
              />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleAddStaff}
              className="rounded-xl border border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_10px_40px_-20px_rgba(59,130,246,0.9)] transition hover:translate-y-[-2px] hover:shadow-[0_15px_50px_-18px_rgba(59,130,246,0.9)]"
            >
              Agregar staff
            </button>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {(value.staff ?? []).length === 0 ? (
              <p className="text-sm text-slate-300">Sin staff registrado.</p>
            ) : (
              (value.staff ?? []).map((member) => (
                <div
                  key={member.id}
                  className="space-y-3 rounded-xl border border-white/10 bg-slate-900/70 p-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex-1 text-sm font-semibold text-slate-100">
                      Nombre
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) =>
                          handleStaffChange(member.id, (current) => ({
                            ...current,
                            name: e.target.value,
                          }))
                        }
                        className={inputBase}
                      />
                    </label>
                    <label className="flex-1 text-sm font-semibold text-slate-100">
                      Rol
                      <input
                        type="text"
                        value={member.role}
                        onChange={(e) =>
                          handleStaffChange(member.id, (current) => ({
                            ...current,
                            role: e.target.value,
                          }))
                        }
                        className={inputBase}
                      />
                    </label>
                    <label className="flex-1 text-sm font-semibold text-slate-100">
                      Telefono
                      <input
                        type="text"
                        value={member.phone}
                        onChange={(e) =>
                          handleStaffChange(member.id, (current) => ({
                            ...current,
                            phone: e.target.value,
                          }))
                        }
                        className={inputBase}
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={member.active !== false}
                        onChange={(e) =>
                          handleStaffChange(member.id, (current) => ({
                            ...current,
                            active: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-400/60"
                      />
                      Activo
                    </label>
                    <button
                      type="button"
                      className="ml-auto rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-1 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/30"
                      onClick={() => handleRemoveStaff(member.id)}
                    >
                      Eliminar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="text-sm font-semibold text-slate-100">
                      Apertura
                      <input
                        type="time"
                        value={member.hours?.open ?? ""}
                        onChange={(e) =>
                          handleStaffChange(member.id, (current) =>
                            updateStaffHours(
                              current,
                              { ...(current.hours ?? {}), open: e.target.value },
                              businessHours.slotMinutes,
                            ),
                          )
                        }
                        className={inputBase}
                        placeholder={businessHours.open}
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-100">
                      Cierre
                      <input
                        type="time"
                        value={member.hours?.close ?? ""}
                        onChange={(e) =>
                          handleStaffChange(member.id, (current) =>
                            updateStaffHours(
                              current,
                              { ...(current.hours ?? {}), close: e.target.value },
                              businessHours.slotMinutes,
                            ),
                          )
                        }
                        className={inputBase}
                        placeholder={businessHours.close}
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-100">
                      Intervalo (min)
                      <input
                        type="number"
                        min={5}
                        value={member.hours?.slotMinutes ?? businessHours.slotMinutes}
                        onChange={(e) =>
                          handleStaffChange(member.id, (current) =>
                            updateStaffHours(
                              current,
                              { ...(current.hours ?? {}), slotMinutes: Number(e.target.value) || 0 },
                              businessHours.slotMinutes,
                            ),
                          )
                        }
                        className={inputBase}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-slate-200 hover:bg-white/15"
                      onClick={() =>
                        handleStaffChange(member.id, (current) => updateStaffHours(current, null, businessHours.slotMinutes))
                      }
                    >
                      Usar horario general
                    </button>
                    <p className="text-[11px] text-slate-400">
                      Si el horario queda vacio, se usara el horario del negocio.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      Dias de la semana (0=Lunes, 6=Domingo). Vacio = todos.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {DAYS.map((label, index) => {
                        const checked = member.hours?.daysOfWeek?.includes(index) ?? false;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleDay(member.id, index)}
                            className={`rounded-md border px-2 py-1 text-xs ${
                              checked
                                ? "border-indigo-300/60 bg-indigo-500/20 text-indigo-100"
                                : "border-white/10 bg-white/5 text-slate-200"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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
    </div>
  );
}

export default ProfileEditor;
