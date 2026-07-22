'use client';

import Link from 'next/link';
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, CreditCard, Sparkles, Tag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const subtotal = getCartTotal();
  const shippingFee = subtotal > 500000 || subtotal === 0 ? 0 : 30000;
  const finalTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  const applyCoupon = () => {
    setCouponError('');
    setCouponSuccess('');
    
    if (couponCode.toUpperCase() === 'SHOFYNEW') {
      const discount = subtotal * 0.1; // 10% discount
      setDiscountAmount(discount);
      setCouponSuccess('Áp dụng mã giảm giá 10% thành công!');
    } else if (couponCode.toUpperCase() === 'FREE50K') {
      const discount = Math.min(50000, subtotal);
      setDiscountAmount(discount);
      setCouponSuccess('Áp dụng mã giảm giá 50.000đ thành công!');
    } else {
      setCouponError('Mã giảm giá không tồn tại hoặc đã hết hạn!');
      setDiscountAmount(0);
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Giỏ hàng của bạn đang trống</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Hãy khám phá bộ sưu tập thời trang mới nhất của Shofy và thêm vào giỏ sản phẩm ưng ý của bạn.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-700/15"
        >
          <span>Tiếp tục mua sắm</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Giỏ Hàng Mua Sắm</h1>
        <p className="text-xs text-slate-500 mt-1">Danh sách sản phẩm bạn đang cân nhắc đặt mua</p>
      </div>

      {/* Cart Grid Layout: Laptop-optimized split columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Items List (8 Columns on Laptop) */}
        <div className="lg:col-span-8 space-y-4">
          {cartItems.map((item) => (
            <div key={item.variantId} className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex items-center gap-4 sm:gap-6 hover:shadow-md transition-shadow relative">
              {/* Product Thumbnail */}
              <div className="w-20 h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>

              {/* Product details */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <Link href={`/products/${item.variantId}`} className="font-semibold text-slate-900 text-xs sm:text-sm line-clamp-1 hover:text-emerald-600 transition-colors">
                  {item.name}
                </Link>
                <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-slate-400 font-semibold">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">Size: {item.size}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">Màu: {item.color}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-800">{formatVND(item.price)}</div>
              </div>

              {/* Quantity selector & Subtotal */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 justify-between">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                  <button
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-950">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Tổng tiền</p>
                  <p className="text-xs sm:text-sm font-extrabold text-emerald-700">{formatVND(item.price * item.quantity)}</p>
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeFromCart(item.variantId)}
                className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Right Side: Order Summary sticky box (4 Columns on Laptop) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 sticky top-20">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">Tóm tắt đơn hàng</h3>

            {/* Calculations */}
            <div className="space-y-3.5 text-xs font-semibold text-slate-500">
              <div className="flex items-center justify-between">
                <span>Tạm tính</span>
                <span className="text-slate-800">{formatVND(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Phí vận chuyển</span>
                <span className="text-slate-800">{shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-rose-600 font-bold">
                  <span>Giảm giá mã coupon</span>
                  <span>-{formatVND(discountAmount)}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-sm text-slate-900 font-bold">
                <span>Tổng thanh toán</span>
                <span className="text-emerald-700 text-base font-extrabold">{formatVND(finalTotal)}</span>
              </div>
            </div>

            {/* Promo code Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">Mã giảm giá</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Mã: SHOFYNEW"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
                <button
                  onClick={applyCoupon}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Áp dụng
                </button>
              </div>
              {couponError && <p className="text-[10px] text-rose-600 font-semibold">{couponError}</p>}
              {couponSuccess && <p className="text-[10px] text-emerald-600 font-semibold">{couponSuccess}</p>}
            </div>

            {/* Shipping note */}
            {subtotal < 500000 && (
              <p className="text-[10px] text-slate-400 font-medium bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                💡 Mua thêm <strong className="text-slate-700">{formatVND(500000 - subtotal)}</strong> để được **Miễn phí vận chuyển**!
              </p>
            )}

            {/* Checkout Action Button */}
            <Link
              href={`/checkout?coupon=${discountAmount > 0 ? couponCode : ''}`}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/10 transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Tiến hành đặt hàng</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
