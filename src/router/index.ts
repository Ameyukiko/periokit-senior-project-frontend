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
      path: "/compare-charts",
      name: "compare-charts",
      component: () => import("../views/CompareChartsView.vue"),
      meta: { requiresAuth: true },
    },

    {
      path: "/",
      redirect: "/patients",
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
    // If route is for guests only and there's a token, redirect to my-patients
    next({ name: "my-patients" });
  } else {
    // Otherwise, proceed
    next();
  }
});

export default router;
