import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// Preset configuration type
interface PresetConfig {
  targetCountry: string;
  additionalContext: string;
  removeBranding: boolean;
  addBrandingColors: boolean;
  brandingColor: string;
  addOwnLogo: boolean;
  ownLogoData?: string | null;
  filenameFindPattern: string;
  filenameReplacePattern: string;
  modelVersion?: string;
  aspectRatio?: string;
  imageSize?: string;
}

// Full preset type
interface Preset {
  _id: Id<"presets">;
  name: string;
  targetCountry: string;
  createdAt: number;
  updatedAt: number;
}

interface PresetManagerProps {
  currentConfig: PresetConfig;
  onLoadPreset: (config: PresetConfig) => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  currentConfig,
  onLoadPreset,
}) => {
  const [presetName, setPresetName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);

  // Queries
  const presets = useQuery(api.publicPresets.listPresets);
  const selectedPreset = useQuery(
    api.publicPresets.getPreset,
    selectedPresetName ? { name: selectedPresetName } : "skip"
  );

  // Mutations
  const createPreset = useMutation(api.publicPresets.createPreset);
  const deletePreset = useMutation(api.publicPresets.deletePreset);

  const loading = presets === undefined;

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      alert("Please enter a preset name");
      return;
    }

    try {
      await createPreset({
        name: presetName,
        config: currentConfig,
      });
      setPresetName("");
      setShowSaveDialog(false);
      alert(`Preset "${presetName}" saved successfully!`);
    } catch (error: any) {
      alert(`Failed to save preset: ${error.message}`);
    }
  };

  const handleLoadPreset = (name: string) => {
    setSelectedPresetName(name);
  };

  // When preset details are fetched, load them into the app
  React.useEffect(() => {
    if (selectedPreset) {
      const config: PresetConfig = {
        targetCountry: selectedPreset.targetCountry,
        additionalContext: selectedPreset.additionalContext,
        removeBranding: selectedPreset.removeBranding,
        addBrandingColors: selectedPreset.addBrandingColors,
        brandingColor: selectedPreset.brandingColor,
        addOwnLogo: selectedPreset.addOwnLogo,
        ownLogoData: selectedPreset.ownLogoData,
        filenameFindPattern: selectedPreset.filenameFindPattern,
        filenameReplacePattern: selectedPreset.filenameReplacePattern,
        modelVersion: selectedPreset.modelVersion,
        aspectRatio: selectedPreset.aspectRatio,
        imageSize: selectedPreset.imageSize,
      };
      onLoadPreset(config);
      setShowLoadMenu(false);
      setSelectedPresetName(null);
    }
  }, [selectedPreset, onLoadPreset]);

  const handleDeletePreset = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete preset "${name}"?`)) return;

    try {
      await deletePreset({ name });
    } catch (error: any) {
      alert(`Failed to delete preset: ${error.message}`);
    }
  };

  return (
    <div className="mb-6 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Preset Manager
          {loading && (
            <span className="ml-2 text-blue-400 text-[10px]">
              (syncing...)
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowSaveDialog(!showSaveDialog);
              setShowLoadMenu(false);
            }}
            className="text-xs text-green-400 hover:text-green-300"
          >
            {showSaveDialog ? "Cancel" : "Save Current"}
          </button>
          <button
            onClick={() => {
              setShowLoadMenu(!showLoadMenu);
              setShowSaveDialog(false);
            }}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showLoadMenu ? "Cancel" : "Load Saved"}
          </button>
        </div>
      </div>

      {showSaveDialog && (
        <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600 animate-fade-in">
          <label className="block text-xs text-gray-400 mb-2">
            Preset Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g., Japan Urban Style"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
            />
            <button
              onClick={handleSavePreset}
              className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {showLoadMenu && (
        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-xs text-gray-500">Loading presets...</p>
            </div>
          ) : presets && presets.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-2">
              No saved presets yet
            </p>
          ) : (
            presets?.map((preset) => (
              <div
                key={preset._id}
                onClick={() => handleLoadPreset(preset.name)}
                className="flex justify-between items-center p-2 rounded hover:bg-gray-800 cursor-pointer group transition-colors"
              >
                <div className="flex-1">
                  <div className="text-sm text-gray-300 font-medium">
                    {preset.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {preset.targetCountry} • Updated{" "}
                    {new Date(preset.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeletePreset(preset.name, e)}
                  className="text-red-500 opacity-0 group-hover:opacity-100 px-2 py-1 hover:bg-red-900/20 rounded transition-all"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
