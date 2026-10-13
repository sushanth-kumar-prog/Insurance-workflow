import { useState } from 'react';
import api from '../api/client';

/**
 * PersonaBar — one-click role switcher for demonstrations.
 *
 * Logs in as one of the seeded accounts and reloads so the new role's portal
 * renders. Emails MUST match src/seed.js.
 *
 * DEV ONLY: this embeds a shared demo password and bypasses the login screen.
 * It is gated behind VITE_ENABLE_PERSONA_BAR so it cannot ship enabled.
 */
const ENABLED = import.meta.env.VITE_ENABLE_PERSONA_BAR === 'true';

const PERSONAS = [
  { role: 'CLAIMANT',       label: 'Claimant',       email: 'claimant@example.com',  color: 'bg-blue-500 hover:bg-blue-600',   icon: '🧑',  description: 'Submits & tracks claim' },
  { role: 'HOSPITAL_DESK',  label: 'Hospital Desk',  email: 'desk@example.com',      color: 'bg-teal-500 hover:bg-teal-600',   icon: '🏥',  description: 'Initiates pre-auth' },
  { role: 'VERIFIER',       label: 'Verifier',       email: 'verifier@example.com',   color: 'bg-amber-500 hover:bg-amber-600', icon: '🔍',  description: 'Checks documents' },
  { role: 'MEDICAL_OFFICER',label: 'Medical Officer',email: 'officer@example.com',    color: 'bg-purple-500 hover:bg-purple-600',icon: '👩‍⚕️', description: 'Clinical review' },
  { role: 'APPROVER',       label: 'Approver',       email: 'approver@example.com',   color: 'bg-rose-500 hover:bg-rose-600',   icon: '✅',  description: 'Final approval' },
  { role: 'FINANCE',        label: 'Finance',        email: 'finance@example.com',    color: 'bg-green-500 hover:bg-green-600', icon: '💰',  description: 'Disburses payment' },
];

const SHARED_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'Str0ngPass1';

export default function PersonaBar({ onSwitch }) {
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  // Never render in a production build unless explicitly forced on.
  if (!ENABLED && import.meta.env.PROD) return null;

  async function switchTo(persona) {
    if (loading) return;
    setError('');
    setLoading(persona.role);
    try {
      await api.post(
        '/auth/login',
        { email: persona.email, password: SHARED_PASSWORD },
        { withCredentials: true }
      );
      setActive(persona.role);
      if (onSwitch) onSwitch(persona);
      setTimeout(() => window.location.reload(), 300);
    } catch (err) {
      // The API returns `error`, not `message`.
      const msg = err.response?.data?.error || 'Login failed – is the backend running? Did you run npm run seed?';
      setError(`${persona.label}: ${msg}`);
      setLoading(null);
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700 shadow-lg">
      <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
        <span className="text-gray-400 text-xs font-semibold whitespace-nowrap mr-2 shrink-0">
          👤 Switch role:
        </span>

        {PERSONAS.map((p) => {
          const isActive = active === p.role;
          const isLoading = loading === p.role;

          return (
            <button
              key={p.role}
              onClick={() => switchTo(p)}
              disabled={!!loading}
              title={p.description}
              className={`
                flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-medium
                transition-all duration-150 shrink-0 whitespace-nowrap
                ${p.color}
                ${isActive ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''}
                ${isLoading ? 'opacity-75 cursor-wait' : ''}
                ${loading && !isLoading ? 'opacity-40 cursor-not-allowed' : ''}
              `}
            >
              <span>{isLoading ? '⏳' : p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}

        {error && (
          <span className="ml-3 text-red-400 text-xs bg-red-900/40 px-2 py-1 rounded whitespace-nowrap">
            ⚠ {error}
          </span>
        )}
      </div>
    </div>
  );
}
