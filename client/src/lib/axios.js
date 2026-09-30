import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:4000/api/v1"
      : "/",
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isExpectedUnauthenticatedRequest =
      requestUrl.includes("/auth/me") ||
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/logout") ||
      requestUrl.includes("/auth/password/forgot") ||
      requestUrl.includes("/auth/password/reset");

    if (error.response?.status === 401 && !isExpectedUnauthenticatedRequest && typeof window !== "undefined") {
      window.dispatchEvent(new Event("app:unauthorized"));
    }
    if (
      error.response?.status === 403 &&
      /\/(admin|product\/admin|order\/admin)\//.test(requestUrl) &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("app:forbidden"));
    }

    return Promise.reject(error);
  }
);
