
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
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";
import ThemePreviewCard from "../components/ThemePreviewCard";
import SidebarItem from "../components/SidebarItem";
import { useSaveStatus } from "../hooks/useSaveStatus";
import ClientsModule from "../components/modules/ClientsModule";
import { FormContainer, FormSection, FormRow, FormField, Input, Button, TimeInput } from "../components/ui/FormLayout";
import { ListCard, ListItem, ListHeader } from "../components/ui/ListLayout";
import { Toast } from "../components/ui/Toast";
import ServiceCard from "../components/ServiceCard";
import { BusinessLogo } from "../components/BusinessLogo";
import { PhoneInput } from "../components/PhoneInput";
import { PlanBadge, PlanInfoCompact } from "../components/PlanComponents";
import { usePlanLimits } from "../hooks/usePlanLimits";

type SectionKey = "info" | "staff" | "services" | "clients" | "plan";
type BrandColorKey = "primary" | "secondary" | "tertiary";

const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
type LocalSession = { clientId: string; branding?: { businessName?: string }; email?: string; planSlug?: string };

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
        // Update session with planSlug from DB (in case it changed after login)
        if (body.data?.planSlug && body.data.planSlug !== session.planSlug) {
          const updatedSession = { ...session, planSlug: body.data.planSlug };
          setSession(updatedSession);
          localStorage.setItem("session", JSON.stringify(updatedSession));
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

  // Get plan limits for validation
  const activeStaffCount = staffList.filter((s) => s.active !== false).length;
  const planLimits = usePlanLimits(session?.planSlug, activeStaffCount);

  const addStaff = () => {
    // Check plan limits before adding
    if (!planLimits.canAddStaff) {
      setError(`Tu plan "${planLimits.plan.name}" permite máximo ${planLimits.maxStaff} empleado(s). Actualiza tu plan para agregar más.`);
      return;
    }

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
    setError(null);
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
    const updatedStaff = staffList.filter((s) => s.id !== staff.id);
    confirmDelete(
      "Eliminar miembro del staff",
      `¿Deseas eliminar a ${staff.name || "este miembro"} del staff? Sus turnos futuros podrían verse afectados.`,
      <p className="text-xs text-slate-200">Rol: {staff.role || "Sin rol"} · Tel: {staff.phone || "Sin telefono"}</p>,
      async () => {
        setDeleteDialog((prev) => ({ ...prev, loading: true }));
        setStaffList(updatedStaff);
        if (selectedStaffId === staff.id) {
          setSelectedStaffId(null);
        }
        await handleSaveProfile({ updatedStaff });
        setDeleteDialog({ open: false, title: "", description: "" });
      },
    );
  };

  const handleDeleteService = (svc: Service) => {
    const updatedServices = services.filter((s) => s.id !== svc.id);
    confirmDelete(
      "Eliminar servicio",
      `¿Quieres eliminar el servicio ${svc.name}? Ya no estará disponible para nuevas reservas.`,
      <p className="text-xs text-slate-200">Precio: {currency.format(Number(svc.price) || 0)}</p>,
      async () => {
        setDeleteDialog((prev) => ({ ...prev, loading: true }));
        setServices(updatedServices);
        await handleSaveProfile({ updatedServices });
        setDeleteDialog({ open: false, title: "", description: "" });
      },
    );
  };

  const handleSaveProfile = async (options?: {
    updatedStaff?: StaffMember[];
    updatedServices?: Service[];
  }) => {
    if (!session?.clientId) return;
    setLoading(true);
    profileSave.start();
    setError(null);

    // Use provided updated data or fall back to current state
    const staffToSave = options?.updatedStaff ?? staffList;
    const servicesToSave = options?.updatedServices ?? services;

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

    const hasEmptyStaff = staffToSave.some(
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

    const validStaff = staffToSave.map((member) => {
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

    const servicesPayload = servicesToSave
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
          <BusinessLogo
            logoUrl={businessForm.branding.logoUrl}
            businessName={businessForm.branding.businessName}
            primaryColor={businessForm.branding.primaryColor}
            size="md"
          />
          <div>
            <p className="text-xs text-slate-400">Configuración</p>
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
            <p className="text-xs uppercase tracking-wide text-slate-400">Menú</p>
            <div className="mt-3 space-y-2">
              {[
                { key: "info" as SectionKey, label: "Información del negocio" },
                { key: "staff" as SectionKey, label: "Staff asignable" },
                { key: "services" as SectionKey, label: "Servicios" },
                { key: "clients" as SectionKey, label: "Base de datos de clientes" },
                { key: "plan" as SectionKey, label: "Plan y límites" },
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
            {/* Plan info compact */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <PlanInfoCompact
                planSlug={session?.planSlug}
                staffCount={activeStaffCount}
              />
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
                  <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-200/70">Configuración</p>
                  <p className="mt-1 text-2xl font-semibold text-white">Editar información del negocio</p>
                </div>
                <BusinessLogo
                  logoUrl={businessForm.branding.logoUrl}
                  businessName={businessForm.branding.businessName}
                  primaryColor={businessForm.branding.primaryColor}
                  size="lg"
                  className="shadow-lg shadow-indigo-500/20"
                />
              </div>
              <FormContainer>
                <FormSection title="Datos básicos">
                  <FormField label="Nombre del negocio">
                    <Input
                      value={businessForm.branding.businessName}
                      onChange={(e) =>
                        setBusinessForm((prev) => ({
                          ...prev,
                          branding: { ...prev.branding, businessName: e.target.value },
                        }))
                      }
                    />
                  </FormField>

                  <FormField label="Logo URL">
                    <Input
                      type="url"
                      value={businessForm.branding.logoUrl ?? ""}
                      onChange={(e) =>
                        setBusinessForm((prev) => ({
                          ...prev,
                          branding: { ...prev.branding, logoUrl: e.target.value },
                        }))
                      }
                      placeholder="https://..."
                    />
                  </FormField>
                </FormSection>

                <FormSection
                  title="Horario por día"
                  description="Si no configuras horario por día, se usa el horario general del negocio. El horario del día tiene prioridad."
                >
                  <div className="space-y-3">
                    {businessWeek.map((day) => {
                      const label = DAY_LABELS[day.day] ?? `Dia ${day.day + 1}`;
                      const active = day.active !== false;
                      return (
                        <div
                          key={day.day}
                          className="grid grid-cols-1 items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-4 sm:grid-cols-[140px_1fr]"
                        >
                          <ToggleChip
                            checked={active}
                            onChange={(next) => handleBusinessDayToggle(day.day as DayOfWeek, next)}
                            label={label}
                            compact
                          />
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                </FormSection>

                <FormSection
                  title="Identidad visual"
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

                  <div className="mt-6 border-t border-white/10 pt-4 lg:col-span-3">
                    <p className="text-sm font-semibold text-white mb-4">Efectos visuales</p>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3">
                        <div>
                          <p className="text-sm text-slate-200">Efecto espejo (Glassmorphism)</p>
                          <p className="text-xs text-slate-400">Activa el brillo y desenfoque en las tarjetas.</p>
                        </div>
                        <ToggleChip
                          checked={businessForm.branding.theme?.cardMirrorEnabled ?? false}
                          onChange={(checked) => {
                            setBusinessForm(prev => ({
                              ...prev,
                              branding: {
                                ...prev.branding,
                                theme: { ...(prev.branding.theme ?? DEFAULT_BRAND_THEME), cardMirrorEnabled: checked }
                              }
                            }));
                            setColors({ cardMirrorEnabled: checked });
                          }}
                        />
                      </div>

                      {(businessForm.branding.theme?.cardMirrorEnabled ?? false) && (
                        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                          <div className="flex justify-between text-xs text-slate-300 mb-2">
                            <span>Intensidad del efecto</span>
                            <span>{businessForm.branding.theme?.cardMirrorIntensity ?? 50}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={businessForm.branding.theme?.cardMirrorIntensity ?? 50}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setBusinessForm(prev => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  theme: { ...(prev.branding.theme ?? DEFAULT_BRAND_THEME), cardMirrorIntensity: val }
                                }
                              }));
                              setColors({ cardMirrorIntensity: val });
                            }}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                </FormSection>
              </FormContainer>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  onClick={() => handleSaveProfile()}
                  isLoading={loading || profileSave.isSaving}
                  disabled={loading || profileSave.isSaving}
                >
                  Guardar perfil
                </Button>
                <Toast status={profileSave.status} />
              </div>
            </NeonCard>
          ) : null}
          {section === "staff" ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] items-start">
              <NeonCard className="p-4 h-fit sticky top-4">
                <ListHeader
                  title="Staff asignable"
                  action={
                    <Button variant="secondary" onClick={addStaff} className="text-xs px-3 py-1.5">
                      Nuevo
                    </Button>
                  }
                />
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                  {staffList.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Sin staff registrado.</p>
                  ) : (
                    staffList.map((member) => (
                      <ListItem
                        key={member.id}
                        onClick={() => setSelectedStaffId(member.id)}
                        className={selectedStaff?.id === member.id ? "!border-indigo-500/50 !bg-indigo-500/10" : ""}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{member.name || "Sin nombre"}</p>
                            <p className="text-xs text-slate-400">{member.role || "Rol no definido"}</p>
                          </div>
                          <div
                            className={`h-2 w-2 rounded-full ${member.active !== false ? "bg-emerald-400" : "bg-rose-400"}`}
                          />
                        </div>
                      </ListItem>
                    ))
                  )}
                </div>
              </NeonCard>

              <NeonCard className="p-6">
                {selectedStaff ? (
                  <FormContainer>
                    <FormSection title="Detalles del empleado">
                      <FormRow cols={2}>
                        <FormField label="Nombre">
                          <Input
                            value={selectedStaff.name}
                            onChange={(e) =>
                              updateStaff(selectedStaff.id, (current) => ({
                                ...current,
                                name: e.target.value,
                              }))
                            }
                            disabled={isStaffDisabled}
                          />
                        </FormField>
                        <FormField label="Rol">
                          <Input
                            value={selectedStaff.role}
                            disabled={isStaffDisabled}
                            onChange={(e) =>
                              updateStaff(selectedStaff.id, (current) => ({
                                ...current,
                                role: e.target.value,
                              }))
                            }
                          />
                        </FormField>
                      </FormRow>
                      <FormRow>
                        <FormField label="Teléfono">
                          <PhoneInput
                            value={selectedStaff.phone}
                            disabled={isStaffDisabled}
                            onChange={(phone) =>
                              updateStaff(selectedStaff.id, (current) => ({
                                ...current,
                                phone,
                              }))
                            }
                            defaultCountry="CO"
                            placeholder="300 123 4567"
                          />
                        </FormField>
                      </FormRow>

                      {/* Service Assignment Section */}
                      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-white">Servicios que puede realizar</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {!selectedStaff.serviceIds || selectedStaff.serviceIds.length === 0
                                ? "Sin restricciones - puede realizar todos los servicios"
                                : `${selectedStaff.serviceIds.length} servicio(s) asignado(s)`}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                            onClick={() =>
                              updateStaff(selectedStaff.id, (current) => ({
                                ...current,
                                serviceIds: undefined,
                              }))
                            }
                          >
                            Permitir todos
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                          {services.map((svc) => {
                            const isSelected = selectedStaff.serviceIds?.includes(svc.id) ?? false;
                            const noRestrictions = !selectedStaff.serviceIds || selectedStaff.serviceIds.length === 0;
                            return (
                              <label
                                key={svc.id}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${isSelected
                                  ? "border-indigo-500 bg-indigo-500/20 text-white"
                                  : noRestrictions
                                    ? "border-white/10 bg-white/5 text-slate-300 opacity-50"
                                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                                  }`}
                              >
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    updateStaff(selectedStaff.id, (current) => {
                                      const currentIds = current.serviceIds ?? [];
                                      if (e.target.checked) {
                                        return { ...current, serviceIds: [...currentIds, svc.id] };
                                      } else {
                                        const filtered = currentIds.filter((id) => id !== svc.id);
                                        return { ...current, serviceIds: filtered.length > 0 ? filtered : undefined };
                                      }
                                    });
                                  }}
                                />
                                <span className="text-xs truncate">{svc.name}</span>
                              </label>
                            );
                          })}
                        </div>
                        {services.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-4">
                            No hay servicios configurados. Agrega servicios primero.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                        <div className="flex items-center gap-4">
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
                          <p className="text-xs text-slate-400">
                            {selectedStaff.active === false
                              ? "Inactivo: no se asigna a nuevas reservas."
                              : "Activo: disponible para reservas."}
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          onClick={() => handleDeleteStaff(selectedStaff)}
                          className="text-xs px-3 py-1.5"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </FormSection>

                    <FormSection
                      title="Horario general"
                      description="Se usa si no hay horario específico por día."
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-slate-400">
                          {selectedStaff.schedule?.useBusinessHours
                            ? "Usando horario del negocio."
                            : "Horario personalizado."}
                        </p>
                        <ToggleChip
                          checked={selectedStaff.schedule?.useBusinessHours === true}
                          onChange={handleToggleUseBusinessHours}
                          label="Usar horario del negocio"
                          disabled={isStaffDisabled}
                        />
                      </div>

                      <FormRow cols={2}>
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
                      </FormRow>
                    </FormSection>

                    <FormSection
                      title="Horario por día"
                      description="Prioridad sobre el horario general."
                    >
                      {selectedStaff.schedule?.useBusinessHours && (
                        <p className="text-xs text-slate-400 mb-4">
                          Desactiva "Usar horario del negocio" para editar días específicos.
                        </p>
                      )}

                      <div
                        className={`space-y-3 ${selectedStaff.schedule?.useBusinessHours || isStaffDisabled ? "pointer-events-none opacity-50" : ""}`}
                      >
                        {DAY_LABELS.map((label, idx) => {
                          const dayKey = idx as DayOfWeek;
                          const dayEntry = selectedStaff.schedule?.days?.find((d) => d.day === dayKey);
                          const checked = Boolean(dayEntry);
                          return (
                            <div
                              key={label}
                              className="grid grid-cols-1 items-center gap-4 rounded-xl border border-white/5 bg-white/5 p-4 sm:grid-cols-[140px_1fr]"
                            >
                              <ToggleChip
                                checked={checked}
                                onChange={(next) => handleToggleDay(dayKey, next)}
                                label={label}
                                compact
                              />
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    </FormSection>
                  </FormContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <p>Selecciona un miembro del staff para editar.</p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button
                    onClick={() => handleSaveProfile()}
                    isLoading={loading || profileSave.isSaving}
                    disabled={loading || profileSave.isSaving}
                  >
                    Guardar cambios
                  </Button>
                  <Toast status={profileSave.status} />
                </div>
              </NeonCard>
            </div>
          ) : null}
          {section === "services" ? (
            <NeonCard className="p-6 space-y-6">
              <ListHeader
                title="Servicios del negocio"
                description="Configura los servicios que ofreces, su precio y disponibilidad."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      resetServiceDraft();
                      setEditingServiceId(null);
                    }}
                    className="text-xs px-3 py-1.5"
                  >
                    Nuevo servicio
                  </Button>
                }
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
                  {services.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">Aún no tienes servicios configurados.</p>
                  ) : (
                    services.map((svc) => (
                      <ServiceCard
                        key={svc.id}
                        service={svc}
                        onEdit={() => {
                          setServiceDraft(svc);
                          setEditingServiceId(svc.id);
                        }}
                        onDelete={() => handleDeleteService(svc)}
                        onToggleActive={(next) =>
                          setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, active: next } : s)))
                        }
                      />
                    ))
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-inner shadow-black/20">
                  <h3 className="text-sm font-semibold text-white mb-4">
                    {editingServiceId ? "Editar servicio" : "Nuevo servicio"}
                  </h3>
                  <div className="space-y-4">
                    <FormField label="Nombre del servicio" required>
                      <Input
                        value={serviceDraft.name}
                        onChange={(e) => setServiceDraft({ ...serviceDraft, name: e.target.value })}
                        placeholder="Ej. Corte de cabello"
                      />
                    </FormField>

                    <FormRow cols={2}>
                      <FormField label="Precio">
                        <Input
                          type="number"
                          min={0}
                          value={serviceDraft.price || ""}
                          onChange={(e) => setServiceDraft({ ...serviceDraft, price: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </FormField>
                      <FormField label="Duración (min)">
                        <Input
                          type="number"
                          min={5}
                          value={serviceDraft.durationMinutes ?? ""}
                          onChange={(e) =>
                            setServiceDraft({ ...serviceDraft, durationMinutes: Number(e.target.value) || undefined })
                          }
                          placeholder="Opcional"
                        />
                      </FormField>
                    </FormRow>

                    <FormField label="Descripción">
                      <textarea
                        value={serviceDraft.description ?? ""}
                        onChange={(e) => setServiceDraft({ ...serviceDraft, description: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        rows={3}
                        placeholder="Detalles del servicio..."
                      />
                    </FormField>

                    <div className="flex items-center gap-3 pt-2">
                      <Button onClick={handleSaveServiceDraft} className="flex-1">
                        {editingServiceId ? "Actualizar" : "Crear servicio"}
                      </Button>
                      {editingServiceId && (
                        <Button variant="ghost" onClick={resetServiceDraft}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  onClick={() => handleSaveProfile()}
                  isLoading={loading || profileSave.isSaving}
                  disabled={loading || profileSave.isSaving}
                >
                  Guardar cambios
                </Button>
                <Toast status={profileSave.status} />
              </div>
            </NeonCard>
          ) : section === "clients" ? (
            <ClientsModule clientId={session.clientId} />
          ) : section === "plan" ? (
            <div className="space-y-6">
              <NeonCard className="p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-200/70">Tu suscripción</p>
                <p className="mt-1 text-2xl font-semibold text-white">Plan y límites</p>
                <p className="mt-2 text-sm text-slate-400">
                  Revisa tu plan actual y los límites de empleados. Actualiza tu plan para agregar más empleados.
                </p>

                <div className="mt-6">
                  <PlanBadge
                    planSlug={session.planSlug}
                    staffCount={activeStaffCount}
                    showUpgrade={true}
                  />
                </div>

                <div className="mt-6 p-4 rounded-xl border border-white/10 bg-white/5">
                  <h3 className="text-sm font-semibold text-white mb-3">Características de tu plan</h3>
                  <ul className="space-y-2">
                    {planLimits.plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className={`flex items-center gap-2 text-sm ${feature.included ? "text-slate-200" : "text-slate-500 line-through"
                          }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full ${feature.included ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700"
                            }`}
                        >
                          {feature.included ? "✓" : "–"}
                        </span>
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </NeonCard>

              <NeonCard className="p-6">
                <p className="text-sm font-semibold text-white mb-2">¿Necesitas más empleados?</p>
                <p className="text-sm text-slate-400 mb-4">
                  Contacta a nuestro equipo para actualizar tu plan y agregar más empleados a tu cuenta.
                </p>
                <a
                  href="https://wa.me/573001234567?text=Hola,%20quiero%20actualizar%20mi%20plan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Contactar por WhatsApp
                </a>
              </NeonCard>
            </div>
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
    </div >
  );
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

