'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Trash2, ShoppingBag, ArrowRight, Star, Sparkles, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    avg_rating: number;
    total_sold: number;
    status: string;
    categories: { name: string } | null;
    product_images: { image_url: string; is_primary: boolean }[];
    product_variants: { id: string; sku: string; attributes: any; price: number; stock_quantity: number }[];
  };
}

export default function WishlistPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addedToCartId, setAddedToCartId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadWishlist();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('id, product_id, created_at, products(id, name, slug, base_price, avg_rating, total_sold, status, categories(name), product_images(image_url, is_primary), product_variants(id, sku, attributes, price, stock_quantity))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWishlistItems((data as any) || []);
    } catch (err) {
      console.error('Error loading wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    setRemovingId(wishlistId);
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;
      setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
    } catch (err) {
      console.error('Error removing from wishlist:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    const product = item.products;
    const primaryImg = product.product_images?.find(img => img.is_primary)?.image_url
      || product.product_images?.[0]?.image_url || '';
    const firstVariant = product.product_variants?.[0];

    if (firstVariant) {
      const attrs = firstVariant.attributes || {};
      addToCart({
        variantId: firstVariant.id,
        productId: product.id,
        name: product.name,
        price: firstVariant.price || product.base_price,
        image: primaryImg,
        size: attrs.size || 'M',
        color: attrs.color || 'Mặc định',
        stockQuantity: firstVariant.stock_quantity || 10
      }, 1);
      setAddedToCartId(product.id);
      setTimeout(() => setAddedToCartId(null), 2000);
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Chưa đăng nhập
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-5 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center mx-auto">
          <Heart className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Vui lòng đăng nhập</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Bạn cần đăng nhập tài khoản để xem và quản lý danh sách yêu thích của mình.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-700/15"
        >
          <span>Đăng nhập ngay</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Đang tải
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-500">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-semibold">Đang tải danh sách yêu thích...</p>
      </div>
    );
  }

  // Wishlist trống
  if (wishlistItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-5 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <Heart className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Danh sách yêu thích trống</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Hãy khám phá bộ sưu tập thời trang và lưu lại những sản phẩm bạn yêu thích để mua sắm sau.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-700/15"
        >
          <span>Khám phá sản phẩm</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            Danh Sách Yêu Thích
          </h1>
          <p className="text-xs text-slate-500 mt-1">{wishlistItems.length} sản phẩm bạn đã lưu</p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
        >
          <Package className="w-3.5 h-3.5" />
          <span>Tiếp tục mua sắm</span>
        </Link>
      </div>

      {/* Wishlist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistItems.map((item) => {
          const product = item.products;
          const primaryImg = product.product_images?.find(img => img.is_primary)?.image_url
            || product.product_images?.[0]?.image_url
            || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800';
          const isRemoving = removingId === item.id;
          const isAddedToCart = addedToCartId === product.id;

          return (
            <div
              key={item.id}
              className={`group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative ${isRemoving ? 'opacity-50 scale-95' : ''}`}
            >
              {/* Nút bỏ yêu thích */}
              <button
                onClick={() => removeFromWishlist(item.id)}
                disabled={isRemoving}
                className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-md text-rose-500 hover:bg-rose-500 hover:text-white rounded-full shadow-sm border border-rose-100 hover:border-rose-500 transition-all disabled:opacity-50"
                title="Bỏ yêu thích"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Ảnh sản phẩm */}
              <Link href={`/products/${product.slug}`} className="cursor-pointer block relative aspect-[4/5] bg-slate-100 overflow-hidden">
                <img
                  src={primaryImg}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {product.categories && (
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-800 shadow-sm border border-slate-100">
                    {product.categories.name}
                  </span>
                )}
              </Link>

              {/* Thông tin sản phẩm */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-1 text-amber-500 text-[11px] font-semibold mb-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.avg_rating || '0.0'}</span>
                    <span className="text-slate-400 ml-1">({product.total_sold || 0} đã bán)</span>
                  </div>
                  <Link
                    href={`/products/${product.slug}`}
                    className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-2 hover:text-emerald-600 transition-colors"
                  >
                    {product.name}
                  </Link>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-700 text-sm">{formatVND(product.base_price)}</span>
                    <span className="text-[9px] text-slate-400 font-medium">Đã lưu {formatDate(item.created_at)}</span>
                  </div>

                  {/* Nút thêm vào giỏ hàng */}
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!product.product_variants || product.product_variants.length === 0}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      isAddedToCart
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-900 hover:bg-emerald-600 text-white shadow-sm'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {isAddedToCart ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Đã thêm vào giỏ!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Thêm vào giỏ hàng</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
