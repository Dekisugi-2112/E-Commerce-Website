import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg tracking-tight mb-3">SHOFY FASHION</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Website thời trang nam nữ cao cấp với phong cách hiện đại, hỗ trợ tư vấn phối đồ cá nhân hóa bằng AI.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Khám Phá</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/products" className="hover:text-white transition-colors">Tất cả sản phẩm</Link></li>
              <li><Link href="/sale" className="hover:text-white transition-colors">Ưu đãi & Sale</Link></li>
              <li><Link href="/ai-stylist" className="hover:text-white transition-colors">Tư vấn AI Stylist</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Hỗ Trợ Khách Hàng</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/faq" className="hover:text-white transition-colors">Hướng dẫn chọn Size</Link></li>
              <li><Link href="/shipping" className="hover:text-white transition-colors">Chính sách giao hàng (COD / VNPay)</Link></li>
              <li><Link href="/returns" className="hover:text-white transition-colors">Chính sách đổi trả</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Đồ Án Tốt Nghiệp</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sinh viên Năm 3 - Đề tài Website Thời Trang E-Commerce kết hợp AI. Stack: Next.js + FastAPI + Supabase.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Shofy Clothing. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
