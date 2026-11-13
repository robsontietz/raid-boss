import { describe, expect, it } from "vitest";

import { colorName, localizeState } from "@/lib/i18n/messages";

describe("language switch", () => {
  it("keeps agent states unchanged in Portuguese", () => {
    expect(localizeState("Outra cor (Laranja)", "pt")).toBe("Outra cor (Laranja)");
  });

  it("translates the agent's default state names to English", () => {
    expect(localizeState("Cinza", "en")).toBe("Gray");
    expect(localizeState("Outra cor (Laranja)", "en")).toBe("Other color (Orange)");
    expect(localizeState("Desconhecido", "en")).toBe("Unknown");
  });

  it("keeps custom state labels as the user typed them", () => {
    expect(localizeState("In Battle", "en")).toBe("In Battle");
    expect(localizeState("In Battle", "pt")).toBe("In Battle");
  });

  it("names detected colors in the chosen language", () => {
    expect(colorName("red", "en")).toBe("Red");
    expect(colorName("red", "pt")).toBe("Vermelho");
  });
});

import { DEFAULT_BOSSES, RAID_LIST, isOlderVersion } from "@/lib/bosses";

describe("RAID list layout", () => {
  it("has the 20 in-game names with the 11 monitored bosses on their real rows", () => {
    expect(RAID_LIST).toHaveLength(20);
    const rows = Object.fromEntries(DEFAULT_BOSSES.map((b) => [b.name, RAID_LIST.indexOf(b.name) + 1]));
    expect(rows).toEqual({
      Gourd: 5, "Immortal Gourd": 6, "Palibati Queen Themis": 8, Lilith: 12, Anakim: 13,
      Floki: 15, Bjorn: 16, Ivar: 17, Zahir: 18, Rashid: 19, Krusha: 20,
    });
  });

  it("flags agents older than 1.1.0 for update", () => {
    expect(isOlderVersion("1.0.0", "1.1.0")).toBe(true);
    expect(isOlderVersion("1.1.0", "1.1.0")).toBe(false);
    expect(isOlderVersion("1.2.0", "1.1.0")).toBe(false);
  });
});
