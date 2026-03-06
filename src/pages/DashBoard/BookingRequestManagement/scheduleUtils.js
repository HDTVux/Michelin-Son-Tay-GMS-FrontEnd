const defaultSlotData = {
    '08:30': { customers: ['Nguyễn Văn A'], current: 1, capacity: 3 },
    '09:00': { customers: ['Trần Thị B'], current: 1, capacity: 3 },
    '09:30': { customers: ['Trần Thị B'], current: 1, capacity: 3 },
    '10:00': { customers: ['Trần Thị B'], current: 1, capacity: 3 },
    '10:30': { customers: [], current: 0, capacity: 3 },
    '11:00': { customers: ['Lê Văn C'], current: 1, capacity: 3 },
};

export const approvedBookingsBySlot = {
    '09:30': [
        {
            id: 'DB-202310-26-001',
            name: 'Nguyễn Văn A',
            phone: '0912345678',
            service: 'Làm lốp',
            note: 'Ưu tiên trước 10h',
            status: 'Đã duyệt',
        },
    ],
    '10:00': [
        {
            id: 'DB-202310-26-002',
            name: 'Trần Thị B',
            phone: '0912345679',
            service: 'Vá xăm',
            note: 'Gọi trước khi tới',
            status: 'Đã duyệt',
        },
    ],
};


export function buildSlots({ slotData = defaultSlotData, startHour = 6, endHour = 10, defaultCapacity = 3 } = {}) {
    return buildSlotList({ slotData, startHour, endHour, defaultCapacity, include24hClosingHalf: false });
}

/**
 * Hàm buildAllSlots: Tạo danh sách toàn bộ khung giờ trong ngày làm việc của Garage.
 * Mặc định từ 6h sáng đến 24h đêm.
 */
export function buildAllSlots({ slotData = defaultSlotData, startHour = 6, endHour = 24, defaultCapacity = 3 } = {}) {
    return buildSlotList({ slotData, startHour, endHour, defaultCapacity, include24hClosingHalf: false });
}

/**
 * @param {Object} slotData: Dữ liệu thực tế từ server (số xe đã đặt tại mỗi giờ).
 * @param {number} startHour: Giờ bắt đầu mở cửa.
 * @param {number} endHour: Giờ đóng cửa.
 * @param {number} defaultCapacity: Sức chứa mặc định của Garage (ví dụ: tối đa 3 xe làm cùng lúc).
 */
function buildSlotList({ slotData, startHour, endHour, defaultCapacity, include24hClosingHalf }) {
    const slots = [];

    // Vòng lặp chạy qua từng giờ từ lúc mở cửa đến lúc đóng cửa
    for (let hour = startHour; hour <= endHour; hour++) {
        
        // Garage chia lịch mỗi 30 phút một slot (:00 và :30)
        ['00', '30'].forEach((minute) => {
            
            // Xử lý trường hợp đặc biệt: Không hiển thị 24:30 nếu không cần thiết
            const isLastHalfOf24h = hour === 24 && minute === '30' && !include24hClosingHalf;
            if (isLastHalfOf24h) return;

            // Định dạng lại chuỗi thời gian (ví dụ: 6 -> "06:00")
            const time = `${String(hour).padStart(2, '0')}:${minute}`;

            /**
             * Lấy dữ liệu của slot này từ slotData.
             * Nếu slot đó chưa có ai đặt, sẽ lấy giá trị mặc định (trống khách).
             */
            const data = slotData[time] || { customers: [], current: 0, capacity: defaultCapacity };
            const { current, capacity } = data;

            /**
             * PHÂN LOẠI TRẠNG THÁI (State Management):
             * Lý do: Để giao diện có thể đổi màu sắc tương ứng (Xanh: OK, Đỏ: Full).
             */
            let state = 'ok'; 
            if (current === capacity) state = 'full'; // Đã đủ số xe tối đa
            if (current > capacity) state = 'over';  // Quá tải (do nhân viên ưu tiên thêm xe)

            // Đẩy dữ liệu đã xử lý vào mảng kết quả
            slots.push({
                time,                       // Chuỗi hiển thị (08:30)
                customers: data.customers,   // Danh sách khách đã đặt trong tầm này
                quota: `${current}/${capacity}`, // Hiển thị dạng phân số (1/3)
                state,                      // Trạng thái để map với CSS class
            });
        });
    }
    return slots;
}
