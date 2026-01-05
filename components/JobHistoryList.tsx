import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// Job status type
type JobStatus = "pending" | "processing" | "completed" | "failed";

// Job interface matching Convex schema
interface Job {
  _id: Id<"jobs">;
  _creationTime: number;
  batchId?: string;
  sourceUrl: string;
  presetName?: string;
  status: JobStatus;
  error?: string;
  generatedFileName?: string;
  generatedUrl?: string;
  totalTokens?: number;
  createdAt: number;
  completedAt?: number;
}

// Status badge component with color coding
const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const config = {
    completed: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      border: "border-green-500/50",
      icon: "\u2713",
    },
    failed: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/50",
      icon: "\u2717",
    },
    processing: {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      border: "border-orange-500/50",
      icon: "\u25CF",
    },
    pending: {
      bg: "bg-gray-500/20",
      text: "text-gray-400",
      border: "border-gray-500/50",
      icon: "\u25CB",
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={status === "processing" ? "animate-pulse" : ""}>
        {c.icon}
      </span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Format timestamp to readable date
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

// Truncate URL for display
const truncateUrl = (url: string, maxLength = 40): string => {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + "...";
};

export const JobHistoryList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const pageSize = 10;

  // Use Convex query for real-time updates
  const jobsData = useQuery(
    api.publicJobs.listJobs,
    {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      status: statusFilter !== "all" ? statusFilter : undefined,
    }
  );

  const loading = jobsData === undefined;
  const jobs = jobsData?.jobs ?? [];
  const total = jobsData?.total ?? 0;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Job History
            {loading && (
              <svg
                className="animate-spin h-4 w-4 text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {total} total jobs {statusFilter !== "all" && `(filtered by ${statusFilter})`}
            {!loading && <span className="ml-2 text-green-500">Live updates</span>}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as JobStatus | "all");
              setCurrentPage(1);
            }}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && jobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-400">No jobs found</h3>
            <p className="text-sm text-gray-500">
              {statusFilter !== "all"
                ? `No ${statusFilter} jobs to display`
                : "Jobs will appear here when you process images via the API"}
            </p>
          </div>
        ) : (
          <>
            {/* Jobs Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Source</th>
                    <th className="pb-3 pr-4">Preset</th>
                    <th className="pb-3 pr-4">Tokens</th>
                    <th className="pb-3 pr-4">Created</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {jobs.map((job) => (
                    <tr
                      key={job._id}
                      className="hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className="text-sm text-gray-300 font-mono"
                          title={job.sourceUrl}
                        >
                          {truncateUrl(job.sourceUrl)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-gray-400">
                          {job.presetName || "-"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-purple-300 font-mono">
                          {job.totalTokens?.toLocaleString() || "-"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-gray-400">
                          {formatDate(job.createdAt)}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {job.generatedUrl && (
                            <a
                              href={job.generatedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              View
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="text-gray-400 hover:text-white text-sm"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded bg-gray-700 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded bg-gray-700 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Job Details</h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-24">Status:</span>
                <StatusBadge status={selectedJob.status} />
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 text-sm w-24">Job ID:</span>
                <span className="text-white text-sm font-mono break-all">
                  {selectedJob._id}
                </span>
              </div>
              {selectedJob.batchId && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 text-sm w-24">Batch ID:</span>
                  <span className="text-white text-sm font-mono break-all">
                    {selectedJob.batchId}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-gray-400 text-sm w-24">Source URL:</span>
                <a
                  href={selectedJob.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm break-all"
                >
                  {selectedJob.sourceUrl}
                </a>
              </div>
              {selectedJob.presetName && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 text-sm w-24">Preset:</span>
                  <span className="text-white text-sm">
                    {selectedJob.presetName}
                  </span>
                </div>
              )}
              {selectedJob.generatedFileName && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 text-sm w-24">Output:</span>
                  <span className="text-white text-sm font-mono">
                    {selectedJob.generatedFileName}
                  </span>
                </div>
              )}
              {selectedJob.totalTokens && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 text-sm w-24">Tokens:</span>
                  <span className="text-purple-300 text-sm font-mono">
                    {selectedJob.totalTokens.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="text-gray-400 text-sm w-24">Created:</span>
                <span className="text-white text-sm">
                  {formatDate(selectedJob.createdAt)}
                </span>
              </div>
              {selectedJob.completedAt && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 text-sm w-24">Completed:</span>
                  <span className="text-white text-sm">
                    {formatDate(selectedJob.completedAt)}
                  </span>
                </div>
              )}
              {selectedJob.error && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-400 text-sm w-24">Error:</span>
                  <span className="text-red-400 text-sm">
                    {selectedJob.error}
                  </span>
                </div>
              )}
              {selectedJob.generatedUrl && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <p className="text-gray-400 text-sm mb-3">Generated Image:</p>
                  <img
                    src={selectedJob.generatedUrl}
                    alt="Generated"
                    className="max-w-full rounded-lg border border-gray-600"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
