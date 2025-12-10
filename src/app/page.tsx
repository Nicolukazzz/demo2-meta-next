"use client";


import React from "react";
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
import { getNextWorkingDate } from "@/lib/hoursHelpers";
import { formatDateDisplay } from "@/lib/dateFormat";
import { uiText } from "@/lib/uiText";
import NeonCard from "./components/NeonCard";
import ConfirmDeleteDialog from "./components/ConfirmDeleteDialog";
import { useSaveStatus } from "./hooks/useSaveStatus";
import { buildDayAgenda } from "@/lib/dayAgenda";
import { TurnCountPill } from "./components/TurnCountPill";
import { SkeletonCard, SkeletonListItem } from "./components/animation/Skeletons";
import SaveButton from "./components/feedback/SaveButton";
import { useReservations, useCustomers, useServices } from "./hooks/dataHooks";
import { formatCOP } from "@/lib/metrics";
import MetricCard from "./components/MetricCard";
import { useBalanceData } from "./hooks/useBalanceData";
import { useMetricsData } from "./hooks/useMetricsData";
import { useAutoRefresh } from "./hooks/useAutoRefresh";
import { ServicesUsageChart } from "./components/metrics/ServicesUsageChart";
import { StaffPerformanceChart } from "./components/metrics/StaffPerformanceChart";
import { ReservationsOverTimeChart } from "./components/metrics/ReservationsOverTimeChart";
import { ReservationsByWeekdayChart } from "./components/metrics/ReservationsByWeekdayChart";
import SidebarItem from "./components/SidebarItem";

import { useTheme, deriveThemeColors } from "@/lib/theme/ThemeContext";
import { FormField, Input, Select, Button, TimeInput, DateInput } from "./components/ui/FormLayout";
import { Toast } from "./components/ui/Toast";
import { canBookSlot, findAvailableStaff, isStaffCapable, getCapableStaff } from "@/lib/availability";
import { getServiceDuration, calculateEndTime, getReservationEndTime, formatDuration, prepareReservationPayload } from "@/lib/schedulingUtils";
import { ReservationBlock, ReservationBlockCompact, getStatusColor } from "./components/ReservationBlock";
import { CalendarSlotCell, type CalendarReservation, type ServiceInfo } from "./components/CalendarReservationBlock";
import { TimeGridCalendar } from "./components/TimeGridCalendar";
import { WebsiteWidget, WebsiteLinkCompact } from "./components/WebsiteWidget";
import { BusinessLogo } from "./components/BusinessLogo";
import { PhoneInput } from "./components/PhoneInput";
import { CalendarToolsPanel } from "./components/CalendarToolsPanel";
import { useAdvancedMetrics } from "./hooks/useAdvancedMetrics";
import {
  // Dashboard Widgets
  TodaySummaryWidget,
  UpcomingReservationsWidget,
  QuickStatsRow,
  // Balance Widgets
  RevenueSummaryWidget,
  PeakHourWidget,
  CancellationWidget,
  StaffPerformanceWidget,
  TopClientsWidget,
  RevenueForecastWidget,
  ServicePopularityWidget,
  WeekdayDistributionWidget,
  AtRiskClientsWidget,
  PeriodComparisonCard,
  // Info Widgets (Unified style)
  BusinessInfoWidget,
  ScheduleInfoWidget,
  DayAgendaWidget,
  ReservationLogWidget,
  // Pending Confirmations
  PendingConfirmationsWidget,
  PendingStatsCard,
  ServiceEndNotificationProvider,
} from "./components/dashboard";
import { usePendingConfirmations } from "./hooks/usePendingConfirmations";

type ReservationStatus = "Pendiente" | "Confirmada" | "Cancelada" | string;

