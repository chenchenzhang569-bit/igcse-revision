"use client";

import { TopicQuestionsTab } from "./TopicQuestionsTab";

export default function TopicQuestionsClient({ topicId, preloadedQuestions }: { topicId: string; preloadedQuestions?: any[] }) {
  return <TopicQuestionsTab topicId={topicId} preloadedQuestions={preloadedQuestions} />;
}
