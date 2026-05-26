const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";


export function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export function setCookie(name, value, seconds) {
  let expires = "";
  if (seconds) {
    const date = new Date();
    date.setTime(date.getTime() + (seconds * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

export function eraseCookie(name) {
  document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
}

const API = {
  async post(path, body) {
    const token = getCookie("medhidex_token");
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
    const token = getCookie("medhidex_token");
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
