import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  ArrowLeft, 
  ChevronRight, 
  ChevronDown,
  Layers, 
  Award, 
  Sparkles, 
  HelpCircle,
  Play,
  CheckCircle2,
  Users,
  CheckSquare,
  BookMarked,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ExternalLink,
  Globe,
  LogIn,
  ArrowRight
} from 'lucide-react';
import { DOCS_SECTIONS } from './data/docsTreeData.js';
import { launchDriverTour } from './utils/driverTourUtils.js';
import InteractiveSandbox from './components/InteractiveSandbox.jsx';
import TopicQuiz from './components/TopicQuiz.jsx';
import ManagerDocsDashboard from './components/ManagerDocsDashboard.jsx';
import './DocsPage.css';

export default function DocsPage() {
  const navigate = useNavigate();

  // Mode: 'learn' | 'manager'
  const [viewMode, setViewMode] = useState('learn');
  const [activeTopicId, setActiveTopicId] = useState('1.1');
  const [expandedSections, setExpandedSections] = useState({ '1': true, '2': true, '2.1': true, '3': true, '4': true });
  const [completedTopicIds, setCompletedTopicIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileTreeOpen, setIsMobileTreeOpen] = useState(false);

  // Read current logged in staff profile ID
  const staffProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem('staffProfile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const staffId = staffProfile?.staffId || 1;

  // Flatten all topics to calculate progress
  const allTopics = useMemo(() => {
    const list = [];
    DOCS_SECTIONS.forEach(sec => {
      if (sec.topics) {
        sec.topics.forEach(t => list.push({ ...t, sectionId: sec.id }));
      }
      if (sec.subGroups) {
        sec.subGroups.forEach(sub => {
          if (sub.topics) {
            sub.topics.forEach(t => list.push({ ...t, sectionId: sec.id }));
          }
        });
      }
    });
    return list;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      let completed = [];
      try {
        const res = await fetch(`/api/v1/docs/progress/${staffId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json && Array.isArray(json.data)) {
            completed = json.data
              .filter((item) => item.status === 'COMPLETED')
              .map((item) => item.topicId);
          }
        }
      } catch (err) {
        console.warn('Backend unavailable, using local storage progress', err);
      }

      if (completed.length === 0) {
        try {
          const raw = localStorage.getItem(`docs_progress_${staffId}`);
          if (raw) {
            completed = JSON.parse(raw);
          }
        } catch (err) {
          console.warn('Storage read error:', err);
        }
      }

      if (isMounted) {
        setCompletedTopicIds(completed);
        if (completed.length > 0) {
          // Auto jump to the next uncompleted topic in line
          const firstUncompleted = allTopics.find(t => !completed.includes(t.id));
          if (firstUncompleted) {
            setActiveTopicId(firstUncompleted.id);
          }
        }
      }
    };
    load();
    return () => { isMounted = false; };
  }, [staffId, allTopics]);

  // Auto scroll to top on active topic change or initial load
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const contentEl = document.querySelector('.docs-content');
      if (contentEl) {
        contentEl.scrollTop = 0;
      }
    };

    scrollToTop();
    const timer = setTimeout(scrollToTop, 100);
    return () => clearTimeout(timer);
  }, [activeTopicId]);

  // Record completed topic
  const handleMarkTopicCompleted = async (topicId, score = 100) => {
    if (!completedTopicIds.includes(topicId)) {
      const updated = [...completedTopicIds, topicId];
      setCompletedTopicIds(updated);
      try {
        localStorage.setItem(`docs_progress_${staffId}`, JSON.stringify(updated));
      } catch (err) {
        console.warn('Storage write error:', err);
      }

      // Sync backend DB
      try {
        const targetNode = allTopics.find(t => t.id === topicId);
        await fetch('/api/v1/docs/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: staffId,
            topicId: topicId,
            sectionId: targetNode?.sectionId || '1',
            status: 'COMPLETED',
            score: score
          })
        });
      } catch (err) {
        console.warn('Backend sync warning:', err);
      }
    }
  };

  // Find active node (Section Overview, SubGroup Overview, or Leaf Topic)
  const activeNode = useMemo(() => {
    // Check root section overview
    const foundSec = DOCS_SECTIONS.find(s => s.id === activeTopicId);
    if (foundSec) {
      let childTopics = [];
      if (foundSec.topics) {
        childTopics = foundSec.topics;
      } else if (foundSec.subGroups) {
        childTopics = foundSec.subGroups.flatMap(sg => sg.topics || []);
      }

      return {
        isOverview: true,
        id: foundSec.id,
        number: foundSec.number,
        title: foundSec.title,
        desc: foundSec.description,
        childTopics: childTopics,
        sandboxType: childTopics[0]?.sandboxType || 'overview',
        quiz: childTopics[0]?.quiz,
        tourSteps: childTopics[0]?.tourSteps,
        content: {
          overview: foundSec.description || `Trung tâm hướng dẫn thuộc mục ${foundSec.title}. Chọn một bài học bên dưới để bắt đầu chi tiết.`,
          steps: childTopics.map(t => `${t.number || ''} ${t.title}: ${t.desc}`)
        }
      };
    }

    // Check subgroup overview
    for (const sec of DOCS_SECTIONS) {
      if (sec.subGroups) {
        const foundSub = sec.subGroups.find(sg => sg.id === activeTopicId);
        if (foundSub) {
          return {
            isOverview: true,
            id: foundSub.id,
            number: foundSub.number,
            title: foundSub.title,
            desc: `Tổng hợp hướng dẫn nghiệp vụ thuộc ${foundSub.title}`,
            childTopics: foundSub.topics || [],
            sandboxType: foundSub.topics?.[0]?.sandboxType || 'overview',
            quiz: foundSub.topics?.[0]?.quiz,
            tourSteps: foundSub.topics?.[0]?.tourSteps,
            content: {
              overview: `Hướng dẫn thực hành các quy trình thuộc ${foundSub.title}.`,
              steps: (foundSub.topics || []).map(t => `${t.number || ''} ${t.title}: ${t.desc}`)
            }
          };
        }
      }
    }

    // Leaf topic resolution
    const leaf = allTopics.find(t => t.id === activeTopicId);
    if (leaf) return leaf;

    return allTopics[0] || { id: '1.1', title: 'Tổng quan Michelin Sơn Tây GMS', desc: 'Hướng dẫn tổng quan' };
  }, [allTopics, activeTopicId]);

  const nextTopic = useMemo(() => {
    const currentTopicIndex = allTopics.findIndex(t => t.id === activeTopicId);
    return currentTopicIndex !== -1 && currentTopicIndex < allTopics.length - 1 ? allTopics[currentTopicIndex + 1] : null;
  }, [allTopics, activeTopicId]);

  const toggleSection = (secId) => {
    setExpandedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  const handleHeaderClick = (id) => {
    toggleSection(id);
    setActiveTopicId(id);
  };

  const handleSelectTopic = (id) => {
    setActiveTopicId(id);
    setIsMobileTreeOpen(false);
  };

  const currentProgressPercent = Math.round((completedTopicIds.length / allTopics.length) * 100);

  // Search filtered topics
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase();
    return allTopics.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.desc.toLowerCase().includes(query) ||
      (t.number && t.number.includes(query))
    );
  }, [allTopics, searchTerm]);

  // Render tree navigation
  const renderTreeNav = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {DOCS_SECTIONS.map((sec) => {
        const isSecOpen = expandedSections[sec.id] ?? true;
        const isSecActive = activeTopicId === sec.id;
        return (
          <div key={sec.id} style={{ marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => handleHeaderClick(sec.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px',
                background: isSecActive ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: isSecActive ? '#60a5fa' : '#cbd5e1',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span>{sec.title}</span>
              {isSecOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {isSecOpen && (
              <div style={{ paddingLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: '8px', marginTop: '4px' }}>
                {sec.topics && sec.topics.map((topic) => {
                  const isDone = completedTopicIds.includes(topic.id);
                  const isActive = activeTopicId === topic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      className={`docs-nav-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleSelectTopic(topic.id)}
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                    >
                      {isDone ? <CheckCircle2 size={14} color="#4ade80" /> : <span style={{ width: '14px' }} />}
                      <span>{topic.title}</span>
                    </button>
                  );
                })}

                {sec.subGroups && sec.subGroups.map((sub) => {
                  const isSubOpen = expandedSections[sub.id] ?? true;
                  const isSubActive = activeTopicId === sub.id;
                  return (
                    <div key={sub.id} style={{ marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleHeaderClick(sub.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '4px 6px',
                          background: isSubActive ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          color: isSubActive ? '#60a5fa' : '#94a3b8',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <span>{sub.title}</span>
                        {isSubOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>

                      {isSubOpen && (
                        <div style={{ paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.08)', marginLeft: '4px' }}>
                          {sub.topics.map((topic) => {
                            const isDone = completedTopicIds.includes(topic.id);
                            const isActive = activeTopicId === topic.id;
                            return (
                              <button
                                key={topic.id}
                                type="button"
                                className={`docs-nav-item ${isActive ? 'is-active' : ''}`}
                                onClick={() => handleSelectTopic(topic.id)}
                                style={{ padding: '5px 8px', fontSize: '0.825rem' }}
                              >
                                {isDone ? <CheckCircle2 size={14} color="#4ade80" /> : <span style={{ width: '14px' }} />}
                                <span>{topic.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderFormattedText = (text) => {
    if (!text || typeof text !== 'string') return text;

    // Tokenize bold (**...**), italic (*...*), and URLs/paths
    const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|staff\.sontaygarage\.vn\/login|staff\.sontaygarage\.vn|sontaygarage\.vn\/login|\/login|\/staff-profile)/g);

    return tokens.map((part, i) => {
      if (!part) return null;

      // Bold **text**
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#f8fafc', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }

      // Italic *text*
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} style={{ color: '#93c5fd', fontStyle: 'italic' }}>{part.slice(1, -1)}</em>;
      }

      // Clickable URLs
      if (part === 'staff.sontaygarage.vn') {
        return (
          <a
            key={i}
            href="https://staff.sontaygarage.vn/login"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'underline', padding: '0 2px' }}
          >
            {part}
          </a>
        );
      }

      if (part === 'sontaygarage.vn/login' || part === 'staff.sontaygarage.vn/login' || part === '/login') {
        return (
          <a
            key={i}
            href="/login"
            onClick={(e) => { e.preventDefault(); navigate('/login'); }}
            style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'underline', padding: '0 2px', cursor: 'pointer' }}
          >
            {part}
          </a>
        );
      }

      if (part === '/staff-profile') {
        return (
          <a
            key={i}
            href="/staff-profile"
            onClick={(e) => { e.preventDefault(); navigate('/staff-profile'); }}
            style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'underline', padding: '0 2px', cursor: 'pointer' }}
          >
            {part}
          </a>
        );
      }

      return part;
    });
  };

  return (
    <div className="docs-layout">
      {/* Top Header */}
      <header className="docs-header">
        <div className="docs-header__brand">
          <div className="docs-header__logo">
            <BookOpen size={20} color="#ffffff" />
          </div>
          <div>
            <span className="docs-header__title">Tài liệu Michelin GMS</span>
            <span className="docs-header__badge" style={{ marginLeft: '8px' }}>
              Tiến độ: {currentProgressPercent}%
            </span>
          </div>
        </div>

        <div className="docs-header__actions">
          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => setViewMode('learn')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'learn' ? '#2563eb' : 'transparent',
                color: viewMode === 'learn' ? '#fff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <BookMarked size={14} />
              <span>Học tập</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('manager')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'manager' ? '#2563eb' : 'transparent',
                color: viewMode === 'manager' ? '#fff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Award size={14} />
              <span>Đánh giá Quản lý</span>
            </button>
          </div>

          <button 
            type="button" 
            className="docs-search-btn"
            onClick={() => setShowSearchModal(true)}
          >
            <Search size={16} />
            <span>Tìm bài học...</span>
            <span className="docs-search-shortcut">Ctrl K</span>
          </button>

          <button 
            type="button" 
            className="docs-back-btn"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={16} />
            <span>Về Dashboard</span>
          </button>
        </div>
      </header>

      {/* Mobile Top Navigation Bar */}
      <div className="docs-mobile-nav-bar">
        <button
          type="button"
          onClick={() => setIsMobileTreeOpen(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <BookOpen size={16} />
          <span>Danh mục cây bài học</span>
          <ChevronDown size={14} />
        </button>

        <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeNode.title}
        </span>
      </div>

      {/* Mobile Tree Navigation Drawer */}
      {isMobileTreeOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 998, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#0b1329', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="#60a5fa" />
              <span>Danh mục Cây Bài Học</span>
            </span>
            <button type="button" onClick={() => setIsMobileTreeOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {renderTreeNav()}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'manager' ? (
        <ManagerDocsDashboard />
      ) : (
        <div className="docs-container">
          {/* Left Tree Sidebar (Desktop) */}
          <aside className={`docs-sidebar ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
              {!isSidebarCollapsed && (
                <div className="docs-sidebar__section-title" style={{ marginBottom: 0 }}>
                  Danh mục cây bài học
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(prev => !prev)}
                title={isSidebarCollapsed ? "Mở rộng danh mục cây" : "Thu gọn danh mục cây"}
                style={{
                  padding: '5px 8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginLeft: isSidebarCollapsed ? 'auto' : '0',
                  marginRight: isSidebarCollapsed ? 'auto' : '0',
                  transition: 'all 0.2s ease'
                }}
              >
                {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>

            {!isSidebarCollapsed ? (
              renderTreeNav()
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                {DOCS_SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setIsSidebarCollapsed(false);
                      handleHeaderClick(sec.id);
                    }}
                    title={sec.title}
                    style={{
                      padding: '8px',
                      background: activeTopicId.startsWith(sec.id) ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                      border: activeTopicId.startsWith(sec.id) ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: activeTopicId.startsWith(sec.id) ? '#60a5fa' : '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}
                  >
                    {sec.number.replace('.', '')}
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* Main Article Content */}
          <main className="docs-content">
            <div className="docs-breadcrumb">
              <span>Tài liệu</span>
              <ChevronRight size={14} />
              <span style={{ color: '#60a5fa', fontWeight: 600 }}>{activeNode.title}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h1 className="docs-article__title">{activeNode.title}</h1>
                <p className="docs-article__desc" style={{ marginBottom: '16px', paddingBottom: '16px' }}>{activeNode.desc}</p>
              </div>

              {/* Driver.js Live Tour Trigger */}
              {activeNode.tourSteps && (
                <button
                  type="button"
                  onClick={() => launchDriverTour(activeNode.tourSteps, () => handleMarkTopicCompleted(activeNode.id), navigate, '/dashboard')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    background: 'linear-gradient(135deg, #d97706, #b45309)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)'
                  }}
                >
                  <Play size={16} />
                  <span>Khởi chạy hướng dẫn</span>
                </button>
              )}
            </div>

            {/* If Overview Node: Render Card Grid of Child Topics */}
            {activeNode.isOverview && activeNode.childTopics && activeNode.childTopics.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>
                  Danh sách bài học thuộc {activeNode.title}
                </h2>
                <div className="docs-cards-grid">
                  {activeNode.childTopics.map(child => {
                    const isDone = completedTopicIds.includes(child.id);
                    return (
                      <div 
                        key={child.id} 
                        className="docs-card" 
                        onClick={() => setActiveTopicId(child.id)}
                        style={{ borderLeft: isDone ? '4px solid #22c55e' : '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>{child.number || ''}</span>
                          {isDone && <CheckCircle2 size={16} color="#4ade80" />}
                        </div>
                        <div className="docs-card__title" style={{ fontSize: '1rem' }}>{child.title}</div>
                        <div className="docs-card__text">{child.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 1: Theory & Steps */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>
                1. Lý thuyết & Các bước nghiệp vụ
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '16px' }}>
                {renderFormattedText(activeNode.content?.overview)}
              </p>

              {/* Redesigned 2-Card Grid for Topic 1.2 Access Methods */}
              {activeNode.id === '1.2' && (
                <div style={{ marginTop: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {/* Method 1 Card */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      borderRadius: '12px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 800, fontSize: '0.9rem' }}>
                            <Globe size={20} color="#38bdf8" />
                            <span>Cách 1: Tên miền Tiền tố (staff.)</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 700 }}>
                            Chính thức
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                          Gõ trực tiếp tên miền <strong style={{ color: '#38bdf8' }}>staff.sontaygarage.vn</strong> trên thanh trình duyệt. Phù hợp cho máy tính cố định tại Showroom.
                        </p>
                      </div>

                      <a
                        href="https://staff.sontaygarage.vn/login"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          color: '#38bdf8',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          textDecoration: 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Globe size={16} />
                        <span>Mở staff.sontaygarage.vn ➔</span>
                      </a>
                    </div>

                    {/* Method 2 Card */}
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(34, 197, 94, 0.35)',
                      borderRadius: '12px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                      gap: '12px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontWeight: 800, fontSize: '0.9rem' }}>
                            <LogIn size={20} color="#4ade80" />
                            <span>Cách 2: Đường dẫn Hậu tố (/login)</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontWeight: 700 }}>
                            Nhanh chóng
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                          Gõ địa chỉ <strong style={{ color: '#4ade80' }}>sontaygarage.vn/login</strong> trên bất kỳ thiết bị di động hay máy tính cá nhân để vào ngay trang đăng nhập.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <LogIn size={16} />
                        <span>Vào ngay màn hình /login ➔</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeNode.content?.steps?.map((stepText, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', background: '#0f172a', borderLeft: '3px solid #3b82f6', borderRadius: '4px', color: '#f8fafc', fontSize: '0.875rem' }}>
                    {renderFormattedText(stepText)}
                  </div>
                ))}
              </div>

              {/* Sector: Các vai trò chức vụ trong hệ thống */}
              {activeNode.content?.roles && activeNode.content.roles.length > 0 && (
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} />
                    <span>Các Vai trò & Chức vụ trong Hệ thống</span>
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {activeNode.content.roles.map((r) => (
                      <div key={r.code} style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{r.name}</strong>
                          <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(37,99,235,0.2)', color: '#60a5fa', borderRadius: '4px', fontWeight: 600 }}>
                            Vai trò chính
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sector: Cơ chế gộp chức vụ */}
              {activeNode.content?.roleMerging && (
                <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} />
                    <span>{activeNode.content.roleMerging.title}</span>
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '12px', lineHeight: 1.5 }}>
                    {activeNode.content.roleMerging.desc}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeNode.content.roleMerging.points.map((pt, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: '#e2e8f0' }}>
                        <CheckCircle2 size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Interactive Sandbox Preview */}
            <InteractiveSandbox type={activeNode.sandboxType} topicTitle={activeNode.title} />

            {/* Section 3: Topic Quiz & Progress Record */}
            {activeNode.quiz && (
              <TopicQuiz quiz={activeNode.quiz} onPass={(score) => handleMarkTopicCompleted(activeNode.id, score)} />
            )}

            {/* Section 4: Bottom Action Buttons (Mark Complete & Open Next Topic) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginTop: '36px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={() => {
                  if (activeNode.isOverview && activeNode.childTopics) {
                    activeNode.childTopics.forEach(child => handleMarkTopicCompleted(child.id));
                  } else {
                    handleMarkTopicCompleted(activeNode.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  background: completedTopicIds.includes(activeNode.id) ? 'rgba(22, 163, 74, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                  color: completedTopicIds.includes(activeNode.id) ? '#4ade80' : '#60a5fa',
                  border: completedTopicIds.includes(activeNode.id) ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(96, 165, 250, 0.4)',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <CheckCircle2 size={18} />
                <span>
                  {completedTopicIds.includes(activeNode.id) ? 'Đã hoàn thành mục này' : 'Xác nhận Đã đọc & Hoàn thành mục này'}
                </span>
              </button>

              {nextTopic && (
                <button
                  type="button"
                  onClick={() => {
                    if (!completedTopicIds.includes(activeNode.id)) {
                      if (activeNode.isOverview && activeNode.childTopics) {
                        activeNode.childTopics.forEach(child => handleMarkTopicCompleted(child.id));
                      } else {
                        handleMarkTopicCompleted(activeNode.id);
                      }
                    }
                    setActiveTopicId(nextTopic.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <span>Mở bài tiếp theo ({nextTopic.number ? `${nextTopic.number} ` : ''}{nextTopic.title})</span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </main>

          {/* Right TOC (Desktop) */}
          <aside className="docs-toc">
            <div className="docs-toc__title">Cấu trúc bài học này</div>
            <a href="#theory" className="docs-toc__item">1. Lý thuyết & Các bước</a>
            <a href="#sandbox" className="docs-toc__item">2. Mô phỏng Dummy UI</a>
            <a href="#quiz" className="docs-toc__item">3. Bài kiểm tra thực hành</a>
            <a href="#tour" className="docs-toc__item">4. Tour Hướng dẫn tương tác</a>
          </aside>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '100px' }}>
          <div style={{ width: '100%', maxWidth: '560px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, color: '#f1f5f9' }}>Tìm kiếm nhanh bài học tài liệu</span>
              <button type="button" onClick={() => setShowSearchModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            <input 
              type="text" 
              placeholder="Gõ từ khóa (ví dụ: Tiếp nhận, Báo giá, Quét barcode, VietQR...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              style={{ width: '100%', padding: '10px 14px', background: '#1e293b', border: '1px solid rgba(96,165,250,0.4)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', marginBottom: '16px' }}
            />
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.length > 0 ? (
                searchResults.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      setActiveTopicId(item.id);
                      setShowSearchModal(false);
                    }}
                    style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 700, marginRight: '6px' }}>{item.number || ''}</span>
                      <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{item.title}</span>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>{item.desc}</p>
                    </div>
                    <ChevronRight size={16} color="#94a3b8" />
                  </div>
                ))
              ) : searchTerm ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', padding: '20px' }}>Không tìm thấy bài học phù hợp</p>
              ) : (
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Nhập từ khóa bất kỳ để tra cứu bài học</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
