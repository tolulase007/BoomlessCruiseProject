// Configuration from environment variables
// These can be set in .env file with VITE_ prefix

const env = import.meta.env as {
  VITE_DESMOS_GRAPH_URL?: string;
  VITE_DESMOS_OPACITY?: string;
  VITE_API_URL?: string;
  VITE_PYTHON_FIDDLE_URL?: string;
};

export const DESMOS_GRAPH_URL = env.VITE_DESMOS_GRAPH_URL || '';
export const DESMOS_OPACITY = parseFloat(env.VITE_DESMOS_OPACITY || '0.15');
export const API_BASE_URL = env.VITE_API_URL || '';

/** Python-Fiddle saved script URL for the "Try the script" tab. Empty = tab hidden. */
export const PYTHON_FIDDLE_URL = env.VITE_PYTHON_FIDDLE_URL ?? 'https://python-fiddle.com/saved/ecdbcb84-0215-4198-bcd9-6487bdbb52b3?run=false';
