import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import db from "../src/config/db.ts";
import { createGroup, listGroups } from "../src/controllers/groups.ts";
import { createPost, listPosts } from "../src/controllers/posts.ts";
import { createSchedule, listSchedules, updateSchedule } from "../src/controllers/schedules.ts";
import { listLogs, getStats } from "../src/controllers/logs.ts";
import type { Request, Response } from "express";

function mockResponse() {
  const res: Partial<Response> & { _status: number; _json: any } = {
    _status: 200,
    _json: null,
    status(code: number) {
      this._status = code;
      return this as Response;
    },
    json(data: any) {
      this._json = data;
      return this as Response;
    },
  };
  return res as Response & { _status: number; _json: any };
}

describe("Multi-Account Data Isolation", () => {
  let accountAId: string;
  let accountBId: string;

  beforeAll(async () => {
    // Create two test accounts
    const accA = await db.account.create({
      data: {
        name: "Test Acc A " + Date.now(),
        sessionPath: "sessions/test_a.json",
      },
    });
    const accB = await db.account.create({
      data: {
        name: "Test Acc B " + Date.now(),
        sessionPath: "sessions/test_b.json",
      },
    });
    accountAId = accA.id;
    accountBId = accB.id;
  });

  afterAll(async () => {
    // Cascade delete test accounts
    await db.account.deleteMany({
      where: { id: { in: [accountAId, accountBId] } },
    });
  });

  it("requires accountId when creating a group and filters list by accountId", async () => {
    const resA = mockResponse();
    await createGroup(
      {
        body: {
          name: "Group A",
          url: "https://facebook.com/groups/sharedgroup123",
          accountId: accountAId,
        },
      } as Request,
      resA,
      () => {}
    );
    expect(resA._status).toBe(201);
    expect(resA._json.data.accountId).toBe(accountAId);

    // Account B can add the same fbGroupId without collision!
    const resB = mockResponse();
    await createGroup(
      {
        body: {
          name: "Group B (Same FB Group)",
          url: "https://facebook.com/groups/sharedgroup123",
          accountId: accountBId,
        },
      } as Request,
      resB,
      () => {}
    );
    expect(resB._status).toBe(201);
    expect(resB._json.data.accountId).toBe(accountBId);

    // List for Account A only returns Account A's group
    const listResA = mockResponse();
    await listGroups({ query: { accountId: accountAId } } as unknown as Request, listResA, () => {});
    expect(listResA._status).toBe(200);
    const namesA = listResA._json.data.map((g: any) => g.name);
    expect(namesA).toContain("Group A");
    expect(namesA).not.toContain("Group B (Same FB Group)");
  });

  it("requires accountId when creating a post and filters list by accountId", async () => {
    const resA = mockResponse();
    await createPost(
      {
        body: {
          title: "Post for Account A",
          content: "Content A",
          accountId: accountAId,
        },
      } as unknown as Request,
      resA,
      () => {}
    );
    expect(resA._status).toBe(201);
    expect(resA._json.data.accountId).toBe(accountAId);

    const resB = mockResponse();
    await createPost(
      {
        body: {
          title: "Post for Account B",
          content: "Content B",
          accountId: accountBId,
        },
      } as unknown as Request,
      resB,
      () => {}
    );
    expect(resB._status).toBe(201);
    expect(resB._json.data.accountId).toBe(accountBId);

    // List for Account A only returns Account A's post
    const listResA = mockResponse();
    await listPosts({ query: { accountId: accountAId } } as unknown as Request, listResA, () => {});
    const titlesA = listResA._json.data.map((p: any) => p.title);
    expect(titlesA).toContain("Post for Account A");
    expect(titlesA).not.toContain("Post for Account B");
  });

  it("rejects cross-account association when creating a schedule", async () => {
    // Fetch group and post for account B and A
    const groupA = await db.group.findFirst({ where: { accountId: accountAId } });
    const groupB = await db.group.findFirst({ where: { accountId: accountBId } });
    const postA = await db.post.findFirst({ where: { accountId: accountAId } });
    const postB = await db.post.findFirst({ where: { accountId: accountBId } });

    // Attempting to create schedule for Account A with Group B
    const crossGroupRes = mockResponse();
    await createSchedule(
      {
        body: {
          name: "Cross Group Schedule",
          cronExpression: "0 9 * * *",
          accountId: accountAId,
          postId: postA!.id,
          groupIds: [groupB!.id],
        },
      } as Request,
      crossGroupRes,
      () => {}
    );

    expect(crossGroupRes._status).toBe(422);
    expect(crossGroupRes._json.code).toBe("CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN");

    // Attempting to create schedule for Account A with Post B
    const crossPostRes = mockResponse();
    await createSchedule(
      {
        body: {
          name: "Cross Post Schedule",
          cronExpression: "0 9 * * *",
          accountId: accountAId,
          postId: postB!.id,
          groupIds: [groupA!.id],
        },
      } as Request,
      crossPostRes,
      () => {}
    );

    expect(crossPostRes._status).toBe(422);
    expect(crossPostRes._json.code).toBe("CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN");

    // Valid schedule for Account A
    const validRes = mockResponse();
    await createSchedule(
      {
        body: {
          name: "Valid Schedule A",
          cronExpression: "0 9 * * *",
          accountId: accountAId,
          postId: postA!.id,
          groupIds: [groupA!.id],
        },
      } as Request,
      validRes,
      () => {}
    );
    expect(validRes._status).toBe(201);
    const scheduleAId = validRes._json.data.id;

    // Attempting to update schedule A to include Group B
    const updateCrossRes = mockResponse();
    await updateSchedule(
      {
        params: { id: scheduleAId },
        body: {
          groupIds: [groupB!.id],
        },
      } as unknown as Request,
      updateCrossRes,
      () => {}
    );
    expect(updateCrossRes._status).toBe(422);
    expect(updateCrossRes._json.code).toBe("CROSS_ACCOUNT_ASSOCIATION_FORBIDDEN");
  });

  it("returns empty data when accountId is missing, preventing multi-tenant leakage", async () => {
    const emptyGroups = mockResponse();
    await listGroups({ query: {} } as Request, emptyGroups, () => {});
    expect(emptyGroups._json.data).toEqual([]);

    const emptyPosts = mockResponse();
    await listPosts({ query: {} } as unknown as Request, emptyPosts, () => {});
    expect(emptyPosts._json.data).toEqual([]);

    const emptySchedules = mockResponse();
    await listSchedules({ query: {} } as Request, emptySchedules, () => {});
    expect(emptySchedules._json.data).toEqual([]);

    const emptyLogs = mockResponse();
    await listLogs({ query: {} } as Request, emptyLogs, () => {});
    expect(emptyLogs._json.data.logs).toEqual([]);

    const emptyStats = mockResponse();
    await getStats({ query: {} } as Request, emptyStats, () => {});
    expect(emptyStats._json.data.totalPosts).toBe(0);
  });

  it("filters stats and logs by accountId", async () => {
    // Add a log for Account A
    await db.postLog.create({
      data: {
        accountId: accountAId,
        status: "SUCCESS",
      },
    });

    const statsResA = mockResponse();
    await getStats({ query: { accountId: accountAId } } as unknown as Request, statsResA, () => {});
    expect(statsResA._status).toBe(200);
    expect(statsResA._json.data.totalPosts).toBe(1);

    const statsResB = mockResponse();
    await getStats({ query: { accountId: accountBId } } as unknown as Request, statsResB, () => {});
    expect(statsResB._status).toBe(200);
    expect(statsResB._json.data.totalPosts).toBe(0);

    const logsResA = mockResponse();
    await listLogs({ query: { accountId: accountAId } } as unknown as Request, logsResA, () => {});
    expect(logsResA._status).toBe(200);
    expect(logsResA._json.data.total).toBe(1);

    const logsResB = mockResponse();
    await listLogs({ query: { accountId: accountBId } } as unknown as Request, logsResB, () => {});
    expect(logsResB._status).toBe(200);
    expect(logsResB._json.data.total).toBe(0);
  });
});
