'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, ChevronRight, RotateCcw, HelpCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';

interface OrderItem {
  id: string;
  product_name: string;
  variant_attributes: { size?: string; color?: string };
  price: number;
  quantity: number;
}

interface Payment {
  method: string;
  status: string;
}

interface Address {
  recipient_name: string;
  phone: string;
  detail: string;
  ward: string;
  district: string;
  province: string;
}

interface Order {
  id: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  created_at: string;
  order_items: OrderItem[];
  payments?: Payment[];
  addresses?: Address;
}

function OrdersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto show success message if redirect from VNPay mock success
  useEffect(() => {
    if (searchParams.get('payment_success') === 'true') {
      setSuccessMsg('Thanh toán trực tuyến VNPay thành công! Đơn hàng của bạn đã được xác nhận.');
      // Clean query params
      router.replace('/orders');
    }
  }, [searchParams]);

  // Load orders list
  useEffect(() => {
    async function loadOrders() {
      if (!token) return;
      setIsLoading(true);
      setErrorMsg('');
      try {
        const res = await fetchApi<{ success: boolean; data: Order[] }>('/orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.success) {
          setOrders(res.data);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Lỗi tải danh sách đơn hàng.');
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && !user) {
      router.push('/login?redirect=/orders');
    } else if (token) {
      loadOrders();
    }
  }, [user, token, authLoading, router]);

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) {
      return;
    }

    try {
      const res = await fetchApi<{ success: boolean; message: string }>(`/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.success) {
        setSuccessMsg(res.message);
        // Refresh orders list
        setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            return { ...o, status: 'cancelled', payments: o.payments ? o.payments.map(p => ({ ...p, status: 'failed' })) : [] };
          }
          return o;
        }));
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể hủy đơn hàng.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Chờ xác nhận</span>;
      case 'confirmed':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Đã xác nhận</span>;
      case 'shipping':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Đang giao hàng</span>;
      case 'delivered':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Đã giao hàng</span>;
      case 'cancelled':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Đã hủy</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  const getPaymentBadge = (method: string, status: string) => {
    const methodStr = method.toUpperCase() === 'COD' ? 'COD' : 'VNPay';
    if (status.toLowerCase() === 'paid') {
      return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded">{methodStr} - Đã thanh toán</span>;
    }
    if (status.toLowerCase() === 'failed') {
      return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold px-2 py-0.5 rounded">{methodStr} - Đã hủy</span>;
    }
    return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded">{methodStr} - Chưa thanh toán</span>;
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500 font-semibold animate-pulse">
        Đang tải lịch sử đơn hàng của bạn...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Đơn Hàng Của Tôi</h1>
        <p className="text-xs text-slate-500 mt-1">Quản lý và theo dõi trạng thái giao hàng các đơn hàng của bạn</p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Bạn chưa mua đơn hàng nào</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Đơn hàng sau khi đặt mua thành công sẽ được hiển thị và quản lý trực tiếp tại trang này.
          </p>
          <Link href="/products" className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors">
            <span>Khám phá sản phẩm</span>
          </Link>
        </div>
      ) : (
        /* List of orders */
        <div className="space-y-6">
          {orders.map((order) => {
            const pMethod = order.payments?.[0]?.method || 'cod';
            const pStatus = order.payments?.[0]?.status || 'pending';
            
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Card Topbar */}
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-slate-400">Đơn hàng: </span>
                      <span className="text-slate-950 font-bold select-all">{order.id.slice(0, 8)}...</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Ngày đặt: </span>
                      <span className="text-slate-800">{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPaymentBadge(pMethod, pStatus)}
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Card ordered items list */}
                <div className="p-5 divide-y divide-slate-100">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs font-semibold">
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-900 truncate">{item.product_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Size: {item.variant_attributes.size || 'Mặc định'} | Màu: {item.variant_attributes.color || 'Mặc định'} | Số lượng: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-800">{formatVND(item.price)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Thành tiền: {formatVND(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card footer summary & actions */}
                <div className="bg-slate-50/50 px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500 font-semibold flex items-center gap-4 w-full sm:w-auto">
                    <div>
                      <span>Tạm tính: </span>
                      <span className="text-slate-800">{formatVND(order.subtotal)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div>
                        <span>Giảm: </span>
                        <span className="text-rose-600">-{formatVND(order.discount_amount)}</span>
                      </div>
                    )}
                    <div>
                      <span>Tổng tiền: </span>
                      <span className="text-emerald-700 text-sm font-extrabold">{formatVND(order.total)}</span>
                    </div>
                  </div>

                  {order.status.toLowerCase() === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-bold border border-rose-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Hủy đơn hàng</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500 font-semibold animate-pulse">
        Đang tải trang quản lý đơn hàng...
      </div>
    }>
      <OrdersListContent />
    </Suspense>
  );
}
