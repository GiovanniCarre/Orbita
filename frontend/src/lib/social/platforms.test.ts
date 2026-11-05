import { describe, expect, it } from "vitest";
import { selectedPlatforms, validVideo } from "./platforms";

describe("préparation sociale", () => {
  it("retient uniquement les réseaux sélectionnés dans l'ordre proposé", () => {
    expect(
      selectedPlatforms(["tiktok", "youtube", "pinterest"]).map(
        (item) => item.id,
      ),
    ).toEqual(["youtube", "tiktok", "pinterest"]);
  });

  it("refuse les fichiers vides et les fichiers non vidéo", () => {
    expect(validVideo({ type: "video/mp4", size: 42 })).toBe(true);
    expect(validVideo({ type: "video/mp4", size: 0 })).toBe(false);
    expect(validVideo({ type: "image/png", size: 42 })).toBe(false);
  });
});
