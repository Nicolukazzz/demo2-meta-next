"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
};

type UserSession = {
  email: string;
  clientId: string;
  businessName: string;
  businessType: "reservas" | "ventas" | "mixto";
  hours: {
    open: string;
    close: string;
    slotMinutes: number;
  };
};

type ClientProfile = {
  businessName: string;
  businessType: "reservas" | "ventas" | "mixto";
  hours: {
    open: string;
    close: string;
    slotMinutes: number;
  };
  nav: { label: string; key: string; active?: boolean }[];
};

const NAV_ITEMS: ClientProfile["nav"] = [
  { label: "Dashboard", key: "dashboard", active: true },
  { label: "Guia", key: "guia" },
  { label: "Reservas", key: "reservas" },
  { label: "Ventas", key: "ventas" },
  { label: "Reportes", key: "reportes" },
];

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

export default function Home() {
  const defaultProfile: ClientProfile = {
    businessName: "Tu negocio",
    businessType: "reservas",
    hours: { open: "09:00", close: "18:00", slotMinutes: 60 },
    nav: NAV_ITEMS,
  };

  const [session, setSession] = useState<UserSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
  });
  const [actionError, setActionError] = useState<string | null>(null);

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
    }));
    setActionError(null);
    setIsCreateModal(true);
  };

  const clientProfile = useMemo<ClientProfile>(() => {
    if (!session) return defaultProfile;
    return {
      businessName: session.businessName,
      businessType: session.businessType,
      hours: session.hours,
      nav: NAV_ITEMS,
    };
  }, [session]);

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

  const fetchReservations = useCallback(
    async (silent = false) => {
      if (!session?.clientId) return;
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
    [session],
  );

  useEffect(() => {
    if (!session?.clientId) {
      setReservations([]);
      return;
    }
    fetchReservations(false);
    const interval = setInterval(() => fetchReservations(true), 15000);
    return () => clearInterval(interval);
  }, [session, fetchReservations]);

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

  const daySlots = useMemo(() => {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };
    const start = toMinutes(clientProfile.hours.open);
    const end = toMinutes(clientProfile.hours.close);
    const step = clientProfile.hours.slotMinutes;
    const slots: string[] = [];
    for (let t = start; t <= end; t += step) {
      const h = Math.floor(t / 60)
        .toString()
        .padStart(2, "0");
      const m = (t % 60).toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
    }
    return slots;
  }, [clientProfile.hours]);

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
      setCreateForm((prev) => ({ ...prev, name: "", phone: "", serviceName: "" }));
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

  const handleDeleteReservation = async (id: string) => {
    if (!session?.clientId) return;
    if (!window.confirm("Eliminar esta reserva? Esta accion no se puede deshacer.")) return;
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
        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-indigo-400/20 border border-indigo-300/40 flex items-center justify-center text-lg font-semibold text-indigo-100">
              RZ
            </div>
            <div>
              <p className="text-sm text-slate-300">Acceso seguro</p>
              <h1 className="text-xl font-semibold text-white">{clientProfile.businessName}</h1>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 overflow-x-hidden">
      <header className="flex flex-col gap-4 border-b border-white/10 bg-slate-950/80 px-4 py-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-indigo-400/20 border border-indigo-300/40 flex items-center justify-center text-lg font-semibold text-indigo-100">
            RZ
          </div>
          <div>
            <p className="text-sm text-slate-300">Dashboard</p>
            <h1 className="text-xl font-semibold text-white">{clientProfile.businessName}</h1>
          </div>
          <button
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-sm text-white transition hover:bg-white/15 lg:hidden"
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
            <div className="h-10 w-10 rounded-full bg-indigo-400/20 border border-indigo-300/40 flex items-center justify-center text-sm font-semibold text-indigo-100">
              {session.email[0]?.toUpperCase()}
            </div>
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
                <p className="text-sm font-semibold text-white">{clientProfile.businessName}</p>
              </div>
              <button
                className="h-9 w-9 rounded-lg border border-white/10 bg-white/10 text-white hover:bg-white/15"
                onClick={() => setIsNavOpen(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>
            <nav className="mt-4 space-y-2">
              {clientProfile.nav.map((item) => (
                <button
                  key={item.key}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                    item.active
                      ? "bg-indigo-400/20 text-indigo-50 ring-1 ring-indigo-300/30"
                      : "text-slate-200 hover:bg-white/5"
                  }`}
                  type="button"
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

      <div className="w-full overflow-x-hidden">
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 xl:flex-row">
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/30">
              <p className="text-xs uppercase tracking-wide text-slate-400">Menu</p>
              <nav className="mt-4 space-y-2">
                {clientProfile.nav.map((item) => (
                  <button
                    key={item.key}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                      item.active
                        ? "bg-indigo-400/20 text-indigo-50 ring-1 ring-indigo-300/30"
                        : "text-slate-200 hover:bg-white/5"
                    }`}
                    type="button"
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
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/30">
              <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-400/15 px-3 py-2 text-sm text-emerald-100 border border-emerald-300/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                Sistema Operativo
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/30 sm:p-6">
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
                    className="rounded-lg border border-indigo-300/50 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-500/30"
                    type="button"
                    onClick={() => openCreateForSlot(selectedDate, daySlots[0] ?? clientProfile.hours.open)}
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

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Negocio</p>
                    <h2 className="text-xl font-semibold text-white">{clientProfile.businessName}</h2>
                  </div>
                  <span className="max-w-[180px] truncate rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-100 border border-emerald-300/30">
                    Bot WhatsApp activo
                  </span>
                </div>
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
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Horario</p>
                    <h3 className="text-lg font-semibold text-white">Disponibilidad</h3>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 whitespace-nowrap">
                    Intervalo: {clientProfile.hours.slotMinutes} min
                  </span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  <li>
                    Apertura: <span className="font-semibold text-indigo-200">{clientProfile.hours.open}</span>
                  </li>
                  <li>
                    Cierre: <span className="font-semibold text-indigo-200">{clientProfile.hours.close}</span>
                  </li>
                  <li>Intervalos: {clientProfile.hours.slotMinutes} minutos</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30 md:col-span-2 xl:col-span-1">
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
                      Horario no configurado (abre {clientProfile.hours.open} - cierra {clientProfile.hours.close}).
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

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
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
          </div>
        </main>
      </div>

      {(selectedReservation || isCreateModal || isEditMode) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {isCreateModal ? "Crear turno" : isEditMode ? "Editar reserva" : "Detalle de reserva"}
              </h3>
            </div>

            {actionError ? <p className="mt-3 text-sm text-rose-200">{actionError}</p> : null}

            {isCreateModal || isEditMode ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-slate-300">
                    Fecha
                    <input
                      type="date"
                      value={createForm.dateId}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, dateId: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    Hora
                    <input
                      type="time"
                      value={createForm.time}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, time: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>
                <label className="text-sm text-slate-300">
                  Nombre del cliente
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-sm text-slate-300">
                  Telefono
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-sm text-slate-300">
                  Servicio
                  <input
                    type="text"
                    value={createForm.serviceName}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, serviceName: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15"
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
                    className="rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25"
                    onClick={isEditMode ? handleUpdateReservation : handleCreateReservation}
                    type="button"
                  >
                    {isEditMode ? "Guardar cambios" : "Guardar turno"}
                  </button>
                </div>
              </div>
            ) : selectedReservation ? (
              <div className="mt-4 space-y-2 text-sm text-slate-200">
                <p className="text-lg font-semibold text-white">{selectedReservation.name}</p>
                <p>Servicio: {selectedReservation.serviceName}</p>
                <p>
                  Fecha: {selectedReservation.dateId} - {selectedReservation.time}
                </p>
                <p>Telefono: {selectedReservation.phone}</p>
                <p>Estado: {selectedReservation.status}</p>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15"
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
                    className="rounded-lg border border-indigo-300/40 bg-indigo-500/20 px-4 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-500/30"
                    onClick={() => {
                      if (!selectedReservation) return;
                      setCreateForm({
                        dateId: selectedReservation.dateId,
                        time: selectedReservation.time,
                        name: selectedReservation.name,
                        phone: selectedReservation.phone,
                        serviceName: selectedReservation.serviceName,
                      });
                      setIsEditMode(true);
                      setIsCreateModal(false);
                    }}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-lg border border-rose-300/40 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
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


