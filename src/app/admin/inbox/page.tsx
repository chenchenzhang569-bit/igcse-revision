"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

interface Email {
  id: string;
  sender: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  recipient: string;
  created_at: string;
  read: boolean;
  replied: boolean;
}

export default function AdminInboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Email | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase
        .from("inbound_emails")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        setError(error.message);
      } else {
        setEmails(data || []);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const markRead = async (id: string) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.from("inbound_emails").update({ read: true }).eq("id", id);
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, read: true } : e)));
  };

  const Markdown = ({ text }: { text: string | null }) => {
    if (!text) return <p className="text-gray-400 italic">无内容</p>;
    return (
      <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
        {text}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">📬 收件箱</h1>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg">
          加载失败：{error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">📬 收件箱</h1>

      {emails.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4">📭</p>
          <p>暂无邮件</p>
        </div>
      ) : (
        <div className="flex gap-4 flex-col lg:flex-row">
          {/* Email list */}
          <div className="lg:w-1/2 xl:w-2/5 space-y-2 overflow-y-auto max-h-[70vh]">
            {emails.map((email) => (
              <button
                key={email.id}
                onClick={() => {
                  setSelected(email);
                  if (!email.read) markRead(email.id);
                }}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selected?.id === email.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : email.read
                    ? "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    : "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 font-semibold"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className={`truncate ${email.read ? "" : "font-semibold"}`}>
                    {email.sender}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(email.created_at).toLocaleDateString("zh-CN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                  {email.subject || "(无主题)"}
                </p>
              </button>
            ))}
          </div>

          {/* Email details */}
          <div className="lg:w-1/2 xl:w-3/5 border rounded-lg p-6 dark:border-gray-700 min-h-[300px]">
            {selected ? (
              <div>
                <h2 className="text-lg font-semibold mb-1">{selected.subject || "(无主题)"}</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 space-y-1">
                  <p>发件人：{selected.sender}</p>
                  <p>收件人：{selected.recipient}</p>
                  <p>
                    时间：{new Date(selected.created_at).toLocaleString("zh-CN")}
                  </p>
                  <p className="inline-flex gap-2 mt-2">
                    {!selected.read && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                        未读
                      </span>
                    )}
                    {selected.replied && (
                      <span className="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                        已回复
                      </span>
                    )}
                  </p>
                </div>
                <hr className="my-4 dark:border-gray-700" />
                <Markdown text={selected.body_text} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                选择一封邮件查看详情
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
