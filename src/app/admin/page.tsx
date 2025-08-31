"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface ContentStats {
  total: number;
  approved: number;
  pending: number;
  byLesson: Record<string, { total: number; approved: number }>;
}

export default function AdminDashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ContentStats | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (email) {
      fetchStats();
    }
  }, [email]);

  const fetchStats = async () => {
    try {
      const { data: content, error } = await supabase
        .from("pre_generated_panels")
        .select("lesson_slug, is_approved");

      if (error) throw error;

      const total = content?.length || 0;
      const approved = content?.filter(item => item.is_approved).length || 0;
      const pending = total - approved;

      const byLesson: Record<string, { total: number; approved: number }> = {};
      content?.forEach(item => {
        if (!byLesson[item.lesson_slug]) {
          byLesson[item.lesson_slug] = { total: 0, approved: 0 };
        }
        byLesson[item.lesson_slug].total++;
        if (item.is_approved) {
          byLesson[item.lesson_slug].approved++;
        }
      });

      setStats({ total, approved, pending, byLesson });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

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
            You must be signed in to access the admin dashboard.
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
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/60 dark:bg-black/30 backdrop-blur">
          <h1 className="text-2xl font-semibold mb-2">Content Admin Dashboard</h1>
          <p className="text-sm text-black/70 dark:text-white/70">
            Review and manage pre-generated content for the finance tutor.
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 bg-white/50 dark:bg-black/20 backdrop-blur">
              <div className="text-2xl font-semibold">{stats.total}</div>
              <div className="text-sm text-black/70 dark:text-white/70">Total Content</div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 bg-white/50 dark:bg-black/20 backdrop-blur">
              <div className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.approved}</div>
              <div className="text-sm text-black/70 dark:text-white/70">Approved</div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 p-4 bg-white/50 dark:bg-black/20 backdrop-blur">
              <div className="text-2xl font-semibold text-orange-600 dark:text-orange-400">{stats.pending}</div>
              <div className="text-sm text-black/70 dark:text-white/70">Pending Review</div>
            </div>
          </div>
        )}

        {stats && Object.keys(stats.byLesson).length > 0 && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/60 dark:bg-black/30 backdrop-blur">
            <h2 className="text-lg font-semibold mb-4">Content by Lesson</h2>
            <div className="space-y-3">
              {Object.entries(stats.byLesson).map(([lesson, lessonStats]) => (
                <div key={lesson} className="flex items-center justify-between p-3 rounded-lg border border-black/10 dark:border-white/15 bg-white/30 dark:bg-black/20">
                  <div>
                    <div className="font-medium">{lesson}</div>
                    <div className="text-sm text-black/70 dark:text-white/70">
                      {lessonStats.approved} of {lessonStats.total} approved
                    </div>
                  </div>
                  <div className="text-sm">
                    {Math.round((lessonStats.approved / lessonStats.total) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/60 dark:bg-black/30 backdrop-blur">
          <h2 className="text-lg font-semibold mb-4">Actions</h2>
          <div className="space-y-3">
            <Link
              href="/admin/content"
              className="block w-full text-left px-4 py-3 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <div className="font-medium">Review Content</div>
              <div className="text-sm text-black/70 dark:text-white/70">
                Review and approve/reject pre-generated content
              </div>
            </Link>
            <Link
              href="/"
              className="block w-full text-left px-4 py-3 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <div className="font-medium">Back to App</div>
              <div className="text-sm text-black/70 dark:text-white/70">
                Return to the main finance tutor application
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
