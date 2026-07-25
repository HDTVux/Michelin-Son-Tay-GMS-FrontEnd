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
        title: "Tổng quan hệ thống Michelin Sơn Tây GMS",
        desc: "Khái quát toàn bộ các phân hệ nghiệp vụ trong garage từ Lễ tân đến Thu ngân.",
        content: {
          overview: "Michelin Sơn Tây GMS là hệ thống quản lý tổng thể chuỗi dịch vụ bảo dưỡng, sửa chữa ô tô và vật tư kho. Hệ thống bao gồm 5 phân hệ cốt lõi liên kết chặt chẽ với nhau.",
          steps: [
            "1. Lễ tân tiếp nhận xe, mở hàng chờ và ghi nhận yêu cầu của khách hàng.",
            "2. Cố vấn dịch vụ khảo sát an toàn 32 hạng mục và lập báo giá chi tiết.",
            "3. Kỹ thuật viên thực hiện các công việc sửa chữa theo phiếu được giao.",
            "4. Thủ kho xuất phụ tùng và vật tư thay thế chính hãng Michelin.",
            "5. Thu ngân kiểm tra hóa đơn, áp dụng khuyến mãi và thu tiền."
          ]
        },
        sandboxType: "overview",
        quiz: {
          question: "Thứ tự luồng làm việc tiêu chuẩn trên hệ thống Michelin GMS là gì?",
          options: [
            "Lễ tân tiếp nhận -> Cố vấn báo giá -> Kỹ thuật làm việc -> Thủ kho xuất hàng -> Thu ngân thanh toán",
            "Thu ngân thanh toán -> Kỹ thuật làm việc -> Cố vấn báo giá",
            "Thủ kho xuất hàng trước -> Lễ tân tiếp nhận sau",
            "Cố vấn tự sửa chữa không cần Kỹ thuật viên"
          ],
          correctIndex: 0
        },
        tourSteps: [
          { element: '[data-tour-id="general"]', popover: { title: "1.1 Màn hình chung", description: "Nơi truy cập Dashboard và Tài liệu hướng dẫn hệ thống.", side: "right" } },
          { element: '[data-tour-id="dashboard"]', popover: { title: "Dashboard tổng quan", description: "Xem nhanh chỉ số doanh thu, lịch hẹn và phiếu dịch vụ hôm nay.", side: "right" } }
        ]
      },
      {
        id: "1.2",
        number: "1.2.",
        title: "Đăng nhập, đổi mật khẩu & Hồ sơ cá nhân",
        desc: "Quản lý tài khoản nhân viên, bảo mật mật khẩu và cập nhật thông tin cá nhân.",
        content: {
          overview: "Mỗi nhân viên được cấp một tài khoản định danh kèm mã số nhân viên (EmployeeNo) và vai trò tương ứng (Role).",
          steps: [
            "1. Nhập Tên đăng nhập / Email và Mật khẩu tại màn hình `/login`.",
            "2. Truy cập 'Hồ sơ nhân viên' từ menu Dropdown ảnh đại diện góc trên góc trái.",
            "3. Thay đổi mật khẩu định kỳ 90 ngày để đảm bảo an toàn hệ thống."
          ]
        },
        sandboxType: "profile",
        quiz: {
          question: "Nơi nào cho phép bạn cập nhật thông tin cá nhân và đổi mật khẩu?",
          options: [
            "Trang Đăng nhập",
            "Menu Dropdown Tài khoản góc trên Sidebar -> Hồ sơ nhân viên",
            "Phân hệ Quản lý Kho",
            "Cài đặt trình duyệt"
          ],
          correctIndex: 1
        },
        tourSteps: [
          { element: '.sidebar__profile', popover: { title: "Tài khoản cá nhân", description: "Bấm vào ảnh đại diện để mở Menu Hồ sơ & Đổi mật khẩu.", side: "bottom" } }
        ]
      },
      {
        id: "1.3",
        number: "1.3.",
        title: "Thanh công cụ & Ô tìm kiếm nhanh (Ctrl + K)",
        desc: "Hướng dẫn tra cứu tức thì chức năng, phiếu dịch vụ và thông tin khách hàng.",
        content: {
          overview: "Hệ thống hỗ trợ công cụ Universal Search tích hợp sẵn. Nhấn phím Ctrl + K (hoặc Cmd + K) để mở khung tìm kiếm tức thì.",
          steps: [
            "1. Nhấn phím tắt Ctrl + K ở bất kỳ màn hình nào.",
            "2. Gõ biển số xe, tên khách hàng hoặc mã phiếu dịch vụ (ví dụ: '29A-888.88').",
            "3. Sử dụng phím mũi tên lên/xuống để chọn và bấm Enter để tới trang chi tiết."
          ]
        },
        sandboxType: "search",
        quiz: {
          question: "Tổ hợp phím tắt nào giúp mở ô Tìm kiếm nhanh tức thì?",
          options: ["Ctrl + C", "Ctrl + K (hoặc Cmd + K)", "Alt + F4", "Shift + Enter"],
          correctIndex: 1
        },
        tourSteps: [
          { element: '.sidebar__search-wrapper', popover: { title: "Ô Tìm kiếm nhanh", description: "Gõ từ khóa để tra cứu chức năng hoặc tìm phiếu dịch vụ.", side: "bottom" } }
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
              question: "Công cụ nào giúp Thủ kho nhập mã lốp Michelin nhanh chóng không cần gõ tay?",
              options: ["Thiết bị Quét mã QR / Barcode", "Máy in hóa đơn", "Bảng tính Excel", "Thước đo độ sâu"],
              correctIndex: 0
            },
            tourSteps: [
              { element: '[data-tour-id="warehouse-management"]', popover: { title: "Quản lý kho", description: "Tổng quan vị trí khay kệ, tồn kho lốp và phụ tùng ô tô.", side: "right" } },
              { element: '[data-tour-id="warehouse-stock-entries"]', popover: { title: "Quản lý phiếu nhập", description: "Lập và theo dõi các đợt nhập phụ tùng mới vào kho.", side: "right" } }
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
    description: "Sơ đồ phối hợp nhịp nhàng giữa Lễ tân, Cố vấn, Kỹ thuật viên, Thủ kho và Kế toán.",
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
            "Bước 3 (Thủ kho): Nhận yêu cầu vật tư -> Xuất lốp/phụ tùng cho thợ.",
            "Bước 4 (Kỹ thuật viên): Thay lốp, cân chỉnh thước lái -> Chụp ảnh nghiệm thu.",
            "Bước 5 (Cố vấn): Kiểm tra chất lượng (QC) -> Chuyển thanh toán.",
            "Bước 6 (Thu ngân): In hóa đơn -> Thu tiền -> Bàn giao xe cho khách."
          ]
        },
        sandboxType: "workflow",
        quiz: {
          question: "Sau khi Cố vấn báo giá được khách hàng duyệt, dữ liệu tự động chuyển tới những phân hệ nào?",
          options: [
            "Thủ kho (xuất vật tư) và Kỹ thuật viên (thực hiện công việc)",
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
