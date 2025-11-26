const getFallbackApiBase = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5000/api';
};

const raw = process.env.REACT_APP_API_URL || getFallbackApiBase();
const sanitized = raw.endsWith('/') ? raw.slice(0, -1) : raw;

export const API_BASE_URL = sanitized;


  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5000/api';
};

const raw = process.env.REACT_APP_API_URL || getFallbackApiBase();
const sanitized = raw.endsWith('/') ? raw.slice(0, -1) : raw;

export const API_BASE_URL = sanitized;


