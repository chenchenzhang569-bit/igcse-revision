"use client";

import { useState } from "react";
import Link from "next/link";

// Mock data per topic
const topicData: Record<string, {
  displayName: string;
  subjectSlug: string;
  subjectName: string;
  notes: { title: string; content: string; isFree: boolean }[];
  questions: { id: number; text: string; answer: string; difficulty: string; marks: number }[];
}> = {
  "algebra-and-graphs": {
    displayName: "代数与图像",
    subjectSlug: "caie-mathematics-0580",
    subjectName: "数学",
    notes: [
      {
        title: "一次函数 (Linear Functions)",
        isFree: true,
        content: `## y = mx + c\n\n- **m** = 斜率 (gradient) = 每增加 1 单位 x，y 增加 m 单位\n- **c** = y 轴截距 (y-intercept)，即 x = 0 时的 y 值\n\n### 求斜率\n\n$$m = \\\\frac{y_2 - y_1}{x_2 - x_1}$$\n\n### 例题\n\n求经过 (2, 5) 和 (4, 9) 的直线方程。\n\n$$m = \\\\frac{9-5}{4-2} = \\\\frac{4}{2} = 2$$\n\n代入 y = mx + c:  5 = 2(2) + c → c = 1\n\n**答案：y = 2x + 1**`,
      },
      {
        title: "二次函数 (Quadratic Functions)",
        isFree: true,
        content: `## y = ax² + bx + c\n\n二次函数图像是**抛物线 (parabola)**。\n\n- **a > 0**: ∪ 形（开口朝上，有最小值）\n- **a < 0**: ∩ 形（开口朝下，有最大值）\n\n### 顶点坐标\n\n$$x = -\\\\frac{b}{2a}$$\n\n### 配方法 (Completing the Square)\n\n将 $x^2 + 6x + 5$ 写成 $(x + p)^2 + q$ 的形式：\n\n$x^2 + 6x + 5 = (x+3)^2 - 9 + 5 = (x+3)^2 - 4$\n\n→ 顶点为 (-3, -4)`,
      },
      {
        title: "解二次方程",
        isFree: false,
        content: `## 三种方法\n\n### 1. 因式分解\n$x^2 - 5x + 6 = (x-2)(x-3) = 0$ → x = 2 或 x = 3\n\n### 2. 公式法\n$$x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}$$\n\n### 3. 配方法\n见上方笔记`,
      },
    ],
    questions: [
      {
        id: 1,
        text: "Find the equation of the line passing through (1, 4) and (3, 10).",
        answer: "m = (10-4)/(3-1) = 6/2 = 3\n代入 (1,4): 4 = 3(1) + c → c = 1\n答案: y = 3x + 1",
        difficulty: "easy",
        marks: 3,
      },
      {
        id: 2,
        text: "Solve the quadratic equation: $x^2 - 7x + 12 = 0$",
        answer: "因式分解: (x-3)(x-4) = 0\n→ x = 3 或 x = 4",
        difficulty: "easy",
        marks: 2,
      },
      {
        id: 3,
        text: "Find the coordinates of the vertex of $y = 2x^2 - 8x + 5$",
        answer: "x = -b/(2a) = 8/4 = 2\ny = 2(4) - 8(2) + 5 = 8 - 16 + 5 = -3\n顶点: (2, -3)",
        difficulty: "medium",
        marks: 3,
      },
    ],
  },
  "general-physics": {
    displayName: "普通物理",
    subjectSlug: "caie-physics-0625",
    subjectName: "物理",
    notes: [
      {
        title: "运动学 (Kinematics)",
        isFree: true,
        content: `## SUVAT 公式 (匀加速运动)\n\n- **s** = 位移 (displacement)\n- **u** = 初速度 (initial velocity)\n- **v** = 末速度 (final velocity)\n- **a** = 加速度 (acceleration)\n- **t** = 时间 (time)\n\n### 四个基本公式\n\n1. $v = u + at$\n2. $s = ut + \\\\frac{1}{2}at^2$\n3. $v^2 = u^2 + 2as$\n4. $s = \\\\frac{u+v}{2}t$`,
      },
      {
        title: "速度-时间图",
        isFree: false,
        content: `## v-t 图解读\n\n- **斜率** = 加速度\n- **面积** = 位移\n- **水平线** = 匀速运动\n- **直线上升** = 匀加速\n- **直线下降** = 匀减速（负加速度）`,
      },
    ],
    questions: [
      {
        id: 1,
        text: "A car accelerates from rest at 2 m/s² for 10 seconds. Find its final velocity.",
        answer: "v = u + at = 0 + 2(10) = 20 m/s",
        difficulty: "easy",
        marks: 2,
      },
      {
        id: 2,
        text: "A ball is dropped from a height of 20 m. Given g = 10 m/s², find the time it takes to hit the ground.",
        answer: "s = ut + ½at²\n20 = 0 + ½(10)t²\n20 = 5t²\nt² = 4\nt = 2 seconds",
        difficulty: "medium",
        marks: 3,
      },
    ],
  },
};

export default function TopicPage({
  params,
}: {
  params: { slug: string; topicSlug: string };
}) {
  const [activeTab, setActiveTab] = useState<"notes" | "questions">("notes");
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const data = topicData[params.topicSlug];
  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">主题数据准备中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400">
        <Link href="/dashboard" className="hover:text-primary-600">仪表盘</Link>
        {" / "}
        <Link href={`/subjects/${data.subjectSlug}`} className="hover:text-primary-600">
          {data.subjectName}
        </Link>
        {" / "}
        <span className="text-gray-700">{data.displayName}</span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">{data.displayName}</h1>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
            activeTab === "notes"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          📝 笔记 ({data.notes.length})
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-6 py-3 font-medium text-sm transition border-b-2 ${
            activeTab === "questions"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          📋 试题 ({data.questions.length})
        </button>
      </div>

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          {data.notes.map((note, i) => (
            <div key={i} className="bg-white border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{note.title}</h3>
                {note.isFree && (
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                    免费预览
                  </span>
                )}
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                {note.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          {data.questions.map((q) => (
            <div key={q.id} className="bg-white border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                className="w-full p-5 text-left hover:bg-gray-50 transition flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                      Q{q.id}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      q.difficulty === "easy"
                        ? "bg-green-50 text-green-600"
                        : q.difficulty === "medium"
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-red-50 text-red-600"
                    }`}>
                      {q.difficulty === "easy" ? "简单" : q.difficulty === "medium" ? "中等" : "困难"}
                    </span>
                    <span className="text-xs text-gray-400">{q.marks} 分</span>
                  </div>
                  <p className="text-gray-800">{q.text}</p>
                </div>
                <span className="text-gray-300 text-lg mt-1">
                  {expandedQuestion === q.id ? "▲" : "▼"}
                </span>
              </button>
              {expandedQuestion === q.id && (
                <div className="border-t bg-green-50 p-5">
                  <p className="text-xs text-green-600 font-medium mb-2">📝 答案</p>
                  <p className="text-gray-800 whitespace-pre-line text-sm">{q.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
