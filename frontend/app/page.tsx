import Link from "next/link";
import { ShieldCheck, Clock, Lock, FileUp } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50">
      
      {/* HERO SECTION */}
      <section className="w-full bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-950 tracking-tight mb-6">
            Chia sẻ file <span className="text-blue-600">An toàn</span> & <span className="text-blue-600">Nhanh chóng</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Chia sẻ file không cần tài khoản. Bảo vệ file được chia sẻ bằng mật khẩu.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/upload" 
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:translate-y-[-1px]"
            >
              <FileUp className="w-5 h-5 mr-2" />
              Upload File
            </Link>
            
            <Link 
              href="/login" 
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURE SECTION */}
      <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-center mb-16 sm:text-4xl">Tính năng nổi bật</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1: Time Validity */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Hẹn giờ chia sẻ</h3>
            <p className="text-gray-600 leading-relaxed">
              Thiết lập thời gian chia sẻ file theo ý muốn.
            </p>
          </div>

          {/* Feature 2: Security */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Bảo mật đa lớp</h3>
            <p className="text-gray-600 leading-relaxed">
              Hỗ trợ đặt mật khẩu cho file để đảm bảo chỉ người nhận mới mở được.
            </p>
          </div>

          {/* Feature 3: Access Control */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-6">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Quản lý truy cập</h3>
            <p className="text-gray-600 leading-relaxed">
              Chia sẻ file ở chế độ công khai hoặc giới hạn những người được phép truy cập.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16 sm:text-4xl">Cách thức hoạt động</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center relative">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-600 border border-blue-600 rounded-full flex items-center justify-center mb-6 text-xl font-bold text-white shadow-inner">1</div>
              <h4 className="text-xl font-bold mb-3">Tải file lên</h4>
              <p className="text-gray-600 max-w-xs">Upload file cần chia sẻ và cài đặt các thông số cần thiết.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-600 border border-blue-600 rounded-full flex items-center justify-center mb-6 text-xl font-bold text-white shadow-inner">2</div>
              <h4 className="text-xl font-bold mb-3">Nhận link chia sẻ</h4>
              <p className="text-gray-600 max-w-xs">Hệ thống tự động tạo ra một đường link chia sẻ duy nhất gắn với file.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-600 border border-blue-600 rounded-full flex items-center justify-center mb-6 text-xl font-bold text-white shadow-inner">3</div>
              <h4 className="text-xl font-bold mb-3">Người nhận tải về</h4>
              <p className="text-gray-600 max-w-xs">Người nhận truy cập link, vượt qua các bước xác thực và tải file an toàn.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
