import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { resetPassword } from "../store/slices/authSlice.js";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isUpdatingPassword, authUser } = useSelector((state) => state.auth);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8 || password.length > 16) {
      setError("Password must be between 8 and 16 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await dispatch(resetPassword({ token, password, confirmPassword })).unwrap();
      setIsComplete(true);
    } catch (message) {
      setError(message);
    }
  };

  return (
    <main className="flex min-h-[75vh] items-center justify-center px-4 py-24">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-2xl sm:p-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft size={16} />
          Back to store
        </Link>

        {isComplete ? (
          <div className="py-5 text-center" role="status">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <ShieldCheck size={28} />
            </span>
            <h1 className="text-2xl font-bold">Password updated</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been changed{authUser?.name ? `, ${authUser.name}` : ""}. You’re signed in and can continue shopping.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90"
            >
              Continue to store
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Account security</p>
            <h1 className="text-2xl font-bold">Set a new password</h1>
            <p className="mt-2 text-sm text-muted-foreground">Choose a strong password between 8 and 16 characters.</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">New password</span>
                <span className="flex items-center gap-3 rounded-xl border border-input bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring">
                  <LockKeyhole size={18} className="shrink-0 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    maxLength={16}
                    autoComplete="new-password"
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

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Confirm new password</span>
                <span className="flex items-center gap-3 rounded-xl border border-input bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring">
                  <LockKeyhole size={18} className="shrink-0 text-muted-foreground" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    maxLength={16}
                    autoComplete="new-password"
                    required
                    placeholder="Re-enter your password"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </span>
              </label>

              {error && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingPassword && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {isUpdatingPassword ? "Updating password…" : "Reset password"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
};

export default ResetPassword;
