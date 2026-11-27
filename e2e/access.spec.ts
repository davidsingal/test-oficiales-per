import { expect, test } from "@playwright/test";

test.describe("OPS · access", () => {
  test("OPS-3: exam content is publicly readable but can't be changed without signing in", async ({ request }) => {
    for (const collection of ["questions", "answers", "topics"]) {
      const read = await request.get(`/api/${collection}?limit=1`);
      expect(read.status(), `GET ${collection}`).toBe(200);
      expect(((await read.json()) as { totalDocs: number }).totalDocs).toBeGreaterThan(0);
    }

    const { docs } = (await (await request.get("/api/topics?limit=1")).json()) as { docs: { id: number }[] };
    const writes = [
      request.post("/api/topics", { data: { name: "e2e", licence: "per" } }),
      request.patch(`/api/topics/${docs[0].id}`, { data: { description: "e2e" } }),
      request.delete(`/api/topics/${docs[0].id}`),
    ];
    for (const response of await Promise.all(writes)) {
      expect([401, 403]).toContain(response.status());
    }
  });
});
