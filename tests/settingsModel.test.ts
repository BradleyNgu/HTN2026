import { describe, expect, it } from "vitest";

import {
  migrateSettings,
  removeCallerFromSettings,
} from "../src/store/settingsModel";

describe("settings migration", () => {
  it("migrates the selected legacy preset into an editable caller", () => {
    const settings = migrateSettings({
      hasCompletedOnboarding: true,
      selectedPresetId: "boss",
      sensitivity: "high",
      triggerDelaySeconds: 5,
    });

    expect(settings.schemaVersion).toBe(2);
    expect(settings.callers).toHaveLength(1);
    expect(settings.callers[0]).toMatchObject({
      name: "Morgan",
      relationship: "Boss",
      audio: null,
    });
    expect(settings.selectedCallerId).toBe(settings.callers[0].id);
    expect(settings.hasCompletedOnboarding).toBe(true);
  });

  it("keeps a migrated custom caller name and script", () => {
    const settings = migrateSettings({
      selectedPresetId: "custom",
      customPreset: {
        name: "Priya",
        relationship: "Roommate",
        initials: "P",
        script: "Please come home right away.",
      },
    });

    expect(settings.callers[0]).toMatchObject({
      name: "Priya",
      relationship: "Roommate",
      fallbackScript: "Please come home right away.",
    });
  });
});

describe("caller deletion", () => {
  it("selects the next caller when the selected caller is deleted", () => {
    const base = migrateSettings(null);
    const second = {
      ...base.callers[0],
      id: "second",
      name: "Second",
    };
    const settings = {
      ...base,
      callers: [base.callers[0], second],
      selectedCallerId: base.callers[0].id,
    };

    const next = removeCallerFromSettings(
      settings,
      base.callers[0].id,
    );
    expect(next.callers).toEqual([second]);
    expect(next.selectedCallerId).toBe(second.id);
  });

  it("always leaves one valid starter caller", () => {
    const base = migrateSettings(null);
    const next = removeCallerFromSettings(base, base.selectedCallerId);
    expect(next.callers).toHaveLength(1);
    expect(next.selectedCallerId).toBe(next.callers[0].id);
  });
});
