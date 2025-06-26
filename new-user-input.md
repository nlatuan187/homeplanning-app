## PRD (Product Requirements Document): Cải Tiến Luồng Nhập Liệu Kế Hoạch Mua Nhà

**1. Giới Thiệu và Mục Tiêu**

*   **Mục tiêu:**
    1.  **Tối ưu hóa trải nghiệm người dùng (UX):** Cải tiến giao diện nhập liệu để trở nên trực quan, dễ hiểu, giảm thiểu sự phân tâm và cung cấp thông tin hỗ trợ ngay tại ngữ cảnh.
    2.  **Tăng cường sự rõ ràng (Clarity):** Hiển thị các giải thích và kết quả tính toán động một cách nổi bật, giúp người dùng hiểu rõ hơn về các giả định và tác động của chúng.
    3.  **Đảm bảo tính nhất quán (Consistency):** Duy trì sự nhất quán về thiết kế hình ảnh (màu sắc, bố cục) với các phần hiện có của ứng dụng, đồng thời áp dụng các cải tiến UI mới.
    4.  **Nâng cao độ chính xác dữ liệu (Data Accuracy):** Đảm bảo luồng nhập liệu mới thu thập đủ thông tin cần thiết và các trường dữ liệu được định nghĩa rõ ràng cho việc tính toán chính xác ở backend.
*   **Phạm vi:**
    *   Thiết kế lại giao diện người dùng (UI) cho 4 trang nhập liệu ban đầu (Mục tiêu, Thu nhập, Chi tiêu & Tích lũy, Khoản vay).
    *   Triển khai cơ chế hiển thị thông tin giải thích động và kết quả tính toán tạm thời ngay trên form.
    *   Điều chỉnh cấu trúc dữ liệu (Prisma schema) để phù hợp với thông tin thu thập mới.
    *   Cập nhật logic backend (chủ yếu trong `generateProjections` và các Server Actions liên quan) để xử lý dữ liệu mới và các giả định đã được cập nhật.
*   **Không thuộc phạm vi (Out of Scope for this PRD):**
    *   Thay đổi lớn về thuật toán tính toán cốt lõi (ngoại trừ việc điều chỉnh để sử dụng các input mới).
    *   Tích hợp AI Gemini vào các phần giải thích động trên form nhập liệu này (hiện tại giải thích động sẽ dựa trên công thức tính toán client-side).

**2. Đối Tượng Người Dùng Mục Tiêu**

*   Người dùng hiện tại và tiềm năng của ứng dụng "Home Planning Solution", đặc biệt là những người lần đầu sử dụng tính năng tạo kế hoạch mua nhà.

**3. Yêu Cầu Chức Năng (Functional Requirements)**

**3.1. Luồng Nhập Liệu Tổng Quan (4 Trang):**

*   **FR1.1:** Hệ thống phải cho phép người dùng tuần tự đi qua 4 trang nhập liệu: Mục tiêu mua nhà, Tình hình thu nhập, Tình hình chi tiêu và tích lũy, Khoản vay mua nhà.
*   **FR1.2:** Nút "Tiếp tục" ở mỗi trang sẽ chuyển người dùng đến trang tiếp theo sau khi dữ liệu hợp lệ (validation client-side).
*   **FR1.3:** Nút "Quay lại" (nếu có) ở các trang sau trang đầu tiên sẽ cho phép người dùng trở về trang trước đó.

**3.2. Hiển Thị Thông Tin Giải Thích Động và Modal Giả Định:**

