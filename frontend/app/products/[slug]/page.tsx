'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingBag, Star, Sparkles, ShieldCheck, Truck, ChevronLeft, Plus, Minus, Check, MessageSquare, Send, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

interface ProductVariant {
  id: string;
  sku: string;
  attributes: { size?: string; color?: string; [key: string]: any };
  price: number;
  stock_quantity: number;
}

interface ProductImage {
  image_url: string;
  is_primary: boolean;
  display_order: number;
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

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { user, token } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // UI States
  const [activeImage, setActiveImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [successToast, setSuccessToast] = useState('');

  // Reviews States
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Wishlist State
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Recommendations State
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  // Fetch product detail
  useEffect(() => {
    async function loadProduct() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const res = await fetchApi<{ success: boolean; data: Product }>(`/products/${slug}`);
        if (res.success && res.data) {
          setProduct(res.data);
          // Set initial active image
          const primary = res.data.product_images?.find(img => img.is_primary)?.image_url 
            || res.data.product_images?.[0]?.image_url 
            || '';
          setActiveImage(primary);

          // Pre-select first size/color if available
          const variants = res.data.product_variants || [];
          if (variants.length > 0) {
            const firstVariant = variants[0];
            if (firstVariant.attributes.size) setSelectedSize(firstVariant.attributes.size);
            if (firstVariant.attributes.color) setSelectedColor(firstVariant.attributes.color);
          }

          // Fetch reviews, recommendations & wishlist status
          loadReviews(res.data.id);
          checkWishlistStatus(res.data.id);
          loadRecommendations(res.data.id);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Không thể tải chi tiết sản phẩm. Đảm bảo API server đang chạy.');
      } finally {
        setIsLoading(false);
      }
    }

    async function loadReviews(productId: string) {
      try {
        const res = await fetchApi<{ success: boolean; data: Review[] }>(`/reviews/product/${productId}`);
        if (res.success) {
          setReviews(res.data);
        }
      } catch (err) {
        console.error('Error loading reviews:', err);
      }
    }

    async function loadRecommendations(productId: string) {
      try {
        const res = await fetchApi<{ success: boolean; data: Product[] }>(`/ai/recommend/${productId}`);
        if (res.success) {
          setRecommendations(res.data);
        }
      } catch (err) {
        console.error('Error loading recommendations:', err);
      }
    }

    async function checkWishlistStatus(productId: string) {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('wishlists')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .maybeSingle();
        setIsWishlisted(!!data);
      } catch (err) {
        console.error('Error checking wishlist status:', err);
      }
    }

    if (slug) loadProduct();
  }, [slug]);

  // Tự động thay đổi ảnh chính khi chọn màu sắc khác nhau
  useEffect(() => {
    if (!selectedColor || !product || !product.product_images || product.product_images.length === 0) return;
    const variants = product.product_variants || [];
    const uniqueColors = Array.from(new Set(variants.map(v => v.attributes.color).filter(Boolean))) as string[];
    const colorIndex = uniqueColors.indexOf(selectedColor);
    if (colorIndex !== -1 && product.product_images[colorIndex]) {
      setActiveImage(product.product_images[colorIndex].image_url);
    }
  }, [selectedColor, product]);

  // Handle new review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!token) {
      alert('Vui lòng đăng nhập để gửi đánh giá sản phẩm!');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await fetchApi<{ success: boolean; message: string; data: any }>('/reviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: product.id,
          rating: newRating,
          comment: newComment
        })
      });

      if (res.success) {
        setNewComment('');
        // Add new review to local list instantly
        const userProfile = {
          full_name: user?.full_name || 'Người dùng mới',
          email: user?.email || ''
        };
        const newReviewObj: Review = {
          id: res.data.id || Math.random().toString(),
          rating: newRating,
          comment: newComment,
          created_at: new Date().toISOString(),
          profiles: userProfile
        };
        setReviews(prev => [newReviewObj, ...prev]);
        
        // Refresh product avg score
        if (product) {
          const updatedRatings = [newRating, ...reviews.map(r => r.rating)];
          const newAvg = roundToTenths(updatedRatings.reduce((a, b) => a + b, 0) / updatedRatings.length);
          setProduct({ ...product, avg_rating: newAvg });
        }
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi đánh giá sản phẩm.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const roundToTenths = (val: number) => {
    return Math.round(val * 10) / 10;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500 font-semibold animate-pulse">
        Đang tải thông tin sản phẩm thời trang...
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Sản phẩm không tồn tại hoặc lỗi kết nối</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{errorMsg}</p>
        <Link href="/products" className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline">
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại danh sách sản phẩm</span>
        </Link>
      </div>
    );
  }

  // Parse unique Sizes and Colors from variants
  const variants = product.product_variants || [];
  const uniqueSizes = Array.from(new Set(variants.map(v => v.attributes.size).filter(Boolean))) as string[];
  const uniqueColors = Array.from(new Set(variants.map(v => v.attributes.color).filter(Boolean))) as string[];

  // Find currently selected variant details
  const selectedVariant = variants.find(v => {
    const sizeMatch = !v.attributes.size || v.attributes.size === selectedSize;
    const colorMatch = !v.attributes.color || v.attributes.color === selectedColor;
    return sizeMatch && colorMatch;
  });

  const displayPrice = selectedVariant ? selectedVariant.price : product.base_price;
  const stockCount = selectedVariant ? selectedVariant.stock_quantity : 0;
  const currentSKU = selectedVariant ? selectedVariant.sku : '';

  const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice);

  const handleAddToCart = (redirect = false) => {
    if (!selectedVariant) {
      alert('Vui lòng chọn đầy đủ Size và Màu sắc!');
      return;
    }

    const primaryImg = product.product_images?.find(img => img.is_primary)?.image_url 
      || product.product_images?.[0]?.image_url 
      || '';

    addToCart({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      image: primaryImg,
      size: selectedSize || 'Free Size',
      color: selectedColor || 'Mặc định',
      price: displayPrice,
      stockQuantity: stockCount
    }, quantity);

    if (redirect) {
      router.push('/cart');
    } else {
      setSuccessToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
      setTimeout(() => setSuccessToast(''), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button link */}
      <Link href="/products" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        <span>Quay lại trang sản phẩm</span>
      </Link>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-950 text-white rounded-2xl border border-white/10 px-5 py-4 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold">{successToast}</p>
            <Link href="/cart" className="text-[10px] text-emerald-400 font-semibold underline mt-0.5 block">
              Xem giỏ hàng ngay
            </Link>
          </div>
        </div>
      )}

      {/* Product Detail Grid: optimized for laptop screen split columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        
        {/* Left Column: Image Gallery (5 columns on Laptop) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Large Main Image */}
          <div className="aspect-[4/5] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 relative group">
            <img
              src={activeImage || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Thumbnail list */}
          {product.product_images && product.product_images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {product.product_images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img.image_url)}
                  className={`w-20 h-20 rounded-xl overflow-hidden bg-slate-50 border-2 transition-all flex-shrink-0 ${
                    activeImage === img.image_url ? 'border-emerald-600 ring-2 ring-emerald-500/10' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={img.image_url} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Info & Selections (7 columns on Laptop) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {product.categories && (
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                  {product.categories.name}
                </span>
              )}
              <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.avg_rating}</span>
                <span className="text-slate-400 ml-1">({reviews.length} đánh giá | {product.total_sold} đã bán)</span>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {product.name}
            </h1>

            {currentSKU && (
              <p className="text-[11px] text-slate-400 font-medium">SKU: {currentSKU}</p>
            )}
          </div>

          {/* Price Box */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Giá bán ưu đãi</span>
              <div className="text-3xl font-black text-emerald-700">{formattedPrice}</div>
            </div>
            {stockCount > 0 ? (
              <div className="text-right space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                  Còn hàng
                </span>
                <p className="text-[11px] text-slate-500 font-medium mt-1">Kho: {stockCount} sản phẩm</p>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs bg-rose-100 text-rose-800 font-semibold px-2.5 py-1 rounded-full">
                Tạm hết hàng
              </span>
            )}
          </div>

          {/* Variants Selector */}
          <div className="space-y-4">
            {/* Color selector */}
            {uniqueColors.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Màu sắc</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedColor === color
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 font-bold'
                          : 'border-slate-200 text-slate-600 hover:border-slate-400 bg-white'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
            {uniqueSizes.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Kích cỡ (Size)</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedSize === size
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700 font-bold'
                          : 'border-slate-200 text-slate-600 hover:border-slate-400 bg-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quantity Selector & Action Buttons */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {stockCount > 0 && (
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Số lượng</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                    className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-bold text-slate-900 text-xs sm:text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(prev => Math.min(stockCount, prev + 1))}
                    disabled={quantity >= stockCount}
                    className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleAddToCart(false)}
                disabled={stockCount <= 0}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShoppingBag className="w-4.5 h-4.5" />
                <span>Thêm vào giỏ hàng</span>
              </button>

              <button
                onClick={() => handleAddToCart(true)}
                disabled={stockCount <= 0}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-emerald-700/20 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                <span>Mua ngay</span>
              </button>

              <button
                onClick={async () => {
                  if (!user) { router.push('/login'); return; }
                  if (wishlistLoading) return;
                  setWishlistLoading(true);
                  try {
                    if (isWishlisted) {
                      await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', product.id);
                      setIsWishlisted(false);
                    } else {
                      await supabase.from('wishlists').insert({ user_id: user.id, product_id: product.id });
                      setIsWishlisted(true);
                    }
                  } catch (err) { console.error('Wishlist toggle error:', err); }
                  finally { setWishlistLoading(false); }
                }}
                disabled={wishlistLoading}
                className={`py-3.5 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 border ${
                  isWishlisted
                    ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-500'
                } disabled:opacity-50`}
                title={isWishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              >
                <Heart className={`w-4.5 h-4.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Description & Store Policies */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Mô tả sản phẩm</h4>
              <p className="text-xs leading-relaxed text-slate-500 whitespace-pre-line">{product.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-[11px]">
                  <p className="font-bold text-slate-900">Giao hàng COD toàn quốc</p>
                  <p className="text-slate-500 mt-0.5">Kiểm tra hàng trước khi nhận</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-[11px]">
                  <p className="font-bold text-slate-900">Cam kết chính hãng</p>
                  <p className="text-slate-500 mt-0.5">7 ngày đổi trả dễ dàng</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* AI Product Recommendations Widget */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-slate-900 text-lg">Gợi ý phối hợp cho bạn</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((prod) => {
              const primaryImg = prod.product_images?.find(img => img.is_primary)?.image_url 
                || prod.product_images?.[0]?.image_url 
                || '';
              
              return (
                <div key={prod.id} className="group border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col bg-slate-50/20">
                  <Link href={`/products/${prod.slug}`} className="cursor-pointer block aspect-[4/5] bg-slate-100 overflow-hidden relative">
                    <img src={primaryImg} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {prod.categories && (
                      <span className="absolute top-3 left-3 bg-white/95 text-[10px] font-black px-2 py-1 rounded shadow-sm border border-slate-100">
                        {prod.categories.name}
                      </span>
                    )}
                  </Link>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2 text-xs font-semibold">
                    <Link href={`/products/${prod.slug}`} className="text-slate-900 line-clamp-1 hover:text-emerald-600">
                      {prod.name}
                    </Link>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-emerald-700 font-extrabold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(prod.base_price)}</span>
                      <Link href={`/products/${prod.slug}`} className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors">
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews & Feedback Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-8">
        <div className="border-b border-slate-100 pb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
          <h3 className="font-black text-slate-900 text-lg">Đánh giá khách hàng</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Write a Review Box (5 Columns on Laptop) */}
          <div className="lg:col-span-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Gửi đánh giá của bạn</h4>
            
            {token ? (
              <form onSubmit={handleSubmitReview} className="space-y-4 bg-slate-50 border border-slate-200/60 p-5 rounded-2xl">
                {/* Rating Stars Selector */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đánh giá của bạn *</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Textarea */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bình luận cảm nhận *</span>
                  <textarea
                    required
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm của bạn về chất liệu, form dáng và dịch vụ của shop..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReview ? 'Đang gửi đánh giá...' : 'Gửi đánh giá sản phẩm'}</span>
                </button>
              </form>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-2xl text-center space-y-3">
                <p className="text-xs text-slate-500 font-medium">Bạn cần đăng nhập tài khoản để có thể đánh giá sản phẩm này.</p>
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/products/${slug}`)}`}
                  className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Đăng nhập ngay
                </Link>
              </div>
            )}
          </div>

          {/* List of Reviews (7 Columns on Laptop) */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Nhận xét từ người mua ({reviews.length})</h4>

            {reviews.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                Sản phẩm chưa có nhận xét nào. Hãy gửi đánh giá đầu tiên của bạn!
              </div>
            ) : (
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <p className="font-extrabold text-slate-800">{rev.profiles?.full_name || rev.profiles?.email.split('@')[0] || 'Người mua hàng'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(rev.created_at).toLocaleDateString('vi-VN')}</p>
                      </div>
                      
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
