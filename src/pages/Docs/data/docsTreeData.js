export const DOCS_SECTIONS = [
  {
    id: "1",
    number: "1.",
    title: "Bắt đầu nhanh",
    description: "Tổng quan về hệ thống Michelin Sơn Tây GMS, cách đăng nhập, quản lý tài khoản và sử dụng thanh công cụ.",
    topics: [
      {
        id: "1.1",
        number: "1.1.",
        title: "Tổng quan Michelin Sơn Tây GMS",
        desc: "Khái quát toàn bộ các phân hệ nghiệp vụ trong garage từ Lễ tân đến Thu ngân.",
        content: {
          overview: "Michelin Sơn Tây GMS là hệ thống quản lý tổng thể chuỗi dịch vụ bảo dưỡng, sửa chữa ô tô và vật tư kho. Hệ thống bao gồm 5 phân hệ cốt lõi liên kết chặt chẽ với nhau.",
          steps: [
            "1. Lễ tân tiếp nhận xe, mở hàng chờ và ghi nhận yêu cầu của khách hàng.",
            "2. Cố vấn dịch vụ khảo sát an toàn 32 hạng mục và lập báo giá chi tiết.",
            "3. Kỹ thuật viên thực hiện các công việc sửa chữa theo phiếu được giao.",
            "4. Thủ kho / Quản lý kho xuất phụ tùng và vật tư thay thế chính hãng Michelin.",
            "5. Thu ngân kiểm tra hóa đơn, áp dụng khuyến mãi và thu tiền."
          ],
          roles: [
            { code: "RECEPTIONIST", name: "Lễ tân", desc: "Tiếp nhận xe, quản lý hàng chờ, mở phiếu dịch vụ ban đầu & thông tin khách hàng." },
            { code: "ADVISOR", name: "Cố vấn dịch vụ", desc: "Khảo sát an toàn 32 hạng mục, tư vấn giải pháp, lập báo giá & xin duyệt từ khách." },
            { code: "TECHNICIAN", name: "Kỹ thuật viên", desc: "Tiếp nhận công việc (My Tasks), thay lốp Michelin, cân bằng chì, căn chỉnh 3D Hunter." },
            { code: "WAREHOUSE_KEEPER", name: "Thủ kho", desc: "Nhập/xuất phụ tùng thực tế, quét mã QR/Barcode tem lốp, quản lý khay kệ A-100." },
            { code: "WAREHOUSE_MANAGER", name: "Quản lý kho", desc: "Cài đặt ngưỡng tồn kho an toàn, duyệt phiếu nhập/xuất & xử lý kiểm kê chênh lệch." },
            { code: "ACCOUNTANT", name: "Thu ngân & Kế toán", desc: "Tạo mã VietQR động thanh toán, xuất hóa đơn GTGT & chốt báo cáo dòng tiền." },
            { code: "MANAGER", name: "Quản lý Showroom", desc: "Giám sát toàn bộ KPI garage, báo cáo doanh thu & đánh giá tiến độ đào tạo nhân viên." },
            { code: "ADMIN", name: "Quản trị viên hệ thống", desc: "Quản lý tài khoản người dùng, phân quyền vai trò, cấu hình danh mục dịch vụ & cài đặt hệ thống." }
          ],
          roleMerging: {
            title: "Cơ chế Gộp chức vụ (Kiêm nhiệm Đa vai trò)",
            desc: "Trong thực tế vận hành garage, một nhân viên có thể kiêm nhiệm cùng lúc nhiều vai trò (Ví dụ: Thủ kho kiêm Quản lý kho, Cố vấn dịch vụ kiêm Lễ tân, Quản lý kiêm Kế toán). Hệ thống Michelin GMS hỗ trợ tự động hợp nhất tất cả các quyền hạn:",
            points: [
              "Hệ thống tự động ghi nhận danh sách các vị trí nhân viên kiêm nhiệm (ví dụ: vừa làm Quản lý kho vừa làm Thủ kho, hoặc vừa làm Lễ tân vừa làm Cố vấn dịch vụ).",
              "Không cần đăng xuất hay đổi tài khoản: Thanh menu bên trái tự động hiển thị đầy đủ tất cả các tính năng thuộc mọi vai trò mà nhân viên được giao.",
              "Tự động liên thông quyền hạn: Khi nhân viên được giao vai trò cao hơn (như Quản lý kho), hệ thống tự động cấp kèm các quyền thao tác cơ sở (như Thủ kho) để nhân viên thực hiện quy trình công việc liên tục không bị gián đoạn."
            ]
          }
        },
        sandboxType: "overview",
        quiz: {
          question: "Thứ tự luồng làm việc tiêu chuẩn trên hệ thống Michelin GMS là gì?",
          options: [
            "Lễ tân tiếp nhận -> Cố vấn báo giá -> Kỹ thuật làm việc -> Thủ kho / Quản lý kho xuất hàng -> Thu ngân thanh toán",
            "Thu ngân thanh toán -> Kỹ thuật làm việc -> Cố vấn báo giá",
            "Thủ kho xuất hàng trước -> Lễ tân tiếp nhận sau",
            "Cố vấn tự sửa chữa không cần Kỹ thuật viên"
          ],
          correctIndex: 0
        },
        tourSteps: [
          { 
            element: "body", 
            popover: { 
              title: "👋 Chào mừng bạn đến với Michelin Sơn Tây GMS!", 
              description: "Hệ thống Quản lý Garage Michelin đã sẵn sàng. Chúng tôi sẽ hướng dẫn nhanh các khu vực chức năng chính trên màn hình.", 
              side: "bottom" 
            } 
          },
          { 
            element: ".staff-header, .staff-header__left", 
            popover: { 
              title: "🖥️ Thanh Header Navbar điều hướng", 
              description: "Thanh điều hướng phía trên chứa thương hiệu Michelin Sơn Tây và các liên kết truy cập nhanh phân hệ chính.", 
              side: "bottom" 
            } 
          },
          { 
            element: ".staff-header__search-container, .sidebar__search-wrapper", 
            popover: { 
              title: "🔍 Ô Tìm kiếm Mọi thứ & Trợ lý AI (Ctrl + K)", 
              description: "Tra cứu thông minh tất cả dữ liệu (Biển số xe, Khách hàng, Mã phiếu, SKU lốp Michelin) kết hợp Trợ lý AI giải đáp nghiệp vụ tức thì.", 
              side: "bottom" 
            } 
          },
          { 
            element: ".staff-header__scan-btn, .staff-header__chat-container", 
            popover: { 
              title: "📷 & 💬 Bộ công cụ Nhanh: Quét mã QR/Barcode & Nhắn tin (Message)", 
              description: "Cụm công cụ mở camera quét mã tem lốp Michelin/phiếu dịch vụ tức thì và nhắn tin trao đổi nội bộ thời gian thực giữa các phân hệ.", 
              side: "bottom" 
            } 
          },
          { 
            element: ".sidebar, .sidebar__nav, [data-tour-id=\"general\"]", 
            popover: { 
              title: "📌 Thanh menu điều hướng chức năng", 
              description: "Nơi chứa toàn bộ phân hệ làm việc (Lễ tân, Cố vấn, Kỹ thuật viên, Kho, Thu ngân) và Trung tâm Tài liệu /docs.", 
              side: "right" 
            } 
          },
          { 
            element: ".mobile-navbar, .mobile-navbar__dock", 
            popover: { 
              title: "📱 Thanh Mobile Bottom Dock (Linh hoạt trên Điện thoại)", 
              description: "Trải nghiệm mượt mà trên di động: Bạn có thể nhấn giữ để thu gọn / mở rộng menu, hoặc kéo thả vị trí dock tới góc làm việc thuận tay nhất!", 
              side: "top" 
            } 
          },
          { 
            element: ".staff-header__profile-container, .sidebar__profile", 
            popover: { 
              title: "👤 Tài khoản & Đổi mật khẩu", 
              description: "Xem thông tin cá nhân, cập nhật hồ sơ, đổi mật khẩu và xem lịch sử chấm công của bạn.", 
              side: "bottom" 
            } 
          }
        ]
      },
      {
        id: "1.2",
        number: "1.2.",
        title: "Đăng nhập & Tài khoản",
        desc: "Quản lý tài khoản nhân viên, đăng nhập an toàn, đổi mật khẩu và cập nhật thông tin cá nhân.",
        targetPath: "/login",
        content: {
          overview: "Mỗi nhân viên Michelin GMS được cấp một tài khoản định danh kèm vai trò nghiệp vụ tương ứng. Quy trình bắt đầu từ màn hình Đăng nhập hệ thống, sau đó quản lý thông tin cá nhân và tài khoản tại trang Hồ sơ nhân viên.",
          steps: [
            "1. **Màn hình Đăng nhập**: Truy cập tên miền staff.sontaygarage.vn hoặc sontaygarage.vn/login và nhập *Số điện thoại/Email* cùng *Mật khẩu* được cấp.",
            "2. **Tại Dashboard**: Nhấp vào *Nút Hồ sơ đại diện* ở góc phải Thanh Header Navbar.",
            "3. **Menu Dropdown Tài khoản**: Truy cập các mục *Hồ sơ nhân viên*, *Đổi mật khẩu*, *Trợ lý AI* & *Lịch sử chấm công*.",
            "4. **Nút Đăng xuất màu đỏ**: Nhấp vào nút *Đăng xuất* ở cuối Menu để *thoát tài khoản an toàn* khi kết thúc ca làm việc.",
            "5. **Trang Hồ sơ cá nhân**: Thực hiện *đổi mật khẩu định kỳ 90 ngày* & xem chi tiết *bảng chấm công ca làm việc*."
          ]
        },
        sandboxType: "profile",
        quiz: {
          question: "Thứ tự luồng thao tác Đăng nhập & Cài đặt Tài khoản cá nhân chuẩn là gì?",
          options: [
            "Đăng nhập tại /login -> Bấm ảnh đại diện trên Header -> Mở trang Hồ sơ nhân viên /staff-profile",
            "Mở trang Hồ sơ nhân viên trước -> Đăng nhập sau",
            "Đổi mật khẩu trực tiếp trên thanh Sidebar không cần đăng nhập",
            "Gọi cho Quản trị viên đổi mật khẩu mỗi lần đăng nhập"
          ],
          correctIndex: 0
        },
        tourSteps: [
          { 
            element: "form, body", 
            popover: { 
              title: "🔑 1. Màn hình Đăng nhập hệ thống (/login)", 
              description: "Nhân viên nhập Số điện thoại/Email và Mật khẩu được cấp để truy cập vào hệ thống làm việc.", 
              side: "bottom" 
            } 
          },
          { 
            element: ".staff-header__profile-container, .sidebar__profile, .mobile-navbar__profile", 
            targetPath: "/dashboard",
            autoOpenDropdown: true,
            popover: { 
              title: "👤 2. Mở Menu Tài khoản cá nhân", 
              description: "Sau khi vào Dashboard, nhấp vào ảnh đại diện góc phải Thanh Header để truy cập các cài đặt cá nhân.", 
              side: "left" 
            } 
          },
          { 
            element: ".staff-header__dropdown, .sidebar__dropdown", 
            autoOpenDropdown: true,
            popover: { 
              title: "⚙️ 3. Danh sách Chức năng trong Menu Dropdown", 
              description: "Menu bao gồm: Hồ sơ nhân viên, Đổi mật khẩu, Trợ lý AI và Lịch sử ca làm việc/chấm công.", 
              side: "left" 
            } 
          },
          { 
            element: ".staff-header__dropdown-item.logout, .logout-btn", 
            autoOpenDropdown: true,
            popover: { 
              title: "🚪 4. Nút Đăng xuất an toàn (Logout)", 
              description: "Nhấp vào nút Đăng xuất màu đỏ ở dưới cùng Menu để thoát tài khoản làm việc khi kết thúc ca.", 
              side: "left" 
            } 
          },
          { 
            element: "[class*='staffProfilePage'], .staff-profile-card, .profile-page", 
            targetPath: "/staff-profile",
            popover: { 
              title: "📋 5. Trang Chi tiết Hồ sơ & Đổi mật khẩu (/staff-profile)", 
              description: "Quản lý thông tin cá nhân, thực hiện đổi mật khẩu định kỳ và theo dõi chi tiết lịch sử chấm công, ca làm việc.", 
              side: "bottom" 
            } 
          }
        ]
      },
      {
        id: "1.3",
        number: "1.3.",
        title: "Thanh công cụ & Tìm mọi thứ",
        desc: "Hướng dẫn tra cứu tức thì tích hợp Trợ lý AI, quét QR/Barcode mọi thứ, chat nội bộ real-time và hệ thống thông báo.",
        targetPath: "/dashboard",
        content: {
          overview: "Thanh công cụ Header tập trung toàn bộ tiện ích làm việc quan trọng nhất: Tra cứu thông minh tích hợp Trợ lý AI, Quét QR/Barcode mọi thứ, Chat nhắn tin trao đổi nội bộ real-time và Trung tâm Thông báo hệ thống.",
          steps: [
            "1. **Ô Tìm kiếm mọi thứ & Trợ lý AI**: Nhấn phím tắt *Ctrl + K* để tra cứu biển số xe, mã phiếu, SKU lốp Michelin hoặc hỏi đáp nghiệp vụ 24/7.",
            "2. **Bộ quét mã QR / Barcode**: Nhấp biểu tượng *Camera* để quét nhanh tem lốp Michelin SKU, mã QR phiếu dịch vụ hoặc mã xe nhận diện.",
            "3. **Tin nhắn nội bộ Real-time**: Nhấp biểu tượng *Đoạn chat* để mở danh sách hội thoại tin nhắn trao đổi làm việc giữa các phân hệ.",
            "4. **Tạo cuộc trò chuyện mới**: Nhấp vào nút *Thêm (+)* ở góc phải Menu Chat để tìm kiếm nhân viên theo tên/vai trò và tạo phòng chat mới.",
            "5. **Trung tâm Thông báo hệ thống**: Theo dõi quả chuông thông báo ca làm việc, cập nhật trạng thái phiếu dịch vụ & lịch hẹn khách hàng."
          ]
        },
        sandboxType: "search",
        quiz: {
          question: "Tổ hợp phím tắt nào giúp mở ô Tìm kiếm mọi thứ & Trợ lý AI tức thì?",
          options: ["Ctrl + C", "Ctrl + K (hoặc Cmd + K)", "Alt + F4", "Shift + Enter"],
          correctIndex: 1
        },
        tourSteps: [
          { 
            element: ".staff-header__search-container, .universal-search, .sidebar__search-wrapper", 
            popover: { 
              title: "🔍 1. Ô Tìm kiếm Mọi thứ & Trợ lý AI (Ctrl + K)", 
              description: "Tra cứu tức thì tất cả dữ liệu (Biển số xe, Khách hàng, Mã phiếu, SKU lốp Michelin) kết hợp Trợ lý AI giải đáp thắc mắc nghiệp vụ 24/7.", 
              side: "bottom" 
            } 
          },
          { 
            element: ".staff-header__scan-btn, .mobile-scan-btn", 
            popover: { 
              title: "📷 2. Bộ Quét mã QR / Barcode Đa năng", 
              description: "Nhấp để mở Camera quét tem lốp Michelin SKU, mã QR phiếu dịch vụ hoặc mã xe nhận diện tức thì mà không cần nhập tay.", 
              side: "bottom" 
            } 
          },
          { 
            element: ".chat-widget__launcherBtn, .staff-header__chat-container, .mobile-navbar__chat-btn", 
            autoOpenChat: true,
            popover: { 
              title: "💬 3. Tin nhắn Nội bộ & Tự động mở Box Đoạn chat", 
              description: "Nhấp mở Menu Đoạn chat thời gian thực. Hệ thống tự động bật danh sách hội thoại tin nhắn làm việc giữa các phân hệ.", 
              side: "left" 
            } 
          },
          { 
            element: ".chat-widget__popoverNewBtn, .chat-widget__popover", 
            autoOpenChatNew: true,
            popover: { 
              title: "✏️ 4. Nút Thêm Cuộc trò chuyện mới (Tạo Chat mới)", 
              description: "Nhấp vào biểu tượng Cây bút (+) để tìm kiếm nhân viên theo tên/chức vụ và khởi tạo phòng chat làm việc trực tiếp.", 
              side: "left" 
            } 
          },
          { 
            element: ".staffNotification__button, .staffNotification, .mobile-navbar__bell-btn", 
            autoOpenNotification: true,
            popover: { 
              title: "🔔 5. Trung tâm Thông báo & Dropdown Thông báo Live", 
              description: "Tự động nhấp mở Bảng Thông báo real-time. Theo dõi thông báo ca làm việc, duyệt phiếu xuất kho, lịch hẹn mới và các thông báo khẩn cấp.", 
              side: "left" 
            } 
          }
        ]
      }
    ]
  },
  {
    id: "2",
    number: "2.",
    title: "Hướng dẫn theo phân hệ",
    description: "Chi tiết các quy trình thao tác chuyên sâu phân theo từng vai trò nghiệp vụ thực tế.",
    subGroups: [
      {
        id: "2.1",
        number: "2.1.",
        title: "Phân hệ Lễ tân & Đặt lịch",
        topics: [
          {
            id: "2.1.1",
            number: "2.1.1.",
            title: "Tạo lịch cho khách vãng lai",
            desc: "Tạo lịch giữ chỗ / đặt hẹn trực tiếp cho khách vãng lai đến garage hoặc gọi điện.",
            targetPath: "/create-booking",
            content: {
              overview: "Thao tác tạo lịch giữ chỗ hoặc đặt hẹn nhanh chóng cho khách hàng vãng lai tới trực tiếp garage hoặc gọi điện tư vấn. Đảm bảo thông tin xe và thời gian được giữ trước khi xe đến.",
              steps: [
                "1. Truy cập menu 'Khách hàng & Lịch hẹn' -> 'Tạo lịch giữ chỗ' (/create-booking).",
                "2. Tra cứu thông tin khách hàng qua Số điện thoại (tạo mới nếu chưa có trong hệ thống).",
                "3. Nhập Biển số xe, tên chủ xe, dòng xe và số KM ước tính.",
                "4. Lựa chọn dịch vụ dự kiến (thay lốp Michelin, thay dầu, bảo dưỡng...) và khung giờ hẹn.",
                "5. Nhấn 'Tạo lịch hẹn giữ chỗ' để lưu thông tin lên hệ thống."
              ]
            },
            sandboxType: "booking",
            quiz: {
              question: "Chức năng 'Tạo lịch giữ chỗ' (/create-booking) dùng chính cho đối tượng khách hàng nào?",
              options: [
                "Khách vãng lai đến garage hoặc gọi điện đặt hẹn giữ chỗ",
                "Khách hàng đã thanh toán xong phiếu dịch vụ",
                "Đại lý nhập sỉ lốp trong kho",
                "Kỹ thuật viên đang sửa xe"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-booking"]', popover: { title: "1. Menu Khách hàng & Lịch hẹn", description: "Nhấp mở danh mục Quản lý khách hàng, lịch hẹn giữ chỗ và hàng chờ trên thanh điều hướng.", side: "right" } },
              { element: '[data-tour-id="create-booking"]', popover: { title: "2. Chọn Tạo lịch giữ chỗ", description: "Nhấp chọn 'Tạo lịch giữ chỗ' để truy cập vào màn hình lập lịch trực tiếp cho khách vãng lai.", side: "right" } },
              { targetPath: "/create-booking", element: "#create-booking-phone", popover: { title: "3. Nhập Số điện thoại Khách vãng lai", description: "Nhập SĐT của khách. Hệ thống sẽ tự động tra cứu xem khách hàng đã từng tới garage hay chưa.", side: "bottom" } },
              { element: '[class*="selectDirectoryBtn"]', popover: { title: "4. Tra cứu nhanh từ Danh bạ", description: "Nhấp vào nút 'Chọn từ danh bạ' để tìm nhanh khách hàng đã có trong danh bạ garage mà không cần gõ tay.", side: "bottom" } },
              { element: "#create-booking-fullname", popover: { title: "5. Nhập Họ và tên Khách hàng", description: "Nhập họ tên chủ xe hoặc thông tin người trực tiếp đưa xe tới làm dịch vụ.", side: "bottom" } },
              { element: "#create-booking-note", popover: { title: "6. Ghi nhận Yêu cầu dịch vụ", description: "Nhập mô tả triệu chứng xe (tiếng kêu, đảo lốp, mòn vẹt) hoặc dịch vụ khách muốn làm.", side: "bottom" } },
              { element: '[class*="customerInfoCard"]', popover: { title: "7. Hồ sơ & Hạng khách hàng", description: "Xem thông tin hạng thành viên (Bronze/Silver/Gold/Platinum) và lịch sử các phiếu dịch vụ xe đã sử dụng trước đây.", side: "bottom" } },
              { element: '[class*="scheduleCard"]', popover: { title: "8. Chọn Khung giờ giữ chỗ", description: "Chọn ngày mong muốn và nhấp khung giờ khả dụng (10 ngày tới) hoặc bấm 'Dùng ngày giờ hiện tại'.", side: "bottom" } },
              { element: '[class*="estimatePanel"]', popover: { title: "9. Bảng Báo giá dự kiến", description: "Thêm lốp Michelin, dầu nhớt hoặc tiền công dịch vụ dự kiến để thông tin chi phí trước cho khách.", side: "top" } },
              { element: '[data-tour-id="create-booking-submit-actions"]', popover: { title: "10. Hoàn tất & In phiếu giữ chỗ", description: "Nhấn nút 'Tạo lịch' để lưu giữ chỗ hoặc nhấp 'In phiếu dịch vụ' để in chứng từ bản cứng cho khách.", side: "top" } }
            ]
          },
          {
            id: "2.1.2",
            number: "2.1.2.",
            title: "Quản lý lịch khách đặt online",
            desc: "Tiếp nhận, kiểm tra và phê duyệt các yêu cầu đặt lịch hẹn trực tuyến từ Website / App / Zalo của khách hàng.",
            targetPath: "/booking-request-management",
            content: {
              overview: "Quản lý tập trung toàn bộ danh sách các yêu cầu giữ chỗ / đặt lịch trực tuyến của khách hàng gửi từ Website, App di động hoặc Zalo OA. Lễ tân tiến hành kiểm tra thông tin, đối soát khung giờ trống và phê duyệt lịch hẹn.",
              steps: [
                "1. Truy cập menu 'Khách hàng & Lịch hẹn' -> 'Yêu cầu đặt lịch (Online)' (/booking-request-management).",
                "2. Lọc danh sách theo trạng thái 'Chờ duyệt' (PENDING) hoặc tìm kiếm theo Tên / Số điện thoại khách hàng.",
                "3. Nhấp vào mã đặt lịch để xem chi tiết thông tin xe, dịch vụ yêu cầu và thời gian đặt hẹn trực tuyến.",
                "4. Nhấn 'Duyệt lịch hẹn' (CONFIRMED) để xác nhận giữ chỗ hoặc chọn 'Liên hệ điều chỉnh' nếu cần thỏa thuận lại khung giờ.",
                "5. Hệ thống tự động gửi thông báo xác nhận lịch thành công sang Zalo OA / App cho khách hàng."
              ]
            },
            sandboxType: "online_booking",
            quiz: {
              question: "Khi khách hàng gửi yêu cầu đặt hẹn từ Website / App di động, Lễ tân tiếp nhận và phê duyệt tại trang nào?",
              options: [
                "Trang 'Quản lý lịch khách đặt online' - /booking-request-management",
                "Màn hình Quản lý Slider",
                "Báo cáo Doanh thu Kế toán",
                "Danh mục Phụ tùng Kho"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-booking"]', popover: { title: "1. Menu Khách hàng & Lịch hẹn", description: "Nhấp mở danh mục Quản lý khách hàng, đặt lịch hẹn và hàng chờ.", side: "right" } },
              { element: '[data-tour-id="booking-request-management"]', popover: { title: "2. Chọn Yêu cầu đặt lịch (Online)", description: "Nhấp chọn 'Yêu cầu đặt lịch (Online)' để chuyển tới màn hình quản lý lịch hẹn trực tuyến từ Web/App.", side: "right" } },
              { targetPath: "/booking-request-management", element: '[data-tour-id="booking-request-status-filter"]', popover: { title: "3. Lọc Trạng thái 'Chờ duyệt' (PENDING)", description: "Chọn trạng thái 'Chờ duyệt' trên ô dropdown này để lọc ra các đơn đặt lịch hẹn online mới nhất đang chờ Lễ tân phê duyệt.", side: "bottom" } },
              { element: '[data-tour-id="booking-request-search-input"]', popover: { title: "4. Tra cứu theo Tên / Số điện thoại", description: "Gõ số điện thoại hoặc tên khách hàng để tìm nhanh thông tin đơn đặt lịch cụ thể.", side: "bottom" } },
              { element: '[data-tour-id="booking-request-table"]', popover: { title: "5. Bảng Danh sách Yêu cầu mới nhất", description: "Xem thông tin chủ xe, thời gian hẹn mong muốn, số điện thoại và dịch vụ đăng ký trực tuyến.", side: "bottom" } },
              { element: '[data-tour-id="booking-request-table"] tbody tr:first-child', popover: { title: "6. Duyệt & Phê duyệt Lịch hẹn", description: "Nhấp vào đơn để xem chi tiết, bấm 'Duyệt' để xác nhận giữ chỗ hoặc chọn 'Liên hệ điều chỉnh' nếu cần đổi khung giờ.", side: "bottom" } }
            ]
          },
          {
            id: "2.1.3",
            number: "2.1.3.",
            title: "Quản lý lịch đã đặt hẹn",
            desc: "Theo dõi, thay đổi lịch hẹn, hủy lịch, đánh dấu spam và liên hệ xác nhận với khách hàng.",
            targetPath: "/booking-management",
            content: {
              overview: "Màn hình trung tâm giúp Lễ tân quản lý toàn bộ các lịch hẹn đã đặt (vãng lai & online): hỗ trợ thay đổi lịch, hủy lịch, loại bỏ rác/spam và duy trì liên lạc với khách.",
              steps: [
                "1. Truy cập 'Khách hàng & Lịch hẹn' -> 'Quản lý lịch hẹn' (/booking-management).",
                "2. **Thay đổi lịch (Reschedule)**: Chọn lịch hẹn -> Bấm 'Đổi ngày/giờ' khi khách cần báo hoãn hoặc chọn khung giờ khác.",
                "3. **Hủy lịch hẹn**: Chọn lịch hẹn -> Bấm 'Hủy lịch' và chọn lý do (Khách bận, hoãn kế hoạch...).",
                "4. **Đánh dấu Spam**: Với các lịch hẹn ảo/spam, bấm 'Đánh dấu Spam' để chặn dữ liệu rác.",
                "5. **Liên hệ khách hàng**: Bấm nút 'Gọi điện' hoặc 'Gửi Zalo/SMS' để chủ động nhắc lịch hẹn trước 30-60 phút."
              ]
            },
            sandboxType: "confirmed_booking",
            quiz: {
              question: "Tại màn hình Quản lý lịch hẹn (/booking-management), Lễ tân có thể thực hiện những tác vụ nào?",
              options: [
                "Thay đổi lịch, Hủy lịch, Đánh dấu spam và Liên hệ xác nhận với khách",
                "Chỉ xem lịch chứ không được phép chỉnh sửa",
                "In hóa đơn thanh toán tiền",
                "Quét mã QR nhập kho lốp"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-booking"]', popover: { title: "1. Menu Khách hàng & Lịch hẹn", description: "Nhấp mở danh mục Quản lý khách hàng, đặt lịch hẹn và hàng chờ.", side: "right" } },
              { element: '[data-tour-id="booking-management"]', popover: { title: "2. Chọn Quản lý lịch hẹn", description: "Nhấp chọn 'Quản lý lịch hẹn' để chuyển tới màn hình quản lý toàn bộ các lịch hẹn đã xác nhận.", side: "right" } },
              { targetPath: "/booking-management", element: '[data-tour-id="confirmed-booking-status-filter"]', popover: { title: "3. Lọc Trạng thái Lịch hẹn", description: "Lọc lịch hẹn theo trạng thái 'Đã xác nhận' (CONFIRMED), 'Hoàn tất', 'Đã hủy' hoặc 'Chưa đến'.", side: "bottom" } },
              { element: '[data-tour-id="confirmed-booking-search-input"]', popover: { title: "4. Tra cứu Khách hàng / Biển số xe", description: "Nhập Tên khách hàng, SĐT hoặc Mã đặt lịch để tra cứu nhanh thông tin giữ chỗ.", side: "bottom" } },
              { element: '[data-tour-id="confirmed-booking-table"]', popover: { title: "5. Danh sách Lịch hẹn đã đặt", description: "Theo dõi họ tên khách, số điện thoại, biển số xe, thời gian gửi yêu cầu và thời gian hẹn thực tế.", side: "bottom" } },
              { element: '[data-tour-id="confirmed-booking-table"] tbody tr:first-child', popover: { title: "6. Thao tác Đổi lịch / Hủy / Đánh dấu Spam", description: "Bấm 'Đổi ngày/giờ' khi khách báo hoãn, bấm 'Hủy lịch' kèm lý do, bấm 'Đánh dấu Spam' nếu là lịch rác, hoặc bấm 'Gọi điện/Zalo' để liên hệ khách.", side: "bottom" } }
            ]
          },
          {
            id: "2.1.4",
            number: "2.1.4.",
            title: "Luồng Tiếp nhận xe",
            desc: "Bấm nút Check-in từ Quản lý lịch hẹn (/booking-management), nhập thông tin xe và hoàn tất quy trình tiếp nhận tại /check-in.",
            targetPath: "/booking-management",
            content: {
              overview: "Khi khách hàng đưa xe tới garage làm dịch vụ, Lễ tân bắt đầu quy trình bằng cách bấm nút 'Check-in' trực tiếp trên dòng lịch hẹn của khách tại Quản lý lịch hẹn (/booking-management). Hệ thống tự động chuyển hướng tới trang Tiếp nhận xe (/check-in), nơi Lễ tân xác nhận thông tin biển số xe, nhập số KM hiển thị trên đồng hồ thực tế, chỉ định Cố vấn dịch vụ phụ trách và hoàn tất đưa xe vào Hàng chờ xưởng.",
              steps: [
                "1. Truy cập menu 'Khách hàng & Lịch hẹn' -> 'Quản lý lịch hẹn' (/booking-management).",
                "2. Tìm lịch hẹn đã xác nhận của khách và nhấp nút 'Check-in' để chuyển hướng sang giao diện /check-in.",
                "3. **[BẮT BUỘC]** Trang /check-in: Chọn biển số xe tiếp nhận trong danh sách xe của khách hoặc bấm 'Thêm xe mới'.",
                "4. **[BẮT BUỘC]** Chọn Cố vấn dịch vụ (Advisor) phụ trách tiếp nhận phiếu, lập báo giá và phân công thợ xưởng.",
                "5. **[KHÔNG BẮT BUỘC]** Nhập số KM (Odometer) thực tế trên đồng hồ xe và tải ảnh biển số xe.",
                "6. **[KHÔNG BẮT BUỘC]** Chụp ảnh tình trạng xe (7 góc: trước, sau, 2 bên thân, nội thất, vết xước) để lưu bằng chứng.",
                "7. Nhấn nút 'Xác nhận' để hoàn tất tiếp nhận xe, tự động khởi tạo Phiếu dịch vụ và đưa xe vào Hàng chờ xưởng."
              ]
            },
            sandboxType: "check_in",
            quiz: {
              question: "Tại giao diện /check-in tiếp nhận xe, trường thông tin nào là BẮT BUỘC phải chọn/nhập?",
              options: [
                "Biển số xe tiếp nhận và Cố vấn dịch vụ phụ trách",
                "Ảnh chụp 7 góc hiện trạng xe",
                "Mô tả vết trầy xước nội thất",
                "Tất cả các ô chụp ảnh hiện trạng đều bắt buộc"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-booking"]', popover: { title: "1. Menu Khách hàng & Lịch hẹn", description: "Nhấp mở danh mục Quản lý khách hàng, đặt lịch hẹn và hàng chờ.", side: "right" } },
              { element: '[data-tour-id="booking-management"]', popover: { title: "2. Chọn Quản lý lịch hẹn", description: "Nhấp chọn 'Quản lý lịch hẹn' để mở danh sách các lịch hẹn đã xác nhận.", side: "right" } },
              { targetPath: "/booking-management", element: '[data-tour-id="booking-checkin-btn"]', popover: { title: "3. Nhấn Nút Check-in Tiếp nhận xe", description: "Nhấp nút 'Check-in' tại dòng lịch hẹn của khách để chuyển sang trang Tiếp nhận xe (/check-in).", side: "bottom" } },
              { targetPath: "/check-in", element: '[class*="stepCard"]:first-of-type', popover: { title: "4. [BẮT BUỘC] Chọn Xe & Biển số xe", description: "Trường BẮT BUỘC: Xác nhận thông tin xe trong danh sách của khách hoặc bấm 'Thêm xe mới' để nhập biển số xe tiếp nhận.", side: "bottom" } },
              { element: '#advisorSelect', popover: { title: "5. [BẮT BUỘC] Chọn Cố vấn dịch vụ", description: "Trường BẮT BUỘC: Phải chọn 1 Cố vấn dịch vụ (Advisor) để phụ trách khảo sát an toàn xe, phân công thợ và theo dõi xe.", side: "bottom" } },
              { element: '#odometer', popover: { title: "6. [KHÔNG BẮT BUỘC] Nhập Số KM (Odometer)", description: "Trường KHÔNG BẮT BUỘC: Nhập Số KM hiển thị trên đồng hồ xe thực tế để theo dõi chu kỳ bảo dưỡng.", side: "bottom" } },
              { element: '[class*="stepCard"]:nth-of-type(3)', popover: { title: "7. [KHÔNG BẮT BUỘC] Chụp ảnh Tình trạng xe", description: "Trường KHÔNG BẮT BUỘC: Lễ tân có thể chụp 7 góc ảnh hiện trạng xe (trước, sau, 2 bên thân, nội thất, hư hại) để lưu bằng chứng.", side: "top" } },
              { element: '[data-tour-id="checkin-submit-actions"]', popover: { title: "8. Hoàn tất Check-in Tiếp nhận xe", description: "Nhấn nút 'Xác nhận' để hoàn tất tiếp nhận, tự động khởi tạo Phiếu dịch vụ và đưa xe vào Hàng chờ xưởng.", side: "top" } }
            ]
          },
          {
            id: "2.1.5",
            number: "2.1.5.",
            title: "Luồng điều phối phiếu dịch vụ cho cố vấn",
            desc: "Sau khi hoàn tất Check-in xe, hệ thống chuyển sang /service-ticket-management để phân công, cân đối workload và bàn giao phiếu cho Cố vấn dịch vụ.",
            targetPath: "/service-ticket-management",
            content: {
              overview: "Ngay sau khi Lễ tân hoàn tất Check-in tiếp nhận xe tại giao diện /check-in, hệ thống sẽ tự động khởi tạo Phiếu dịch vụ (Service Ticket) và điều hướng trực tiếp sang trang Điều phối phiếu dịch vụ (/service-ticket-management). Tại đây, Lễ tân hoặc Quản lý thực hiện kiểm tra thông tin phiếu, xem phân công Cố vấn dịch vụ (Advisor) phụ trách, cân đối khối lượng công việc (workload) để phân công lại nếu cần và chính thức bàn giao phiếu cho Cố vấn tiến hành khảo sát kiểm tra an toàn xe & lập báo giá.",
              steps: [
                "1. **Chuyển sang trang Điều phối sau Check-in**: Ngay sau khi nhấn 'Xác nhận' ở trang tiếp nhận xe (/check-in), hệ thống khởi tạo Phiếu dịch vụ và chuyển trực tiếp tới màn hình Điều phối (/service-ticket-management).",
                "2. **Tra cứu Phiếu dịch vụ**: Tìm phiếu vừa tạo theo Mã phiếu (ticketCode), Biển số xe hoặc Tên khách hàng trên danh sách.",
                "3. **Kiểm tra Phân công Cố vấn**: Nhấp nút 'Xem phân công' trên dòng phiếu để xem Cố vấn dịch vụ (Advisor) đang đảm nhận.",
                "4. **Cân đối Workload & Đổi Cố vấn**: Xem số lượng phiếu đang phụ trách (workload) của từng Cố vấn. Nếu Cố vấn hiện tại bận hoặc quá tải, bấm 'Đổi' để phân công cho Cố vấn khác rảnh hơn.",
                "5. **Bàn giao phiếu cho Cố vấn**: Nhấp 'Xem chi tiết' để chuyển giao phiếu sang Phân hệ Cố vấn Dịch vụ – sẵn sàng cho công đoạn khảo sát an toàn xe, tạo báo giá gửi khách và phân công thợ thi công."
              ]
            },
            sandboxType: "inspection",
            quiz: {
              question: "Sau khi nhấn 'Xác nhận' hoàn tất tiếp nhận xe tại /check-in, hệ thống tự động chuyển tới giao diện nào để phân công và bàn giao cho Cố vấn?",
              options: [
                "Trang Điều phối phiếu dịch vụ - /service-ticket-management",
                "Trang Quản lý Slider Banner",
                "Trang Báo cáo Doanh thu năm",
                "Trang Cài đặt Wifi garage"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-booking"]', popover: { title: "1. Menu Khách hàng & Dịch vụ", description: "Nhấp mở danh mục Quản lý khách hàng, đặt lịch hẹn và dịch vụ.", side: "right" } },
              { element: '[data-tour-id="service-ticket-management"]', popover: { title: "2. Chọn Điều phối phiếu dịch vụ", description: "Nhấp chọn 'Điều phối phiếu dịch vụ' để chuyển tới giao diện quản lý toàn bộ các phiếu dịch vụ xưởng.", side: "right" } },
              { targetPath: "/service-ticket-management", element: '[class*="ticket-page"], [class*="ticket-left"]', popover: { title: "3. Danh sách Phiếu tự động tạo sau Check-in", description: "Theo dõi phiếu dịch vụ vừa được khởi tạo ngay sau khi hoàn tất check-in tại /check-in.", side: "bottom" } },
              { element: 'table tbody tr:first-child button:first-child', popover: { title: "4. Xem Chi tiết & Bàn giao Phiếu dịch vụ", description: "Nhấn 'Xem chi tiết' để mở đầy đủ nội dung phiếu dịch vụ và bàn giao cho Cố vấn tiến hành khảo sát an toàn xe, lập báo giá.", side: "bottom" } },
              { element: '[data-tour-id="view-assign-btn"], table tbody tr:first-child button:nth-child(2)', autoClick: '[data-tour-id="view-assign-btn"]', popover: { title: "5. Nhấn Nút Xem Phân công Cố vấn", description: "Nhấp nút 'Xem phân công' trên dòng phiếu để mở popup phân công & điều phối Cố vấn dịch vụ.", side: "bottom" } },
              { element: '[data-tour-id="assign-advisor-modal"], [class*="modal-box"]', autoClick: '[data-tour-id="view-assign-btn"]', allowMissing: true, popover: { title: "6. Popup Xem Phân công & Cân đối Workload", description: "Popup Xem phân công: Kiểm tra Cố vấn hiện tại, xem số phiếu đang làm (Workload) của các Cố vấn khác và bấm 'Đổi' nếu cần phân công Cố vấn rảnh hơn.", side: "top" } }
            ]
          }
        ]
      },
      {
        id: "2.2",
        number: "2.2.",
        title: "Phân hệ Cố vấn Dịch vụ",
        topics: [
          {
            id: "2.2.1",
            number: "2.2.1.",
            title: "Bán hàng cho đại lý & garage",
            desc: "Tạo đơn bán lốp, phụ tùng nhanh cho đại lý đối tác, garage liên kết hoặc khách mua lẻ trực tiếp.",
            targetPath: "/parts-sales",
            content: {
              overview: "Chức năng bán hàng rút gọn dành cho Cố vấn dịch vụ / Bán hàng lập đơn bán lốp Michelin, dầu nhớt và phụ tùng cho Đại lý đối tác, Garage liên kết hoặc Khách mua lẻ. Hỗ trợ chọn loại khách hàng, tra cứu giá bán lẻ/sỉ theo kho, áp dụng chiết khấu khuyến mãi, in phiếu bán hàng và chuyển thanh toán trực tiếp.",
              steps: [
                "1. Truy cập menu 'Khách hàng & Lịch hẹn' -> 'Bán hàng' (/parts-sales).",
                "2. Nhập số điện thoại khách hàng hoặc bấm 'Chọn từ danh bạ' để chọn Đại lý / Garage đối tác.",
                "3. Kiểm tra thông tin hồ sơ và phân loại khách hàng (Đại lý / Garage / Khách lẻ).",
                "4. Thêm sản phẩm lốp Michelin, phụ tùng từ bảng báo giá linh kiện và chọn số lượng.",
                "5. Nhập mã khuyến mãi hoặc chọn chương trình chiết khấu ưu đãi từ danh sách.",
                "6. Nhấn 'Lưu nháp', 'In phiếu' hoặc 'Thanh toán' để hoàn tất thu tiền & xuất kho."
              ]
            },
            sandboxType: "parts_sales",
            quiz: {
              question: "Khi Cố vấn dịch vụ thực hiện bán lốp & phụ tùng cho Đại lý đối tác hoặc Garage liên kết, thao tác tại màn hình nào?",
              options: [
                "Bán hàng cho đại lý & garage - /parts-sales",
                "Màn hình Chấm công QR",
                "Quản lý lịch hẹn online",
                "Danh mục Phụ tùng hỏng"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-booking"]', popover: { title: "1. Menu Khách hàng & Lịch hẹn", description: "Nhấp mở danh mục Quản lý khách hàng, đặt lịch hẹn và bán hàng.", side: "right" } },
              { element: '[data-tour-id="parts-sales"]', popover: { title: "2. Chọn Bán hàng", description: "Nhấp chọn 'Bán hàng' để truy cập vào màn hình bán lốp & phụ tùng cho Đại lý / Garage.", side: "right" } },
              { targetPath: "/parts-sales", element: "#parts-sales-phone", popover: { title: "3. Nhập SĐT Khách hàng / Đại lý", description: "Nhập SĐT khách hàng hoặc bấm 'Chọn từ danh bạ' để chọn nhanh Đại lý / Garage đối tác.", side: "bottom" } },
              { element: '[class*="customerInfoCard"]', popover: { title: "4. Thông tin Khách hàng / Phân loại", description: "Xem thông tin phân loại khách hàng (Đại lý / Garage khác / Khách lẻ) và lịch sử giao dịch.", side: "bottom" } },
              { element: '[class*="estimatePanel"]', popover: { title: "5. Bảng báo giá Linh kiện & Phụ tùng", description: "Chọn lốp Michelin, dầu nhớt, linh kiện phụ tùng từ kho và điều chỉnh số lượng xuất bán.", side: "top" } },
              { element: '[class*="promotionCard"]', popover: { title: "6. Áp dụng Khuyến mãi & Chiết khấu", description: "Nhập mã giảm giá hoặc chọn voucher chiết khấu dành riêng cho đại lý / garage đối tác.", side: "top" } },
              { element: '[data-tour-id="parts-sales-submit-actions"]', popover: { title: "7. Hoàn tất & In phiếu bán hàng", description: "Nhấn 'Lưu nháp', bấm 'In phiếu' hoặc chọn 'Thanh toán' để thu tiền và xuất kho trực tiếp.", side: "top" } }
            ]
          },
          {
            id: "2.2.2",
            number: "2.2.2.",
            title: "Điều phối phiếu dịch vụ (Phân công thợ sửa)",
            desc: "Điều hành trang /advisor/inspection: Bộ lọc tra cứu, xem hạng mục khảo sát an toàn xe, mở popup Phân công KTV, tra cứu Popup Lịch sử sửa chữa cũ và chuyển sang /service-ticket-detail/.",
            targetPath: "/advisor/inspection",
            content: {
              overview: "Giao diện Khảo sát & Phân công công việc (/advisor/inspection) là trung tâm điều hành chính của Cố vấn Dịch vụ: hỗ trợ lọc phiếu theo ngày/trạng thái/tìm kiếm, kiểm tra khảo sát an toàn xe (lốp Michelin, phanh, ắc quy, dầu nhờn - số lượng hạng mục được cấu hình linh hoạt theo hệ thống), mở Popup Phân công Kỹ thuật viên & cân đối khối lượng công việc (Workload), tra cứu Popup Lịch sử sửa chữa cũ của xe, và chuyển hướng trực tiếp sang trang Chi tiết phiếu dịch vụ (/service-ticket-detail/).",
              steps: [
                "1. **Bộ lọc & Tra cứu phiếu**: Dùng bộ lọc Khoảng lọc (Theo ngày, Tuần này, Tháng này, Tất cả), Trạng thái phiếu hoặc thanh Tìm kiếm (Biển số xe, Mã phiếu, Tên/SĐT khách) để tra cứu nhanh xe tiếp nhận.",
                "2. **Theo dõi Danh sách phiếu & Hàng đợi**: Kiểm tra số thứ tự hàng đợi, trạng thái khảo sát an toàn xe và tiến độ xử lý từng phiếu.",
                "3. **Mở Popup Phân công KTV / Xem Phân công**: Nhấp nút 'Phân công' (hoặc 'Xem phân công') trên dòng phiếu để mở Popup. Kiểm tra Advisor phụ trách, theo dõi khối lượng phiếu đang làm (Workload) của các thợ xưởng để phân công KTV rảnh hơn hoặc chọn phân công cho chính bản thân.",
                "4. **Mở Popup Lịch sử sửa chữa**: Nhấp nút 'Lịch sử' trên dòng phiếu để mở Popup Lịch sử sửa chữa. Xem các phiếu dịch vụ cũ đã hoàn thành của xe, số km đã chạy, và các ghi chú/khuyến nghị bảo dưỡng ở lần trước.",
                "5. **Truy cập trang Chi tiết phiếu dịch vụ (/service-ticket-detail/)**: Nhấp nút 'Mở' trên danh sách hoặc nhấp biểu tượng chi tiết trong Popup Lịch sử để chuyển sang trang `/service-ticket-detail/`.",
                "6. **Thao tác tại trang Chi tiết phiếu dịch vụ (/service-ticket-detail/)**: Đánh giá/chỉnh sửa khảo sát an toàn xe thực tế (hạng mục cấu hình), lập dự toán báo giá lốp Michelin/phụ tùng/tiền công gửi khách duyệt, và theo dõi nhật ký tiến độ thi công của Kỹ thuật viên."
              ]
            },
            sandboxType: "advisor_inspection",
            quiz: {
              question: "Tại màn hình /advisor/inspection, Cố vấn Dịch vụ có thể thực hiện những thao tác quan trọng nào?",
              options: [
                "Lọc tra cứu phiếu, mở Popup Phân công KTV, xem Popup Lịch sử sửa chữa cũ và chuyển sang trang /service-ticket-detail/",
                "Chỉ được in phiếu thu tiền",
                "Chỉ được đổi mật khẩu cá nhân",
                "Chỉ xem danh sách thợ xưởng nghỉ phép"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-advisor"]', popover: { title: "1. Menu Cố vấn Dịch vụ", description: "Nhấp mở danh mục làm việc của Phân hệ Cố vấn dịch vụ.", side: "right" } },
              { element: '[data-tour-id="advisor-inspection"]', popover: { title: "2. Chọn Khảo sát & Phân công", description: "Nhấp chọn 'Khảo sát & Tiếp nhận phiếu' để mở giao diện điều hành chính /advisor/inspection.", side: "right" } },
              { targetPath: "/advisor/inspection", element: '[data-tour-id="advisor-filter-bar"], [class*="pendingFilters"]', popover: { title: "3. Bộ Lọc Tìm Kiếm & Tra Cứu Phiếu", description: "Sử dụng bộ lọc Ngày, Tuần, Tháng, Trạng thái phiếu hoặc thanh Tìm kiếm (Biển số xe, Mã phiếu, SĐT khách).", side: "bottom" } },
              { element: '[data-tour-id="advisor-assign-btn"], table tbody tr:first-child button:nth-child(3)', autoClick: '[data-tour-id="advisor-assign-btn"]', popover: { title: "4. Nhấn Nút Phân Công / Xem Phân Công", description: "Nhấp nút 'Phân công' (hoặc 'Xem phân công') trên dòng phiếu để mở popup điều phối Kỹ thuật viên xưởng.", side: "bottom" } },
              { element: '[data-tour-id="advisor-assign-modal"], [class*="modalContent"]', allowMissing: true, popover: { title: "5. Popup Phân Công KTV & Cân Đối Workload", description: "Xem Advisor phụ trách, kiểm tra số phiếu đang thi công (Workload) của các thợ xưởng và bấm 'Phân công' cho KTV rảnh hơn hoặc chọn cho chính mình.", side: "top" } },
              { element: '[data-tour-id="advisor-history-btn"], table tbody tr:first-child button:nth-child(2)', autoClick: '[data-tour-id="advisor-history-btn"]', popover: { title: "6. Nhấn Nút Lịch Sử Sửa Chữa", description: "Nhấp nút 'Lịch sử' trên dòng phiếu để mở popup xem lại toàn bộ lịch sử các lần dịch vụ trước của xe.", side: "bottom" } },
              { element: '[data-tour-id="advisor-history-modal"], [class*="modalContent"]', allowMissing: true, popover: { title: "7. Popup Lịch Sử Sửa Chữa", description: "Popup Lịch sử: Xem các phiếu đã thanh toán trước đây, số km xe chạy và các ghi chú/khuyến nghị bảo dưỡng ở lần dịch vụ cũ.", side: "top" } },
              { targetPath: "/service-ticket-detail/ST-DEMO-2026", element: '[data-tour-id="advisor-history-detail-btn"], [data-tour-id="advisor-ticket-detail-btn"], button[class*="historyDetailBtn"]', autoClick: '[data-tour-id="advisor-history-detail-btn"]', popover: { title: "8. Nhấn Nút Mở Chi Tiết Phiếu Dịch Vụ", description: "Nhấp nút 'Xem chi tiết' (hoặc 'Mở') trên popup lịch sử để điều hướng sang trang Chi tiết phiếu dịch vụ /service-ticket-detail/.", side: "bottom" } },
              { targetPath: "/service-ticket-detail/ST-DEMO-2026", element: 'main, [class*="layout"], body', popover: { title: "9. Trang Chi Tiết Phiếu Dịch Vụ (/service-ticket-detail/)", description: "Màn hình chi tiết chuyên sâu: Quản lý toàn bộ thông tin xe, thực hiện đánh giá kiểm tra an toàn xe, lập dự toán báo giá lốp Michelin/phụ tùng gửi khách duyệt và theo dõi tiến độ thi công.", side: "bottom" } },
              { element: '#tour-customer-info, [data-tour-id="detail-header-card"]', popover: { title: "10. Thông Tin Phiếu & Khách Hàng", description: "Xem thông tin tổng quan: Biển số xe, Mã phiếu, Odo số KM thực tế, Tên/SĐT khách hàng (Nguyễn Văn A - Khách Hàng Demo), Cố vấn phụ trách và Yêu cầu khách hàng.", side: "bottom" } },
              { element: '[data-tour-id="detail-inspection-card"], #tour-safety-checklist-card', allowMissing: true, popover: { title: "11. Khảo Sát Kiểm Tra An Toàn Xe", description: "Đánh giá tình trạng thực tế của các hạng mục an toàn (lốp Michelin, phanh, ắc quy, dầu nhờn...) được cấu hình linh hoạt theo hệ thống garage.", side: "bottom" } },
              { element: '[data-tour-id="detail-estimate-card"], #tour-estimate-section', allowMissing: true, popover: { title: "12. Bảng Dự Toán Báo Giá Phụ Tùng & Dịch Vụ", description: "Chọn thêm các sản phẩm lốp Michelin, dầu nhớt, phụ tùng thay thế từ kho và nhập tiền công dịch vụ kỹ thuật.", side: "bottom" } },
              { element: '[data-tour-id="detail-promotion-card"], #tour-promotion-section', allowMissing: true, popover: { title: "13. Áp Dụng Mã Khuyến Mãi & Chiết Khấu", description: "Nhập mã voucher giảm giá (ví dụ KM10) hoặc bấm nút 'Áp dụng' để nhận ưu đãi chiết khấu tự động theo hạng thành viên khách hàng.", side: "bottom" } },
              { element: '[data-tour-id="detail-confirm-estimate-btn"], [data-tour-id="detail-save-estimate-btn"], .ui-actions button.ui-btn--primary', allowMissing: true, popover: { title: "14. Gửi Báo Giá & Khách Duyệt (APPROVED)", description: "Nhấp nút 'Lưu báo giá' / 'Xác nhận báo giá' ở dưới cùng để lưu và gửi báo giá cho khách duyệt. Khi khách duyệt APPROVED, hệ thống tự động kích hoạt luồng xuất kho & thợ xưởng thi công.", side: "top" } },
              { element: '[data-tour-id="detail-worklog-card"], #tour-work-log', allowMissing: true, popover: { title: "15. Nhật Ký Tiến Độ Thi Công Kỹ Thuật Viên", description: "Theo dõi nhật ký thời gian làm việc thực tế, thời điểm bắt đầu/hoàn tất và tiến độ công việc của KTV xưởng.", side: "top" } }
            ]
          },
          {
            id: "2.2.3",
            number: "2.2.3.",
            title: "Chi tiết phiếu dịch vụ & Lập báo giá (/service-ticket-detail)",
            desc: "Hướng dẫn toàn bộ thành phần bên trong giao diện /service-ticket-detail: Đánh giá an toàn xe (hạng mục cấu hình), lập báo giá lốp Michelin/phụ tùng, áp dụng ưu đãi và gửi khách duyệt.",
            targetPath: "/service-ticket-detail/ST-DEMO-2026",
            content: {
              overview: "Trang Chi tiết phiếu dịch vụ (/service-ticket-detail/:ticketCode) tập trung toàn bộ nghiệp vụ chính của Cố vấn Dịch vụ: bao gồm quản lý thông tin xe & khách hàng, thực hiện khảo sát kiểm tra an toàn xe (với các hạng mục kiểm tra được cấu hình linh hoạt theo hệ thống garage), lập bảng dự toán báo giá lốp Michelin/linh kiện/tiền công, áp dụng voucher khuyến mãi & chiết khấu, gửi báo giá cho khách duyệt (APPROVED), và theo dõi nhật ký tiến độ làm việc của Kỹ thuật viên.",
              steps: [
                "1. **Thông tin Khách hàng & Xe**: Xem biển số xe, mã phiếu, số KM thực tế, tên/SĐT khách hàng và trạng thái phiếu dịch vụ.",
                "2. **Khảo sát kiểm tra an toàn xe**: Đánh giá thực tế các hạng mục an toàn (lốp Michelin, phanh, ắc quy, dầu nhờn... số lượng hạng mục được cấu hình linh hoạt theo thiết lập của garage).",
                "3. **Bảng dự toán Báo giá**: Chọn thêm các sản phẩm lốp Michelin, dầu nhớt, linh kiện phụ tùng từ kho và điều chỉnh tiền công dịch vụ kỹ thuật.",
                "4. **Áp dụng Ưu đãi & Chiết khấu**: Nhập mã voucher giảm giá hoặc áp dụng chiết khấu tự động theo hạng thành viên khách hàng.",
                "5. **Gửi Báo giá & Khách duyệt (APPROVED)**: Nhấn gửi thông tin báo giá tới khách hàng (qua Zalo OA/App di động hoặc trực tiếp). Khi khách đồng ý, chuyển trạng thái sang 'APPROVED' để kích hoạt luồng xuất kho & KTV thi công.",
                "6. **Nhật ký tiến độ thi công**: Theo dõi nhật ký thời gian làm việc thực tế, trạng thái từng công đoạn sửa chữa và lịch sử cập nhật phiếu của Kỹ thuật viên xưởng."
              ]
            },
            sandboxType: "service_ticket_detail",
            quiz: {
              question: "Số lượng các hạng mục kiểm tra an toàn xe trong giao diện /service-ticket-detail được xác định như thế nào?",
              options: [
                "Được cấu hình linh hoạt theo thiết lập của hệ thống garage",
                "Cố định cứng 32 hạng mục không thể thay đổi",
                "Cố định cứng 10 hạng mục",
                "Do khách hàng tự quy định"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { targetPath: "/service-ticket-detail/ST-DEMO-2026", element: '[data-tour-id="detail-header-card"]', popover: { title: "1. Thông tin Phiếu & Khách hàng", description: "Xem thông tin tổng quan: Biển số xe, Mã phiếu, Số KM, Trạng thái và Cố vấn phụ trách.", side: "bottom" } },
              { element: '[data-tour-id="detail-inspection-card"]', popover: { title: "2. Khảo sát Kiểm tra An toàn Xe", description: "Đánh giá mức độ an toàn theo danh sách các hạng mục được cấu hình linh hoạt trên hệ thống.", side: "bottom" } },
              { element: '[data-tour-id="detail-estimate-card"]', popover: { title: "3. Bảng Dự toán Báo giá & Phụ tùng", description: "Thêm lốp Michelin, dầu nhờn, phụ tùng từ kho và nhập chi phí tiền công dịch vụ.", side: "bottom" } },
              { element: '[data-tour-id="detail-promotion-card"]', popover: { title: "4. Áp dụng Khuyến mãi & Chiết khấu", description: "Nhập mã voucher giảm giá hoặc chọn chiết khấu ưu đãi theo hạng khách hàng.", side: "bottom" } },
              { element: '[data-tour-id="detail-approval-btn"]', popover: { title: "5. Gửi Báo giá & Khách duyệt (APPROVED)", description: "Gửi báo giá cho khách duyệt. Khi khách chuyển APPROVED, hệ thống cho phép xuất kho & thi công.", side: "bottom" } },
              { element: '[data-tour-id="detail-worklog-card"]', popover: { title: "6. Nhật ký Tiến độ Thi công Xưởng", description: "Theo dõi nhật ký thời gian làm việc thực tế và tiến độ của Kỹ thuật viên thi công.", side: "top" } }
            ]
          }
        ]
      },
      {
        id: "2.3",
        number: "2.3.",
        title: "Phân hệ Kỹ thuật viên & Xưởng",
        topics: [
          {
            id: "2.3.1",
            number: "2.3.1.",
            title: "Xem danh sách công việc hôm nay (My Tasks)",
            desc: "Tiếp nhận phiếu công việc được giao, cập nhật tiến độ thi công và khoang sửa chữa.",
            targetPath: "/my-tasks",
            content: {
              overview: "Kỹ thuật viên nhận thông báo công việc tức thì trên bảng làm việc My Tasks, tiến hành tiếp nhận và cập nhật tiến độ thi công thực tế.",
              steps: [
                "1. Truy cập menu 'Công việc hôm nay' (My Tasks).",
                "2. Xem danh sách các việc cần làm (Thay lốp Michelin, cân bằng chì, căn chỉnh thước lái 3D ST Hunter, thay dầu nhờn...).",
                "3. Nhấn 'Bắt đầu làm việc' để ghi nhận thời gian thi công thực tế của thợ.",
                "4. Cập nhật trạng thái thi công (Đang làm -> Hoàn thành) và khoang sửa chữa khả dụng."
              ]
            },
            sandboxType: "mytasks",
            quiz: {
              question: "Nơi nào giúp Kỹ thuật viên xem danh sách các công việc được phân công sửa chữa hôm nay?",
              options: ["Menu 'Công việc hôm nay' (My Tasks)", "Trang Quản lý Slider", "Quản lý Báo cáo Doanh thu", "Bảng lương nhân viên"],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="my-tasks"]', popover: { title: "Công việc hôm nay", description: "Giao diện làm việc của Kỹ thuật viên để cập nhật tiến độ công việc.", side: "right" } }
            ]
          },
          {
            id: "2.3.2",
            number: "2.3.2.",
            title: "Kiểm tra an toàn xe & Nhập thông số xe",
            desc: "Kiểm tra an toàn kỹ thuật thực tế cho xe, đo đạc và nhập thông số lốp, phanh, gầm, ắc quy và ST Hunter.",
            targetPath: "/advisor/inspection",
            content: {
              overview: "Kỹ thuật viên thực hiện kiểm tra an toàn chi tiết trên xe, tiến hành đo đạc thông số kỹ thuật thực tế (độ sâu rãnh lốp Michelin, áp suất lốp, thông số điện áp ắc quy, góc đặt bánh xe...) và nhập dữ liệu thông số lên phiếu kiểm tra.",
              steps: [
                "1. Mở màn hình 'Kiểm tra an toàn xe & Nhập thông số' trên phiếu công việc.",
                "2. Đo độ sâu rãnh lốp Michelin (mm) bằng thước đo chuyên dụng và kiểm tra áp suất lốp (PSI/Bar).",
                "3. Đo điện áp & dòng khởi động CCA của ắc quy, kiểm tra độ mòn má phanh và hệ thống gầm.",
                "4. Nhập các thông số kỹ thuật thực tế đo được vào hệ thống kèm ghi chú khuyến nghị.",
                "5. Đính kèm hình ảnh chụp thực tế vị trí mòn vẹt/hư hỏng để làm dữ liệu lưu vết cho xe."
              ]
            },
            sandboxType: "inspection",
            quiz: {
              question: "Kỹ thuật viên thực hiện đo đạc và nhập các thông số kỹ thuật thực tế (độ sâu rãnh lốp, áp suất, điện áp ắc quy) ở đâu?",
              options: [
                "Màn hình 'Kiểm tra an toàn xe & Nhập thông số xe' trong Phân hệ Kỹ thuật viên & Xưởng",
                "Màn hình Quản lý Slider",
                "Báo cáo Doanh thu Kế toán",
                "Danh mục Khuyến mãi"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="advisor-inspection"]', popover: { title: "Kiểm tra an toàn & Nhập thông số", description: "Đo đạc và nhập thông số kỹ thuật thực tế cho xe.", side: "right" } }
            ]
          }
        ]
      },
      {
        id: "2.4",
        number: "2.4.",
        title: "Phân hệ Kho & Phụ tùng",
        topics: [
          {
            id: "2.4.1",
            number: "2.4.1.",
            title: "Quản lý phiếu nhập kho & In phiếu",
            desc: "Lập & quản lý các đợt nhập lốp Michelin, dầu nhờn từ Nhà cung cấp, quét mã QR và in phiếu nhập kho.",
            targetPath: "/warehouse-stock-entries",
            content: {
              overview: "Quản lý toàn bộ quá trình nhập vật tư lốp Michelin, linh kiện phụ tùng từ Nhà cung cấp vào hệ thống, đảm bảo tồn kho thực tế trùng khớp tuyệt đối.",
              steps: [
                "1. Vào menu 'Kho & Phụ tùng' -> 'Quản lý phiếu nhập' (/warehouse-stock-entries).",
                "2. Chọn Nhà cung cấp & bấm '+ Tạo phiếu nhập kho mới'.",
                "3. Sử dụng thiết bị quét mã QR/Barcode trên tem lốp Michelin để tự động nhận diện SKU, số lượng và gán vị trí khay/kệ kho.",
                "4. Lưu phiếu nhập kho để cập nhật tăng số lượng tồn kho khả dụng.",
                "5. Nhấn nút **'In phiếu nhập kho'** để in chứng từ giao nhận nhập vật tư lưu trữ."
              ]
            },
            sandboxType: "stockin",
            quiz: {
              question: "Sau khi lập và duyệt xong phiếu nhập lốp Michelin vào kho, Thủ kho thực hiện thao tác gì để lưu chứng từ?",
              options: [
                "Bấm nút 'In phiếu nhập kho' để in chứng từ giao nhận nhập vật tư",
                "Tự tay xóa dữ liệu phiếu nhập",
                "Gửi phiếu sang bên giao vận",
                "Hủy toàn bộ đơn hàng"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="warehouse-management"]', popover: { title: "Quản lý kho", description: "Tổng quan vị trí khay kệ, tồn kho lốp và phụ tùng ô tô.", side: "right" } },
              { element: '[data-tour-id="warehouse-stock-entries"]', popover: { title: "Quản lý phiếu nhập", description: "Lập, quản lý và in phiếu nhập kho mới.", side: "right" } }
            ]
          },
          {
            id: "2.4.2",
            number: "2.4.2.",
            title: "Quản lý phiếu xuất kho & In phiếu",
            desc: "Xuất phụ tùng/lốp Michelin cho phiếu dịch vụ sửa chữa hoặc bán lẻ, chọn lô khả dụng và in phiếu xuất kho.",
            targetPath: "/warehouse-stock-issues",
            content: {
              overview: "Phê duyệt và quản lý luồng xuất lốp Michelin, vật tư phụ tùng thay thế cho các phiếu dịch vụ xưởng hoặc đơn hàng bán lẻ trực tiếp.",
              steps: [
                "1. Mở menu 'Kho & Phụ tùng' -> 'Quản lý phiếu xuất kho' (/warehouse-stock-issues).",
                "2. Kiểm tra danh sách yêu cầu xuất phụ tùng từ Cố vấn dịch vụ / phiếu dịch vụ.",
                "3. Chọn chính xác lô hàng khả dụng (Lot Picker) và xác định vị trí khay/kệ vật tư thực tế.",
                "4. Duyệt xuất kho để hệ thống tự động trừ tồn kho khả dụng và ghi nhận giá vốn.",
                "5. Nhấn nút **'In phiếu xuất kho'** để in phiếu xuất chứng từ bàn giao vật tư cho Kỹ thuật viên."
              ]
            },
            sandboxType: "warehouse_manager",
            quiz: {
              question: "Nút chức năng nào giúp xuất ra chứng từ bản cứng bàn giao phụ tùng cho thợ xưởng?",
              options: [
                "Nút 'In phiếu xuất kho'",
                "Nút Xóa phiếu",
                "Nút Hủy đơn",
                "Nút Đóng trang"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="warehouse-stock-issues"]', popover: { title: "Quản lý phiếu xuất kho", description: "Duyệt xuất kho phụ tùng và in phiếu xuất chứng từ.", side: "right" } }
            ]
          },
          {
            id: "2.4.3",
            number: "2.4.3.",
            title: "Quản lý hàng hoàn (Phiếu trả hàng) & In phiếu",
            desc: "Tiếp nhận phụ tùng thừa hoặc hư hỏng hoàn trả về kho, đối soát và in phiếu hoàn trả kho.",
            targetPath: "/warehouse-return-entries",
            content: {
              overview: "Xử lý nghiệp vụ trả hàng thừa sau sửa chữa hoặc linh kiện lỗi hoàn trả về kho từ xưởng/khách hàng, đảm bảo tính minh bạch dữ liệu kho.",
              steps: [
                "1. Mở menu 'Kho & Phụ tùng' -> 'Quản lý phiếu trả hàng' (/warehouse-return-entries).",
                "2. Bấm '+ Tạo phiếu trả hàng về kho' (Return Entry) liên kết với phiếu dịch vụ hoặc đơn xuất trước đó.",
                "3. Kiểm tra thực tế tình trạng tem mác lốp Michelin / phụ tùng hoàn trả và phân loại kho (Kho khả dụng hoặc Kho hàng hỏng).",
                "4. Xác nhận nhập trả kho để hệ thống tự động hoàn lại số lượng tồn kho tương ứng.",
                "5. Nhấn nút **'In phiếu hoàn trả'** để xuất chứng từ đối soát cho Kế toán và Thu ngân."
              ]
            },
            sandboxType: "warehouse_manager",
            quiz: {
              question: "Khi xưởng sửa chữa dùng thừa lốp/phụ tùng hoàn trả lại kho, Thủ kho thực hiện quy trình nào?",
              options: [
                "Lập phiếu trả hàng về kho (/warehouse-return-entries) và bấm 'In phiếu hoàn trả'",
                "Bỏ phụ tùng thừa đi",
                "Tự ý bán phụ tùng thừa ngoài hệ thống",
                "Không ghi nhận gì"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="warehouse-return-entries"]', popover: { title: "Quản lý hàng hoàn", description: "Lập phiếu nhập trả phụ tùng hoàn về kho và in phiếu.", side: "right" } }
            ]
          }
        ]
      },
      {
        id: "2.5",
        number: "2.5.",
        title: "Phân hệ Thu ngân & Kế toán",
        topics: [
          {
            id: "2.5.1",
            number: "2.5.1.",
            title: "Xuất hóa đơn & Thanh toán QR/Tiền mặt",
            desc: "Kiểm tra tổng chi phí, giảm giá và tạo mã VietQR động để khách quét thanh toán.",
            content: {
              overview: "Hoàn tất dịch vụ và tạo hóa đơn GTGT / Phiếu thu tiền minh bạch.",
              steps: [
                "1. Tìm phiếu dịch vụ đã hoàn thành công việc (COMPLETED).",
                "2. Nhấn 'Thanh toán' -> Chọn phương thức (VietQR động / Tiền mặt / Thẻ).",
                "3. Khách quét QR -> Hệ thống nhận Webhook tự động khớp tiền và in Hóa đơn."
              ]
            },
            sandboxType: "payment",
            quiz: {
              question: "Phương thức thanh toán nào tự động nhận phản hồi thành công qua Ngân hàng mà không cần kiểm tra thủ công?",
              options: ["Thanh toán VietQR động (Webhook ngân hàng)", "Ghi nợ viết tay", "Đổi quà tặng", "Tiền xu"],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="revenue-management"]', popover: { title: "Quản lý doanh thu", description: "Báo cáo dòng tiền, hóa đơn thanh toán và doanh số theo ca.", side: "right" } }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "3",
    number: "3.",
    title: "Luồng nghiệp vụ liên phân hệ",
    description: "Sơ đồ phối hợp nhịp nhàng giữa Lễ tân, Cố vấn, Kỹ thuật viên, Thủ kho, Quản lý kho và Kế toán.",
    topics: [
      {
        id: "3.1",
        number: "3.1.",
        title: "Quy trình Dịch vụ khép kín từ Đón khách đến Bàn giao",
        desc: "Toàn bộ chuỗi 6 bước liên thông giữa các bộ phận trong Showroom.",
        content: {
          overview: "Chuỗi liên thông tự động giúp thông tin không bị ngắt quãng, mỗi bộ phận hoàn thành bước của mình dữ liệu sẽ chuyển ngay cho bộ phận tiếp theo.",
          steps: [
            "Bước 1 (Lễ tân): Tiếp nhận xe & Chuyển hàng chờ.",
            "Bước 2 (Cố vấn): Khảo sát 32 hạng mục -> Lập báo giá gửi khách duyệt.",
            "Bước 3 (Thủ kho / Quản lý kho): Nhận yêu cầu vật tư -> Xuất lốp/phụ tùng cho thợ.",
            "Bước 4 (Kỹ thuật viên): Thay lốp, cân chỉnh thước lái -> Chụp ảnh nghiệm thu.",
            "Bước 5 (Cố vấn): Kiểm tra chất lượng (QC) -> Chuyển thanh toán.",
            "Bước 6 (Thu ngân): In hóa đơn -> Thu tiền -> Bàn giao xe cho khách."
          ]
        },
        sandboxType: "workflow",
        quiz: {
          question: "Sau khi Cố vấn báo giá được khách hàng duyệt, dữ liệu tự động chuyển tới những phân hệ nào?",
          options: [
            "Thủ kho / Quản lý kho (xuất vật tư) và Kỹ thuật viên (thực hiện công việc)",
            "Chỉ có Bảo vệ garage",
            "Công ty bảo hiểm bên ngoài",
            "Không chuyển đi đâu cả"
          ],
          correctIndex: 0
        },
        tourSteps: [
          { element: '[data-tour-id="features"]', popover: { title: "Nhóm Chức năng nghiệp vụ", description: "Nơi chứa toàn bộ các phân hệ liên thông từ Lễ tân đến Kế toán.", side: "right" } }
        ]
      }
    ]
  },
  {
    id: "4",
    number: "4.",
    title: "Xử lý sự cố & Hỏi đáp FAQs",
    description: "Khắc phục các lỗi thường gặp trong quá trình vận hành phần mềm tại garage.",
    topics: [
      {
        id: "4.1",
        number: "4.1.",
        title: "Xử lý sự cố thiết bị Quét mã QR / Barcode",
        desc: "Khắc phục lỗi camera không nhận diện tem lốp hoặc máy quét USB bị mất kết nối.",
        content: {
          overview: "Hướng dẫn kiểm tra quyền truy cập Camera trình duyệt và cấu hình cổng Com máy quét.",
          steps: [
            "1. Kiểm tra biểu tượng Ổ khóa trên thanh địa chỉ trình duyệt -> Cho phép (Allow) Camera.",
            "2. Đảm bảo tem mã QR lốp Michelin không bị bẩn hoặc quá mờ.",
            "3. Thử rút cáp USB máy quét mã vạch và cắm lại sang cổng USB 3.0 màu xanh."
          ]
        },
        sandboxType: "faq",
        quiz: {
          question: "Khi trình duyệt báo 'Camera Permission Denied', bạn cần làm gì đầu tiên?",
          options: [
            "Bấm vào biểu tượng Ổ khóa trên thanh URL trình duyệt và bật Cho phép (Allow) Camera",
            "Cài lại hệ điều hành Windows",
            "Mua máy tính mới",
            "Tắt nguồn máy in"
          ],
          correctIndex: 0
        },
        tourSteps: [
          { element: '.sidebar__scan-button', popover: { title: "Nút Quét mã QR", description: "Nút kích hoạt trình quét mã QR/Barcode nhanh trên Sidebar.", side: "bottom" } }
        ]
      }
    ]
  }
];