*   **FR2.1:** Tại các trường nhập liệu có nhãn là "<Giả định>", hệ thống phải hiển thị một đoạn văn bản giải thích động ngay bên dưới trường đó.
*   **FR2.2:** Nội dung của văn bản giải thích động này phải được cập nhật theo thời gian thực (real-time) khi người dùng thay đổi các giá trị trong các trường input có liên quan.
*   **FR2.3:** Văn bản giải thích động phải có **màu Cyan đặc trưng của branding Finful (ví dụ: `#00ACB8`)** để nổi bật và dễ đọc.
*   **FR2.4:** Bên phải mỗi trường "<Giả định>" sẽ có một icon thông tin `(i)`.
*   **FR2.5:** Khi người dùng nhấp vào icon `(i)`:
    *   Một modal/popup "Giải thích giả định" sẽ hiển thị.
    *   **Thiết kế Modal:** Giao diện của modal phải **hiển thị đầy đủ các chi tiết (detail)** như trong thiết kế UI đã được cung cấp (tham khảo hình ảnh mẫu), bao gồm:
        *   Tiêu đề modal là tên của giả định (ví dụ: "Tốc độ tăng giá nhà mỗi năm").
        *   Giá trị hiện tại của giả định được làm nổi bật (ví dụ: hiển thị bằng màu vàng, font chữ lớn hơn).
        *   Đoạn văn bản giải thích chi tiết cho giả định đó (nội dung tĩnh lấy từ cấu hình).
        *   Nút "Thay đổi giả định".
        *   Nút đóng modal (icon X).
    *   **Hành vi Nút "Thay đổi giả định" trong Modal:** Khi nhấp, modal đóng lại và con trỏ chuột (focus) được tự động chuyển đến trường input tương ứng trên form chính để người dùng có thể chỉnh sửa ngay.

**3.3. Yêu Cầu Chi Tiết Từng Trang Nhập Liệu:**

*   **Page 1: Mục tiêu mua nhà**
    *   **Tiêu đề Trang:** "1. Mục tiêu mua nhà"
    *   **Cấu trúc:**
        1.  **Câu hỏi: "Bạn muốn mua nhà sau bao nhiêu năm nữa?"**
            *   **Input:** Trường nhập số (NumberInput).
            *   **Giải thích Động (Bên dưới, màu Cyan branding Finful):** "Chúng tôi sẽ tính toán để bạn mua nhà vào tháng [MM]/[YYYY]" (ví dụ: "tháng 6/2026" nếu nhập "1" năm và hiện tại là tháng 6/2025).
                *   `[MM]` là tháng hiện tại.
                *   `[YYYY]` là năm hiện tại + số năm người dùng nhập.
        2.  **Câu hỏi: "Giá trị HIỆN TẠI của căn nhà bạn muốn mua (triệu VNĐ)"**
            *   **Input:** Trường nhập số (NumberInput).
        3.  **Câu hỏi: "<Giả định> Tốc độ tăng giá nhà mỗi năm"** (Có icon `(i)`)
            *   **Input:** Trường nhập số (NumberInput), có giá trị mặc định là 10%.
            *   **Modal Giải Thích Giả Định (khi nhấp `(i)`):**
                *   Tiêu đề: "Tốc độ tăng giá nhà mỗi năm".
                *   Giá trị hiện tại: "[Giá trị input]%" (hiển thị nổi bật bằng màu vàng, font lớn).
                *   Giải thích chi tiết tĩnh: "Giá nhà sẽ tăng liên tục theo thời gian vì nhu cầu cao, đô thị hóa nhanh, chi phí xây dựng và đầu tư tăng. 10% cũng là mức tăng giá trung bình, nhất là tại TP.HCM và Hà Nội – nơi quỹ đất khan hiếm và hạ tầng liên tục mở rộng."
                *   Nút: "Thay đổi giả định".
            *   **Giải thích Động (Bên dưới trường input, màu Cyan branding Finful):** "Như vậy, tới thời điểm bạn mua nhà ([MM]/[YYYY] từ câu 1), căn nhà mong muốn của bạn sẽ có giá [Giá nhà dự kiến] tỷ VNĐ."
                *   `[Giá nhà dự kiến]` = `Giá trị HIỆN TẠI * (1 + Tốc độ tăng giá nhà/100) ^ Số năm mua`. Hiển thị dưới dạng "X,Y tỷ VNĐ".
        4.  **Câu hỏi: "Loại nhà bạn muốn mua"**
            *   **Input:** Lựa chọn đơn (Single choice - CustomRadioGroup): "Chung cư", "Nhà đất", "Khác".
            *   **Giá trị mặc định:** "Chung cư".
        5.  **Câu hỏi: "Tỉnh/thành phố bạn mong muốn mua nhà"**
            *   **Input:** Trường nhập chữ (Input text).
    *   **Nút Hành Động:** "Tiếp tục"

