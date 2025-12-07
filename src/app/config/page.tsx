
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BusinessProfile,
  DEFAULT_HOURS,
  DEFAULT_PROFILE,
  DayOfWeek,
  BusinessDaySchedule,
  Service,
  StaffDaySchedule,
  StaffMember,
  getBusinessWeekSchedule,
} from "@/lib/businessProfile";
import { DEFAULT_BRAND_THEME } from "@/lib/theme";
import { ThemeColors, useTheme, deriveThemeColors } from "@/lib/theme/ThemeContext";
import ColorInput from "../components/ColorInput";
import ToggleChip from "../components/ToggleChip";
import NeonCard from "../components/NeonCard";
import SectionCard from "../components/SectionCard";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import ThemePreviewCard from "../components/ThemePreviewCard";
import SidebarItem from "../components/SidebarItem";
import { SaveStatusBadge } from "../components/SaveFeedback";
import { useSaveStatus } from "../hooks/useSaveStatus";

type SectionKey = "info" | "staff" | "services";
type BrandColorKey = "primary" | "secondary" | "tertiary";

const DAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
type LocalSession = { clientId: string; branding?: { businessName?: string }; email?: string };

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
};

type BusinessForm = {
  branding: BusinessProfile["branding"];
  hours: NonNullable<BusinessProfile["hours"]>;
};

const emptyService = (): Service => ({
  id: generateId(),
  name: "",
  price: 0,
  durationMinutes: undefined,
  description: "",
  active: true,
});

type TimeInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
};

const ClockIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

