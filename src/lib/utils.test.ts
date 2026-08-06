import { describe, expect, it } from "vitest";
import { isFolderDescendant } from "./utils";
import type { Folder } from "../types/domain";

const stamp = { uid: "u", email: "u@example.com", displayName: "User" };
const base = { createdAt: 1, updatedAt: 1, createdBy: stamp, updatedBy: stamp };

function folder(id: string, parentFolderId: string): Folder {
  return {
    ...base,
    id,
    name: id,
    description: "",
    endeavorId: "e1",
    parentFolderId,
  };
}

describe("isFolderDescendant", () => {
  const folders = {
    a: folder("a", ""),
    b: folder("b", "a"),
    c: folder("c", "b"),
  };

  it("detects self and descendants", () => {
    expect(isFolderDescendant(folders, "a", "a")).toBe(true);
    expect(isFolderDescendant(folders, "c", "a")).toBe(true);
  });

  it("allows unrelated or ancestor destinations", () => {
    expect(isFolderDescendant(folders, "a", "c")).toBe(false);
    expect(isFolderDescendant(folders, "", "a")).toBe(false);
  });
});
