'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Heart, User, Search, Sparkles, LogOut, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { getCartCount } = useCart();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-50 glass-nav border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-2xl tracking-tight text-slate-900">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                SHOFY
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                FASHION
              </span>
            </Link>

            {/* Main Menu Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link href="/" className="hover:text-emerald-600 transition-colors">Trang chủ</Link>
              <Link href="/products" className="hover:text-emerald-600 transition-colors">Sản phẩm</Link>
              <Link href="/sale" className="hover:text-rose-600 transition-colors flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>Sale</Link>
              <Link href="/ai-stylist" className="flex items-center gap-1.5 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                AI Stylist
              </Link>
            </nav>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-64">
              <input
                type="text"
                placeholder="Tìm kiếm thời trang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-100/80 border border-transparent rounded-full focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
              />
              <button type="submit" className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <Search className="w-4 h-4" />
              </button>
            </form>

            <Link href="/wishlist" className="p-2 text-slate-600 hover:text-rose-500 transition-colors relative">
              <Heart className="w-5 h-5" />
            </Link>

            <Link href="/cart" className="p-2 text-slate-600 hover:text-emerald-600 transition-colors relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-1 right-1 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {getCartCount()}
              </span>
            </Link>

            {/* User Account / Auth Buttons */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 text-xs font-semibold text-slate-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-full transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[100px] truncate">{user.full_name || user.email}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                    onMouseLeave={() => setIsDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.full_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      {user.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full mt-1">
                          <Shield className="w-3 h-3" /> Admin System
                        </span>
                      )}
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    <Link
                      href="/orders"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4 text-slate-400" />
                      <span>Đơn hàng của tôi</span>
                    </Link>

                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-purple-700 font-medium hover:bg-purple-50 transition-colors"
                      >
                        <Shield className="w-4 h-4 text-purple-500" />
                        <span>Trang Quản Trị (Admin)</span>
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={() => {
                        logout();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  href="/login" 
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link 
                  href="/register" 
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-full shadow-sm transition-colors"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
