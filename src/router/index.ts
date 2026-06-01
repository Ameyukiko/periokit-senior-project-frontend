import { createRouter, createWebHistory } from "vue-router";
import RegisterView from "../views/RegisterView.vue";
import LoginView from "../views/LoginView.vue";
import { getAccessToken } from "../services/token-storage";

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
      name: "patient-list",
      component: () => import("../views/PatientListView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/chart",
      name: "chart",
      component: () => import("../views/PeriodontalChartPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin/dashboard",
      name: "admin-dashboard",
      component: () => import("../views/AdminDashboardView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/",
      redirect: "/login",
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const token = getAccessToken();
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);

  if (requiresAuth && !token) {
    // If route requires auth and there's no token, redirect to login
    next({ name: "login" });
  } else if (requiresGuest && token) {
    // If route is for guests only and there's a token, redirect to patient-list
    next({ name: "patient-list" });
  } else {
    // Otherwise, proceed
    next();
  }
});

export default router;
