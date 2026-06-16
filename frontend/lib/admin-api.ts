import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5062';

// ── Chaves localStorage ───────────────────────────────────────────────────────
export const ADMIN_STORAGE = {
  TOKEN:           'ae_admin_token',
  REFRESH:         'ae_admin_refresh',
  USER:            'ae_admin_user',
  MUST_CHANGE_PWD: 'ae_admin_must_change_pwd',
} as const;

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface AdminUser {
  systemUserId: string;
  name:         string;
  email:        string;
  role:         'Admin' | 'Promoter';
  promoterCode?: string;
  mustChangePassword: boolean;
}

export interface AdminLoginResult {
  accessToken:        string;
  refreshToken:       string;
  role:               'Admin' | 'Promoter';
  systemUserId:       string;
  name:               string;
  email:              string;
  promoterCode?:      string;
  mustChangePassword: boolean;
}

export interface AdminSummary {
  totalEstablishments: number;
  newThisMonth:        number;
  newLastMonth:        number;
  mrrEstimate:         number;
  totalRevenue:        number;
  totalBookings:       number;
  totalBookingsThisMonth: number;
  totalPromoters:      number;
  activePromoters:     number;
  totalCommissionsOwed: number;
  establishmentsByCategory: Record<string, number>;
  topPromotersThisMonth: TopPromoterDto[];
  topPromotersAllTime:   TopPromoterDto[];
  recentEstablishments:  RecentEstablishmentDto[];
}

export interface TopPromoterDto {
  id:           string;
  name:         string;
  promoterCode: string | null;
  conversions:  number;
  commission:   number;
}

export interface RecentEstablishmentDto {
  id:           string;
  name:         string;
  slug:         string;
  category:     string;
  createdAt:    string;
  referralCode: string | null;
}

export interface FinancialReport {
  year:             number;
  monthlyRevenue:   MonthlyRevenueDto[];
  totalRevenue:     number;
  totalCommissions: number;
  netRevenue:       number;
}

export interface MonthlyRevenueDto {
  month:                number;
  monthName:            string;
  revenue:              number;
  commissions:          number;
  newEstablishments:    number;
}

