// Fixture data để dựng và kiểm thử UI chat trước khi backend có endpoint thật.
// Bật/tắt qua flag `mock` truyền vào useChat({ mock: true }).

export const MOCK_CURRENT_STAFF_ID = 'me';

export const MOCK_CONTACTS = [
  { staffId: 'staff-1', fullName: 'Nguyễn Văn An', avatarUrl: '', role: ['ADVISOR'], online: true, lastSeenAt: null },
  { staffId: 'staff-2', fullName: 'Trần Thị Bích', avatarUrl: '', role: ['RECEPTIONIST'], online: false, lastSeenAt: '2026-07-18T02:00:00Z' },
  { staffId: 'staff-3', fullName: 'Lê Hoàng Cường', avatarUrl: '', role: ['TECHNICIAN'], online: true, lastSeenAt: null },
  { staffId: 'staff-4', fullName: 'Phạm Minh Đức', avatarUrl: '', role: ['MANAGER'], online: false, lastSeenAt: '2026-07-17T09:30:00Z' },
];

const now = () => new Date().toISOString();
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

export const MOCK_CONVERSATIONS = [
  {
    conversationId: 'conv-1',
    type: 'direct',
    title: 'Nguyễn Văn An',
    avatarUrl: '',
    participants: [MOCK_CONTACTS[0]],
    lastMessage: { text: 'Ok anh nhé, em xử lý ngay', type: 'text', createdAt: minutesAgo(5) },
    unreadCount: 2,
    updatedAt: minutesAgo(5),
  },
  {
    conversationId: 'conv-2',
    type: 'direct',
    title: 'Trần Thị Bích',
    avatarUrl: '',
    participants: [MOCK_CONTACTS[1]],
    lastMessage: { text: 'Đã gửi ảnh phiếu dịch vụ', type: 'image', createdAt: minutesAgo(60) },
    unreadCount: 0,
    updatedAt: minutesAgo(60),
  },
  {
    conversationId: 'conv-3',
    type: 'group',
    title: 'Nhóm Cố vấn dịch vụ',
    avatarUrl: '',
    participants: [MOCK_CONTACTS[0], MOCK_CONTACTS[2], MOCK_CONTACTS[3]],
    lastMessage: { text: 'Mai họp 8h nhé cả nhà', type: 'text', createdAt: minutesAgo(180) },
    unreadCount: 0,
    updatedAt: minutesAgo(180),
  },
];

export const MOCK_MESSAGES = {
  'conv-1': [
    { messageId: 'm1', conversationId: 'conv-1', clientMsgId: 'm1', senderId: 'staff-1', senderName: 'Nguyễn Văn An', senderAvatar: '', type: 'text', text: 'Chào em, phiếu SC-0012 khách hẹn mấy giờ?', createdAt: minutesAgo(30), status: 'read' },
    { messageId: 'm2', conversationId: 'conv-1', clientMsgId: 'm2', senderId: MOCK_CURRENT_STAFF_ID, senderName: 'Bạn', senderAvatar: '', type: 'text', text: '9h30 sáng mai anh nhé', createdAt: minutesAgo(28), status: 'read' },
    { messageId: 'm3', conversationId: 'conv-1', clientMsgId: 'm3', senderId: 'staff-1', senderName: 'Nguyễn Văn An', senderAvatar: '', type: 'text', text: 'Ok anh nhé, em xử lý ngay', createdAt: minutesAgo(5), status: 'delivered' },
  ],
  'conv-2': [
    { messageId: 'm4', conversationId: 'conv-2', clientMsgId: 'm4', senderId: 'staff-2', senderName: 'Trần Thị Bích', senderAvatar: '', type: 'text', text: 'Đã gửi ảnh phiếu dịch vụ', createdAt: minutesAgo(60), status: 'read' },
  ],
  'conv-3': [
    { messageId: 'm5', conversationId: 'conv-3', clientMsgId: 'm5', senderId: 'staff-4', senderName: 'Phạm Minh Đức', senderAvatar: '', type: 'text', text: 'Mai họp 8h nhé cả nhà', createdAt: minutesAgo(180), status: 'read' },
  ],
};
