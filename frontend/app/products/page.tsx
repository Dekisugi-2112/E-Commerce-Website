'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShoppingBag, Star, Filter, Search, RotateCcw, SlidersHorizontal, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  image_url?: string;
}

interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  stock_quantity: number;
}

interface ProductImage {
  image_url: string;
  is_primary: boolean;
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

function ProductsListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State filters
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Active filter states
  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Auto-expand parent category when a subcategory is selected
  useEffect(() => {
    if (selectedCategory && categories.length > 0) {
      const activeCat = categories.find(c => c.slug === selectedCategory);
      if (activeCat?.parent_id) {
        setExpandedParents(prev => ({
          ...prev,
          [activeCat.parent_id!]: true
        }));
      }
    }
  }, [selectedCategory, categories]);

  const toggleParent = (parentId: string) => {
    setExpandedParents(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  // Load Categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetchApi<{ success: boolean; data: Category[] }>('/categories');
        if (res.success) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    }
    loadCategories();
  }, []);

  // Fetch products dynamically when filters change
  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const queryParams = new URLSearchParams();
        if (selectedCategory) queryParams.set('category_slug', selectedCategory);
        if (searchParams.get('search')) queryParams.set('search', searchParams.get('search') || '');
        if (minPrice) queryParams.set('min_price', minPrice);
        if (maxPrice) queryParams.set('max_price', maxPrice);
        queryParams.set('sort', sortBy);

        const res = await fetchApi<{ success: boolean; data: Product[] }>(`/products?${queryParams.toString()}`);
        if (res.success) {
          setProducts(res.data);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Không thể kết nối đến API server. Hãy đảm bảo bạn đã chạy uvicorn.');
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, [selectedCategory, searchParams.get('search'), minPrice, maxPrice, sortBy]);

  // Handle filter submissions
  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchVal) {
      params.set('search', searchVal);
    } else {
      params.delete('search');
    }
    router.push(`/products?${params.toString()}`);
  };

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    router.push(`/products?${params.toString()}`);
  };

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set('min_price', minPrice);
    else params.delete('min_price');
    
    if (maxPrice) params.set('max_price', maxPrice);
    else params.delete('max_price');
    
    router.push(`/products?${params.toString()}`);
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    router.push(`/products?${params.toString()}`);
  };

  const resetFilters = () => {
    setSearchVal('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    router.push('/products');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Search and Sort Topbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <form onSubmit={applySearch} className="relative w-full md:max-w-md">
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Tìm sản phẩm, chất liệu, kiểu dáng..."
            className="w-full pl-10 pr-24 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <button
            type="submit"
            className="absolute right-2 top-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-500 transition-colors"
          >
            Tìm kiếm
          </button>
        </form>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sắp xếp:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-100 transition-all"
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá: Thấp đến Cao</option>
            <option value="price_desc">Giá: Cao đến Thấp</option>
            <option value="popular">Bán chạy nhất</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters + Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar Filter Column (4 Columns on Laptop) */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <span>Bộ lọc sản phẩm</span>
              </div>
              <button
                onClick={resetFilters}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 tracking-wider uppercase">Danh mục</h4>
              <div className="flex flex-col gap-1.5 text-xs font-semibold">
                <button
                  onClick={() => handleCategorySelect('')}
                  className={`text-left px-3 py-2 rounded-xl transition-all ${
                    !selectedCategory
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Tất cả sản phẩm
                </button>
                
                {/* Parent Categories Accordion */}
                {categories
                  .filter((cat) => !cat.parent_id)
                  .map((parent) => {
                    const children = categories.filter((c) => c.parent_id === parent.id);
                    const isExpanded = !!expandedParents[parent.id];
                    const isParentSelected = selectedCategory === parent.slug;

                    return (
                      <div key={parent.id} className="space-y-1">
                        {/* Parent Row */}
                        <div className="flex items-center justify-between rounded-xl hover:bg-slate-50 transition-colors">
                          <button
                            onClick={() => handleCategorySelect(parent.slug)}
                            className={`flex-1 text-left px-3 py-2 transition-all ${
                              isParentSelected
                                ? 'text-emerald-700 font-bold'
                                : 'text-slate-700'
                            }`}
                          >
                            {parent.name}
                          </button>
                          
                          {children.length > 0 && (
                            <button
                              onClick={() => toggleParent(parent.id)}
                              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                              aria-label="Expand category"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Child Categories (Submenu) */}
                        {isExpanded && children.length > 0 && (
                          <div className="flex flex-col gap-1 pl-4 border-l border-slate-100 ml-3 py-0.5 animate-in slide-in-from-top-1 duration-150">
                            {children.map((child) => {
                              const isChildSelected = selectedCategory === child.slug;
                              return (
                                <button
                                  key={child.id}
                                  onClick={() => handleCategorySelect(child.slug)}
                                  className={`text-left px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                                    isChildSelected
                                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                                      : 'text-slate-500 hover:bg-slate-50'
                                  }`}
                                >
                                  {child.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 tracking-wider uppercase">Khoảng giá (VND)</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={applyPriceFilter}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors mt-2"
              >
                Áp dụng giá
              </button>
            </div>
          </div>
        </aside>

        {/* Right Product Grid Column (9 Columns on Laptop) */}
        <main className="lg:col-span-9 space-y-6">
          {/* Error Notice */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              💡 <strong>Lưu ý:</strong> Hãy đảm bảo Backend Server của bạn đang chạy ở cổng 8000.
            </div>
          )}

          {/* Skeleton Loading State */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200/50 p-4 space-y-4 animate-pulse">
                  <div className="aspect-[4/5] bg-slate-100 rounded-xl"></div>
                  <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
                <SlidersHorizontal className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Không tìm thấy sản phẩm phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc giá để tìm thấy sản phẩm phù hợp.
              </p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-700/10"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          ) : (
            /* Real Product Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => {
                const primaryImg = product.product_images?.find(img => img.is_primary)?.image_url 
                  || product.product_images?.[0]?.image_url 
                  || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800';

                const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.base_price);

                return (
                  <div key={product.id} className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
                    {/* Product Image */}
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

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-base font-extrabold text-emerald-700">{formattedPrice}</span>
                        <Link href={`/products/${product.slug}`} className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors">
                          <ShoppingBag className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500 font-semibold animate-pulse">
        Đang tải danh sách sản phẩm thời trang...
      </div>
    }>
      <ProductsListContent />
    </Suspense>
  );
}
