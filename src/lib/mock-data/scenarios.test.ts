import { describe, it, expect } from "vitest";
import {
  SCENARIO_IDS,
  getScenarioConfig,
  isScenarioTutor,
  isChronicNoShowTutor,
} from "./scenarios";

describe("scenarios", () => {
  describe("SCENARIO_IDS", () => {
    it("should define all scenario IDs", () => {
      expect(SCENARIO_IDS.CHRONIC_NO_SHOW).toBe("tutor_10000");
      expect(SCENARIO_IDS.ALWAYS_LATE).toBe("tutor_10001");
      expect(SCENARIO_IDS.POOR_FIRST_SESSIONS).toBe("tutor_10002");
      expect(SCENARIO_IDS.FREQUENT_RESCHEDULER).toBe("tutor_10003");
      expect(SCENARIO_IDS.ENDS_EARLY).toBe("tutor_10004");
    });
  });

  describe("getScenarioConfig", () => {
    it("should return config for chronic no-show tutor", () => {
      const config = getScenarioConfig(SCENARIO_IDS.CHRONIC_NO_SHOW);
      expect(config).not.toBeNull();
      expect(config?.noShowRate).toBe(0.16);
    });

    it("should return config for always late tutor", () => {
      const config = getScenarioConfig(SCENARIO_IDS.ALWAYS_LATE);
      expect(config).not.toBeNull();
      expect(config?.avgLatenessMinutes).toBe(15);
    });

    it("should return null for non-scenario tutor", () => {
      const config = getScenarioConfig("tutor_00001");
      expect(config).toBeNull();
    });
  });

  describe("isScenarioTutor", () => {
    it("should return true for matching scenario tutor", () => {
      expect(isScenarioTutor("tutor_10000", SCENARIO_IDS.CHRONIC_NO_SHOW)).toBe(true);
    });

    it("should return false for non-matching tutor", () => {
      expect(isScenarioTutor("tutor_00001", SCENARIO_IDS.CHRONIC_NO_SHOW)).toBe(false);
    });
  });

  describe("isChronicNoShowTutor", () => {
    it("should return true for chronic no-show tutor", () => {
      expect(isChronicNoShowTutor(SCENARIO_IDS.CHRONIC_NO_SHOW)).toBe(true);
    });

    it("should return false for other tutors", () => {
      expect(isChronicNoShowTutor("tutor_00001")).toBe(false);
      expect(isChronicNoShowTutor(SCENARIO_IDS.ALWAYS_LATE)).toBe(false);
    });
  });
});