*   **Page 2: Tình hình thu nhập**
    *   **Tiêu đề Trang:** "2. Tình hình thu nhập"
    *   **Cấu trúc:**
        1.  **Câu hỏi: "Lương hàng tháng của bạn? (triệu VNĐ)"**
            *   **Input:** Trường nhập số.
        2.  **Câu hỏi: "<Giả định> Tốc độ tăng lương trung bình mỗi năm"** (Có icon `(i)`)
            *   **Input:** Trường nhập số, giá trị mặc định 7%.
            *   **Modal Giải Thích Giả Định:**
                *   Tiêu đề: "Tốc độ tăng lương trung bình mỗi năm".
                *   Giá trị hiện tại: "[Giá trị input]%" (nổi bật).
                *   Giải thích chi tiết tĩnh: "Tiền lương là khoản đóng góp rất lớn vào tích lũy hàng năm, vì vậy lương cần tăng để bắt kịp tốc độ tăng giá nhà. 7% cũng được xác định dựa trên mức tăng lương trung bình của người lao động Việt Nam."
                *   Nút: "Thay đổi giả định".
            *   **Giải thích Động (Bên dưới, màu Cyan branding Finful):** "Như vậy, trong năm đầu tiên chuẩn bị mua nhà, lương của bạn cần tăng thêm [Lương tăng năm đầu] triệu VNĐ/tháng. Tương tự tăng [Giá trị input]% trong những năm tiếp theo cho tới thời điểm mua nhà."
                *   `[Lương tăng năm đầu]` = `Lương hàng tháng hiện tại * (Tốc độ tăng lương/100)`.
        3.  **Câu hỏi: "Bạn dự định mua nhà một mình hay có người đồng hành mua nhà?"**
            *   **Input:** Lựa chọn đơn: "Tự mình mua", "Có vợ/chồng hoặc người đồng hành về mặt tài chính".
        4.  **(Conditional) Câu hỏi: "Lương hàng tháng của vợ/chồng? (triệu VNĐ)"** (Chỉ hiển thị nếu câu trên chọn "Có...")
            *   **Input:** Trường nhập số.
            *   **<Giả định> Tốc độ tăng lương trung bình mỗi năm (cho vợ/chồng):** (Hiển thị ngay dưới nếu câu trên được trả lời, có icon `(i)`)
                *   **Input:** Trường nhập số, giá trị mặc định 7%. (Cân nhắc ẩn field này và mặc định dùng chung tốc độ với người dùng chính, chỉ hiển thị giải thích động và cho phép thay đổi qua modal nếu cần).
                *   **Modal Giải Thích Giả Định (tương tự, nếu input riêng):**
                    *   Tiêu đề: "Tốc độ tăng lương (người đồng hành)".
                    *   Giá trị hiện tại: "[Giá trị input]%" (nổi bật).
                    *   Giải thích chi tiết tĩnh (nếu cần).
                    *   Nút: "Thay đổi giả định".
                *   **Giải thích Động (Bên dưới, màu Cyan branding Finful):** "Lương của vợ/chồng bạn cần tăng thêm [Lương VC tăng năm đầu] triệu VNĐ/tháng sau năm đầu tiên. Tương tự tăng [Giá trị input]% trong những năm tiếp theo cho tới thời điểm mua nhà."
        5.  **Câu hỏi: "Thu nhập trung bình hàng tháng của bạn/gia đình từ các nguồn khác? (triệu VNĐ)"**
            *   **Input:** Trường nhập số.
    *   **Nút Hành Động:** "Quay lại", "Tiếp tục"