type Reservation = {
  _id: string;
  dateId: string;
  time: string;
  endTime?: string;
  durationMinutes?: number;
  name: string;
  phone: string;
  serviceName: string;
  serviceId?: string;
  servicePrice?: number;
  status: ReservationStatus;
  createdAt?: string;
  updatedAt?: string;
  staffId?: string;
  staffName?: string;
  // Cancellation fields
  cancelledAt?: string;
  cancelReason?: string;
  // Reschedule tracking
  rescheduledFrom?: {
    dateId: string;
    time: string;
    rescheduledAt: string;
  };
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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  const [activeSection, setActiveSection] = useState<"dashboard" | "reservas" | "info" | "clientes" | "balance">(
    "reservas",
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
  const deleteStatus = useSaveStatus();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    detail?: React.ReactNode;
    onConfirm?: () => Promise<void> | void;
    loading?: boolean;
  }>({ open: false, title: "", description: "" });
  const { data: reservationsData, error: reservationsHookError, refetch: refetchReservations } = useReservations(
    session?.clientId,
    30000,
  );
  const { data: customersData, loading: customersHookLoading, error: customersHookError, refetch: refetchCustomers } =
    useCustomers(session?.clientId, customerSearch, 45000);
  const { data: servicesData } = useServices(session?.clientId, 60000);
  const {
    stats: pendingStats,
    reservations: pendingReservations,
    confirmReservation,
    markNoShow,
    refresh: refreshPending
  } = usePendingConfirmations({ clientId: session?.clientId || "" });
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [loginSpot, setLoginSpot] = useState({ x: 240, y: 160 });
  const [createForm, setCreateForm] = useState({
    dateId: formatDateKey(new Date()),
    time: "10:00",
    name: "",
    phone: "",
    serviceName: "",
    serviceId: "",
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
      serviceId: "",
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

  const { colors, setColors } = useTheme();

  useEffect(() => {
    if (profileStatus !== "loaded" || !profile) {
      return;
    }
    const nextColors = deriveThemeColors(profile.branding);
    if (
      colors.primary === nextColors.primary &&
      colors.secondary === nextColors.secondary &&
      colors.tertiary === nextColors.tertiary
    ) {
      return;
    }
    setColors(nextColors);
  }, [
    profileStatus,
    profile,
    colors.primary,
    colors.secondary,
    colors.tertiary,
    setColors,
  ]);

  const activeStaff = useMemo(
    () => (clientProfile.staff ?? []).filter((member) => member.active !== false),
    [clientProfile.staff],
  );
  const businessHours = clientProfile.hours ?? DEFAULT_HOURS;
  const sectionItems = [
    { key: "reservas", label: "Reservas" },
    { key: "dashboard", label: "Dashboard" },
    { key: "balance", label: "Balance" },
    { key: "info", label: "Sitio Web" },
  ];

  const reservationsByDate = useMemo(() => {
    return reservations.reduce<Record<string, Reservation[]>>((acc, item) => {
      if (!item.dateId) return acc;
      acc[item.dateId] = acc[item.dateId] ? [...acc[item.dateId], item] : [item];
      return acc;
    }, {});
  }, [reservations]);
  const serviceMap = useMemo(() => {
    const map = new Map<string, ServiceInfo>();
    (servicesData as any[])?.forEach((s) => {
      if (!s?.id) return;
      map.set(s.id, {
        id: s.id,
        name: s.name || "",
        durationMinutes: s.durationMinutes || s.duration || 60,
        price: s.price,
      });
    });
    return map;
  }, [servicesData]);

  const metrics = useMemo(() => {
    const confirmed = reservations.filter((r) => r.status === "Confirmada").length;
    const pending = reservations.filter((r) => r.status === "Pendiente").length;
    const canceled = reservations.filter((r) => r.status === "Cancelada").length;

    // Calculate next 24h
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(now.getHours() + 24);

    const next24 = reservations.filter(r => {
      const d = new Date(`${r.dateId}T${r.time}`);
      return d >= now && d <= tomorrow;
    }).length;

    // Calculate this week
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const week = reservations.filter(r => {
      const d = new Date(`${r.dateId}T${r.time}`);
      return d >= start && d < end;
    }).length;

    const futureSorted = reservations
      .filter((r) => {
        const dt = new Date(`${r.dateId}T${r.time ?? "00:00"}`);
        return dt >= new Date();
      })
      .sort((a, b) => (a.dateId + (a.time ?? "") > b.dateId + (b.time ?? "") ? 1 : -1));
    const nextDate = futureSorted[0]?.dateId;

    return { total: reservations.length, confirmed, pending, canceled, nextDate, next24, week };
  }, [reservations]);

  const upcoming24h = metrics.next24 ?? 0;
  const weekReservationsCount = metrics.week ?? 0;

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

  // Calculate closed days for the week (days without hours)
  const closedDays = useMemo(() => {
    const closed = new Set<string>();
    weekDayHours.forEach(({ key, hours }) => {
      if (!hours) closed.add(key);
    });
    return closed;
  }, [weekDayHours]);

  useEffect(() => {
    if (reservationsData) {
      const makeId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      const normalized: Reservation[] = reservationsData.map((item: any) => {
        const svc = item.serviceId ? serviceMap.get(item.serviceId) : undefined;
        return {
          _id: item._id ?? makeId(),
          dateId: item.dateId ?? "",
          time: item.time ?? "",
          name: item.name ?? "",
          phone: item.phone ?? "",
          serviceName: item.serviceName ?? "",
          serviceId: item.serviceId ?? "",
          servicePrice: item.servicePrice ?? svc?.price ?? undefined,
          status: item.status ?? "Pendiente",
          staffId: item.staffId ?? "",
          staffName: item.staffName ?? "",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });
      setReservations(normalized);
      setFetchError(null);
      setLoadingData(false);
    }
    if (reservationsHookError) {
      setFetchError(reservationsHookError);
      setLoadingData(false);
    }
  }, [reservationsData, reservationsHookError]);

  useEffect(() => {
    if (customersData) {
      setCustomers(customersData as any);
      setCustomersError(null);
      setCustomersLoading(false);
    }
    if (customersHookError) {
      setCustomersError(customersHookError);
      setCustomersLoading(false);
    }
    if (customersHookLoading) setCustomersLoading(true);
  }, [customersData, customersHookError, customersHookLoading]);

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
  const todayKey = formatDateKey(today);
  const reservationsForToday = reservationsByDate[todayKey] ?? [];
  const todayHours =
    weekDayHours.find((d) => d.key === todayKey)?.hours ??
    getEffectiveBusinessHoursForDate(today, businessHours);
  const todaySlots = daySlotsMap[todayKey] ?? [];
  const isTodayClosed = !todayHours;
  const nextWorkingDate = useMemo(
    () => getNextWorkingDate(clientProfile.hours, today),
    [clientProfile.hours, today],
  );

  const dayFormatter = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const balance = useBalanceData(session?.clientId);
  const metricsData = useMetricsData(session?.clientId, clientProfile.staff ?? []);

  // Advanced Metrics for Dashboard Widgets
  const advancedMetrics = useAdvancedMetrics({
    reservations: reservations.map(r => ({
      _id: r._id,
      dateId: r.dateId,
      time: r.time,
      endTime: r.endTime,
      durationMinutes: r.durationMinutes,
      status: r.status,
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      servicePrice: r.servicePrice,
      staffId: r.staffId,
      staffName: r.staffName,
      createdAt: r.createdAt,
      cancelledAt: r.cancelledAt,
      cancelReason: r.cancelReason,
      phone: r.phone,
      name: r.name,
    })),
    services: (clientProfile.services ?? []).map(s => ({
      id: s.id,
      name: s.name,
      price: s.price,
      durationMinutes: s.durationMinutes,
      active: s.active,
    })),
    staff: (clientProfile.staff ?? []).map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      active: s.active,
    })),
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

  const fetchReservations = useCallback(async () => {
    await refetchReservations();
  }, [refetchReservations]);

  useAutoRefresh({
    enabled: Boolean(session?.clientId && clientProfile.features.reservations),
    intervalMs: 60000,
    onTick: fetchReservations,
  });

  const fetchCustomers = useCallback(
    async (search?: string) => {
      if (search !== undefined) setCustomerSearch(search);
      setCustomersLoading(true);
      setCustomersError(null);
      await refetchCustomers();
      setCustomersLoading(false);
    },
    [refetchCustomers],
  );

  useAutoRefresh({
    enabled: activeSection === "clientes" && Boolean(session?.clientId),
    intervalMs: 45000,
    onTick: () => fetchCustomers(customerSearch),
  });

  const handleCreateCustomer = useCallback(async () => {
    if (!session?.clientId) return;
    if (!customerForm.name.trim() || !customerForm.phone.trim()) {
      setCustomerFormError("Nombre y teléfono son obligatorios.");
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

  const handleDeleteCustomer = useCallback(
    (cust: Customer) => {
      if (!session?.clientId || !cust?._id) return;
      setDeleteDialog({
        open: true,
        title: "Eliminar cliente",
        description: `¿Quieres eliminar a ${cust.name} de tu base de datos? Esta acción no elimina reservas históricas.`,
        detail: (
          <p className="text-xs text-slate-200">
            Tel: {cust.phone} {cust.email ? `· ${cust.email}` : ""}
          </p>
        ),
        onConfirm: async () => {
          setDeleteDialog((prev) => ({ ...prev, loading: true }));
          deleteStatus.start();
          try {
            await fetch(
              `/api/customers?id=${encodeURIComponent(cust._id)}&clientId=${encodeURIComponent(session.clientId)}`,
              { method: "DELETE" },
            );
            await fetchCustomers(customerSearch);
            if (editingCustomerId === cust._id) {
              setEditingCustomerId(null);
              setCustomerForm({ name: "", phone: "", email: "", notes: "" });
            }
            deleteStatus.success();
          } catch (err) {
            deleteStatus.error();
          } finally {
            setDeleteDialog({ open: false, title: "", description: "" });
          }
        },
        loading: false,
      });
    },
    [customerSearch, deleteStatus, editingCustomerId, fetchCustomers, session],
  );

  useEffect(() => {
    if (!session?.clientId || !clientProfile.features.reservations) {
      setReservations([]);
      return;
    }
    setLoadingData(true);
    fetchReservations();
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

    // Get service and calculate duration
    const selectedService = servicesData?.find((s: any) => s.id === createForm.serviceId);
    const duration = getServiceDuration(selectedService);
    const endTime = calculateEndTime(createForm.time, selectedService);

    // Validate that service doesn't extend past closing time
    const closeTime = scheduleHours.close;
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const endMinutes = timeToMinutes(endTime);
    const closeMinutes = timeToMinutes(closeTime);
    if (endMinutes > closeMinutes) {
      setActionError(`El servicio termina a las ${endTime}, pero el negocio cierra a las ${closeTime}. Elige un horario más temprano o un servicio más corto.`);
      return;
    }

    // Validate staff capability if staff is selected
    if (createForm.staffId && createForm.serviceId) {
      const staffMember = clientProfile.staff?.find((s) => s.id === createForm.staffId);
      if (staffMember && !isStaffCapable(staffMember, createForm.serviceId)) {
        setActionError(`${staffMember.name} no puede realizar el servicio seleccionado`);
        return;
      }
    }

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: session.clientId,
          ...createForm,
          endTime,
          durationMinutes: duration,
          serviceId: createForm.serviceId ?? "",
          serviceName: createForm.serviceName ?? "",
          servicePrice: selectedService?.price,
          // No enviamos status para que use el default "Pendiente" de la API
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
        serviceId: "",
        staffId: "",
        staffName: "",
      }));
      await fetchReservations();
    } catch (err: any) {
      setActionError(err?.message ?? "Error creando reserva");
    }
  };

  const handleUpdateReservation = async () => {
    if (!session?.clientId || !selectedReservation) return;
    setActionError(null);

    // Get service and calculate duration
    const selectedService = servicesData?.find((s: any) => s.id === createForm.serviceId);
    const duration = getServiceDuration(selectedService);
    const endTime = calculateEndTime(createForm.time, selectedService);

    // Validate that service doesn't extend past closing time
    const closeTime = scheduleHours.close;
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const endMinutes = timeToMinutes(endTime);
    const closeMinutes = timeToMinutes(closeTime);
    if (endMinutes > closeMinutes) {
      setActionError(`El servicio termina a las ${endTime}, pero el negocio cierra a las ${closeTime}. Elige un horario más temprano o un servicio más corto.`);
      return;
    }

    // Validate staff capability if staff is selected
    if (createForm.staffId && createForm.serviceId) {
      const staffMember = clientProfile.staff?.find((s) => s.id === createForm.staffId);
      if (staffMember && !isStaffCapable(staffMember, createForm.serviceId)) {
        setActionError(`${staffMember.name} no puede realizar el servicio seleccionado`);
        return;
      }
    }

    try {
      const res = await fetch("/api/reservations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedReservation._id,
          clientId: session.clientId,
          ...createForm,
          endTime,
          durationMinutes: duration,
          serviceId: createForm.serviceId ?? "",
          serviceName: createForm.serviceName ?? "",
          servicePrice: selectedService?.price,
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
      await fetchReservations();
    } catch (err: any) {
      setActionError(err?.message ?? "Error actualizando reserva");
    }
  };

  const handleDeleteReservationConfirmed = async (id: string) => {
    if (!session?.clientId) return;
    setActionError(null);
    deleteStatus.start();
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
      await fetchReservations();
      deleteStatus.success();
    } catch (err: any) {
      setActionError(err?.message ?? "Error eliminando");
      deleteStatus.error();
    } finally {
      setDeleteDialog((prev) => ({ ...prev, loading: false, open: false }));
    }
  };

  const handleDeleteReservation = (id: string, info?: Reservation) => {
    setDeleteDialog({
      open: true,
      title: "Eliminar turno",
      description: "¿Estás seguro de que quieres eliminar este turno? Esta acción no se puede deshacer.",
      detail: info ? (
        <div className="text-xs text-slate-200 space-y-1">
          <p>
            {info.name} — {info.serviceName || "Sin servicio"}
          </p>
          <p>
            {formatDateDisplay(info.dateId)} · {info.time}
          </p>
        </div>
      ) : null,
      onConfirm: () => handleDeleteReservationConfirmed(id),
      loading: false,
    });
  };

  // Confirm reservation as completed (Pendiente -> Confirmada)
  const handleConfirmReservationStatus = async () => {
    if (!selectedReservation) return;
    setActionError(null);

    const result = await confirmReservation(selectedReservation._id);

    if (result.ok) {
      setSelectedReservation(null);
      await fetchReservations();
      refreshPending();
    } else {
      setActionError(result.error || "Error al confirmar");
    }
  };

  // Mark reservation as no-show (Pendiente -> Cancelada)
  const handleNoShowStatus = async () => {
    if (!selectedReservation) return;
    setActionError(null);

    const result = await markNoShow(selectedReservation._id, "No se presentó el cliente");

    if (result.ok) {
      setSelectedReservation(null);
      await fetchReservations();
      refreshPending();
    } else {
      setActionError(result.error || "Error al marcar no-show");
    }
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
              {clientProfile.branding.logoUrl ? (
                <img
                  src={clientProfile.branding.logoUrl}
                  alt={clientProfile.branding.businessName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                  <span className="text-xl font-bold text-white">
                    {clientProfile.branding.businessName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
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
    <ServiceEndNotificationProvider clientId={session?.clientId || ""}>
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
            <BusinessLogo
              logoUrl={clientProfile.branding.logoUrl}
              businessName={clientProfile.branding.businessName}
              primaryColor={clientProfile.branding.primaryColor}
              size="lg"
            />
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
                  <SidebarItem
                    key={item.key}
                    label={item.label}
                    active={activeSection === item.key}
                    onClick={() => handleNavClick(item.key)}
                  />
                ))}
              </nav>
              {/* Website Link in Mobile Menu */}
              {session?.clientId && (
                <div className="mt-4">
                  <WebsiteLinkCompact
                    clientId={session.clientId}
                    customBookingUrl={clientProfile?.branding?.customBookingUrl}
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="w-full overflow-x-hidden" ref={reservationsRef}>
          <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 xl:flex-row">
            <aside className="hidden w-56 shrink-0 lg:block space-y-4">
              {/* Navigation Menu */}
              <NeonCard className="p-5 reveal">
                <p className="text-xs uppercase tracking-wide text-slate-400">Menu</p>
                <nav className="mt-4 space-y-2">
                  {sectionItems.map((item) => (
                    <SidebarItem
                      key={item.key}
                      label={item.label}
                      active={activeSection === item.key}
                      onClick={() => handleNavClick(item.key)}
                    />
                  ))}
                </nav>
              </NeonCard>

              {/* Pending Confirmations - Only show in reservas section when there are pending */}
              {activeSection === "reservas" && clientProfile.features.reservations && pendingStats.totalPending > 0 && (
                <PendingConfirmationsWidget
                  clientId={session?.clientId || ""}
                  maxItems={3}
                  onViewReservation={(res) => {
                    const fullRes = reservations.find((r) => r._id === res._id);
                    if (fullRes) {
                      setSelectedReservation(fullRes);
                      setIsEditMode(false);
                      setIsCreateModal(false);
                      setActionError(null);
                    }
                  }}
                  className="reveal"
                />
              )}

              {/* Calendar Tools - Only show in reservas section */}
              {activeSection === "reservas" && clientProfile.features.reservations && (
                <CalendarToolsPanel
                  selectedDate={selectedDate}
                  onSelectDate={(date: Date) => {
                    setSelectedDate(date);
                    setViewDate(date);
                  }}
                  onCreateTurn={() => openCreateForSlot(selectedDate, daySlots[0] ?? scheduleHours.open)}
                  canCreateTurn={!isSelectedDayClosed && daySlots.length > 0}
                  primaryColor={colors.primary}
                  isCurrentWeek={isCurrentWeek}
                  onGoToToday={handleToday}
                />
              )}
            </aside>

            <div className="flex-1 space-y-6">
              {profileStatus === "error" ? (
                <p className="text-sm text-amber-200">{uiText.profile.fallback}</p>
              ) : null}
              {profileLoading ? <p className="text-xs text-slate-400">Cargando perfil...</p> : null}
              <Toast status={deleteStatus.status} successText="Eliminado" />

              {activeSection === "info" ? (
                <div className="space-y-6">
                  <NeonCard className="p-6">
                    <p className="text-sm text-slate-300">Sitio Web de Reservas</p>
                    <h2 className="text-xl font-semibold text-white">Tu página pública</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Comparte este enlace con tus clientes para que reserven directamente.
                    </p>
                  </NeonCard>

                  {session?.clientId && (
                    <WebsiteWidget
                      clientId={session.clientId}
                      customBookingUrl={clientProfile?.branding?.customBookingUrl}
                    />
                  )}
                </div>
              ) : (
                <>
                  {activeSection === "dashboard" ? (
                    <div className="space-y-6">
                      {/* Header */}
                      <div>
                        <p className="text-sm text-slate-300">Dashboard</p>
                        <h2 className="text-xl font-semibold text-white">Resumen Operativo</h2>
                      </div>

                      {/* Quick Stats Row */}
                      <QuickStatsRow data={advancedMetrics.dashboard.quickStats} />

                      {/* Today Summary + Upcoming */}
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <TodaySummaryWidget data={advancedMetrics.dashboard.todaySummary} />
                        <UpcomingReservationsWidget data={advancedMetrics.dashboard.upcomingReservations} />
                      </div>

                      {/* Pending Confirmations Widget */}
                      {session?.clientId && (
                        <PendingConfirmationsWidget
                          clientId={session.clientId}
                          maxItems={5}
                          onViewReservation={(res) => {
                            // Navigate to reservations section or open modal
                            setActiveSection("reservas");
                          }}
                        />
                      )}

                      {/* Service Popularity + Weekday Distribution */}
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <ServicePopularityWidget
                          data={advancedMetrics.serviceUsage.map(s => ({
                            name: s.name,
                            count: s.count,
                            revenue: s.revenue,
                          }))}
                        />
                        <WeekdayDistributionWidget data={advancedMetrics.weekdayDistribution} />
                      </div>

                      <p className="text-xs text-slate-400 text-center">
                        Para análisis financiero detallado, ve a la sección <strong>Balance</strong>.
                      </p>
                    </div>
                  ) : null}

                  {activeSection === "balance" ? (
                    balance.data ? (
                      <div className="space-y-6">
                        {/* Revenue Summary */}
                        <RevenueSummaryWidget
                          data={{
                            totalRevenue: balance.data.totalRevenue,
                            monthRevenue: balance.data.monthRevenue,
                            weekRevenue: balance.data.weekRevenue,
                            averageTicket: balance.data.averageTicket,
                            paidReservations: balance.data.paidReservations,
                          }}
                        />

                        {/* Period Comparisons */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <PeriodComparisonCard
                            title="📅 Esta Semana"
                            periodLabel="Comparado con la semana pasada"
                            value={advancedMetrics.balance.weekComparison.currentPeriod.revenue}
                            change={advancedMetrics.balance.weekComparison.revenueChange}
                            reservationCount={advancedMetrics.balance.weekComparison.currentPeriod.reservations}
                          />
                          <PeriodComparisonCard
                            title="📆 Este Mes"
                            periodLabel="Comparado con el mes pasado"
                            value={advancedMetrics.balance.monthComparison.currentPeriod.revenue}
                            change={advancedMetrics.balance.monthComparison.revenueChange}
                            reservationCount={advancedMetrics.balance.monthComparison.currentPeriod.reservations}
                          />
                          <RevenueForecastWidget data={advancedMetrics.balance.revenueForecast} />
                        </div>

                        {/* Row 2: Peak Hour + Weekday Distribution + Service Popularity (all compact visualizations) */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <PeakHourWidget data={advancedMetrics.balance.peakHours} />
                          <WeekdayDistributionWidget data={advancedMetrics.balance.weekdayDistribution} compact />
                          <ServicePopularityWidget
                            data={advancedMetrics.balance.serviceUsage.map(s => ({
                              name: s.name,
                              count: s.count,
                              revenue: s.revenue,
                            }))}
                          />
                        </div>

                        {/* Row 3: Cancellations + Staff Performance */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          <CancellationWidget data={advancedMetrics.balance.cancellationMetrics} />
                          <StaffPerformanceWidget
                            data={advancedMetrics.balance.staffPerformance.map(s => ({
                              staffId: s.staffId,
                              name: s.name,
                              role: s.role,
                              totalReservations: s.totalReservations,
                              totalRevenue: s.totalRevenue,
                              averagePerReservation: s.averagePerReservation,
                              cancellationRate: s.cancellationRate,
                            }))}
                          />
                        </div>

                        {/* Row 4: Top Clients + At Risk */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          <TopClientsWidget
                            data={advancedMetrics.balance.topClients.map(c => ({
                              phone: c.phone,
                              name: c.name,
                              totalReservations: c.totalReservations,
                              totalSpent: c.totalSpent,
                              daysSinceLastVisit: c.daysSinceLastVisit,
                            }))}
                          />
                          <AtRiskClientsWidget
                            data={advancedMetrics.balance.atRiskClients.map(c => ({
                              name: c.name,
                              phone: c.phone,
                              daysSinceLastVisit: c.daysSinceLastVisit,
                              totalSpent: c.totalSpent,
                            }))}
                          />
                        </div>

                        {/* Charts removed - data already shown in other widgets */}
                      </div>
                    ) : balance.loading ? (
                      <p className="text-sm text-slate-300">Cargando finanzas...</p>
                    ) : balance.error ? (
                      <p className="text-sm text-rose-200">{balance.error}</p>
                    ) : null
                  ) : null}

                  {clientProfile.features.reservations && activeSection === "reservas" ? (
                    <>
                      {/* Calendar Grid - Full width to align with widgets below */}
                      <NeonCard className="p-4 sm:p-5 reveal">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <div>
                            <p className="text-sm text-slate-300">Agenda semanal</p>
                            <h2 className="text-xl font-semibold text-white">Reservas</h2>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors"
                              onClick={handlePrevWeek}
                              type="button"
                              title="Semana anterior"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <span className="text-sm font-medium text-slate-200 px-2">
                              Semana de {formatDateDisplay(weekStart)}
                            </span>
                            <button
                              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors"
                              onClick={handleNextWeek}
                              type="button"
                              title="Semana siguiente"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* TimeGrid Calendar - Full Width */}
                        <TimeGridCalendar
                          weekDays={weekDays}
                          reservationsByDate={Object.fromEntries(
                            Object.entries(reservationsByDate).map(([key, list]) => [
                              key,
                              list.map((res) => ({
                                _id: res._id,
                                name: res.name,
                                time: res.time,
                                endTime: res.endTime,
                                durationMinutes: res.durationMinutes,
                                serviceName: res.serviceName,
                                serviceId: res.serviceId,
                                staffName: res.staffName,
                                staffId: res.staffId,
                                status: res.status,
                                phone: res.phone,
                                servicePrice: res.servicePrice,
                              })),
                            ])
                          )}
                          scheduleOpen={scheduleHours.open}
                          scheduleClose={scheduleHours.close}
                          slotMinutes={scheduleHours.slotMinutes}
                          servicesMap={serviceMap}
                          selectedDate={selectedDate}
                          pixelsPerMinute={1.8}
                          closedDays={closedDays}
                          onClickReservation={(res) => {
                            const fullRes = reservations.find((r) => r._id === res._id);
                            if (fullRes) {
                              setSelectedReservation(fullRes);
                              setIsEditMode(false);
                              setIsCreateModal(false);
                              setActionError(null);
                            }
                          }}
                          onClickSlot={(day, time) => {
                            openCreateForSlot(day, time);
                          }}
                          onClickDay={(day) => {
                            setSelectedDate(day);
                          }}
                        />
                      </NeonCard>
                    </>
                  ) : activeSection === "reservas" ? (
                    <NeonCard className="p-4 sm:p-6 reveal">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-300">Módulo de reservas</p>
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
                  <section className="grid grid-cols-1 gap-6 lg:grid-cols-3" ref={businessRef}>
                    {/* Business Info Widget */}
                    <BusinessInfoWidget
                      businessName={clientProfile.branding.businessName}
                      stats={{
                        total: metrics.total,
                        next24h: upcoming24h,
                        thisWeek: weekReservationsCount,
                      }}
                      nextWorkingDate={nextWorkingDate ? formatDateDisplay(nextWorkingDate) : undefined}
                      error={fetchError}
                      loading={loadingData}
                      className="reveal"
                    />

                    {/* Schedule Info Widget */}
                    <ScheduleInfoWidget
                      openTime={scheduleHours.open}
                      closeTime={scheduleHours.close}
                      slotMinutes={scheduleHours.slotMinutes}
                      isClosed={isSelectedDayClosed}
                      className="reveal"
                    />

                    {/* Day Agenda Widget */}
                    {(() => {
                      const todayAgenda = buildDayAgenda(
                        today,
                        clientProfile.hours ?? DEFAULT_HOURS,
                        reservationsForToday as any,
                        clientProfile.staff,
                      );
                      return (
                        <DayAgendaWidget
                          dateFormatted={formatDateDisplay(today)}
                          dayName={dayFormatter.format(today)}
                          slots={todayAgenda.slots.map(slot => ({
                            time: slot.time,
                            reservations: slot.reservations.map((r: any) => ({
                              _id: r._id,
                              name: r.name,
                              serviceName: r.serviceName || serviceMap.get(r.serviceId ?? "")?.name,
                              staffName: r.staffName,
                              status: r.status,
                              time: r.time,
                              endTime: r.endTime,
                            })),
                          }))}
                          isClosed={todayAgenda.closed}
                          error={fetchError}
                          onReservationClick={(res) => {
                            const fullRes = reservations.find((r) => r._id === res._id);
                            if (fullRes) {
                              setSelectedReservation(fullRes);
                              setIsEditMode(false);
                              setIsCreateModal(false);
                              setActionError(null);
                            }
                          }}
                          className="reveal"
                        />
                      );
                    })()}
                  </section>

                  {clientProfile.features.reservations ? (
                    <ReservationLogWidget
                      reservations={reservations.map((r) => ({
                        _id: r._id,
                        name: r.name,
                        phone: r.phone,
                        serviceName: r.serviceName,
                        staffName: r.staffName,
                        time: r.time,
                        dateId: r.dateId,
                        status: r.status,
                        createdAt: r.createdAt,
                      }))}
                      loading={loadingData}
                      error={fetchError}
                      onViewDetail={(res) => {
                        const fullRes = reservations.find((r) => r._id === res._id);
                        if (fullRes) {
                          setSelectedReservation(fullRes);
                          setIsEditMode(false);
                          setIsCreateModal(false);
                          setActionError(null);
                        }
                      }}
                      className="reveal"
                    />
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6">
                      <p className="text-sm text-slate-300">
                        Este negocio no tiene activado el módulo de reservas. Actívalo para ver la bitácora.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>

        {(selectedReservation || isCreateModal || isEditMode) && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur"
            onClick={(e) => {
              // Close modal when clicking on backdrop (not on modal content)
              if (e.target === e.currentTarget) {
                setSelectedReservation(null);
                setIsEditMode(false);
                setIsCreateModal(false);
                setActionError(null);
              }
            }}
          >
            <div
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 p-6 shadow-[0_30px_120px_-50px_rgba(59,130,246,0.9)]"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              <div className="pointer-events-none absolute inset-0 opacity-30">
                <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/25 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />
              </div>

              {/* Close button in top right corner */}
              <button
                className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
                onClick={() => {
                  setSelectedReservation(null);
                  setIsEditMode(false);
                  setIsCreateModal(false);
                  setActionError(null);
                }}
                type="button"
                title="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-indigo-200/70">Agenda</p>
                    <h3 className="text-xl font-semibold text-white">
                      {isCreateModal ? "Crear turno" : isEditMode ? "Editar reserva" : "Detalle de reserva"}
                    </h3>
                  </div>
                </div>

                {actionError ? <p className="relative mt-3 text-sm text-rose-200">{actionError}</p> : null}

                {isCreateModal || isEditMode ? (
                  <div className="relative mt-5 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <DateInput
                        label="Fecha"
                        value={createForm.dateId}
                        onChange={(value) => setCreateForm((prev) => ({ ...prev, dateId: value }))}
                      />
                      <TimeInput
                        label="Hora"
                        value={createForm.time}
                        onChange={(value) => setCreateForm((prev) => ({ ...prev, time: value }))}
                      />
                    </div>
                    <FormField label="Nombre del cliente">
                      <Input
                        value={createForm.name}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </FormField>
                    <FormField label="Teléfono">
                      <PhoneInput
                        value={createForm.phone}
                        onChange={(phone) => setCreateForm((prev) => ({ ...prev, phone }))}
                        defaultCountry="CO"
                        placeholder="300 123 4567"
                      />
                    </FormField>
                    <FormField label="Servicio">
                      <Select
                        value={createForm.serviceId}
                        onChange={(e) => {
                          const selected = (servicesData as any[])?.find((s) => s.id === e.target.value);
                          setCreateForm((prev) => ({
                            ...prev,
                            serviceId: selected?.id ?? "",
                            serviceName: selected?.name ?? "",
                          }));
                        }}
                      >
                        <option value="">Sin asignar</option>
                        {(servicesData as any[])?.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                            {service.price ? ` · $${service.price.toLocaleString("es-CO")}` : ""}
                            {service.durationMinutes ? ` · ${service.durationMinutes} min` : ""}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Staff (opcional)">
                      <Select
                        value={createForm.staffId}
                        onChange={(e) => {
                          const selected = activeStaff.find((s) => s.id === e.target.value);
                          setCreateForm((prev) => ({
                            ...prev,
                            staffId: selected?.id ?? "",
                            staffName: selected?.name ?? "",
                          }));
                        }}
                      >
                        <option value="">Sin asignar</option>
                        {(() => {
                          // Filter staff by service capability
                          const capableStaff = createForm.serviceId
                            ? getCapableStaff(activeStaff, createForm.serviceId)
                            : activeStaff;

                          return capableStaff.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name} {member.role ? `- ${member.role}` : ""}
                            </option>
                          ));
                        })()}
                      </Select>
                      {createForm.serviceId && (() => {
                        const capableCount = getCapableStaff(activeStaff, createForm.serviceId).length;
                        const totalCount = activeStaff.length;
                        if (capableCount < totalCount && capableCount > 0) {
                          return (
                            <p className="text-xs text-amber-400 mt-1">
                              {capableCount} de {totalCount} empleados pueden realizar este servicio
                            </p>
                          );
                        } else if (capableCount === 0 && totalCount > 0) {
                          return (
                            <p className="text-xs text-rose-400 mt-1">
                              Ningún empleado tiene asignado este servicio
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </FormField>

                    {/* Duration and end time preview */}
                    {createForm.serviceId && (() => {
                      const selectedService = (servicesData as any[])?.find((s: any) => s.id === createForm.serviceId);
                      if (selectedService?.durationMinutes) {
                        const endTime = calculateEndTime(createForm.time, selectedService);
                        return (
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                            <div className="flex items-center justify-between text-slate-300">
                              <span>Duración: <span className="text-white font-medium">{formatDuration(selectedService.durationMinutes)}</span></span>
                              <span>Fin: <span className="text-indigo-300 font-medium">{endTime}</span></span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsCreateModal(false);
                          setIsEditMode(false);
                          setActionError(null);
                        }}
                      >
                        Cerrar
                      </Button>
                      <SaveButton
                        onClick={isEditMode ? handleUpdateReservation : handleCreateReservation}
                        labelIdle={isEditMode ? "Guardar cambios" : "Guardar turno"}
                        labelLoading="Guardando..."
                        labelSuccess="Guardado ✓"
                      />
                    </div>
                  </div>
                ) : selectedReservation ? (
                  <div className="relative mt-5">
                    {/* Customer name and service header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-bold text-white truncate">
                          {selectedReservation.name}
                        </h4>
                        <p className="text-sm text-indigo-300 mt-0.5">
                          {selectedReservation.serviceName ||
                            serviceMap.get(selectedReservation.serviceId ?? "")?.name ||
                            "Sin servicio asignado"}
                        </p>
                      </div>
                      {/* Status badge */}
                      <span className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${selectedReservation.status === "Confirmada"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                        : selectedReservation.status === "Pendiente"
                          ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                          : selectedReservation.status === "Cancelada"
                            ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
                            : "bg-white/10 text-slate-300 border-white/20"
                        }`}>
                        {selectedReservation.status}
                      </span>
                    </div>

                    {/* Detail grid */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Date & Time Card */}
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 mb-2">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                          Fecha y Hora
                        </div>
                        <p className="text-lg font-semibold text-white">
                          {formatDateDisplay(selectedReservation.dateId)}
                        </p>
                        <p className="text-2xl font-bold text-indigo-300 mt-1">
                          {selectedReservation.time}
                          {(() => {
                            const svc = serviceMap.get(selectedReservation.serviceId ?? "");
                            const duration = svc?.durationMinutes || selectedReservation.durationMinutes;
                            if (duration && selectedReservation.time) {
                              const [h, m] = selectedReservation.time.split(":").map(Number);
                              const endMins = h * 60 + m + duration;
                              const endH = Math.floor(endMins / 60).toString().padStart(2, "0");
                              const endM = (endMins % 60).toString().padStart(2, "0");
                              return <span className="text-lg font-medium text-slate-400"> — {endH}:{endM}</span>;
                            }
                            return null;
                          })()}
                        </p>
                      </div>

                      {/* Service Details Card */}
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 mb-2">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                          </svg>
                          Servicio
                        </div>
                        {(() => {
                          const svc = serviceMap.get(selectedReservation.serviceId ?? "");
                          const price = svc?.price ?? selectedReservation.servicePrice;
                          const duration = svc?.durationMinutes || selectedReservation.durationMinutes;
                          return (
                            <>
                              {price ? (
                                <p className="text-2xl font-bold text-emerald-400">{formatCOP(price)}</p>
                              ) : (
                                <p className="text-lg text-slate-400">Sin precio</p>
                              )}
                              {duration && (
                                <p className="text-sm text-slate-300 mt-1">
                                  Duración: <span className="font-medium text-white">{duration} min</span>
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Contact Card */}
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 mb-2">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                          Contacto
                        </div>
                        <p className="text-lg font-semibold text-white">{selectedReservation.phone}</p>
                        {selectedReservation.staffName && (
                          <p className="text-sm text-slate-300 mt-1">
                            Atendido por: <span className="font-medium text-indigo-300">{selectedReservation.staffName}</span>
                          </p>
                        )}
                      </div>

                      {/* Metadata Card */}
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 mb-2">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                          </svg>
                          Información
                        </div>
                        <p className="text-sm text-slate-300">
                          ID: <span className="font-mono text-xs text-slate-400">{selectedReservation._id.slice(-8)}</span>
                        </p>
                        {selectedReservation.createdAt && (
                          <p className="text-sm text-slate-300 mt-1">
                            Creado: <span className="text-white">{formatDateDisplay(selectedReservation.createdAt)}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-6 border-t border-white/10 mt-6 space-y-4">
                      {/* Primary Actions - Confirm/No-Show (only for Pendiente) */}
                      {selectedReservation.status === "Pendiente" && (
                        <div className="flex gap-3">
                          <button
                            className="flex-1 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-green-500/20 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:from-emerald-500/30 hover:to-green-500/30 shadow-lg shadow-emerald-500/10"
                            onClick={handleConfirmReservationStatus}
                            type="button"
                          >
                            ✓ Confirmar servicio
                          </button>
                          <button
                            className="flex-1 rounded-xl border border-rose-400/40 bg-gradient-to-r from-rose-500/20 to-pink-500/20 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:from-rose-500/30 hover:to-pink-500/30 shadow-lg shadow-rose-500/10"
                            onClick={handleNoShowStatus}
                            type="button"
                          >
                            ✗ No se presentó
                          </button>
                        </div>
                      )}

                      {/* Secondary Actions */}
                      <div className="flex justify-between items-center">
                        <button
                          className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
                          onClick={() => handleDeleteReservation(selectedReservation._id, selectedReservation)}
                          type="button"
                        >
                          Eliminar
                        </button>
                        <button
                          className="rounded-xl border border-indigo-400/40 bg-gradient-to-r from-indigo-500/20 to-sky-500/20 px-5 py-2 text-sm font-semibold text-indigo-100 transition hover:from-indigo-500/30 hover:to-sky-500/30 shadow-lg shadow-indigo-500/10"
                          onClick={() => {
                            if (!selectedReservation) return;
                            setCreateForm({
                              dateId: selectedReservation.dateId,
                              time: selectedReservation.time,
                              name: selectedReservation.name,
                              phone: selectedReservation.phone,
                              serviceName: selectedReservation.serviceName,
                              serviceId: selectedReservation.serviceId ?? "",
                              staffId: selectedReservation.staffId ?? "",
                              staffName: selectedReservation.staffName ?? "",
                            });
                            setIsEditMode(true);
                            setIsCreateModal(false);
                          }}
                          type="button"
                        >
                          Editar reserva
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )
        }

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
    </ServiceEndNotificationProvider>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  tone?: "emerald" | "amber" | "rose";
};

const CalendarIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M4.5 9.75h15" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 21h9a2.25 2.25 0 0 0 2.25-2.25V7.5A2.25 2.25 0 0 0 16.5 5.25h-9A2.25 2.25 0 0 0 5.25 7.5v11.25A2.25 2.25 0 0 0 7.5 21Z"
    />
  </svg>
);

const ClockIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

function StatCard({ label, value, tone }: StatCardProps) {
  const colors =
    tone === "emerald"
      ? "bg-emerald-400/15 text-emerald-100 border-emerald-300/30"
      : tone === "amber"
        ? "bg-amber-400/15 text-amber-100 border-amber-300/30"
        : tone === "rose"
          ? "bg-rose-400/15 text-rose-100 border-rose-300/30"
          : "bg-white/5 text-white border-white/10";

  return (
    <div className={`rounded-xl border ${colors} p-3 min-w-0`}>
      <p className="text-[11px] uppercase tracking-wide break-words leading-tight">{label}</p>
      <p className="text-2xl font-semibold leading-tight mt-1">{value}</p>
    </div>
  );
}










