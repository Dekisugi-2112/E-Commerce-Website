'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const isRegistered = searchParams.get('registered');
    const paramEmail = searchParams.get('email');
    if (paramEmail) {
      setEmail(paramEmail);
    }
    if (isRegistered === 'true') {
      setSuccessInfo('Đăng ký tài khoản thành công! Vui lòng nhập mật khẩu để đăng nhập.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng điền đầy đủ Email và Mật khẩu');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push('/products');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại email/mật khẩu!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      {/* Laptop Optimized Container (Split 2 Columns) */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Side: Fashion Banner (5 Cols on Laptop) */}
        <div className="hidden lg:flex lg:col-span-5 relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-10 flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Shofy Member Club</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
              Định Hình <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                Phong Cách Thời Trang
              </span>
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              Đăng nhập để lưu danh sách yêu thích, nhận ưu đãi độc quyền và trải nghiệm tính năng AI Stylist cá nhân hóa.
            </p>
          </div>

          <div className="relative z-10 space-y-4 pt-8">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Thanh Toán An Toàn & Bảo Mật</span>
              </div>
              <p className="text-[11px] text-slate-300">Hỗ trợ giao hàng COD toàn quốc & thanh toán VNPay Sandbox nhanh chóng.</p>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              © {new Date().getFullYear()} Shofy Clothing. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form (7 Cols on Laptop) */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Đăng Nhập Tài Khoản</h2>
              <p className="text-xs text-slate-500 mt-1.5">
                Chưa có tài khoản?{' '}
                <Link href="/register" className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-4">
                  Đăng ký ngay
                </Link>
              </p>
            </div>

            {successInfo && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successInfo}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-in fade-in">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Địa chỉ Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Mật khẩu</label>
                  <Link href="/forgot-password" className="text-[11px] font-medium text-slate-400 hover:text-emerald-600">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 absolute right-3.5 top-3"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input type="checkbox" className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5" />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Đang xử lý đăng nhập...</span>
                ) : (
                  <>
                    <span>Đăng nhập ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">Đang tải trang đăng nhập...</div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
