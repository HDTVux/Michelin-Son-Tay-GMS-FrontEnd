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
            title: "Tiếp nhận xe & Tạo lịch hẹn",
            desc: "Đón tiếp khách hàng, nhập thông tin xe, số km và triệu chứng yêu cầu.",
            content: {
              overview: "Lễ tân là điểm chạm đầu tiên. Cần ghi nhận chính xác biển số xe, tên khách hàng và tình trạng xe khi vào garage.",
              steps: [
                "1. Vào menu 'Khách hàng & Lịch hẹn' -> 'Quản lý lịch hẹn'.",
                "2. Bấm nút '+ Tạo lịch giữ chỗ' hoặc 'Tiếp nhận xe trực tiếp'.",
                "3. Quét mã QR đăng kiểm hoặc nhập tay Biển số xe & Tên chủ xe.",
                "4. Ghi nhận số KM hiện tại và yêu cầu bảo dưỡng của khách."
              ]
            },
            sandboxType: "booking",
            quiz: {
              question: "Thông tin quan trọng nhất Lễ tân cần ghi nhận khi khách hàng đưa xe vào garage là gì?",
              options: [
                "Biển số xe, Tên khách hàng & Số KM thực tế",
                "Màu sơn xe",
                "Sở thích nghe nhạc của khách",
                "Giá xe trên thị trường"
              ],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="sub-booking"]', popover: { title: "Khách hàng & Lịch hẹn", description: "Quản lý danh bạ khách, tạo lịch hẹn giữ chỗ và hàng chờ.", side: "right" } },
              { element: '[data-tour-id="booking-management"]', popover: { title: "Quản lý lịch hẹn", description: "Xem danh sách xe đã đặt trước và tiếp nhận xe vào xưởng.", side: "right" } }
            ]
          },
          {
            id: "2.1.2",
            number: "2.1.2.",
            title: "Quản lý hàng chờ & Điều phối xe",
            desc: "Theo dõi vị trí xe trong hàng chờ và chuyển cho Cố vấn dịch vụ.",
            content: {
              overview: "Giúp tối ưu thời gian chờ của khách và phân bổ xe vào các cầu nâng khả dụng.",
              steps: [
                "1. Truy cập 'Quản lý hàng chờ đặt lịch'.",
                "2. Kiểm tra danh sách xe đang đợi (Status: WAITING).",
                "3. Bấm 'Giao cho Cố vấn' để chuyển xe sang công đoạn khảo sát."
              ]
            },
            sandboxType: "queue",
            quiz: {
              question: "Trạng thái xe trong hàng chờ chưa được nhận khảo sát là gì?",
              options: ["COMPLETED", "WAITING (Đang chờ)", "CANCELLED", "PAID"],
              correctIndex: 1
            },
            tourSteps: [
              { element: '[data-tour-id="queue-management"]', popover: { title: "Hàng chờ đặt lịch", description: "Xem danh sách xe đang chờ điều phối vào khu vực dịch vụ.", side: "right" } }
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
            title: "Lập phiếu khảo sát an toàn 32 hạng mục",
            desc: "Khảo sát lốp Michelin, phanh, gầm, ắc quy và dầu nhớt động cơ.",
            content: {
              overview: "Phiếu khảo sát an toàn giúp phát hiện sớm các nguy cơ hư hỏng và tư vấn gói bảo dưỡng tối ưu cho khách hàng.",
              steps: [
                "1. Mở phân hệ 'Điều phối phiếu dịch vụ'.",
                "2. Tiến hành kiểm tra độ sâu rãnh lốp Michelin, áp suất lốp và hệ thống phanh.",
                "3. Đánh dấu trạng thái hạng mục: Đạt (Xanh), Cần chú ý (Vàng), Nguy hiểm (Đỏ).",
                "4. Chụp ảnh bằng chứng thực tế đính kèm phiếu."
              ]
            },
            sandboxType: "inspection",
            quiz: {
              question: "Màu Đỏ trên phiếu kiểm tra hạng mục lốp/phanh thể hiện điều gì?",
              options: [
                "Đạt tiêu chuẩn an toàn tốt",
                "Mức độ Nguy hiểm - Cần thay thế/sửa chữa gấp",
                "Khách hàng đã thanh toán",
                "Hàng mới nhập kho"
              ],
              correctIndex: 1
            },
            tourSteps: [
              { element: '[data-tour-id="advisor-inspection"]', popover: { title: "Điều phối phiếu dịch vụ", description: "Thực hiện khảo sát an toàn và lập báo giá tư vấn cho khách.", side: "right" } }
            ]
          },
          {
            id: "2.2.2",
            number: "2.2.2.",
            title: "Tạo báo giá & Xin duyệt từ Khách hàng",
            desc: "Lập bảng dự toán chi phí phụ tùng, công thợ và gửi khách duyệt.",
            content: {
              overview: "Báo giá rõ ràng minh bạch là uy tín của Michelin Sơn Tây. Chỉ tiến hành sửa chữa sau khi khách hàng đồng ý duyệt.",
              steps: [
                "1. Thêm phụ tùng lốp/dầu/mỡ và dịch vụ tương ứng vào bảng báo giá.",
                "2. Áp dụng mã giảm giá / Voucher ưu đãi (nếu có).",
                "3. Nhấn 'Gửi báo giá cho khách' (qua Zalo/App hoặc xác nhận trực tiếp).",
                "4. Chuyển trạng thái phiếu sang 'Khách đã duyệt (APPROVED)'."
              ]
            },
            sandboxType: "quotation",
            quiz: {
              question: "Kỹ thuật viên chỉ bắt đầu làm việc khi phiếu dịch vụ ở trạng thái nào?",
              options: ["DRAFT (Bản nháp)", "Khách đã duyệt (APPROVED)", "REJECTED", "CANCELLED"],
              correctIndex: 1
            },
            tourSteps: [
              { element: '[data-tour-id="service-ticket-management"]', popover: { title: "Phiếu dịch vụ", description: "Danh sách tổng hợp báo giá và phiếu dịch vụ đang thực hiện.", side: "right" } }
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
            desc: "Tiếp nhận phiếu công việc được giao và kiểm tra vật tư thay thế.",
            content: {
              overview: "Kỹ thuật viên nhận thông báo công việc tức thì trên bảng làm việc My Tasks.",
              steps: [
                "1. Mở menu 'Công việc hôm nay' (My Tasks).",
                "2. Xem danh sách các việc cần làm (Thay lốp, Cân chỉnh thước lái, Thay dầu).",
                "3. Nhấn 'Bắt đầu làm việc' để ghi nhận thời gian thợ."
              ]
            },
            sandboxType: "mytasks",
            quiz: {
              question: "Nơi nào giúp Kỹ thuật viên biết chính xác xe nào cần sửa chữa hôm nay?",
              options: ["Trang Quản lý Slider", "Menu 'Công việc hôm nay' (My Tasks)", "Quản lý Báo cáo Doanh thu", "Bảng lương nhân viên"],
              correctIndex: 1
            },
            tourSteps: [
              { element: '[data-tour-id="my-tasks"]', popover: { title: "Công việc hôm nay", description: "Giao diện làm việc của Kỹ thuật viên để cập nhật tiến độ công việc.", side: "right" } }
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
            title: "Tạo phiếu nhập kho & Quét mã QR",
            desc: "Nhập vỏ lốp Michelin, dầu nhờn từ Nhà cung cấp vào hệ thống.",
            content: {
              overview: "Đảm bảo dữ liệu tồn kho thực tế trùng khớp tuyệt đối với số lượng trên phần mềm.",
              steps: [
                "1. Vào 'Kho & Phụ tùng' -> 'Quản lý phiếu nhập'.",
                "2. Chọn Nhà cung cấp & Bấm '+ Tạo phiếu nhập kho'.",
                "3. Quét mã QR/Barcode trên tem lốp Michelin để tự động nhận diện SKU và vị trí khay/kệ kho."
              ]
            },
            sandboxType: "stockin",
            quiz: {
              question: "Công cụ nào giúp Thủ kho / Quản lý kho nhập mã lốp Michelin nhanh chóng không cần gõ tay?",
              options: ["Thiết bị Quét mã QR / Barcode", "Máy in hóa đơn", "Bảng tính Excel", "Thước đo độ sâu"],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="warehouse-management"]', popover: { title: "Quản lý kho", description: "Tổng quan vị trí khay kệ, tồn kho lốp và phụ tùng ô tô.", side: "right" } },
              { element: '[data-tour-id="warehouse-stock-entries"]', popover: { title: "Quản lý phiếu nhập", description: "Lập và theo dõi các đợt nhập phụ tùng mới vào kho.", side: "right" } }
            ]
          },
          {
            id: "2.4.2",
            number: "2.4.2.",
            title: "Nghiệp vụ Quản lý kho & Kiểm kê định kỳ",
            desc: "Phê duyệt phiếu nhập/xuất kho, thiết lập định mức tồn kho tối thiểu & xử lý lệch tồn kho.",
            content: {
              overview: "Quản lý kho chịu trách nhiệm tối ưu hóa luồng vật tư, cảnh báo thiếu lốp Michelin và phê duyệt toàn bộ phiếu xuất nhập.",
              steps: [
                "1. Thiết lập ngưỡng tồn kho tối thiểu (Safety Stock Level) cho từng cỡ lốp Michelin.",
                "2. Duyệt phiếu yêu cầu xuất phụ tùng từ Cố vấn dịch vụ / Kỹ thuật viên.",
                "3. Thực hiện kiểm kê kho định kỳ (Physical Count) và tạo phiếu điều chỉnh chênh lệch số liệu thực tế."
              ]
            },
            sandboxType: "warehouse_manager",
            quiz: {
              question: "Nhiệm vụ chính của Quản lý kho khi số lượng lốp Michelin trong kho xuống dưới ngưỡng an toàn là gì?",
              options: ["Cảnh báo hệ thống & Đề xuất tạo đơn nhập kho mới", "Tắt hệ thống phần mềm", "Tự ý tăng giá lốp", "Xóa bớt phiếu cũ"],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="warehouse-management"]', popover: { title: "Quản lý kho", description: "Màn hình dành riêng cho Quản lý kho để duyệt phiếu và kiểm soát tồn kho.", side: "right" } }
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
