'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, ShoppingBag, Truck, CheckCircle2, ChevronRight, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { fetchApi } from '@/lib/api';

function CheckoutFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { user, token, isLoading: authLoading } = useAuth();
  const { cartItems, getCartTotal, clearCart } = useCart();

  // Address Form States
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [detail, setDetail] = useState('');
  
  // Checkout configurations
  const [paymentMethod, setPaymentMethod] = useState('cod'); // cod or vnpay
  const [note, setNote] = useState('');
  
  // UI Flow States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  // Load user data if available
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
    } else if (user) {
      setRecipientName(user.full_name || '');
      setPhone(user.phone || '');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">Đang kiểm tra thông tin đăng nhập...</div>
      </div>
    );
  }

  if (cartItems.length === 0 && !orderSuccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Giỏ hàng của bạn đang trống</h2>
        <Link href="/products" className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors">
          <span>Quay lại mua sắm</span>
        </Link>
      </div>
    );
  }

  // Calculate order details
  const subtotal = getCartTotal();
  const shippingFee = subtotal > 500000 ? 0 : 30000;
  
  // Coupon mock validation matching CartPage
  const couponParam = searchParams.get('coupon') || '';
  const discountAmount = couponParam.toUpperCase() === 'SHOFYNEW' ? subtotal * 0.1 
                       : couponParam.toUpperCase() === 'FREE50K' ? Math.min(50000, subtotal) 
                       : 0;

  const finalTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!recipientName || !phone || !province || !district || !ward || !detail) {
      setErrorMsg('Vui lòng nhập đầy đủ địa chỉ giao hàng.');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems = cartItems.map(item => ({
        variant_id: item.variantId,
        product_name: item.name,
        variant_attributes: { size: item.size, color: item.color },
        price: item.price,
        quantity: item.quantity
      }));

      const body = {
        address: {
          recipient_name: recipientName,
          phone,
          province,
          district,
          ward,
          detail
        },
        payment_method: paymentMethod,
        items: orderItems,
        coupon_code: couponParam || null,
        discount_amount: discountAmount,
        shipping_fee: shippingFee,
        note: note || null
      };

      const res = await fetchApi<{ success: boolean; message: string; order_id: string; redirect_url?: string }>('/orders/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.success) {
        clearCart(); // Clear local storage cart
        
        if (res.redirect_url) {
          // If online payment (VNPay Mock) -> redirect
          router.push(res.redirect_url);
        } else {
          // COD success
          setOrderSuccess({
            orderId: res.order_id,
            total: finalTotal,
            recipientName,
            phone,
            address: `${detail}, ${ward}, ${district}, ${province}`
          });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // If order is placed successfully (COD)
  if (orderSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6 animate-in fade-in zoom-in-95">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">Đặt hàng thành công!</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cảm ơn bạn đã lựa chọn mua sắm tại Shofy Fashion. Đơn hàng của bạn đã được tiếp nhận và đang chờ xử lý xác nhận.
          </p>
        </div>

        {/* Order Details Summary Box */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 text-left text-xs font-semibold text-slate-600 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-400">Mã đơn hàng:</span>
            <span className="text-slate-900 select-all">{orderSuccess.orderId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Người nhận:</span>
            <span className="text-slate-900">{orderSuccess.recipientName} ({orderSuccess.phone})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Địa chỉ giao:</span>
            <span className="text-slate-900 text-right truncate max-w-[240px]" title={orderSuccess.address}>{orderSuccess.address}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Phương thức:</span>
            <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded uppercase">COD (Thanh toán khi nhận)</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-900 font-bold">
            <span>Tổng thanh toán:</span>
            <span className="text-emerald-700 font-black">{formatVND(orderSuccess.total)}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <Link
            href="/orders"
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
          >
            Theo dõi đơn hàng
          </Link>
          <Link
            href="/products"
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition-colors"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
        <Link href="/cart" className="hover:text-slate-600">Giỏ hàng</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-semibold">Đặt hàng & Thanh toán</span>
      </div>

      {/* Main Grid Layout: optimized for laptop screen split columns */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Forms (8 Columns on Laptop) */}
        <div className="lg:col-span-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Delivery Address Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">1. Địa chỉ nhận hàng</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">Tên người nhận *</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">Số điện thoại *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0912345678"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">Tỉnh / Thành phố *</label>
                <input
                  type="text"
                  required
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Ví dụ: Hà Nội"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">Quận / Huyện *</label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Ví dụ: Cầu Giấy"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">Phường / Xã *</label>
                <input
                  type="text"
                  required
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="Ví dụ: Dịch Vọng"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">Địa chỉ chi tiết (Số nhà, Tên đường) *</label>
              <input
                type="text"
                required
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Ví dụ: Số 12, Ngõ 45, Đường Xuân Thủy"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">Ghi chú giao hàng (Tùy chọn)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Giao hàng vào giờ hành chính..."
                rows={2}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">2. Phương thức thanh toán</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'cod' ? 'border-emerald-600 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-900 uppercase">Thanh toán khi nhận hàng (COD)</p>
                  <p className="text-slate-400 mt-0.5">Thanh toán bằng tiền mặt trực tiếp cho nhân viên giao hàng.</p>
                </div>
              </label>

              <label className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'vnpay' ? 'border-emerald-600 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  value="vnpay"
                  checked={paymentMethod === 'vnpay'}
                  onChange={() => setPaymentMethod('vnpay')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <span>Thanh toán VNPay Sandbox</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Demo Online</span>
                  </p>
                  <p className="text-slate-400 mt-0.5">Giả lập thanh toán qua cổng VNPay (Không mất tiền thực tế).</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Side: Order Summary sticky box (4 Columns on Laptop) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 sticky top-20">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">Đơn hàng của bạn</h3>

            {/* List items short */}
            <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item.variantId} className="flex gap-3 text-xs font-semibold">
                  <div className="w-10 h-12 bg-slate-50 border rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Size: {item.size} | Màu: {item.color} | SL: {item.quantity}</p>
                  </div>
                  <span className="text-slate-800">{formatVND(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-3 text-xs font-semibold text-slate-500 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <span>Tạm tính</span>
                <span className="text-slate-800">{formatVND(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Phí vận chuyển</span>
                <span className="text-slate-800">{shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-rose-600">
                  <span>Mã coupon giảm giá ({couponParam})</span>
                  <span>-{formatVND(discountAmount)}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-sm text-slate-900 font-bold">
                <span>Tổng thanh toán</span>
                <span className="text-emerald-700 text-base font-extrabold">{formatVND(finalTotal)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Đang xử lý đơn hàng...</span>
              ) : (
                <>
                  <span>Xác nhận đặt hàng</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500 font-semibold animate-pulse">
        Đang nạp trang thông tin đặt hàng...
      </div>
    }>
      <CheckoutFormContent />
    </Suspense>
  );
}
