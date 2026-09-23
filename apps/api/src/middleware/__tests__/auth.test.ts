import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSuperadminToken } from "../../services/superadminTokenService";
import { requireAuth, requireOwner, requireSellerMembership, requireSuperadmin } from "../auth";
import { AppError } from "../errors";

const { getUser, maybeSingle, findAuthUserPhoneById } = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  findAuthUserPhoneById: vi.fn(),
}));

vi.mock("../../config/supabase", () => ({
  supabaseAdmin: {
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle,
          }),
          maybeSingle,
        }),
      }),
    }),
  },
}));

vi.mock("../../repositories/authUserRepository", () => ({ findAuthUserPhoneById }));

function mockReq(overrides: Partial<Request> = {}): Request {
  return { headers: {}, ...overrides } as Request;
}

describe("requireAuth", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("rejects requests with no bearer token", async () => {
    const req = mockReq();
    const next = vi.fn();

    await requireAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as InstanceType<typeof AppError>).status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("bad token") });
    const req = mockReq({ headers: { authorization: "Bearer bad" } });
    const next = vi.fn();

    await requireAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as InstanceType<typeof AppError>).status).toBe(401);
  });

  it("attaches req.user for a valid token", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1", phone: "919990002222" } }, error: null });
    const req = mockReq({ headers: { authorization: "Bearer good" } });
    const next = vi.fn();

    await requireAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: "user-1", phone: "919990002222" });
  });

  describe("superadmin token", () => {
    beforeEach(() => {
      findAuthUserPhoneById.mockReset();
    });

    it("attaches req.user for a valid superadmin token, without touching supabaseAdmin.auth.getUser", async () => {
      findAuthUserPhoneById.mockResolvedValue("919990003333");
      const token = issueSuperadminToken("superadmin-user-1");
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const next = vi.fn();

      await requireAuth(req, {} as Response, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({ id: "superadmin-user-1", phone: "919990003333" });
      expect(getUser).not.toHaveBeenCalled();
    });

    it("rejects a malformed/tampered superadmin token", async () => {
      const req = mockReq({ headers: { authorization: "Bearer superadmin:garbage.notasignature" } });
      const next = vi.fn();

      await requireAuth(req, {} as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next.mock.calls[0][0] as InstanceType<typeof AppError>).status).toBe(401);
      expect(req.user).toBeUndefined();
    });
  });
});

describe("requireSellerMembership", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
  });

  it("rejects when the caller has no seller membership", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const req = mockReq({ user: { id: "user-1", phone: null } });
    const next = vi.fn();

    await requireSellerMembership(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as InstanceType<typeof AppError>).status).toBe(403);
  });

  it("attaches sellerId/sellerRole on success", async () => {
    maybeSingle.mockResolvedValue({ data: { seller_id: "seller-1", role: "staff" }, error: null });
    const req = mockReq({ user: { id: "user-1", phone: null } });
    const next = vi.fn();

    await requireSellerMembership(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.sellerId).toBe("seller-1");
    expect(req.sellerRole).toBe("staff");
  });
});

describe("requireOwner", () => {
  it("rejects staff", () => {
    const req = mockReq({ sellerRole: "staff" });
    const next = vi.fn();

    requireOwner(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as InstanceType<typeof AppError>).status).toBe(403);
  });

  it("allows owner", () => {
    const req = mockReq({ sellerRole: "owner" });
    const next = vi.fn();

    requireOwner(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});

describe("requireSuperadmin", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
  });

  it("rejects when the caller has no superadmins row", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const req = mockReq({ user: { id: "user-1", phone: null } });
    const next = vi.fn();

    await requireSuperadmin(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as InstanceType<typeof AppError>).status).toBe(403);
    expect(req.isSuperadmin).toBeUndefined();
  });

  it("attaches req.isSuperadmin on success", async () => {
    maybeSingle.mockResolvedValue({ data: { user_id: "user-1" }, error: null });
    const req = mockReq({ user: { id: "user-1", phone: null } });
    const next = vi.fn();

    await requireSuperadmin(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.isSuperadmin).toBe(true);
  });
});
