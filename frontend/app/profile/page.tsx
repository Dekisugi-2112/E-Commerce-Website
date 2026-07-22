'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Shield, LogOut, ShoppingBag, CheckCircle, MapPin, Trash2, Home, Star, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';

interface Address {
  id: string;
  recipient_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  is_default: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout, isLoading, updateProfileState } = useAuth();

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Addresses States
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newWard, setNewWard] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);

  // Status message states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [addrSuccessMsg, setAddrSuccessMsg] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      loadAddresses();
    }
  }, [user, isLoading, router]);

  const loadAddresses = async () => {
    if (!token) return;
    try {
      const res = await fetchApi<{ success: boolean; data: Address[] }>('/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.success) {
        setAddresses(res.data);
      }
    } catch (err) {
      console.error('Error loading addresses:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetchApi<any>('/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: fullName,
          phone: phone
        })
      });

      if (res) {
        // Cập nhật thông tin profile trong AuthContext state
        updateProfileState({ full_name: res.full_name, phone: res.phone });
        setSuccessMsg('Cập nhật thông tin hồ sơ thành công!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi cập nhật thông tin cá nhân.');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrSuccessMsg('');
    
    if (!newRecipientName || !newPhone || !newProvince || !newDistrict || !newWard || !newDetail) {
      alert('Vui lòng nhập đầy đủ thông tin địa chỉ!');
      return;
    }

    try {
      const res = await fetchApi<{ success: boolean; message: string; data: Address }>('/addresses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_name: newRecipientName,
          phone: newPhone,
          province: newProvince,
          district: newDistrict,
          ward: newWard,
          detail: newDetail,
          is_default: newIsDefault
        })
      });

      if (res.success) {
        setAddrSuccessMsg(res.message);
        loadAddresses(); // Refresh address list
        // Reset form inputs
        setNewRecipientName('');
        setNewPhone('');
        setNewProvince('');
        setNewDistrict('');
        setNewWard('');
        setNewDetail('');
        setNewIsDefault(false);
        setShowAddAddressForm(false);
        setTimeout(() => setAddrSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm địa chỉ mới.');
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const res = await fetchApi<{ success: boolean; message: string }>(`/addresses/${addressId}/default`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.success) {
        setAddrSuccessMsg(res.message);
        loadAddresses();
        setTimeout(() => setAddrSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể đặt địa chỉ mặc định.');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    try {
      const res = await fetchApi<{ success: boolean; message: string }>(`/addresses/${addressId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.success) {
        setAddrSuccessMsg(res.message);
        setAddresses(prev => prev.filter(addr => addr.id !== addressId));
        setTimeout(() => setAddrSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể xóa địa chỉ.');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">Đang tải thông tin hồ sơ...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg border border-emerald-400/30">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{user.full_name || 'Khách hàng'}</h1>
              {user.role === 'admin' ? (
                <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              ) : (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Thành viên VIP
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="px-4 py-2 bg-white/10 hover:bg-rose-500/20 text-white hover:text-rose-300 border border-white/20 hover:border-rose-400/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Laptop optimized layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Menu Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">Menu Cá Nhân</h3>
            <div className="space-y-1 text-xs font-medium">
              <a href="#profile" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Thông tin tài khoản</span>
              </a>
              <a href="/orders" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                <ShoppingBag className="w-4 h-4 text-slate-400" />
                <span>Đơn hàng của tôi</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Content Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Part A: Account Details */}
          <div id="profile" className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Chi Tiết Hồ Sơ</h3>
              <p className="text-xs text-slate-500 mt-1">Cập nhật thông tin cá nhân để phục vụ giao hàng</p>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}
            
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl animate-in fade-in">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Họ và tên</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Số điện thoại</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Nhập số điện thoại"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email đăng ký (Cố định)</label>
                <div className="relative">
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-100 border border-slate-200 text-slate-400 rounded-xl cursor-not-allowed"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/10 transition-colors"
              >
                Lưu thay đổi hồ sơ
              </button>
            </form>
          </div>

          {/* Part B: Addresses Management */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Sổ Địa Chỉ Giao Hàng</h3>
                <p className="text-xs text-slate-500 mt-1">Danh sách các địa điểm nhận hàng của bạn</p>
              </div>
              <button
                onClick={() => setShowAddAddressForm(!showAddAddressForm)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm địa chỉ</span>
              </button>
            </div>

            {addrSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{addrSuccessMsg}</span>
              </div>
            )}

            {/* Form adding address */}
            {showAddAddressForm && (
              <form onSubmit={handleAddAddress} className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Địa chỉ giao hàng mới</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Tên người nhận *</label>
                    <input
                      type="text"
                      required
                      value={newRecipientName}
                      onChange={(e) => setNewRecipientName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Số điện thoại *</label>
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Ví dụ: 0912345678"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Tỉnh / Thành phố *</label>
                    <input
                      type="text"
                      required
                      value={newProvince}
                      onChange={(e) => setNewProvince(e.target.value)}
                      placeholder="Ví dụ: Hà Nội"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Quận / Huyện *</label>
                    <input
                      type="text"
                      required
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      placeholder="Ví dụ: Cầu Giấy"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Phường / Xã *</label>
                    <input
                      type="text"
                      required
                      value={newWard}
                      onChange={(e) => setNewWard(e.target.value)}
                      placeholder="Ví dụ: Dịch Vọng"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Địa chỉ chi tiết (Số nhà, Tên đường) *</label>
                  <input
                    type="text"
                    required
                    value={newDetail}
                    onChange={(e) => setNewDetail(e.target.value)}
                    placeholder="Ví dụ: Số 10, Ngõ 20, Xuân Thủy"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newIsDefault}
                    onChange={(e) => setNewIsDefault(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Đặt địa chỉ này làm mặc định</span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                  >
                    Lưu địa chỉ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAddressForm(false)}
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </form>
            )}

            {/* List addresses rendering */}
            {addresses.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-semibold bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                Chưa có địa chỉ nhận hàng nào được lưu.
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-all relative">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{addr.recipient_name}</span>
                        <span className="text-[11px] text-slate-400 font-semibold">({addr.phone})</span>
                        {addr.is_default && (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Home className="w-2.5 h-2.5" /> Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {addr.detail}, {addr.ward}, {addr.district}, {addr.province}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold self-end sm:self-auto">
                      {!addr.is_default && (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-[10px] text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 px-3 py-1.5 rounded-xl transition-all"
                        >
                          Đặt mặc định
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Xóa địa chỉ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