export interface PagedEstablishments {
  items:      EstablishmentAdminDto[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

export interface EstablishmentAdminDto {
  id:           string;
  tenantId:     string;
  name:         string;
  slug:         string;
  category:     string;
  phone:        string;
  contactEmail: string | null;
  isActive:     boolean;
  referralCode: string | null;
  currentPlan:  string | null;
  totalRevenue: number;
  totalBookings: number;
  createdAt:    string;
}

export interface PromoterListDto {
  id:                   string;
  name:                 string;
  email:                string;
  promoterCode:         string | null;
  commissionPercent:    number;
  isActive:             boolean;
  mustChangePassword:   boolean;
  totalConversions:     number;
  totalCommission:      number;
  conversionsThisMonth: number;
  commissionThisMonth:  number;
  createdAt:            string;
}

export interface PromoterStats {
  id:                 string;
  name:               string;
  email:              string;
  promoterCode:       string | null;
  commissionPercent:  number;
  isActive:           boolean;
  mustChangePassword: boolean;
  totalConversions:   number;
  totalCommission:    number;
  conversions:        PromoterConversionDto[];
  monthlyStats:       MonthlyPromoterStatsDto[];
}

export interface PromoterConversionDto {
  establishmentId:   string;
  establishmentName: string;
  plan:              string;
  planAmount:        number;
  commissionAmount:  number;
  convertedAt:       string;
}

export interface MonthlyPromoterStatsDto {
  year:        number;
  month:       number;
  monthName:   string;
  conversions: number;
  commission:  number;
}

export interface InvitePromoterResult {
  tempPassword: string;
  promoterCode: string;
  email:        string;
}

// ── Axios instance com auto-refresh ──────────────────────────────────────────
let adminAxios: AxiosInstance | null = null;

function getAdminAxios(): AxiosInstance {
  if (adminAxios) return adminAxios;

  const instance = axios.create({ baseURL: BASE_URL });

  // Injeta token em cada request
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(ADMIN_STORAGE.TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Auto-refresh em 401
  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        try {
          const refreshToken = localStorage.getItem(ADMIN_STORAGE.REFRESH);
          const user         = JSON.parse(localStorage.getItem(ADMIN_STORAGE.USER) ?? '{}') as AdminUser;
          const { data } = await axios.post<AdminLoginResult>(`${BASE_URL}/api/system/auth/refresh`, {
            systemUserId: user.systemUserId,
            refreshToken,
          });
          localStorage.setItem(ADMIN_STORAGE.TOKEN,   data.accessToken);
          localStorage.setItem(ADMIN_STORAGE.REFRESH, data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return instance(original);
        } catch {
          // refresh falhou → logout
          Object.values(ADMIN_STORAGE).forEach((k) => localStorage.removeItem(k));
          window.location.href = '/admin-login';
        }
      }
      return Promise.reject(error);
    }
  );

  adminAxios = instance;
  return instance;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function adminLogin(email: string, password: string): Promise<AdminLoginResult> {
  const { data } = await axios.post<AdminLoginResult>(`${BASE_URL}/api/system/auth/login`, { email, password });
  return data;
}

// ── Admin endpoints ───────────────────────────────────────────────────────────
export const adminApi = {
  getSummary: () =>
    getAdminAxios().get<AdminSummary>('/api/system/admin/summary').then((r) => r.data),

  getFinancialReport: (year: number) =>
    getAdminAxios().get<FinancialReport>(`/api/system/admin/financial/${year}`).then((r) => r.data),

  getEstablishments: (params?: { search?: string; category?: string; plan?: string; page?: number; pageSize?: number }) =>
    getAdminAxios().get<PagedEstablishments>('/api/system/admin/establishments', { params }).then((r) => r.data),

  getPromoters: (params?: { search?: string; activeOnly?: boolean }) =>
    getAdminAxios().get<PromoterListDto[]>('/api/system/admin/promoters', { params }).then((r) => r.data),

  getPromoterStats: (id: string) =>
    getAdminAxios().get<PromoterStats>(`/api/system/admin/promoters/${id}`).then((r) => r.data),

  invitePromoter: (data: { name: string; email: string; commissionPercent: number }) =>
    getAdminAxios().post<InvitePromoterResult>('/api/system/admin/promoters/invite', data).then((r) => r.data),

  setCommission: (id: string, commissionPercent: number) =>
    getAdminAxios().patch(`/api/system/admin/promoters/${id}/commission`, { commissionPercent }),

  togglePromoterStatus: (id: string) =>
    getAdminAxios().patch<{ isActive: boolean }>(`/api/system/admin/promoters/${id}/toggle`).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    getAdminAxios().patch('/api/system/admin/change-password', { currentPassword, newPassword }),

  setInitialPassword: (newPassword: string) =>
    getAdminAxios().post('/api/system/admin/set-initial-password', { newPassword }),

  activatePlan: (establishmentId: string, plan: string, externalPaymentId?: string) =>
    getAdminAxios()
      .post<{ paymentId: string; plan: string; amount: number }>(
        `/api/system/admin/establishments/${establishmentId}/activate-plan`,
        { plan, externalPaymentId }
      )
      .then((r) => r.data),

  getPlans: () =>
    getAdminAxios()
      .get<{ id: string; label: string; price: number; profissionaisLimit: number; servicosLimit: number }[]>(
        '/api/system/admin/plans'
      )
      .then((r) => r.data),
};

// ── Comunicados (Admin) ───────────────────────────────────────────────────────

export interface AnnouncementAdminDto {
  id:            string;
  title:         string;
  body:          string;
  severity:      'Novidade' | 'Info' | 'Aviso' | 'Urgente';
  target:        'Todos' | 'Basico' | 'Profissional';
  startsAt:      string;
  endsAt:        string;
  actionLabel:   string | null;
  actionUrl:     string | null;
  isDismissible: boolean;
  isActive:      boolean;
  createdAt:     string;
  updatedAt:     string;
}

export interface UpsertAnnouncementPayload {
  title:         string;
  body:          string;
  severity:      string;
  target:        string;
  startsAt:      string;
  endsAt:        string;
  actionLabel?:  string | null;
  actionUrl?:    string | null;
  isDismissible: boolean;
  isActive:      boolean;
}

export const announcementsAdminApi = {
  list: () =>
    getAdminAxios()
      .get<AnnouncementAdminDto[]>('/api/system/admin/announcements/')
      .then((r) => r.data),

  create: (data: UpsertAnnouncementPayload) =>
    getAdminAxios()
      .post<AnnouncementAdminDto>('/api/system/admin/announcements/', {
        id: null,
        ...data,
      })
      .then((r) => r.data),

  update: (id: string, data: UpsertAnnouncementPayload) =>
    getAdminAxios()
      .put<AnnouncementAdminDto>(`/api/system/admin/announcements/${id}`, data)
      .then((r) => r.data),

  remove: (id: string) =>
    getAdminAxios().delete(`/api/system/admin/announcements/${id}`),
};

// ── Promoter endpoints ────────────────────────────────────────────────────────
export const promoterApi = {
  getStats: () =>
    getAdminAxios().get<PromoterStats>('/api/system/promoter/stats').then((r) => r.data),

  setInitialPassword: (newPassword: string) =>
    getAdminAxios().post('/api/system/promoter/set-initial-password', { newPassword }),

  changePassword: (currentPassword: string, newPassword: string) =>
    getAdminAxios().patch('/api/system/promoter/change-password', { currentPassword, newPassword }),
};
