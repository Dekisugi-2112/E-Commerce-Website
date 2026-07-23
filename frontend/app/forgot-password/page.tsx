'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Key } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  // States
  const [step, setStep] = useState<'email' | 'reset'>('email'); // 'email' hoặc 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gửi mã xác thực qua email
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');

    if (!email) {
      setError('Vui lòng nhập địa chỉ Email!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchApi<{ success: boolean; message: string; dev_code?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (res.success) {
        setStep('reset');
        // Tiện lợi cho phát triển: Hiển thị mã xác nhận ngay trên giao diện nếu chạy môi trường local
        const devMsg = res.dev_code 
          ? ` (Mã xác thực chạy thử: ${res.dev_code})` 
          : '';
        setSuccessInfo(`Mã xác thực đã được gửi về email của bạn!${devMsg}`);
      } else {
        setError(res.message || 'Gửi mã xác thực thất bại. Vui lòng thử lại!');
      }
    } catch (err: any) {
      setError(err.message || 'Email này chưa được đăng ký trong hệ thống!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xác nhận đổi mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ tất cả thông tin!');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetchApi<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email,
          code,
          new_password: newPassword
        }),
      });

      if (res.success) {
        setSuccessInfo('Đặt lại mật khẩu thành công! Đang chuyển hướng về trang đăng nhập...');
        setError('');
        setTimeout(() => {
          router.push(`/login?email=${encodeURIComponent(email)}`);
        }, 2000);
      } else {
        setError(res.message || 'Mã xác thực không đúng hoặc đã hết hạn!');
      }
    } catch (err: any) {
      setError(err.message || 'Khôi phục mật khẩu thất bại. Vui lòng kiểm tra lại mã xác nhận!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Side: Fashion Banner (5 Cols on Laptop) */}
        <div className="hidden lg:flex lg:col-span-5 relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-10 flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Shofy Member Security</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
              Bảo Mật <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                Tài Khoản Shofy
              </span>
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              Khôi phục quyền truy cập vào tài khoản thời trang của bạn chỉ với một vài bước xác thực email đơn giản.
            </p>
          </div>

          <div className="relative z-10 space-y-4 pt-8">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Quy trình bảo mật 2 lớp</span>
              </div>
              <p className="text-[11px] text-slate-300">Xác thực mã xác nhận dùng một lần (OTP) gửi qua hệ thống để đảm bảo chính chủ.</p>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              © {new Date().getFullYear()} Shofy Clothing. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right Side: Forgot Password Form (7 Cols on Laptop) */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {step === 'email' ? 'Quên Mật Khẩu?' : 'Đặt Lại Mật Khẩu'}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5">
                {step === 'email' 
                  ? 'Nhập email đã đăng ký của bạn để nhận mã khôi phục mật khẩu.' 
                  : `Mã xác nhận đã gửi đến ${email}. Hãy nhập mã và mật khẩu mới.`
                }
              </p>
            </div>

            {successInfo && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{successInfo}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-in fade-in">
                ⚠️ {error}
              </div>
            )}

            {/* FORM BƯỚC 1: NHẬP EMAIL */}
            {step === 'email' && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Địa chỉ Email của bạn</label>
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Đang gửi mã...</span>
                  ) : (
                    <>
                      <span>Gửi mã xác nhận</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-xs font-semibold text-slate-400 hover:text-emerald-600 transition-colors">
                    Quay lại Đăng nhập
                  </Link>
                </div>
              </form>
            )}

            {/* FORM BƯỚC 2: NHẬP MÃ & MẬT KHẨU MỚI */}
            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Mã xác nhận */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mã xác thực (6 chữ số)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Nhập 6 chữ số"
                      required
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    />
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* Mật khẩu mới */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
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

                {/* Xác nhận mật khẩu mới */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nhập lại mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Xác nhận lại mật khẩu mới"
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Đang cập nhật mật khẩu...</span>
                  ) : (
                    <>
                      <span>Khôi phục mật khẩu</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Quay lại bước trước
                  </button>
                  <Link href="/login" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                    Quay lại Đăng nhập
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