function TimeInput({ label, value, onChange, disabled, size = "md" }: TimeInputProps) {
  const inputSizing = size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm";
  const labelSizing = size === "sm" ? "text-xs" : "text-sm";
  return (
    <label className={`block font-semibold text-slate-100 ${labelSizing}`}>
      {label}
      <div className="relative mt-2">
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`time-input w-full appearance-none rounded-xl border border-white/10 bg-slate-800/70 pr-10 ${inputSizing} text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40 disabled:opacity-50`}
        />
        <ClockIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-200" />
      </div>
    </label>
  );
}
export default function ConfigPage() {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [section, setSection] = useState<SectionKey>("info");
  const [businessForm, setBusinessForm] = useState<BusinessForm>({
    branding: DEFAULT_PROFILE.branding,
    hours: DEFAULT_HOURS,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceDraft, setServiceDraft] = useState<Service>(emptyService());
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const profileSave = useSaveStatus();
  const { setColors } = useTheme();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm?: () => Promise<void> | void;
    detail?: React.ReactNode;
    loading?: boolean;
  }>({ open: false, title: "", description: "" });
  const handleThemeColorChange = (key: BrandColorKey, next: string) => {
    setBusinessForm((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        theme: {
          ...(prev.branding.theme ?? DEFAULT_BRAND_THEME),
          [key]: next,
        },
      },
    }));
    setColors({ [key]: next } as Partial<ThemeColors>);
  };
  const resetThemeColors = () => {
    setBusinessForm((prev) => ({
      ...prev,
      branding: { ...prev.branding, theme: DEFAULT_BRAND_THEME },
    }));
    setColors(deriveThemeColors());
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
      } catch {
        localStorage.removeItem("session");
      }
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.clientId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/profile?clientId=${encodeURIComponent(session.clientId)}`);
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.data) throw new Error(body?.error ?? "No se pudo cargar el perfil");
        const fetchedBranding = body.data?.branding ?? DEFAULT_PROFILE.branding;
        setColors(deriveThemeColors(fetchedBranding));
        setBusinessForm({
          branding: { ...fetchedBranding, theme: fetchedBranding.theme ?? DEFAULT_BRAND_THEME },
          hours: body.data?.hours ?? DEFAULT_HOURS,
        });
        setStaffList((body.data?.staff as StaffMember[] | undefined) ?? []);
        setServices((body.data?.services as Service[] | undefined) ?? []);
        if (!selectedStaffId && body.data?.staff?.length) {
          setSelectedStaffId(body.data.staff[0].id);
        }
      } catch (err: any) {
        setError(err?.message ?? "No se pudo cargar el perfil");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [session, setColors]);

  const businessHours = businessForm.hours ?? DEFAULT_HOURS;
  const businessWeek = useMemo(
    () => getBusinessWeekSchedule(businessForm.hours),
    [businessForm.hours],
  );

  const selectedStaff = useMemo(() => {
    if (!selectedStaffId) return staffList[0];
    return staffList.find((s) => s.id === selectedStaffId) ?? staffList[0];
  }, [selectedStaffId, staffList]);
  const isStaffDisabled = selectedStaff?.active === false;

  const updateStaff = (id: string, updater: (current: StaffMember) => StaffMember) => {
    setStaffList((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
  };

  const upsertDay = (member: StaffMember, day: DayOfWeek, partial: Partial<StaffDaySchedule>) => {
    const existing = member.schedule?.days ?? [];
    const idx = existing.findIndex((d) => d.day === day);
    const base: StaffDaySchedule = {
      day,
      open: partial.open ?? businessHours.open,
      close: partial.close ?? businessHours.close,
      slotMinutes: partial.slotMinutes ?? member.hours?.slotMinutes ?? businessHours.slotMinutes,
    };
    let days: StaffDaySchedule[];
    if (idx >= 0) {
      days = existing.map((d, i) => (i === idx ? { ...d, ...base, ...partial, day } : d));
    } else {
      days = [...existing, { ...base, ...partial, day }];
    }
    return { ...member, schedule: { ...(member.schedule ?? {}), days } };
  };

  const removeDay = (member: StaffMember, day: DayOfWeek) => {
    const days = (member.schedule?.days ?? []).filter((d) => d.day !== day);
    const schedule =
      days.length === 0 && !member.schedule?.useBusinessHours && !member.schedule?.useStaffHours
        ? undefined
        : { ...(member.schedule ?? {}), days };
    return { ...member, schedule };
  };

  const handleToggleDay = (day: DayOfWeek, checked: boolean) => {
    if (!selectedStaff) return;
    updateStaff(selectedStaff.id, (current) =>
      checked ? upsertDay(current, day, {}) : removeDay(current, day),
    );
  };

  const addStaff = () => {
    const newMember: StaffMember = {
      id: generateId(),
      name: "Nuevo staff",
      role: "",
      phone: "",
      active: true,
      schedule: { useBusinessHours: true },
    };
    setStaffList((prev) => [newMember, ...prev]);
    setSelectedStaffId(newMember.id);
  };

  const removeStaff = (id: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    if (selectedStaffId === id) {
      setSelectedStaffId(null);
    }
  };

  const updateBusinessDay = (day: DayOfWeek, partial: Partial<BusinessDaySchedule>) => {
    setBusinessForm((prev) => {
      const hours = prev.hours ?? DEFAULT_HOURS;
      const baseDays = getBusinessWeekSchedule(hours).map((d) => ({ ...d }));
      const nextDays = baseDays.map((d) =>
        d.day === day
          ? {
              ...d,
              ...partial,
              day,
              open: partial.open ?? d.open,
              close: partial.close ?? d.close,
              active: typeof partial.active === "boolean" ? partial.active : d.active ?? true,
            }
          : d,
      );
      return { ...prev, hours: { ...hours, days: nextDays } };
    });
  };

  const handleBusinessDayToggle = (day: DayOfWeek, active: boolean) => {
    updateBusinessDay(day, { active });
  };

  const handleBusinessDayTimeChange = (day: DayOfWeek, field: "open" | "close", value: string) => {
    updateBusinessDay(day, { [field]: value, active: true });
  };

  const confirmDelete = (
    title: string,
    description: string,
    detail: React.ReactNode,
    onConfirm: () => Promise<void> | void,
  ) => {
    setDeleteDialog({ open: true, title, description, detail, onConfirm, loading: false });
  };

  const handleDeleteStaff = (staff: StaffMember) => {
    confirmDelete(
      "Eliminar miembro del staff",
      `¿Deseas eliminar a ${staff.name || "este miembro"} del staff? Sus turnos futuros podrían verse afectados.`,
      <p className="text-xs text-slate-200">Rol: {staff.role || "Sin rol"} · Tel: {staff.phone || "Sin telefono"}</p>,
      async () => {
        setDeleteDialog((prev) => ({ ...prev, loading: true }));
        removeStaff(staff.id);
        await handleSaveProfile();
        setDeleteDialog({ open: false, title: "", description: "" });
      },
    );
  };

  const handleDeleteService = (svc: Service) => {
    confirmDelete(
      "Eliminar servicio",
      `¿Quieres eliminar el servicio ${svc.name}? Ya no estará disponible para nuevas reservas.`,
      <p className="text-xs text-slate-200">Precio: {currency.format(Number(svc.price) || 0)}</p>,
      async () => {
        setDeleteDialog((prev) => ({ ...prev, loading: true }));
        setServices((prev) => prev.filter((s) => s.id !== svc.id));
        await handleSaveProfile();
        setDeleteDialog({ open: false, title: "", description: "" });
      },
    );
  };

  const handleSaveProfile = async () => {
    if (!session?.clientId) return;
    setLoading(true);
    profileSave.start();
    setError(null);

    const hours = businessForm.hours ?? DEFAULT_HOURS;
    if (toMinutes(hours.open) >= toMinutes(hours.close)) {
      setError("El horario del negocio tiene inicio mayor o igual al fin.");
      profileSave.reset();
      setLoading(false);
      return;
    }

    const normalizedBusinessDays = getBusinessWeekSchedule(businessForm.hours).map((d) => ({
      day: d.day,
      open: d.open,
      close: d.close,
      active: d.active !== false,
    }));

    const invalidBusinessDay = normalizedBusinessDays.some(
      (d) => d.active !== false && toMinutes(d.open) >= toMinutes(d.close),
    );
    if (invalidBusinessDay) {
      setError("Hay un dia del negocio con hora inicio mayor o igual a la hora fin.");
      profileSave.reset();
      setLoading(false);
      return;
    }

    const hasEmptyStaff = staffList.some(
      (s) =>
        !s.name.trim() &&
        !s.role?.trim() &&
        !s.phone?.trim() &&
        !s.hours?.open &&
        !s.hours?.close &&
        !(s.schedule?.days?.length),
    );
    if (hasEmptyStaff) {
      setError("Hay miembros de staff sin nombre. Completalos o eliminalos antes de guardar.");
      profileSave.reset();
      setLoading(false);
      return;
    }

    const validStaff = staffList.map((member) => {
      const useBusinessHours = member.schedule?.useBusinessHours === true;
      const memberHours =
        useBusinessHours || !member.hours?.open || !member.hours?.close
          ? undefined
          : {
              open: member.hours.open,
              close: member.hours.close,
              slotMinutes: member.hours.slotMinutes ?? hours.slotMinutes,
              daysOfWeek: member.hours.daysOfWeek,
            };

      const scheduleDays = (member.schedule?.days ?? []).map((d) => ({
        ...d,
        slotMinutes: d.slotMinutes ?? member.hours?.slotMinutes ?? hours.slotMinutes,
      }));

      return {
        ...member,
        hours: memberHours,
        schedule:
          scheduleDays.length > 0 || member.schedule
            ? {
                ...member.schedule,
                useBusinessHours,
                days: scheduleDays,
              }
            : undefined,
      };
    });

    const invalidHours = validStaff.some((s) => {
      const usingBusiness = s.schedule?.useBusinessHours === true;
      const open = s.hours?.open;
      const close = s.hours?.close;
      const hasHours = Boolean(open && close);
      return (
        (!usingBusiness && hasHours && toMinutes(open as string) >= toMinutes(close as string)) ||
        (s.schedule?.days ?? []).some((d) => toMinutes(d.open) >= toMinutes(d.close))
      );
    });
    if (invalidHours) {
      setError("Hay horarios con inicio mayor o igual al fin.");
      profileSave.reset();
      setLoading(false);
      return;
    }

    const servicesPayload = services
      .filter((svc) => svc.name.trim())
      .map((svc, idx) => ({
        ...svc,
        id: svc.id || `service-${idx}-${generateId()}`,
        price: Number.isNaN(Number(svc.price)) ? 0 : Math.max(0, Number(svc.price)),
        active: svc.active !== false,
      }));

    const payloadBranding = {
      ...businessForm.branding,
      theme: businessForm.branding.theme ?? DEFAULT_BRAND_THEME,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: session.clientId,
          branding: payloadBranding,
          hours: { ...hours, days: normalizedBusinessDays },
          staff: validStaff,
          services: servicesPayload,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.data) {
        throw new Error(body?.error ?? "No se pudo guardar la configuracion");
      }
      const data = body.data as BusinessProfile;
      const resultBranding = data.branding ?? DEFAULT_PROFILE.branding;
      const nextTheme = deriveThemeColors(resultBranding);
      setColors(nextTheme);
      setBusinessForm({
        branding: { ...resultBranding, theme: resultBranding.theme ?? DEFAULT_BRAND_THEME },
        hours: data.hours ?? DEFAULT_HOURS,
      });
      setStaffList((data.staff as StaffMember[]) ?? []);
      setServices((data.services as Service[]) ?? []);
      profileSave.success();
    } catch (err: any) {
      setError(err?.message ?? "No se pudo guardar");
      profileSave.error();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUseBusinessHours = (checked: boolean) => {
    if (!selectedStaff) return;
    updateStaff(selectedStaff.id, (current) => {
      const nextSchedule = { ...(current.schedule ?? {}), useBusinessHours: checked };
      // Si se desactiva y no hay dias definidos, inicializamos copia del negocio como plantilla.
      if (!checked) {
        const hasDays = Array.isArray(current.schedule?.days) && current.schedule?.days.length > 0;
        if (!hasDays && businessWeek.length > 0) {
          nextSchedule.days = businessWeek.map((d) => ({
            day: d.day,
            open: d.open,
            close: d.close,
            slotMinutes: businessHours.slotMinutes,
          }));
        }
      }
      return {
        ...current,
        schedule: nextSchedule,
        hours: checked
          ? current.hours
          : {
              open: current.hours?.open ?? businessHours.open,
              close: current.hours?.close ?? businessHours.close,
              slotMinutes: current.hours?.slotMinutes ?? businessHours.slotMinutes,
            },
      };
    });
  };

  const resetServiceDraft = () => {
    setServiceDraft(emptyService());
    setEditingServiceId(null);
  };

  const handleSaveServiceDraft = () => {
    if (!serviceDraft.name.trim()) {
      setError("El servicio debe tener nombre");
      return;
    }
    const price = Number.isNaN(Number(serviceDraft.price)) ? 0 : Math.max(0, Number(serviceDraft.price));
    if (editingServiceId) {
      setServices((prev) =>
        prev.map((svc) => (svc.id === editingServiceId ? { ...serviceDraft, price } : svc)),
      );
    } else {
      setServices((prev) => [...prev, { ...serviceDraft, id: serviceDraft.id || generateId(), price }]);
    }
    resetServiceDraft();
    setError(null);
  };
  if (!session?.clientId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-200">Inicia sesion en el dashboard para configurar tu negocio.</p>
        <Link
          href="/"
          className="rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
        >
          Ir al login
        </Link>
      </div>
    );
  }

  const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl border border-indigo-300/40 bg-indigo-400/20">
            <img
              src={businessForm.branding.logoUrl ?? "/default-logo.svg"}
              alt={businessForm.branding.businessName}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-xs text-slate-400">Configuracion</p>
            <h1 className="text-lg font-semibold text-white">
              {businessForm.branding.businessName ?? DEFAULT_PROFILE.branding.businessName}
            </h1>
          </div>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
        >
          Volver al dashboard
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <NeonCard className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Menu</p>
            <div className="mt-3 space-y-2">
              {[
                { key: "info" as SectionKey, label: "Editar informacion del negocio" },
                { key: "staff" as SectionKey, label: "Staff asignable" },
                { key: "services" as SectionKey, label: "Servicios" },
              ].map((item) => (
                <SidebarItem
                  key={item.key}
                  label={item.label}
                  active={section === item.key}
                  onClick={() => setSection(item.key)}
                  className="text-left"
                />
              ))}
            </div>
          </NeonCard>
        </aside>

        <section className="space-y-4">
          {loading ? <p className="text-sm text-slate-300">Cargando...</p> : null}
          {error ? <p className="text-sm text-rose-200">{error}</p> : null}

          {section === "info" ? (
            <NeonCard className="p-8 space-y-6 bg-slate-900/90 shadow-[0_30px_120px_-50px_rgba(59,130,246,0.9)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-200/70">Configuracion</p>
                  <p className="mt-1 text-2xl font-semibold text-white">Editar informacion del negocio</p>
                </div>
                {businessForm.branding.logoUrl ? (
                  <img
                    src={businessForm.branding.logoUrl}
                    alt="Logo"
                    className="h-12 w-12 rounded-xl border border-white/10 object-cover bg-white/5 shadow-lg shadow-indigo-500/20"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-indigo-100">
                    {businessForm.branding.businessName?.[0]?.toUpperCase() ?? "NB"}
                  </div>
                )}
              </div>
              <label className="block text-sm font-semibold text-slate-100">
                Nombre
                <input
                  value={businessForm.branding.businessName}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, businessName: e.target.value },
                    }))
                  }
                  className="mt-3 w-full rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                  type="text"
                />
              </label>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <TimeInput
                  label="Hora inicio"
                  value={businessForm.hours.open}
                  onChange={(val) =>
                    setBusinessForm((prev) => ({
                      ...prev,
                      hours: { ...prev.hours, open: val },
                    }))
                  }
                />
                <TimeInput
                  label="Hora fin"
                  value={businessForm.hours.close}
                  onChange={(val) =>
                    setBusinessForm((prev) => ({
                      ...prev,
                      hours: { ...prev.hours, close: val },
                    }))
                  }
                />
              </div>

              <label className="block text-sm font-semibold text-slate-100">
                Intervalo (min)
                <input
                  type="number"
                  min={5}
                  value={businessForm.hours.slotMinutes}
                  onChange={(e) =>
                    setBusinessForm((prev) => ({
                      ...prev,
                      hours: { ...prev.hours, slotMinutes: Number(e.target.value) || 0 },
                    }))
                  }
                  className="mt-3 w-full rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                />
              </label>

              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Horario por día</p>
                  <p className="text-xs text-slate-300">
                    Si no configuras horario por día, se usa el horario general del negocio.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    El horario del día tiene prioridad sobre el general.
                  </p>
                </div>
                <div className="space-y-2">
                  {businessWeek.map((day) => {
                    const label = DAY_LABELS[day.day] ?? `Dia ${day.day + 1}`;
                    const active = day.active !== false;
                    return (
                      <div
                        key={day.day}
                        className="grid grid-cols-1 items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:grid-cols-[140px_1fr]"
                      >
                        <div className="flex items-center gap-2">
                          <ToggleChip
                            checked={active}
                            onChange={(next) => handleBusinessDayToggle(day.day as DayOfWeek, next)}
                            label={label}
                            compact
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <TimeInput
                            size="sm"
                            label="Hora inicio"
                            value={day.open}
                            disabled={!active}
                            onChange={(val) => handleBusinessDayTimeChange(day.day as DayOfWeek, "open", val)}
                          />
                          <TimeInput
                            size="sm"
                            label="Hora fin"
                            value={day.close}
                            disabled={!active}
                            onChange={(val) => handleBusinessDayTimeChange(day.day as DayOfWeek, "close", val)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

                <label className="block text-sm font-semibold text-slate-100">
                  Logo URL
                  <input
                    type="url"
                    value={businessForm.branding.logoUrl ?? ""}
                    onChange={(e) =>
                      setBusinessForm((prev) => ({
                        ...prev,
                        branding: { ...prev.branding, logoUrl: e.target.value },
                      }))
                    }
                    className="mt-3 w-full rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                    placeholder="https://..."
                  />
                </label>

                <SectionCard
                  subtitle="Identidad visual"
                  title="Colores de marca"
                  description="Define los tres colores que se usarán en botones principales, badges y bordes neón."
                  actions={
                    <button
                      type="button"
                      onClick={resetThemeColors}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/10"
                    >
                      Restablecer colores
                    </button>
                  }
                >
                  <div className="grid gap-4 lg:grid-cols-3">
                    <ColorInput
                      label="Color primario"
                      value={businessForm.branding.theme?.primary ?? DEFAULT_BRAND_THEME.primary}
                      description="Se usa en botones principales y enlaces destacados."
                      onChange={(next) => handleThemeColorChange("primary", next)}
                    />
                    <ColorInput
                      label="Color secundario"
                      value={businessForm.branding.theme?.secondary ?? DEFAULT_BRAND_THEME.secondary}
                      description="Se usa en toggles y estados activos secundarios."
                      onChange={(next) => handleThemeColorChange("secondary", next)}
                    />
                    <ColorInput
                      label="Color terciario"
                      value={businessForm.branding.theme?.tertiary ?? DEFAULT_BRAND_THEME.tertiary}
                      description="Se usa en badges informativos y alertas neutrales."
                      onChange={(next) => handleThemeColorChange("tertiary", next)}
                    />
                  </div>
                  <ThemePreviewCard />
                </SectionCard>

                <div className="pt-4 flex items-center gap-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={loading || profileSave.isSaving}
                  className={`rounded-xl border px-5 py-2.5 text-xs font-semibold text-slate-950 transition ${
                    profileSave.isSaving
                      ? "border-indigo-200/60 bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 opacity-70 cursor-not-allowed"
                      : profileSave.isSuccess
                        ? "border-emerald-300/70 bg-gradient-to-r from-emerald-400 via-sky-300 to-indigo-400 shadow-[0_12px_40px_-18px_rgba(16,185,129,0.8)] scale-[1.01]"
                        : "border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 shadow-[0_10px_40px_-20px_rgba(59,130,246,0.9)] hover:translate-y-[-2px] hover:shadow-[0_15px_50px_-18px_rgba(59,130,246,0.9)]"
                  }`}
                >
                  {profileSave.isSaving
                    ? "Guardando..."
                    : profileSave.isSuccess
                      ? "Guardado"
                      : "Guardar perfil"}
                </button>
                <SaveStatusBadge status={profileSave.status} />
              </div>
            </NeonCard>
          ) : null}
          {section === "staff" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr] items-start">
              <NeonCard className="p-4 h-fit">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Equipo</p>
                    <h3 className="text-lg font-semibold text-white">Staff asignable</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addStaff}
                    className="rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
                  >
                    Nuevo
                  </button>
                </div>
                <div className="mt-4 space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {staffList.length === 0 ? (
                    <p className="text-sm text-slate-300">Sin staff registrado.</p>
                  ) : (
                    staffList.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedStaffId(member.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                          selectedStaff?.id === member.id
                            ? "bg-indigo-400/20 text-indigo-50 ring-1 ring-indigo-300/30"
                            : "text-slate-200 hover:bg-white/5"
                        }`}
                        type="button"
                      >
                        <div className="flex flex-col text-left">
                          <span className="font-semibold">{member.name || "Sin nombre"}</span>
                          <span className="text-[11px] text-slate-400">
                            {member.role || "Rol no definido"}
                          </span>
                        </div>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            member.active !== false ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                        />
                      </button>
                    ))
                  )}
                </div>
              </NeonCard>

              <NeonCard className="space-y-4 p-5">
                {selectedStaff ? (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex-1 text-sm font-semibold text-slate-100">
                        Nombre
                        <input
                          type="text"
                          value={selectedStaff.name}
                          onChange={(e) =>
                            updateStaff(selectedStaff.id, (current) => ({
                              ...current,
                              name: e.target.value,
                            }))
                          }
                          disabled={isStaffDisabled}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                        />
                      </label>
                      <label className="flex-1 text-sm font-semibold text-slate-100">
                        Rol
                        <input
                          type="text"
                          value={selectedStaff.role}
                          disabled={isStaffDisabled}
                          onChange={(e) =>
                            updateStaff(selectedStaff.id, (current) => ({
                              ...current,
                              role: e.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                        />
                      </label>
                      <label className="flex-1 text-sm font-semibold text-slate-100">
                        Telefono
                        <input
                          type="text"
                          value={selectedStaff.phone}
                          disabled={isStaffDisabled}
                          onChange={(e) =>
                            updateStaff(selectedStaff.id, (current) => ({
                              ...current,
                              phone: e.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <ToggleChip
                        checked={selectedStaff.active !== false}
                        onChange={(next) =>
                          updateStaff(selectedStaff.id, (current) => ({
                            ...current,
                            active: next,
                          }))
                        }
                        label="Activo"
                      />
                      <p className="text-[11px] text-slate-400 max-w-md text-center sm:text-left sm:ml-3">
                        {selectedStaff.active === false
                          ? "Cuando esta inactivo no se configura ni se asigna a nuevas reservas. Los datos se conservan."
                          : "Activo: puede configurarse y asignarse a reservas."}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(selectedStaff)}
                        className="rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-1 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/30"
                      >
                        Eliminar
                      </button>
                    </div>

                    <SectionCard
                      subtitle="Horario general"
                      description="El horario general se usa si no configuras horario por dia. Activa el toggle para usar el horario del negocio."
                      actions={
                        <ToggleChip
                          checked={selectedStaff.schedule?.useBusinessHours === true}
                          onChange={handleToggleUseBusinessHours}
                          label="Usar horario del negocio"
                          disabled={isStaffDisabled}
                        />
                      }
                    >
                      <p className="text-[11px] text-slate-400">
                        {selectedStaff.schedule?.useBusinessHours
                          ? "Usando horario del negocio (horarios personalizados se conservan)."
                          : "Configura horario propio para este empleado."}
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <TimeInput
                          label="Hora inicio"
                          value={
                            selectedStaff.schedule?.useBusinessHours === true
                              ? businessHours.open
                              : selectedStaff.hours?.open ?? ""
                          }
                          disabled={selectedStaff.schedule?.useBusinessHours === true || isStaffDisabled}
                          onChange={(val) =>
                            updateStaff(selectedStaff.id, (current) => ({
                              ...current,
                              hours: {
                                ...(current.hours ?? {}),
                                open: val,
                                close: current.hours?.close ?? businessHours.close,
                                slotMinutes: current.hours?.slotMinutes ?? businessHours.slotMinutes,
                              },
                            }))
                          }
                        />
                        <TimeInput
                          label="Hora fin"
                          value={
                            selectedStaff.schedule?.useBusinessHours === true
                              ? businessHours.close
                              : selectedStaff.hours?.close ?? ""
                          }
                          disabled={selectedStaff.schedule?.useBusinessHours === true || isStaffDisabled}
                          onChange={(val) =>
                            updateStaff(selectedStaff.id, (current) => ({
                              ...current,
                              hours: {
                                ...(current.hours ?? {}),
                                close: val,
                                open: current.hours?.open ?? businessHours.open,
                                slotMinutes: current.hours?.slotMinutes ?? businessHours.slotMinutes,
                              },
                            }))
                          }
                        />
                      </div>
                      {selectedStaff.schedule?.useBusinessHours ? (
                        <p className="text-[11px] text-emerald-200">
                          Horario del negocio aplicado: {businessHours.open} - {businessHours.close}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          El horario por dia, si existe, tendra prioridad sobre este general.
                        </p>
                      )}
                    </SectionCard>

                    <SectionCard
                      subtitle="Horario por dia"
                      description="El horario del dia tiene prioridad sobre el general. Si no existe, se usa el horario del empleado o el del negocio."
                    >
                      {selectedStaff.schedule?.useBusinessHours ? (
                        <p className="text-[11px] text-slate-400">
                          Este empleado esta usando el horario del negocio. Desactiva el toggle para personalizar sus dias y horas. Los datos personalizados se conservan.
                        </p>
                      ) : null}

                      <div
                        className={`space-y-2 ${selectedStaff.schedule?.useBusinessHours || isStaffDisabled ? "pointer-events-none opacity-60 blur-[0.2px]" : ""}`}
                      >
                        {DAY_LABELS.map((label, idx) => {
                          const dayKey = idx as DayOfWeek;
                          const dayEntry = selectedStaff.schedule?.days?.find((d) => d.day === dayKey);
                          const checked = Boolean(dayEntry);
                          return (
                            <div
                              key={label}
                              className="grid grid-cols-1 items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:grid-cols-[120px_1fr]"
                            >
                              <div className="flex items-center gap-2">
                                <ToggleChip
                                  checked={checked}
                                  onChange={(next) => handleToggleDay(dayKey, next)}
                                  label={label}
                                  compact
                                />
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <TimeInput
                                  size="sm"
                                  label="Hora inicio"
                                  disabled={!checked || isStaffDisabled}
                                  value={dayEntry?.open ?? ""}
                                  onChange={(val) =>
                                    updateStaff(selectedStaff.id, (current) =>
                                      upsertDay(current, dayKey, { open: val }),
                                    )
                                  }
                                />
                                <TimeInput
                                  size="sm"
                                  label="Hora fin"
                                  disabled={!checked || isStaffDisabled}
                                  value={dayEntry?.close ?? ""}
                                  onChange={(val) =>
                                    updateStaff(selectedStaff.id, (current) =>
                                      upsertDay(current, dayKey, { close: val }),
                                    )
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </SectionCard>
                  </>
                ) : (
                  <p className="text-sm text-slate-300">Selecciona o crea un miembro de staff.</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={loading || profileSave.isSaving}
                    className={`rounded-xl border px-5 py-2.5 text-xs font-semibold text-slate-950 transition ${
                      profileSave.isSaving
                        ? "border-indigo-200/60 bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 opacity-70 cursor-not-allowed"
                        : profileSave.isSuccess
                          ? "border-emerald-300/70 bg-gradient-to-r from-emerald-400 via-sky-300 to-indigo-400 shadow-[0_12px_40px_-18px_rgba(16,185,129,0.8)] scale-[1.01]"
                          : "border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 shadow-[0_10px_40px_-20px_rgba(59,130,246,0.9)] hover:translate-y-[-2px] hover:shadow-[0_15px_50px_-18px_rgba(59,130,246,0.9)]"
                    }`}
                  >
                    {profileSave.isSaving
                      ? "Guardando..."
                    : profileSave.isSuccess
                      ? "Guardado"
                      : "Guardar cambios"}
                  </button>
                  <SaveStatusBadge status={profileSave.status} />
                </div>
              </NeonCard>
            </div>
          ) : null}
          {section === "services" ? (
            <NeonCard className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Catalogo</p>
                  <h2 className="text-xl font-semibold text-white">Servicios del negocio</h2>
                  <p className="text-sm text-slate-300">
                    Configura los servicios que ofreces, su precio y disponibilidad.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetServiceDraft();
                    setEditingServiceId(null);
                  }}
                  className="rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
                >
                  Nuevo servicio
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 items-start">
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {services.length === 0 ? (
                    <p className="text-sm text-slate-300">Aun no tienes servicios configurados.</p>
                  ) : (
                    services.map((svc) => (
                      <div
                        key={svc.id}
                        className="rounded-xl border border-white/10 bg-slate-900/60 p-4 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{svc.name}</p>
                            <p className="text-xs text-slate-300">
                              {currency.format(Number.isNaN(Number(svc.price)) ? 0 : Number(svc.price))}
                              {svc.durationMinutes ? ` · ${svc.durationMinutes} min` : ""}
                            </p>
                          </div>
                          <ToggleChip
                            checked={svc.active !== false}
                            onChange={(next) =>
                              setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, active: next } : s)))
                            }
                            label="Activo"
                          />
                        </div>
                        {svc.description ? (
                          <p className="text-xs text-slate-300 line-clamp-2">{svc.description}</p>
                        ) : null}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-white hover:bg-white/15"
                            onClick={() => {
                              setServiceDraft(svc);
                              setEditingServiceId(svc.id);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-1 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/30"
                            onClick={() => handleDeleteService(svc)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <NeonCard className="rounded-xl border-white/10 bg-slate-900/70 p-4 space-y-3">
                  <p className="text-sm font-semibold text-white">
                    {editingServiceId ? "Editar servicio" : "Nuevo servicio"}
                  </p>
                  <label className="text-sm font-semibold text-slate-100">
                    Nombre
                    <input
                      type="text"
                      value={serviceDraft.name}
                      onChange={(e) => setServiceDraft((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-100">
                    Precio (COP)
                    <input
                      type="number"
                      min={0}
                      value={serviceDraft.price}
                      onChange={(e) =>
                        setServiceDraft((prev) => ({
                          ...prev,
                          price: Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-100">
                    Duracion (min, opcional)
                    <input
                      type="number"
                      min={0}
                      value={serviceDraft.durationMinutes ?? ""}
                      onChange={(e) =>
                        setServiceDraft((prev) => ({
                          ...prev,
                          durationMinutes: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-100">
                    Descripcion (opcional)
                    <textarea
                      value={serviceDraft.description ?? ""}
                      onChange={(e) =>
                        setServiceDraft((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                      rows={3}
                    />
                  </label>
                  <ToggleChip
                    checked={serviceDraft.active !== false}
                    onChange={(next) => setServiceDraft((prev) => ({ ...prev, active: next }))}
                    label="Activo"
                  />

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveServiceDraft}
                      className="rounded-xl border border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_10px_40px_-20px_rgba(59,130,246,0.9)] transition hover:translate-y-[-2px] hover:shadow-[0_15px_50px_-18px_rgba(59,130,246,0.9)]"
                    >
                      {editingServiceId ? "Guardar servicio" : "Agregar servicio"}
                    </button>
                    {editingServiceId ? (
                      <button
                        type="button"
                        onClick={resetServiceDraft}
                        className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/15"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </NeonCard>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={loading || profileSave.isSaving}
                  className={`rounded-xl border px-5 py-2.5 text-xs font-semibold text-slate-950 transition ${
                    profileSave.isSaving
                      ? "border-indigo-200/60 bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 opacity-70 cursor-not-allowed"
                      : profileSave.isSuccess
                        ? "border-emerald-300/70 bg-gradient-to-r from-emerald-400 via-sky-300 to-indigo-400 shadow-[0_12px_40px_-18px_rgba(16,185,129,0.8)] scale-[1.01]"
                        : "border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 shadow-[0_10px_40px_-20px_rgba(59,130,246,0.9)] hover:translate-y-[-2px] hover:shadow-[0_15px_50px_-18px_rgba(59,130,246,0.9)]"
                  }`}
                >
                  {profileSave.isSaving
                    ? "Guardando..."
                    : profileSave.isSuccess
                      ? "Guardado"
                      : "Guardar servicios"}
                </button>
                <SaveStatusBadge status={profileSave.status} />
              </div>
            </NeonCard>
          ) : null}
        </section>
      </main>
      <ConfirmDeleteDialog
        open={deleteDialog.open}
        title={deleteDialog.title}
        description={deleteDialog.description}
        detail={deleteDialog.detail}
        loading={deleteDialog.loading}
        onClose={() => setDeleteDialog({ open: false, title: "", description: "" })}
        onConfirm={async () => {
          setDeleteDialog((prev) => ({ ...prev, loading: true }));
          await deleteDialog.onConfirm?.();
        }}
      />
    </div>
  );
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