*   **Page 3: Tình hình chi tiêu và tích luỹ**
    *   **Tiêu đề Trang:** "3. Tình hình chi tiêu và tích luỹ"
    *   **Cấu trúc:**
        1.  **Câu hỏi: "Chi phí sinh hoạt hàng tháng của bạn/gia đình bạn? (triệu VNĐ)"**
            *   **Input:** Trường nhập số.
        2.  **Câu hỏi: "<Giả định> Tốc độ tăng chi phí hàng năm?"** (Có icon `(i)`)
            *   **Input:** Trường nhập số, giá trị mặc định 4%.
            *   **Modal Giải Thích Giả Định:**
                *   Tiêu đề: "Tốc độ tăng chi phí hàng năm".
                *   Giá trị hiện tại: "[Giá trị input]%" (nổi bật).
                *   Giải thích chi tiết tĩnh: "Dù bạn không tăng mức sống, thì chi phí sinh hoạt vẫn sẽ tăng theo lạm phát. 4% là mức gần với tốc độ lạm phát của Việt Nam."
                *   Nút: "Thay đổi giả định".
            *   **Giải thích Động (Bên dưới, màu Cyan branding Finful):** "Như vậy, trong năm đầu tiên chuẩn bị mua nhà, bạn được tăng chi tiêu [Chi tiêu tăng năm đầu] triệu VNĐ. Tương tự tăng [Giá trị input]% trong những năm tiếp theo."
                *   `[Chi tiêu tăng năm đầu]` = `Chi phí sinh hoạt hiện tại * (Tốc độ tăng chi phí/100)`.
        3.  **Câu hỏi: "Tổng chi phí trung bình hàng tháng bạn phải trả cho các khoản vay khác? (triệu VNĐ)"**
            *   **Input:** Trường nhập số.
        4.  **Câu hỏi: "Chi phí hàng năm bạn trả cho Bảo hiểm Nhân thọ (triệu VNĐ)"**
            *   **Input:** Trường nhập số.
        5.  **Câu hỏi: "Tích luỹ/ tiết kiệm sẵn có cho mục tiêu mua nhà (ngoài lương và các thu nhập khác)"**
            *   **Input:** Trường nhập số.
        6.  **Câu hỏi: "<Giả định> Tỷ lệ lợi nhuận cần đạt được khi đầu tư"** (Có icon `(i)`)
            *   **Input:** Trường nhập số, giá trị mặc định 9%/năm.
            *   **Modal Giải Thích Giả Định:**
                *   Tiêu đề: "Tỷ lệ lợi nhuận cần đạt được khi đầu tư".
                *   Giá trị hiện tại: "[Giá trị input]% /năm" (nổi bật).
                *   Giải thích chi tiết tĩnh: "Tốc độ tăng giá nhà trung bình là 10%/năm, vì vậy bạn cần đầu tư với tỷ suất sinh lời phù hợp để việc mua nhà không càng xa."
                *   Nút: "Thay đổi giả định".
            *   **Giải thích Động (Bên dưới, màu Cyan branding Finful):**
                *   "Với số tiền tích lũy ban đầu là [Tích lũy ban đầu] triệu VNĐ, sau năm đầu tiên (với lãi suất [X]% tháng tương đương [Giá trị input]% năm) sẽ tăng thêm [Lãi từ tích lũy ban đầu năm đầu] triệu VNĐ."
                *   "Nếu hàng tháng bạn bạn bỏ ra [Khoản dư hàng tháng] triệu VNĐ (dư ra sau khi chi tiêu từ thu nhập). Thì sau năm đầu tiên (với lãi suất [X]% tháng) bạn sẽ có thêm [Lãi từ khoản dư hàng tháng năm đầu] triệu VNĐ từ phần này."
                *   `[Khoản dư hàng tháng]` = `(Tổng thu nhập tháng từ Page 2) - (Chi phí sinh hoạt tháng + Chi phí vay khác tháng + Chi phí BH tháng)`.
                *   Lãi suất tháng `X` được tính từ lãi suất năm: `(1 + Lãi suất năm/100)^(1/12) - 1`.
    *   **Nút Hành Động:** "Quay lại", "Tiếp tục"

