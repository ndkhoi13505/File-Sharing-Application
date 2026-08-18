"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";
import { adminService } from "@/services/admin";
import { SystemPolicy } from "@/types";
import { Sliders, Save, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminPolicyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    maxFileSizeMB: 50,
    minValidityHours: 1,
    maxValidityDays: 30,
    defaultValidityDays: 7,
    requirePasswordMinLength: 8,
  });

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      const userRes = await authService.getCurrentUser();
      if (userRes.user.role !== "admin") {
        alert("Chỉ tài khoản Admin mới có quyền truy cập cấu hình hệ thống.");
        router.push("/dashboard");
        return;
      }

      const policy = await adminService.getPolicy();
      setFormData({
        maxFileSizeMB: policy.MaxFileSizeMB,
        minValidityHours: policy.MinValidityHours,
        maxValidityDays: policy.MaxValidityDays,
        defaultValidityDays: policy.DefaultValidityDays,
        requirePasswordMinLength: policy.RequirePasswordMinLength,
      });
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Frontend validation cơ bản
    if (formData.maxValidityDays * 24 < formData.minValidityHours) {
      setMessage({ type: "error", text: "Thời gian tối đa (ngày) phải lớn hơn thời gian tối thiểu (giờ)." });
      return;
    }

    try {
      setSaving(true);
      await adminService.updatePolicy({
        maxFileSizeMB: Number(formData.maxFileSizeMB),
        minValidityHours: Number(formData.minValidityHours),
        maxValidityDays: Number(formData.maxValidityDays),
        defaultValidityDays: Number(formData.defaultValidityDays),
        requirePasswordMinLength: Number(formData.requirePasswordMinLength),
      });
      setMessage({ type: "success", text: "Cập nhật cấu hình hệ thống thành công!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Lỗi cập nhật policy." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-400 animate-pulse font-medium">Đang tải cấu hình hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-md">ADMIN ONLY</span>
          <h1 className="text-2xl font-bold text-gray-900">Cấu hình hệ thống (System Policy)</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Điều chỉnh giới hạn tải file, thời gian hiệu lực và độ an toàn mật khẩu</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Form cấu hình */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Max file size */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Dung lượng tối đa mỗi file (MB)
            </label>
            <input
              type="number"
              min={1}
              value={formData.maxFileSizeMB}
              onChange={(e) => setFormData({ ...formData, maxFileSizeMB: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <span className="text-xs text-gray-400 mt-1 block">Giới hạn file tải lên tối đa trên toàn hệ thống.</span>
          </div>

          {/* Password min length */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Độ dài mật khẩu tối thiểu
            </label>
            <input
              type="number"
              min={6}
              value={formData.requirePasswordMinLength}
              onChange={(e) => setFormData({ ...formData, requirePasswordMinLength: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <span className="text-xs text-gray-400 mt-1 block">Số ký tự tối thiểu khi đặt password bảo vệ file.</span>
          </div>

          {/* Min validity hours */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Thời gian hiệu lực tối thiểu (Giờ)
            </label>
            <input
              type="number"
              min={1}
              value={formData.minValidityHours}
              onChange={(e) => setFormData({ ...formData, minValidityHours: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <span className="text-xs text-gray-400 mt-1 block">Khoảng cách tối thiểu giữa ngày bắt đầu và kết thúc.</span>
          </div>

          {/* Max validity days */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Thời gian hiệu lực tối đa (Ngày)
            </label>
            <input
              type="number"
              min={1}
              value={formData.maxValidityDays}
              onChange={(e) => setFormData({ ...formData, maxValidityDays: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <span className="text-xs text-gray-400 mt-1 block">Số ngày tối đa một file được phép tồn tại.</span>
          </div>

          {/* Default validity days */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Thời gian hiệu lực mặc định (Ngày)
            </label>
            <input
              type="number"
              min={1}
              value={formData.defaultValidityDays}
              onChange={(e) => setFormData({ ...formData, defaultValidityDays: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <span className="text-xs text-gray-400 mt-1 block">Thời gian hiệu lực áp dụng khi người dùng không chọn ngày hết hạn.</span>
          </div>

        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Đang lưu cấu hình..." : "Lưu cấu hình"}
          </button>
        </div>
      </form>
    </div>
  );
}