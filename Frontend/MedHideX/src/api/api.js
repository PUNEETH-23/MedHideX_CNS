const API_BASE_URL = "http://127.0.0.1:8000";

const API = {
  async post(path, body) {
    const token = localStorage.getItem("medhidex_token");
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body,
    });

    return {
      data: await response.json(),
      status: response.status,
    };
  },

  async get(path) {
    const token = localStorage.getItem("medhidex_token");
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers,
    });

    return {
      data: await response.json(),
      status: response.status,
    };
  },

  fileUrl(path) {
    return `${API_BASE_URL}${path}`;
  },
};

export default API;
