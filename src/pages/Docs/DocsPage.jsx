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
  BookMarked
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
      try {
        const res = await fetch(`/api/v1/docs/progress/${staffId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json && Array.isArray(json.data)) {
            const completed = json.data
              .filter(item => item.status === 'COMPLETED')
              .map(item => item.topicId);
            setCompletedTopicIds(completed);
            return;
          }
        }
      } catch (err) {
        console.warn('Backend unavailable, using local storage progress', err);
      }

      try {
        const raw = localStorage.getItem(`docs_progress_${staffId}`);
        if (isMounted && raw) {
          setCompletedTopicIds(JSON.parse(raw));
        }
      } catch (err) {
        console.warn('Storage read error:', err);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [staffId]);

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
        await fetch('/api/v1/docs/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: staffId,
            topicId: topicId,
            sectionId: activeTopicId.split('.')[0],
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
        desc: foundSec.description || `Tổng quan về ${foundSec.title}`,
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

    // Check leaf topic
    const foundTopic = allTopics.find(t => t.id === activeTopicId);
    if (foundTopic) return foundTopic;

    return {
      id: '1',
      title: DOCS_SECTIONS[0].title,
      desc: DOCS_SECTIONS[0].description,
      childTopics: DOCS_SECTIONS[0].topics || [],
      isOverview: true,
      content: { overview: DOCS_SECTIONS[0].description, steps: [] }
    };
  }, [allTopics, activeTopicId]);

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleHeaderClick = (id) => {
    toggleSection(id);
    setActiveTopicId(id);
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

  return (
    <div className="docs-layout">
      {/* Top Header */}
      <header className="docs-header">
        <div className="docs-header__brand">
          <div className="docs-header__logo">
            <BookOpen size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="docs-header__title">Michelin Sơn Tây GMS Docs</span>
              <span className="docs-header__badge">v1.8 Interactive</span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.9)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
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
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BookMarked size={15} />
            <span>Học tập & Tra cứu</span>
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
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Users size={15} />
            <span>Quản lý Đánh giá</span>
          </button>
        </div>

        <div className="docs-header__actions">
          {/* Progress Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(30, 41, 59, 0.6)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Award size={18} color="#facc15" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tiến độ của bạn</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ade80' }}>
                {completedTopicIds.length}/{allTopics.length} bài ({currentProgressPercent}%)
              </span>
            </div>
          </div>

          <button type="button" className="docs-search-btn" onClick={() => setShowSearchModal(true)}>
            <Search size={16} />
            <span>Tìm nhanh (Ctrl+K)</span>
          </button>

          <button 
            type="button" 
            className="docs-back-btn"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={16} />
            <span>Quay lại Dashboard</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      {viewMode === 'manager' ? (
        <ManagerDocsDashboard />
      ) : (
        <div className="docs-container">
          {/* Left Tree Sidebar */}
          <aside className="docs-sidebar">
            <div className="docs-sidebar__section-title">Danh mục cây bài học</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {DOCS_SECTIONS.map((sec) => {
                const isSecOpen = expandedSections[sec.id] ?? true;
                const isSecActive = activeTopicId === sec.id;
                return (
                  <div key={sec.id} style={{ marginBottom: '8px' }}>
                    {/* Section Header (Clicking opens Overview Page + toggles tree) */}
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

                    {/* Section Sub-topics or Sub-groups */}
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
                              onClick={() => setActiveTopicId(topic.id)}
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
                                        onClick={() => setActiveTopicId(topic.id)}
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
          </aside>

          {/* Main Content Area */}
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
                {activeNode.content?.overview}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeNode.content?.steps?.map((stepText, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', background: '#0f172a', borderLeft: '3px solid #3b82f6', borderRadius: '4px', color: '#f8fafc', fontSize: '0.875rem' }}>
                    {stepText}
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

            {/* Section 4: Mark Complete Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
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
                  padding: '12px 24px',
                  background: completedTopicIds.includes(activeNode.id) ? '#16a34a' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <CheckCircle2 size={18} />
                <span>
                  {completedTopicIds.includes(activeNode.id) ? 'Đã hoàn thành mục này' : 'Xác nhận Đã đọc & Hoàn thành mục này'}
                </span>
              </button>
            </div>
          </main>

          {/* Right TOC */}
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
              placeholder="Gõ mã bài (1.1, 2.1.1) hoặc từ khóa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              style={{ width: '100%', padding: '10px 14px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', fontSize: '0.95rem', marginBottom: '16px' }}
            />
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map(res => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    setActiveTopicId(res.id);
                    setShowSearchModal(false);
                  }}
                  style={{ padding: '10px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', textAlign: 'left', cursor: 'pointer', color: '#f1f5f9' }}
                >
                  <div style={{ fontWeight: 700, color: '#60a5fa' }}>{res.number} {res.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>{res.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
