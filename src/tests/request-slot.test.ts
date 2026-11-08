import { MakeParameterAndPropertyDecorator } from "@antelopejs/interface-core/decorators";
import {
  Context,
  Controller,
  Get,
  Prefix,
  type RequestContext,
  SetParameterProvider,
} from "../index";

import { FetchTest } from "./fetch-test";

interface TenantContext extends RequestContext {
  tenant: string;
}

const Tenant = MakeParameterAndPropertyDecorator((target, key, index) =>
  SetParameterProvider(
    target,
    key,
    index,
    (context: TenantContext) => context.tenant,
  ),
);

export class TestRequestSlotController extends Controller("/request-slot") {
  @Prefix("get", "testTenant")
  setTenant(@Context() context: TenantContext) {
    context.tenant = context.url.searchParams.get("tenant") ?? "";
  }

  @Get()
  testTenant(@Tenant() tenant: string) {
    return tenant;
  }
}

describe("Request slot", () => {
  FetchTest("Provider reads the slot a prefix handler set", {
    route: "/request-slot/testTenant?tenant=acme",
    method: "GET",
    status: 200,
    result: "acme",
  });
});
