'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, CheckCircle2, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';

function VNPayMockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams.get('order_id') || '';
  const amount = searchParams.get('amount') || '0';

  // Form States
  const [bankCode, setBankCode] = useState('NCB');
  const [cardNumber, setCardNumber] = useState('9704198526191432198'); // Standard VNPay test card
  const [cardHolder, setCardHolder] = useState('NGUYEN VAN A');
  const [cardDate, setCardDate] = useState('07/15');
  const [otp, setOtp] = useState('123456');

  // UI Flow States
  const [step, setStep] = useState(1); // 1: Input details, 2: OTP verify, 3: Success payment loader
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.length < 10 || !cardHolder || !cardDate) {
      setErrorMsg('Vui lòng điền đúng thông tin thẻ demo.');
      return;
    }
    setStep(2);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '123456') {
      setErrorMsg('Mã OTP mô phỏng không đúng (nhập: 123456).');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    try {
      // Gọi API báo thanh toán thành công
      const res = await fetchApi<{ success: boolean; message: string }>(`/orders/${orderId}/pay-success`, {
        method: 'POST'
      });

      if (res.success) {
        setStep(3);
        setTimeout(() => {
          router.push('/orders?payment_success=true');
        }, 2500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi xác nhận thanh toán.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      {/* simulated VNPay portal container */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Portal Header */}
        <div className="bg-[#f05123] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            <span className="font-extrabold tracking-widest text-lg">VNPAY</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase">Cổng thanh toán Sandbox</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-75">Số tiền thanh toán</p>
            <p className="text-base font-black">{formatVND(Number(amount))}</p>
          </div>
        </div>

        {/* Portal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center bg-slate-50 border border-slate-200/80 rounded-xl py-3 text-xs text-slate-600 font-semibold">
            Mã đơn hàng: <span className="text-slate-900 select-all">{orderId}</span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl animate-in fade-in">
              ⚠️ {errorMsg}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">1. Chọn Ngân hàng thanh toán</label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                >
                  <option value="NCB">Ngân hàng NCB (Khuyên dùng để test)</option>
                  <option value="VIETCOMBANK">Vietcombank</option>
                  <option value="TECHCOMBANK">Techcombank</option>
                </select>
              </div>

              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">2. Nhập thông tin thẻ Test</label>
                
                <div className="space-y-3 text-xs font-semibold">
                  <div>
                    <label className="block text-slate-600 mb-1">Số thẻ *</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#f05123]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-600 mb-1">Tên chủ thẻ *</label>
                      <input
                        type="text"
                        required
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#f05123]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Ngày phát hành (MM/YY) *</label>
                      <input
                        type="text"
                        required
                        value={cardDate}
                        onChange={(e) => setCardDate(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#f05123]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#f05123] hover:bg-[#e04013] text-white font-bold rounded-xl text-xs sm:text-sm transition-colors mt-4"
              >
                Tiếp tục (Xác minh thẻ)
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-center">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Xác thực OTP mã bảo mật</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Nhập mã OTP Test mặc định là <strong className="text-slate-800">123456</strong> gửi về số điện thoại của bạn.
              </p>

              <div className="max-w-[160px] mx-auto">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full text-center px-4 py-2.5 text-lg font-black tracking-widest bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#f05123]"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Xác nhận thanh toán</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200"
                >
                  Quay lại
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-6 space-y-4 animate-pulse">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Đang thực hiện thanh toán giao dịch...</h3>
              <p className="text-xs text-slate-500">Hệ thống đang đồng bộ dữ liệu hóa đơn với ngân hàng của bạn.</p>
            </div>
          )}
        </div>

        {/* Portal Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Môi trường kết nối thanh toán bảo mật SSL</span>
          </span>
          <a href="#" className="hover:underline flex items-center gap-0.5">
            <HelpCircle className="w-3 h-3" /> Trợ giúp
          </a>
        </div>

      </div>
    </div>
  );
}

export default function VNPayMockPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-bold animate-pulse">
        Đang nạp cổng thanh toán VNPay...
      </div>
    }>
      <VNPayMockContent />
    </Suspense>
  );
}
