/**
 * Convex Integration Examples
 *
 * This file demonstrates how to use Convex queries and mutations
 * in React components for real-time database access.
 */

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// ============================================================================
// EXAMPLE 1: Display Job History with Real-Time Updates
// ============================================================================

export const JobHistoryExample: React.FC = () => {
  // Use Convex query - automatically updates when data changes
  const jobsData = useQuery(api.publicJobs.listJobs, {
    limit: 10,
    offset: 0,
  });

  // Loading state
  if (jobsData === undefined) {
    return <div>Loading jobs...</div>;
  }

  return (
    <div>
      <h2>Recent Jobs ({jobsData.total})</h2>
      <ul>
        {jobsData.jobs.map((job) => (
          <li key={job._id}>
            {job.status} - {job.sourceUrl}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// EXAMPLE 2: Filter Jobs by Status
// ============================================================================

export const FilteredJobsExample: React.FC = () => {
  const [filter, setFilter] = useState<"pending" | "completed" | "failed">(
    "completed"
  );

  // Query updates automatically when filter changes
  const jobsData = useQuery(api.publicJobs.listJobs, {
    limit: 20,
    status: filter,
  });

  return (
    <div>
      <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
      </select>

      {jobsData?.jobs.map((job) => (
        <div key={job._id}>{job.status}</div>
      ))}
    </div>
  );
};

// ============================================================================
// EXAMPLE 3: Get Single Job Details
// ============================================================================

export const JobDetailsExample: React.FC<{ jobId: Id<"jobs"> }> = ({
  jobId,
}) => {
  const job = useQuery(api.publicJobs.getJob, { jobId });

  if (!job) return <div>Job not found</div>;

  return (
    <div>
      <h3>Job {job._id}</h3>
      <p>Status: {job.status}</p>
      <p>Source: {job.sourceUrl}</p>
      {job.generatedUrl && <img src={job.generatedUrl} alt="Result" />}
    </div>
  );
};

// ============================================================================
// EXAMPLE 4: Batch Summary Dashboard
// ============================================================================

export const BatchSummaryExample: React.FC<{ batchId: string }> = ({
  batchId,
}) => {
  const summary = useQuery(api.publicJobs.getBatchSummary, { batchId });

  if (!summary) return <div>Loading...</div>;

  return (
    <div>
      <h3>Batch: {batchId}</h3>
      <div>Total Jobs: {summary.total}</div>
      <div>Completed: {summary.completed}</div>
      <div>Failed: {summary.failed}</div>
      <div>Pending: {summary.pending}</div>
      <div>Processing: {summary.processing}</div>
      <div>Total Tokens: {summary.totalTokens.toLocaleString()}</div>
    </div>
  );
};

// ============================================================================
// EXAMPLE 5: Preset Management with Mutations
// ============================================================================

export const PresetManagerExample: React.FC = () => {
  const [presetName, setPresetName] = useState("");

  // Query for listing presets
  const presets = useQuery(api.publicPresets.listPresets);

  // Mutations for create/delete
  const createPreset = useMutation(api.publicPresets.createPreset);
  const deletePreset = useMutation(api.publicPresets.deletePreset);

  const handleCreate = async () => {
    try {
      await createPreset({
        name: presetName,
        config: {
          targetCountry: "Japan",
          additionalContext: "",
          removeBranding: false,
          addBrandingColors: false,
          brandingColor: "#3B82F6",
          addOwnLogo: false,
          filenameFindPattern: "^.*-([^-.]+)\\..*$",
          filenameReplacePattern: "neonLED_$1_TIMESTAMP.png",
        },
      });
      setPresetName("");
      alert("Preset created!");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await deletePreset({ name });
      alert("Preset deleted!");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Presets</h2>

      {/* Create New Preset */}
      <div>
        <input
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="New preset name"
        />
        <button onClick={handleCreate}>Create Preset</button>
      </div>

      {/* List Presets */}
      <ul>
        {presets?.map((preset) => (
          <li key={preset._id}>
            {preset.name} - {preset.targetCountry}
            <button onClick={() => handleDelete(preset.name)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// EXAMPLE 6: Load and Apply Preset
// ============================================================================

export const LoadPresetExample: React.FC = () => {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // List all presets
  const presets = useQuery(api.publicPresets.listPresets);

  // Get full details of selected preset
  const selectedPreset = useQuery(
    api.publicPresets.getPreset,
    selectedName ? { name: selectedName } : "skip" // Skip query if no preset selected
  );

  const handleLoad = (name: string) => {
    setSelectedName(name);
  };

  return (
    <div>
      <h2>Load Preset</h2>

      {/* Preset Selector */}
      <select onChange={(e) => handleLoad(e.target.value)}>
        <option value="">Select a preset...</option>
        {presets?.map((preset) => (
          <option key={preset._id} value={preset.name}>
            {preset.name}
          </option>
        ))}
      </select>

      {/* Display Selected Preset Details */}
      {selectedPreset && (
        <div>
          <h3>{selectedPreset.name}</h3>
          <p>Country: {selectedPreset.targetCountry}</p>
          <p>Context: {selectedPreset.additionalContext}</p>
          <p>Branding Color: {selectedPreset.brandingColor}</p>
          <button
            onClick={() => {
              // Apply preset to current config
              console.log("Applying preset:", selectedPreset);
            }}
          >
            Apply This Preset
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 7: Recent Jobs Summary (Dashboard Widget)
// ============================================================================

export const DashboardSummaryExample: React.FC = () => {
  const summary = useQuery(api.publicJobs.getRecentJobsSummary, {
    limit: 5,
  });

  if (!summary) return <div>Loading...</div>;

  return (
    <div>
      <h2>Dashboard</h2>

      {/* Stats */}
      <div style={{ display: "flex", gap: "20px" }}>
        <div>
          <h4>Total Jobs</h4>
          <p>{summary.total}</p>
        </div>
        <div>
          <h4>Completed</h4>
          <p>{summary.completed}</p>
        </div>
        <div>
          <h4>Failed</h4>
          <p>{summary.failed}</p>
        </div>
        <div>
          <h4>Total Tokens</h4>
          <p>{summary.totalTokens.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent Jobs */}
      <h3>Recent Jobs</h3>
      <ul>
        {summary.recentJobs.map((job) => (
          <li key={job._id}>
            {job.status} - {new Date(job.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// EXAMPLE 8: Pagination with Real-Time Updates
// ============================================================================

export const PaginatedJobsExample: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const jobsData = useQuery(api.publicJobs.listJobs, {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const totalPages = jobsData ? Math.ceil(jobsData.total / pageSize) : 0;

  return (
    <div>
      <h2>Jobs (Page {page} of {totalPages})</h2>

      {/* Jobs List */}
      {jobsData?.jobs.map((job) => (
        <div key={job._id}>{job.sourceUrl}</div>
      ))}

      {/* Pagination Controls */}
      <div>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </button>
        <span> Page {page} of {totalPages} </span>
        <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// EXAMPLE 9: Error Handling with Mutations
// ============================================================================

export const ErrorHandlingExample: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createPreset = useMutation(api.publicPresets.createPreset);

  const handleCreate = async () => {
    setError(null);
    setSuccess(false);

    try {
      await createPreset({
        name: "Test Preset",
        config: {
          /* config here */
        } as any,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <button onClick={handleCreate}>Create Preset</button>
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      {success && <div style={{ color: "green" }}>Success!</div>}
    </div>
  );
};

// ============================================================================
// EXAMPLE 10: Conditional Queries (Skip Pattern)
// ============================================================================

export const ConditionalQueryExample: React.FC = () => {
  const [jobId, setJobId] = useState<Id<"jobs"> | null>(null);

  // Only run query if jobId is set
  const job = useQuery(
    api.publicJobs.getJob,
    jobId ? { jobId } : "skip"
  );

  return (
    <div>
      <button onClick={() => setJobId("j_abc123" as Id<"jobs">)}>
        Load Job
      </button>

      {job && (
        <div>
          <h3>Job Details</h3>
          <p>Status: {job.status}</p>
        </div>
      )}
    </div>
  );
};
