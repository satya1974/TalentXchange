import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function solveEquation(payload) {
    const res = await axios.post(`${API_BASE}/solve`, payload, {
        headers: { "Content-Type": "application/json" },
    });
    return res.data;
}

export async function fetchEngineMetrics() {
    const res = await axios.get(`${API_BASE}/metrics`);
    return res.data;
}
