import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Policy = {
  title: string;
  intro: string;
  sections: { title: string; paragraphs?: string[]; bullets?: string[] }[];
};

const policies: Record<string, Policy> = {
  "bao-mat": {
    title: "Chính sách bảo mật và dữ liệu cá nhân",
    intro: "Educhi công khai thông tin về dữ liệu cá nhân có thể được xử lý khi sử dụng tài khoản, luyện đề, thanh toán VIP, tải học liệu và tham gia cộng đồng.",
    sections: [
      { title: "1. Dữ liệu có thể được thu thập", bullets: [
        "Thông tin tài khoản: họ tên, email, đăng nhập Google khi được lựa chọn, ảnh đại diện và thông tin đăng nhập cần thiết.",
        "Thông tin học tập: lớp, tỉnh/thành, bài làm, đáp án, điểm, tiến độ, EXP và hoạt động lớp học.",
        "Nội dung do bạn gửi: tin nhắn cộng đồng, tài liệu, đề thi, phản hồi và yêu cầu hỗ trợ.",
        "Thông tin giao dịch: gói VIP, mã đơn, số tiền, trạng thái đối soát và thời hạn quyền truy cập.",
        "Dữ liệu kỹ thuật cần thiết cho đăng nhập, bảo vệ tài khoản, ngăn lạm dụng và vận hành."
      ] },
      { title: "2. Mục đích và căn cứ xử lý", paragraphs: [
        "Dữ liệu được sử dụng để cung cấp dịch vụ, lưu tiến độ, đề xuất nội dung học tập, xử lý giao dịch, hỗ trợ người dùng, bảo vệ nền tảng và thực hiện nghĩa vụ pháp lý.",
        "Educhi phải xác định căn cứ hợp pháp cho từng mục đích. Khi cần sự đồng ý, thông tin cần được cung cấp rõ ràng và có khả năng chứng minh; dùng dịch vụ không mặc nhiên đồng ý nhận quảng cáo."
      ] },
      { title: "3. Chia sẻ dữ liệu và dịch vụ bên thứ ba", paragraphs: [
        "Tùy tính năng thực tế, dữ liệu có thể được xử lý bởi đơn vị hạ tầng, Google (đăng nhập), ngân hàng và SePay (đối soát thanh toán) hoặc đơn vị cung cấp AI nếu chức năng này được sử dụng. Phạm vi chia sẻ phải phù hợp với mục đích hợp pháp.",
        "Nội dung bạn chủ động đăng công khai trong cộng đồng hoặc kho tài liệu có thể được người khác xem. Không công khai dữ liệu cá nhân nhạy cảm của mình hoặc của người khác.",
        "Nếu có chuyển dữ liệu cá nhân ra nước ngoài, Educhi phải tuân thủ các yêu cầu pháp luật liên quan."
      ] },
      { title: "4. Thời hạn lưu trữ và bảo mật", paragraphs: [
        "Dữ liệu được lưu giữ trong thời gian cần thiết để thực hiện mục đích xử lý và nghĩa vụ lưu trữ hợp pháp. Khi không còn căn cứ xử lý hoặc có yêu cầu hợp lệ, Educhi phải xử lý theo quy định về xóa, hạn chế hoặc ẩn danh.",
        "Educhi cần duy trì biện pháp bảo mật kỹ thuật và quản trị phù hợp. Bạn nên bảo vệ mật khẩu, không chia sẻ OTP và đăng xuất khỏi thiết bị dùng chung."
      ] },
      { title: "5. Quyền của người dùng", paragraphs: [
        "Bạn có thể yêu cầu biết, truy cập, sửa, xóa, hạn chế xử lý, rút lại sự đồng ý, phản đối hoặc khiếu nại theo phạm vi pháp luật quy định. Hãy gửi yêu cầu qua trang Liên hệ và hỗ trợ và nêu email tài khoản.",
        "Để bảo vệ người dùng, Educhi có thể yêu cầu xác minh quyền sở hữu tài khoản. Việc giải quyết yêu cầu tuân theo thời hạn pháp luật áp dụng và các ngoại lệ lưu trữ hợp pháp."
      ] },
      { title: "6. Dữ liệu trẻ em", paragraphs: [
        "Educhi phục vụ cả học sinh chưa thành niên. Việc xử lý dữ liệu cá nhân của trẻ em cần đặt lợi ích tốt nhất của trẻ lên hàng đầu, đáp ứng yêu cầu về sự đồng ý của trẻ/người đại diện khi pháp luật yêu cầu.",
        "Cha mẹ hoặc người đại diện có thể liên hệ để yêu cầu bảo vệ dữ liệu. Trẻ em không nên đăng công khai địa chỉ, số điện thoại, hình ảnh riêng tư hoặc thông tin định danh của mình."
      ] },
      { title: "7. Cookie và thay đổi chính sách", paragraphs: [
        "Website có thể sử dụng cookie phiên đăng nhập và bộ nhớ trình duyệt để duy trì phiên và lưu giao diện. Cookie hoặc công nghệ theo dõi không thiết yếu, nếu được thêm vào, cần được thông báo và xin đồng ý khi luật yêu cầu.",
        "Khi cách xử lý dữ liệu thay đổi đáng kể, Educhi cần cập nhật chính sách và thông báo theo quy định."
      ] }
    ]
  },
  "dieu-khoan": {
    title: "Điều khoản sử dụng Educhi",
    intro: "Quyền và nghĩa vụ của người học, giáo viên và người dùng khi truy cập, tạo tài khoản và chia sẻ nội dung trên Educhi.",
    sections: [
      { title: "1. Dịch vụ và tài khoản", paragraphs: [
        "Educhi là công cụ hỗ trợ luyện tập và học tập; không phải đơn vị tổ chức kỳ thi chính thức. Điểm luyện đề, nội dung giải thích và phản hồi AI (nếu có) là thông tin tham khảo, không bảo đảm kết quả thi.",
        "Người dùng cần cung cấp thông tin phù hợp, bảo vệ tài khoản, không sử dụng danh tính của người khác trái phép. Người chưa thành niên cần được hướng dẫn và đáp ứng các yêu cầu về người đại diện theo luật."
      ] },
      { title: "2. Các hành vi bị cấm", bullets: [
        "Truy cập trái phép, khai thác lỗ hổng, phát tán mã độc, gây quá tải và gian lận hệ thống.",
        "Bắt nạt, quấy rối, lừa đảo, mạo danh, tiết lộ đời sống riêng tư hoặc gây nguy hiểm cho trẻ em.",
        "Sao chép, tải lên hoặc phát tán sách, đề thi, hình ảnh mà không có quyền hoặc giấy phép thích hợp.",
        "Mạo nhận Educhi là cơ quan giáo dục hoặc đơn vị tổ chức khảo thí khi không được ủy quyền."
      ] },
      { title: "3. Nội dung của người dùng", paragraphs: [
        "Người đăng chịu trách nhiệm có quyền sử dụng, đăng và chia sẻ nội dung. Việc tải lên không làm chuyển toàn bộ quyền sở hữu trí tuệ của người đăng sang Educhi.",
        "Educhi có thể tiếp nhận báo cáo, tạm ẩn, gỡ nội dung hoặc hạn chế tài khoản theo pháp luật và cho phép người dùng phản ánh quyết định đó qua kênh hỗ trợ."
      ] },
      { title: "4. VIP, EXP và giới thiệu", paragraphs: [
        "Quyền lợi, mức giá và kỳ hạn VIP được hiển thị ở trang mua trước khi thanh toán. Chính sách thanh toán, hủy và hoàn tiền được công bố riêng.",
        "EXP và số dư thưởng giới thiệu là quyền lợi nội bộ theo điều kiện chương trình, không mặc nhiên là tiền gửi, phương tiện thanh toán hay khoản được rút thành tiền."
      ] },
      { title: "5. Khiếu nại và dịch vụ", paragraphs: [
        "Dịch vụ có thể bị gián đoạn hoặc phát sinh lỗi. Educhi tiếp nhận yêu cầu hỗ trợ và khiếu nại qua trang Liên hệ. Không nội dung nào tại đây hạn chế quyền bắt buộc của người dùng theo pháp luật."
      ] }
    ]
  },
  "thanh-toan": {
    title: "Chính sách thanh toán, hủy và hoàn tiền",
    intro: "Áp dụng đối với dịch vụ VIP Educhi được thanh toán bằng chuyển khoản và đối soát qua SePay theo luồng hiện có.",
    sections: [
      { title: "1. Giá và gói dịch vụ", paragraphs: [
        "Tên gói, mức giá bằng VND, kỳ hạn và quyền lợi được hiển thị tại trang VIP. Hãy kiểm tra các thông tin tại thời điểm đặt mua.",
        "Giao dịch chuyển khoản cho một gói không tự động ủy quyền Educhi trừ tiền gia hạn ở kỳ sau."
      ] },
      { title: "2. Cách thanh toán và kích hoạt", paragraphs: [
        "Educhi hiển thị ngân hàng, số tài khoản, tên chủ tài khoản, số tiền và nội dung chuyển khoản. Người mua cần đối chiếu tên người nhận trong ứng dụng ngân hàng trước khi chuyển.",
        "VIP được kích hoạt khi hệ thống đối soát xác nhận giao dịch hợp lệ. Nếu tiền đã chuyển nhưng quyền VIP chưa kích hoạt, hãy giữ biên lai, yêu cầu đối soát và tránh chuyển thêm khi chưa xác minh giao dịch cũ."
      ] },
      { title: "3. Hủy gói và hoàn tiền", paragraphs: [
        "Quyền VIP hết hạn theo kỳ đã mua nếu không có giao dịch mới. Người dùng có quyền yêu cầu đối soát hoặc hoàn tiền trong trường hợp thanh toán trùng, không được kích hoạt vì lỗi hệ thống, dịch vụ không được cung cấp đúng thỏa thuận hoặc trường hợp khác theo luật.",
        "Việc giải quyết căn cứ chứng từ, trạng thái giao dịch, dịch vụ đã cung cấp và quyền lợi theo pháp luật. Chính sách này không loại trừ quyền hoàn tiền hoặc khiếu nại bắt buộc."
      ] },
      { title: "4. Gửi yêu cầu liên quan đến tiền", bullets: [
        "Gửi qua trang Liên hệ và hỗ trợ, ghi chủ đề “Đối soát VIP” hoặc “Hoàn tiền”.",
        "Đính kèm hoặc mô tả email tài khoản, thời gian chuyển, số tiền và mã giao dịch; che thông tin nhạy cảm không liên quan.",
        "Không bao giờ cung cấp mật khẩu, OTP hoặc mã xác thực ngân hàng cho nhân viên hỗ trợ."
      ] }
    ]
  },
  "cong-dong": {
    title: "Quy định cộng đồng và bảo vệ học sinh",
    intro: "Áp dụng cho tin nhắn cộng đồng, lớp học, nội dung công khai và tài liệu chia sẻ trên Educhi.",
    sections: [
      { title: "1. Quy tắc ứng xử", bullets: [
        "Trao đổi lịch sự, phù hợp với môi trường giáo dục; không quấy rối, bắt nạt, đe dọa hoặc lừa đảo.",
        "Không công khai địa chỉ, số điện thoại, tài khoản, ảnh riêng tư hoặc dữ liệu cá nhân của người khác.",
        "Không gửi mã độc, quảng cáo rác, nội dung trái pháp luật hoặc không phù hợp với học sinh.",
        "Không dụ dỗ trẻ em liên hệ riêng, chuyển tiền hoặc cung cấp hình ảnh và thông tin nhạy cảm.",
        "Chỉ chia sẻ tài liệu và đề thi mà bạn có quyền sử dụng."
      ] },
      { title: "2. Báo cáo và xử lý", paragraphs: [
        "Báo cáo nội dung vi phạm qua trang Liên hệ với đường dẫn, thời điểm và mô tả. Không gửi thêm dữ liệu nhạy cảm không cần thiết.",
        "Educhi có thể tạm ẩn, gỡ nội dung hoặc hạn chế tài khoản theo mức độ vi phạm và pháp luật. Người dùng có thể gửi giải trình hoặc khiếu nại qua trang hỗ trợ."
      ] }
    ]
  },
  "ban-quyen": {
    title: "Bản quyền và báo cáo vi phạm",
    intro: "Educhi tôn trọng quyền tác giả của giáo viên, người dùng, nhà xuất bản và chủ sở hữu học liệu.",
    sections: [
      { title: "1. Quyền với học liệu", paragraphs: [
        "Việc một sách, đề thi hay tài liệu có trên internet không có nghĩa ai cũng được sao chép và đăng lại. Người tải lên cần có quyền hoặc giấy phép sử dụng, phân phối tương ứng.",
        "Educhi không mặc nhiên sở hữu quyền tác giả đối với nội dung do người dùng tải lên. Quyền với logo, sách, đề thi, hình ảnh và dữ liệu của bên thứ ba cần được tôn trọng."
      ] },
      { title: "2. Cách báo cáo", bullets: [
        "Gửi qua trang Liên hệ, ghi rõ chủ đề “Báo cáo bản quyền”.",
        "Nêu đường dẫn nội dung, tên tác phẩm, tư cách chủ sở hữu hoặc đại diện và bằng chứng liên quan.",
        "Educhi xem xét, có thể yêu cầu làm rõ hoặc tạm ẩn/gỡ khi có căn cứ. Người bị phản ánh được gửi giải trình."
      ] },
      { title: "3. Tránh gây nhầm lẫn", paragraphs: [
        "Tên kỳ thi, nhà xuất bản và cơ sở giáo dục chỉ được sử dụng nhằm mô tả nguồn hoặc nội dung, không ngụ ý Educhi là đơn vị tổ chức hay được bảo trợ nếu không có sự ủy quyền."
      ] }
    ]
  }
};

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return Object.keys(policies).map((slug) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const policy = policies[slug];
  return policy ? { title: `${policy.title} | Educhi`, description: policy.intro } : { title: "Không tìm thấy | Educhi" };
}
export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = policies[slug];
  if (!policy) notFound();
  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-10 text-slate-900 sm:px-6 sm:py-14">
      <article className="mx-auto max-w-4xl rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-10">
        <nav aria-label="Đường dẫn" className="text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-orange-700">Trang chủ</Link> / Chính sách
        </nav>
        <p className="mt-6 text-xs font-black uppercase tracking-widest text-orange-600">Educhi · Minh bạch thông tin</p>
        <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{policy.title}</h1>
        <p className="mt-2 text-xs text-slate-500">Cập nhật 20/11/2026</p>
        <p className="mt-5 text-sm leading-7 text-slate-700 sm:text-base">{policy.intro}</p>
        <div className="mt-6 divide-y divide-slate-100">
          {policy.sections.map((section) => (
            <section key={section.title} className="py-6">
              <h2 className="text-lg font-extrabold sm:text-xl">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base" key={paragraph}>{paragraph}</p>)}
              {section.bullets ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 sm:text-base">
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul> : null}
            </section>
          ))}
        </div>
        <p className="mt-5 rounded-xl bg-orange-50 p-4 text-sm leading-6">Cần yêu cầu xóa dữ liệu, khiếu nại, đối soát VIP hoặc báo cáo bản quyền?{" "}
          <Link href="/contact" className="font-bold text-orange-700 underline">Liên hệ và hỗ trợ</Link>.
        </p>
      </article>
    </main>
  );
}
