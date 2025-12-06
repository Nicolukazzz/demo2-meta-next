"use client";


import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Branding as BusinessBranding,
  BusinessFeatures,
  BusinessProfile,
  StaffMember,
  DEFAULT_HOURS,
  DEFAULT_PROFILE,
  Hours,
  getEffectiveBusinessHoursForDate,
} from "@/lib/businessProfile";
import { formatDateDisplay } from "@/lib/dateFormat";
import { uiText } from "@/lib/uiText";
import NeonCard from "./components/NeonCard";
import { SaveFeedback } from "./components/SaveFeedback";
import { useSaveStatus } from "./hooks/useSaveStatus";

type ReservationStatus = "Pendiente" | "Confirmada" | "Cancelada" | string;

type Reservation = {
  _id: string;
  dateId: string;
  time: string;
  name: string;
  phone: string;
  serviceName: string;
  status: ReservationStatus;
  createdAt?: string;
  updatedAt?: string;
  staffId?: string;
  staffName?: string;
};

type Customer = {
  _id: string;
  clientId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  lastReservationAt?: string;
};

type UserSessionFeatures = BusinessFeatures;
type UserSessionBranding = BusinessBranding;

type UserSession = {
  email: string;
  clientId: string;
  branding: UserSessionBranding;
  businessType: "reservas" | "ventas" | "mixto";
  features: UserSessionFeatures;
  staff?: StaffMember[];
  hours?: Hours;
};

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function buildSlots(hours?: { open: string; close: string; slotMinutes: number } | null) {
  if (!hours) return [];
  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const start = toMinutes(hours.open);
  const end = toMinutes(hours.close);
  const step = hours.slotMinutes || DEFAULT_HOURS.slotMinutes;
  const slots: string[] = [];
  for (let t = start; t <= end; t += step) {
    const h = Math.floor(t / 60)
      .toString()
      .padStart(2, "0");
    const m = (t % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

const statusStyles: Record<string, string> = {
  Confirmada: "border-emerald-400/40 bg-emerald-400/15 text-emerald-100",
  Pendiente: "border-amber-400/40 bg-amber-400/15 text-amber-100",
  Cancelada: "border-rose-400/40 bg-rose-400/15 text-rose-100",
};

export default function Home() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<
    "idle" | "loading" | "loaded" | "fallback" | "error"
  >("idle");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"dashboard" | "reservas" | "info" | "clientes">(
    "reservas",
  );
  const [confirmData, setConfirmData] = useState<{ message: string; onConfirm: () => void } | null>(
    null,
  );
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const customerSave = useSaveStatus();
  const [customerFormError, setCustomerFormError] = useState<string | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loginSpot, setLoginSpot] = useState({ x: 240, y: 160 });
  const [createForm, setCreateForm] = useState({
    dateId: formatDateKey(new Date()),
    time: "10:00",
    name: "",
    phone: "",
    serviceName: "",
    staffId: "",
    staffName: "",
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const reservationsRef = useRef<HTMLDivElement | null>(null);
  const businessRef = useRef<HTMLDivElement | null>(null);

  const handleNavClick = (key: string) => {
    setActiveSection(key as any);
    setIsNavOpen(false);
  };

  const openCreateForSlot = (day: Date, slot: string) => {
    setSelectedDate(day);
    setSelectedReservation(null);
    setIsEditMode(false);
    setCreateForm((prev) => ({
      ...prev,
      dateId: formatDateKey(day),
      time: slot,
      name: "",
      phone: "",
      serviceName: "",
      staffId: "",
      staffName: "",
    }));
    setActionError(null);
    setIsCreateModal(true);
  };

  const clientProfile = useMemo<BusinessProfile>(() => {
    if (profile) {
      const profileFeatures = profile.features ?? DEFAULT_PROFILE.features;
      const profileHours =
        profile.hours ?? (profileFeatures.reservations ? DEFAULT_HOURS : undefined);
      return {
        ...DEFAULT_PROFILE,
        ...profile,
        branding: profile.branding ?? DEFAULT_PROFILE.branding,
        features: profileFeatures,
        hours: profileHours,
        staff: profile.staff ?? [],
      };
    }
    if (session) {
      const sessionFeatures = session.features ?? DEFAULT_PROFILE.features;
      const sessionHours =
        session.hours ?? (sessionFeatures.reservations ? DEFAULT_HOURS : undefined);
      return {
        ...DEFAULT_PROFILE,
        clientId: session.clientId,
        branding: session.branding,
        businessType: session.businessType,
        features: sessionFeatures,
        hours: sessionHours,
        staff: session.staff ?? [],
      };
    }
    return DEFAULT_PROFILE;
  }, [profile, session]);

  const activeStaff = useMemo(
    () => (clientProfile.staff ?? []).filter((member) => member.active !== false),
    [clientProfile.staff],
  );
  const businessHours = clientProfile.hours ?? DEFAULT_HOURS;
  const sectionItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "reservas", label: "Reservas" },
    { key: "clientes", label: "Clientes" },
    { key: "info", label: "Sitio Web" },
  ];

  const reservationsByDate = useMemo(() => {
    return reservations.reduce<Record<string, Reservation[]>>((acc, item) => {
      if (!item.dateId) return acc;
      acc[item.dateId] = acc[item.dateId] ? [...acc[item.dateId], item] : [item];
      return acc;
    }, {});
  }, [reservations]);

  const metrics = useMemo(() => {
    const confirmed = reservations.filter((r) => r.status === "Confirmada").length;
    const pending = reservations.filter((r) => r.status === "Pendiente").length;
    const nextDate = reservations
      .map((r) => r.dateId)
      .filter(Boolean)
      .sort((a, b) => (a > b ? 1 : -1))[0];
    return { total: reservations.length, confirmed, pending, nextDate };
  }, [reservations]);

  const upcoming24h = useMemo(() => {
    const now = new Date();
    const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return reservations.filter((r) => {
      if (!r.dateId || !r.time) return false;
      const dt = new Date(`${r.dateId}T${r.time}:00`);
      return dt >= now && dt <= limit;
    }).length;
  }, [reservations]);

  const weekReservationsCount = useMemo(() => {
    const start = startOfWeek(viewDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return reservations.filter((r) => {
      if (!r.dateId) return false;
      const dt = new Date(`${r.dateId}T00:00:00`);
      return dt >= start && dt < end;
    }).length;
  }, [reservations, viewDate]);

  const weekStart = useMemo(() => startOfWeek(viewDate), [viewDate]);
  const todayStart = useMemo(() => startOfWeek(new Date()), []);
  const isCurrentWeek = weekStart.getTime() === todayStart.getTime();
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + idx);
      return d;
    });
  }, [weekStart]);

  const weekDayHours = useMemo(
    () =>
      weekDays.map((day) => ({
        date: day,
        key: formatDateKey(day),
        hours: getEffectiveBusinessHoursForDate(day, businessHours),
      })),
    [businessHours, weekDays],
  );

  const daySlotsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    weekDayHours.forEach(({ key, hours }) => {
      map[key] = buildSlots(hours ?? null);
    });
    return map;
  }, [weekDayHours]);

  const weeklySlots = useMemo(() => {
    const set = new Set<string>();
    Object.values(daySlotsMap).forEach((slots) => slots.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [daySlotsMap]);

  const selectedKey = formatDateKey(selectedDate);
  const reservationsForDay = reservationsByDate[selectedKey] ?? [];
  const effectiveSelectedHours =
    weekDayHours.find((d) => d.key === selectedKey)?.hours ??
    getEffectiveBusinessHoursForDate(selectedDate, businessHours);
  const daySlots = daySlotsMap[selectedKey] ?? [];
  const scheduleHours = effectiveSelectedHours ?? businessHours;
  const isSelectedDayClosed = !effectiveSelectedHours;

  const dayFormatter = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? "Credenciales invalidas");
      }
      setSession(body.session as UserSession);
      if (typeof window !== "undefined") {
        localStorage.setItem("session", JSON.stringify(body.session));
      }
      setIsNavOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Error de autenticacion");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("session");
    if (stored && !session) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
      } catch {
        localStorage.removeItem("session");
      }
    }
  }, [session]);

  const loadProfile = useCallback(async (clientId: string) => {
    setProfileLoading(true);
    setProfileStatus("loading");
    setProfileError(null);
    try {
      const res = await fetch(`/api/profile?clientId=${encodeURIComponent(clientId)}`);
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.data) {
        throw new Error(body?.error ?? "No se pudo obtener el perfil");
      }
      setProfile(body.data as BusinessProfile);
      setProfileStatus("loaded");
    } catch (err: any) {
      console.error(err);
      setProfileError(err?.message ?? "Error cargando perfil");
      setProfile(null);
      setProfileStatus("error");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.clientId) {
      loadProfile(session.clientId);
    } else {
      setProfile(null);
      setProfileError(null);
      setProfileStatus("idle");
    }
  }, [loadProfile, session]);

  const fetchReservations = useCallback(
    async (silent = false) => {
      if (!session?.clientId) return;
      if (!clientProfile.features.reservations) {
        setReservations([]);
        if (!silent) {
          setLoadingData(false);
          setFetchError(null);
        }
        return;
      }
      if (!silent) {
        setLoadingData(true);
        setFetchError(null);
      }
      const makeId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      try {
        const url = `/api/reservations?clientId=${encodeURIComponent(session.clientId)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "No se pudieron obtener las reservas");
        }
        const body = await res.json();
        if (!body?.data) throw new Error("Respuesta inesperada");
        const normalized: Reservation[] = body.data.map((item: any) => ({
          _id: item._id ?? makeId(),
          dateId: item.dateId ?? "",
          time: item.time ?? "",
          name: item.name ?? "",
          phone: item.phone ?? "",
          serviceName: item.serviceName ?? "",
          status: item.status ?? "Pendiente",
          staffId: item.staffId,
          staffName: item.staffName,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
        setReservations(normalized);
      } catch (err) {
        console.error(err);
        if (!silent) setFetchError("Error consultando la base de datos");
      } finally {
        if (!silent) setLoadingData(false);
      }
    },
    [clientProfile.features.reservations, session],
  );

  const fetchCustomers = useCallback(
    async (search?: string) => {
      if (!session?.clientId) return;
      setCustomersLoading(true);
      setCustomersError(null);
      try {
        const url = `/api/customers?clientId=${encodeURIComponent(session.clientId)}${
          search ? `&q=${encodeURIComponent(search)}` : ""
        }`;
        const res = await fetch(url);
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.data) {
          throw new Error(body?.error ?? "No se pudo obtener clientes");
        }
        setCustomers(body.data as Customer[]);
      } catch (err: any) {
        setCustomersError(err?.message ?? "Error obteniendo clientes");
      } finally {
        setCustomersLoading(false);
      }
    },
    [session],
  );

  const handleCreateCustomer = useCallback(async () => {
    if (!session?.clientId) return;
    if (!customerForm.name.trim() || !customerForm.phone.trim()) {
      setCustomerFormError("Nombre y telefono son obligatorios.");
      return;
    }
    setCustomerFormError(null);
    customerSave.start();
    try {
      const payload = {
        clientId: session.clientId,
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim(),
        notes: customerForm.notes.trim(),
      };
      const res = await fetch("/api/customers", {
        method: editingCustomerId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingCustomerId
            ? {
                id: editingCustomerId,
                ...payload,
              }
            : payload,
        ),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? uiText.customers.saveError);
      }
      customerSave.success();
      setCustomerForm({ name: "", phone: "", email: "", notes: "" });
      setEditingCustomerId(null);
      fetchCustomers(customerSearch);
    } catch (err: any) {
      customerSave.error();
      setCustomerFormError(err?.message ?? uiText.customers.saveError);
    }
  }, [customerForm, customerSearch, customerSave, editingCustomerId, fetchCustomers, session]);

  useEffect(() => {
    if (!session?.clientId || !clientProfile.features.reservations) {
      setReservations([]);
      return;
    }
    fetchReservations(false);
    const interval = setInterval(() => fetchReservations(true), 15000);
    return () => clearInterval(interval);
  }, [clientProfile.features.reservations, fetchReservations, session]);

  useEffect(() => {
    if (!session?.clientId) {
      setCustomers([]);
      return;
    }
    fetchCustomers(customerSearch);
  }, [customerSearch, fetchCustomers, session]);

  const handlePrevWeek = () => {
    setViewDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setViewDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDate(today);
  };

  const isSlotTaken = (dateId: string, time: string, excludeId?: string) => {
    return reservations.some(
      (r) => r.dateId === dateId && r.time === time && (!excludeId || r._id !== excludeId),
    );
  };

  const handleCreateReservation = async () => {
    if (!session?.clientId) return;
    setActionError(null);
    const conflict = isSlotTaken(createForm.dateId, createForm.time);
    if (conflict) {
      setActionError("Ya existe una reserva en ese horario");
      return;
    }
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: session.clientId,
          ...createForm,
          status: "Confirmada",
        }),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? "No se pudo crear la reserva");
      }
      setIsCreateModal(false);
      setCreateForm((prev) => ({
        ...prev,
        name: "",
        phone: "",
        serviceName: "",
        staffId: "",
        staffName: "",
      }));
      await fetchReservations(false);
    } catch (err: any) {
      setActionError(err?.message ?? "Error creando reserva");
    }
  };

  const handleUpdateReservation = async () => {
    if (!session?.clientId || !selectedReservation) return;
    setActionError(null);
    const conflict = isSlotTaken(createForm.dateId, createForm.time, selectedReservation._id);
    if (conflict) {
      setActionError("Ya existe una reserva en ese horario");
      return;
    }
    try {
      const res = await fetch("/api/reservations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedReservation._id,
          clientId: session.clientId,
          ...createForm,
          status: selectedReservation.status ?? "Confirmada",
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? "No se pudo actualizar");
      }
      setIsCreateModal(false);
      setIsEditMode(false);
      setSelectedReservation(null);
      await fetchReservations(false);
    } catch (err: any) {
      setActionError(err?.message ?? "Error actualizando reserva");
    }
  };

  const handleDeleteReservationConfirmed = async (id: string) => {
    if (!session?.clientId) return;
    setActionError(null);
    try {
      const res = await fetch(
        `/api/reservations?id=${encodeURIComponent(id)}&clientId=${encodeURIComponent(session.clientId)}`,
        {
          method: "DELETE",
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? "No se pudo eliminar");
      }
      setSelectedReservation(null);
      await fetchReservations(false);
    } catch (err: any) {
      setActionError(err?.message ?? "Error eliminando");
    }
  };

  const handleDeleteReservation = (id: string) => {
    setConfirmData({
      message: "Eliminar esta reserva? Esta accion no se puede deshacer.",
      onConfirm: () => handleDeleteReservationConfirmed(id),
    });
  };

  const handleLogout = () => {
    setSession(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("session");
    }
  };

  if (!session) {
    return (
      <div
        className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50 flex items-center justify-center px-4"
        onMouseMove={(e) => setLoginSpot({ x: e.clientX, y: e.clientY })}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(34% 30% at ${loginSpot.x * 0.35}px ${loginSpot.y * 0.3}px, rgba(99,102,241,0.26), transparent 60%),
              radial-gradient(28% 26% at ${loginSpot.x * 0.7}px ${loginSpot.y * 0.65}px, rgba(16,185,129,0.2), transparent 60%),
              radial-gradient(40% 38% at 18% 20%, rgba(56,189,248,0.14), transparent 55%),
              linear-gradient(135deg, #0b1224 0%, #0f172a 50%, #0b1224 100%)
            `,
          }}
        />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="blob-layer blob-anim-a"></span>
          <span className="blob-layer blob-anim-b"></span>
          <span className="blob-layer blob-anim-c"></span>
        </div>
        <NeonCard className="relative w-full max-w-md p-8 shadow-2xl shadow-black/50 reveal">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-xl bg-indigo-400/20 border border-indigo-300/40">
              <img
                src={clientProfile.branding.logoUrl ?? "/default-logo.svg"}
                alt={clientProfile.branding.businessName}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm text-slate-300">Acceso seguro</p>
              <h1 className="text-xl font-semibold text-white">{clientProfile.branding.businessName}</h1>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-300">
            Ingresa con tus credenciales para ver el calendario y las reservas cargadas desde el bot
            de WhatsApp.
          </p>
          <form className="mt-6 space-y-3" onSubmit={handleLogin}>
            <div>
              <label className="text-sm text-slate-300" htmlFor="email">
                Correo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-200/30"
                placeholder="tu-correo@dominio.com"
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-300" htmlFor="password">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-200/30"
                placeholder="********"
                required
              />
            </div>
            {error ? <p className="text-sm text-rose-200">{error}</p> : null}
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-indigo-400"
            >
              Entrar
            </button>
          </form>
        </NeonCard>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          background: `
            radial-gradient(40% 32% at 12% 18%, rgba(99,102,241,0.16), transparent 55%),
            radial-gradient(36% 30% at 88% 22%, rgba(16,185,129,0.14), transparent 58%),
            radial-gradient(50% 46% at 50% 70%, rgba(56,189,248,0.12), transparent 65%)
          `,
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
        <span className="blob-layer blob-anim-a"></span>
        <span className="blob-layer blob-anim-b"></span>
        <span className="blob-layer blob-anim-c"></span>
      </div>
            <header className="flex flex-col gap-4 border-b border-white/10 bg-slate-950/80 px-4 py-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-xl border border-indigo-300/40 bg-indigo-400/20">
            <img
              src={clientProfile.branding.logoUrl ?? "/default-logo.svg"}
              alt={clientProfile.branding.businessName}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm text-slate-300">Dashboard</p>
            <h1 className="text-xl font-semibold text-white">{clientProfile.branding.businessName}</h1>
          </div>
          <button
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-lg text-white transition hover:bg-white/15 lg:hidden"
            aria-label="Abrir menu"
            onClick={() => setIsNavOpen(true)}
            type="button"
          >
            Menu
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{session.email}</p>
            <p className="text-xs text-slate-400">{clientProfile.businessType}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-indigo-300/40 bg-indigo-400/20 text-sm font-semibold text-indigo-100">
              {session.email[0]?.toUpperCase()}
            </div>
            <Link
              className="rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
              href="/config"
            >
              Configurar negocio
            </Link>
            <button
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
              onClick={handleLogout}
              type="button"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      {isNavOpen ? (
        <div className="fixed inset-0 z-30 bg-slate-950/80 backdrop-blur">
          <div className="absolute inset-y-0 right-0 w-72 max-w-full border-l border-white/10 bg-slate-950/90 p-5 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Menu</p>
                <p className="text-sm font-semibold text-white">{clientProfile.branding.businessName}</p>
              </div>
              <button
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/10 text-white hover:bg-white/15"
                onClick={() => setIsNavOpen(false)}
                type="button"
              >
                X
              </button>
            </div>
            <nav className="mt-4 space-y-2">
              {sectionItems.map((item) => (
                <button
                  key={item.key}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                    activeSection === item.key
                      ? "bg-indigo-400/20 text-indigo-50 ring-1 ring-indigo-300/30"
                      : "text-slate-200 hover:bg-white/5"
                  }`}
                  type="button"
                  onClick={() => handleNavClick(item.key)}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      <div className="w-full overflow-x-hidden" ref={reservationsRef}>
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 xl:flex-row">
              <aside className="hidden w-60 shrink-0 lg:block">
                <NeonCard className="p-5 reveal">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Menu</p>
                  <nav className="mt-4 space-y-2">
                    {sectionItems.map((item) => (
                      <button
                        key={item.key}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                          activeSection === item.key
                            ? "bg-indigo-400/20 text-indigo-50 ring-1 ring-indigo-300/30"
                            : "text-slate-200 hover:bg-white/5"
                        }`}
                        type="button"
                        onClick={() => handleNavClick(item.key)}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </nav>
                  <NeonCard className="mt-4 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Estado del sistema</p>
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-400/15 px-3 py-2 text-sm text-emerald-100 border border-emerald-300/30">
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                      Bot de WhatsApp activo
                    </div>
                  </NeonCard>
                </NeonCard>
              </aside>

          <div className="flex-1 space-y-6">
            {profileStatus === "error" ? (
              <p className="text-sm text-amber-200">{uiText.profile.fallback}</p>
            ) : null}
            {profileLoading ? <p className="text-xs text-slate-400">Cargando perfil...</p> : null}

                                    {activeSection === "info" ? (
              <NeonCard className="p-6">
                <p className="text-sm text-slate-300">Sitio web</p>
                <h2 className="text-xl font-semibold text-white">En construccion</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Aqui apareceran las herramientas para tu sitio web mas adelante.
                </p>
              </NeonCard>
            ) : activeSection === "clientes" ? (
              <NeonCard className="p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-300">Clientes</p>
                    <h2 className="text-xl font-semibold text-white">Personas que han reservado</h2>
                    <p className="text-xs text-slate-400">Consulta y busca por nombre o telefono.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Buscar por nombre o telefono"
                      className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => fetchCustomers(customerSearch)}
                      className="rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
                    >
                      Actualizar
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[2fr_1fr] items-start">
                  <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                    {customersLoading ? (
                      <p className="text-sm text-slate-300">Cargando clientes...</p>
                    ) : customersError ? (
                      <p className="text-sm text-rose-200">{customersError}</p>
                    ) : customers.length === 0 ? (
                      <p className="text-sm text-slate-300">Aun no hay clientes registrados.</p>
                    ) : (
                      customers.map((cust) => (
                        <div
                          key={cust._id}
                          className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/20 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-white">{cust.name}</p>
                            <p className="text-xs text-slate-300">{cust.phone}</p>
                            {cust.email ? (
                              <p className="text-[11px] text-slate-400">Email: {cust.email}</p>
                            ) : null}
                            {cust.lastReservationAt ? (
                              <p className="text-[11px] text-slate-400">
                                Ultima reserva: {formatDateDisplay(cust.lastReservationAt)}
                              </p>
                            ) : null}
                            {cust.notes ? (
                              <p className="text-[11px] text-slate-400 line-clamp-2">{cust.notes}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-white hover:bg-white/15"
                              onClick={() => {
                                setEditingCustomerId(cust._id);
                                setCustomerForm({
                                  name: cust.name ?? "",
                                  phone: cust.phone ?? "",
                                  email: cust.email ?? "",
                                  notes: cust.notes ?? "",
                                });
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-1 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/30"
                              onClick={async () => {
                                if (!session?.clientId) return;
                                await fetch(
                                  `/api/customers?id=${encodeURIComponent(cust._id)}&clientId=${encodeURIComponent(session.clientId)}`,
                                  { method: "DELETE" },
                                );
                                fetchCustomers(customerSearch);
                                if (editingCustomerId === cust._id) {
                                  setEditingCustomerId(null);
                                  setCustomerForm({ name: "", phone: "", email: "", notes: "" });
                                }
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/10">
                    <h3 className="text-sm font-semibold text-white">
                      {editingCustomerId ? "Editar cliente" : "Nuevo cliente"}
                    </h3>
                    <p className="text-xs text-slate-400">Agrega clientes manualmente sin crear reserva.</p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-xs text-slate-300" htmlFor="customer-name">
                          Nombre
                        </label>
                        <input
                          id="customer-name"
                          type="text"
                          value={customerForm.name}
                          onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                          placeholder="Nombre"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300" htmlFor="customer-phone">
                          Telefono
                        </label>
                        <input
                          id="customer-phone"
                          type="tel"
                          value={customerForm.phone}
                          onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                          placeholder="57..."
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300" htmlFor="customer-email">
                          Email (opcional)
                        </label>
                        <input
                          id="customer-email"
                          type="email"
                          value={customerForm.email}
                          onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                          placeholder="cliente@correo.com"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-300" htmlFor="customer-notes">
                          Notas (opcional)
                        </label>
                        <textarea
                          id="customer-notes"
                          value={customerForm.notes}
                          onChange={(e) => setCustomerForm((prev) => ({ ...prev, notes: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                          rows={3}
                          placeholder="Preferencias, servicio favorito..."
                        />
                      </div>
                      {customerFormError ? <p className="text-xs text-rose-200">{customerFormError}</p> : null}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={handleCreateCustomer}
                          disabled={customerSave.isSaving}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${
                            customerSave.isSaving
                              ? "cursor-not-allowed border border-white/10 bg-white/5 opacity-70"
                            : customerSave.isSuccess
                              ? "border-emerald-300/70 bg-emerald-500/20 shadow-[0_10px_40px_-20px_rgba(16,185,129,0.8)]"
                              : "border border-indigo-300/50 bg-indigo-500/20 hover:bg-indigo-500/30"
                          }`}
                        >
                          {customerSave.isSaving
                            ? "Guardando..."
                            : customerSave.isSuccess
                              ? "Guardado"
                              : editingCustomerId
                                ? "Actualizar cliente"
                                : "Guardar cliente"}
                        </button>
                        <SaveFeedback status={customerSave.status} />
                      </div>
                      {editingCustomerId ? (
                        <button
                          type="button"
                          className="text-xs text-indigo-200 underline"
                          onClick={() => {
                            setEditingCustomerId(null);
                            setCustomerForm({ name: "", phone: "", email: "", notes: "" });
                            customerSave.reset();
                            setCustomerFormError(null);
                          }}
                        >
                          Cancelar edicion
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </NeonCard>
            ) : (
              <>
                {activeSection === "dashboard" ? (
                  <NeonCard className="p-4 sm:p-6">
                    <p className="text-sm text-slate-300">Dashboard general</p>
                    <h2 className="text-xl font-semibold text-white">Resumen rapido</h2>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <StatCard label="Reservas" value={reservations.length} />
                      <StatCard
                        label="Confirmadas"
                        value={reservations.filter((r) => r.status === "Confirmada").length}
                        tone="emerald"
                      />
                      <StatCard
                        label="Pendientes"
                        value={reservations.filter((r) => r.status === "Pendiente").length}
                        tone="amber"
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-400">Usa el modulo de reservas completo.</p>
                  </NeonCard>
                ) : null}

                {clientProfile.features.reservations && activeSection === "reservas" ? (
                  <NeonCard className="p-4 sm:p-6 reveal">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-300">Agenda semanal</p>
                        <h2 className="text-xl font-semibold text-white">Reservas</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                          onClick={handlePrevWeek}
                          type="button"
                        >
                          {"<"}
                        </button>
                        <span className="text-sm font-medium text-slate-200">Semana de {formatDateDisplay(weekStart)}</span>
                        <button
                          className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                          onClick={handleNextWeek}
                          type="button"
                        >
                          {">"}
                        </button>
                        {!isCurrentWeek ? (
                          <button
                            className="rounded-lg border border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 px-3 py-2 text-xs font-semibold text-slate-900 shadow-[0_10px_30px_-20px_rgba(59,130,246,0.9)] transition hover:translate-y-[-1px] hover:shadow-[0_15px_40px_-20px_rgba(59,130,246,0.9)]"
                            type="button"
                            onClick={handleToday}
                          >
                            Volver a hoy
                          </button>
                        ) : null}
                        <button
                          className={`rounded-lg border border-indigo-300/50 px-3 py-2 text-xs font-semibold text-indigo-100 transition ${
                            isSelectedDayClosed || daySlots.length === 0
                              ? "cursor-not-allowed bg-indigo-500/10 opacity-60"
                              : "bg-indigo-500/20 hover:bg-indigo-500/30"
                          }`}
                          disabled={isSelectedDayClosed || daySlots.length === 0}
                          type="button"
                          onClick={() => openCreateForSlot(selectedDate, daySlots[0] ?? scheduleHours.open)}
                        >
                          Crear turno
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      <div className="overflow-x-auto">
                        <div className="min-w-[640px] sm:min-w-[720px]">
                          <div className="grid grid-cols-8 border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-300">
                            <div className="px-4 py-3 text-left font-semibold text-slate-200">Hora</div>
                            {weekDays.map((day, idx) => (
                              <button
                                key={idx}
                                className={`px-4 py-3 text-left font-semibold ${
                                  formatDateKey(day) === selectedKey ? "text-indigo-200" : "text-slate-200"
                                }`}
                                onClick={() => setSelectedDate(day)}
                                type="button"
                              >
                                {day.toLocaleDateString("es-ES", { weekday: "long" }).toUpperCase()} {" "}
                                <span className="block text-[11px] font-normal text-slate-400">{formatDateDisplay(day)}</span>
                              </button>
                            ))}
                          </div>
                          <div className="divide-y divide-white/5">
                            {weeklySlots.map((slot, slotIdx) => (
                              <div key={slot} className="grid grid-cols-8">
                                <div className="border-r border-white/5 px-4 py-5 text-xs font-semibold text-slate-300">
                                  {slot}
                                </div>
                                {weekDays.map((day) => {
                                  const key = formatDateKey(day);
                                  const matches = (reservationsByDate[key] ?? []).filter((r) => r.time?.startsWith(slot));
                                  const daySlotsForDay = daySlotsMap[key] ?? [];
                                  const dayHours = weekDayHours.find((d) => d.key === key)?.hours;
                                  const isWithinSchedule = daySlotsForDay.includes(slot);
                                  const isClosed = !dayHours;
                                  if (!isWithinSchedule) {
                                    return (
                                      <div
                                        key={key + slot}
                                        className="border-r border-white/5 px-2 py-3 text-center text-[11px] text-slate-500"
                                      >
                                        {isClosed && slotIdx === 0 ? "Cerrado" : ""}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div
                                      key={key + slot}
                                      className="border-r border-white/5 px-2 py-3 transition hover:bg-white/5"
                                      onClick={() => setSelectedDate(day)}
                                    >
                                      {matches.length === 0 ? (
                                        <button
                                          className="group relative flex h-full w-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/0 px-2 py-3 text-[11px] text-slate-400 hover:border-white/20 hover:bg-white/5"
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openCreateForSlot(day, slot);
                                          }}
                                        >
                                          <span className="opacity-0 transition-opacity group-hover:opacity-100 text-indigo-100">
                                            + Crear turno
                                          </span>
                                        </button>
                                      ) : (
                                        matches.map((res) => (
                                          <button
                                            key={res._id}
                                            className={`mb-2 w-full text-left rounded-lg border px-3 py-2 text-xs shadow-sm ${
                                              statusStyles[res.status] ?? "border-white/10 bg-white/10 text-slate-100"
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReservation(res);
                                              setIsEditMode(false);
                                              setIsCreateModal(false);
                                              setActionError(null);
                                            }}
                                            type="button"
                                          >
                                            <p className="text-sm font-semibold text-white line-clamp-1 break-words">{res.name}</p>
                                            <p className="text-[11px] text-slate-200 line-clamp-1 break-words">
                                              {res.serviceName}
                                              {res.staffName ? ` | ${res.staffName}` : ""}
                                            </p>
                                            <p className="text-[11px] text-slate-300 line-clamp-1 break-words">{res.status}</p>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </NeonCard>
                ) : activeSection === "reservas" ? (
                  <NeonCard className="p-4 sm:p-6 reveal">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-300">Modulo de reservas</p>
                        <h2 className="text-xl font-semibold text-white">Deshabilitado para este negocio</h2>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">Configurable</span>
                    </div>
                    <p className="mt-4 text-sm text-slate-300">
                      Activa el feature de reservas en el perfil del cliente para mostrar el calendario y la agenda.
                    </p>
                  </NeonCard>
                ) : null}
              </>
            )}

            {(activeSection === "dashboard" || activeSection === "reservas") && (
              <>
                <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" ref={businessRef}>
                  <NeonCard className="p-5 reveal">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-300">Negocio</p>
                        <h2 className="text-xl font-semibold text-white">{clientProfile.branding.businessName}</h2>
                      </div>
                      <span className="max-w-[180px] truncate rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-100 border border-emerald-300/30">
                        Bot WhatsApp activo
                      </span>
                    </div>
                    {clientProfile.features.reservations ? (
                      <>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <StatCard label="Reservas" value={metrics.total} />
                          <StatCard label="Prox. 24h" value={upcoming24h} tone="emerald" />
                          <StatCard label="Esta semana" value={weekReservationsCount} tone="amber" />
                        </div>
                        {metrics.nextDate ? (
                          <p className="mt-4 text-sm text-slate-300">
                            Proxima fecha:{" "}
                            <span className="font-semibold text-white">{formatDateDisplay(metrics.nextDate)}</span>
                          </p>
                        ) : (
                          <p className="mt-4 text-sm text-slate-400">Sin reservas registradas.</p>
                        )}
                      </>
                    ) : (
                      <p className="mt-4 text-sm text-slate-300">
                        Las reservas estan desactivadas para este negocio. Activalas en el perfil para ver metricas.
                      </p>
                    )}
                  </NeonCard>

                  <NeonCard className="p-5 reveal">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-300">Horario</p>
                        <h3 className="text-lg font-semibold text-white">Disponibilidad</h3>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 whitespace-nowrap">
                        Intervalo: {scheduleHours.slotMinutes} min
                      </span>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-slate-200">
                      <li>
                        Hora inicio: <span className="font-semibold text-indigo-200">{scheduleHours.open}</span>
                      </li>
                      <li>
                        Hora fin: <span className="font-semibold text-indigo-200">{scheduleHours.close}</span>
                      </li>
                      <li>Intervalos: {scheduleHours.slotMinutes} minutos</li>
                    </ul>
                    {isSelectedDayClosed ? (
                      <p className="mt-2 text-xs text-rose-200">Cerrado en el dia seleccionado.</p>
                    ) : null}
                  </NeonCard>

                  <NeonCard className="p-6 md:col-span-2 xl:col-span-1 reveal">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-300">Agenda del dia</p>
                        <h3 className="text-lg font-semibold text-white">
                          {dayFormatter.format(selectedDate)} - {formatDateDisplay(selectedDate)}
                        </h3>
                      </div>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200">
                        {reservationsForDay.length} turno{reservationsForDay.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {fetchError ? (
                        <p className="text-sm text-rose-200">Error: {fetchError}</p>
                      ) : isSelectedDayClosed ? (
                        <p className="text-sm text-slate-400">El negocio esta cerrado este dia.</p>
                      ) : daySlots.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          Horario no configurado (abre {scheduleHours.open} - cierra {scheduleHours.close}).
                        </p>
                      ) : (
                        daySlots.map((slot) => {
                          const reservation = reservationsForDay.find((r) => r.time?.startsWith(slot));
                          const isReserved = Boolean(reservation);
                          const statusClass =
                            (reservation && statusStyles[reservation.status]) ??
                            "border-white/10 bg-white/5 text-slate-200";
                          return (
                            <div
                              key={slot}
                              className={`rounded-xl border px-3 py-2 transition ${statusClass} ${
                                isReserved ? "" : "hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-lg font-semibold text-white">{slot}</p>
                                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white">
                                  {isReserved ? "Confirmada" : "Disponible"}
                                </span>
                              </div>
                              {isReserved ? (
                                <div className="mt-2 space-y-1 text-sm text-slate-200">
                                  <p className="font-semibold line-clamp-1 break-words">
                                    {reservation?.name}
                                  </p>
                                  <p className="text-xs text-slate-300 line-clamp-2 break-words">
                                    {reservation?.serviceName} | {reservation?.phone}
                                    {reservation?.staffName ? ` | ${reservation.staffName}` : ""}
                                  </p>
                                  <p className="text-[11px] text-slate-400">Vista solo lectura</p>
                                </div>
                              ) : (
                                <div className="mt-1 text-xs text-slate-400">
                                  <span>Sin reserva en este horario.</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </NeonCard>
                </section>

                {clientProfile.features.reservations ? (
                  <NeonCard className="p-6 reveal">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-300">Bitacora</p>
                        <h2 className="text-lg font-semibold text-white">Ultimas reservas</h2>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                        {reservations.length} registros
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {loadingData ? (
                        <p className="text-sm text-slate-400">Cargando reservas...</p>
                      ) : fetchError ? (
                        <p className="text-sm text-rose-200">{fetchError}</p>
                      ) : reservations.length === 0 ? (
                        <p className="text-sm text-slate-400">
                          Sin registros aun. Cuando el bot inserte en MongoDB los veras aqui.
                        </p>
                      ) : (
                        reservations
                          .slice()
                          .sort((a, b) => ((a.createdAt ?? "") < (b.createdAt ?? "") ? 1 : -1))
                          .map((reservation) => (
                            <article
                              key={reservation._id}
                              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-white">
                                    {reservation.serviceName} - {reservation.time}
                                    {reservation.staffName ? ` | ${reservation.staffName}` : ""}
                                  </p>
                                  <p className="text-xs text-slate-300">
                                    {reservation.name} | {reservation.phone} | {formatDateDisplay(reservation.dateId)}
                                  </p>
                                </div>
                                <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-[11px] text-emerald-100 border border-emerald-300/30">
                                  Confirmada
                                </span>
                              </div>
                              <button
                                className="mt-2 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/15"
                                onClick={() => {
                                  setSelectedReservation(reservation);
                                  setIsEditMode(false);
                                  setIsCreateModal(false);
                                  setActionError(null);
                                }}
                                type="button"
                              >
                                Ver detalle
                              </button>
                            </article>
                          ))
                      )}
                    </div>
                  </NeonCard>
                ) : (
                  <NeonCard className="p-6">
                    <p className="text-sm text-slate-300">
                      Este negocio no tiene activado el modulo de reservas. Activalo para ver la bitacora.
                    </p>
                  </NeonCard>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      {(selectedReservation || isCreateModal || isEditMode) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 p-6 shadow-[0_30px_120px_-50px_rgba(59,130,246,0.9)]">
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/25 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />
            </div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-indigo-200/70">Agenda</p>
                <h3 className="text-xl font-semibold text-white">
                  {isCreateModal ? "Crear turno" : isEditMode ? "Editar reserva" : "Detalle de reserva"}
                </h3>
              </div>
              <button
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                type="button"
                onClick={() => {
                  setSelectedReservation(null);
                  setIsEditMode(false);
                  setIsCreateModal(false);
                  setActionError(null);
                }}
              >
                Cerrar
              </button>
            </div>

            {actionError ? <p className="relative mt-3 text-sm text-rose-200">{actionError}</p> : null}

            {isCreateModal || isEditMode ? (
              <div className="relative mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-100">
                    Fecha
                    <input
                      type="date"
                      value={createForm.dateId}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, dateId: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-100">
                    Hora
                    <input
                      type="time"
                      value={createForm.time}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, time: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                    />
                  </label>
                </div>
                <label className="text-sm font-semibold text-slate-100">
                  Nombre del cliente
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-100">
                  Telefono
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-100">
                  Servicio
                  <input
                    type="text"
                    value={createForm.serviceName}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, serviceName: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-100">
                  Staff (opcional)
                  <select
                    value={createForm.staffId}
                    onChange={(e) => {
                      const selected = activeStaff.find((s) => s.id === e.target.value);
                      setCreateForm((prev) => ({
                        ...prev,
                        staffId: selected?.id ?? "",
                        staffName: selected?.name ?? "",
                      }));
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800/70 px-3 py-2.5 text-sm text-white transition focus:border-indigo-300/70 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-400/40"
                  >
                    <option value="">Sin asignar</option>
                    {activeStaff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.role ? `- ${member.role}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white transition hover:bg-white/10"
                    onClick={() => {
                      setIsCreateModal(false);
                      setIsEditMode(false);
                      setActionError(null);
                    }}
                    type="button"
                  >
                    Cerrar
                  </button>
                  <button
                    className="rounded-xl border border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_10px_40px_-20px_rgba(59,130,246,0.9)] transition hover:translate-y-[-2px] hover:shadow-[0_15px_50px_-18px_rgba(59,130,246,0.9)]"
                    onClick={isEditMode ? handleUpdateReservation : handleCreateReservation}
                    type="button"
                  >
                    {isEditMode ? "Guardar cambios" : "Guardar turno"}
                  </button>
                </div>
              </div>
            ) : selectedReservation ? (
              <div className="relative mt-5 space-y-2 text-sm text-slate-200">
                <p className="text-lg font-semibold text-white">{selectedReservation.name}</p>
                <p>
                  Servicio: {selectedReservation.serviceName}
                  {selectedReservation.staffName ? ` | ${selectedReservation.staffName}` : ""}
                </p>
                <p>
                  Fecha: {formatDateDisplay(selectedReservation.dateId)} - {selectedReservation.time}
                </p>
                <p>Telefono: {selectedReservation.phone}</p>
                <p>Estado: {selectedReservation.status}</p>
                <div className="flex flex-wrap justify-end gap-2 pt-3">
                  <button
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white transition hover:bg-white/10"
                    onClick={() => {
                      setSelectedReservation(null);
                      setIsEditMode(false);
                      setIsCreateModal(false);
                      setActionError(null);
                    }}
                    type="button"
                  >
                    Cerrar
                  </button>
                  <button
                    className="rounded-xl border border-indigo-300/40 bg-indigo-500/20 px-4 py-2 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
                    onClick={() => {
                      if (!selectedReservation) return;
                      setCreateForm({
                        dateId: selectedReservation.dateId,
                        time: selectedReservation.time,
                        name: selectedReservation.name,
                        phone: selectedReservation.phone,
                        serviceName: selectedReservation.serviceName,
                        staffId: selectedReservation.staffId ?? "",
                        staffName: selectedReservation.staffName ?? "",
                      });
                      setIsEditMode(true);
                      setIsCreateModal(false);
                    }}
                    type="button"
                  >
                    Editar
                  </button>
                        <button
                          className="rounded-xl border border-rose-300/40 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/30"
                          onClick={() => handleDeleteReservation(selectedReservation._id)}
                          type="button"
                        >
                          Eliminar
                        </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {confirmData ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur">
          <div className="w-full max-w-sm rounded-2xl border border-indigo-500/30 bg-slate-900/95 p-5 shadow-[0_20px_70px_-35px_rgba(59,130,246,0.9)]">
            <p className="text-sm text-slate-200">{confirmData.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15"
                type="button"
                onClick={() => setConfirmData(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-lg border border-rose-300/50 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
                type="button"
                onClick={() => {
                  const action = confirmData.onConfirm;
                  setConfirmData(null);
                  action?.();
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  tone?: "emerald" | "amber";
};

function StatCard({ label, value, tone }: StatCardProps) {
  const colors =
    tone === "emerald"
      ? "bg-emerald-400/15 text-emerald-100 border-emerald-300/30"
      : tone === "amber"
        ? "bg-amber-400/15 text-amber-100 border-amber-300/30"
        : "bg-white/5 text-white border-white/10";

  return (
    <div className={`rounded-xl border ${colors} p-3 min-w-0`}>
      <p className="text-[11px] uppercase tracking-wide truncate">{label}</p>
      <p className="text-2xl font-semibold leading-tight">{value}</p>
    </div>
  );
}










