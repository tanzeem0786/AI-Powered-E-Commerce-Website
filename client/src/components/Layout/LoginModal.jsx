import React, { useState, useEffect, useRef } from "react";
import { X, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useDispatch } from "react-redux";
import { login } from "../../store/slices/authSlice.js";
import { toggleAuthPopup } from "../../store/slices/popupSlice.js";


const LoginModal = ({ isOpen = false }) => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);

  
  useEffect(() => {
    if (isOpen) {
      setError("");
      setPassword("");
    }
  }, [isOpen]);
  
  if (!isOpen) return;

  const validate = () => {
    if (!email) {
      setError("Please enter your email.");
      return false;
    }
    if (!password) {
      setError("Please enter your password.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await dispatch(login({ email, password, remember }));
      isOpen = false;
    } catch (err) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"

      aria-modal="true"
      role="dialog"
      aria-label="Login dialog"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />

      <div
        ref={modalRef}
        className="relative z-50 w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Sign in to your account</h3>
          <button
            onClick={dispatch(toggleAuthPopup())}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="mb-4 text-sm text-gray-600">
            Welcome back! Enter your details to continue.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="sr-only">Email</span>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300">
                <Mail size={16} className="text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border-0 bg-transparent text-sm outline-none"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="sr-only">Password</span>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300">
                <Lock size={16} className="text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border-0 bg-transparent text-sm outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="ml-2 inline-flex items-center rounded-md p-1 text-gray-500 hover:bg-gray-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-600">Remember me</span>
              </label>

              <button type="button" className="text-indigo-600 hover:underline text-sm">
                Forgot password?
              </button>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <div className="text-xs uppercase text-gray-400">or</div>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 12.5v8.6h12.9C35.8 30.9 30.4 34 24 34c-7.7 0-14-6.3-14-14s6.3-14 14-14c3.7 0 7 .1 10.1 1.9z" /></svg>
                <span className="text-sm">Google</span>
              </button>

              <button type="button" className="flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24"><path fill="#1877F2" d="M22 12a10 10 0 10-11.5 9.9v-7h-2v-3h2v-2.2c0-2 1.2-3.1 3-3.1.9 0 1.8.1 1.8.1v2h-1c-1 0-1.3.6-1.3 1.2V12h2.3l-.4 3h-1.9v7A10 10 0 0022 12z" /></svg>
                <span className="text-sm">Facebook</span>
              </button>
            </div>
          </form>
        </div>

        <div className="border-t px-6 py-4 text-center text-sm text-gray-600">
          New here? <button onClick={() => { }} className="text-indigo-600 hover:underline">Create an account</button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
