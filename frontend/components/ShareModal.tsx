"use client";

import { useState } from "react";
import axios from "axios";

export default function ShareModal({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const [emails, setEmails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Tách chuỗi email/ID thành mảng (ví dụ nhập: user1@gmail.com, user2@gmail.com)
      const userList = emails.split(",").map((e) => e.trim()).filter(Boolean);

      await axios.post(
        `http://localhost:8080/files/share/${fileId}`,
        { sharedWith: userList },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Chia sẻ file thành công!");
      onClose();
    } catch (error) {
      console.error("Lỗi chia sẻ:", error);
      alert("Không thể chia sẻ file. Vui lòng kiểm tra lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-96 space-y-4">
        <h3 className="font-bold text-lg">Chia sẻ file</h3>
        <p className="text-sm text-gray-500">Nhập danh sách User ID / Email (phân cách bằng dấu phẩy):</p>
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="user1@gmail.com, user2@gmail.com"
          className="w-full border rounded-lg p-2 text-sm h-24"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Hủy</button>
          <button 
            onClick={handleShare} 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            {loading ? "Đang gửi..." : "Chia sẻ"}
          </button>
        </div>
      </div>
    </div>
  );
}