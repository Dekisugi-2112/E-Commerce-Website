'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, Truck, CreditCard, Star, ShoppingBag, AlertCircle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ProductImage {
  image_url: string;
  is_primary: boolean;
}

interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  stock_quantity: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  avg_rating: number;
  total_sold: number;
  categories?: { name: string; slug: string };
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'mock-1',
    name: 'Áo Sơ Mi Oxford Dài Tay Nam Classic Fit',
    slug: 'ao-so-mi-oxford-dai-tay-nam-classic-fit',
    description: 'Áo sơ mi Oxford chất liệu 100% Cotton cao cấp, thoáng mát, chống nhăn nhẹ. Thiết kế phom Classic Fit tôn dáng lịch lãm.',
    base_price: 450000,
    avg_rating: 4.8,
    total_sold: 142,
    categories: { name: 'Áo Nam', slug: 'ao-nam' },
    product_images: [{ image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800', is_primary: true }]
  },
  {
    id: 'mock-2',
    name: 'Áo Blazer Nam Phong Cách Hàn Quốc Smart Casual',
    slug: 'ao-blazer-nam-phong-cach-han-quoc-smart-casual',
    description: 'Áo Blazer Nam may 2 lớp cao cấp, chất vải Tweed pha Wool đứng phom. Phong cách chuẩn Smart Casual thanh lịch.',
    base_price: 890000,
    avg_rating: 4.9,
    total_sold: 89,
    categories: { name: 'Áo Nam', slug: 'ao-nam' },
    product_images: [{ image_url: 'https://images.unsplash.com/photo-1593030103066-0093718efeb9?w=800', is_primary: true }]
  },
  {
    id: 'mock-3',
    name: 'Áo T-Shirt Cotton Heavyweight Premium Unisex',
    slug: 'ao-t-shirt-cotton-heavyweight-premium-unisex',
    description: 'Áo phông Unisex định hình định lượng 250gsm dày dặn, thấm hút mồ hôi cực tốt. Phom Oversize hiện đại.',
    base_price: 290000,
    avg_rating: 4.7,
    total_sold: 310,
    categories: { name: 'Áo Nam', slug: 'ao-nam' },
    product_images: [{ image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800', is_primary: true }]
  },
  {
    id: 'mock-4',
    name: 'Váy Đầm Dáng Xòe Cổ V Thanh Lịch Nữ',
    slug: 'vay-dam-dang-xoe-co-v-thanh-lich-nu',
    description: 'Váy đầm nữ phong cách Vintage nhẹ nhàng, chất liệu Chiffon tơ tằm 2 lớp thướt tha.',
    base_price: 680000,
    avg_rating: 5.0,
    total_sold: 94,
    categories: { name: 'Thời Trang Nữ', slug: 'thoi-trang-nu' },
    product_images: [{ image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800', is_primary: true }]
  },
  {
    id: 'mock-5',
    name: 'Quần Jeans Slim-fit Co Giãn Cao Cấp Nam',
    slug: 'quan-jeans-slim-fit-co-gian-cao-cap',
    description: 'Quần Jeans chất liệu Denim pha Spandex co giãn 4 chiều vận động thoải mái.',
    base_price: 550000,
    avg_rating: 4.6,
    total_sold: 205,
    categories: { name: 'Quần Nam', slug: 'quan-nam' },
    product_images: [{ image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800', is_primary: true }]
  },
  {
    id: 'mock-6',
    name: 'Áo Khoác Da Biker Jacket Nữ Cá Tính',
    slug: 'ao-khoac-da-biker-jacket-nu-ca-tinh',
    description: 'Áo khoác da PU nguyên khối nhập khẩu mềm mại, lót dù ấm áp.',
    base_price: 950000,
    avg_rating: 4.9,
    total_sold: 72,
    categories: { name: 'Thời Trang Nữ', slug: 'thoi-trang-nu' },
    product_images: [{ image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800', is_primary: true }]
  }
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'trending' | 'newest'>('trending');
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [newestProducts, setNewestProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [trendingRes, newestRes] = await Promise.all([
          fetchApi<{ success: boolean; data: Product[] }>('/products?sort=popular&limit=8'),
          fetchApi<{ success: boolean; data: Product[] }>('/products?sort=newest&limit=8')
        ]);

        if (trendingRes.success && newestRes.success) {
          setTrendingProducts(trendingRes.data);
          setNewestProducts(newestRes.data);
          setIsDemoMode(false);
        } else {
          // Fallback if success flag is missing
          setTrendingProducts(MOCK_PRODUCTS);
          setNewestProducts(MOCK_PRODUCTS);
          setIsDemoMode(true);
        }
      } catch (err) {
        console.warn('Backend API is offline, falling back to mock products.', err);
        setTrendingProducts(MOCK_PRODUCTS);
        setNewestProducts(MOCK_PRODUCTS.slice().reverse());
        setIsDemoMode(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const currentProducts = activeTab === 'trending' ? trendingProducts : newestProducts;

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Thời Trang Định Hình Phong Cách Cá Nhân</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Bộ Sưu Tập <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                Thời Trang Thu Đông 2026
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-xl">
              Khám phá hàng trăm thiết kế hiện đại, tinh tế. Trải nghiệm dịch vụ tư vấn phối đồ độc bản được cá nhân hóa bởi trợ lý AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/products"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Khám phá sản phẩm</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/ai-stylist"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Trải nghiệm AI Stylist</span>
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="w-80 h-96 sm:w-96 sm:h-[450px] rounded-3xl bg-gradient-to-tr from-emerald-600/30 to-teal-400/20 border border-white/10 p-4 shadow-2xl relative">
              <div className="w-full h-full rounded-2xl bg-slate-800 flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white">Shofy Lookbook 2026</h3>
                <p className="text-xs text-slate-400">Giao diện mẫu hiển thị hình ảnh sản phẩm chất lượng cao</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Giao Hàng Toàn Quốc</h4>
              <p className="text-xs text-slate-500 mt-1">Đồng giá vận chuyển, hỗ trợ đồng kiểm khi nhận hàng</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-teal-50 text-teal-600">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Thanh Toán Linh Hoạt</h4>
              <p className="text-xs text-slate-500 mt-1">Hỗ trợ COD và Cổng thanh toán VNPay Sandbox</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Tư Vấn AI Thông Minh</h4>
              <p className="text-xs text-slate-500 mt-1">Phối đồ cá nhân hóa dựa trên AI Gemini</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Đổi Trả Dễ Dàng</h4>
              <p className="text-xs text-slate-500 mt-1">7 ngày đổi trả nếu sản phẩm có lỗi nhà sản xuất</p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Khám Phá Bộ Sưu Tập</h2>
            <p className="text-sm text-slate-500 max-w-md">Những thiết kế thời trang hiện đại, dẫn đầu xu hướng mới nhất từ Shofy.</p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl self-center md:self-auto">
            <button
              onClick={() => setActiveTab('trending')}
              className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'trending'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Bán Chạy Nhất
            </button>
            <button
              onClick={() => setActiveTab('newest')}
              className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'newest'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Hàng Mới Về
            </button>
          </div>
        </div>

        {/* Demo Mode Notice */}
        {isDemoMode && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium max-w-3xl mx-auto">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              💡 <strong>Chế độ Demo (Ngoại tuyến):</strong> Không thể kết nối với Backend API. Đang hiển thị danh sách sản phẩm mẫu. Vui lòng chạy backend server bằng lệnh <code className="bg-amber-100 px-1 py-0.5 rounded font-semibold text-amber-900">uvicorn</code> ở cổng 8000 để tải dữ liệu thật.
            </div>
          </div>
        )}

        {/* Products Grid / Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/50 p-4 space-y-4 animate-pulse">
                <div className="aspect-[4/5] bg-slate-100 rounded-2xl"></div>
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {currentProducts.map((product) => {
              const primaryImg = product.product_images?.find(img => img.is_primary)?.image_url 
                || product.product_images?.[0]?.image_url 
                || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800';

              const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.base_price);

              return (
                <div key={product.id} className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  {/* Product Image */}
                  <Link href={`/products/${product.slug}`} className="cursor-pointer block relative aspect-[4/5] bg-slate-100 overflow-hidden">
                    <img
                      src={primaryImg}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {product.categories && (
                      <span className="absolute top-3.5 left-3.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-800 shadow-sm border border-slate-100">
                        {product.categories.name}
                      </span>
                    )}
                  </Link>

                  {/* Product Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-1 text-amber-500 text-[11px] font-semibold mb-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{product.avg_rating}</span>
                        <span className="text-slate-400 ml-1">({product.total_sold} đã bán)</span>
                      </div>

                      <Link href={`/products/${product.slug}`} className="font-semibold text-slate-900 text-sm line-clamp-2 hover:text-emerald-600 transition-colors">
                        {product.name}
                      </Link>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-base font-extrabold text-emerald-700">{formattedPrice}</span>
                      <Link href={`/products/${product.slug}`} className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors">
                        <ShoppingBag className="w-4.5 h-4.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View All Products Link */}
        <div className="text-center pt-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-slate-950 text-white font-semibold text-xs hover:bg-slate-800 hover:shadow-lg transition-all"
          >
            <span>Xem Tất Cả Sản Phẩm</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
