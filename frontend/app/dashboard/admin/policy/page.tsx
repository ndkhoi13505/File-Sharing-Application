"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";
import { adminService } from "@/services/admin";
import * as lucideReact from "lucide-react";

export default function AdminPolicyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPolicy, setCurrentPolicy] = useState({
    maxFileSizeMB: 50,
    minValidityHours: 1,
    maxValidityDays: 30,
    defaultValidityDays: 7,
    requirePasswordMinLength: 8,
  });

  const [formData, setFormData] = useState({
    maxFileSizeMB: 50,
    minValidityHours: 1,
    maxValidityDays: 30,
    defaultValidityDays: 7,
    requirePasswordMinLength: 8,
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      const userRes = await authService.getCurrentUser();
      if (userRes.user.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const policy = await adminService.getPolicy();
      const policyData = {
        maxFileSizeMB: policy.MaxFileSizeMB,
        minValidityHours: policy.MinValidityHours,
        maxValidityDays: policy.MaxValidityDays,
        defaultValidityDays: policy.DefaultValidityDays,
        requirePasswordMinLength: policy.RequirePasswordMinLength,
      };

      setCurrentPolicy(policyData);
      setFormData(policyData);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const policyFields: {
    key: keyof typeof formData;
    label: string;
    unit: string;
  }[] = [
      { key: "maxFileSizeMB", label: "Dung lượng tối đa của mỗi file", unit: "MB" },
      { key: "minValidityHours", label: "Thời gian lưu file tối thiểu", unit: "giờ" },
      { key: "defaultValidityDays", label: "Thời gian lưu file mặc định", unit: "ngày" },
      { key: "maxValidityDays", label: "Thời gian lưu file tối đa", unit: "ngày" },
    ];

  const changedFields = policyFields.filter(
    (field) => currentPolicy[field.key] !== formData[field.key]
  );

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (changedFields.length === 0) {
      setMessage({
        type: "error",
        text: "Bạn chưa thực hiện thay đổi thông số nào",
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmedSave = async () => {
    setShowConfirmModal(false);
    setMessage(null);
    setSaving(true);

    try {
      await adminService.updatePolicy({
        maxFileSizeMB: Number(formData.maxFileSizeMB),
        minValidityHours: Number(formData.minValidityHours),
        maxValidityDays: Number(formData.maxValidityDays),
        defaultValidityDays: Number(formData.defaultValidityDays),
        requirePasswordMinLength: Number(formData.requirePasswordMinLength),
      });

      setCurrentPolicy({ ...formData });
      setMessage({ type: "success", text: "Cập nhật cấu hình hệ thống thành công" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Đã xảy ra lỗi khi cập nhật cấu hình hệ thống" });
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
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-md">Admin</span>
          <h1 className="text-2xl font-bold text-gray-900">Cấu hình hệ thống</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Thay đổi các thông số cấu hình của hệ thống</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
            }`}
        >
          {message.type === "success" ? (
            <lucideReact.CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <lucideReact.AlertCircle className="w-5 h-5 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <form
        onSubmit={handlePreSubmit}
        className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dung lượng tối đa */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Dung lượng tối đa của mỗi file (MB)
            </label>
            <input
              type="number"
              min={1}
              value={formData.maxFileSizeMB}
              onChange={(e) => setFormData({ ...formData, maxFileSizeMB: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              required
            />
            <span className="text-xs text-gray-400 mt-1 block">Giới hạn kích thước tối đa của một file</span>
          </div>

          {/* Thời gian lưu tối thiểu */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Thời gian lưu file tối thiểu (Giờ)
            </label>
            <input
              type="number"
              min={1}
              value={formData.minValidityHours}
              onChange={(e) => setFormData({ ...formData, minValidityHours: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              required
            />
            <span className="text-xs text-gray-400 mt-1 block">Khoảng thời gian tối thiểu giữa thời điểm hiệu lực và hết hạn</span>
          </div>

          {/* Thời gian lưu mặc định */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Thời gian lưu file mặc định (Ngày)
            </label>
            <input
              type="number"
              min={1}
              value={formData.defaultValidityDays}
              onChange={(e) => setFormData({ ...formData, defaultValidityDays: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              required
            />
            <span className="text-xs text-gray-400 mt-1 block">Khoảng thời gian mặc định của một file được lưu trên hệ thống</span>
          </div>

          {/* Thời gian lưu tối đa */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Thời gian lưu file tối đa (Ngày)
            </label>
            <input
              type="number"
              min={1}
              value={formData.maxValidityDays}
              onChange={(e) => setFormData({ ...formData, maxValidityDays: Number(e.target.value) })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              required
            />
            <span className="text-xs text-gray-400 mt-1 block">Khoảng thời gian tối đa của một file được lưu trên hệ thống</span>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <lucideReact.Save className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 gap-3">
              <div className="flex items-center gap-3 text-amber-600 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shrink-0">
                  <lucideReact.AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-gray-900 leading-none truncate">
                    Xác nhận thay đổi ({changedFields.length} mục)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1.5">Các thông số sau đây sẽ được cập nhật</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
              >
                <lucideReact.X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200/60 text-xs">
              {changedFields.map((field) => (
                <div key={field.key} className="p-3 flex justify-between items-center gap-2">
                  <span className="text-gray-600 font-medium">{field.label}:</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1.5 shrink-0">
                    <span className="text-gray-400 line-through">
                      {currentPolicy[field.key]} {field.unit}
                    </span>
                    <span className="text-gray-400 font-normal">→</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {formData[field.key]} {field.unit}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmedSave}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}