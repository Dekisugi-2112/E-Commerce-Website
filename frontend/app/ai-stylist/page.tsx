'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Sparkles, ShoppingBag, Send, User, Plus, X, Search, Package } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ProductImage {
  image_url: string;
  is_primary: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  avg_rating: number;
  total_sold: number;
  categories?: { name: string };
  product_images?: ProductImage[];
}

interface Message {
  role: 'user' | 'model';
  content: string;
  attachedProduct?: Product; // sản phẩm đính kèm (hiển thị card trong bubble)
}

const SUGGESTED_PROMPTS = [
  { text: "Tư vấn phối đồ đi đám cưới cho nam lịch lãm", label: "Tiệc cưới Nam" },
  { text: "Set đồ đi chơi hè năng động, thoải mái cho nữ", label: "Đi chơi Hè Nữ" },
  { text: "Phối đồ phong cách tối giản đi làm công sở", label: "Công sở Tối giản" },
  { text: "Áo sơ mi phối với quần gì thì hợp mốt nhất?", label: "Phối sơ mi" }
];

export default function AIStylistPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Xin chào! Tôi là Trợ lý Thời trang AI Stylist của Shofy. Tôi có thể tư vấn phong cách, gợi ý phối đồ từ các sản phẩm của cửa hàng và trả lời mọi thắc mắc thời trang của bạn.\n\nBạn có thể nhắn trực tiếp hoặc bấm nút ➕ để chọn sản phẩm muốn được tư vấn nhé!'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);

  // Product Picker states
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on client-side mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('shofy_ai_stylist_messages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to parse saved chat history:', e);
      }
    }
    const savedProducts = localStorage.getItem('shofy_ai_stylist_products');
    if (savedProducts) {
      try {
        setRecommendedProducts(JSON.parse(savedProducts));
      } catch (e) {
        console.error('Failed to parse saved products:', e);
      }
    }
  }, []);

  // Save chat history to localStorage when messages update
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('shofy_ai_stylist_messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Save recommended products to localStorage when they update
  useEffect(() => {
    if (recommendedProducts.length > 0) {
      localStorage.setItem('shofy_ai_stylist_products', JSON.stringify(recommendedProducts));
    }
  }, [recommendedProducts]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load all products khi mở Product Picker
  const loadProducts = async () => {
    if (allProducts.length > 0) return; // đã load rồi thì skip
    setProductsLoading(true);
    try {
      const res = await fetchApi<{ success: boolean; data: Product[] }>('/products?limit=100');
      if (res.success) {
        setAllProducts(res.data);
      }
    } catch (err) {
      console.error('Error loading products for picker:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleOpenProductPicker = () => {
    setShowProductPicker(true);
    loadProducts();
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductPicker(false);
    setProductSearch('');
  };

  const handleRemoveSelectedProduct = () => {
    setSelectedProduct(null);
  };

  const handleSendMessage = async (text: string) => {
    if ((!text.trim() && !selectedProduct) || isLoading) return;

    // Xây dựng nội dung tin nhắn bao gồm cả sản phẩm nếu có
    let messageContent = text.trim();
    if (selectedProduct) {
      const productInfo = `[Sản phẩm: ${selectedProduct.name} - ${formatVND(selectedProduct.base_price)} - Danh mục: ${selectedProduct.categories?.name || 'Thời trang'}]`;
      messageContent = messageContent
        ? `${messageContent}\n\n${productInfo}`
        : `Tư vấn cho tôi về sản phẩm này: ${productInfo}`;
    }

    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      attachedProduct: selectedProduct || undefined
    };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInputVal('');
    setSelectedProduct(null);
    setIsLoading(true);

    try {
      // Gửi API chỉ gồm role + content (không gửi attachedProduct)
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetchApi<{ success: boolean; reply: string; products: Product[]; mode: string }>('/ai/stylist', {
        method: 'POST',
        body: JSON.stringify({ messages: apiMessages })
      });

      if (res.success) {
        setMessages(prev => [...prev, { role: 'model', content: res.reply }]);
        if (res.products && res.products.length > 0) {
          setRecommendedProducts(res.products);
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', content: 'Xin lỗi, hệ thống AI đang bận. Vui lòng thử lại sau.' }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', content: 'Không thể kết nối đến máy chủ AI Stylist. Hãy đảm bảo backend đang hoạt động.' }]);
      console.error('AI Stylist error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputVal);
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const getProductImg = (product: Product) => {
    return product.product_images?.find(img => img.is_primary)?.image_url
      || product.product_images?.[0]?.image_url
      || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800';
  };

  // Lọc sản phẩm trong picker theo từ khóa
  const filteredPickerProducts = productSearch.trim()
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.categories?.name || '').toLowerCase().includes(productSearch.toLowerCase())
      )
    : allProducts;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-md flex flex-col md:flex-row items-center justify-between gap-6 border border-white/5">
        <div className="space-y-3 text-center md:text-left z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>AI Stylist 2.0 Conversational Chatbot</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Hỏi Đáp & Tư Vấn Thời Trang Với AI
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            Trò chuyện tự do hoặc chọn sản phẩm cụ thể để được AI phân tích, gợi ý phối đồ và tư vấn phong cách phù hợp nhất cho bạn.
          </p>
        </div>
        <div className="relative w-36 h-36 md:w-44 md:h-44 flex items-center justify-center flex-shrink-0 z-10">
          <div className="w-24 h-24 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 animate-pulse relative">
            <Sparkles className="w-12 h-12" />
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Main Chat & Sidebar Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Chat Room (8 columns) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[600px] relative">
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Trợ lý Phối đồ AI</h3>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Đang hoạt động trực tuyến
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setMessages([
                  {
                    role: 'model',
                    content: 'Xin chào! Tôi đã sẵn sàng hỗ trợ bạn. Hãy cho tôi biết mong muốn của bạn về set đồ hôm nay nhé!'
                  }
                ]);
                setRecommendedProducts([]);
                setSelectedProduct(null);
                localStorage.removeItem('shofy_ai_stylist_messages');
                localStorage.removeItem('shofy_ai_stylist_products');
              }}
              className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors py-1.5 px-3 bg-slate-100 rounded-lg hover:bg-rose-50"
            >
              Làm mới hội thoại
            </button>
          </div>

          {/* Chat Bubble Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/20">
            {messages.map((msg, idx) => {
              const isAI = msg.role === 'model';
              return (
                <div key={idx} className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    isAI ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'
                  }`}>
                    {isAI ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  {/* Bubble Content */}
                  <div className="space-y-2">
                    {/* Attached Product Card (nếu user đính kèm sản phẩm) */}
                    {msg.attachedProduct && (
                      <div className={`rounded-2xl overflow-hidden border shadow-sm ${
                        isAI ? 'border-slate-100' : 'border-emerald-500/30'
                      }`}>
                        <div className="flex gap-3 p-2.5 bg-white">
                          <Link href={`/products/${msg.attachedProduct.slug}`} className="block w-14 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                            <img
                              src={getProductImg(msg.attachedProduct)}
                              alt={msg.attachedProduct.name}
                              className="w-full h-full object-cover"
                            />
                          </Link>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{msg.attachedProduct.categories?.name || 'Thời trang'}</p>
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">{msg.attachedProduct.name}</p>
                            <p className="text-xs font-extrabold text-emerald-700 mt-0.5">{formatVND(msg.attachedProduct.base_price)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Text Bubble */}
                    <div className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm font-medium whitespace-pre-line ${
                      isAI
                        ? 'bg-white border border-slate-100 text-slate-800'
                        : 'bg-emerald-600 text-white border border-emerald-600'
                    }`}>
                      {msg.attachedProduct
                        ? (msg.content.split('\n\n[Sản phẩm:')[0] || 'Tư vấn cho tôi về sản phẩm này')
                        : msg.content
                      }
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-100 text-emerald-700">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-1 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Selected Product Preview (above input) */}
          {selectedProduct && (
            <div className="px-4 pt-3 pb-1 border-t border-emerald-100 bg-emerald-50/50">
              <div className="flex items-center gap-3 bg-white rounded-xl border border-emerald-200 p-2.5 shadow-sm">
                <img
                  src={getProductImg(selectedProduct)}
                  alt={selectedProduct.name}
                  className="w-10 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-emerald-600 font-bold uppercase">Sản phẩm đính kèm</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{selectedProduct.name}</p>
                  <p className="text-[10px] font-extrabold text-emerald-700">{formatVND(selectedProduct.base_price)}</p>
                </div>
                <button
                  onClick={handleRemoveSelectedProduct}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Suggested prompts list */}
          <div className="px-5 py-2.5 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.text)}
                className="text-[10px] sm:text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleFormSubmit} className="p-4 border-t border-slate-100 bg-white flex gap-2">
            {/* Nút chọn sản phẩm */}
            <button
              type="button"
              onClick={handleOpenProductPicker}
              disabled={isLoading}
              title="Chọn sản phẩm để tư vấn"
              className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <Plus className="w-4.5 h-4.5" />
            </button>

            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isLoading}
              placeholder={selectedProduct ? `Hỏi về "${selectedProduct.name}"...` : "Nhập câu hỏi hoặc chọn sản phẩm bằng nút ➕..."}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || (!inputVal.trim() && !selectedProduct)}
              className="px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>

          {/* ═══ Product Picker Modal (Overlay) ═══ */}
          {showProductPicker && (
            <div className="absolute inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-sm rounded-3xl">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-3xl">
                <div className="flex items-center gap-2">
                  <Package className="w-4.5 h-4.5 text-emerald-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Chọn sản phẩm để tư vấn</h3>
                </div>
                <button
                  onClick={() => { setShowProductPicker(false); setProductSearch(''); }}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Input */}
              <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tìm sản phẩm theo tên hoặc danh mục..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Product List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {productsLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-400 font-semibold">Đang tải sản phẩm...</p>
                  </div>
                ) : filteredPickerProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-2 text-slate-400">
                    <Package className="w-8 h-8 text-slate-200" />
                    <p className="text-xs font-semibold">Không tìm thấy sản phẩm phù hợp</p>
                  </div>
                ) : (
                  filteredPickerProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-left group"
                    >
                      <img
                        src={getProductImg(product)}
                        alt={product.name}
                        className="w-12 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-100 group-hover:border-emerald-200 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{product.categories?.name || 'Thời trang'}</p>
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{product.name}</p>
                        <p className="text-xs font-extrabold text-emerald-700 mt-0.5">{formatVND(product.base_price)}</p>
                      </div>
                      <div className="p-2 bg-slate-100 text-slate-400 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all flex-shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Suggested Products Panel (4 columns) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[500px] lg:h-[600px] overflow-hidden">
          <div className="space-y-4 h-full flex flex-col overflow-hidden">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShoppingBag className="w-4.5 h-4.5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">Sản phẩm được gợi ý</h3>
            </div>

            {recommendedProducts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
                <Sparkles className="w-10 h-10 text-slate-200 animate-pulse" />
                <h4 className="font-bold text-slate-700 text-xs">Chưa có sản phẩm đề xuất</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Trò chuyện với AI Stylist và yêu cầu gợi ý trang phục thực tế để xem các sản phẩm thời trang hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
                {recommendedProducts.map((product) => {
                  const primaryImg = getProductImg(product);

                  return (
                    <div key={product.id} className="border border-slate-100 rounded-2xl p-3 flex gap-3 bg-slate-50/20 hover:shadow-md transition-shadow relative group">
                      <Link href={`/products/${product.slug}`} className="cursor-pointer block w-16 h-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={primaryImg} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </Link>

                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 text-xs font-semibold">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{product.categories?.name || 'Thời trang'}</p>
                          <Link href={`/products/${product.slug}`} className="text-slate-900 line-clamp-2 hover:text-emerald-600 mt-0.5 leading-snug">
                            {product.name}
                          </Link>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-50 mt-1">
                          <span className="text-emerald-700 font-extrabold">{formatVND(product.base_price)}</span>
                          <Link href={`/products/${product.slug}`} className="p-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors">
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
