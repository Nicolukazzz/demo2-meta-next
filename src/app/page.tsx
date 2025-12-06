"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Branding as BusinessBranding,
  BusinessFeatures,
  BusinessProfile,
  StaffHours,
  StaffMember,
  DEFAULT_FEATURES,
  DEFAULT_HOURS,
  DEFAULT_PROFILE,
} from "@/lib/businessProfile";
import ProfileEditor, { ProfileFormValues } from "./modules/profile/ProfileEditor";

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

type UserSessionFeatures = BusinessFeatures;
type UserSessionBranding = BusinessBranding;

type UserSession = {
  email: string;
  clientId: string;
  branding: UserSessionBranding;
  businessType: "reservas" | "ventas" | "mixto";
  features: UserSessionFeatures;
  staff?: StaffMember[];
  hours?: {
    open: string;
    close: string;
    slotMinutes: number;
  };
};

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"];

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

const statusStyles: Record<string, string> = {
  Confirmada: "border-emerald-400/40 bg-emerald-400/15 text-emerald-100",
  Pendiente: "border-amber-400/40 bg-amber-400/15 text-amber-100",
  Cancelada: "border-rose-400/40 bg-rose-400/15 text-rose-100",
};

type NavItem = { label: string; key: string; active?: boolean };

const BASE_NAV: NavItem[] = [{ label: "Dashboard", key: "dashboard", active: true }];

function buildNav(features?: UserSession["features"]) {
  const activeFeatures = features ?? DEFAULT_FEATURES;
  const items: NavItem[] = [...BASE_NAV];
  if (activeFeatures.reservations) items.push({ label: "Reservas", key: "reservas" });
  if (activeFeatures.catalogo) items.push({ label: "Catalogo", key: "catalogo" });
  if (activeFeatures.leads) items.push({ label: "Leads", key: "leads" });
  if (activeFeatures.info) items.push({ label: "Sitio Web", key: "info" });
  return items;
}

