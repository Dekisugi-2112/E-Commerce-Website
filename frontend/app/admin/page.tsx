'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldAlert, LayoutDashboard, ShoppingBag, FolderTree, 
  Receipt, Percent, ArrowRight, Star, Plus, Trash2, Edit3, 
  Save, RefreshCw, TrendingUp, CheckCircle, PackageOpen, User 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface Stats {
  revenue: number;
  total_orders: number;
  total_products: number;
  total_users: number;
}

const toSlug = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'orders' | 'coupons'>('dashboard');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Dashboard State
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // 2. Product Management States
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  // Form Product
  const [showProductForm, setShowProductForm] = useState(false);
  const [pId, setPId] = useState(''); // Empty for create, non-empty for edit
  const [pName, setPName] = useState('');
  const [pSlug, setPSlug] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pCategoryId, setPCategoryId] = useState('');
  const [pImageUrl, setPImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  
  // Variant Management States
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any | null>(null);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [vSku, setVSku] = useState('');
  const [vSize, setVSize] = useState('');
  const [vColor, setVColor] = useState('');
  const [vPrice, setVPrice] = useState('');
  const [vStock, setVStock] = useState('');

  // 3. Category Management States
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [cId, setCId] = useState('');
  const [cName, setCName] = useState('');
  const [cSlug, setCSlug] = useState('');
  const [cImageUrl, setCImageUrl] = useState('');

  // 4. Order Management States
  const [orders, setOrders] = useState<any[]>([]);

  // 5. Coupon Management States
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponVal, setCouponVal] = useState('');

  // Authorization Check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/admin');
      } else if (user.role !== 'admin') {
        setErrorMsg('Bạn không có quyền truy cập trang quản trị!');
      } else {
        loadAdminData();
      }
    }
  }, [user, authLoading]);

  const loadAdminData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const statsRes = await fetchApi<{ success: boolean; stats: Stats; recent_orders: any[]; category_stats?: any[] }>('/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.success) {
        setStats(statsRes.stats);
        setRecentOrders(statsRes.recent_orders);
        if (statsRes.category_stats) {
          setCategoryStats(statsRes.category_stats);
        }
      }

      // Fetch Categories
      const catRes = await fetchApi<{ success: boolean; data: any[] }>('/categories');
      if (catRes.success) setCategories(catRes.data);

      // Fetch Products
      const prodRes = await fetchApi<{ success: boolean; data: any[] }>('/products?limit=100');
      if (prodRes.success) setProducts(prodRes.data);

      // Fetch Orders
      const orderRes = await fetchApi<{ success: boolean; data: any[] }>('/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (orderRes.success) setOrders(orderRes.data);

      // Fetch Coupons
      const coupRes = await fetchApi<{ success: boolean; data: any[] }>('/admin/coupons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (coupRes.success) setCoupons(coupRes.data);

    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi tải dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, isSuccess = true) => {
    if (isSuccess) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // --- CRUD Category ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName || !cSlug) return;
    try {
      const endpoint = cId ? `/admin/categories/${cId}` : '/admin/categories';
      const method = cId ? 'PUT' : 'POST';
      const res = await fetchApi<{ success: boolean; message: string; data: any }>(endpoint, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cName, slug: cSlug, image_url: cImageUrl })
      });
      if (res.success) {
        showToast(res.message);
        setShowCategoryForm(false);
        setCId(''); setCName(''); setCSlug(''); setCImageUrl('');
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu danh mục');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    try {
      const res = await fetchApi<{ success: boolean; message: string }>(`/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.success) {
        showToast(res.message);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa danh mục');
    }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `user_upload/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('products')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);
      
      setPImageUrl(publicUrl);
      showToast('Tải lên ảnh thành công!');
    } catch (err: any) {
      alert('Lỗi upload ảnh: ' + (err.message || err));
    } finally {
      setIsUploading(false);
    }
  };

  // --- CRUD Product ---
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pSlug || !pPrice || !pCategoryId) return;
    try {
      const endpoint = pId ? `/admin/products/${pId}` : '/admin/products';
      const method = pId ? 'PUT' : 'POST';
      const res = await fetchApi<{ success: boolean; message: string }>(endpoint, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pName,
          slug: pSlug,
          description: pDescription,
          base_price: Number(pPrice),
          category_id: pCategoryId,
          status: 'active',
          image_url: pImageUrl || undefined
        })
      });
      if (res.success) {
        showToast(res.message);
        setShowProductForm(false);
        setPId(''); setPName(''); setPSlug(''); setPDescription(''); setPPrice(''); setPCategoryId(''); setPImageUrl('');
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu sản phẩm');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) return;
    try {
      const res = await fetchApi<{ success: boolean; message: string }>(`/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.success) {
        showToast(res.message);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa sản phẩm');
    }
  };

  // --- CRUD Variant ---
  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForVariants || !vSku || !vSize || !vColor || !vPrice || !vStock) return;
    try {
      const res = await fetchApi<{ success: boolean; message: string; data: any }>(`/admin/products/${selectedProductForVariants.id}/variants`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: vSku,
          attributes: { size: vSize, color: vColor },
          price: Number(vPrice),
          stock_quantity: Number(vStock)
        })
      });
      if (res.success) {
        showToast(res.message);
        setShowVariantForm(false);
        setVSku(''); setVSize(''); setVColor(''); setVPrice(''); setVStock('');
        // Update product variants state
        const updatedVariants = [...(selectedProductForVariants.product_variants || []), res.data];
        setSelectedProductForVariants({ ...selectedProductForVariants, product_variants: updatedVariants });
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu biến thể');
    }
  };

  const handleDeleteVariant = async (vId: string) => {
    if (!window.confirm('Xóa biến thể sản phẩm này?')) return;
    try {
      const res = await fetchApi<{ success: boolean; message: string }>(`/admin/variants/${vId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.success) {
        showToast(res.message);
        if (selectedProductForVariants) {
          const updated = selectedProductForVariants.product_variants.filter((v: any) => v.id !== vId);
          setSelectedProductForVariants({ ...selectedProductForVariants, product_variants: updated });
        }
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa biến thể');
    }
  };

  // --- Order Status Change ---
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetchApi<{ success: boolean; message: string }>(`/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        showToast(res.message);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật trạng thái đơn');
    }
  };

  // --- Coupon CRUD ---
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponVal) return;
    try {
      const res = await fetchApi<{ success: boolean; message: string }>(`/admin/coupons`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          discount_type: 'fixed',
          discount_value: Number(couponVal),
          min_order_value: 0
        })
      });
      if (res.success) {
        showToast(res.message);
        setShowCouponForm(false);
        setCouponCode(''); setCouponVal('');
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo mã coupon');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Xóa mã giảm giá này?')) return;
    try {
      const res = await fetchApi<{ success: boolean; message: string }>(`/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.success) {
        showToast(res.message);
        loadAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa coupon');
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500 animate-pulse flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Đang tải thông tin quản trị hệ thống...</span>
        </div>
      </div>
    );
  }

  // Non-admin Access Denied Page
  if (user && user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Truy cập bị từ chối!</h2>
        <p className="text-xs text-slate-500">Tài khoản của bạn không được phân quyền truy cập trang quản trị này.</p>
        <Link href="/" className="inline-block px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors">
          Về Trang Chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Toast banners */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Admin Title Top Bar */}
      <div className="border-b border-slate-200 pb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Shofy Control Panel</span>
            <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Trang điều khiển quản trị thống kê và cấu hình hệ thống bán hàng</p>
        </div>
        <button
          onClick={loadAdminData}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới
        </button>
      </div>

      {/* Admin Horizontal Tabs navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-thin text-xs font-bold text-slate-500">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all ${
            activeTab === 'dashboard' ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Thống kê</span>
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all ${
            activeTab === 'products' ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Sản phẩm</span>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all ${
            activeTab === 'categories' ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Danh mục</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all ${
            activeTab === 'orders' ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Đơn hàng</span>
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 transition-all ${
            activeTab === 'coupons' ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Khuyến mãi</span>
        </button>
      </div>

      {/* --- TAB CONTENT: DASHBOARD STATS --- */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-8 animate-in fade-in">
          {/* Stats grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Doanh thu thực</p>
                <h3 className="text-xl font-black text-slate-900">{formatVND(stats.revenue)}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng hóa đơn</p>
                <h3 className="text-xl font-black text-slate-900">{stats.total_orders} đơn</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Số lượng sản phẩm</p>
                <h3 className="text-xl font-black text-slate-900">{stats.total_products} SP</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng khách hàng</p>
                <h3 className="text-xl font-black text-slate-900">{stats.total_users} user</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Dashboard Charts & Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart: Thống kê doanh số theo loại sản phẩm (5 Columns) */}
            <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Thống kê loại sản phẩm bán chạy</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Số lượng sản phẩm bán ra theo danh mục cha (Không tính đơn bị hủy)</p>
              </div>

              <div className="space-y-4 my-2">
                {categoryStats.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-medium">
                    Chưa có số liệu thống kê danh mục nào.
                  </div>
                ) : (
                  categoryStats.map((c, index) => {
                    const maxSales = Math.max(...categoryStats.map(s => s.sales), 1);
                    const percent = (c.sales / maxSales) * 100;
                    
                    // Curated colors for bars
                    const barColors = [
                      'from-emerald-500 to-teal-400',
                      'from-blue-500 to-indigo-400',
                      'from-amber-500 to-orange-400',
                      'from-rose-500 to-pink-400',
                      'from-purple-500 to-violet-400'
                    ];
                    const gradientClass = barColors[index % barColors.length];

                    return (
                      <div key={c.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>{c.category}</span>
                          <span className="text-emerald-700 font-extrabold">{c.sales} SP</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-1000`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="text-[9px] text-slate-400 font-medium pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Dữ liệu thực tế Supabase</span>
                <span>Cập nhật trực tuyến</span>
              </div>
            </div>

            {/* Recent Orders Table (7 Columns) */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm">Các đơn hàng vừa đặt</h3>
              <div className="overflow-x-auto text-xs font-semibold">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase">
                      <th className="pb-3 font-bold">Mã Đơn</th>
                      <th className="pb-3 font-bold">Khách Hàng</th>
                      <th className="pb-3 font-bold">Trạng Thái</th>
                      <th className="pb-3 font-bold">Tổng Thanh Toán</th>
                      <th className="pb-3 font-bold">Ngày Đặt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {recentOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="py-3 font-mono text-[10px] select-all">{ord.id.slice(0, 8)}...</td>
                        <td className="py-3">{ord.profiles?.full_name || ord.profiles?.email.split('@')[0]}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            ord.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            ord.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 font-extrabold text-emerald-700">{formatVND(ord.total)}</td>
                        <td className="py-3 text-slate-400">{new Date(ord.created_at).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB CONTENT: PRODUCT CRUD --- */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Danh Sách Sản Phẩm</h3>
            <button
              onClick={() => {
                setPId(''); setPName(''); setPSlug(''); setPDescription(''); setPPrice(''); setPCategoryId('');
                setShowProductForm(!showProductForm);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm sản phẩm mới
            </button>
          </div>

          {/* Form Create/Edit Product */}
          {showProductForm && (
            <form onSubmit={handleSaveProduct} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="sm:col-span-2 text-sm font-bold border-b pb-2 text-slate-800">
                {pId ? 'Cập nhật thông tin sản phẩm' : 'Đăng bán sản phẩm mới'}
              </div>
              
              <div>
                <label className="block mb-1">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPName(val);
                    setPSlug(toSlug(val));
                  }}
                  placeholder="Ví dụ: Áo thun nam Polo Oxford"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block mb-1">Đường dẫn thân thiện (Slug) * <span className="text-[10px] text-slate-400 font-normal">(Tự động tạo)</span></label>
                <input
                  type="text"
                  required
                  disabled
                  value={pSlug}
                  placeholder="Tự động sinh theo tên..."
                  className="w-full px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block mb-1">Giá bán cơ bản (VND) *</label>
                <input
                  type="number"
                  required
                  value={pPrice}
                  onChange={(e) => setPPrice(e.target.value)}
                  placeholder="Ví dụ: 350000"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block mb-1">Danh mục sản phẩm *</label>
                <select
                  required
                  value={pCategoryId}
                  onChange={(e) => setPCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block mb-1">Hình ảnh sản phẩm (Tải lên từ máy tính)</label>
                <div className="flex items-center gap-4 bg-white border border-slate-200 p-3 rounded-xl">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProductImageUpload}
                    className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
                  />
                  {isUploading && (
                    <span className="text-[10px] text-emerald-600 animate-pulse font-bold">Đang tải lên...</span>
                  )}
                  {pImageUrl && (
                    <div className="relative w-12 h-12 rounded-lg border overflow-hidden bg-slate-50">
                      <img src={pImageUrl} className="w-full h-full object-cover" alt="Preview" />
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block mb-1">Mô tả sản phẩm *</label>
                <textarea
                  required
                  rows={3}
                  value={pDescription}
                  onChange={(e) => setPDescription(e.target.value)}
                  placeholder="Mô tả chất liệu, thiết kế, hướng dẫn chọn size..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl resize-none"
                />
              </div>

              <div className="sm:col-span-2 flex gap-3 pt-2">
                <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold">
                  Lưu sản phẩm
                </button>
                <button type="button" onClick={() => setShowProductForm(false)} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold">
                  Hủy bỏ
                </button>
              </div>
            </form>
          )}

          {/* Product list with variants view */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Products Table (7 Columns on Laptop) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="overflow-x-auto text-xs font-semibold">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase">
                      <th className="pb-3">Sản phẩm</th>
                      <th className="pb-3">Danh Mục</th>
                      <th className="pb-3">Giá</th>
                      <th className="pb-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.map((p) => (
                      <tr key={p.id} className={`hover:bg-slate-50 cursor-pointer ${selectedProductForVariants?.id === p.id ? 'bg-slate-50' : ''}`} onClick={() => setSelectedProductForVariants(p)}>
                        <td className="py-3 pr-2 font-bold text-slate-900 truncate max-w-[160px]" title={p.name}>{p.name}</td>
                        <td className="py-3 text-slate-500">{p.categories?.name || 'Chưa phân loại'}</td>
                        <td className="py-3 font-extrabold text-emerald-700">{formatVND(p.base_price)}</td>
                        <td className="py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              const primaryImg = p.product_images?.find((img: any) => img.is_primary)?.image_url || p.product_images?.[0]?.image_url || '';
                              setPId(p.id); setPName(p.name); setPSlug(p.slug); setPDescription(p.description); setPPrice(p.base_price.toString()); setPCategoryId(p.category_id); setPImageUrl(primaryImg);
                              setShowProductForm(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Product Variants Management Panel (5 Columns on Laptop) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              {selectedProductForVariants ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Cấu hình biến thể</p>
                      <h4 className="font-extrabold text-slate-900 text-xs truncate max-w-[200px]" title={selectedProductForVariants.name}>
                        {selectedProductForVariants.name}
                      </h4>
                    </div>
                    <button
                      onClick={() => setShowVariantForm(!showVariantForm)}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[10px]"
                    >
                      + Thêm biến thể
                    </button>
                  </div>

                  {/* Add Variant Form */}
                  {showVariantForm && (
                    <form onSubmit={handleSaveVariant} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 text-[11px] font-semibold">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block mb-0.5">Mã SKU *</label>
                          <input type="text" required placeholder="SP-M-RED" value={vSku} onChange={(e) => setVSku(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
                        </div>
                        <div>
                          <label className="block mb-0.5">Giá biến thể *</label>
                          <input type="number" required placeholder="350000" value={vPrice} onChange={(e) => setVPrice(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
                        </div>
                        <div>
                          <label className="block mb-0.5">Size (Kích cỡ) *</label>
                          <input type="text" required placeholder="M" value={vSize} onChange={(e) => setVSize(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
                        </div>
                        <div>
                          <label className="block mb-0.5">Color (Màu sắc) *</label>
                          <input type="text" required placeholder="Đỏ" value={vColor} onChange={(e) => setVColor(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
                        </div>
                        <div className="col-span-2">
                          <label className="block mb-0.5">Số lượng kho hàng *</label>
                          <input type="number" required placeholder="50" value={vStock} onChange={(e) => setVStock(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold">Lưu biến thể</button>
                        <button type="button" onClick={() => setShowVariantForm(false)} className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg font-bold">Hủy</button>
                      </div>
                    </form>
                  )}

                  {/* List of existing variants */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {(selectedProductForVariants.product_variants || []).length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-semibold text-center py-4">Sản phẩm này chưa có biến thể size/màu.</p>
                    ) : (
                      selectedProductForVariants.product_variants.map((v: any) => (
                        <div key={v.id} className="border border-slate-100 rounded-xl p-3 flex items-center justify-between text-[11px] font-semibold">
                          <div>
                            <p className="font-mono text-slate-900">{v.sku}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">Size: {v.attributes?.size} | Màu: {v.attributes?.color} | Kho: {v.stock_quantity}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-emerald-700">{formatVND(v.price)}</span>
                            <button
                              onClick={() => handleDeleteVariant(v.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-2">
                  <PackageOpen className="w-8 h-8 text-slate-300" />
                  <span>Chọn 1 sản phẩm bên trái để xem và quản lý danh sách biến thể.</span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- TAB CONTENT: CATEGORY CRUD --- */}
      {activeTab === 'categories' && (
        <div className="space-y-6 animate-in fade-in max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Danh Mục Sản Phẩm</h3>
            <button
              onClick={() => {
                setCId(''); setCName(''); setCSlug(''); setCImageUrl('');
                setShowCategoryForm(!showCategoryForm);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm danh mục mới
            </button>
          </div>

          {/* Form Create/Edit Category */}
          {showCategoryForm && (
            <form onSubmit={handleSaveCategory} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 text-xs font-semibold">
              <h4 className="text-sm font-bold border-b pb-1 text-slate-800">{cId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Tên danh mục *</label>
                  <input
                    type="text"
                    required
                    value={cName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCName(val);
                      setCSlug(toSlug(val));
                    }}
                    placeholder="Ví dụ: Giày Nam"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-1">Đường dẫn thân thiện (Slug) * <span className="text-[10px] text-slate-400 font-normal">(Tự động tạo)</span></label>
                  <input
                    type="text"
                    required
                    disabled
                    value={cSlug}
                    placeholder="Tự động sinh theo tên..."
                    className="w-full px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1">Link hình ảnh đại diện (Tùy chọn)</label>
                <input type="url" value={cImageUrl} onChange={(e) => setCImageUrl(e.target.value)} placeholder="https://images.unsplash.com/..." className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold">Lưu danh mục</button>
                <button type="button" onClick={() => setShowCategoryForm(false)} className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold">Hủy bỏ</button>
              </div>
            </form>
          )}

          {/* Categories Table list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="overflow-x-auto text-xs font-semibold">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase">
                    <th className="pb-3">Tên Danh Mục</th>
                    <th className="pb-3">Slug</th>
                    <th className="pb-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 text-slate-500">{c.slug}</td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setCId(c.id); setCName(c.name); setCSlug(c.slug); setCImageUrl(c.image_url || '');
                            setShowCategoryForm(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: ORDER MANAGEMENT --- */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-in fade-in">
          <h3 className="font-extrabold text-slate-900 text-sm">Quản Lý Đơn Đặt Hàng</h3>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="overflow-x-auto text-xs font-semibold">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase">
                    <th className="pb-3 font-bold">Mã Đơn</th>
                    <th className="pb-3 font-bold">Khách Hàng</th>
                    <th className="pb-3 font-bold">Thanh Toán</th>
                    <th className="pb-3 font-bold">Giá Trị</th>
                    <th className="pb-3 font-bold">Cập Nhật Trạng Thái</th>
                    <th className="pb-3 font-bold">Địa Chỉ Giao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {orders.map((ord) => {
                    const pay = ord.payments?.[0];
                    const addr = ord.addresses;
                    
                    return (
                      <tr key={ord.id}>
                        <td className="py-4 font-mono text-[10px] select-all">{ord.id.slice(0, 8)}...</td>
                        <td className="py-4">
                          <p className="font-bold text-slate-900">{ord.profiles?.full_name || 'Khách vãng lai'}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{ord.profiles?.email}</p>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            pay?.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {pay?.method || 'COD'} - {pay?.status || 'pending'}
                          </span>
                        </td>
                        <td className="py-4 font-extrabold text-emerald-700">{formatVND(ord.total)}</td>
                        <td className="py-4">
                          <select
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${
                              ord.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              ord.status === 'confirmed' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                              ord.status === 'shipping' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                              ord.status === 'delivered' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                              'bg-rose-50 border-rose-200 text-rose-700'
                            }`}
                          >
                            <option value="pending">Chờ xác nhận</option>
                            <option value="confirmed">Đã xác nhận</option>
                            <option value="shipping">Đang giao hàng</option>
                            <option value="delivered">Đã giao hàng</option>
                            <option value="cancelled">Đã hủy đơn</option>
                          </select>
                        </td>
                        <td className="py-4 text-[10px] text-slate-400 font-medium truncate max-w-[200px]" title={addr ? `${addr.detail}, ${addr.ward}, ${addr.district}, ${addr.province}` : ''}>
                          {addr ? `${addr.detail}, ${addr.ward}, ${addr.district}` : 'Chưa cập nhật'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: COUPON CRUD --- */}
      {activeTab === 'coupons' && (
        <div className="space-y-6 animate-in fade-in max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm">Mã Khuyến Mãi / Coupons</h3>
            <button
              onClick={() => setShowCouponForm(!showCouponForm)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Tạo coupon mới
            </button>
          </div>

          {/* Form Create Coupon */}
          {showCouponForm && (
            <form onSubmit={handleSaveCoupon} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 text-xs font-semibold">
              <h4 className="text-sm font-bold border-b pb-1 text-slate-800">Tạo mã giảm giá mới</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1">Mã giảm giá (Coupon Code) *</label>
                  <input type="text" required placeholder="Ví dụ: CHAOHE2026" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block mb-1">Số tiền giảm (VND) *</label>
                  <input type="number" required placeholder="Ví dụ: 50000" value={couponVal} onChange={(e) => setCouponVal(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold">Lưu mã giảm giá</button>
                <button type="button" onClick={() => setShowCouponForm(false)} className="px-5 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold">Hủy bỏ</button>
              </div>
            </form>
          )}

          {/* Coupons Table List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="overflow-x-auto text-xs font-semibold">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase">
                    <th className="pb-3">Mã giảm giá</th>
                    <th className="pb-3">Phương thức giảm</th>
                    <th className="pb-3">Giá Trị</th>
                    <th className="pb-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 font-mono font-bold text-slate-900">{c.code}</td>
                      <td className="py-3 text-slate-500 uppercase">{c.discount_type}</td>
                      <td className="py-3 font-extrabold text-rose-600">{formatVND(c.discount_value)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
