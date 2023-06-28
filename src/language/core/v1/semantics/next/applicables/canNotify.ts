import * as t from "io-ts";
import { IsMerkleizedContinuation } from "../common/IsMerkleizedContinuation";
import { CaseIndex } from "../common/caseIndex";
import { InputNotify } from "../../contract/when/input/notify";


export type CanNotify = t.TypeOf<typeof CanNotify>
export const CanNotify 
  = t.type(
      { case_index: CaseIndex
      , is_merkleized_continuation: IsMerkleizedContinuation
    })


export const toInputNotify : (canNotify : CanNotify) => (InputNotify) =
  (canNotify) => ('input_notify')