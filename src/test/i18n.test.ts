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