*   **Page 4: Khoản vay mua nhà**
    *   **Tiêu đề Trang:** "4. Khoản vay mua nhà"
    *   **Cấu trúc:**
        1.  **Câu hỏi: "<Giả định> Lãi suất vay mua nhà?"** (Có icon `(i)`)
            *   **Input:** Trường nhập số, giá trị mặc định 11%.
            *   **Modal Giải Thích Giả Định:**
                *   Tiêu đề: "Lãi suất vay mua nhà".
                *   Giá trị hiện tại: "[Giá trị input]%" (nổi bật).
                *   Giải thích chi tiết tĩnh: "Dựa trên chi phí huy động vốn, rủi ro tín dụng, chi phí vận hành của ngân hàng, cùng với chính sách tiền tệ và lạm phát hiện tại ở Việt Nam. 11% cũng là mức lãi suất cân bằng dựa trên thị trường và kinh tế thực tế."
                *   Nút: "Thay đổi giả định".
        2.  **Câu hỏi: "<Giả định> Thời hạn vay (năm)"** (Có icon `(i)` - giải thích về thời hạn vay phổ biến)
            *   **Input:** Trường nhập số, giá trị mặc định 25 năm.
            *   **Modal Giải Thích Giả Định (Ví dụ):**
                *   Tiêu đề: "Thời hạn vay".
                *   Giá trị hiện tại: "[Giá trị input] năm" (nổi bật).
                *   Giải thích chi tiết tĩnh: "Thời hạn vay phổ biến thường từ 15-30 năm. Thời gian vay dài hơn giúp giảm số tiền trả góp hàng tháng nhưng tăng tổng lãi phải trả."
                *   Nút: "Thay đổi giả định".
            *   **Giải thích Động (Bên dưới, màu Cyan branding Finful):** "(tương đương [Số tháng] tháng)."
        3.  **Câu hỏi: "Ngoài tiền tích lũy ban đầu, bạn có được người thân hỗ trợ hoặc cho vay không?"**
            *   **Input:** Lựa chọn đơn: "Có", "Không".
            *   **Giải thích Chung (Bên dưới, màu Cyan branding Finful, hiển thị khi người dùng tương tác với câu hỏi này):** "Khoản tiền hỗ trợ/vay này sẽ được giả định giải ngân tại thời điểm bạn mua nhà để bù đắp phần còn thiếu."
        4.  **(Conditional) Các câu hỏi phụ nếu chọn "Có":**
            *   **Câu hỏi: "Số tiền bạn được hỗ trợ, vay mượn từ người thân? (triệu VNĐ)"**
                *   **Input:** Trường nhập số.
            *   **Câu hỏi: "Bạn dự tính trả khoản hỗ trợ/vay mượn này cho người thân như thế nào?"**
                *   **Input:** Lựa chọn đơn: "Trả dần hàng tháng", "Trả một cục khi có đủ khả năng (sau khi đã mua nhà)".
            *   **(Conditional) Nếu chọn "Trả dần hàng tháng":**
                *   **Câu hỏi: "Lãi suất phải trả cho khoản hỗ trợ, vay mượn từ người thân? (%/năm)"** (Cho phép nhập 0 nếu không có lãi)
                    *   **Input:** Trường nhập số.
                *   **Câu hỏi: "Thời gian bạn tính trả cho người thân là bao lâu? (năm)"**
                    *   **Input:** Trường nhập số.
    *   **Nút Hành Động:** "Quay lại", "Xem lại & Tính toán" (hoặc tên nút tương tự để submit).

