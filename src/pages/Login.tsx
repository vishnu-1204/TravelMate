import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PageTransition from "@/components/layout/PageTransition";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Enter valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) setError("Invalid login credentials");
      else navigate("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#6b6678] flex items-center justify-center p-6">

        {/* Main Container */}
        <div className="w-full max-w-6xl bg-[#2b2836] rounded-3xl shadow-2xl grid lg:grid-cols-2 overflow-hidden">

          {/* LEFT IMAGE SECTION */}
          <div className="relative hidden lg:block">

            <img
              src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/70 to-black/80" />

            {/* Logo */}
            <h2 className="absolute top-6 left-6 text-white text-xl font-semibold tracking-widest">
              AMU
            </h2>

            {/* Back */}
            <Link
              to="/"
              className="absolute top-6 right-6 px-4 py-2 text-xs bg-white/20 rounded-full backdrop-blur text-white hover:bg-white/30"
            >
              Back to website →
            </Link>

            {/* Bottom Caption */}
            <div className="absolute bottom-14 left-10 text-white">
              <h2 className="text-2xl font-semibold">
                Capturing Moments,
                <br />
                Creating Memories
              </h2>

              <div className="flex gap-2 mt-5">
                <span className="w-6 h-[3px] bg-white/40 rounded-full"></span>
                <span className="w-6 h-[3px] bg-white/40 rounded-full"></span>
                <span className="w-6 h-[3px] bg-white rounded-full"></span>
              </div>
            </div>

          </div>

          {/* RIGHT LOGIN FORM */}
          <div className="p-12 text-white flex flex-col justify-center">

            <h1 className="text-3xl font-semibold mb-2">
              Welcome back
            </h1>

            <p className="text-gray-400 mb-8">
              Don’t have an account?{" "}
              <Link to="/register" className="text-purple-400 hover:underline">
                Sign up
              </Link>
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="inputStyle"
              />

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="inputStyle pr-12"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 transition font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Login"
                )}
              </button>

            </form>

            {/* Social */}
            <div className="mt-8">

              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="flex-1 h-px bg-white/10"></div>
                Or
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">

                <button className="socialBtn">
                  Google
                </button>

                <button className="socialBtn">
                  Apple
                </button>

                <button className="socialBtn">
                  GitHub
                </button>

                
                <button className="socialBtn">
                  Facebook
                </button>

              </div>

            </div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Login;
