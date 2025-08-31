"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface ContentItem {
  id: number;
  lesson_slug: string;
  topic_id: string;
  step_type: string;
  title: string;
  body_md: string;
  example_md?: string;
  is_approved: boolean;
  quality_score?: number;
  created_at: string;
}

export default function ContentReview() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setEmail("admin@example.com");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (email) {
      fetchContent();
    }
  }, [email]);

  useEffect(() => {
    console.log(`🔄 Filtering content: ${content.length} total items`);
    let filtered = content;

    if (selectedLesson !== "all") {
      filtered = filtered.filter(item => item.lesson_slug === selectedLesson);
      console.log(`📝 After lesson filter: ${filtered.length} items`);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter(item => {
        if (selectedStatus === "approved") {
          return item.is_approved;
        } else if (selectedStatus === "pending") {
          return !item.is_approved && item.quality_score === null;
        } else if (selectedStatus === "discarded") {
          return !item.is_approved && item.quality_score !== null;
        }
        return true;
      });
      console.log(`📝 After status filter (${selectedStatus}): ${filtered.length} items`);
    } else {
      filtered = filtered.filter(item => {
        return item.is_approved || (!item.is_approved && item.quality_score === null);
      });
      console.log(`📝 After excluding discarded items: ${filtered.length} items`);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(term) ||
        item.body_md.toLowerCase().includes(term) ||
        item.topic_id.toLowerCase().includes(term)
      );
      console.log(`📝 After search filter: ${filtered.length} items`);
    }

    console.log(`✅ Final filtered content: ${filtered.length} items`);
    setFilteredContent(filtered);
  }, [content, selectedLesson, selectedStatus, searchTerm]);

  const fetchContent = async () => {
    try {
      console.log("Fetching content from admin API...");
      const response = await fetch("/api/admin/approve");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("API response:", { dataLength: result.data?.length });
      
      if (result.data && result.data.length > 0) {
        const approvedItems = result.data.filter((item: ContentItem) => item.is_approved);
        const pendingItems = result.data.filter((item: ContentItem) => !item.is_approved && item.quality_score === null);
        const discardedItems = result.data.filter((item: ContentItem) => !item.is_approved && item.quality_score !== null);
        
        console.log("Data breakdown:", {
          total: result.data.length,
          approved: approvedItems.length,
          pending: pendingItems.length,
          discarded: discardedItems.length
        });
        
        if (discardedItems.length > 0) {
          console.log("Sample discarded item:", {
            id: discardedItems[0].id,
            is_approved: discardedItems[0].is_approved,
            quality_score: discardedItems[0].quality_score,
            title: discardedItems[0].title?.substring(0, 30)
          });
        }
      }
      
      setContent(result.data || []);
    } catch (error) {
      console.error("Error fetching content:", error);
    }
  };


  const handleApproval = async (id: number, approve: boolean) => {
    console.log(`🔍 handleApproval called with id=${id}, approve=${approve}`);
    setProcessingIds(prev => new Set(prev).add(id));
    
    try {
      const requestBody = { id, approve };
      console.log(`📤 Sending API request:`, requestBody);
      
      const response = await fetch("/api/admin/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`📥 API response:`, result);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to update content");
      }

      console.log(`🔄 Refetching content after successful update for id=${id}`);
      await fetchContent();
    } catch (error) {
      console.error("❌ Error updating content:", error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const uniqueLessons = Array.from(new Set(content.map(item => item.lesson_slug))).sort();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm">Loading...</div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/60 dark:bg-black/30 backdrop-blur text-center">
          <h1 className="text-xl font-semibold mb-4">Admin Access Required</h1>
          <p className="text-sm text-black/70 dark:text-white/70 mb-4">
            You must be signed in to access content review.
          </p>
          <Link
            href="/auth/login"
            className="text-sm px-3 py-2 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/60 dark:bg-black/30 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Content Review</h1>
            <Link
              href="/admin"
              className="text-sm px-3 py-2 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              Back to Dashboard
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-1">Lesson</label>
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="w-full rounded-md border border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 ring-black/10 dark:ring-white/20"
              >
                <option value="all">All Lessons</option>
                {uniqueLessons.map(lesson => (
                  <option key={lesson} value={lesson}>{lesson}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-md border border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 ring-black/10 dark:ring-white/20"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending Review</option>
                <option value="discarded">Discarded</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, content, or topic..."
                className="w-full rounded-md border border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 ring-black/10 dark:ring-white/20"
              />
            </div>
          </div>
          
          <div className="mt-4 text-sm text-black/70 dark:text-white/70">
            Showing {filteredContent.length} of {content.length} items
          </div>
        </div>

        <div className="space-y-4">
          {filteredContent.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-6 backdrop-blur ${
                item.is_approved
                  ? "border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-900/30"
                  : "border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/30"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.is_approved
                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                        : item.quality_score === null
                        ? "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                        : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                    }`}>
                      {item.is_approved ? "Approved" : item.quality_score === null ? "Pending" : "Discarded"}
                    </span>
                  </div>
                  <div className="text-sm text-black/70 dark:text-white/70 space-x-4">
                    <span>Lesson: {item.lesson_slug}</span>
                    <span>Topic: {item.topic_id}</span>
                    <span>Type: {item.step_type}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproval(item.id, true)}
                    disabled={processingIds.has(item.id) || item.is_approved}
                    className="text-sm px-3 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingIds.has(item.id) ? "..." : "Keep"}
                  </button>
                  <button
                    onClick={() => handleApproval(item.id, false)}
                    disabled={processingIds.has(item.id)}
                    className="text-sm px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingIds.has(item.id) ? "..." : "Discard"}
                  </button>
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{item.body_md}</ReactMarkdown>
                {item.example_md && (
                  <div className="mt-4 p-3 rounded-lg bg-black/5 dark:bg-white/5">
                    <div className="text-sm font-medium mb-2">Example:</div>
                    <ReactMarkdown>{item.example_md}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredContent.length === 0 && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 p-12 bg-white/60 dark:bg-black/30 backdrop-blur text-center">
            <div className="text-lg font-medium mb-2">No content found</div>
            <div className="text-sm text-black/70 dark:text-white/70">
              Try adjusting your filters or search terms.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
