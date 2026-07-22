'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag, Sparkles, ShoppingBag, ArrowRight, Copy, CheckCircle, Percent } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchApi } from '@/lib/api';

export default function SalePage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    async function loadSaleData() {
      try {
        // 1. Lấy mã giảm giá trực tiếp từ Supabase
        const { data: couponsData, error: couponErr } = await supabase
          .from('coupons')
          .select('*')
          .eq('is_active', true)
          .order('discount_value', { ascending: false });

        if (couponsData) setCoupons(couponsData);

        // 2. Lấy danh sách sản phẩm mẫu làm Sale Products
        const prodRes = await fetchApi<{ success: boolean; data: any[] }>('/products?limit=8');
        if (prodRes.success) setProducts(prodRes.data);
      } catch (err) {
        console.error('Lỗi tải dữ liệu sale:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSaleData();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 animate-in fade-in duration-500">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white py-16 px-6 sm:px-12 text-center sm:text-left shadow-lg">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold">
            <Percent className="w-3.5 h-3.5" />
            <span>Siêu Ưu Đãi Mùa Hè 2026</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none">
            SALE BÙNG NỔ <br />
            LÊN ĐẾN 50%
          </h1>
          <p className="text-white/90 text-xs sm:text-sm max-w-lg leading-relaxed">
            Áp dụng hàng trăm mã giảm giá trực tiếp và quà tặng hấp dẫn. Số lượng giới hạn, mua ngay kẻo lỡ!
          </p>
        </div>
        <div className="absolute top-1/2 right-10 -translate-y-1/2 hidden md:block opacity-10">
          <Tag className="w-64 h-64 rotate-12" />
        </div>
      </section>

      {/* Section 1: Mã Khuyến Mãi (Coupons) */}
      <div className="space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-rose-500" />
            Mã giảm giá đang hoạt động ({coupons.length})
          </h2>
          <p className="text-slate-400 text-xs mt-1">Bấm Copy và nhập mã này ở bước thanh toán để được nhận ưu đãi.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.map((c) => {
              const isPercent = c.discount_type === 'percent';
              
              return (
                <div 
                  key={c.id} 
                  className="bg-white rounded-2xl border-2 border-dashed border-rose-200 p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">
                        {isPercent ? `GIẢM ${c.discount_value}%` : `GIẢM ${formatVND(c.discount_value)}`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Đơn tối thiểu: {formatVND(c.min_order_value)}
                      </span>
                    </div>
                    
                    <h3 className="font-extrabold text-slate-900 text-sm">{c.code}</h3>
                    <p className="text-[10px] text-slate-400">
                      Giảm tối đa theo điều kiện đơn hàng. Hoạt động trên mọi thiết bị.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-medium">Hạn dùng: Không thời hạn</span>
                    <button
                      onClick={() => handleCopyCode(c.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        copiedCode === c.code 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                      }`}
                    >
                      {copiedCode === c.code ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Đã lưu!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy mã</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Sản Phẩm Đang Sale (Simulated original price) */}
      <div className="space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Sản phẩm có ưu đãi giá sốc
            </h2>
            <p className="text-slate-400 text-xs mt-1">Đồ thời trang thiết kế chất lượng cao với mức giá ưu đãi đặc biệt.</p>
          </div>
          <Link href="/products" className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors flex items-center gap-1">
            <span>Xem thêm</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => {
              const primaryImg = p.product_images?.find((img: any) => img.is_primary)?.image_url 
                || p.product_images?.[0]?.image_url 
                || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800';

              // Giả lập giá gốc cao hơn 30% để tạo cảm giác giảm giá
              const originalPrice = p.base_price * 1.3;

              return (
                <div key={p.id} className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col relative">
                  {/* Sale Tag */}
                  <span className="absolute top-3 left-3 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md z-10 shadow-sm">
                    -23% OFF
                  </span>

                  {/* Image */}
                  <Link href={`/products/${p.slug}`} className="cursor-pointer block relative aspect-[4/5] bg-slate-50 overflow-hidden">
                    <img
                      src={primaryImg}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </Link>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <Link href={`/products/${p.slug}`} className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-2 hover:text-emerald-600 transition-colors">
                      {p.name}
                    </Link>
                    
                    <div className="flex items-baseline gap-2">
                      <span className="font-extrabold text-rose-600 text-sm">{formatVND(p.base_price)}</span>
                      <span className="text-[10px] text-slate-400 line-through font-semibold">{formatVND(originalPrice)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
