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
          },
          {
            element: "form, main, body",
            targetPath: "/update-staff-profile",
            popover: {
              title: "✏️ 6. Cập nhật Hồ sơ cá nhân (/update-staff-profile)",
              description: "Chỉnh sửa họ tên, số điện thoại, email liên hệ và ảnh đại diện của bạn, sau đó bấm lưu để đồng bộ lên hệ thống.",
              side: "bottom"
            }
          },
          {
            element: "form, main, body",
            targetPath: "/staff-change-password",
            popover: {
              title: "🔒 7. Đổi mật khẩu định kỳ (/staff-change-password)",
              description: "Nhập mật khẩu hiện tại và mật khẩu mới để đổi mật khẩu. Nên đổi định kỳ 90 ngày để đảm bảo an toàn tài khoản.",
              side: "bottom"
            }
          },
          {
            element: "main, body",
            targetPath: "/staff-manage-sso",
            popover: {
              title: "🔗 8. Quản lý Đăng nhập liên kết SSO (/staff-manage-sso)",
              description: "Liên kết hoặc gỡ liên kết tài khoản đăng nhập nhanh (SSO). Nếu quên mật khẩu, dùng chức năng Quên mật khẩu (/forgot-password) tại màn hình đăng nhập.",
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
      },
      {
        id: "1.4",
        number: "1.4.",
        title: "Dashboard chung & Dashboard theo vai trò",
        desc: "Màn hình làm việc đầu tiên sau đăng nhập (/dashboard) và các Dashboard chuyên biệt cho từng vai trò nghiệp vụ.",
        targetPath: "/dashboard",
        content: {
          overview: "Sau khi đăng nhập, mọi nhân viên đều vào Dashboard chung (/dashboard) - nơi tổng hợp widget công việc, thống kê nhanh và lối tắt tới các phân hệ. Ngoài ra mỗi vai trò còn có một Dashboard chuyên biệt hiển thị đúng chỉ số nghiệp vụ mình phụ trách: Admin (/admin-dashboard), Quản lý (/manager-dashboard), Cố vấn (/advisor-dashboard), Lễ tân (/receptionist-dashboard), Kỹ thuật viên (/technician-dashboard) và Kế toán (/accountant-dashboard).",
          steps: [
            "1. **Dashboard chung (/dashboard)**: Truy cập menu 'Màn hình chung' -> 'Dashboard' để xem tổng quan công việc trong ngày.",
            "2. **Thẻ thống kê nhanh**: Theo dõi số xe đang trong xưởng, phiếu chờ xử lý, lịch hẹn hôm nay và doanh thu tạm tính.",
            "3. **Tùy biến Widget**: Bật/tắt hoặc kéo thả sắp xếp các widget hiển thị theo thói quen làm việc của bản thân.",
            "4. **Dashboard theo vai trò**: Truy cập Dashboard chuyên biệt của vai trò mình (VD: Lễ tân vào /receptionist-dashboard, Kỹ thuật viên vào /technician-dashboard) để xem chỉ số chuyên sâu.",
            "5. **Lối tắt nghiệp vụ**: Nhấp trực tiếp các thẻ/chỉ số trên Dashboard để nhảy sang màn hình nghiệp vụ tương ứng mà không cần đi qua menu."
          ]
        },
        sandboxType: "dashboard_home",
        quiz: {
          question: "Ngoài Dashboard chung (/dashboard), hệ thống còn cung cấp gì cho từng vai trò?",
          options: [
            "Dashboard chuyên biệt theo vai trò (VD: /receptionist-dashboard, /technician-dashboard, /accountant-dashboard)",
            "Chỉ có duy nhất một Dashboard cho mọi người",
            "Không có Dashboard nào",
            "Dashboard chỉ dành riêng cho Admin"
          ],
          correctIndex: 0
        },
        tourSteps: [
          { element: '[data-tour-id="general"]', popover: { title: "1. Nhóm Màn hình chung", description: "Mở nhóm 'Màn hình chung' trên thanh menu điều hướng bên trái.", side: "right" } },
          { element: '[data-tour-id="dashboard"]', popover: { title: "2. Chọn Dashboard", description: "Nhấp chọn 'Dashboard' để mở màn hình làm việc tổng quan (/dashboard).", side: "right" } },
          { targetPath: "/dashboard", element: '[class*="statCard"], [class*="statsGrid"]', popover: { title: "3. Thẻ Thống kê nhanh", description: "Theo dõi số xe trong xưởng, phiếu chờ xử lý, lịch hẹn hôm nay và doanh thu tạm tính trong ngày.", side: "bottom" } },
          { targetPath: "/dashboard", element: '[class*="tabBtn"], [class*="filterBtn"]', allowMissing: true, popover: { title: "4. Bộ lọc & Tab hiển thị", description: "Chuyển tab hoặc lọc dữ liệu Dashboard theo ngày / tuần / tháng để xem đúng khoảng thời gian cần theo dõi.", side: "bottom" } },
          { targetPath: "/dashboard", element: '[class*="widgetManagerSwitch"], [class*="actionBtn"]', allowMissing: true, popover: { title: "5. Tùy biến Widget cá nhân", description: "Bật/tắt hoặc kéo thả sắp xếp lại các widget trên Dashboard theo thói quen làm việc của bạn.", side: "left" } },
          { targetPath: "/dashboard", element: '[class*="actionCell"], [class*="statCard"]', allowMissing: true, popover: { title: "6. Lối tắt sang Dashboard theo vai trò", description: "Mỗi vai trò còn có Dashboard chuyên sâu riêng. Các bước tiếp theo sẽ lần lượt mở từng Dashboard đó.", side: "top" } },
          { targetPath: "/receptionist-dashboard", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "7. Dashboard Lễ tân (/receptionist-dashboard)", description: "Chỉ số dành riêng cho Lễ tân: lịch hẹn hôm nay, xe chờ check-in, hàng chờ xưởng và yêu cầu đặt lịch online chờ duyệt.", side: "bottom" } },
          { targetPath: "/advisor-dashboard", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "8. Dashboard Cố vấn dịch vụ (/advisor-dashboard)", description: "Chỉ số dành riêng cho Cố vấn: phiếu đang phụ trách, báo giá chờ khách duyệt và tiến độ thi công của thợ xưởng.", side: "bottom" } },
          { targetPath: "/technician-dashboard", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "9. Dashboard Kỹ thuật viên (/technician-dashboard)", description: "Chỉ số dành riêng cho Kỹ thuật viên: công việc được giao hôm nay, việc đang thi công và khối lượng đã hoàn thành.", side: "bottom" } },
          { targetPath: "/accountant-dashboard", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "10. Dashboard Kế toán (/accountant-dashboard)", description: "Chỉ số dành riêng cho Kế toán: phiếu chờ thu tiền, doanh thu trong ngày và tỷ trọng theo phương thức thanh toán.", side: "bottom" } },
          { targetPath: "/manager-dashboard", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "11. Dashboard Quản lý (/manager-dashboard)", description: "Chỉ số điều hành tổng thể: doanh thu, năng suất xưởng, KPI nhân sự và cảnh báo tồn kho dưới định mức.", side: "bottom" } },
          { targetPath: "/admin-dashboard", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "12. Dashboard Quản trị viên (/admin-dashboard)", description: "Chỉ số quản trị hệ thống: tài khoản người dùng, tình trạng hoạt động hệ thống và các cảnh báo kỹ thuật cần xử lý.", side: "bottom" } }
        ]
      },
      {
        id: "1.5",
        number: "1.5.",
        title: "Trang Thông báo & Tin nhắn nội bộ",
        desc: "Theo dõi toàn bộ thông báo hệ thống tại /notifications và trao đổi công việc thời gian thực tại /messages.",
        targetPath: "/notifications",
        content: {
          overview: "Ngoài quả chuông thông báo nhanh trên Header, hệ thống còn có trang Thông báo đầy đủ (/notifications) để tra cứu lại lịch sử và trang Tin nhắn nội bộ (/messages) để trao đổi công việc real-time giữa các phân hệ (Lễ tân - Cố vấn - Kỹ thuật viên - Thủ kho - Kế toán).",
          steps: [
            "1. **Trang Thông báo (/notifications)**: Truy cập menu 'Cá nhân' -> 'Thông báo' để xem toàn bộ lịch sử thông báo đã nhận.",
            "2. **Đánh dấu đã đọc**: Nhấp vào từng thông báo để mở nội dung liên quan hoặc bấm 'Đánh dấu tất cả đã đọc' để dọn danh sách.",
            "3. **Trang Tin nhắn (/messages)**: Mở danh sách các cuộc hội thoại nội bộ đang trao đổi cùng đồng nghiệp.",
            "4. **Tạo hội thoại mới**: Bấm nút '+' để tìm nhân viên theo tên/chức vụ và bắt đầu một cuộc trò chuyện mới.",
            "5. **Mở chi tiết hội thoại**: Nhấp vào một hội thoại để vào màn hình chat chi tiết (/messages/:conversationId), gửi tin nhắn và tệp đính kèm."
          ]
        },
        sandboxType: "notifications_messages",
        quiz: {
          question: "Nhân viên trao đổi công việc thời gian thực với đồng nghiệp ở đâu?",
          options: [
            "Trang Tin nhắn nội bộ (/messages) hoặc widget Chat trên thanh Header",
            "Gửi thư tay cho quản lý",
            "Trang Quản lý khuyến mãi",
            "Trang Cấu hình vị trí kho"
          ],
          correctIndex: 0
        },
        tourSteps: [
          { element: '[data-tour-id="personal"]', popover: { title: "1. Nhóm menu Cá nhân", description: "Mở nhóm 'Cá nhân' trên thanh menu điều hướng bên trái.", side: "right" } },
          { element: '[data-tour-id="staff-notifications-page"]', popover: { title: "2. Chọn Thông báo", description: "Nhấp chọn 'Thông báo' để mở trang tổng hợp toàn bộ thông báo hệ thống (/notifications).", side: "right" } },
          { targetPath: "/notifications", element: '.notification-row-item__header, .notifications-empty-state', popover: { title: "3. Danh sách Thông báo", description: "Xem toàn bộ thông báo về ca làm việc, phiếu dịch vụ, lịch hẹn mới và các cảnh báo kho.", side: "bottom" } },
          { targetPath: "/notifications", element: '.btn-mark-all-read', allowMissing: true, popover: { title: "4. Đánh dấu tất cả đã đọc", description: "Bấm 'Đánh dấu tất cả đã đọc' để dọn dẹp danh sách thông báo tồn đọng.", side: "left" } },
          { targetPath: "/messages", element: '.messages-page__header', popover: { title: "5. Trang Tin nhắn nội bộ (/messages)", description: "Danh sách toàn bộ các cuộc hội thoại trao đổi công việc với đồng nghiệp giữa các phân hệ.", side: "bottom" } },
          { targetPath: "/messages", element: '.messages-page__newBtn, .messages-page__emptyStateBtn', allowMissing: true, popover: { title: "6. Tạo Hội thoại mới", description: "Bấm nút '+' để tìm nhân viên theo tên/chức vụ và bắt đầu một cuộc trò chuyện làm việc mới.", side: "left" } },
          { targetPath: "/messages", element: '.messages-page__row, .messages-page__list', allowMissing: true, popover: { title: "7. Mở Chi tiết Hội thoại", description: "Nhấp vào một hội thoại trong danh sách để vào màn hình chat chi tiết.", side: "bottom" } },
          { targetPath: "/messages/1", element: 'main, body', allowMissing: true, popover: { title: "8. Màn hình Chat Chi tiết (/messages/:conversationId)", description: "Trao đổi tin nhắn thời gian thực với đồng nghiệp, gửi kèm hình ảnh/tệp đính kèm phục vụ xử lý công việc.", side: "bottom" } }
        ]
      },
      {
        id: "1.6",
        number: "1.6.",
        title: "Lịch làm việc & Lịch sử công việc cá nhân",
        desc: "Xem lịch biểu ca làm việc hàng ngày (/daily-schedule) và tra cứu lịch sử công việc đã thực hiện theo vai trò (/work-history/...).",
        targetPath: "/daily-schedule",
        content: {
          overview: "Mỗi nhân viên đều theo dõi được lịch biểu làm việc được phân ca tại trang Lịch làm việc (/daily-schedule), đồng thời tra cứu lại toàn bộ khối lượng công việc đã hoàn thành tại trang Lịch sử công việc tương ứng với vai trò của mình (/work-history/technician, /work-history/advisor, /work-history/receptionist, /work-history/accountant, /work-history/manager, /work-history/admin).",
          steps: [
            "1. **Lịch làm việc (/daily-schedule)**: Truy cập menu 'Cá nhân' -> 'Lịch làm việc' để xem lịch biểu theo dạng lịch tháng.",
            "2. **Xem chi tiết theo ngày**: Nhấp vào một ngày trên lịch để xem ca làm việc, lịch hẹn khách và công việc dự kiến của ngày đó.",
            "3. **Về ngày hiện tại**: Bấm nút 'Hôm nay' để quay nhanh về ngày đang làm việc.",
            "4. **Lịch sử công việc (/work-history/...)**: Truy cập menu 'Cá nhân' -> 'Lịch sử công việc' - hệ thống tự động mở đúng trang theo vai trò của bạn.",
            "5. **Đối chiếu khối lượng công việc**: Lọc theo khoảng thời gian để đối chiếu số phiếu/công việc đã xử lý, phục vụ đánh giá KPI cuối tháng."
          ]
        },
        sandboxType: "schedule_history",
        quiz: {
          question: "Trang Lịch sử công việc (/work-history/...) được xác định như thế nào cho từng nhân viên?",
          options: [
            "Theo vai trò của nhân viên (technician, advisor, receptionist, accountant, manager, admin)",
            "Chung một trang duy nhất cho tất cả",
            "Theo số điện thoại nhân viên",
            "Theo tên đăng nhập"
          ],
          correctIndex: 0
        },
        tourSteps: [
          { element: '[data-tour-id="personal"]', popover: { title: "1. Nhóm menu Cá nhân", description: "Mở nhóm 'Cá nhân' trên thanh menu điều hướng bên trái.", side: "right" } },
          { element: '[data-tour-id="daily-schedule"]', popover: { title: "2. Chọn Lịch làm việc", description: "Nhấp chọn 'Lịch làm việc' để mở lịch biểu ca làm việc cá nhân (/daily-schedule).", side: "right" } },
          { targetPath: "/daily-schedule", element: '[class*="calendarCard"], [class*="calendar"]', popover: { title: "3. Lịch biểu Tháng", description: "Xem toàn cảnh ca làm việc và lịch hẹn khách trong tháng theo dạng lịch trực quan.", side: "bottom" } },
          { targetPath: "/daily-schedule", element: '[class*="daysGrid"], [class*="dayContent"]', allowMissing: true, popover: { title: "4. Chi tiết theo Ngày", description: "Nhấp vào một ngày để xem ca làm việc, lịch hẹn khách và công việc dự kiến của ngày đó.", side: "bottom" } },
          { targetPath: "/daily-schedule", element: '[class*="currentButton"]', allowMissing: true, popover: { title: "5. Quay về Hôm nay", description: "Bấm nút 'Hôm nay' để lịch nhảy nhanh về ngày đang làm việc hiện tại.", side: "bottom" } },
          { targetPath: "/work-history/technician", element: 'main, [class*="container"], body', popover: { title: "6. Lịch sử công việc - Kỹ thuật viên", description: "Tra cứu toàn bộ phiếu đã thi công, thời gian làm việc thực tế và khối lượng công việc đã hoàn thành (/work-history/technician).", side: "bottom" } },
          { targetPath: "/work-history/advisor", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "7. Lịch sử công việc - Cố vấn dịch vụ", description: "Tra cứu các phiếu đã phụ trách, báo giá đã lập và tỷ lệ báo giá được khách duyệt (/work-history/advisor).", side: "bottom" } },
          { targetPath: "/work-history/receptionist", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "8. Lịch sử công việc - Lễ tân", description: "Tra cứu số lịch hẹn đã tạo, xe đã check-in tiếp nhận và đơn bán lẻ đã lập (/work-history/receptionist).", side: "bottom" } },
          { targetPath: "/work-history/accountant", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "9. Lịch sử công việc - Kế toán", description: "Tra cứu các hóa đơn đã xuất, khoản đã thu và lịch sử đối soát doanh thu (/work-history/accountant).", side: "bottom" } },
          { targetPath: "/work-history/manager", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "10. Lịch sử công việc - Quản lý", description: "Tra cứu các phê duyệt đã thực hiện: duyệt đơn nhân sự, duyệt khuyến mãi và xử lý sự cố kho (/work-history/manager).", side: "bottom" } },
          { targetPath: "/work-history/admin", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "11. Lịch sử công việc - Quản trị viên", description: "Tra cứu các thao tác quản trị hệ thống đã thực hiện: cấp tài khoản, phân quyền và cấu hình hệ thống (/work-history/admin).", side: "bottom" } }
        ]
      },
      {
        id: "1.7",
        number: "1.7.",
        title: "Chấm công QR, Đơn từ & Lịch sử chấm công",
        desc: "Quét mã QR chấm công kèm định vị GPS (/attendance-checkin), gửi đơn xin nghỉ / chấm công bù (/attendance-requests) và xem lịch sử công (/staff-attendance).",
        targetPath: "/attendance-checkin",
        content: {
          overview: "Toàn bộ nghiệp vụ chấm công cá nhân của nhân viên gồm 3 màn hình: Chấm công QR (/attendance-checkin) để check-in/check-out đầu và cuối ca, Đơn từ (/attendance-requests) để xin nghỉ phép hoặc giải trình chấm công bù, và Lịch sử chấm công (/staff-attendance) để tự đối chiếu công của mình trước khi chốt lương.",
          steps: [
            "1. **Chấm công QR (/attendance-checkin)**: Truy cập menu 'Cá nhân' -> 'Chấm công QR' trên điện thoại khi tới garage.",
            "2. **Quét mã & xác thực GPS**: Bấm 'Quét mã QR' và hướng camera vào mã QR dán tại vị trí chấm công. Hệ thống đối chiếu tọa độ GPS của thiết bị với Vị trí chấm công đã cấu hình mới ghi nhận công hợp lệ.",
            "3. **Check-out cuối ca**: Thực hiện lại thao tác quét mã khi kết thúc ca làm việc để đóng công.",
            "4. **Gửi đơn từ (/attendance-requests)**: Khi nghỉ phép, đi muộn/về sớm hoặc quên chấm công, lập đơn kèm lý do và ngày cần điều chỉnh, sau đó bấm 'Gửi đơn' chờ Quản lý duyệt.",
            "5. **Lịch sử chấm công (/staff-attendance)**: Kiểm tra lại số công, giờ vào/ra từng ngày và trạng thái các đơn đã gửi."
          ]
        },
        sandboxType: "attendance_personal",
        quiz: {
          question: "Điều kiện nào giúp hệ thống ghi nhận một lượt chấm công QR là hợp lệ?",
          options: [
            "Quét đúng mã QR và tọa độ GPS thiết bị trùng khớp với Vị trí chấm công đã cấu hình",
            "Chỉ cần chụp ảnh màn hình mã QR gửi quản lý",
            "Chỉ cần nhắn tin báo đã đến garage",
            "Chỉ cần đăng nhập hệ thống là đủ"
          ],
          correctIndex: 0
        },
        tourSteps: [
          { element: '[data-tour-id="personal"]', popover: { title: "1. Nhóm menu Cá nhân", description: "Mở nhóm 'Cá nhân' trên thanh menu điều hướng bên trái.", side: "right" } },
          { element: '[data-tour-id="attendance-checkin"]', popover: { title: "2. Chọn Chấm công QR", description: "Nhấp chọn 'Chấm công QR' để mở màn hình quét mã chấm công (/attendance-checkin).", side: "right" } },
          { targetPath: "/attendance-checkin", element: '[class*="locationName"], [class*="card"]', popover: { title: "3. Vị trí Chấm công hiện tại", description: "Hệ thống hiển thị vị trí chấm công đang nhận diện được theo GPS của thiết bị bạn đang dùng.", side: "bottom" } },
          { targetPath: "/attendance-checkin", element: '[class*="scanBtn"]', popover: { title: "4. Bấm Quét mã QR", description: "Bấm 'Quét mã QR' và hướng camera vào mã QR dán tại quầy/vị trí chấm công của garage.", side: "bottom" } },
          { targetPath: "/attendance-checkin", element: '[class*="scanSection"], [class*="doneMessage"]', allowMissing: true, popover: { title: "5. Kết quả Ghi nhận công", description: "Nếu tọa độ GPS trùng khớp vị trí đã cấu hình, hệ thống ghi nhận công hợp lệ và hiển thị thông báo thành công.", side: "bottom" } },
          { targetPath: "/attendance-requests", element: '[class*="formCard"], [class*="form"]', popover: { title: "6. Lập Đơn xin nghỉ / Chấm công bù", description: "Chọn loại đơn (nghỉ phép, đi muộn/về sớm, chấm công bù), nhập ngày áp dụng và lý do cụ thể.", side: "bottom" } },
          { targetPath: "/attendance-requests", element: '[class*="formFooter"] button, button[class*="primary"]', allowMissing: true, popover: { title: "7. Gửi đơn chờ Duyệt", description: "Bấm 'Gửi đơn' để chuyển đơn sang Quản lý phê duyệt tại trang /attendance-request-management.", side: "top" } },
          { targetPath: "/staff-attendance", element: 'main, table, body', popover: { title: "8. Lịch sử Chấm công (/staff-attendance)", description: "Tự đối chiếu số công, giờ vào/ra từng ngày và trạng thái các đơn từ đã gửi trước khi chốt lương.", side: "bottom" } }
        ]
      },
      {
        id: "1.8",
        number: "1.8.",
        title: "Trung tâm Tài liệu & Hướng dẫn sử dụng",
        desc: "Tra cứu tài liệu nghiệp vụ tại /docs và xem các bài hướng dẫn sử dụng hệ thống tại /system-tutorials.",
        targetPath: "/docs",
        content: {
          overview: "Hệ thống cung cấp 2 kênh tự học: Trung tâm Tài liệu (/docs) - chính là trang bạn đang đọc, gồm cây tài liệu nghiệp vụ, khu vực thực hành mô phỏng (Sandbox), bài kiểm tra nhanh (Quiz) và tour hướng dẫn tương tác chạy trực tiếp trên màn hình thật; và trang Hướng dẫn sử dụng (/system-tutorials) chứa các bài hướng dẫn thao tác theo từng chủ đề.",
          steps: [
            "1. **Mở Trung tâm Tài liệu (/docs)**: Truy cập menu 'Màn hình chung' -> 'Tài liệu hướng dẫn'.",
            "2. **Duyệt cây tài liệu**: Chọn phân hệ và bài học cần đọc ở cây thư mục bên trái, hoặc gõ từ khóa vào ô tìm kiếm.",
            "3. **Chạy Tour hướng dẫn tương tác**: Bấm nút chạy tour để hệ thống tự điều hướng sang màn hình thật và chỉ dẫn từng bước thao tác bằng popup.",
            "4. **Thực hành Sandbox & làm Quiz**: Thao tác thử trên khu vực mô phỏng an toàn rồi làm bài kiểm tra nhanh để đánh dấu hoàn thành bài học.",
            "5. **Hướng dẫn sử dụng (/system-tutorials)**: Truy cập menu 'Màn hình chung' -> 'Hướng dẫn sử dụng' để xem các bài hướng dẫn thao tác chi tiết theo chủ đề."
          ]
        },
        sandboxType: "docs_center",
        quiz: {
          question: "Tour hướng dẫn tương tác trong Trung tâm Tài liệu (/docs) hoạt động như thế nào?",
          options: [
            "Tự điều hướng sang màn hình thật của hệ thống và chỉ dẫn từng bước thao tác bằng popup",
            "Chỉ hiển thị một đoạn video quay sẵn",
            "Gửi email hướng dẫn cho nhân viên",
            "In tài liệu ra giấy"
          ],
          correctIndex: 0
        },
        tourSteps: [
          { element: '[data-tour-id="general"]', popover: { title: "1. Nhóm Màn hình chung", description: "Mở nhóm 'Màn hình chung' trên thanh menu điều hướng bên trái.", side: "right" } },
          { element: '[data-tour-id="docs"]', popover: { title: "2. Chọn Tài liệu hướng dẫn", description: "Nhấp chọn 'Tài liệu hướng dẫn' để mở Trung tâm Tài liệu nghiệp vụ (/docs).", side: "right" } },
          { element: '[data-tour-id="system-tutorials"]', popover: { title: "3. Chọn Hướng dẫn sử dụng", description: "Nhấp chọn 'Hướng dẫn sử dụng' để xem các bài hướng dẫn thao tác chi tiết theo chủ đề (/system-tutorials).", side: "right" } },
          { targetPath: "/system-tutorials", element: '.guide-timeline, .guide-steps-container, main', allowMissing: true, popover: { title: "4. Danh sách Bài hướng dẫn", description: "Chọn một chủ đề để mở hộp thoại hướng dẫn chi tiết từng bước thao tác trên hệ thống.", side: "bottom" } }
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
              { element: '[data-tour-id="booking-request-table"] tbody tr:first-child', popover: { title: "6. Duyệt & Phê duyệt Lịch hẹn", description: "Nhấp vào đơn để xem chi tiết, bấm 'Duyệt' để xác nhận giữ chỗ hoặc chọn 'Liên hệ điều chỉnh' nếu cần đổi khung giờ.", side: "bottom" } },
              { targetPath: "/booking-request-management/1", element: 'main, body', allowMissing: true, popover: { title: "7. Trang Chi tiết Yêu cầu (/booking-request-management/:id)", description: "Xem đầy đủ thông tin xe, dịch vụ khách đăng ký và khung giờ mong muốn trước khi ra quyết định duyệt.", side: "bottom" } },
              { targetPath: "/booking-request-management/1/edit", element: 'main, form, body', allowMissing: true, popover: { title: "8. Chỉnh sửa Yêu cầu (/booking-request-management/:id/edit)", description: "Nếu cần thỏa thuận lại với khách, mở trang chỉnh sửa để điều chỉnh khung giờ hoặc dịch vụ rồi lưu lại.", side: "bottom" } }
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
              { element: '[data-tour-id="confirmed-booking-table"] tbody tr:first-child', popover: { title: "6. Thao tác Đổi lịch / Hủy / Đánh dấu Spam", description: "Bấm 'Đổi ngày/giờ' khi khách báo hoãn, bấm 'Hủy lịch' kèm lý do, bấm 'Đánh dấu Spam' nếu là lịch rác, hoặc bấm 'Gọi điện/Zalo' để liên hệ khách.", side: "bottom" } },
              { targetPath: "/booking-management/1", element: 'main, body', allowMissing: true, popover: { title: "7. Trang Chi tiết Lịch hẹn (/booking-management/:id)", description: "Mở chi tiết một lịch hẹn đã xác nhận để xem đầy đủ thông tin khách, xe, dịch vụ đăng ký và thực hiện Check-in tiếp nhận.", side: "bottom" } }
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
          },
          {
            id: "2.1.6",
            number: "2.1.6.",
            title: "Danh bạ khách hàng & Hồ sơ khách",
            desc: "Quản lý danh bạ khách hàng (/customer-manager), chỉnh sửa hồ sơ, xem hạng thành viên và nhập khách hàng hàng loạt từ Excel.",
            targetPath: "/customer-manager",
            content: {
              overview: "Danh bạ khách hàng (/customer-manager) là nguồn dữ liệu gốc cho mọi nghiệp vụ đặt lịch, tiếp nhận xe và bán hàng. Lễ tân quản lý thông tin liên hệ, hồ sơ xe gắn với khách, điểm tích lũy và hạng thành viên (BRONZE / SILVER / GOLD / PLATINUM). Với dữ liệu khách hàng cũ số lượng lớn, hệ thống hỗ trợ nhập hàng loạt từ file Excel (/customer-excel-import).",
              steps: [
                "1. Truy cập menu 'Khách hàng & Lịch hẹn' -> 'Danh bạ khách hàng' (/customer-manager).",
                "2. Tra cứu khách theo Tên hoặc Số điện thoại trên thanh tìm kiếm để mở hồ sơ chi tiết.",
                "3. Xem thông tin liên hệ, danh sách xe của khách, điểm tích lũy và hạng thành viên hiện tại.",
                "4. Bấm 'Thêm khách hàng' để tạo hồ sơ mới, hoặc mở trang chỉnh sửa (/customer-profile/:customerId) để cập nhật thông tin khách đã có.",
                "5. Với danh sách khách hàng cũ số lượng lớn, dùng chức năng Nhập Excel (/customer-excel-import): tải file mẫu, điền dữ liệu, tải lên và đối chiếu trước khi xác nhận nhập."
              ]
            },
            sandboxType: "customer_directory",
            quiz: {
              question: "Khi cần đưa danh sách hàng trăm khách hàng cũ vào hệ thống, Lễ tân nên dùng cách nào?",
              options: [
                "Dùng chức năng Nhập khách hàng từ Excel (/customer-excel-import)",
                "Gõ tay từng khách hàng một",
                "Nhờ Kỹ thuật viên nhập hộ",
                "Không cần đưa vào hệ thống"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-booking"]', popover: { title: "1. Menu Khách hàng & Lịch hẹn", description: "Nhấp mở danh mục Quản lý khách hàng, đặt lịch hẹn và bán hàng.", side: "right" } },
              { element: '[data-tour-id="customer-manager"]', popover: { title: "2. Chọn Danh bạ khách hàng", description: "Nhấp chọn 'Danh bạ khách hàng' để mở màn hình quản lý hồ sơ khách (/customer-manager).", side: "right" } },
              { targetPath: "/customer-manager", element: '[class*="searchInput"], input[placeholder*="Tìm"]', allowMissing: true, popover: { title: "3. Tra cứu Khách hàng", description: "Nhập Tên hoặc Số điện thoại để tìm nhanh khách hàng trong danh bạ garage.", side: "bottom" } },
              { targetPath: "/customer-manager", element: '[class*="contactsList"]', popover: { title: "4. Danh sách Danh bạ", description: "Duyệt danh sách khách hàng đã lưu kèm ảnh đại diện, tên và số điện thoại liên hệ.", side: "right" } },
              { targetPath: "/customer-manager", element: '[class*="detailCard"], [class*="detailGrid"]', allowMissing: true, popover: { title: "5. Hồ sơ Chi tiết & Hạng khách hàng", description: "Nhấp một khách để xem hồ sơ: thông tin liên hệ, danh sách xe, điểm tích lũy và hạng thành viên (Đồng/Bạc/Vàng/Bạch Kim).", side: "left" } },
              { targetPath: "/customer-manager", element: '[class*="detailActions"] button, [class*="addButton"]', allowMissing: true, popover: { title: "6. Thêm mới & Chỉnh sửa Hồ sơ", description: "Bấm 'Thêm khách hàng' để tạo hồ sơ mới, hoặc bấm chỉnh sửa trên hồ sơ khách đã có.", side: "left" } },
              { targetPath: "/customer-profile/1", element: 'main, form, body', allowMissing: true, popover: { title: "7. Trang Cập nhật Hồ sơ khách (/customer-profile/:customerId)", description: "Chỉnh sửa thông tin liên hệ, danh sách xe của khách và điều chỉnh điểm tích lũy kèm lý do cụ thể.", side: "bottom" } },
              { targetPath: "/customer-excel-import", element: '[class*="dropZone"], [class*="container"]', allowMissing: true, popover: { title: "7. Nhập Khách hàng hàng loạt từ Excel", description: "Tại /customer-excel-import: tải file mẫu, điền dữ liệu khách cũ, kéo thả file lên và đối chiếu dữ liệu trước khi bấm xác nhận nhập.", side: "bottom" } }
            ]
          },
          {
            id: "2.1.7",
            number: "2.1.7.",
            title: "Quản lý hàng chờ xưởng",
            desc: "Theo dõi và điều phối các xe đang chờ tại xưởng sau khi check-in tiếp nhận (/queue-management).",
            targetPath: "/queue-management",
            content: {
              overview: "Sau khi hoàn tất Check-in tiếp nhận xe, xe được đưa vào Hàng chờ xưởng (/queue-management). Màn hình này giúp Lễ tân nắm được thứ tự xe đang chờ, tình trạng khoang sửa chữa và chủ động điều phối để tránh xe bị bỏ quên hoặc ùn tắc giờ cao điểm.",
              steps: [
                "1. Truy cập menu 'Khách hàng & Lịch hẹn' -> 'Quản lý hàng chờ đặt lịch' (/queue-management).",
                "2. Theo dõi danh sách xe đang chờ theo thứ tự tiếp nhận kèm biển số và thời gian vào xưởng.",
                "3. Kiểm tra thông tin từng xe: chủ xe, yêu cầu dịch vụ và Cố vấn phụ trách.",
                "4. Bấm nút phân công/điều phối để chuyển xe sang Cố vấn dịch vụ hoặc khoang sửa chữa khả dụng.",
                "5. Theo dõi xe đã rời hàng chờ khi đã được tiếp nhận thi công để đảm bảo hàng chờ luôn phản ánh đúng thực tế xưởng."
              ]
            },
            sandboxType: "queue_board",
            quiz: {
              question: "Xe được đưa vào màn hình Hàng chờ xưởng (/queue-management) tại thời điểm nào?",
              options: [
                "Ngay sau khi Lễ tân hoàn tất Check-in tiếp nhận xe",
                "Sau khi khách hàng đã thanh toán xong",
                "Khi khách vừa gọi điện đặt lịch",
                "Sau khi xe đã rời garage"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-booking"]', popover: { title: "1. Menu Khách hàng & Lịch hẹn", description: "Nhấp mở danh mục Quản lý khách hàng, đặt lịch hẹn và hàng chờ.", side: "right" } },
              { element: '[data-tour-id="queue-management"]', popover: { title: "2. Chọn Quản lý hàng chờ", description: "Nhấp chọn 'Quản lý hàng chờ đặt lịch' để mở màn hình hàng chờ xưởng (/queue-management).", side: "right" } },
              { targetPath: "/queue-management", element: '[class*="controlsCard"], [class*="controlsRow"]', allowMissing: true, popover: { title: "3. Thanh Điều khiển & Bộ lọc", description: "Lọc hàng chờ theo trạng thái hoặc khoang sửa chữa để nắm nhanh tình hình xưởng.", side: "bottom" } },
              { targetPath: "/queue-management", element: '[class*="listCol"], [class*="list"]', popover: { title: "4. Danh sách Xe đang chờ", description: "Theo dõi thứ tự xe chờ theo thời gian tiếp nhận kèm biển số xe (plate) và thông tin khách.", side: "right" } },
              { targetPath: "/queue-management", element: '[class*="infoGrid"], [class*="cardBody"]', allowMissing: true, popover: { title: "5. Thông tin Chi tiết Xe chờ", description: "Xem chủ xe, yêu cầu dịch vụ khách đăng ký và Cố vấn dịch vụ đang phụ trách.", side: "left" } },
              { targetPath: "/queue-management", element: '[class*="assignButton"], [class*="actionButtons"] button', allowMissing: true, popover: { title: "6. Điều phối & Phân công", description: "Bấm nút phân công để chuyển xe sang Cố vấn dịch vụ hoặc khoang sửa chữa khả dụng, đưa xe ra khỏi hàng chờ.", side: "left" } }
            ]
          },
          {
            id: "2.1.8",
            number: "2.1.8.",
            title: "Quản lý hồ sơ xe khách hàng",
            desc: "Tra cứu và quản lý toàn bộ hồ sơ xe đang phục vụ tại garage (/vehicle-management): biển số, dòng xe, số KM và lịch sử dịch vụ.",
            targetPath: "/vehicle-management",
            content: {
              overview: "Trang Quản lý hồ sơ xe (/vehicle-management) tập trung toàn bộ xe của khách hàng đang được garage phục vụ. Mỗi xe gắn với một chủ sở hữu, lưu biển số, dòng xe, số KM gần nhất và lịch sử các phiếu dịch vụ - giúp Lễ tân và Cố vấn tra cứu nhanh khi khách quay lại.",
              steps: [
                "1. Truy cập trang Quản lý hồ sơ xe (/vehicle-management).",
                "2. Dùng bộ lọc hoặc thanh tìm kiếm theo Biển số xe / Tên chủ xe để tra cứu hồ sơ.",
                "3. Xem chi tiết thông tin xe: biển số, hãng/dòng xe, năm sản xuất, số KM gần nhất và chủ sở hữu.",
                "4. Đối chiếu lịch sử phiếu dịch vụ của xe để tư vấn hạng mục bảo dưỡng phù hợp chu kỳ.",
                "5. Cập nhật hoặc bổ sung thông tin xe khi khách thay đổi (đổi biển số, sang tên chủ xe...)."
              ]
            },
            sandboxType: "vehicle_records",
            quiz: {
              question: "Thông tin nào KHÔNG được quản lý trong hồ sơ xe tại /vehicle-management?",
              options: [
                "Bảng lương của Kỹ thuật viên",
                "Biển số xe và dòng xe",
                "Số KM gần nhất của xe",
                "Chủ sở hữu xe"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { targetPath: "/vehicle-management", element: '[class*="headerCard"]', popover: { title: "1. Trang Quản lý Hồ sơ xe", description: "Màn hình tập trung toàn bộ xe của khách hàng đang được garage phục vụ (/vehicle-management).", side: "bottom" } },
              { targetPath: "/vehicle-management", element: '[class*="filterCard"]', popover: { title: "2. Bộ lọc & Tra cứu", description: "Lọc hoặc tìm kiếm theo Biển số xe, Tên chủ xe để tra cứu nhanh hồ sơ cần xem.", side: "bottom" } },
              { targetPath: "/vehicle-management", element: '[class*="tableCard"], table', popover: { title: "3. Bảng Danh sách Xe", description: "Danh sách xe kèm biển số (plateBadge), dòng xe, chủ sở hữu và số KM ghi nhận gần nhất.", side: "top" } },
              { targetPath: "/vehicle-management", element: '[class*="customerInfoCard"], [class*="detailGrid"]', allowMissing: true, popover: { title: "4. Thông tin Chủ xe", description: "Xem thông tin khách hàng sở hữu xe để liên hệ khi cần nhắc lịch bảo dưỡng.", side: "left" } },
              { targetPath: "/vehicle-management", element: '[class*="modalCard"], [class*="primaryButton"]', allowMissing: true, popover: { title: "5. Cập nhật Hồ sơ xe", description: "Mở hộp thoại chi tiết để bổ sung/chỉnh sửa thông tin xe khi khách đổi biển số hoặc sang tên chủ xe.", side: "top" } }
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
              { element: '[data-tour-id="detail-confirm-estimate-btn"], [data-tour-id="detail-save-estimate-btn"], .ui-actions button[class*="primary"]', allowMissing: true, popover: { title: "14. Gửi Báo Giá & Khách Duyệt (APPROVED)", description: "Nhấp nút 'Lưu báo giá' / 'Xác nhận báo giá' ở dưới cùng để lưu và gửi báo giá cho khách duyệt. Khi khách duyệt APPROVED, hệ thống tự động kích hoạt luồng xuất kho & thợ xưởng thi công.", side: "top" } },
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
            desc: "Tiếp nhận phiếu công việc được giao tại /technician/my-tasks, bắt đầu thi công và cập nhật tiến độ theo ngày làm việc.",
            targetPath: "/technician/my-tasks",
            content: {
              overview: "Kỹ thuật viên nhận thông báo công việc tức thì trên bảng làm việc My Tasks (/technician/my-tasks), tiến hành tiếp nhận và cập nhật tiến độ thi công thực tế. Màn hình hỗ trợ điều hướng theo ngày để xem lại công việc đã làm hoặc chuẩn bị cho ngày kế tiếp.",
              steps: [
                "1. Truy cập menu 'Dịch vụ & Xưởng' -> 'Công việc hôm nay' (/technician/my-tasks).",
                "2. Dùng thanh điều hướng ngày (Hôm qua / Hôm nay / Ngày mai) để xem đúng danh sách công việc theo ngày làm việc.",
                "3. Xem danh sách các việc cần làm (Thay lốp Michelin, cân bằng chì, căn chỉnh thước lái 3D ST Hunter, thay dầu nhờn...) kèm biển số xe và yêu cầu của khách.",
                "4. Nhấn 'Bắt đầu làm việc' trên phiếu để hệ thống ghi nhận thời gian thi công thực tế của thợ.",
                "5. Cập nhật trạng thái thi công (Đang làm -> Hoàn thành) và khoang sửa chữa khả dụng tại màn hình Cập nhật tiến độ (/technician/update-progress/:id)."
              ]
            },
            sandboxType: "mytasks",
            quiz: {
              question: "Kỹ thuật viên xem danh sách các công việc được phân công sửa chữa hôm nay ở đường dẫn nào?",
              options: ["Menu 'Công việc hôm nay' - /technician/my-tasks", "Trang Quản lý Slider", "Quản lý Báo cáo Doanh thu", "Bảng lương nhân viên"],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-service"]', popover: { title: "1. Menu Dịch vụ & Xưởng", description: "Nhấp mở danh mục 'Dịch vụ & Xưởng' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="my-tasks"]', popover: { title: "2. Chọn Công việc hôm nay", description: "Nhấp chọn 'Công việc hôm nay' để mở bảng làm việc của Kỹ thuật viên (/technician/my-tasks).", side: "right" } },
              { targetPath: "/technician/my-tasks", element: '[class*="bookingHeader"], [class*="headerMeta"]', popover: { title: "3. Tiêu đề & Tổng quan Ca làm", description: "Xem tổng quan số lượng công việc được giao và thông tin ca làm việc hiện tại của bạn.", side: "bottom" } },
              { targetPath: "/technician/my-tasks", element: '[class*="dayNavigator"]', popover: { title: "4. Thanh Điều hướng theo Ngày", description: "Dùng nút mũi tên hoặc bấm 'Hôm nay' để chuyển nhanh giữa các ngày và xem đúng danh sách công việc theo ngày.", side: "bottom" } },
              { targetPath: "/technician/my-tasks", element: '[class*="filterCardControls"], [class*="filterCardLabels"]', allowMissing: true, popover: { title: "5. Bộ lọc Công việc", description: "Lọc theo trạng thái (Chờ làm / Đang làm / Hoàn thành) để tập trung vào các phiếu cần xử lý ngay.", side: "bottom" } },
              { targetPath: "/technician/my-tasks", element: '[class*="bookingTable"], table', popover: { title: "6. Bảng Danh sách Công việc", description: "Danh sách phiếu được giao kèm biển số xe, hạng mục cần thi công và yêu cầu cụ thể của khách hàng.", side: "top" } },
              { targetPath: "/technician/my-tasks", element: '[class*="infoGrid"], [class*="customerRequestText"]', allowMissing: true, popover: { title: "7. Chi tiết Yêu cầu Khách hàng", description: "Đọc kỹ mô tả triệu chứng xe và yêu cầu khách ghi nhận từ Lễ tân/Cố vấn trước khi bắt tay thi công.", side: "bottom" } },
              { targetPath: "/technician/my-tasks", element: '[class*="actionButtons"] button, [class*="ghostButton"]', allowMissing: true, popover: { title: "8. Bắt đầu Thi công", description: "Bấm 'Bắt đầu làm việc' để hệ thống ghi nhận giờ thi công thực tế của bạn trên phiếu.", side: "top" } },
              { targetPath: "/technician-tasks", element: 'main, table, body', allowMissing: true, popover: { title: "9. Màn hình Công việc (bản cũ - /technician-tasks)", description: "Hệ thống còn giữ màn hình danh sách công việc bản cũ tại /technician-tasks dành riêng cho Kỹ thuật viên, nội dung tương đương My Tasks.", side: "bottom" } }
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
            sandboxType: "tech_inspection",
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
              { element: '[data-tour-id="sub-service"]', popover: { title: "1. Menu Dịch vụ & Xưởng", description: "Nhấp mở danh mục 'Dịch vụ & Xưởng' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="advisor-inspection"]', popover: { title: "2. Chọn Điều phối phiếu dịch vụ", description: "Nhấp chọn 'Điều phối phiếu dịch vụ' để mở màn hình khảo sát & kiểm tra an toàn xe (/advisor/inspection).", side: "right" } },
              { targetPath: "/advisor/inspection", element: '[data-tour-id="advisor-filter-bar"], [class*="bookingHeader"]', popover: { title: "3. Tra cứu Phiếu cần kiểm tra", description: "Lọc theo ngày hoặc tìm theo biển số xe/mã phiếu để mở đúng phiếu xe mình đang thi công.", side: "bottom" } },
              { targetPath: "/advisor/inspection", element: '[class*="bookingTable"], table', popover: { title: "4. Danh sách Phiếu & Hạng mục kiểm tra", description: "Chọn phiếu cần kiểm tra để mở danh sách hạng mục an toàn (lốp Michelin, phanh, ắc quy, dầu nhờn...) cần đo đạc.", side: "top" } },
              { targetPath: "/advisor/inspection", element: '[class*="assignCard"], [class*="actionButtons"] button', allowMissing: true, popover: { title: "5. Mở Phiếu Kiểm tra An toàn", description: "Bấm mở phiếu kiểm tra an toàn của xe (/technician/safetyinspection-ticket/:id) để bắt đầu nhập kết quả đo thực tế.", side: "left" } },
              { targetPath: "/advisor/inspection", element: '[class*="carDiagramWrapper"], [class*="formGroup"]', allowMissing: true, popover: { title: "6. Nhập Thông số Kỹ thuật đo được", description: "Nhập độ sâu rãnh lốp (mm), áp suất lốp (PSI/Bar), điện áp & CCA ắc quy, độ mòn má phanh và góc đặt bánh xe 3D Hunter.", side: "bottom" } },
              { targetPath: "/advisor/inspection", element: '[class*="imageGrid"], [class*="fileInput"]', allowMissing: true, popover: { title: "7. Đính kèm Ảnh Bằng chứng", description: "Chụp và tải lên ảnh thực tế vị trí mòn vẹt/hư hỏng để lưu vết hồ sơ xe và làm căn cứ tư vấn cho khách.", side: "bottom" } },
              { targetPath: "/advisor/inspection", element: '[class*="completeButton"], button[class*="primary"]', allowMissing: true, popover: { title: "8. Lưu Kết quả Kiểm tra", description: "Bấm lưu/hoàn tất để gửi kết quả khảo sát về cho Cố vấn dịch vụ lập báo giá gửi khách duyệt.", side: "top" } }
            ]
          },
          {
            id: "2.3.3",
            number: "2.3.3.",
            title: "Cập nhật tiến độ thi công & Nghiệm thu",
            desc: "Ghi nhận tiến độ công việc thực tế, đề xuất phát sinh, đính kèm ảnh nghiệm thu và hoàn tất phiếu tại /technician/update-progress/:id.",
            targetPath: "/technician/my-tasks",
            content: {
              overview: "Trong quá trình thi công, Kỹ thuật viên cập nhật tiến độ tại màn hình /technician/update-progress/:id. Đây là nơi ghi nhận trạng thái từng hạng mục, đề xuất các hạng mục phát sinh cần Cố vấn xin ý kiến khách, đính kèm ảnh nghiệm thu và bấm hoàn tất để chuyển phiếu sang bước kiểm tra chất lượng (QC) và thanh toán.",
              steps: [
                "1. Từ danh sách công việc (/technician/my-tasks), chọn phiếu đang thi công và mở màn hình Cập nhật tiến độ.",
                "2. Tích chọn các hạng mục đã hoàn thành theo đúng thực tế đã thi công trên xe.",
                "3. Nếu phát hiện hư hỏng ngoài báo giá ban đầu, ghi nhận vào ô Đề xuất dịch vụ phát sinh để Cố vấn xin ý kiến khách hàng.",
                "4. Chụp và tải lên ảnh nghiệm thu (lốp đã thay, thông số cân chỉnh, tình trạng sau sửa) làm bằng chứng bàn giao.",
                "5. Bấm 'Hoàn thành' để đóng công việc, giải phóng khoang sửa chữa và chuyển phiếu sang bước QC & thanh toán."
              ]
            },
            sandboxType: "tech_progress",
            quiz: {
              question: "Khi thi công phát hiện hư hỏng nằm ngoài báo giá đã duyệt, Kỹ thuật viên phải làm gì?",
              options: [
                "Ghi nhận vào mục Đề xuất dịch vụ phát sinh để Cố vấn xin ý kiến khách hàng",
                "Tự ý sửa luôn rồi tính thêm tiền khi thanh toán",
                "Bỏ qua không cần ghi nhận",
                "Tự gọi điện báo giá trực tiếp cho khách"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-service"]', popover: { title: "1. Menu Dịch vụ & Xưởng", description: "Nhấp mở danh mục 'Dịch vụ & Xưởng' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="my-tasks"]', popover: { title: "2. Chọn Công việc hôm nay", description: "Nhấp chọn 'Công việc hôm nay' để mở danh sách phiếu đang thi công (/technician/my-tasks).", side: "right" } },
              { targetPath: "/technician/my-tasks", element: '[class*="actionButtons"] button, [class*="bookingTable"] button', allowMissing: true, popover: { title: "3. Mở Màn hình Cập nhật Tiến độ", description: "Bấm nút cập nhật trên phiếu đang thi công để mở màn hình /technician/update-progress/:id.", side: "left" } },
              { targetPath: "/technician/my-tasks", element: '[class*="checkboxLabel"], [class*="card"]', allowMissing: true, popover: { title: "4. Tích chọn Hạng mục Hoàn thành", description: "Tích các hạng mục đã thi công xong đúng theo thực tế đã làm trên xe.", side: "bottom" } },
              { targetPath: "/technician/my-tasks", element: '[class*="additionalServiceBox"]', allowMissing: true, popover: { title: "5. Đề xuất Dịch vụ Phát sinh", description: "Ghi nhận các hư hỏng phát hiện thêm ngoài báo giá để Cố vấn dịch vụ xin ý kiến khách hàng trước khi làm.", side: "bottom" } },
              { targetPath: "/technician/my-tasks", element: '[class*="imageGrid"], [class*="fileInput"]', allowMissing: true, popover: { title: "6. Ảnh Nghiệm thu Bàn giao", description: "Tải lên ảnh nghiệm thu (lốp đã thay, thông số cân chỉnh, tình trạng xe sau sửa) làm bằng chứng bàn giao cho khách.", side: "bottom" } },
              { targetPath: "/technician/update-progress/1", element: 'main, [class*="content"], body', allowMissing: true, popover: { title: "7. Trang Cập nhật Tiến độ (/technician/update-progress/:id)", description: "Màn hình chuyên biệt ghi nhận tiến độ: tích hạng mục hoàn thành, đề xuất phát sinh và tải ảnh nghiệm thu.", side: "bottom" } },
              { targetPath: "/technician/safetyinspection-ticket/1", element: 'main, [class*="container"], body', allowMissing: true, popover: { title: "8. Phiếu Kiểm tra An toàn (/technician/safetyinspection-ticket/:id)", description: "Phiếu kiểm tra an toàn xe của Kỹ thuật viên: đánh giá từng hạng mục trên sơ đồ xe và ghi nhận kết quả đo thực tế.", side: "bottom" } },
              { targetPath: "/technician/my-tasks", element: '[class*="completeButton"], [class*="actionButtons"] button', allowMissing: true, popover: { title: "9. Bấm Hoàn thành Công việc", description: "Bấm 'Hoàn thành' để đóng công việc, giải phóng khoang sửa chữa và chuyển phiếu sang bước kiểm tra chất lượng & thanh toán.", side: "top" } }
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
              { element: '[data-tour-id="warehouse-management"]', popover: { title: "1. Mở Phân Hệ", description: "Bấm vào menu Kho & Phụ Tùng ở thanh bên trái.", side: "right" } },
              { element: '[data-tour-id="warehouse-stock-entries"]', popover: { title: "2. Chọn Chức Năng", description: "Chọn 'Quản lý phiếu nhập kho' để mở màn hình danh sách chứng từ.", side: "right" } },
              { targetPath: "/warehouse-stock-entries", element: 'section[class*="statsGrid"]', popover: { title: "3. Thống Kê Tổng Quan", description: "Theo dõi nhanh tổng số phiếu Nháp và Đã xác nhận trên hệ thống.", side: "bottom" } },
              { targetPath: "/warehouse-stock-entries", element: 'section[class*="filterGrid"]', popover: { title: "4. Bộ Lọc Tìm Kiếm", description: "Lọc chứng từ theo Kho, Trạng thái, Mã phiếu hoặc Khoảng thời gian từ ngày - đến ngày.", side: "bottom" } },
              { targetPath: "/warehouse-stock-entries", element: 'table', popover: { title: "5. Bảng Danh Sách", description: "Khu vực hiển thị tất cả các chứng từ nhập kho đã và đang được tạo.", side: "top" } },
              { targetPath: "/warehouse-stock-entries", element: 'table tbody tr:first-child button', popover: { title: "6. Xem Chi Tiết Phiếu", description: "Nhấp vào nút 'Xem chi tiết' để mở giao diện quản lý cụ thể của một phiếu nhập cũ.", side: "left" } },
              { targetPath: "/warehouse-stock-entries", element: 'header button[class*="primary"]', popover: { title: "7. Bắt Đầu Tạo Phiếu", description: "Bấm nút 'Nhập kho' ở góc trên để chuyển sang màn hình tạo chứng từ nhập hàng mới.", side: "bottom" } },
              { targetPath: "/warehouse-stock-entry", element: 'header[class*="heroCard"]', popover: { title: "8. Thông Tin Tiêu Đề", description: "Theo dõi thông tin Kho hiện tại, Ngày nhập và Số dòng hàng (số loại phụ tùng) đang tạo.", side: "bottom" } },
              { targetPath: "/warehouse-stock-entry", element: 'select', popover: { title: "9. Chọn Kho", description: "Chọn Kho nhập hàng (mặc định hệ thống tự chọn Kho Tổng).", side: "bottom" } },
              { targetPath: "/warehouse-stock-entry", element: 'input[placeholder="Nhập tên nhà cung cấp"]', popover: { title: "10. Nhà Cung Cấp", description: "Nhập chính xác tên nhà cung cấp giao lô hàng này.", side: "bottom" } },
              { targetPath: "/warehouse-stock-entry", element: 'input[type="date"]', popover: { title: "11. Ngày Nhập", description: "Kiểm tra và chỉnh sửa ngày nhập hàng nếu cần.", side: "bottom" } },
              { targetPath: "/warehouse-stock-entry", element: 'input[placeholder*="ghi chú"]', popover: { title: "12. Ghi Chú", description: "Thêm ghi chú đặc biệt cho phiếu nhập này (nếu có).", side: "bottom" } },
              { targetPath: "/warehouse-stock-entry", element: 'input[placeholder*="keyword để tìm mã"]', popover: { title: "13. Tìm Phụ Tùng", description: "Sử dụng súng quét mã vạch hoặc nhập từ khóa để tìm, sau đó bấm Thêm vào bảng nhập.", side: "bottom" } },
              { targetPath: "/warehouse-stock-entry", element: 'table', popover: { title: "14. Bảng Nhập Hàng", description: "Xem lại danh sách các phụ tùng bạn vừa chọn.", side: "top" } },
              { targetPath: "/warehouse-stock-entry", element: 'table tbody tr:first-child input[type="number"]', popover: { title: "15. Điền Số Lượng & Giá", description: "Với mỗi mặt hàng, nhập số lượng thực nhận và Đơn giá nhập của từng phụ tùng.", side: "bottom" } },
              { targetPath: "/warehouse-stock-entry", element: 'div[class*="summaryRow"]', popover: { title: "16. Kiểm Tra Tổng Tiền", description: "Đối chiếu lại Tổng số lượng và Tổng tiền nhập xem đã khớp hoàn toàn với hóa đơn giao hay chưa.", side: "top" } },
              { targetPath: "/warehouse-stock-entry", element: 'label[class*="uploadBox"]', popover: { title: "17. Tệp Đính Kèm", description: "Kéo thả hoặc bấm để chọn tệp Ảnh chụp hóa đơn gốc/chứng từ giao hàng.", side: "bottom" } },
              { targetPath: "/warehouse-stock-entry", element: 'button[class*="ghostButton"]', popover: { title: "18. Xóa Form", description: "Bấm 'Xóa form' để làm mới toàn bộ các trường nhập liệu nếu có sai sót lớn.", side: "top" } },
              { targetPath: "/warehouse-stock-entry", element: 'button[class*="primaryButton"]', popover: { title: "19. Xác Nhận Nhập Kho", description: "Sau khi kiểm tra kỹ lưỡng, bấm 'Xác nhận nhập kho' để lưu phiếu vào hệ thống.", side: "top" } },
              { targetPath: "/warehouse-stock-entry", element: 'button[class*="backBottomButton"]', popover: { title: "20. Quay Lại", description: "Hoặc bấm nút này để hủy bỏ tạo phiếu và trở về màn hình danh sách.", side: "top" } },
              { targetPath: "/warehouse-stock-entries/1", element: 'button[class*="ghost"]', popover: { title: "21. In Phiếu Nhập Kho", description: "Tại giao diện chi tiết, bấm 'In phiếu' để xuất chứng từ bản cứng. Thao tác này thường thực hiện khi phiếu ở trạng thái Đã duyệt.", side: "bottom" } }
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
            sandboxType: "stock_issue",
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
              { element: '[data-tour-id="warehouse-management"]', popover: { title: "1. Mở Phân Hệ", description: "Bấm vào menu Kho & Phụ Tùng ở thanh bên trái.", side: "right" } },
              { element: '[data-tour-id="warehouse-stock-issues"]', popover: { title: "2. Chọn Chức Năng", description: "Chọn 'Quản lý phiếu xuất kho'.", side: "right" } },
              { targetPath: "/warehouse-stock-issues", element: 'section[class*="statsGrid"]', popover: { title: "3. Thống Kê Tổng Quan", description: "Theo dõi nhanh số lượng phiếu xuất nháp và đã xuất.", side: "bottom" } },
              { targetPath: "/warehouse-stock-issues", element: 'section[class*="filterGrid"]', popover: { title: "4. Bộ Lọc Tìm Kiếm", description: "Lọc chứng từ xuất kho theo Phiếu dịch vụ hoặc Bán lẻ.", side: "bottom" } },
              { targetPath: "/warehouse-stock-issues", element: 'table', popover: { title: "5. Bảng Danh Sách", description: "Xem lại danh sách phiếu xuất kho đã được tạo tự động.", side: "top" } },
              { targetPath: "/warehouse-stock-issues", element: 'table tbody tr:first-child', popover: { title: "6. Trạng Thái Phiếu", description: "Nháp (chờ xuất), Đã xuất, hoặc Đã hủy.", side: "right" } },
              { targetPath: "/warehouse-stock-issues", element: 'table tbody tr:first-child button', popover: { title: "7. Xem Chi Tiết Phiếu", description: "Bấm nút mắt hoặc 'Xem chi tiết' ở cột cuối cùng.", side: "left" } },
              { targetPath: "/warehouse-stock-issues/1", element: 'header[class*="heroCard"]', popover: { title: "8. Thông Tin Phiếu", description: "Xem lại ai là người nhận hàng, xuất cho xe nào, mục đích xuất.", side: "bottom" } },
              { targetPath: "/warehouse-stock-issues/1", element: 'table', popover: { title: "9. Danh Sách Phụ Tùng", description: "Kiểm tra số lượng xuất, số lượng thực tế trong kho.", side: "top" } },
              { targetPath: "/warehouse-stock-issues/1", element: 'table tbody tr:first-child td:nth-child(4)', popover: { title: "10. Cột Vị Trí Lưu Kho", description: "Hiển thị vị trí kệ để kỹ thuật viên dễ dàng lấy hàng.", side: "bottom" } },
              { targetPath: "/warehouse-stock-issues/1", element: 'table tbody tr:first-child td:last-child', popover: { title: "11. Trạng Thái Lấy Hàng", description: "Hiển thị trạng thái Đủ hàng hay Thiếu hàng.", side: "left" } },
              { targetPath: "/warehouse-stock-issues/1", element: 'button[class*="primary"]', popover: { title: "12. Xác Nhận Xuất Kho", description: "Bấm 'Xuất kho' đối với phiếu Hợp lệ.", side: "top" } },
              { targetPath: "/warehouse-stock-issues/1", element: 'button', popover: { title: "13. Quay Lại", description: "Thoát xem chi tiết và về màn hình danh sách.", side: "top" } },
              { targetPath: "/warehouse-stock-issues/1", element: 'button[class*="ghost"]', popover: { title: "14. In Phiếu Xuất Kho", description: "Bấm 'In phiếu' góc phải trên cùng để đưa chứng từ xuất hàng cho thủ kho.", side: "bottom" } }
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
            sandboxType: "stock_return",
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
              { element: '[data-tour-id="sub-warehouse"]', popover: { title: "1. Mở Phân Hệ", description: "Bấm vào menu Kho & Phụ Tùng ở thanh bên trái.", side: "right" } },
              { element: '[data-tour-id="warehouse-return-entries"]', popover: { title: "2. Chọn Chức Năng", description: "Chọn 'Quản lý phiếu trả hàng' để xử lý phụ tùng xuất dư.", side: "right" } },
              { targetPath: "/warehouse-return-entries", element: 'button[class*="primary"]', popover: { title: "3. Nút Hàng Hoàn", description: "Nhấp để tạo phiếu hoàn kho mới.", side: "bottom" } },
              { targetPath: "/warehouse-return-entry", element: 'select', popover: { title: "4. Chọn Kho Nhận", description: "Chọn kho sẽ nhận lại hàng hoàn (thường là Kho Tổng).", side: "bottom" } },
              { targetPath: "/warehouse-return-entry", element: 'input[placeholder*="phiếu"]', popover: { title: "5. Tham Chiếu Phiếu Xuất", description: "Nhập mã phiếu xuất gốc hoặc số xe để liên kết dữ liệu.", side: "bottom" } },
              { targetPath: "/warehouse-return-entry", element: 'input[type="date"]', popover: { title: "6. Ngày Hoàn Kho", description: "Thời gian kỹ thuật viên trả lại hàng.", side: "bottom" } },
              { targetPath: "/warehouse-return-entry", element: 'table', popover: { title: "7. Bảng Hàng Trả Lại", description: "Chọn phụ tùng dư và điền số lượng hoàn lại.", side: "top" } },
              { targetPath: "/warehouse-return-entry", element: 'table tbody tr:first-child input[type="number"]', popover: { title: "8. Số Lượng Hoàn", description: "Lưu ý: Không được lớn hơn số lượng đã xuất.", side: "left" } },
              { targetPath: "/warehouse-return-entry", element: 'select:last-of-type', popover: { title: "9. Tình Trạng Hàng", description: "Xác nhận hàng còn Mới (nhập lại kho) hay Hư hỏng (chờ xử lý).", side: "left" } },
              { targetPath: "/warehouse-return-entry", element: 'input[placeholder*="lý do"]', popover: { title: "10. Lý Do Hoàn", description: "Ghi rõ lý do (VD: Khách đổi ý, Sai thông số).", side: "bottom" } },
              { targetPath: "/warehouse-return-entry", element: 'button[class*="primary"]', popover: { title: "11. Lưu Phiếu Hoàn", description: "Xác nhận đưa hàng trở lại tồn kho.", side: "top" } },
              { targetPath: "/warehouse-return-entries", element: 'table', popover: { title: "12. Theo Dõi Lịch Sử", description: "Xem lại lịch sử hàng hoàn để đối soát tồn kho cuối tháng.", side: "top" } },
              { targetPath: "/warehouse-return-entries/1", element: 'main, [class*="heroCard"], body', allowMissing: true, popover: { title: "13. Chi Tiết Phiếu Hoàn & In Phiếu", description: "Mở chi tiết phiếu hoàn (/warehouse-return-entries/:returnId) để kiểm tra lại nội dung và bấm 'In phiếu hoàn trả' làm chứng từ đối soát.", side: "bottom" } },
              { targetPath: "/warehouse-return-entry-from-issue/1", element: 'main, table, body', allowMissing: true, popover: { title: "14. Tạo Phiếu Hoàn từ Phiếu Xuất", description: "Cách nhanh hơn: từ một phiếu xuất kho cụ thể, tạo thẳng phiếu hoàn (/warehouse-return-entry-from-issue/:issueId) để hệ thống tự điền sẵn danh sách phụ tùng đã xuất.", side: "bottom" } }
            ]
          },
          {
            id: "2.4.4",
            number: "2.4.4.",
            title: "Quản lý kho (Tổng quan xuất nhập)",
            desc: "Xem báo cáo tổng quan về tình trạng xuất nhập tồn của toàn bộ kho hàng.",
            targetPath: "/warehouse-management",
            content: {
              overview: "Cung cấp cái nhìn toàn cảnh về lượng hàng hóa đang lưu trữ, hàng sắp hết và giá trị tồn kho hiện tại để có kế hoạch nhập hàng kịp thời.",
              steps: [
                "1. Truy cập menu 'Kho & Phụ tùng' -> 'Tổng quan kho' (/warehouse-management).",
                "2. Sử dụng bộ lọc thời gian hoặc theo danh mục phụ tùng để xem số liệu xuất/nhập/tồn cụ thể.",
                "3. Xem biểu đồ cảnh báo hàng tồn kho dưới định mức an toàn.",
                "4. Xuất báo cáo Excel nếu cần gửi cho Quản lý chung."
              ]
            },
            sandboxType: "warehouse_management",
            quiz: {
              question: "Để xem cảnh báo hàng tồn kho dưới định mức an toàn, bạn vào trang nào?",
              options: [
                "Trang Tổng quan kho (/warehouse-management)",
                "Trang Tạo lịch hẹn",
                "Trang Bán hàng nhanh",
                "Trang Chấm công QR"
              ],
              correctIndex: 0
            },
                                    tourSteps: [
              { element: '[data-tour-id="sub-warehouse"]', popover: { title: "1. Mở Phân Hệ", description: "Bấm vào menu Kho & Phụ Tùng.", side: "right" } },
              { element: '[data-tour-id="warehouse-management"]', popover: { title: "2. Chọn Chức Năng", description: "Chọn 'Quản lý kho' (tổng quan tồn kho).", side: "right" } },
              { targetPath: "/warehouse-management", element: '#filter-warehouse', popover: { title: "3. Lọc Theo Kho", description: "Xem tồn kho của Kho Tổng, Cửa hàng hoặc Tủ trưng bày.", side: "bottom" } },
              { targetPath: "/warehouse-management", element: 'input[placeholder*="Tìm"]', popover: { title: "4. Thanh Tìm Kiếm", description: "Tìm nhanh theo mã vạch (SKU) hoặc tên phụ tùng.", side: "bottom" } },
              { targetPath: "/warehouse-management", element: 'table', popover: { title: "5. Bảng Tồn Kho", description: "Xem số lượng tồn kho.", side: "top" } },
              { targetPath: "/warehouse-management", element: 'table thead tr th', popover: { title: "6. Cột Tồn Khả Dụng", description: "Số lượng có thể bán ngay.", side: "bottom" } },
              { targetPath: "/warehouse-management", element: 'table tbody tr:first-child button[class*="view-btn"], table tbody tr:first-child button', popover: { title: "7. Thẻ Kho (Bin Card)", description: "Bấm Xem chi tiết để theo dõi biến động.", side: "left" } },
              { targetPath: "/warehouse-management", element: 'div[class*="modal"]', popover: { title: "8. Chi Tiết Giao Dịch", description: "Theo dõi mọi biến động tăng/giảm của phụ tùng.", side: "top" } },
              { targetPath: "/warehouse-management", element: 'button[class*="ghost-button"]', popover: { title: "9. Xuất Báo Cáo", description: "Bấm 'Xuất Excel' để tải báo cáo tồn kho.", side: "bottom" } }
            ]
          },
          {
            id: "2.4.5",
            number: "2.4.5.",
            title: "Cấu hình vị trí kho",
            desc: "Thiết lập và quản lý sơ đồ, vị trí (kệ, tầng, dãy) để tối ưu việc tìm kiếm và xếp dỡ phụ tùng trong kho.",
            targetPath: "/warehouse-config",
            content: {
              overview: "Tổ chức lại không gian kho bãi khoa học giúp tiết kiệm thời gian lấy hàng và quản lý hàng hóa theo từng khu vực chuyên biệt.",
              steps: [
                "1. Truy cập menu 'Kho & Phụ tùng' -> 'Cấu hình vị trí kho' (/warehouse-config).",
                "2. Bấm 'Thêm vị trí mới' (Ví dụ: Kệ A - Tầng 1 - Dãy Lốp).",
                "3. Liên kết phụ tùng hoặc danh mục phụ tùng cụ thể với vị trí vừa tạo.",
                "4. Nhấn 'Lưu vị trí' để áp dụng. Sơ đồ kho sẽ được cập nhật."
              ]
            },
            sandboxType: "warehouse_config",
            quiz: {
              question: "Mục đích của việc Cấu hình vị trí kho là gì?",
              options: [
                "Tổ chức không gian kho bãi khoa học giúp tiết kiệm thời gian lấy hàng",
                "Để bán xe ô tô mới",
                "Để tính lương nhân viên",
                "Để đăng Facebook"
              ],
              correctIndex: 0
            },
                        tourSteps: [
              { element: '[data-tour-id="warehouse-management"]', popover: { title: "1. Mở Phân Hệ", description: "Bấm vào Kho & Phụ Tùng.", side: "right" } },
              { element: '[data-tour-id="warehouse-config"]', popover: { title: "2. Chọn Chức Năng", description: "Chọn 'Cấu hình kho & vị trí'.", side: "right" } },
              { targetPath: "/warehouse-config", element: 'button[class*="primary"]', popover: { title: "3. Nút Thêm Mới", description: "Bấm '+ Thêm kho/vị trí' để tạo khu vực lưu trữ mới.", side: "bottom" } },
              { targetPath: "/warehouse-config", element: 'input[placeholder*="Tên kho"]', popover: { title: "4. Tên Khu Vực", description: "Nhập tên (VD: Kệ lốp du lịch, Tủ dầu nhớt).", side: "bottom" } },
              { targetPath: "/warehouse-config", element: 'input[placeholder*="Mã vị trí"]', popover: { title: "5. Mã Vị Trí", description: "Nhập mã gợi nhớ (VD: K1-T2).", side: "bottom" } },
              { targetPath: "/warehouse-config", element: 'input[type="checkbox"]', popover: { title: "6. Trạng Thái Hoạt Động", description: "Bật/Tắt để cho phép hệ thống sử dụng vị trí này.", side: "right" } },
              { targetPath: "/warehouse-config", element: 'button[class*="primary"]:last-of-type', popover: { title: "7. Lưu Cấu Hình", description: "Bấm 'Lưu' để hệ thống ghi nhận sơ đồ kho.", side: "top" } }
            ]
          },
          {
            id: "2.4.6",
            number: "2.4.6.",
            title: "Cấu hình giá bán theo kho",
            desc: "Cập nhật và điều chỉnh mức giá bán cho các sản phẩm/phụ tùng tại kho theo từng thời điểm.",
            targetPath: "/warehouse-pricing",
            content: {
              overview: "Đảm bảo giá bán luôn chính xác và đồng bộ trên toàn hệ thống, phục vụ cho việc báo giá của Cố vấn dịch vụ và thanh toán của Kế toán.",
              steps: [
                "1. Truy cập menu 'Kho & Phụ tùng' -> 'Cấu hình giá bán' (/warehouse-pricing).",
                "2. Tìm kiếm mã phụ tùng cần cập nhật giá.",
                "3. Nhập mức giá bán mới hoặc tỷ lệ lợi nhuận mong muốn so với giá vốn (lô nhập).",
                "4. Nhấn 'Cập nhật giá'. Giá mới sẽ ngay lập tức có hiệu lực cho các báo giá mới."
              ]
            },
            sandboxType: "warehouse_pricing",
            quiz: {
              question: "Khi cập nhật giá bán tại trang Cấu hình giá bán, giá mới sẽ có hiệu lực ở đâu?",
              options: [
                "Ngay lập tức trên toàn hệ thống và các báo giá mới",
                "Chỉ áp dụng cho các báo giá cũ",
                "Không có hiệu lực",
                "Phải đợi 24h mới có hiệu lực"
              ],
              correctIndex: 0
            },
                        tourSteps: [
              { element: '[data-tour-id="warehouse-management"]', popover: { title: "1. Mở Phân Hệ", description: "Bấm vào Kho & Phụ Tùng.", side: "right" } },
              { element: '[data-tour-id="warehouse-pricing"]', popover: { title: "2. Chọn Chức Năng", description: "Chọn 'Cấu hình giá linh kiện'.", side: "right" } },
              { targetPath: "/warehouse-pricing", element: 'button[class*="primary"]', popover: { title: "3. Nút Thiết Lập Giá", description: "Bấm 'Cập nhật giá bán' để điều chỉnh giá.", side: "bottom" } },
              { targetPath: "/warehouse-pricing", element: 'table tbody tr:first-child input[type="number"]', popover: { title: "4. Điều Chỉnh Giá", description: "Nhập mức giá bán lẻ mới cho phụ tùng.", side: "bottom" } },
              { targetPath: "/warehouse-pricing", element: 'table tbody tr:first-child input[type="number"]:last-of-type', popover: { title: "5. Giá Đại Lý", description: "Thiết lập giá chiết khấu riêng cho khách hàng sỉ/garage.", side: "bottom" } },
              { targetPath: "/warehouse-pricing", element: 'button[class*="primary"]:last-of-type', popover: { title: "6. Áp Dụng Thay Đổi", description: "Lưu lại để đồng bộ giá bán trên toàn hệ thống.", side: "top" } }
            ]
          },
          {
            id: "2.4.7",
            number: "2.4.7.",
            title: "Danh mục phụ tùng",
            desc: "Quản lý danh mục sản phẩm, nhóm hàng (lốp, ắc quy, dầu nhớt) hệ thống và thiết lập định mức tồn kho an toàn.",
            targetPath: "/part-management",
            content: {
              overview: "Tạo mới hoặc chỉnh sửa thông tin sản phẩm cốt lõi giúp hệ thống phân loại và quản lý hàng hóa thống nhất.",
              steps: [
                "1. Truy cập menu 'Kho & Phụ tùng' -> 'Danh mục phụ tùng' (/part-management).",
                "2. Bấm 'Thêm phụ tùng mới' để khai báo hàng hóa chưa có trong hệ thống.",
                "3. Nhập Mã SKU, Tên phụ tùng, Đơn vị tính và Phân loại hàng.",
                "4. Thiết lập định mức tồn kho an toàn để hệ thống tự động cảnh báo khi sắp hết hàng.",
                "5. Nhấn 'Lưu thông tin'."
              ]
            },
            sandboxType: "part_management",
            quiz: {
              question: "Thiết lập gì giúp hệ thống tự động cảnh báo khi sắp hết hàng?",
              options: [
                "Định mức tồn kho an toàn",
                "Giá vốn",
                "Số điện thoại nhà cung cấp",
                "Số tài khoản ngân hàng"
              ],
              correctIndex: 0
            },
                                    tourSteps: [
              { element: '[data-tour-id="sub-warehouse"]', popover: { title: "1. Mở Phân Hệ", description: "Truy cập menu 'Kho & Phụ tùng'.", side: "right" } },
              { element: '[data-tour-id="part-management"]', popover: { title: "2. Chọn Danh Mục", description: "Chọn 'Quản lý phụ tùng'.", side: "right" } },
              { targetPath: "/part-management", element: 'button[class*="primary"]', popover: { title: "3. Tạo Phụ Tùng Mới", description: "Bấm '+ Thêm phụ tùng' để đăng ký mã hàng lên hệ thống.", side: "bottom" } },
              { targetPath: "/part-management/create-product", element: 'input[name="sku"], input[placeholder*="SKU"]', popover: { title: "4. Mã SKU/Barcode", description: "Điền hoặc dùng súng quét mã vạch để nhập SKU.", side: "bottom" } },
              { targetPath: "/part-management/create-product", element: 'input[name="itemName"], input[placeholder*="Tên"]', popover: { title: "5. Tên Phụ Tùng", description: "Ghi rõ kích cỡ, thương hiệu, loại gai (đối với lốp).", side: "bottom" } },
              { targetPath: "/part-management/create-product", element: 'select', popover: { title: "6. Phân Loại Danh Mục", description: "Đưa vào nhóm tương ứng.", side: "bottom" } },
              { targetPath: "/part-management/create-product", element: 'input[name="unit"], input[placeholder*="Đơn vị"]', popover: { title: "7. Đơn Vị Tính", description: "Quả, Cái, Lít, Chai...", side: "bottom" } },
              { targetPath: "/part-management/create-product", element: 'input[type="number"]', popover: { title: "8. Giá Vốn Tham Khảo", description: "Giá nhập hàng dự kiến để tính lợi nhuận gộp.", side: "bottom" } },
              { targetPath: "/part-management/create-product", element: 'button[class*="primary"]:last-of-type', popover: { title: "9. Lưu Dữ Liệu", description: "Lưu danh mục để có thể bắt đầu làm phiếu nhập kho.", side: "top" } }
            ]
          },
          {
            id: "2.4.8",
            number: "2.4.8.",
            title: "Kho hàng lỗi (Tồn kho hàng hỏng)",
            desc: "Theo dõi và xử lý các phụ tùng lỗi/hư hỏng đang được tách riêng khỏi tồn kho khả dụng (/warehouse-defective-inventory).",
            targetPath: "/warehouse-defective-inventory",
            content: {
              overview: "Phụ tùng phát hiện lỗi khi nhập hàng hoặc hoàn trả từ xưởng sẽ được chuyển vào Kho hàng lỗi (/warehouse-defective-inventory) thay vì cộng vào tồn kho khả dụng. Việc tách riêng này đảm bảo hàng lỗi không bị bán nhầm cho khách và có căn cứ đối chiếu khi trả hàng lại cho Nhà cung cấp.",
              steps: [
                "1. Truy cập menu 'Kho & Phụ tùng' -> 'Kho hàng lỗi' (/warehouse-defective-inventory).",
                "2. Tra cứu theo mã SKU hoặc tên phụ tùng trên thanh tìm kiếm để tìm mặt hàng lỗi cần xử lý.",
                "3. Xem chi tiết số lượng lỗi, lô nhập gốc và lý do ghi nhận hàng lỗi.",
                "4. Đối chiếu với phiếu nhập/phiếu hoàn trả liên quan để xác định trách nhiệm (lỗi Nhà cung cấp hay lỗi trong quá trình thi công).",
                "5. Lập hồ sơ trả hàng lại Nhà cung cấp hoặc chuyển sang Báo cáo lỗi & Trách nhiệm (/warehouse-defect-report) để Quản lý xử lý."
              ]
            },
            sandboxType: "defective_inventory",
            quiz: {
              question: "Vì sao phụ tùng lỗi được tách riêng vào Kho hàng lỗi thay vì để chung tồn kho?",
              options: [
                "Để hàng lỗi không bị bán/xuất nhầm cho khách và có căn cứ đối chiếu khi trả Nhà cung cấp",
                "Để tính lương cho thủ kho",
                "Để hiển thị đẹp hơn trên báo cáo",
                "Không có lý do gì đặc biệt"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-warehouse"]', popover: { title: "1. Mở Phân hệ Kho", description: "Bấm vào menu 'Kho & Phụ tùng' ở thanh bên trái.", side: "right" } },
              { element: '[data-tour-id="warehouse-defective-inventory"]', popover: { title: "2. Chọn Kho hàng lỗi", description: "Nhấp chọn 'Kho hàng lỗi' để mở danh sách tồn kho hàng hỏng (/warehouse-defective-inventory).", side: "right" } },
              { targetPath: "/warehouse-defective-inventory", element: '[class*="header"]', popover: { title: "3. Tổng quan Kho hàng lỗi", description: "Xem tổng quan số lượng và giá trị phụ tùng đang bị giữ lại ở trạng thái hàng lỗi.", side: "bottom" } },
              { targetPath: "/warehouse-defective-inventory", element: '[class*="searchBar"]', popover: { title: "4. Tra cứu Phụ tùng lỗi", description: "Nhập mã SKU hoặc tên phụ tùng để tìm nhanh mặt hàng lỗi cần xử lý.", side: "bottom" } },
              { targetPath: "/warehouse-defective-inventory", element: 'table, [class*="card"]', popover: { title: "5. Danh sách Hàng lỗi", description: "Xem số lượng lỗi, lô nhập gốc và nhãn phân loại hàng lỗi (badgeDefective) của từng mặt hàng.", side: "top" } },
              { targetPath: "/warehouse-defective-inventory", element: '[class*="formGrid"], [class*="field"]', allowMissing: true, popover: { title: "6. Xử lý Hàng lỗi", description: "Ghi nhận hướng xử lý: trả lại Nhà cung cấp, hủy bỏ hoặc chuyển sang Báo cáo lỗi & Trách nhiệm để Quản lý quyết định.", side: "bottom" } }
            ]
          },
          {
            id: "2.4.9",
            number: "2.4.9.",
            title: "Báo cáo lỗi kho & Quy trách nhiệm",
            desc: "Lập báo cáo các sai lệch, thất thoát, hàng hỏng trong kho và xác định trách nhiệm xử lý (/warehouse-defect-report).",
            targetPath: "/warehouse-defect-report",
            content: {
              overview: "Trang Báo cáo lỗi & Trách nhiệm (/warehouse-defect-report) dành cho Quản lý tổng hợp các sự cố kho: chênh lệch kiểm kê, phụ tùng hỏng trong quá trình lưu trữ/thi công, thất thoát vật tư. Mỗi báo cáo cần xác định rõ nguyên nhân và bộ phận/cá nhân chịu trách nhiệm để có căn cứ xử lý và cải tiến quy trình.",
              steps: [
                "1. Truy cập menu 'Kho & Phụ tùng' -> 'Báo cáo lỗi & Trách nhiệm' (/warehouse-defect-report).",
                "2. Chọn khoảng thời gian và kho cần lập báo cáo sự cố.",
                "3. Ghi nhận chi tiết sự cố: mã phụ tùng, số lượng chênh lệch/hỏng và mô tả nguyên nhân.",
                "4. Xác định bộ phận hoặc cá nhân chịu trách nhiệm (Nhà cung cấp, Thủ kho, Kỹ thuật viên thi công...).",
                "5. Lưu báo cáo để làm căn cứ đối soát kho cuối kỳ và cải tiến quy trình vận hành."
              ]
            },
            sandboxType: "defect_report",
            quiz: {
              question: "Nội dung bắt buộc phải làm rõ trong một Báo cáo lỗi kho là gì?",
              options: [
                "Nguyên nhân sự cố và bộ phận/cá nhân chịu trách nhiệm",
                "Số điện thoại của khách hàng gần nhất",
                "Lịch nghỉ phép của nhân viên",
                "Giá cổ phiếu của nhà cung cấp"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-warehouse"]', popover: { title: "1. Mở Phân hệ Kho", description: "Bấm vào menu 'Kho & Phụ tùng' ở thanh bên trái.", side: "right" } },
              { element: '[data-tour-id="warehouse-defect-report"]', popover: { title: "2. Chọn Báo cáo lỗi & Trách nhiệm", description: "Nhấp chọn 'Báo cáo lỗi & Trách nhiệm' để mở màn hình lập báo cáo sự cố kho (/warehouse-defect-report).", side: "right" } },
              { targetPath: "/warehouse-defect-report", element: '[class*="header"]', popover: { title: "3. Tiêu đề Báo cáo", description: "Màn hình tổng hợp các sai lệch kiểm kê, phụ tùng hỏng và thất thoát vật tư trong kho.", side: "bottom" } },
              { targetPath: "/warehouse-defect-report", element: '.ui-field', allowMissing: true, popover: { title: "4. Chọn Kỳ báo cáo & Kho", description: "Chọn khoảng thời gian và kho cần lập báo cáo để hệ thống tổng hợp đúng dữ liệu sự cố.", side: "bottom" } },
              { targetPath: "/warehouse-defect-report", element: 'table', allowMissing: true, popover: { title: "5. Bảng Chi tiết Sự cố", description: "Ghi nhận mã phụ tùng, số lượng chênh lệch/hỏng, nguyên nhân và bộ phận chịu trách nhiệm.", side: "top" } },
              { targetPath: "/warehouse-defect-report", element: '.ui-btn--primary', allowMissing: true, popover: { title: "6. Lưu Báo cáo", description: "Bấm lưu để chốt báo cáo làm căn cứ đối soát kho cuối kỳ và cải tiến quy trình vận hành.", side: "top" } }
            ]
          },
          {
            id: "2.4.10",
            number: "2.4.10.",
            title: "Cấu hình Markup giá mặc định",
            desc: "Thiết lập tỷ lệ markup (lợi nhuận) mặc định áp dụng khi phụ tùng chưa có giá bán cấu hình riêng (/warehouse-fallback-pricing).",
            targetPath: "/warehouse-fallback-pricing",
            content: {
              overview: "Không phải phụ tùng nào cũng được cấu hình giá bán riêng tại /warehouse-pricing. Trang Markup mặc định (/warehouse-fallback-pricing) thiết lập tỷ lệ lợi nhuận dự phòng: khi một phụ tùng chưa có giá bán riêng, hệ thống tự lấy giá vốn của lô nhập nhân với tỷ lệ markup này để ra giá bán - đảm bảo không bao giờ báo giá thiếu hoặc bán dưới giá vốn.",
              steps: [
                "1. Truy cập menu 'Kho & Phụ tùng' -> 'Markup mặc định' (/warehouse-fallback-pricing).",
                "2. Dùng bộ lọc theo nhóm hàng/danh mục để chọn phạm vi cần thiết lập markup.",
                "3. Nhập tỷ lệ markup (%) mong muốn trên giá vốn cho từng nhóm phụ tùng.",
                "4. Lưu cấu hình - hệ thống sẽ áp dụng ngay cho các phụ tùng chưa có giá bán riêng.",
                "5. Đối chiếu lại tại /warehouse-pricing: phụ tùng nào cần giá đặc thù thì cấu hình giá riêng để ghi đè markup mặc định."
              ]
            },
            sandboxType: "fallback_markup",
            quiz: {
              question: "Markup mặc định (/warehouse-fallback-pricing) được áp dụng trong trường hợp nào?",
              options: [
                "Khi phụ tùng chưa được cấu hình giá bán riêng - hệ thống lấy giá vốn nhân tỷ lệ markup",
                "Áp dụng cho mọi phụ tùng, ghi đè cả giá bán riêng",
                "Chỉ áp dụng cho dịch vụ nhân công",
                "Chỉ áp dụng khi khách hàng là đại lý"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-warehouse"]', popover: { title: "1. Mở Phân hệ Kho", description: "Bấm vào menu 'Kho & Phụ tùng' ở thanh bên trái.", side: "right" } },
              { element: '[data-tour-id="warehouse-fallback-pricing"]', popover: { title: "2. Chọn Markup mặc định", description: "Nhấp chọn 'Markup mặc định' để mở màn hình cấu hình tỷ lệ lợi nhuận dự phòng (/warehouse-fallback-pricing).", side: "right" } },
              { targetPath: "/warehouse-fallback-pricing", element: '[class*="headerLeft"]', popover: { title: "3. Tổng quan Cấu hình", description: "Màn hình thiết lập tỷ lệ markup áp dụng khi phụ tùng chưa có giá bán riêng.", side: "bottom" } },
              { targetPath: "/warehouse-fallback-pricing", element: '[class*="filters"], [class*="filterGroup"]', popover: { title: "4. Lọc Nhóm hàng", description: "Dùng bộ lọc theo kho hoặc nhóm hàng để chọn đúng phạm vi phụ tùng cần thiết lập.", side: "bottom" } },
              { targetPath: "/warehouse-fallback-pricing", element: 'table', popover: { title: "5. Bảng Tỷ lệ Markup", description: "Nhập tỷ lệ markup (%) trên giá vốn cho từng nhóm phụ tùng trong bảng.", side: "top" } },
              { targetPath: "/warehouse-fallback-pricing", element: '[class*="form"], [class*="field"]', allowMissing: true, popover: { title: "6. Nhập Tỷ lệ Lợi nhuận", description: "Nhập % markup mong muốn - hệ thống dùng công thức: Giá bán = Giá vốn lô nhập x (1 + markup%).", side: "bottom" } },
              { targetPath: "/warehouse-fallback-pricing", element: 'button[class*="primary"], [class*="ghostBtn"]', allowMissing: true, popover: { title: "7. Lưu Cấu hình", description: "Bấm lưu để áp dụng ngay cho các phụ tùng chưa có giá bán riêng trên toàn hệ thống.", side: "top" } }
            ]
          },
          {
            id: "2.4.11",
            number: "2.4.11.",
            title: "Nhập kho hàng loạt từ Excel",
            desc: "Nhập nhanh danh sách phụ tùng/tồn kho số lượng lớn bằng file Excel thay vì gõ tay từng dòng (/warehouse-excel-import).",
            targetPath: "/warehouse-excel-import",
            content: {
              overview: "Khi nhận lô hàng lớn từ Nhà cung cấp hoặc khởi tạo tồn kho ban đầu, chức năng Nhập Excel (/warehouse-excel-import) cho phép tải lên file bảng tính chứa hàng trăm dòng phụ tùng. Hệ thống kiểm tra hợp lệ từng dòng, đánh dấu các dòng lỗi để sửa trực tiếp trước khi xác nhận ghi vào kho.",
              steps: [
                "1. Truy cập trang Nhập kho từ Excel (/warehouse-excel-import).",
                "2. Tải file Excel mẫu và điền dữ liệu theo đúng cấu trúc cột (SKU, tên phụ tùng, số lượng, đơn giá, kho nhận...).",
                "3. Kéo thả hoặc bấm chọn file Excel đã điền vào vùng tải lên (drop zone).",
                "4. Đối chiếu bảng xem trước: hệ thống đánh dấu các dòng lỗi (sai SKU, thiếu số lượng) - bấm sửa trực tiếp trên dòng hoặc xóa dòng không hợp lệ.",
                "5. Bấm 'Xác nhận nhập' để ghi toàn bộ dữ liệu hợp lệ vào kho và sinh phiếu nhập tương ứng."
              ]
            },
            sandboxType: "excel_import",
            quiz: {
              question: "Trước khi bấm xác nhận nhập Excel, việc quan trọng nhất cần làm là gì?",
              options: [
                "Đối chiếu bảng xem trước và sửa/xóa các dòng bị hệ thống đánh dấu lỗi",
                "Xóa toàn bộ dữ liệu cũ trong kho",
                "Đổi mật khẩu tài khoản",
                "In file Excel ra giấy"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-warehouse"]', popover: { title: "1. Mở Phân hệ Kho", description: "Bấm vào menu 'Kho & Phụ tùng' ở thanh bên trái.", side: "right" } },
              { targetPath: "/warehouse-excel-import", element: '[class*="container"]', popover: { title: "2. Trang Nhập kho từ Excel", description: "Màn hình nhập hàng loạt phụ tùng/tồn kho bằng file bảng tính (/warehouse-excel-import).", side: "bottom" } },
              { targetPath: "/warehouse-excel-import", element: '[class*="dropZone"]', popover: { title: "3. Vùng Tải file lên", description: "Kéo thả hoặc bấm chọn file Excel đã điền theo đúng cấu trúc cột mẫu của hệ thống.", side: "bottom" } },
              { targetPath: "/warehouse-excel-import", element: 'table', allowMissing: true, popover: { title: "4. Bảng Xem trước Dữ liệu", description: "Đối chiếu toàn bộ dòng dữ liệu đọc được từ file trước khi ghi vào kho.", side: "top" } },
              { targetPath: "/warehouse-excel-import", element: '[class*="errorCell"], [class*="errorAlert"]', allowMissing: true, popover: { title: "5. Dòng Dữ liệu Lỗi", description: "Hệ thống tô đỏ các dòng sai (sai SKU, thiếu số lượng). Bấm 'Sửa' để chỉnh trực tiếp hoặc 'Xóa' dòng không hợp lệ.", side: "bottom" } },
              { targetPath: "/warehouse-excel-import", element: '[class*="confirmBtn"]', allowMissing: true, popover: { title: "6. Xác nhận Nhập kho", description: "Bấm 'Xác nhận nhập' để ghi toàn bộ dữ liệu hợp lệ vào kho và sinh phiếu nhập tương ứng.", side: "top" } }
            ]
          },
          {
            id: "2.4.12",
            number: "2.4.12.",
            title: "Khai báo Thuộc tính phụ tùng (Danh mục, Hãng, Dòng sản phẩm...)",
            desc: "Các màn hình chọn/khai báo thuộc tính dùng khi tạo phụ tùng: danh mục, thương hiệu, dòng sản phẩm, xuất xứ, màu sắc, thuế, đơn vị tính và thuộc tính kỹ thuật.",
            targetPath: "/part-management",
            content: {
              overview: "Khi tạo một phụ tùng mới tại /part-management/create-product, các trường thuộc tính không nhập tay tự do mà chọn từ danh mục chuẩn hóa - mỗi loại thuộc tính có một màn hình khai báo riêng. Việc chuẩn hóa này giúp toàn bộ dữ liệu phụ tùng thống nhất, tra cứu và lọc báo cáo chính xác.",
              steps: [
                "1. **Danh mục hàng** (/part-management/select-category): Phân nhóm phụ tùng (lốp, ắc quy, dầu nhớt, phụ tùng gầm...).",
                "2. **Thương hiệu** (/part-management/select-brand) và **Dòng sản phẩm** (/part-management/select-product-line): Khai báo hãng sản xuất và dòng sản phẩm (VD: Michelin - Primacy 4).",
                "3. **Xuất xứ** (/part-management/select-origin) và **Màu sắc** (/part-management/select-color): Khai báo nguồn gốc hàng hóa và màu (áp dụng với vật tư có phân biệt màu).",
                "4. **Thuế suất** (/part-management/select-tax) và **Đơn vị tính** (/part-management/select-unit): Thiết lập % VAT áp dụng và đơn vị (Quả, Cái, Lít, Chai...).",
                "5. **Thuộc tính kỹ thuật** (/part-management/select-attribute): Khai báo các thông số đặc thù như kích cỡ lốp, chỉ số tải trọng, chỉ số tốc độ.",
                "6. Sau khi khai báo đủ thuộc tính, quay lại màn hình tạo phụ tùng để chọn và lưu sản phẩm mới."
              ]
            },
            sandboxType: "part_attributes",
            quiz: {
              question: "Vì sao các thuộc tính phụ tùng (danh mục, hãng, đơn vị tính...) phải chọn từ danh mục chuẩn hóa thay vì nhập tay tự do?",
              options: [
                "Để dữ liệu phụ tùng thống nhất, giúp tra cứu và lọc báo cáo chính xác",
                "Để giao diện trông nhiều màn hình hơn",
                "Để nhân viên phải thao tác lâu hơn",
                "Không có lý do gì, chỉ là tùy chọn"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-warehouse"]', popover: { title: "1. Mở Phân hệ Kho", description: "Bấm vào menu 'Kho & Phụ tùng' ở thanh bên trái.", side: "right" } },
              { element: '[data-tour-id="part-management"]', popover: { title: "2. Chọn Quản lý phụ tùng", description: "Nhấp chọn 'Quản lý phụ tùng' để mở danh mục phụ tùng (/part-management).", side: "right" } },
              { targetPath: "/part-management/create-product", element: 'form, main, body', popover: { title: "3. Màn hình Tạo Phụ tùng", description: "Tại form tạo phụ tùng, các trường thuộc tính được chọn từ danh mục chuẩn hóa thay vì nhập tay tự do.", side: "bottom" } },
              { targetPath: "/part-management/select-category", element: 'main, body', allowMissing: true, popover: { title: "4. Danh mục hàng (select-category)", description: "Phân nhóm phụ tùng theo danh mục: lốp, ắc quy, dầu nhớt, phụ tùng gầm...", side: "bottom" } },
              { targetPath: "/part-management/select-brand", element: 'main, body', allowMissing: true, popover: { title: "5. Thương hiệu (select-brand)", description: "Khai báo hãng sản xuất của phụ tùng (VD: Michelin, Bosch, Castrol).", side: "bottom" } },
              { targetPath: "/part-management/select-product-line", element: 'main, body', allowMissing: true, popover: { title: "6. Dòng sản phẩm (select-product-line)", description: "Khai báo dòng sản phẩm cụ thể của hãng (VD: Michelin Primacy 4, Michelin Pilot Sport).", side: "bottom" } },
              { targetPath: "/part-management/select-origin", element: 'main, body', allowMissing: true, popover: { title: "7. Xuất xứ (select-origin)", description: "Khai báo nguồn gốc xuất xứ hàng hóa phục vụ đối chiếu chứng từ nhập khẩu.", side: "bottom" } },
              { targetPath: "/part-management/select-color", element: 'main, body', allowMissing: true, popover: { title: "8. Màu sắc (select-color)", description: "Khai báo màu sắc, áp dụng với các vật tư có phân biệt theo màu.", side: "bottom" } },
              { targetPath: "/part-management/select-tax", element: 'main, body', allowMissing: true, popover: { title: "9. Thuế suất (select-tax)", description: "Thiết lập % thuế VAT áp dụng cho nhóm hàng - dùng khi tính tiền và xuất hóa đơn GTGT.", side: "bottom" } },
              { targetPath: "/part-management/select-unit", element: 'main, body', allowMissing: true, popover: { title: "10. Đơn vị tính (select-unit)", description: "Khai báo đơn vị tính: Quả, Cái, Lít, Chai... quyết định cách quy đổi số lượng tồn kho.", side: "bottom" } },
              { targetPath: "/part-management/select-attribute", element: 'main, body', allowMissing: true, popover: { title: "11. Thuộc tính kỹ thuật (select-attribute)", description: "Khai báo thông số đặc thù: kích cỡ lốp, chỉ số tải trọng, chỉ số tốc độ - phục vụ tra cứu phụ tùng theo xe.", side: "bottom" } }
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
              { element: '[data-tour-id="sub-service"]', popover: { title: "1. Mở Phân Hệ", description: "Truy cập menu 'Dịch vụ & Xưởng'.", side: "right" } },
              { element: '[data-tour-id="service-ticket-management"]', popover: { title: "2. Chọn Phiếu Dịch Vụ", description: "Truy cập 'Phiếu dịch vụ' để lấy danh sách cần thanh toán.", side: "right" } },
              { targetPath: "/service-ticket-management", element: 'select', popover: { title: "3. Chọn Trạng Thái", description: "Lọc các Phiếu dịch vụ ở trạng thái chờ thu tiền.", side: "bottom" } },
              { targetPath: "/service-ticket-management", element: 'table', popover: { title: "4. Bảng Chờ Thu Tiền", description: "Danh sách xe đang đợi xuất bến.", side: "top" } },
              { targetPath: "/service-ticket-management", element: 'table tbody tr:first-child button', popover: { title: "5. Nhấn Xem Chi Tiết", description: "Bấm vào phiếu để đối soát các hạng mục dịch vụ.", side: "left" } },
              { targetPath: "/service-ticket/1", element: 'table', popover: { title: "6. Kiểm Tra Lại Hạng Mục", description: "Thu ngân đối chiếu công việc KTV đã làm và phụ tùng đã thay.", side: "top" } },
              { targetPath: "/service-ticket/1", element: 'button[class*="primary"]', popover: { title: "7. Nút Thanh Toán", description: "Bấm 'Thanh toán' để chọn hình thức thu tiền.", side: "top" } },
              { targetPath: "/service-ticket/1", element: 'button[class*="ghost"]', popover: { title: "8. In Phiếu Quyết Toán", description: "In hóa đơn chi tiết cho khách hàng.", side: "bottom" } }
            ]
          },
          {
            id: "2.5.2",
            number: "2.5.2.",
            title: "Bán hàng nhanh (Bán lẻ phụ tùng)",
            desc: "Bán trực tiếp phụ tùng/linh kiện cho Khách lẻ, Đại lý hoặc Garage khác mà không cần qua quy trình xe vào xưởng.",
            targetPath: "/parts-sales",
            content: {
              overview: "Thực hiện xuất bán nhanh các sản phẩm như lốp, dầu nhớt, ắc quy mua mang về, giúp đơn giản hóa quy trình và ghi nhận doanh thu tức thì.",
              steps: [
                "1. Truy cập menu 'Thu ngân & Kế toán' -> 'Bán hàng nhanh' (/parts-sales).",
                "2. Chọn Khách hàng (hệ thống tự động tính chiết khấu hạng khách).",
                "3. Chọn phụ tùng từ kho khả dụng. Hệ thống tự động tính tổng tiền và VAT.",
                "4. Lựa chọn áp dụng chương trình khuyến mãi/voucher nếu có.",
                "5. Nhấp 'Thanh toán' để tạo hóa đơn bán lẻ và đồng thời xuất kho phụ tùng."
              ]
            },
            sandboxType: "quick_sale",
            quiz: {
              question: "Khi sử dụng Bán hàng nhanh, điều gì xảy ra khi nhấn Thanh toán?",
              options: [
                "Tạo hóa đơn bán lẻ và đồng thời xuất kho phụ tùng",
                "Tạo báo giá gửi cho khách",
                "Chuyển xe vào hàng chờ",
                "Không có gì xảy ra"
              ],
              correctIndex: 0
            },
                        tourSteps: [
              { element: '[data-tour-id="revenue-management"]', popover: { title: "1. Mở Phân Hệ", description: "Bấm vào menu Thu ngân & Kế toán ở thanh bên trái.", side: "right" } },
              { element: '[data-tour-id="parts-sales"]', popover: { title: "2. Chọn Chức Năng", description: "Chọn 'Bán hàng nhanh' để tạo phiếu bán lẻ phụ tùng.", side: "right" } },
              { targetPath: "/parts-sales", element: 'input[placeholder="Tra cứu khách hàng..."]', popover: { title: "3. Khách Hàng", description: "Nhập số điện thoại hoặc tên khách hàng để hệ thống tự động điền thông tin.", side: "bottom" } },
              { targetPath: "/parts-sales", element: 'input[name="customerName"]', popover: { title: "4. Tên Khách Hàng", description: "Điền hoặc kiểm tra lại tên khách hàng.", side: "bottom" } },
              { targetPath: "/parts-sales", element: 'input[name="customerPhone"]', popover: { title: "5. Số Điện Thoại", description: "Điền hoặc kiểm tra lại số điện thoại khách hàng.", side: "bottom" } },
              { targetPath: "/parts-sales", element: 'input[name="vehiclePlate"]', popover: { title: "6. Biển Số Xe", description: "Tùy chọn: Nhập biển số xe nếu có.", side: "bottom" } },
              { targetPath: "/parts-sales", element: 'input[placeholder*="Tìm phụ tùng"]', popover: { title: "7. Tìm Phụ Tùng", description: "Nhập mã SKU hoặc tên lốp, bình ắc quy, dầu nhớt... cần bán.", side: "bottom" } },
              { targetPath: "/parts-sales", element: 'table', popover: { title: "8. Bảng Bán Hàng", description: "Hiển thị danh sách phụ tùng đã chọn để bán lẻ.", side: "top" } },
              { targetPath: "/parts-sales", element: 'table tbody tr:first-child input[type="number"]', popover: { title: "9. Số Lượng", description: "Nhập số lượng bán thực tế. Lưu ý Tồn kho khả dụng báo bên dưới.", side: "bottom" } },
              { targetPath: "/parts-sales", element: 'table tbody tr:first-child td:nth-child(8) input', popover: { title: "10. Giảm Giá Nhập Tay", description: "Kế toán có thể nhập số tiền hoặc % giảm giá thêm nếu được quản lý cho phép.", side: "bottom" } },
              { targetPath: "/parts-sales", element: 'button[class*="summaryButton"]', popover: { title: "11. Thêm Chi Phí Khác", description: "Nhấn để cộng thêm phí vận chuyển, công tháo lắp ngoài nếu có.", side: "top" } },
              { targetPath: "/parts-sales", element: 'div[class*="summaryRow"]', popover: { title: "12. Kiểm Tra Tổng Tiền", description: "Đối chiếu lại số tiền Cần thanh toán sau khi trừ chiết khấu.", side: "top" } },
              { targetPath: "/parts-sales", element: 'button[class*="actionButton"]:nth-of-type(1)', popover: { title: "13. In Báo Giá", description: "Bấm để in báo giá tạm tính gửi khách hàng xem trước.", side: "top" } },
              { targetPath: "/parts-sales", element: 'button[class*="primaryButton"]', popover: { title: "14. Thanh Toán", description: "Bấm 'Thanh toán & Xuất kho' để xác nhận thu tiền và hoàn tất giao dịch.", side: "top" } }
            ]
          },
          {
            id: "2.5.3",
            number: "2.5.3.",
            title: "Quản lý & Đối soát doanh thu",
            desc: "Theo dõi, thống kê doanh thu theo ngày/tháng và đối soát tiền mặt, tiền chuyển khoản với các báo cáo ngân hàng.",
            targetPath: "/revenue-management",
            content: {
              overview: "Tổng hợp dòng tiền vào từ các hoạt động dịch vụ và bán lẻ, giúp Kế toán kiểm soát tài chính chính xác và ngăn ngừa thất thoát.",
              steps: [
                "1. Truy cập menu 'Báo cáo & Hệ thống' -> 'Đối soát doanh thu' (/revenue-management).",
                "2. Lọc dữ liệu báo cáo theo ngày, tuần hoặc tháng.",
                "3. Xem chi tiết tỷ trọng doanh thu theo từng phương thức thanh toán.",
                "4. Thực hiện đối soát số dư thực tế tại két và sao kê ngân hàng với số liệu ghi nhận trên phần mềm.",
                "5. Nhấn 'Xác nhận đối soát' hoặc ghi chú nếu có chênh lệch."
              ]
            },
            sandboxType: "revenue_management",
            quiz: {
              question: "Bước quan trọng nào giúp Kế toán phát hiện chênh lệch dòng tiền?",
              options: [
                "Thực hiện đối soát số dư thực tế và sao kê ngân hàng với số liệu ghi nhận",
                "In danh bạ khách hàng",
                "Thêm mới danh mục phụ tùng",
                "Đăng xuất khỏi hệ thống"
              ],
              correctIndex: 0
            },
                        tourSteps: [
              { element: '[data-tour-id="revenue-management"]', popover: { title: "1. Mở Phân Hệ", description: "Truy cập 'Thu ngân & Kế toán' -> 'Quản lý Doanh thu' (/revenue-management).", side: "right" } },
              { targetPath: "/revenue-management", element: 'section[class*="statsGrid"]', popover: { title: "2. Tổng Quan Trong Ngày", description: "Hiển thị Tổng doanh thu, Số lượng phiếu, Lãi gộp dự tính.", side: "bottom" } },
              { targetPath: "/revenue-management", element: 'section[class*="statsGrid"] article:nth-child(2)', popover: { title: "3. Tỷ Trọng Thanh Toán", description: "Phân loại bao nhiêu % là Tiền mặt, Chuyển khoản, Thẻ.", side: "bottom" } },
              { targetPath: "/revenue-management", element: 'input[type="date"]', popover: { title: "4. Bộ Lọc Thời Gian", description: "Lọc báo cáo theo ngày, tuần hoặc tháng.", side: "bottom" } },
              { targetPath: "/revenue-management", element: 'button[class*="primary"]', popover: { title: "5. Lọc Dữ Liệu", description: "Nhấn 'Lọc' để truy xuất báo cáo.", side: "bottom" } },
              { targetPath: "/revenue-management", element: 'table', popover: { title: "6. Bảng Kê Chứng Từ", description: "Liệt kê chi tiết từng hóa đơn, khách hàng, số tiền.", side: "top" } },
              { targetPath: "/revenue-management", element: 'table tbody tr:first-child button', popover: { title: "7. Xem Hóa Đơn", description: "Xem lại hóa đơn bán lẻ hoặc phiếu dịch vụ đã thanh toán.", side: "left" } },
              { targetPath: "/revenue-management", element: 'table tbody tr:first-child select', popover: { title: "8. Kiểm Tra Đối Soát", description: "Kế toán đánh dấu 'Đã khớp ngân hàng' cho các khoản chuyển khoản.", side: "left" } },
              { targetPath: "/revenue-management", element: 'table tbody td[class*="unpaid"]', popover: { title: "9. Khoản Nợ Chưa Thu", description: "Theo dõi các khoản khách hàng ghi nợ.", side: "right" } },
              { targetPath: "/revenue-management", element: 'button[class*="primary"]:last-of-type', popover: { title: "10. Chọn Xác Nhận Đối Soát", description: "Bấm 'Xác nhận đối soát' để khóa sổ ca làm việc hiện tại.", side: "top" } },
              { targetPath: "/revenue-management", element: 'button[class*="ghost"]:first-of-type', popover: { title: "11. In Báo Cáo Chốt Ca", description: "Nhấn 'In báo cáo Z' để lưu trữ chứng từ kết ca.", side: "bottom" } },
              { targetPath: "/revenue-management", element: 'button[class*="ghost"]:last-of-type', popover: { title: "12. Xuất File Excel", description: "Bấm nút 'Xuất Excel' ở góc phải để tải file bảng tính về.", side: "bottom" } }
            ]
          },
          {
            id: "2.5.4",
            number: "2.5.4.",
            title: "Quản lý giá dịch vụ & Gói combo",
            desc: "Hỗ trợ Kế toán thiết lập và điều chỉnh cấu trúc giá cho các gói dịch vụ, combo hoặc giá thi công lẻ.",
            targetPath: "/combo-management",
            content: {
              overview: "Cấu hình giá linh hoạt nhằm thu hút khách hàng thông qua các gói combo bảo dưỡng, đồng thời tối ưu hóa lợi nhuận kinh doanh.",
              steps: [
                "1. Truy cập menu 'Bán hàng & Khuyến mãi' -> 'Quản lý Combo' (/combo-management) hoặc 'Dịch vụ lẻ' (/service-management).",
                "2. Bấm 'Thêm mới' để tạo gói combo bảo dưỡng hoặc sửa đổi combo hiện có.",
                "3. Chọn các phụ tùng (phương pháp FIFO/LIFO/Chọn lô) và nhân công đi kèm.",
                "4. Thiết lập giá bán combo và điều kiện áp dụng.",
                "5. Nhấn 'Lưu cấu hình' để cập nhật trên toàn hệ thống."
              ]
            },
            sandboxType: "combo_management",
            quiz: {
              question: "Khi tạo một gói combo bảo dưỡng, Kế toán cần thiết lập những gì?",
              options: [
                "Các phụ tùng, nhân công đi kèm, giá bán combo và điều kiện áp dụng",
                "Ngày nghỉ phép của kỹ thuật viên",
                "Số điện thoại cố vấn",
                "Tọa độ GPS chấm công"
              ],
              correctIndex: 0
            },
                        tourSteps: [
              { element: '[data-tour-id="combo-management"]', popover: { title: "1. Mở Phân Hệ", description: "Truy cập 'Bán hàng & Khuyến mãi' -> 'Quản lý Combo' (/combo-management).", side: "right" } },
              { targetPath: "/combo-management", element: 'section[class*="statsGrid"]', popover: { title: "2. Khung Nhìn Tổng Quan", description: "Hiển thị danh sách các gói dịch vụ, combo lốp đang triển khai.", side: "right" } },
              { targetPath: "/combo-management", element: 'select[name="vehicleType"]', popover: { title: "3. Lọc Combo Tương Ứng", description: "Chọn bộ lọc theo 'Loại xe' hoặc 'Loại dịch vụ'.", side: "bottom" } },
              { targetPath: "/combo-management", element: 'input[placeholder*="Tìm"]', popover: { title: "4. Thanh Tìm Kiếm", description: "Tra nhanh theo tên gói bảo dưỡng.", side: "bottom" } },
              { targetPath: "/combo-management", element: 'table', popover: { title: "5. Bảng Dữ Liệu", description: "Xem số lượng phụ tùng thành phần, chi phí tổng và giá niêm yết.", side: "top" } },
              { targetPath: "/combo-management", element: 'button[class*="primary"]', popover: { title: "6. Nút Tạo Mới", description: "Nhấp vào '+ Tạo gói Combo' để bắt đầu xây dựng gói.", side: "bottom" } },
              { targetPath: "/combo-management/create-combo", element: 'input[name="comboName"]', popover: { title: "7. Khai Báo Thông Tin Chung", description: "Nhập Tên combo, Mô tả ngắn, và Loại xe áp dụng.", side: "right" } },
              { targetPath: "/combo-management/create-combo", element: 'button[class*="ghost"]:first-of-type', popover: { title: "8. Chọn Phụ Tùng Thành Phần", description: "Tìm và thêm các mã lốp, dầu nhớt... vào danh sách combo.", side: "left" } },
              { targetPath: "/combo-management/create-combo", element: 'button[class*="ghost"]:last-of-type', popover: { title: "9. Chọn Công Dịch Vụ", description: "Thêm các hạng mục tiền công thay thế.", side: "left" } },
              { targetPath: "/combo-management/create-combo", element: 'input[name="sellingPrice"]', popover: { title: "10. Cài Đặt Giá Vốn & Giá Bán", description: "Nhập mức 'Giá bán ưu đãi' dựa trên tổng chi phí vốn hệ thống gợi ý.", side: "right" } },
              { targetPath: "/combo-management/create-combo", element: 'input[name="discount"]', popover: { title: "11. Áp Dụng Chiết Khấu", description: "Điền phần trăm (%) giảm giá so với mua lẻ.", side: "right" } },
              { targetPath: "/combo-management/create-combo", element: 'input[type="date"]', popover: { title: "12. Thời Hạn Áp Dụng", description: "Thiết lập ngày bắt đầu và kết thúc của gói Combo.", side: "right" } },
              { targetPath: "/combo-management/create-combo", element: 'button[class*="primary"]', popover: { title: "13. Bấm Lưu Thiết Lập", description: "Nhấn 'Lưu cấu hình' để hệ thống đồng bộ combo này.", side: "top" } },
              { targetPath: "/combo-management", element: 'table tbody tr:first-child button', popover: { title: "14. Chỉnh Sửa Kịp Thời", description: "Nhấp vào biểu tượng bút chì để điều chỉnh linh hoạt.", side: "left" } },
              { targetPath: "/combo-management", element: 'table tbody tr:first-child input[type="checkbox"]', popover: { title: "15. Tạm Dừng Hoạt Động", description: "Nhấp công tắc Bật/Tắt để ẩn gói combo khi hết hạn.", side: "left" } }
            ]
          },
          {
            id: "2.5.5",
            number: "2.5.5.",
            title: "Chọn phương thức thanh toán & In hóa đơn GTGT",
            desc: "Chốt phương thức thu tiền cho phiếu dịch vụ và in hóa đơn kế toán / hóa đơn VAT cho khách hàng.",
            targetPath: "/service-ticket-management",
            content: {
              overview: "Sau khi phiếu dịch vụ hoàn tất thi công, Kế toán mở màn hình Chọn phương thức thanh toán (/service-ticket/:ticketCode/receipt-payment-method) để chốt hình thức thu tiền, sau đó in chứng từ tại màn hình In hóa đơn kế toán (/service-ticket/:ticketCode/accounting-invoice-print). Khách hàng cần hóa đơn GTGT sẽ được xuất bản hóa đơn VAT riêng (/vat-invoice).",
              steps: [
                "1. Từ Điều phối phiếu dịch vụ (/service-ticket-management), lọc các phiếu ở trạng thái đã hoàn tất thi công, chờ thu tiền.",
                "2. Mở chi tiết phiếu (/service-ticket/:ticketCode) và đối soát lại toàn bộ hạng mục dịch vụ, phụ tùng đã sử dụng.",
                "3. Chuyển sang màn hình Chọn phương thức thanh toán: Tiền mặt / Chuyển khoản VietQR / Thẻ, nhập số tiền thực thu.",
                "4. Xác nhận thanh toán - hệ thống ghi nhận doanh thu và chốt trạng thái phiếu.",
                "5. In hóa đơn kế toán tại /service-ticket/:ticketCode/accounting-invoice-print; nếu khách yêu cầu hóa đơn GTGT, xuất bản hóa đơn VAT kèm đầy đủ thông tin công ty."
              ]
            },
            sandboxType: "invoice_print",
            quiz: {
              question: "Sau khi xác nhận thu tiền cho phiếu dịch vụ, Kế toán thực hiện bước gì tiếp theo?",
              options: [
                "In hóa đơn kế toán (accounting-invoice-print) và xuất hóa đơn GTGT nếu khách yêu cầu",
                "Xóa phiếu dịch vụ khỏi hệ thống",
                "Chuyển phiếu ngược lại cho Kỹ thuật viên",
                "Tạo lại lịch hẹn mới cho khách"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-service"]', popover: { title: "1. Menu Dịch vụ & Xưởng", description: "Nhấp mở danh mục 'Dịch vụ & Xưởng' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="service-ticket-management"]', popover: { title: "2. Chọn Phiếu dịch vụ", description: "Nhấp chọn 'Phiếu dịch vụ' để mở danh sách các phiếu cần thu tiền (/service-ticket-management).", side: "right" } },
              { targetPath: "/service-ticket-management", element: 'select, [class*="filter"]', allowMissing: true, popover: { title: "3. Lọc Phiếu chờ Thu tiền", description: "Lọc các phiếu đã hoàn tất thi công, đang chờ thanh toán để xử lý theo thứ tự.", side: "bottom" } },
              { targetPath: "/service-ticket-management", element: 'table tbody tr:first-child button', allowMissing: true, popover: { title: "4. Mở Chi tiết Phiếu", description: "Bấm 'Xem chi tiết' để đối soát lại hạng mục dịch vụ và phụ tùng đã sử dụng trên xe.", side: "left" } },
              { targetPath: "/service-ticket/ST-DEMO-2026/receipt-payment-method", element: 'main, body', allowMissing: true, popover: { title: "5. Màn hình Chọn Phương thức Thanh toán", description: "Tại /service-ticket/:ticketCode/receipt-payment-method: chọn Tiền mặt / Chuyển khoản VietQR / Thẻ và nhập số tiền thực thu từ khách.", side: "bottom" } },
              { targetPath: "/service-ticket/ST-DEMO-2026/receipt-payment-method", element: 'button[class*="primary"], main', allowMissing: true, popover: { title: "6. Xác nhận Thanh toán", description: "Bấm xác nhận để hệ thống ghi nhận doanh thu và chốt trạng thái phiếu dịch vụ sang đã thanh toán.", side: "top" } },
              { targetPath: "/service-ticket/ST-DEMO-2026/accounting-invoice-print", element: 'main, body', allowMissing: true, popover: { title: "7. In Hóa đơn Kế toán & VAT", description: "Trang in chứng từ (/service-ticket/:ticketCode/accounting-invoice-print). Khách cần hóa đơn GTGT thì xuất thêm hóa đơn VAT (/vat-invoice).", side: "bottom" } }
            ]
          },
          {
            id: "2.5.6",
            number: "2.5.6.",
            title: "Quản lý dịch vụ lẻ & Bảng giá nhân công",
            desc: "Khai báo và cập nhật danh mục dịch vụ lẻ cùng đơn giá tiền công thi công (/service-management).",
            targetPath: "/service-management",
            content: {
              overview: "Bên cạnh gói Combo, garage còn bán các dịch vụ lẻ (thay lốp, cân bằng động, căn chỉnh thước lái 3D, thay dầu...). Trang Quản lý dịch vụ (/service-management) là nơi khai báo danh mục dịch vụ và đơn giá tiền công - dữ liệu này được Cố vấn dịch vụ dùng trực tiếp khi lập báo giá cho khách.",
              steps: [
                "1. Truy cập menu 'Dịch vụ & Xưởng' -> 'Quản lý dịch vụ' (/service-management).",
                "2. Tra cứu dịch vụ theo tên hoặc lọc theo nhóm dịch vụ.",
                "3. Bấm 'Thêm dịch vụ mới' (/service-management/create-service) để khai báo dịch vụ chưa có trong hệ thống.",
                "4. Nhập tên dịch vụ, mô tả, thời gian thi công dự kiến và đơn giá tiền công.",
                "5. Bổ sung bài viết mô tả dịch vụ hiển thị cho khách (/service-management/blog/:itemId) rồi lưu cấu hình để Cố vấn sử dụng khi báo giá."
              ]
            },
            sandboxType: "service_catalog",
            quiz: {
              question: "Dữ liệu đơn giá tiền công khai báo tại /service-management được sử dụng ở đâu?",
              options: [
                "Cố vấn dịch vụ dùng trực tiếp khi lập báo giá cho khách hàng",
                "Chỉ dùng để in báo cáo nội bộ cuối năm",
                "Dùng để tính lương nhân viên",
                "Không được sử dụng ở đâu cả"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-service"]', popover: { title: "1. Menu Dịch vụ & Xưởng", description: "Nhấp mở danh mục 'Dịch vụ & Xưởng' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="service-management"]', popover: { title: "2. Chọn Quản lý dịch vụ", description: "Nhấp chọn 'Quản lý dịch vụ' để mở danh mục dịch vụ lẻ và bảng giá nhân công (/service-management).", side: "right" } },
              { targetPath: "/service-management", element: 'input[placeholder*="Tìm"], [class*="filter"]', allowMissing: true, popover: { title: "3. Tra cứu Dịch vụ", description: "Tìm dịch vụ theo tên hoặc lọc theo nhóm dịch vụ đang cung cấp tại garage.", side: "bottom" } },
              { targetPath: "/service-management", element: 'table', popover: { title: "4. Bảng Danh mục Dịch vụ", description: "Xem danh sách dịch vụ lẻ kèm đơn giá tiền công và trạng thái đang kinh doanh.", side: "top" } },
              { targetPath: "/service-management", element: 'button[class*="primary"]', allowMissing: true, popover: { title: "5. Thêm Dịch vụ mới", description: "Bấm '+ Thêm dịch vụ' để chuyển sang màn hình khai báo dịch vụ mới (/service-management/create-service).", side: "bottom" } },
              { targetPath: "/service-management/create-service", element: 'input, form', allowMissing: true, popover: { title: "6. Khai báo Thông tin Dịch vụ", description: "Nhập tên dịch vụ, mô tả, thời gian thi công dự kiến và đơn giá tiền công áp dụng.", side: "bottom" } },
              { targetPath: "/service-management/create-service", element: 'button[class*="primary"]', allowMissing: true, popover: { title: "7. Lưu Dịch vụ", description: "Bấm lưu để dịch vụ xuất hiện trong danh sách chọn khi Cố vấn lập báo giá cho khách.", side: "top" } },
              { targetPath: "/service-management/blog/1", element: 'main, form, body', allowMissing: true, popover: { title: "8. Soạn Bài viết mô tả Dịch vụ", description: "Mở trình soạn bài viết (/service-management/blog/:itemId) để viết nội dung giới thiệu dịch vụ hiển thị cho khách trên website.", side: "bottom" } },
              { targetPath: "/part-management/blog/1", element: 'main, form, body', allowMissing: true, popover: { title: "9. Bài viết mô tả Phụ tùng", description: "Tương tự, phụ tùng có trình soạn bài viết riêng (/part-management/blog/:itemId) để mô tả sản phẩm cho khách xem.", side: "bottom" } },
              { targetPath: "/combo-management/blog/1", element: 'main, form, body', allowMissing: true, popover: { title: "10. Bài viết mô tả Gói Combo", description: "Gói Combo cũng có trình soạn bài viết riêng (/combo-management/blog/:itemId) để giới thiệu nội dung gói bảo dưỡng trọn gói.", side: "bottom" } }
            ]
          }
        ]
      },
      {
        id: "2.6",
        number: "2.6.",
        title: "Phân hệ Marketing & Chăm sóc khách hàng",
        topics: [
          {
            id: "2.6.1",
            number: "2.6.1.",
            title: "Quản lý chương trình khuyến mãi",
            desc: "Tạo và vận hành các chương trình giảm giá, voucher và khuyến mãi mua nX tặng nY (/promotion-management).",
            targetPath: "/promotion-management",
            content: {
              overview: "Trang Quản lý khuyến mãi (/promotion-management) cho phép Quản lý thiết lập các chương trình ưu đãi áp dụng tự động khi Cố vấn lập báo giá hoặc khi bán lẻ phụ tùng: giảm theo phần trăm, giảm số tiền cố định, tặng kèm phụ tùng theo cơ chế mua nX tặng nY, kèm điều kiện áp dụng và thời hạn hiệu lực.",
              steps: [
                "1. Truy cập menu 'Marketing & CSKH' -> 'Quản lý khuyến mãi' (/promotion-management).",
                "2. Xem danh sách chương trình đang chạy kèm mã khuyến mãi, loại ưu đãi và thời hạn áp dụng.",
                "3. Bấm 'Tạo khuyến mãi' (/promotion-management/create) để thiết lập chương trình mới.",
                "4. Chọn loại ưu đãi (giảm %, giảm tiền, mua nX tặng nY), nhập mã code, điều kiện áp dụng và hạn mức.",
                "5. Thiết lập ngày bắt đầu - kết thúc rồi lưu. Chương trình sẽ tự động hiển thị để chọn khi lập báo giá hoặc bán hàng."
              ]
            },
            sandboxType: "promotion",
            quiz: {
              question: "Chương trình khuyến mãi sau khi được tạo sẽ xuất hiện ở đâu?",
              options: [
                "Tự động hiển thị để chọn khi Cố vấn lập báo giá hoặc khi bán lẻ phụ tùng",
                "Chỉ hiển thị trên trang cấu hình, không dùng được ở đâu",
                "Chỉ gửi email cho quản lý",
                "Chỉ áp dụng thủ công bằng cách gọi điện xác nhận"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-marketing"]', popover: { title: "1. Menu Marketing & CSKH", description: "Nhấp mở danh mục 'Marketing & CSKH' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="promotion-management"]', popover: { title: "2. Chọn Quản lý khuyến mãi", description: "Nhấp chọn 'Quản lý khuyến mãi' để mở màn hình chương trình ưu đãi (/promotion-management).", side: "right" } },
              { targetPath: "/promotion-management", element: '[class*="container"]', popover: { title: "3. Danh sách Chương trình", description: "Xem toàn bộ chương trình khuyến mãi kèm mã code, loại ưu đãi và thời hạn hiệu lực.", side: "bottom" } },
              { targetPath: "/promotion-management", element: 'table, [class*="detailGrid"]', allowMissing: true, popover: { title: "4. Chi tiết Ưu đãi", description: "Xem điều kiện áp dụng, hạn mức giảm giá và các phụ tùng/dịch vụ nằm trong phạm vi chương trình.", side: "top" } },
              { targetPath: "/promotion-management", element: 'button[class*="primary"], [class*="actionGroup"] button', allowMissing: true, popover: { title: "5. Tạo Khuyến mãi mới", description: "Bấm 'Tạo khuyến mãi' để mở form thiết lập chương trình mới (/promotion-management/create).", side: "bottom" } },
              { targetPath: "/promotion-management", element: '[class*="codeInputRow"], [class*="detailSection"]', allowMissing: true, popover: { title: "6. Nhập Mã & Loại Ưu đãi", description: "Chọn loại ưu đãi (giảm %, giảm tiền, mua nX tặng nY), nhập mã code và điều kiện áp dụng cụ thể.", side: "bottom" } },
              { targetPath: "/promotion-management/create", element: 'main, form, body', allowMissing: true, popover: { title: "7. Form Tạo Khuyến mãi (/promotion-management/create)", description: "Màn hình thiết lập chi tiết: mã code, loại ưu đãi, phạm vi sản phẩm áp dụng và hạn mức giảm giá tối đa.", side: "bottom" } },
              { targetPath: "/promotion-management", element: '[class*="dateCell"], input[type="date"]', allowMissing: true, popover: { title: "8. Thời hạn & Lưu chương trình", description: "Thiết lập ngày bắt đầu - kết thúc rồi lưu để chương trình tự động áp dụng khi báo giá và bán hàng.", side: "top" } }
            ]
          },
          {
            id: "2.6.2",
            number: "2.6.2.",
            title: "Cấu hình Điểm tích lũy & Hạng khách hàng",
            desc: "Thiết lập tỷ lệ quy đổi điểm và ngưỡng xếp hạng thành viên Đồng / Bạc / Vàng / Bạch Kim (/point-config).",
            targetPath: "/point-config",
            content: {
              overview: "Hệ thống tự động xếp hạng khách hàng dựa trên điểm tích lũy từ hóa đơn thanh toán. Trang Cấu hình Điểm & Hạng (/point-config) quyết định: mỗi đồng chi tiêu quy đổi được bao nhiêu điểm, ngưỡng điểm để lên từng hạng (BRONZE -> SILVER -> GOLD -> PLATINUM) và mức chiết khấu ưu đãi tương ứng mỗi hạng.",
              steps: [
                "1. Truy cập menu 'Marketing & CSKH' -> 'Cấu hình Điểm & Hạng' (/point-config).",
                "2. Thiết lập tỷ lệ quy đổi điểm tích lũy trên giá trị hóa đơn thanh toán.",
                "3. Nhập ngưỡng điểm tối thiểu để đạt từng hạng: Đồng (mặc định), Bạc, Vàng, Bạch Kim.",
                "4. Cấu hình mức chiết khấu/ưu đãi tương ứng cho mỗi hạng thành viên.",
                "5. Lưu cấu hình - hệ thống tự động xếp hạng lại và áp dụng chiết khấu khi khách phát sinh giao dịch mới."
              ]
            },
            sandboxType: "point_tier",
            quiz: {
              question: "Hạng khách hàng (Đồng/Bạc/Vàng/Bạch Kim) được hệ thống xác định dựa trên yếu tố nào?",
              options: [
                "Điểm tích lũy từ hóa đơn thanh toán, đối chiếu với ngưỡng điểm cấu hình tại /point-config",
                "Thứ tự khách hàng đăng ký tài khoản",
                "Do Lễ tân tự chọn khi tạo hồ sơ",
                "Theo dòng xe khách đang sử dụng"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-marketing"]', popover: { title: "1. Menu Marketing & CSKH", description: "Nhấp mở danh mục 'Marketing & CSKH' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="point-config"]', popover: { title: "2. Chọn Cấu hình Điểm & Hạng", description: "Nhấp chọn 'Cấu hình Điểm & Hạng' để mở màn hình thiết lập chương trình thành viên (/point-config).", side: "right" } },
              { targetPath: "/point-config", element: 'main, form, body', popover: { title: "3. Tỷ lệ Quy đổi Điểm", description: "Thiết lập số điểm khách nhận được tương ứng với mỗi mức giá trị hóa đơn thanh toán.", side: "bottom" } },
              { targetPath: "/point-config", element: 'input[type="number"], input', allowMissing: true, popover: { title: "4. Ngưỡng Điểm theo Hạng", description: "Nhập ngưỡng điểm tối thiểu để khách đạt từng hạng: Đồng (mặc định), Bạc, Vàng, Bạch Kim.", side: "bottom" } },
              { targetPath: "/point-config", element: 'button[class*="primary"], button', allowMissing: true, popover: { title: "5. Lưu Cấu hình", description: "Bấm lưu - hệ thống tự động xếp hạng lại khách hàng và áp dụng chiết khấu ưu đãi khi phát sinh giao dịch mới.", side: "top" } }
            ]
          },
          {
            id: "2.6.3",
            number: "2.6.3.",
            title: "Nhắc lịch bảo dưỡng định kỳ",
            desc: "Lọc danh sách xe đến chu kỳ bảo dưỡng và chủ động gửi nhắc lịch cho khách hàng (/maintenance-reminders).",
            targetPath: "/maintenance-reminders",
            content: {
              overview: "Trang Nhắc lịch bảo dưỡng (/maintenance-reminders) giúp garage chủ động giữ chân khách: hệ thống dựa vào số KM và ngày dịch vụ gần nhất của từng xe để lọc ra danh sách xe sắp/đã đến chu kỳ bảo dưỡng, từ đó Lễ tân gửi nhắc lịch qua Zalo/SMS hoặc gọi điện mời khách quay lại.",
              steps: [
                "1. Truy cập menu 'Marketing & CSKH' -> 'Nhắc lịch bảo dưỡng' (/maintenance-reminders).",
                "2. Dùng bộ lọc theo khoảng thời gian hoặc chu kỳ KM để lọc nhóm xe cần nhắc.",
                "3. Xem danh sách xe kèm chủ xe, số điện thoại, số KM và ngày dịch vụ gần nhất.",
                "4. Chọn khách hàng cần nhắc và bấm gửi nhắc lịch qua Zalo/SMS hoặc gọi điện trực tiếp.",
                "5. Theo dõi trạng thái đã nhắc để tránh làm phiền khách nhiều lần và đo hiệu quả chiến dịch giữ chân khách."
              ]
            },
            sandboxType: "maintenance_reminder",
            quiz: {
              question: "Hệ thống dựa vào dữ liệu nào để lọc ra danh sách xe cần nhắc lịch bảo dưỡng?",
              options: [
                "Số KM và ngày dịch vụ gần nhất của từng xe",
                "Màu sơn của xe",
                "Số lượng khách hàng đang online",
                "Tồn kho lốp Michelin hiện tại"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-marketing"]', popover: { title: "1. Menu Marketing & CSKH", description: "Nhấp mở danh mục 'Marketing & CSKH' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="maintenance-reminders"]', popover: { title: "2. Chọn Nhắc lịch bảo dưỡng", description: "Nhấp chọn 'Nhắc lịch bảo dưỡng' để mở màn hình danh sách xe đến chu kỳ (/maintenance-reminders).", side: "right" } },
              { targetPath: "/maintenance-reminders", element: '[class*="bookingHeader"], [class*="headerActions"]', popover: { title: "3. Tổng quan Chiến dịch nhắc lịch", description: "Xem tổng số xe đang đến chu kỳ bảo dưỡng cần chủ động liên hệ mời quay lại garage.", side: "bottom" } },
              { targetPath: "/maintenance-reminders", element: '[class*="filterGrid"]', popover: { title: "4. Bộ lọc Chu kỳ", description: "Lọc theo khoảng thời gian hoặc mốc KM bảo dưỡng (10.000km, 20.000km, 40.000km...) để chọn nhóm xe cần nhắc.", side: "bottom" } },
              { targetPath: "/maintenance-reminders", element: '[class*="bookingTable"], table', popover: { title: "5. Danh sách Xe cần nhắc", description: "Xem chủ xe, số điện thoại, biển số, số KM và ngày dịch vụ gần nhất của từng xe.", side: "top" } },
              { targetPath: "/maintenance-reminders", element: '[class*="actionGroup"] button, [class*="ghostButton"]', allowMissing: true, popover: { title: "6. Gửi Nhắc lịch cho khách", description: "Chọn khách cần nhắc và bấm gửi tin qua Zalo/SMS hoặc gọi điện trực tiếp mời khách quay lại bảo dưỡng.", side: "left" } }
            ]
          },
          {
            id: "2.6.4",
            number: "2.6.4.",
            title: "Chiến dịch thông báo khách hàng",
            desc: "Gửi thông báo/chiến dịch truyền thông hàng loạt tới nhóm khách hàng mục tiêu (/announcement_campaign).",
            targetPath: "/announcement_campaign",
            content: {
              overview: "Trang Chiến dịch thông báo (/announcement_campaign) dùng để truyền thông hàng loạt tới khách hàng: thông báo chương trình khuyến mãi mới, lịch nghỉ lễ của garage, sự kiện chăm sóc xe. Hệ thống hỗ trợ lọc tập khách theo tiêu chí và xem trước số lượng người nhận đủ điều kiện trước khi gửi.",
              steps: [
                "1. Truy cập menu 'Marketing & CSKH' -> 'Chiến dịch thông báo' (/announcement_campaign).",
                "2. Soạn nội dung thông báo: tiêu đề và nội dung chi tiết gửi tới khách hàng.",
                "3. Dùng bộ lọc để chọn tập khách hàng mục tiêu (theo hạng thành viên, theo thời gian dịch vụ gần nhất...).",
                "4. Kiểm tra số lượng khách đủ điều kiện nhận và số khách bị loại trừ mà hệ thống thống kê.",
                "5. Xem trước nội dung trong hộp thoại preview rồi bấm gửi chiến dịch."
              ]
            },
            sandboxType: "announcement_campaign",
            quiz: {
              question: "Trước khi bấm gửi một chiến dịch thông báo hàng loạt, cần kiểm tra điều gì?",
              options: [
                "Tập khách hàng mục tiêu, số người đủ điều kiện nhận và xem trước nội dung",
                "Số lượng lốp Michelin còn trong kho",
                "Lịch nghỉ phép của kỹ thuật viên",
                "Tỷ giá ngoại tệ trong ngày"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-marketing"]', popover: { title: "1. Menu Marketing & CSKH", description: "Nhấp mở danh mục 'Marketing & CSKH' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="announcement-campaign"]', popover: { title: "2. Chọn Chiến dịch thông báo", description: "Nhấp chọn 'Chiến dịch thông báo' để mở màn hình truyền thông hàng loạt (/announcement_campaign).", side: "right" } },
              { targetPath: "/announcement_campaign", element: '[class*="header"]', popover: { title: "3. Tổng quan Chiến dịch", description: "Màn hình soạn và gửi thông báo hàng loạt tới nhóm khách hàng mục tiêu của garage.", side: "bottom" } },
              { targetPath: "/announcement_campaign", element: '[class*="formGrid"]', popover: { title: "4. Soạn Nội dung Thông báo", description: "Nhập tiêu đề và nội dung chi tiết (khuyến mãi mới, lịch nghỉ lễ, sự kiện chăm sóc xe...).", side: "bottom" } },
              { targetPath: "/announcement_campaign", element: '[class*="filterControls"], [class*="filterRow"]', popover: { title: "5. Lọc Tập khách hàng Mục tiêu", description: "Chọn tiêu chí lọc khách (hạng thành viên, thời gian dịch vụ gần nhất...) để gửi đúng đối tượng.", side: "bottom" } },
              { targetPath: "/announcement_campaign", element: '[class*="eligibleText"], [class*="filterMeta"]', allowMissing: true, popover: { title: "6. Số khách Đủ điều kiện", description: "Kiểm tra số khách đủ điều kiện nhận và số khách bị loại trừ trước khi gửi để tránh gửi nhầm.", side: "bottom" } },
              { targetPath: "/announcement_campaign", element: '[class*="modalBody"], button[class*="primary"]', allowMissing: true, popover: { title: "7. Xem trước & Gửi Chiến dịch", description: "Xem trước nội dung trong hộp thoại preview, xác nhận đúng rồi bấm gửi chiến dịch tới khách hàng.", side: "top" } }
            ]
          },
          {
            id: "2.6.5",
            number: "2.6.5.",
            title: "Quản lý phản hồi & đánh giá khách hàng",
            desc: "Tiếp nhận, phân công xử lý và theo dõi phản hồi/đánh giá của khách sau khi sử dụng dịch vụ (/feedback-management).",
            targetPath: "/feedback-management",
            content: {
              overview: "Sau mỗi phiếu dịch vụ hoàn tất, khách hàng có thể gửi đánh giá và phản hồi. Trang Quản lý feedback (/feedback-management) tập hợp toàn bộ phản hồi để Quản lý theo dõi chất lượng dịch vụ, phân công nhân sự xử lý các phản ánh tiêu cực và đóng vòng phản hồi với khách.",
              steps: [
                "1. Truy cập menu 'Marketing & CSKH' -> 'Quản lý feedback' (/feedback-management).",
                "2. Lọc phản hồi theo mức đánh giá (số sao) hoặc trạng thái xử lý để ưu tiên các phản ánh tiêu cực.",
                "3. Mở chi tiết phản hồi để xem nội dung khách góp ý và phiếu dịch vụ liên quan.",
                "4. Phân công nhân sự phụ trách liên hệ khách xử lý và ghi nhận thời điểm phân công.",
                "5. Cập nhật kết quả xử lý và đóng phản hồi khi khách đã hài lòng."
              ]
            },
            sandboxType: "feedback",
            quiz: {
              question: "Mục đích chính của trang Quản lý feedback (/feedback-management) là gì?",
              options: [
                "Theo dõi chất lượng dịch vụ, phân công xử lý phản ánh và đóng vòng phản hồi với khách",
                "Quản lý tồn kho phụ tùng",
                "Tính lương thưởng cho nhân viên",
                "Đặt lịch hẹn mới cho khách"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-marketing"]', popover: { title: "1. Menu Marketing & CSKH", description: "Nhấp mở danh mục 'Marketing & CSKH' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="feedback-management"]', popover: { title: "2. Chọn Quản lý feedback", description: "Nhấp chọn 'Quản lý feedback' để mở màn hình phản hồi khách hàng (/feedback-management).", side: "right" } },
              { targetPath: "/feedback-management", element: '[class*="bookingHeader"]', popover: { title: "3. Tổng quan Phản hồi", description: "Xem tổng số phản hồi nhận được và điểm đánh giá trung bình của garage.", side: "bottom" } },
              { targetPath: "/feedback-management", element: '[class*="bookingTable"], table', popover: { title: "4. Danh sách Đánh giá", description: "Lọc theo số sao hoặc trạng thái xử lý để ưu tiên xử lý các phản ánh tiêu cực trước.", side: "top" } },
              { targetPath: "/feedback-management", element: '[class*="detailCard"]', allowMissing: true, popover: { title: "5. Chi tiết Phản hồi", description: "Mở chi tiết để đọc nội dung khách góp ý và xem phiếu dịch vụ liên quan.", side: "left" } },
              { targetPath: "/feedback-management", element: '[class*="assignSection"], [class*="assignCard"]', allowMissing: true, popover: { title: "6. Phân công Xử lý", description: "Phân công nhân sự phụ trách liên hệ khách xử lý - hệ thống ghi nhận người nhận và thời điểm phân công.", side: "bottom" } },
              { targetPath: "/feedback-management", element: '[class*="actionButtons"] button', allowMissing: true, popover: { title: "7. Cập nhật Kết quả & Đóng phản hồi", description: "Ghi nhận kết quả xử lý và đóng phản hồi khi khách hàng đã hài lòng.", side: "left" } }
            ]
          },
          {
            id: "2.6.6",
            number: "2.6.6.",
            title: "Quản lý Slider & Banner trang chủ",
            desc: "Cập nhật hình ảnh slider, banner quảng bá hiển thị trên website khách hàng (/slider-management).",
            targetPath: "/slider-management",
            content: {
              overview: "Trang Quản lý Slider & Banner (/slider-management) điều khiển phần hình ảnh quảng bá hiển thị trên website khách hàng: banner khuyến mãi, hình ảnh dịch vụ nổi bật, thông điệp thương hiệu Michelin. Nội dung cập nhật tại đây sẽ hiển thị ngay cho khách truy cập website.",
              steps: [
                "1. Truy cập menu 'Marketing & CSKH' -> 'Quản lý Slider & Banner' (/slider-management).",
                "2. Xem danh sách slider/banner đang hiển thị trên trang chủ website.",
                "3. Bấm thêm mới, tải lên hình ảnh banner và nhập tiêu đề/liên kết điều hướng khi khách bấm vào.",
                "4. Kéo thả để sắp xếp lại thứ tự hiển thị của các slider.",
                "5. Bật/tắt trạng thái hiển thị hoặc xóa banner đã hết hạn chiến dịch."
              ]
            },
            sandboxType: "slider",
            quiz: {
              question: "Nội dung cập nhật tại trang Quản lý Slider & Banner sẽ hiển thị ở đâu?",
              options: [
                "Trên website khách hàng - phần slider/banner quảng bá trang chủ",
                "Chỉ hiển thị nội bộ cho nhân viên",
                "Trên phiếu in hóa đơn",
                "Trên báo cáo doanh thu"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-marketing"]', popover: { title: "1. Menu Marketing & CSKH", description: "Nhấp mở danh mục 'Marketing & CSKH' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="slider-management"]', popover: { title: "2. Chọn Quản lý Slider & Banner", description: "Nhấp chọn 'Quản lý Slider & Banner' để mở màn hình quản trị hình ảnh trang chủ (/slider-management).", side: "right" } },
              { targetPath: "/slider-management", element: '[class*="header"]', popover: { title: "3. Tổng quan Slider", description: "Màn hình quản lý toàn bộ hình ảnh quảng bá đang hiển thị trên website khách hàng.", side: "bottom" } },
              { targetPath: "/slider-management", element: '[class*="grid"], [class*="card"]', popover: { title: "4. Danh sách Banner hiện có", description: "Xem các slider/banner đang được hiển thị kèm trạng thái bật/tắt.", side: "top" } },
              { targetPath: "/slider-management", element: '[class*="addItemSection"], [class*="btnPrimary"]', allowMissing: true, popover: { title: "5. Thêm Banner mới", description: "Tải lên hình ảnh banner, nhập tiêu đề và liên kết điều hướng khi khách bấm vào.", side: "bottom" } },
              { targetPath: "/slider-management", element: '[class*="dragHandle"]', allowMissing: true, popover: { title: "6. Sắp xếp Thứ tự hiển thị", description: "Kéo thả biểu tượng để thay đổi thứ tự xuất hiện của các slider trên trang chủ.", side: "left" } },
              { targetPath: "/slider-management", element: '[class*="btnSecondary"], [class*="btnIcon"]', allowMissing: true, popover: { title: "7. Bật/Tắt & Xóa Banner", description: "Bật/tắt trạng thái hiển thị hoặc xóa banner đã hết hạn chiến dịch quảng bá.", side: "left" } }
            ]
          }
        ]
      },
      {
        id: "2.7",
        number: "2.7.",
        title: "Phân hệ Nhân sự & Chấm công (Quản lý)",
        topics: [
          {
            id: "2.7.1",
            number: "2.7.1.",
            title: "Quản lý nhân viên & Phân quyền vai trò",
            desc: "Quản lý danh sách tài khoản nhân viên, gán vai trò nghiệp vụ và trạng thái làm việc (/staff-manager).",
            targetPath: "/staff-manager",
            content: {
              overview: "Trang Quản lý nhân viên (/staff-manager) là nơi Quản lý/Admin tạo tài khoản, gán vai trò nghiệp vụ (Lễ tân, Cố vấn, Kỹ thuật viên, Thủ kho, Kế toán...) và kích hoạt/khóa tài khoản. Vai trò được gán tại đây quyết định trực tiếp các mục menu và chức năng mà nhân viên nhìn thấy sau khi đăng nhập. Một nhân viên có thể được gán nhiều vai trò kiêm nhiệm cùng lúc.",
              steps: [
                "1. Truy cập menu 'Nhân sự' -> 'Quản lý nhân viên' (/staff-manager).",
                "2. Tra cứu nhân viên theo tên hoặc số điện thoại trên thanh tìm kiếm.",
                "3. Xem danh sách nhân viên kèm các nhãn vai trò đang được gán (role badge).",
                "4. Mở chi tiết nhân viên (/staff-manager/:staffId) để chỉnh sửa thông tin và cập nhật vai trò kiêm nhiệm.",
                "5. Lưu thay đổi - hệ thống tự hợp nhất quyền của tất cả vai trò và cập nhật menu nhân viên nhìn thấy ở lần đăng nhập kế tiếp."
              ]
            },
            sandboxType: "staff_roles",
            quiz: {
              question: "Khi một nhân viên được gán nhiều vai trò kiêm nhiệm, hệ thống xử lý thế nào?",
              options: [
                "Tự động hợp nhất quyền của tất cả vai trò, menu hiển thị đầy đủ chức năng của mọi vai trò được giao",
                "Chỉ áp dụng vai trò được gán đầu tiên",
                "Bắt nhân viên đăng xuất và đăng nhập lại để đổi vai trò",
                "Không cho phép gán nhiều vai trò"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-hr"]', popover: { title: "1. Menu Nhân sự", description: "Nhấp mở danh mục 'Nhân sự' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="staff-manager"]', popover: { title: "2. Chọn Quản lý nhân viên", description: "Nhấp chọn 'Quản lý nhân viên' để mở danh sách tài khoản nhân sự (/staff-manager).", side: "right" } },
              { targetPath: "/staff-manager", element: 'input[placeholder*="Tìm kiếm"]', popover: { title: "3. Tra cứu Nhân viên", description: "Nhập tên hoặc số điện thoại để tìm nhanh nhân viên cần xem/chỉnh sửa.", side: "bottom" } },
              { targetPath: "/staff-manager", element: '[class*="filterControls"], [class*="filterLabels"]', allowMissing: true, popover: { title: "4. Bộ lọc theo Vai trò", description: "Lọc danh sách theo vai trò nghiệp vụ hoặc trạng thái tài khoản đang hoạt động.", side: "bottom" } },
              { targetPath: "/staff-manager", element: '[class*="table"], table', popover: { title: "5. Bảng Danh sách Nhân viên", description: "Xem thông tin nhân viên kèm ảnh đại diện và các nhãn vai trò đang được gán (role badge).", side: "top" } },
              { targetPath: "/staff-manager", element: '[class*="roleBadgesContainer"], [class*="roleBadge"]', allowMissing: true, popover: { title: "6. Nhãn Vai trò kiêm nhiệm", description: "Một nhân viên có thể mang nhiều nhãn vai trò cùng lúc - hệ thống tự hợp nhất toàn bộ quyền tương ứng.", side: "bottom" } },
              { targetPath: "/staff-manager", element: '[class*="actionGroup"] button, [class*="headerActions"] button', allowMissing: true, popover: { title: "7. Thêm mới & Chỉnh sửa Nhân viên", description: "Bấm thêm tài khoản mới hoặc bấm vào một nhân viên để mở trang chi tiết.", side: "left" } },
              { targetPath: "/staff-manager/1", element: 'main, body', allowMissing: true, popover: { title: "8. Trang Chi tiết Nhân viên (/staff-manager/:staffId)", description: "Cập nhật thông tin tài khoản, gán/gỡ vai trò kiêm nhiệm và khóa/mở khóa tài khoản nhân viên.", side: "bottom" } }
            ]
          },
          {
            id: "2.7.2",
            number: "2.7.2.",
            title: "Quản lý hồ sơ nhân viên & Hiệu suất",
            desc: "Xem hồ sơ chi tiết, biểu đồ hiệu suất làm việc và lịch sử công tác của từng nhân viên (/employee-manager).",
            targetPath: "/employee-manager",
            content: {
              overview: "Khác với /staff-manager tập trung vào tài khoản & phân quyền, trang Quản lý hồ sơ nhân viên (/employee-manager) tập trung vào hồ sơ nhân sự và hiệu suất: thông tin cá nhân, quá trình công tác, biểu đồ khối lượng công việc đã xử lý - phục vụ đánh giá năng lực và xét thưởng.",
              steps: [
                "1. Truy cập menu 'Nhân sự' -> 'Quản lý hồ sơ nhân viên' (/employee-manager).",
                "2. Tra cứu và chọn nhân viên cần xem hồ sơ trong danh sách.",
                "3. Mở trang hồ sơ chi tiết (/employee-manager/:staffId) để xem thông tin cá nhân và quá trình công tác.",
                "4. Theo dõi biểu đồ hiệu suất: số phiếu/công việc đã xử lý theo thời gian.",
                "5. Đối chiếu với dữ liệu KPI (/kpi-management) để đánh giá năng lực và xét thưởng cuối kỳ."
              ]
            },
            sandboxType: "employee_profile",
            quiz: {
              question: "Điểm khác biệt chính giữa /staff-manager và /employee-manager là gì?",
              options: [
                "/staff-manager tập trung tài khoản & phân quyền; /employee-manager tập trung hồ sơ nhân sự & hiệu suất",
                "Hai trang hoàn toàn giống hệt nhau",
                "/employee-manager dùng để quản lý khách hàng",
                "/staff-manager dùng để quản lý kho"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-hr"]', popover: { title: "1. Menu Nhân sự", description: "Nhấp mở danh mục 'Nhân sự' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="employee-manager"]', popover: { title: "2. Chọn Quản lý hồ sơ nhân viên", description: "Nhấp chọn 'Quản lý hồ sơ nhân viên' để mở màn hình hồ sơ & hiệu suất (/employee-manager).", side: "right" } },
              { targetPath: "/employee-manager", element: '[class*="container"]', popover: { title: "3. Tổng quan Hồ sơ Nhân sự", description: "Màn hình tập trung hồ sơ chi tiết và dữ liệu hiệu suất của toàn bộ nhân viên garage.", side: "bottom" } },
              { targetPath: "/employee-manager", element: '[class*="employeeCell"], table', popover: { title: "4. Danh sách Nhân viên", description: "Xem danh sách kèm ảnh đại diện, tên, chức vụ và thông tin tóm tắt của từng nhân viên.", side: "top" } },
              { targetPath: "/employee-manager", element: '[class*="chartCard"], [class*="chartContainer"]', allowMissing: true, popover: { title: "5. Biểu đồ Hiệu suất", description: "Theo dõi biểu đồ khối lượng công việc/phiếu đã xử lý theo thời gian của nhân viên.", side: "bottom" } },
              { targetPath: "/employee-manager", element: '[class*="actionBtn"]', allowMissing: true, popover: { title: "6. Mở Hồ sơ Chi tiết", description: "Bấm vào nhân viên để mở trang hồ sơ đầy đủ.", side: "left" } },
              { targetPath: "/employee-manager/1", element: 'main, body', allowMissing: true, popover: { title: "7. Trang Hồ sơ Nhân viên (/employee-manager/:staffId)", description: "Xem thông tin cá nhân, quá trình công tác và biểu đồ hiệu suất chi tiết của nhân viên để phục vụ đánh giá năng lực.", side: "bottom" } }
            ]
          },
          {
            id: "2.7.3",
            number: "2.7.3.",
            title: "Quản lý ca làm việc & Phân ca",
            desc: "Thiết lập các ca làm việc của garage và phân ca cho nhân viên theo lịch (/shift-management).",
            targetPath: "/shift-management",
            content: {
              overview: "Trang Quản lý ca làm việc (/shift-management) định nghĩa các ca làm của garage (ca sáng, ca chiều, ca gãy...) kèm khung giờ bắt đầu - kết thúc, và phân ca cho từng nhân viên. Dữ liệu ca làm là căn cứ để hệ thống chấm công đối chiếu đi muộn/về sớm và hiển thị lịch biểu cá nhân tại /daily-schedule.",
              steps: [
                "1. Truy cập menu 'Ca làm & Chấm công' -> 'Quản lý ca làm việc' (/shift-management).",
                "2. Xem danh sách các ca làm việc đang áp dụng tại garage.",
                "3. Bấm thêm ca mới: nhập tên ca, giờ bắt đầu, giờ kết thúc và ghi chú áp dụng.",
                "4. Phân ca cho nhân viên theo ngày/tuần để hệ thống sinh lịch biểu làm việc.",
                "5. Lưu cấu hình - dữ liệu ca sẽ dùng làm căn cứ đối chiếu chấm công đi muộn/về sớm."
              ]
            },
            sandboxType: "shift_config",
            quiz: {
              question: "Dữ liệu ca làm việc cấu hình tại /shift-management được dùng để làm gì?",
              options: [
                "Làm căn cứ đối chiếu chấm công đi muộn/về sớm và sinh lịch biểu làm việc cho nhân viên",
                "Để tính giá bán phụ tùng",
                "Để xếp hạng khách hàng",
                "Để in hóa đơn GTGT"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-attendance"]', popover: { title: "1. Menu Ca làm & Chấm công", description: "Nhấp mở danh mục 'Ca làm & Chấm công' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="shift-management"]', popover: { title: "2. Chọn Quản lý ca làm việc", description: "Nhấp chọn 'Quản lý ca làm việc' để mở màn hình cấu hình & phân ca (/shift-management).", side: "right" } },
              { targetPath: "/shift-management", element: '[class*="header"]', popover: { title: "3. Tổng quan Ca làm việc", description: "Màn hình định nghĩa các ca làm của garage và phân ca cho nhân viên.", side: "bottom" } },
              { targetPath: "/shift-management", element: '[class*="filterSelect"]', allowMissing: true, popover: { title: "4. Bộ lọc Ca làm", description: "Lọc danh sách ca theo trạng thái áp dụng hoặc theo bộ phận làm việc.", side: "bottom" } },
              { targetPath: "/shift-management", element: 'table, [class*="container"]', popover: { title: "5. Danh sách Ca hiện có", description: "Xem các ca đang áp dụng kèm khung giờ bắt đầu - kết thúc và ghi chú.", side: "top" } },
              { targetPath: "/shift-management", element: '[class*="headerActions"] button, button[class*="primary"]', allowMissing: true, popover: { title: "6. Thêm Ca làm mới", description: "Bấm thêm ca và nhập tên ca, giờ bắt đầu, giờ kết thúc trong biểu mẫu (formGrid).", side: "bottom" } },
              { targetPath: "/shift-management", element: '[class*="actionGroup"] button, [class*="editBtn"]', allowMissing: true, popover: { title: "7. Sửa & Ngừng áp dụng Ca", description: "Bấm sửa để điều chỉnh khung giờ hoặc ngừng áp dụng ca không còn sử dụng.", side: "left" } }
            ]
          },
          {
            id: "2.7.4",
            number: "2.7.4.",
            title: "Chấm công nhân viên (Tổng hợp)",
            desc: "Theo dõi bảng chấm công tổng hợp toàn bộ nhân viên theo ngày/tháng để chốt công tính lương (/attendance-management).",
            targetPath: "/attendance-management",
            content: {
              overview: "Trang Chấm công nhân viên (/attendance-management) tổng hợp toàn bộ dữ liệu check-in/check-out của nhân viên theo ngày để Quản lý theo dõi và chốt công. Dữ liệu này kết hợp với ca làm việc đã phân để xác định đi muộn, về sớm, thiếu công - làm căn cứ tính lương cuối tháng.",
              steps: [
                "1. Truy cập menu 'Ca làm & Chấm công' -> 'Chấm công nhân viên' (/attendance-management).",
                "2. Chọn khoảng thời gian (ngày/tháng) cần xem bảng chấm công tổng hợp.",
                "3. Theo dõi giờ vào (check-in) và giờ ra (check-out) của từng nhân viên theo từng ngày.",
                "4. Đối chiếu với ca làm việc đã phân để phát hiện các trường hợp đi muộn, về sớm hoặc thiếu công.",
                "5. Bổ sung/điều chỉnh công thủ công cho các trường hợp đã được duyệt đơn giải trình, sau đó chốt công cuối kỳ."
              ]
            },
            sandboxType: "attendance_summary",
            quiz: {
              question: "Dữ liệu chấm công tổng hợp được đối chiếu với thông tin nào để xác định đi muộn/về sớm?",
              options: [
                "Ca làm việc đã phân cho nhân viên tại /shift-management",
                "Số lượng phiếu dịch vụ trong ngày",
                "Tồn kho phụ tùng",
                "Hạng thành viên của khách hàng"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-attendance"]', popover: { title: "1. Menu Ca làm & Chấm công", description: "Nhấp mở danh mục 'Ca làm & Chấm công' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="attendance-management"]', popover: { title: "2. Chọn Chấm công nhân viên", description: "Nhấp chọn 'Chấm công nhân viên' để mở bảng chấm công tổng hợp (/attendance-management).", side: "right" } },
              { targetPath: "/attendance-management", element: '[class*="container"]', popover: { title: "3. Bảng Chấm công Tổng hợp", description: "Màn hình tổng hợp dữ liệu check-in/check-out của toàn bộ nhân viên theo ngày.", side: "bottom" } },
              { targetPath: "/attendance-management", element: '[class*="dayDate"], [class*="dayDow"]', allowMissing: true, popover: { title: "4. Điều hướng theo Ngày", description: "Chọn ngày/khoảng thời gian cần xem để hệ thống hiển thị đúng dữ liệu chấm công.", side: "bottom" } },
              { targetPath: "/attendance-management", element: 'table, [class*="detailRow"]', allowMissing: true, popover: { title: "5. Chi tiết Giờ vào/ra", description: "Theo dõi giờ check-in và check-out (chipCheckout) của từng nhân viên theo từng ngày làm việc.", side: "top" } },
              { targetPath: "/attendance-management", element: '[class*="addBtn"], [class*="formGroup"]', allowMissing: true, popover: { title: "6. Bổ sung Công thủ công", description: "Thêm/điều chỉnh công thủ công cho các trường hợp đã được duyệt đơn giải trình chấm công bù.", side: "bottom" } }
            ]
          },
          {
            id: "2.7.5",
            number: "2.7.5.",
            title: "Cấu hình Vị trí chấm công QR & GPS",
            desc: "Khai báo vị trí chấm công kèm tọa độ GPS, bán kính hợp lệ và in mã QR dán tại garage (/attendance-locations).",
            targetPath: "/attendance-locations",
            content: {
              overview: "Chấm công QR chỉ hợp lệ khi tọa độ GPS của thiết bị nhân viên nằm trong bán kính cho phép quanh Vị trí chấm công đã khai báo. Trang /attendance-locations là nơi Quản lý khai báo các vị trí này (tên, địa chỉ, tọa độ, bán kính) và in mã QR để dán tại quầy/xưởng cho nhân viên quét.",
              steps: [
                "1. Truy cập menu 'Ca làm & Chấm công' -> 'Vị trí chấm công (QR)' (/attendance-locations).",
                "2. Bấm thêm vị trí mới và nhập tên, địa chỉ vị trí chấm công.",
                "3. Bấm nút lấy tọa độ GPS hiện tại hoặc chọn điểm trực tiếp trên bản đồ.",
                "4. Thiết lập bán kính hợp lệ (mét) - nhân viên phải đứng trong phạm vi này thì chấm công mới được ghi nhận.",
                "5. Lưu vị trí, sau đó mở trang in mã QR (/attendance-locations/:locationId/qr-print) để in và dán mã tại garage."
              ]
            },
            sandboxType: "attendance_location",
            quiz: {
              question: "Thiết lập 'bán kính hợp lệ' tại Vị trí chấm công có tác dụng gì?",
              options: [
                "Giới hạn phạm vi GPS mà nhân viên phải đứng trong đó thì lượt chấm công mới được ghi nhận",
                "Giới hạn số lượng nhân viên được chấm công",
                "Quy định số ngày công tối đa trong tháng",
                "Quy định kích thước tờ giấy in mã QR"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-attendance"]', popover: { title: "1. Menu Ca làm & Chấm công", description: "Nhấp mở danh mục 'Ca làm & Chấm công' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="attendance-locations"]', popover: { title: "2. Chọn Vị trí chấm công (QR)", description: "Nhấp chọn 'Vị trí chấm công (QR)' để mở màn hình khai báo vị trí (/attendance-locations).", side: "right" } },
              { targetPath: "/attendance-locations", element: '[class*="header"]', popover: { title: "3. Danh sách Vị trí chấm công", description: "Xem các vị trí chấm công đã khai báo kèm tọa độ (coordCell) và trạng thái hoạt động.", side: "bottom" } },
              { targetPath: "/attendance-locations", element: '[class*="formGroup"], [class*="formRow"]', allowMissing: true, popover: { title: "4. Khai báo Vị trí mới", description: "Nhập tên và địa chỉ vị trí chấm công (VD: Quầy lễ tân, Cổng xưởng dịch vụ).", side: "bottom" } },
              { targetPath: "/attendance-locations", element: '[class*="gpsBtn"]', allowMissing: true, popover: { title: "5. Lấy Tọa độ GPS", description: "Bấm nút lấy tọa độ GPS hiện tại của thiết bị hoặc chọn trực tiếp điểm trên bản đồ.", side: "bottom" } },
              { targetPath: "/attendance-locations", element: '[class*="mapContainer"], [class*="mapHint"]', allowMissing: true, popover: { title: "6. Bản đồ & Bán kính hợp lệ", description: "Thiết lập bán kính (mét) - nhân viên phải đứng trong phạm vi này thì chấm công mới hợp lệ.", side: "top" } },
              { targetPath: "/attendance-locations", element: '[class*="actionGroup"] button, [class*="editBtn"]', allowMissing: true, popover: { title: "7. Nút In Mã QR Chấm công", description: "Lưu vị trí rồi bấm nút in mã QR trên dòng vị trí tương ứng.", side: "left" } },
              { targetPath: "/attendance-locations/1/qr-print", element: 'main, body', allowMissing: true, popover: { title: "8. Trang In Mã QR (/attendance-locations/:locationId/qr-print)", description: "Trang xuất bản mã QR khổ in - in ra và dán tại quầy/xưởng để nhân viên quét chấm công hàng ngày.", side: "bottom" } }
            ]
          },
          {
            id: "2.7.6",
            number: "2.7.6.",
            title: "Duyệt đơn xin nghỉ & Chấm công bù",
            desc: "Tiếp nhận và phê duyệt các đơn xin nghỉ phép, đi muộn/về sớm, giải trình chấm công bù của nhân viên (/attendance-request-management).",
            targetPath: "/attendance-request-management",
            content: {
              overview: "Khi nhân viên gửi đơn tại /attendance-requests, đơn sẽ chuyển tới hộp duyệt của Quản lý tại /attendance-request-management. Quản lý xem lý do, đối chiếu dữ liệu chấm công thực tế rồi bấm Duyệt hoặc Từ chối. Đơn được duyệt sẽ tự động điều chỉnh vào bảng chấm công tổng hợp.",
              steps: [
                "1. Truy cập menu 'Ca làm & Chấm công' -> 'Duyệt đơn chấm công' (/attendance-request-management).",
                "2. Lọc danh sách theo trạng thái 'Chờ duyệt' để xử lý các đơn mới gửi.",
                "3. Mở chi tiết đơn để xem loại đơn, ngày áp dụng và lý do nhân viên trình bày.",
                "4. Đối chiếu với dữ liệu chấm công thực tế tại /attendance-management để xác minh.",
                "5. Bấm 'Duyệt' để chấp thuận (hệ thống tự điều chỉnh công) hoặc 'Từ chối' kèm lý do phản hồi cho nhân viên."
              ]
            },
            sandboxType: "attendance_approval",
            quiz: {
              question: "Sau khi Quản lý bấm Duyệt một đơn chấm công bù, điều gì xảy ra?",
              options: [
                "Hệ thống tự động điều chỉnh dữ liệu vào bảng chấm công tổng hợp của nhân viên",
                "Đơn bị xóa khỏi hệ thống",
                "Nhân viên phải nộp lại đơn bản giấy",
                "Không có gì thay đổi"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-attendance"]', popover: { title: "1. Menu Ca làm & Chấm công", description: "Nhấp mở danh mục 'Ca làm & Chấm công' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="attendance-request-management"]', popover: { title: "2. Chọn Duyệt đơn chấm công", description: "Nhấp chọn 'Duyệt đơn chấm công' để mở hộp duyệt đơn từ nhân sự (/attendance-request-management).", side: "right" } },
              { targetPath: "/attendance-request-management", element: '[class*="header"]', popover: { title: "3. Hộp Duyệt đơn", description: "Màn hình tập trung toàn bộ đơn xin nghỉ phép, đi muộn/về sớm và chấm công bù đang chờ xử lý.", side: "bottom" } },
              { targetPath: "/attendance-request-management", element: 'table, [class*="container"]', popover: { title: "4. Danh sách Đơn chờ duyệt", description: "Lọc theo trạng thái 'Chờ duyệt' để ưu tiên xử lý các đơn nhân viên mới gửi.", side: "top" } },
              { targetPath: "/attendance-request-management", element: '[class*="modalContent"], [class*="modalBody"]', allowMissing: true, popover: { title: "5. Chi tiết Đơn từ", description: "Mở chi tiết để xem loại đơn, ngày áp dụng và lý do nhân viên trình bày trước khi quyết định.", side: "bottom" } },
              { targetPath: "/attendance-request-management", element: '[class*="approveBtn"], [class*="actionGroup"] button', allowMissing: true, popover: { title: "6. Duyệt hoặc Từ chối", description: "Bấm 'Duyệt' để chấp thuận (hệ thống tự điều chỉnh công) hoặc 'Từ chối' kèm lý do phản hồi nhân viên.", side: "left" } }
            ]
          },
          {
            id: "2.7.7",
            number: "2.7.7.",
            title: "Gửi thông báo nội bộ cho nhân viên",
            desc: "Soạn và gửi thông báo tới toàn bộ hoặc nhóm nhân viên theo vai trò (/staff-notification-sender).",
            targetPath: "/staff-notification-sender",
            content: {
              overview: "Trang Thông báo nhân viên (/staff-notification-sender) dùng để phổ biến thông tin nội bộ: lịch họp, thay đổi quy trình, thông báo khẩn ca làm việc. Thông báo có thể gửi tới toàn bộ nhân sự hoặc chỉ nhóm vai trò cụ thể, và nhân viên sẽ nhận được ngay trên chuông thông báo cũng như thông báo đẩy trên thiết bị.",
              steps: [
                "1. Truy cập menu 'Nhân sự' -> 'Thông báo nhân viên' (/staff-notification-sender).",
                "2. Soạn tiêu đề và nội dung thông báo cần phổ biến.",
                "3. Chọn nhóm người nhận: toàn bộ nhân viên hoặc lọc theo vai trò nghiệp vụ cụ thể.",
                "4. Kiểm tra khung xem trước (preview) để đảm bảo nội dung hiển thị đúng như khi nhân viên nhận được.",
                "5. Bấm gửi - thông báo xuất hiện ngay trên chuông thông báo và trang /notifications của người nhận."
              ]
            },
            sandboxType: "staff_notification",
            quiz: {
              question: "Nhân viên nhận thông báo nội bộ được gửi từ /staff-notification-sender ở đâu?",
              options: [
                "Trên chuông thông báo Header và trang Thông báo (/notifications) của mình",
                "Qua đường bưu điện",
                "Trên hóa đơn thanh toán của khách",
                "Trên trang Quản lý kho"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-hr"]', popover: { title: "1. Menu Nhân sự", description: "Nhấp mở danh mục 'Nhân sự' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="staff-notification-sender"]', popover: { title: "2. Chọn Thông báo nhân viên", description: "Nhấp chọn 'Thông báo nhân viên' để mở màn hình soạn thông báo nội bộ (/staff-notification-sender).", side: "right" } },
              { targetPath: "/staff-notification-sender", element: '[class*="header"], [class*="eyebrow"]', popover: { title: "3. Tổng quan Thông báo nội bộ", description: "Màn hình phổ biến thông tin nội bộ: lịch họp, thay đổi quy trình, thông báo khẩn ca làm việc.", side: "bottom" } },
              { targetPath: "/staff-notification-sender", element: '[class*="panel"], [class*="grid"]', popover: { title: "4. Soạn Nội dung Thông báo", description: "Nhập tiêu đề và nội dung chi tiết của thông báo cần gửi tới nhân viên.", side: "bottom" } },
              { targetPath: "/staff-notification-sender", element: '[class*="recipientBox"]', allowMissing: true, popover: { title: "5. Chọn Nhóm người nhận", description: "Chọn gửi toàn bộ nhân viên hoặc lọc theo vai trò nghiệp vụ cụ thể (Lễ tân, KTV, Thủ kho...).", side: "bottom" } },
              { targetPath: "/staff-notification-sender", element: '[class*="preview"], [class*="previewHeader"]', allowMissing: true, popover: { title: "6. Xem trước Thông báo", description: "Kiểm tra khung preview để đảm bảo nội dung hiển thị đúng như khi nhân viên nhận được.", side: "left" } },
              { targetPath: "/staff-notification-sender", element: '[class*="primaryButton"]', allowMissing: true, popover: { title: "7. Gửi Thông báo", description: "Bấm gửi - thông báo xuất hiện ngay trên chuông thông báo và trang /notifications của người nhận.", side: "top" } }
            ]
          }
        ]
      },
      {
        id: "2.8",
        number: "2.8.",
        title: "Phân hệ Báo cáo, Hệ thống & Quản trị",
        topics: [
          {
            id: "2.8.1",
            number: "2.8.1.",
            title: "Quản lý KPI nhân viên",
            desc: "Thiết lập chỉ tiêu KPI theo vai trò và theo dõi điểm số hiệu suất của từng nhân viên (/kpi-management).",
            targetPath: "/kpi-management",
            content: {
              overview: "Trang Quản lý KPI (/kpi-management) cho phép Quản lý cấu hình bộ chỉ tiêu đánh giá riêng cho từng vai trò (số phiếu xử lý, doanh thu mang về, mức độ hài lòng khách hàng...) và theo dõi điểm số tổng hợp của từng nhân viên theo kỳ - làm căn cứ minh bạch cho việc xét thưởng.",
              steps: [
                "1. Truy cập menu 'Tài chính & Doanh thu' -> 'Quản lý KPI nhân viên' (/kpi-management).",
                "2. Xem bảng điểm KPI tổng hợp của nhân viên trong kỳ đang chọn.",
                "3. Mở chi tiết một nhân viên để xem điểm số lớn (big score) và bảng phân rã theo từng tiêu chí.",
                "4. Vào khu vực cấu hình để thiết lập chỉ tiêu (target) KPI riêng cho từng vai trò nghiệp vụ.",
                "5. Lưu cấu hình - hệ thống tự tính lại điểm KPI theo dữ liệu công việc thực tế phát sinh."
              ]
            },
            sandboxType: "kpi",
            quiz: {
              question: "Chỉ tiêu KPI trong hệ thống được thiết lập theo cách nào?",
              options: [
                "Cấu hình riêng cho từng vai trò nghiệp vụ, hệ thống tự tính điểm theo dữ liệu công việc thực tế",
                "Áp dụng chung một chỉ tiêu duy nhất cho mọi vai trò",
                "Nhân viên tự nhập điểm cho mình",
                "Khách hàng chấm điểm trực tiếp và tính luôn là KPI"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="finance"]', popover: { title: "1. Nhóm Tài chính & Doanh thu", description: "Mở nhóm 'Tài chính & Doanh thu' trên thanh menu điều hướng bên trái.", side: "right" } },
              { element: '[data-tour-id="kpi-management"]', popover: { title: "2. Chọn Quản lý KPI nhân viên", description: "Nhấp chọn 'Quản lý KPI nhân viên' để mở màn hình đánh giá hiệu suất (/kpi-management).", side: "right" } },
              { targetPath: "/kpi-management", element: '[class*="cardSection"], table', popover: { title: "3. Bảng điểm KPI Tổng hợp", description: "Theo dõi điểm KPI của toàn bộ nhân viên trong kỳ đánh giá đang chọn.", side: "bottom" } },
              { targetPath: "/kpi-management", element: '[class*="bigScoreCard"]', allowMissing: true, popover: { title: "4. Điểm số Tổng của Nhân viên", description: "Mở chi tiết một nhân viên để xem điểm số tổng hợp nổi bật của kỳ đánh giá.", side: "bottom" } },
              { targetPath: "/kpi-management", element: '[class*="breakdownGrid"], [class*="breakdownSection"]', allowMissing: true, popover: { title: "5. Phân rã theo Tiêu chí", description: "Xem bảng phân rã điểm theo từng tiêu chí: số phiếu xử lý, doanh thu mang về, mức hài lòng khách hàng.", side: "bottom" } },
              { targetPath: "/kpi-management", element: '[class*="configCard"], [class*="configGrid"]', allowMissing: true, popover: { title: "6. Cấu hình Chỉ tiêu theo Vai trò", description: "Thiết lập target KPI riêng cho từng vai trò nghiệp vụ (configRoleTitle) rồi lưu để hệ thống tính lại điểm.", side: "top" } }
            ]
          },
          {
            id: "2.8.2",
            number: "2.8.2.",
            title: "Nhật ký hoạt động hệ thống (System Logs)",
            desc: "Tra cứu lịch sử thao tác của người dùng trên toàn hệ thống phục vụ đối soát và điều tra sự cố (/system-log-management).",
            targetPath: "/system-log-management",
            content: {
              overview: "Nhật ký hệ thống (/system-log-management) ghi lại toàn bộ hành vi quan trọng của người dùng: ai đăng nhập, ai sửa giá, ai duyệt phiếu xuất kho, ai xóa dữ liệu - kèm thời điểm và thông tin chi tiết. Đây là công cụ then chốt để Admin đối soát trách nhiệm khi có sự cố hoặc nghi vấn thất thoát.",
              steps: [
                "1. Truy cập menu 'Hệ thống' -> 'Nhật ký hệ thống' (/system-log-management).",
                "2. Xem các thẻ thống kê tổng quan số lượng thao tác đã ghi nhận.",
                "3. Dùng bộ lọc theo khoảng thời gian, loại hành động hoặc người thực hiện để thu hẹp phạm vi tra cứu.",
                "4. Gõ từ khóa vào ô tìm kiếm để truy vết một bản ghi/đối tượng cụ thể.",
                "5. Mở chi tiết một dòng nhật ký để xem đầy đủ dữ liệu trước - sau thay đổi phục vụ đối soát."
              ]
            },
            sandboxType: "system_log",
            quiz: {
              question: "Nhật ký hệ thống (/system-log-management) phục vụ mục đích chính nào?",
              options: [
                "Truy vết ai đã thao tác gì, khi nào - để đối soát trách nhiệm khi có sự cố hoặc nghi vấn thất thoát",
                "Gửi email quảng cáo cho khách hàng",
                "Tính lương cho nhân viên",
                "Đặt lịch bảo dưỡng cho xe"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-system"]', popover: { title: "1. Menu Hệ thống", description: "Nhấp mở danh mục 'Hệ thống' trên thanh menu điều hướng bên trái (chỉ Admin nhìn thấy).", side: "right" } },
              { element: '[data-tour-id="system-log-management"]', popover: { title: "2. Chọn Nhật ký hệ thống", description: "Nhấp chọn 'Nhật ký hệ thống' để mở màn hình tra cứu lịch sử thao tác (/system-log-management).", side: "right" } },
              { targetPath: "/system-log-management", element: '[class*="statLabel"], [class*="page"]', popover: { title: "3. Thống kê Tổng quan", description: "Xem nhanh số lượng thao tác đã được hệ thống ghi nhận trong kỳ đang xem.", side: "bottom" } },
              { targetPath: "/system-log-management", element: '[class*="filterGrid"]', popover: { title: "4. Bộ lọc Nhật ký", description: "Lọc theo loại hành động, người thực hiện hoặc khoảng thời gian (dateRange) để thu hẹp phạm vi tra cứu.", side: "bottom" } },
              { targetPath: "/system-log-management", element: '[class*="searchInput"], [class*="searchArea"]', popover: { title: "5. Tìm kiếm Bản ghi", description: "Gõ từ khóa (mã phiếu, biển số xe, tên người dùng) để truy vết một đối tượng cụ thể.", side: "bottom" } },
              { targetPath: "/system-log-management", element: 'table', popover: { title: "6. Bảng Nhật ký Thao tác", description: "Danh sách chi tiết từng thao tác kèm thời điểm, người thực hiện và đối tượng bị tác động.", side: "top" } },
              { targetPath: "/system-log-management", element: '[class*="detailList"], [class*="modal"]', allowMissing: true, popover: { title: "7. Chi tiết Thay đổi", description: "Mở chi tiết một dòng để xem đầy đủ dữ liệu trước - sau khi thay đổi, phục vụ đối soát trách nhiệm.", side: "bottom" } },
              { targetPath: "/system-log-management", element: '[class*="pagination"], [class*="pageInfo"]', allowMissing: true, popover: { title: "8. Phân trang Kết quả", description: "Dùng thanh phân trang để duyệt qua khối lượng nhật ký lớn theo từng trang.", side: "top" } }
            ]
          },
          {
            id: "2.8.3",
            number: "2.8.3.",
            title: "Log kỹ thuật Backend (Backend Logs)",
            desc: "Xem log kỹ thuật thời gian thực của máy chủ để chẩn đoán lỗi hệ thống (/backend-logs).",
            targetPath: "/backend-logs",
            content: {
              overview: "Khác với Nhật ký hệ thống ghi hành vi nghiệp vụ của người dùng, trang Log Backend (/backend-logs) hiển thị log kỹ thuật của máy chủ theo dạng console: thông báo INFO, cảnh báo WARN và lỗi ERROR. Đây là công cụ để Admin/kỹ thuật chẩn đoán nhanh nguyên nhân khi hệ thống gặp sự cố.",
              steps: [
                "1. Truy cập menu 'Hệ thống' -> 'Log Backend' (/backend-logs).",
                "2. Chọn mức log cần xem (INFO / WARN / ERROR) để lọc bớt nhiễu.",
                "3. Theo dõi khung console hiển thị log theo thời gian thực kèm mốc thời gian và tên logger.",
                "4. Đọc nội dung dòng log lỗi để xác định module đang gặp vấn đề.",
                "5. Kết hợp đối chiếu với Nhật ký hệ thống (/system-log-management) để dựng lại bối cảnh thao tác dẫn tới lỗi."
              ]
            },
            sandboxType: "backend_log",
            quiz: {
              question: "Khác biệt giữa Log Backend (/backend-logs) và Nhật ký hệ thống (/system-log-management) là gì?",
              options: [
                "Backend Logs là log kỹ thuật của máy chủ; System Logs ghi hành vi nghiệp vụ của người dùng",
                "Hai trang hiển thị cùng một dữ liệu",
                "Backend Logs dành cho khách hàng xem",
                "System Logs chỉ hiển thị lỗi lập trình"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-system"]', popover: { title: "1. Menu Hệ thống", description: "Nhấp mở danh mục 'Hệ thống' trên thanh menu điều hướng bên trái (chỉ Admin nhìn thấy).", side: "right" } },
              { element: '[data-tour-id="backend-logs"]', popover: { title: "2. Chọn Log Backend", description: "Nhấp chọn 'Log Backend' để mở khung xem log kỹ thuật máy chủ (/backend-logs).", side: "right" } },
              { targetPath: "/backend-logs", element: '[class*="header"]', popover: { title: "3. Tổng quan Log Backend", description: "Màn hình theo dõi log kỹ thuật máy chủ theo thời gian thực để chẩn đoán sự cố hệ thống.", side: "bottom" } },
              { targetPath: "/backend-logs", element: '[class*="levelSelect"]', popover: { title: "4. Chọn Mức Log", description: "Lọc theo mức INFO / WARN / ERROR để tập trung vào các dòng log thực sự cần quan tâm.", side: "bottom" } },
              { targetPath: "/backend-logs", element: '[class*="levelStats"]', allowMissing: true, popover: { title: "5. Thống kê theo Mức", description: "Theo dõi nhanh số lượng log ở từng mức để đánh giá mức độ nghiêm trọng của sự cố.", side: "bottom" } },
              { targetPath: "/backend-logs", element: '[class*="console"]', popover: { title: "6. Khung Console Log", description: "Đọc nội dung log kèm mốc thời gian (logTime), tên logger và thông điệp lỗi để xác định module gặp vấn đề.", side: "top" } },
              { targetPath: "/backend-logs", element: '[class*="actionBtn"]', allowMissing: true, popover: { title: "7. Thao tác trên Log", description: "Làm mới hoặc tải log về máy để gửi cho đội kỹ thuật phân tích sâu hơn khi cần.", side: "left" } }
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
