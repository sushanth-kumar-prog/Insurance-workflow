import axios from 'axios';

// VITE_API_URL is set at build time when the API lives on another host
// (e.g. Vercel + Render). Falls back to a relative /api, which is correct for
// local dev (Vite proxy) and for single-origin deployments behind nginx.
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL,
    // Required: the auth cookie is HttpOnly and must ride along cross-origin.
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clean unauthorized state if unhandled
        }
        return Promise.reject(error);
    }
);

export default api;
