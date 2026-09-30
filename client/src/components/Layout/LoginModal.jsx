import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, X } from "lucide-react";
import { forgotPassword, login, register } from "../../store/slices/authSlice.js";
import { closeAuthPopup } from "../../store/slices/popupSlice.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMessage = "Password must be between 8 and 16 characters.";

const LoginModal = () => {
  const dispatch = useDispatch();
  const { isAuthPopupOpen } = useSelector((state) => state.popup);
  const { authUser, isCheckingAuth, isLoggingIn, isSigningUp, isRequestingForToken } =
    useSelector((state) => state.auth);
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (isAuthPopupOpen) {
      setMode("login");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setError("");
      setResetSent(false);
      setShowPassword(false);
    }
  }, [isAuthPopupOpen]);

  if (!isAuthPopupOpen || authUser) return null;

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setResetSent(false);
    setPassword("");
    setConfirmPassword("");
  };

  const validateEmail = () => {
    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }
    return true;
  };

  const validatePassword = (value) => {
    if (value.length < 8 || value.length > 16) {
      setError(passwordMessage);
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (mode === "forgot") {
      if (!validateEmail()) return;
      try {
        await dispatch(forgotPassword(email.trim())).unwrap();
        setResetSent(true);
      } catch (message) {
        setError(message);
      }
      return;
    }

    if (!validateEmail()) return;

    if (mode === "register") {
      if (name.trim().length < 3) {
        setError("Name must be at least 3 characters.");
        return;
      }
      if (!validatePassword(password)) return;
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      try {
        await dispatch(register({ name: name.trim(), email: email.trim(), password })).unwrap();
      } catch (message) {
        setError(message);
      }
      return;
    }

    if (!validatePassword(password)) return;
    try {
      await dispatch(login({ email: email.trim(), password })).unwrap();
    } catch (message) {
      setError(message);
    }
  };

  const isLoading = isLoggingIn || isSigningUp || isRequestingForToken;
  const title =
    mode === "register" ? "Create your account" : mode === "forgot" ? "Forgot password?" : "Welcome back";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        type="button"
        aria-label="Close sign in dialog"
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={() => dispatch(closeAuthPopup())}
      />

      <section className="relative z-10 my-auto w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-5 sm:px-8">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">E-Mart account</p>
            <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "register"
                ? "Join us for a smoother shopping experience."
                : mode === "forgot"
                  ? "We’ll email you a link to reset your password."
                  : "Sign in to continue shopping."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatch(closeAuthPopup())}
            aria-label="Close"
            className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-6 sm:px-8">
          {isCheckingAuth ? (
            <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground" role="status">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Restoring your session…
            </div>
          ) : resetSent ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-foreground" role="status">
              <p className="font-semibold text-emerald-600">Reset email sent</p>
              <p className="mt-1 text-muted-foreground">
                Check your inbox for a password reset link. If it doesn’t arrive, check your spam folder.
              </p>
              <button
                type="button"
                onClick={() => changeMode("login")}
                className="mt-4 font-semibold text-primary hover:underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Full name</span>
                  <span className="flex items-center gap-3 rounded-xl border border-input bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring">
                    <UserRound size={18} className="shrink-0 text-muted-foreground" />
                    <input
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      minLength={3}
                      maxLength={100}
                      required
                      placeholder="Your name"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </span>
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Email address</span>
                <span className="flex items-center gap-3 rounded-xl border border-input bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring">
                  <Mail size={18} className="shrink-0 text-muted-foreground" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </span>
              </label>

              {mode !== "forgot" && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Password</span>
                    <span className="flex items-center gap-3 rounded-xl border border-input bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring">
                      <LockKeyhole size={18} className="shrink-0 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={8}
                        maxLength={16}
                        required
                        placeholder="8–16 characters"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                  </label>

                  {mode === "register" && (
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">Confirm password</span>
                      <span className="flex items-center gap-3 rounded-xl border border-input bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring">
                        <LockKeyhole size={18} className="shrink-0 text-muted-foreground" />
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          minLength={8}
                          maxLength={16}
                          required
                          placeholder="Re-enter your password"
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </span>
                    </label>
                  )}

                  {mode === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => changeMode("forgot")}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </>
              )}

              {error && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || isCheckingAuth}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {isLoading
                  ? mode === "register"
                    ? "Creating account…"
                    : mode === "forgot"
                      ? "Sending reset link…"
                      : "Signing in…"
                  : mode === "register"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Sign in"}
              </button>
            </form>
          )}

          {!resetSent && !isCheckingAuth && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "register" ? (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => changeMode("login")} className="font-semibold text-primary hover:underline">
                    Sign in
                  </button>
                </>
              ) : mode === "forgot" ? (
                <button type="button" onClick={() => changeMode("login")} className="font-semibold text-primary hover:underline">
                  Back to sign in
                </button>
              ) : (
                <>
                  New to E-Mart?{" "}
                  <button type="button" onClick={() => changeMode("register")} className="font-semibold text-primary hover:underline">
                    Create an account
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default LoginModal;
