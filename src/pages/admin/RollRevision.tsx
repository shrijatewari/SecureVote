import { useState, useEffect } from 'react';
import { revisionService } from '../../services/api';

export default function RollRevision() {
  const [revisionBatches, setRevisionBatches] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dryRunMode, setDryRunMode] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await revisionService.getAll(1, 100);
      setRevisionBatches(response.data.batches || []);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const handleDryRun = async () => {
    setLoading(true);
    setDryRunMode(true);
    try {
      // Call dry-run API
      const response = await revisionService.runDryRun({ region: 'all' });
      const result = response.data || response;
      setFlags(result.flags || []);
      if (result.batch_id) {
        // Fetch batch flags
        const flagsResponse = await revisionService.getBatchFlags(result.batch_id);
        setFlags(flagsResponse.data?.flags || result.flags || []);
      }
      alert(`Dry-run completed. Found ${result.flags_count || result.flags?.length || 0} flags.`);
      fetchBatches(); // Refresh batches
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'Failed to run dry-run');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async (batchId: number) => {
    if (!confirm('Are you sure you want to commit this revision batch? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await revisionService.commit(batchId);
      alert('Revision batch committed successfully!');
      fetchBatches();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to commit batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Roll Revision Module</h1>
          <p className="text-gray-600">Manage electoral roll revisions with dry-run and commit workflow</p>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex space-x-4">
            <button
              onClick={handleDryRun}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              🔄 Run Dry Revision
            </button>
            <button
              onClick={fetchBatches}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Refresh Batches
            </button>
          </div>
        </div>

        {/* Dry Run Results */}
        {dryRunMode && flags.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Dry-Run Results</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Found <span className="font-bold text-red-600">{flags.length}</span> flags that need review
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Voter ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {flags.map((flag: any) => (
                    <tr key={flag.flag_id}>
                      <td className="px-4 py-3 text-sm">{flag.voter_id}</td>
                      <td className="px-4 py-3 text-sm">{flag.reason}</td>
                      <td className="px-4 py-3 text-sm">{flag.score}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          Pending
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button className="text-blue-600 hover:text-blue-800">Review</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Revision Batches */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Revision Batches</h2>
          {revisionBatches.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No revision batches found</p>
          ) : (
            <div className="space-y-4">
              {revisionBatches.map((batch) => (
                <div
                  key={batch.batch_id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">Batch #{batch.batch_id}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Region: {batch.region} | Status: {batch.status}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(batch.start_date).toLocaleDateString()} -{' '}
                        {new Date(batch.end_date).toLocaleDateString()}
                      </p>
                      {batch.merkle_root && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          Merkle Root: {batch.merkle_root.slice(0, 20)}...
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {batch.status === 'draft' && (
                        <button
                          onClick={() => handleCommit(batch.batch_id)}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                        >
                          Commit
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedBatch(batch)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


