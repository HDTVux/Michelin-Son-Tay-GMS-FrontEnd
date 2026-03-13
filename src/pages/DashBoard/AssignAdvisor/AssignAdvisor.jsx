import { useState } from 'react';
import styles from './AssignAdvisor.module.css';

const AssignAdvisor = () => {
  const [filterService, setFilterService] = useState('all');
  const [searchTicket, setSearchTicket] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [selectedMainAdvisor, setSelectedMainAdvisor] = useState(null);
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [selectedAssistants, setSelectedAssistants] = useState([]);

  // Mock data - Tickets
  const tickets = [
    {
      id: 'TI12345',
      licensePlate: '30A-12345',
      service: 'Bảo dưỡng',
      serviceDetail: 'Thay dầu',
      timeSlot: '09:00 - 22/02/2026',
      status: 'pending'
    },
    {
      id: 'TI12346',
      licensePlate: '50B-67890',
      service: 'Sửa chữa phanh',
      serviceDetail: 'Sửa chữa phanh',
      timeSlot: '10:00 - 22/02/2026',
      status: 'assigned'
    },
    {
      id: 'TI12347',
      licensePlate: '29C-11223',
      service: 'Thay dầu',
      serviceDetail: 'Thay dầu',
      timeSlot: '11:00 - 25/02/2026',
      status: 'pending'
    }
  ];

  // Mock data - Advisors
  const advisors = [
    {
      id: 'ADV001',
      name: 'Nguyễn Văn A',
      role: 'Technical Advisor',
      availability: 'Có lịch: 07:30 - 12:00',
      currentTickets: 3,
      avatar: null
    },
    {
      id: 'ADV002',
      name: 'Trần Thị B',
      role: 'Service Advisor',
      availability: 'Có lịch: 10:00 - 17:30',
      currentTickets: 1,
      avatar: null
    },
    {
      id: 'ADV003',
      name: 'Lê Văn C',
      role: 'Technical Advisor',
      availability: 'Có lịch: 07:30 - 12:00',
      currentTickets: 5,
      avatar: null
    }
  ];

  const filteredTickets = tickets.filter(ticket => {
    const matchService = filterService === 'all' || ticket.service.toLowerCase().includes(filterService.toLowerCase());
    const matchSearch = ticket.licensePlate.toLowerCase().includes(searchTicket.toLowerCase()) ||
                       ticket.id.toLowerCase().includes(searchTicket.toLowerCase());
    return matchService && matchSearch;
  });

  const filteredAdvisors = advisors.filter(advisor => {
    if (filterAvailability === 'all') return true;
    if (filterAvailability === 'available') return advisor.currentTickets < 5;
    if (filterAvailability === 'busy') return advisor.currentTickets >= 5;
    return true;
  });

  const handleTicketSelect = (ticketId) => {
    setSelectedTickets([ticketId]); // Chỉ chọn 1 ticket
  };

  const handleAdvisorSelect = (advisorId) => {
    setSelectedMainAdvisor(advisorId);
  };

  const handleAssign = () => {
    if (selectedTickets.length === 0) {
      alert('Vui lòng chọn ticket!');
      return;
    }
    if (!selectedMainAdvisor) {
      alert('Vui lòng chọn KTV chính!');
      return;
    }
    
    // Show modal to add assistant advisors
    setShowAssistantModal(true);
  };

  const handleConfirmAssignment = () => {
    console.log('Assigning:', {
      tickets: selectedTickets,
      mainAdvisor: selectedMainAdvisor,
      assistants: selectedAssistants
    });
    
    // TODO: Call API to assign
    alert('Phân công thành công!');
    
    // Reset
    setSelectedTickets([]);
    setSelectedMainAdvisor(null);
    setSelectedAssistants([]);
    setShowAssistantModal(false);
  };

  const handleSkipAssistant = () => {
    console.log('Skip assistant, assigning only main advisor');
    handleConfirmAssignment();
  };

  const toggleAssistant = (advisorId) => {
    if (advisorId === selectedMainAdvisor) {
      alert('Không thể chọn KTV chính làm KTV phụ!');
      return;
    }
    
    setSelectedAssistants(prev => {
      if (prev.includes(advisorId)) {
        return prev.filter(id => id !== advisorId);
      } else {
        return [...prev, advisorId];
      }
    });
  };

  const getStatusText = (status) => {
    return status === 'pending' ? 'Chưa phân công' : 'Đã phân công';
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Phân công Advisor</h1>
          <p className={styles.subtitle}>Chọn ticket và advisor để phân công</p>
        </div>
        <div className={styles.roleIndicator}>
          Assign Advisor (Receptionist/Manager)
        </div>
      </div>

      <div className={styles.content}>
        {/* Left Panel - Tickets */}
        <div className={styles.leftPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Danh sách Ticket</h3>
          </div>

          <div className={styles.filters}>
            <select 
              className={styles.filterSelect}
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
            >
              <option value="all">Lọc theo dịch vụ</option>
              <option value="bảo dưỡng">Bảo dưỡng</option>
              <option value="sửa chữa">Sửa chữa</option>
              <option value="thay dầu">Thay dầu</option>
            </select>

            <input
              type="text"
              placeholder="Tìm theo biển số, mã ticket..."
              value={searchTicket}
              onChange={(e) => setSearchTicket(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.ticketList}>
            {filteredTickets.map((ticket) => (
              <div 
                key={ticket.id}
                className={`${styles.ticketCard} ${selectedTickets.includes(ticket.id) ? styles.selected : ''}`}
                onClick={() => handleTicketSelect(ticket.id)}
              >
                <div className={styles.ticketHeader}>
                  <div className={styles.checkbox}>
                    <input 
                      type="radio"
                      checked={selectedTickets.includes(ticket.id)}
                      onChange={() => handleTicketSelect(ticket.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className={styles.ticketInfo}>
                    <div className={styles.ticketId}>Ticket #{ticket.id}</div>
                    <div className={styles.licensePlate}>Biển số: {ticket.licensePlate}</div>
                  </div>
                  <div className={styles.ticketStatus}>
                    {getStatusText(ticket.status)}
                  </div>
                </div>
                <div className={styles.ticketBody}>
                  <div className={styles.ticketDetail}>Dịch vụ: {ticket.serviceDetail}</div>
                  <div className={styles.ticketTime}>Thời gian: {ticket.timeSlot}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Advisors */}
        <div className={styles.rightPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Danh sách KTV</h3>
          </div>

          <div className={styles.filters}>
            <select 
              className={styles.filterSelect}
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
            >
              <option value="all">Lọc theo có làm việc</option>
              <option value="available">Rảnh</option>
              <option value="busy">Bận</option>
            </select>
            <div className={styles.toggleSwitch}>
              <input type="checkbox" id="toggle" />
              <label htmlFor="toggle"></label>
            </div>
          </div>

          <div className={styles.advisorList}>
            {filteredAdvisors.map((advisor) => (
              <div 
                key={advisor.id}
                className={`${styles.advisorCard} ${selectedMainAdvisor === advisor.id ? styles.selected : ''}`}
                onClick={() => handleAdvisorSelect(advisor.id)}
              >
                <div className={styles.advisorLeft}>
                  <div className={styles.radioButton}>
                    <input 
                      type="radio"
                      checked={selectedMainAdvisor === advisor.id}
                      onChange={() => handleAdvisorSelect(advisor.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className={styles.advisorAvatar}>
                    {advisor.avatar ? (
                      <img src={advisor.avatar} alt={advisor.name} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {advisor.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className={styles.advisorInfo}>
                    <div className={styles.advisorName}>{advisor.name}</div>
                    <div className={styles.advisorRole}>{advisor.role}</div>
                    <div className={styles.advisorAvailability}>{advisor.availability}</div>
                    <div className={styles.advisorTickets}>{advisor.currentTickets} tickets</div>
                  </div>
                </div>
                <div className={styles.advisorRight}>
                  <span className={styles.statusBadge}>
                    {advisor.currentTickets < 5 ? 'Rảnh' : 'Bận'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.summary}>
          Đã chọn: {selectedTickets.length} tickets, {selectedMainAdvisor ? '1' : '0'} advisor
        </div>
        <div className={styles.actions}>
          <button className={styles.btnCancel}>Hủy</button>
          <button 
            className={styles.btnAssign}
            onClick={handleAssign}
            disabled={selectedTickets.length === 0 || !selectedMainAdvisor}
          >
            Phân công
          </button>
        </div>
      </div>

      {/* Assistant Modal */}
      {showAssistantModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAssistantModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Thêm KTV phụ</h3>
              <button 
                className={styles.modalClose}
                onClick={() => setShowAssistantModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>
                Bạn có muốn thêm KTV phụ để hỗ trợ không? (Có thể bỏ qua)
              </p>

              <div className={styles.assistantList}>
                {advisors
                  .filter(adv => adv.id !== selectedMainAdvisor)
                  .map((advisor) => (
                    <div 
                      key={advisor.id}
                      className={`${styles.assistantCard} ${selectedAssistants.includes(advisor.id) ? styles.selected : ''}`}
                      onClick={() => toggleAssistant(advisor.id)}
                    >
                      <div className={styles.checkbox}>
                        <input 
                          type="checkbox"
                          checked={selectedAssistants.includes(advisor.id)}
                          onChange={() => toggleAssistant(advisor.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className={styles.advisorAvatar}>
                        <div className={styles.avatarPlaceholder}>
                          {advisor.name.charAt(0)}
                        </div>
                      </div>
                      <div className={styles.assistantInfo}>
                        <div className={styles.assistantName}>{advisor.name}</div>
                        <div className={styles.assistantRole}>{advisor.role}</div>
                        <div className={styles.assistantTickets}>{advisor.currentTickets} tickets</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.btnSkip}
                onClick={handleSkipAssistant}
              >
                Bỏ qua
              </button>
              <button 
                className={styles.btnConfirm}
                onClick={handleConfirmAssignment}
              >
                Xác nhận ({selectedAssistants.length} KTV phụ)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignAdvisor;
