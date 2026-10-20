import { createRouter, createWebHistory } from "vue-router";
import RegisterView from "../views/RegisterView.vue";
import LoginView from "../views/LoginView.vue";
import { getAccessToken } from "../services/token-storage";
import { useAuthStore } from "../stores/auth";

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresGuest?: boolean;
    /** UX gate only; the backend authorizes every admin request. */
    requiresRole?: string[];
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/register",
      name: "register",
      component: RegisterView,
      meta: { requiresGuest: true },
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { requiresGuest: true },
    },
    {
      path: "/patients",
      name: "my-patients",
      component: () => import("../views/MyPatientListView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/patients/:patientId/visits",
      name: "patient-visits",
      component: () => import("../views/PatientVisitHistoryView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/chart",
      name: "chart",
      component: () => import("../views/PeriodontalChartPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/diagnosis",
      name: "diagnosis",
      component: () => import("../views/DiagnosisView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/compare-charts",
      name: "compare-charts",
      component: () => import("../views/CompareChartsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("../views/AdminDashboardView.vue"),
      meta: { requiresAuth: true, requiresRole: ["admin", "super_admin"] },
    },
    {
      path: "/admin/activity-log",
      name: "admin-activity-log",
      component: () => import("../views/AdminActivityLogView.vue"),
      meta: { requiresAuth: true, requiresRole: ["super_admin"] },
    },

    {
      path: "/",
      redirect: "/patients",
    },
  ],
});

router.beforeEach(async (to) => {
  const token = getAccessToken();
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);
  const allowedRoles = to.matched.flatMap((record) => record.meta.requiresRole ?? []);

  if (requiresAuth && !token) return { name: "login" };
  if (requiresGuest && token) return { name: "my-patients" };

  if (allowedRoles.length) {
    // Re-read the role from GET /auth/me so a stale stored profile cannot open the page.
    const authStore = useAuthStore();
    await authStore.fetchProfile();
    if (!authStore.isAuthenticated) return { name: "login" };
    if (!allowedRoles.includes(authStore.user?.role ?? "")) return { name: "my-patients" };
  }
  return true;
});

export default router;
