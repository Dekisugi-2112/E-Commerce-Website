'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, FolderTree, Tag } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetchApi<{ success: boolean; data: any[] }>('/categories');
        if (res.success) {
          setCategories(res.data);
        }
      } catch (err: any) {
        setError(err.message || 'Lỗi tải danh mục');
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  // Lọc ra các danh mục cha (parent_id là null hoặc không tìm thấy parent_id trong danh sách)
  const parentCategories = categories.filter(c => !c.parent_id);

  // Lấy các danh mục con cho một danh mục cha
  const getSubCategories = (parentId: string) => {
    return categories.filter(c => c.parent_id === parentId);
  };

  // Các ảnh mặc định chất lượng cao cho danh mục cha nếu thiếu ảnh
  const fallbackImages: Record<string, string> = {
    "Thời trang Nam": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800",
    "Thời trang Nữ": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800",
    "Giày dép": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800",
    "Phụ kiện": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 animate-in fade-in duration-500">
      {/* Title Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
          <FolderTree className="w-3.5 h-3.5" />
          <span>Danh Mục Mua Sắm</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Khám Phá Danh Mục</h1>
        <p className="text-slate-500 text-xs sm:text-sm">
          Phân loại sản phẩm đa dạng giúp bạn dễ dàng tìm kiếm những bộ trang phục phong cách phù hợp nhất.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Đang tải danh mục thời trang...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center text-rose-700 text-xs max-w-md mx-auto">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {parentCategories.map((parent) => {
            const subs = getSubCategories(parent.id);
            const imgUrl = parent.image_url || fallbackImages[parent.name] || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800";
            
            return (
              <div 
                key={parent.id} 
                className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 grid grid-cols-1 sm:grid-cols-12"
              >
                {/* Visual Category Card */}
                <Link 
                  href={`/products?category=${parent.slug}`}
                  className="cursor-pointer block relative sm:col-span-5 h-48 sm:h-full bg-slate-100 overflow-hidden min-h-[180px]"
                >
                  <img
                    src={imgUrl}
                    alt={parent.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-5 text-white">
                    <h3 className="font-extrabold text-lg sm:text-xl tracking-tight">{parent.name}</h3>
                    <p className="text-[10px] text-slate-300 font-medium mt-0.5">{subs.length} danh mục con</p>
                  </div>
                </Link>

                {/* Subcategories list */}
                <div className="sm:col-span-7 p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Danh mục chi tiết</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {subs.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/products?category=${sub.slug}`}
                          className="px-3 py-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-semibold rounded-xl border border-slate-100 hover:border-emerald-100 transition-all truncate"
                          title={sub.name}
                        >
                          {sub.name}
                        </Link>
                      ))}
                      {subs.length === 0 && (
                        <span className="text-[10px] text-slate-400 italic">Chưa có danh mục con</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <Link
                      href={`/products?category=${parent.slug}`}
                      className="text-xs font-bold text-slate-800 hover:text-emerald-600 transition-colors flex items-center gap-1.5"
                    >
                      <span>Xem tất cả {parent.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
