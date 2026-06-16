import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  role: string;
  establishmentId: string;
  slug: string;
  professionalId?: string;
};

export const authApi = {
  login: (login: string, password: string) =>
    api.post<LoginResult>("/api/auth/login", { email: login, password }),
  register: (data: {
    establishmentName: string;
    slug: string;
    category: number;
    phone: string;
    email: string;
    password: string;
    referralCode?: string;
  }) => api.post("/api/auth/register", data),
};

export const bookingsApi = {
  list: (params: {
    establishmentId: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    professionalId?: string;
    status?: number;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => api.get("/api/bookings", { params }),
  get: (id: string) => api.get(`/api/bookings/${id}`),
  createManual: (data: object) => api.post("/api/bookings/manual", data),
  create: (data: object) => api.post("/api/bookings", data),
  updateStatus: (id: string, status: number) =>
    api.patch(`/api/bookings/${id}/status`, status, { headers: { "Content-Type": "application/json" } }),
  delete: (id: string) => api.delete(`/api/bookings/${id}`),
  getSlots: (professionalId: string, serviceId: string, date: string) =>
    api.get("/api/public/slots", { params: { professionalId, serviceId, date } }),
  getDashboardSlots: (professionalId: string, serviceId: string, date: string) =>
    api.get("/api/bookings/slots", { params: { professionalId, serviceId, date } }),
  cancel: (cancelToken: string) => api.post("/api/public/bookings/cancel", { cancelToken }),
};

export const dashboardApi = {
  today: (establishmentId: string) =>
    api.get("/api/dashboard/today", { params: { establishmentId } }),
  week: (establishmentId: string, startDate: string) =>
    api.get("/api/dashboard/week", { params: { establishmentId, startDate } }),
};

export type ProfessionalDto = {
  id: string;
  name: string;
  photoUrl?: string;
  specialty?: string;
  bio?: string;
  isActive: boolean;
  order: number;
  serviceIds: string[];
  cpf?: string;
  whatsApp?: string;
  hasUserAccount: boolean;
};

export type ActivateAccessResult = {
  login: string;
  password: string;
  whatsApp: string;
};

export type UpsertProfessionalResult = {
  id: string;
  isActive: boolean;
  planWarning: string | null;
};

export const professionalsApi = {
  list: (establishmentId: string) =>
    api.get<ProfessionalDto[]>("/api/professionals", { params: { establishmentId } }),
  upsert: (data: object) => api.post<UpsertProfessionalResult>("/api/professionals", data),
  update: (id: string, data: object) => api.put<UpsertProfessionalResult>(`/api/professionals/${id}`, data),
  toggleActive: (id: string) => api.patch<{ isActive: boolean }>(`/api/professionals/${id}/toggle-active`),
  delete: (id: string) => api.delete(`/api/professionals/${id}`),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return api.post<{ photoUrl: string }>(`/api/professionals/${id}/photo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  setServices: (id: string, serviceIds: string[]) =>
    api.put(`/api/professionals/${id}/services`, { serviceIds }),

  // Agenda semanal
  getSchedule: (id: string) =>
    api.get<{ schedule: ScheduleDay[] }>(`/api/professionals/${id}/schedule`),
  updateSchedule: (id: string, schedule: ScheduleDayInput[]) =>
    api.put(`/api/professionals/${id}/schedule`, { schedule }),

  // Bloqueios / ausências
  getBlocks: (id: string) =>
    api.get<{ blocks: ProfessionalBlock[] }>(`/api/professionals/${id}/blocks`),
  createBlock: (id: string, data: CreateBlockInput) =>
    api.post<{ id: string }>(`/api/professionals/${id}/blocks`, data),
  deleteBlock: (profId: string, blockId: string) =>
    api.delete(`/api/professionals/${profId}/blocks/${blockId}`),

  // Acesso do profissional
  activateAccess: (id: string) =>
    api.post<ActivateAccessResult>(`/api/professionals/${id}/access`),
  revokeAccess: (id: string) =>
    api.delete(`/api/professionals/${id}/access`),
};

// ── Tipos de agenda de profissional ──────────────────────────────────────────
export type ScheduleBreak = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
};

export type ScheduleDay = {
  dayOfWeek: number;      // 0=dom … 6=sáb
  estIsOpen: boolean;     // estabelecimento funciona nesse dia?
  estStart: string | null;
  estEnd: string | null;
  isWorking: boolean;     // profissional trabalha nesse dia?
  startTime: string | null;
  endTime: string | null;
  breaks: ScheduleBreak[];
};

export type ScheduleDayInput = {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
  breaks: ScheduleBreak[];
};

export type ProfessionalBlock = {
  id: string;
  dateStart: string;     // "yyyy-MM-dd"
  dateEnd: string | null;
  isFullDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  blockType: string;     // "timeoff" | "vacation" | "other"
};

export type CreateBlockInput = {
  dateStart: string;
  dateEnd?: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
  blockType?: string;
};

export type UpsertServiceResult = {
  id: string;
  isActive: boolean;
  planWarning: string | null;
};

export const servicesApi = {
  list: (establishmentId: string) =>
    api.get("/api/services", { params: { establishmentId } }),
  upsert: (data: object) => api.post<UpsertServiceResult>("/api/services", data),
  update: (id: string, data: object) => api.put<UpsertServiceResult>(`/api/services/${id}`, data),
  toggleActive: (id: string) => api.patch<{ isActive: boolean }>(`/api/services/${id}/toggle-active`),
  delete: (id: string) => api.delete(`/api/services/${id}`),
};

export const clientsApi = {
  list: (params: { establishmentId: string; search?: string; page?: number }) =>
    api.get("/api/clients", { params }),
  get: (id: string) => api.get(`/api/clients/${id}`),
  update: (id: string, data: { notes?: string; email?: string }) =>
    api.put(`/api/clients/${id}`, data),
  bookings: (id: string, page = 1) =>
    api.get(`/api/clients/${id}/bookings`, { params: { page } }),
};

export const reportsApi = {
  revenue: (params: { establishmentId: string; period: string; date: string }) =>
    api.get("/api/reports/revenue", { params }),
  bookings: (params: { establishmentId: string; period: string; date: string }) =>
    api.get("/api/reports/bookings", { params }),
  clients: (params: { establishmentId: string; period: string; date?: string; sortBy?: string; top?: number }) =>
    api.get("/api/reports/clients", { params }),
  professionals: (params: { establishmentId: string; dateFrom: string; dateTo: string }) =>
    api.get("/api/reports/professionals", { params }),
  topProfessionals: (params: { establishmentId: string; period: string; date?: string; sortBy?: string; top?: number }) =>
    api.get("/api/reports/top-professionals", { params }),
};

export type DayHours = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

export const establishmentsApi = {
  getHours: () => api.get<{ hours: DayHours[] }>("/api/establishments/hours"),
  updateHours: (hours: DayHours[]) => api.put("/api/establishments/hours", { hours }),
  getProfile: () => api.get("/api/establishments/profile"),
  updateProfile: (data: object) => api.put("/api/establishments/profile", data),
  getProfessionalAccess: () =>
    api.get<{ allowed: boolean }>("/api/establishments/professional-access"),
  setProfessionalAccess: (allowed: boolean) =>
    api.patch<{ allowed: boolean }>("/api/establishments/professional-access", { allowed }),
};

// ── Portal do Profissional ───────────────────────────────────────────────────
export type ProfScheduleDay = {
  dayOfWeek: number;
  estIsOpen: boolean;
  estStart: string | null;
  estEnd: string | null;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
};

export const professionalPortalApi = {
  getMe: () => api.get("/api/professional/me"),
  updateMe: (data: { name?: string; specialty?: string; bio?: string }) =>
    api.put("/api/professional/me", data),
  getBookings: (params?: { status?: number; dateFrom?: string; dateTo?: string; page?: number }) =>
    api.get("/api/professional/me/bookings", { params }),
  getSchedule: () =>
    api.get<{ schedule: ProfScheduleDay[] }>("/api/professional/me/schedule"),
  getEstablishment: () => api.get("/api/professional/me/establishment"),
  getReport: (period?: string) =>
    api.get("/api/professional/me/report", { params: { period } }),
};

export const publicApi = {
  getPage: (slug: string) =>
    api.get(`/api/public/${slug}`),
  getSlots: (slug: string, serviceId: string, date: string, professionalId?: string | null) =>
    api.get(`/api/public/${slug}/slots`, { params: { serviceId, date, professionalId: professionalId ?? undefined } }),
  createBooking: (slug: string, data: object) =>
    api.post(`/api/public/${slug}/bookings`, data),
  cancelBooking: (cancelToken: string) =>
    api.get(`/api/public/booking/${cancelToken}/cancel`),
  lookupClient: (slug: string, phone: string) =>
    api.get(`/api/public/${slug}/clients/lookup`, { params: { phone } }),
  rescheduleBooking: (cancelToken: string, scheduledAt: string) =>
    api.post(`/api/public/booking/${cancelToken}/reschedule`, { scheduledAt }),
  getAvailableDays: (slug: string, year: number, month: number, serviceId?: string | null, professionalId?: string | null) =>
    api.get<number[]>(`/api/public/${slug}/available-days`, {
      params: {
        year, month,
        serviceId: serviceId ?? undefined,
        professionalId: professionalId ?? undefined,
      },
    }),
  // legado
  getEstablishment: (slug: string) =>
    api.get(`/api/public/establishments/${slug}`),
};

// ── Billing / Planos ─────────────────────────────────────────────────────────
export type AvailablePlanDto = {
  id: string;
  label: string;
  price: number;
  professionalsLimit: number;  // int.MaxValue = ilimitado
  servicesLimit: number;
  isCurrent: boolean;
};

export type PlanStatusDto = {
  currentPlan: string | null;
  currentPlanLabel: string;
  currentPrice: number;
  isActive: boolean;
  expiresAt: string | null;
  professionalsUsed: number;
  professionalsLimit: number;
  servicesUsed: number;
  servicesLimit: number;
  availablePlans: AvailablePlanDto[];
};

export const billingApi = {
  getStatus: () => api.get<PlanStatusDto>("/api/billing/status"),
};

// ── Comunicados ──────────────────────────────────────────────────────────────

export type AnnouncementDto = {
  id: string;
  title: string;
  body: string;
  severity: "Novidade" | "Info" | "Aviso" | "Urgente";
  target: "Todos" | "Basico" | "Profissional";
  startsAt: string;
  endsAt: string;
  actionLabel: string | null;
  actionUrl: string | null;
  isDismissible: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const announcementsApi = {
  getActive: () => api.get<AnnouncementDto[]>("/api/announcements/active"),
};
