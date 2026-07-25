import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  ArrowLeft, 
  ChevronRight, 
  Layers, 
  UserCheck, 
  Wrench, 
  ClipboardList, 
  Box, 
  DollarSign, 
  FileText, 
  Sparkles, 
  HelpCircle,
  Code
} from 'lucide-react';
import './DocsPage.css';

export default function DocsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('overview');

  const categories = [
    { id: 'overview', label: 'Tổng quan & Luồng làm việc', icon: <Layers size={18} /> },
    { id: 'receptionist', label: 'Lễ tân & Đặt lịch', icon: <UserCheck size={18} /> },
    { id: 'advisor', label: 'Cố vấn Dịch vụ', icon: <ClipboardList size={18} /> },
    { id: 'technician', label: 'Kỹ thuật viên & Xưởng', icon: <Wrench size={18} /> },
    { id: 'warehouse', label: 'Kho & Quản lý Phụ tùng', icon: <Box size={18} /> },
    { id: 'accountant', label: 'Thu ngân & Tài chính', icon: <DollarSign size={18} /> },
    { id: 'system', label: 'Cấu hình & Nhật ký', icon: <Code size={18} /> },
  ];

  return (
    <div className="docs-layout">
      {/* Header */}
      <header className="docs-header">
        <div className="docs-header__brand">
          <div className="docs-header__logo">
            <BookOpen size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="docs-header__title">Michelin Sơn Tây GMS Docs</span>
              <span className="docs-header__badge">v1.0</span>
            </div>
          </div>
        </div>

        <div className="docs-header__actions">
          <button type="button" className="docs-search-btn" onClick={() => alert('Ô tìm kiếm nhanh (Ctrl+K) đang được kết nối!')}>
            <Search size={16} />
            <span>Tìm kiếm tài liệu...</span>
            <span className="docs-search-shortcut">Ctrl K</span>
          </button>

          <button 
            type="button" 
            className="docs-back-btn"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={16} />
            <span>Quay lại Hệ thống</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="docs-container">
        {/* Left Sidebar */}
        <aside className="docs-sidebar">
          <div>
            <div className="docs-sidebar__section-title">Danh mục nghiệp vụ</div>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`docs-nav-item ${activeCategory === cat.id ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="docs-sidebar__section-title">Trợ giúp & Hỗ trợ</div>
            <button type="button" className="docs-nav-item" onClick={() => navigate('/system-tutorials')}>
              <HelpCircle size={18} />
              <span>Hướng dẫn nhanh GMS</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="docs-content">
          <div className="docs-breadcrumb">
            <span>Tài liệu Hướng dẫn</span>
            <ChevronRight size={14} />
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>
              {categories.find(c => c.id === activeCategory)?.label || 'Tổng quan'}
            </span>
          </div>

          <h1 className="docs-article__title">Trung tâm Tài liệu Hướng dẫn Michelin Sơn Tây GMS</h1>
          <p className="docs-article__desc">
            Trang tài liệu hoàn toàn tách biệt được thiết kế để tra cứu quy trình, hướng dẫn thao tác chi tiết theo từng vai trò nghiệp vụ (Lễ tân, Cố vấn, Kỹ thuật viên, Thủ kho, Kế toán).
          </p>

          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(96, 165, 250, 0.3)', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#60a5fa', fontWeight: 700, marginBottom: '8px' }}>
              <Sparkles size={18} />
              <span>Giao diện Docs Độc lập & Hệ thống Tour Tương tác</span>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.925rem', lineHeight: 1.6, margin: 0 }}>
              Trang Docs này chạy độc lập với giao diện nhân viên. Bạn có thể tra cứu từng bước làm việc hoặc kích hoạt tính năng <strong>Tour Hướng dẫn Tương tác (In-App Walkthrough)</strong> trực tiếp trên màn hình hệ thống.
            </p>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>Các chủ đề nổi bật</h2>
          <div className="docs-cards-grid">
            <div className="docs-card" onClick={() => setActiveCategory('receptionist')}>
              <div className="docs-card__icon"><UserCheck size={22} /></div>
              <div className="docs-card__title">Nghiệp vụ Lễ tân</div>
              <div className="docs-card__text">Hướng dẫn đón khách, đặt lịch hẹn, tạo hàng chờ và mở phiếu kiểm tra ban đầu.</div>
            </div>

            <div className="docs-card" onClick={() => setActiveCategory('advisor')}>
              <div className="docs-card__icon"><ClipboardList size={22} /></div>
              <div className="docs-card__title">Cố vấn Dịch vụ</div>
              <div className="docs-card__text">Điều phối phiếu dịch vụ, lập báo giá phụ tùng, xin duyệt và bàn giao kỹ thuật.</div>
            </div>

            <div className="docs-card" onClick={() => setActiveCategory('technician')}>
              <div className="docs-card__icon"><Wrench size={22} /></div>
              <div className="docs-card__title">Kỹ thuật viên</div>
              <div className="docs-card__text">Xem danh sách công việc hôm nay, cập nhật tiến độ và hoàn thành dịch vụ.</div>
            </div>

            <div className="docs-card" onClick={() => setActiveCategory('warehouse')}>
              <div className="docs-card__icon"><Box size={22} /></div>
              <div className="docs-card__title">Quản lý Kho & Vật tư</div>
              <div className="docs-card__text">Nhập kho, xuất kho phụ tùng theo phiếu, quản lý kho hàng lỗi và quét mã QR.</div>
            </div>
          </div>
        </main>

        {/* Right TOC */}
        <aside className="docs-toc">
          <div className="docs-toc__title">Mục lục trang này</div>
          <a href="#overview" className="docs-toc__item">Tổng quan Trung tâm Docs</a>
          <a href="#features" className="docs-toc__item">Giao diện Độc lập & Tour</a>
          <a href="#categories" className="docs-toc__item">Các chủ đề nổi bật</a>
        </aside>
      </div>
    </div>
  );
}