export default function Home() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormValues>({
    branding: { businessName: "", logoUrl: "" },
    hours: { open: "09:00", close: "18:00", slotMinutes: 60 },
    staff: [],
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ message: string; onConfirm: () => void } | null>(
    null,
  );
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
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

  useEffect(() => {
    if (isSettingsOpen || isCreateModal || isEditMode || selectedReservation) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isSettingsOpen, isCreateModal, isEditMode, selectedReservation]);

  const handleNavClick = (key: string) => {
    const map: Record<string, React.RefObject<HTMLDivElement | null>> = {
      dashboard: businessRef,
      reservas: reservationsRef,
      catalogo: businessRef,
      leads: businessRef,
      info: businessRef,
    };
    const ref = map[key] ?? businessRef;
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsNavOpen(false);
    }
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

  const navItems = useMemo(() => buildNav(clientProfile.features), [clientProfile.features]);
  const scheduleHours = clientProfile.hours ?? DEFAULT_HOURS;
  const activeStaff = useMemo(
    () => (clientProfile.staff ?? []).filter((member) => member.active !== false),
    [clientProfile.staff],
  );

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
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + idx);
      return d;
    });
  }, [weekStart]);

  const selectedKey = formatDateKey(selectedDate);
  const reservationsForDay = reservationsByDate[selectedKey] ?? [];

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
      setIsNavOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Error de autenticacion");
    }
  };

  const loadProfile = useCallback(async (clientId: string) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch(`/api/profile?clientId=${encodeURIComponent(clientId)}`);
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.data) {
        throw new Error(body?.error ?? "No se pudo obtener el perfil");
      }
      setProfile(body.data as BusinessProfile);
    } catch (err: any) {
      console.error(err);
      setProfileError(err?.message ?? "Error cargando perfil");
      setProfile(null);
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
    }
  }, [loadProfile, session]);

  useEffect(() => {
    if (clientProfile) {
      setProfileForm({
        branding: {
          businessName: clientProfile.branding.businessName,
          logoUrl: clientProfile.branding.logoUrl ?? "",
          primaryColor: clientProfile.branding.primaryColor,
          accentColor: clientProfile.branding.accentColor,
        },
        hours: clientProfile.hours ?? DEFAULT_HOURS,
        staff: clientProfile.staff ?? [],
      });
    }
  }, [clientProfile]);

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

  useEffect(() => {
    if (!session?.clientId || !clientProfile.features.reservations) {
      setReservations([]);
      return;
    }
    fetchReservations(false);
    const interval = setInterval(() => fetchReservations(true), 15000);
    return () => clearInterval(interval);
  }, [clientProfile.features.reservations, fetchReservations, session]);

  const handleSaveProfile = async () => {
    if (!session?.clientId) return;
    setSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaveSuccess(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: session.clientId,
          hours: profileForm.hours,
          branding: profileForm.branding,
          staff: profileForm.staff ?? [],
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.data) {
        throw new Error(body?.error ?? "No se pudo guardar el perfil");
      }
      setProfile(body.data as BusinessProfile);
      setProfileSaveSuccess("Perfil actualizado");
    } catch (err: any) {
      setProfileSaveError(err?.message ?? "Error guardando perfil");
    } finally {
      setSavingProfile(false);
    }
  };

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

  const daySlots = useMemo(() => {
    if (!clientProfile.features.reservations) {
      return [];
    }
    const hoursToUse = clientProfile.hours ?? DEFAULT_HOURS;
    const toMinutes = (time: string) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };
    const start = toMinutes(hoursToUse.open);
    const end = toMinutes(hoursToUse.close);
    const step = hoursToUse.slotMinutes;
    const slots: string[] = [];
    for (let t = start; t <= end; t += step) {
      const h = Math.floor(t / 60)
        .toString()
        .padStart(2, "0");
      const m = (t % 60).toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
    }
    return slots;
  }, [clientProfile.features.reservations, clientProfile.hours]);

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
        <div className="relative w-full max-w-md neon-card p-8 shadow-2xl shadow-black/50 reveal">
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
        </div>
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
          <div className="h-11 w-11 overflow-hidden rounded-xl bg-indigo-400/20 border border-indigo-300/40">
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
            ☰
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{session.email}</p>
            <p className="text-xs text-slate-400">{clientProfile.businessType}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-indigo-400/20 border border-indigo-300/40 flex items-center justify-center text-sm font-semibold text-indigo-100">
              {session.email[0]?.toUpperCase()}
            </div>
            <button
              className="rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
              onClick={() => setIsSettingsOpen(true)}
              type="button"
            >
              Configurar negocio
            </button>
            <button
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
              onClick={() => setSession(null)}
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
              ✕
            </button>
          </div>
            <nav className="mt-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                    item.active
                      ? "bg-indigo-400/20 text-indigo-50 ring-1 ring-indigo-300/30"
                      : "text-slate-200 hover:bg-white/5"
                  }`}
                  type="button"
                  onClick={() => handleNavClick(item.key)}
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-slate-400">
                    {clientProfile.businessType === "ventas" && item.key === "ventas"
                      ? "Ecommerce"
                      : clientProfile.businessType === "reservas"
                        ? "Agenda"
                        : "Mix"}
                  </span>
                </button>
              ))}
            </nav>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-400/15 px-3 py-2 text-sm text-emerald-100 border border-emerald-300/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                Sistema Operativo
              </div>
            </div>
          </div>
        </div>
      ) : null}

          <div className="w-full overflow-x-hidden" ref={reservationsRef}>
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 xl:flex-row">
              <aside className="hidden w-60 shrink-0 lg:block">
            <div className="neon-card p-5 shadow-xl shadow-black/30 reveal">
              <p className="text-xs uppercase tracking-wide text-slate-400">Menu</p>
              <nav className="mt-4 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                      item.active
                        ? "bg-indigo-400/20 text-indigo-50 ring-1 ring-indigo-300/30"
                        : "text-slate-200 hover:bg-white/5"
                    }`}
                    type="button"
                    onClick={() => handleNavClick(item.key)}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-slate-400">
                      {clientProfile.businessType === "ventas" && item.key === "ventas"
                        ? "Ecommerce"
                        : clientProfile.businessType === "reservas"
                          ? "Agenda"
                          : "Mix"}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="mt-4 neon-card p-4 shadow-xl shadow-black/30 reveal">
              <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-400/15 px-3 py-2 text-sm text-emerald-100 border border-emerald-300/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                Sistema Operativo
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-6">
            {profileError ? (
              <p className="text-sm text-amber-200">
                Perfil: {profileError}. Mostrando configuracion por defecto.
              </p>
            ) : null}
            {profileLoading ? <p className="text-xs text-slate-400">Cargando perfil...</p> : null}

            {clientProfile.features.reservations ? (
              <section className="neon-card p-4 shadow-xl shadow-black/30 sm:p-6 reveal">
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
                    <span className="text-sm font-medium text-slate-200">
                      Semana de {weekStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                    </span>
                    <button
                      className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                      onClick={handleNextWeek}
                      type="button"
                    >
                      {">"}
                    </button>
                    <button
                      className="rounded-lg border border-indigo-300/50 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 px-3 py-2 text-xs font-semibold text-slate-900 shadow-[0_10px_30px_-20px_rgba(59,130,246,0.9)] transition hover:translate-y-[-1px] hover:shadow-[0_15px_40px_-20px_rgba(59,130,246,0.9)]"
                      type="button"
                      onClick={handleToday}
                    >
                      Volver a hoy
                    </button>
                    <button
                      className="rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-500/30"
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
                          {day.toLocaleDateString("es-ES", { weekday: "long" }).toUpperCase()}{" "}
                          <span className="block text-[11px] font-normal text-slate-400">
                            {day.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="divide-y divide-white/5">
                      {daySlots.map((slot) => (
                        <div key={slot} className="grid grid-cols-8">
                          <div className="border-r border-white/5 px-4 py-5 text-xs font-semibold text-slate-300">
                            {slot}
                          </div>
                          {weekDays.map((day) => {
                            const key = formatDateKey(day);
                            const matches = (reservationsByDate[key] ?? []).filter((r) =>
                              r.time?.startsWith(slot),
                            );
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
                                        statusStyles[res.status] ??
                                        "border-white/10 bg-white/10 text-slate-100"
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
                                      <p className="text-sm font-semibold text-white line-clamp-1 break-words">
                                        {res.name}
                                      </p>
                                      <p className="text-[11px] text-slate-200 line-clamp-1 break-words">
                                        {res.serviceName}
                                        {res.staffName ? ` · ${res.staffName}` : ""}
                                      </p>
                                      <p className="text-[11px] text-slate-300 line-clamp-1 break-words">
                                        {res.status}
                                      </p>
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
              </section>
            ) : (
              <section className="neon-card p-4 shadow-xl shadow-black/30 sm:p-6 reveal">
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
              </section>
            )}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" ref={businessRef}>
              <div className="neon-card p-5 shadow-xl shadow-black/30 reveal">
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
                        <span className="font-semibold text-white">
                          {new Intl.DateTimeFormat("es-ES", {
                            day: "numeric",
                            month: "long",
                          }).format(new Date(metrics.nextDate))}
                        </span>
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
              </div>

              <div className="neon-card p-5 shadow-xl shadow-black/30 reveal">
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
                    Apertura: <span className="font-semibold text-indigo-200">{scheduleHours.open}</span>
                  </li>
                  <li>
                    Cierre: <span className="font-semibold text-indigo-200">{scheduleHours.close}</span>
                  </li>
                  <li>Intervalos: {scheduleHours.slotMinutes} minutos</li>
                </ul>
              </div>

              <div className="neon-card p-6 shadow-xl shadow-black/30 md:col-span-2 xl:col-span-1 reveal">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Agenda del dia</p>
                    <h3 className="text-lg font-semibold text-white">
                      {dayFormatter.format(selectedDate)}
                    </h3>
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200">
                    {reservationsForDay.length} turno{reservationsForDay.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {fetchError ? (
                    <p className="text-sm text-rose-200">Error: {fetchError}</p>
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
              </div>
            </section>

            {clientProfile.features.reservations ? (
              <section className="neon-card p-6 shadow-xl shadow-black/30 reveal">
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
                                {reservation.staffName ? ` · ${reservation.staffName}` : ""}
                              </p>
                              <p className="text-xs text-slate-300">
                                {reservation.name} | {reservation.phone} | {reservation.dateId}
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
              </section>
            ) : (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
                <p className="text-sm text-slate-300">
                  Este negocio no tiene activado el modulo de reservas. Activalo para ver la bitacora.
                </p>
              </section>
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
                  {selectedReservation.staffName ? ` · ${selectedReservation.staffName}` : ""}
                </p>
                <p>
                  Fecha: {selectedReservation.dateId} - {selectedReservation.time}
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

      {isSettingsOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 p-7 shadow-[0_30px_120px_-50px_rgba(59,130,246,0.9)]">
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
            </div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-200/80">Configuracion del negocio</p>
                <h3 className="text-2xl font-semibold text-white">Personaliza tu marca y horarios</h3>
              </div>
              <button
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setProfileSaveError(null);
                  setProfileSaveSuccess(null);
                }}
              >
                Cerrar
              </button>
            </div>
            <div className="relative mt-6">
              <ProfileEditor
                value={profileForm}
                onChange={setProfileForm}
                onSave={handleSaveProfile}
                saving={savingProfile}
                error={profileSaveError}
                success={profileSaveSuccess}
                profile={profile}
              />
            </div>
          </div>
        </div>
      ) : null}

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
