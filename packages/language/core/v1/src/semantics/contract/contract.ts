import * as t from "io-ts/lib/index.js";

import { Assert } from "./assert.js";
import { Close } from "./close.js";
import { If } from "./if.js";
import { Let } from "./let.js";
import { Pay } from "./pay.js";
import { When } from "./when/index.js";

export type Contract = Close | Pay | If | When | Let | Assert;

export const Contract: t.Type<Contract> = t.recursion("Contract", () =>
  t.union([Close, Pay, If, When, Let, Assert])
);