**4. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)**

*   **NFR1.1 (Hiệu suất):** Việc cập nhật giải thích động phải diễn ra mượt mà, không gây giật lag cho giao diện người dùng.
*   **NFR1.2 (Khả năng sử dụng - Usability):**
    *   Giao diện phải dễ hiểu, dễ sử dụng.
    *   Các thông báo lỗi (validation) phải rõ ràng.
    *   Modal "Giải thích giả định" phải dễ dàng đóng lại và hành vi nút "Thay đổi giả định" phải trực quan.
*   **NFR1.3 (Tính nhất quán - Consistency):**
    *   Màu sắc (nền, box, chữ, icon) phải tuân theo hướng dẫn đã thống nhất. Màu Cyan branding Finful cho giải thích động. Màu vàng nổi bật cho giá trị giả định trong modal.
    *   Phong cách hiển thị modal "Giải thích giả định" phải nhất quán.
*   **NFR1.4 (Khả năng bảo trì - Maintainability):** Mã nguồn cho việc tính toán và hiển thị giải thích động cần được tổ chức rõ ràng.

**5. Yêu Cầu Kỹ Thuật (Technical Requirements)**

*   **TR1.1 (Frontend - React/Next.js):**
    *   Sử dụng React Hook Form và Zod cho validation client-side.
    *   Các component section phải chứa logic tính toán client-side để cập nhật các đoạn văn bản giải thích động.
    *   Triển khai component Modal "Giải thích giả định" có thể tái sử dụng, hiển thị đầy đủ chi tiết theo thiết kế.
    *   Màu chữ giải thích động: **Màu Cyan branding Finful (`#00ACB8` hoặc tương đương).**
    *   Màu sắc trong Modal "Giải thích giả định": Tuân thủ UI được cung cấp, bao gồm **màu vàng nổi bật cho giá trị giả định.**
    *   Icon `(i)` được giữ lại bên cạnh các trường "<Giả định>".
*   **TR1.2 (Backend - Prisma Schema & Server Actions):**
    *   **Dữ liệu cần giữ lại (Remain):** Tất cả các trường input mà người dùng nhập và các giá trị giả định có thể thay đổi VẪN cần được lưu vào `Plan` model trong DB.
    *   **Dữ liệu KHÔNG cần lưu trữ từ giải thích động:** Các chuỗi văn bản giải thích động KHÔNG cần lưu vào DB.
    *   **Cấu trúc dữ liệu `Plan` model (Prisma Schema):** Sử dụng cấu trúc đã thống nhất ở lần thảo luận trước (bao gồm các trường cho lương tháng, thông tin người đồng hành, chi phí riêng của người dùng, các trường về hỗ trợ từ người thân, và loại bỏ các trường kế hoạch tương lai xa).
    *   Server Action `submitPlan` và logic `generateProjections` cần được cập nhật để xử lý chính xác các trường dữ liệu mới và các giả định theo logic đã thống nhất (bao gồm lãi kép hàng tháng cho tiết kiệm và cách xử lý hỗ trợ người thân).
*   **TR1.3 (Logic Tính Toán Backend):**
    *   Việc "Thay đổi giả định" thông qua modal thực chất là thay đổi giá trị của trường input trên form, giá trị này sau đó sẽ được gửi đi và lưu vào DB khi người dùng submit toàn bộ kế hoạch. Logic tính toán backend sẽ dựa trên các giá trị giả định đã lưu này.

**6. Kịch Bản Sử Dụng (Use Cases)**
*   (Như đã mô tả ở PRD trước, nhưng với UI modal mới cho phần giải thích giả định).

**7. Thiết Kế Tương Tác (Interaction Design Notes):**
*   Tính toán và cập nhật giải thích động cần có độ trễ thấp.
*   Focus management khi đóng modal "Giải thích giả định" cần chuyển về trường input tương ứng.
*   Giao diện modal "Giải thích giả định" phải responsive.