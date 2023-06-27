import { ContractId } from "../id";
import { TextEnvelope } from "../../../runtime/common/textEnvelope";
import { optionFromNullable } from "io-ts-types";
import * as t from "io-ts";
import { BlockHeader } from "../../../runtime/common/block";
import { MarloweVersion } from "../../../runtime/common/version";
import { PolicyId } from "../../../runtime/common/policyId";
import { Metadata } from "../../../runtime/common/metadata";
import { TxStatus } from "../transaction/status";
import { TxOutRef } from "../../../runtime/common/tx/outRef";
import { Contract } from "../../../language/core/v1/semantics/contract";
import { MarloweState } from "../../../runtime/common/state";
import { RoleName } from "../role";
import { Bound } from "src/language/core/v1/semantics/contract/when/action/choice";
import { ChoiceId } from "src/language/core/v1/semantics/contract/common/value";
import { Party } from "src/language/core/v1/semantics/contract/common/payee/party";
import { Token } from "src/language/core/v1/semantics/contract/common/token";
import { AccountId } from "src/language/core/v1/semantics/contract/common/payee/account";

export type  CaseIndex = number
export const CaseIndex = t.number

export type  IsMerkleizedContinuation = boolean
export const IsMerkleizedContinuation = t.boolean

export type CanNotify = t.TypeOf<typeof CanNotify>
export const CanNotify 
  = t.type(
      { case_index: CaseIndex
      , is_merkleized_continuation: IsMerkleizedContinuation
    })

export type CanDeposit = t.TypeOf<typeof CanDeposit>
export const CanDeposit 
    = t.type(
        { case_index: CaseIndex
        , party : Party
        , can_deposit : t.bigint
        , of_token : Token
        , into_account : AccountId
        , is_merkleized_continuation: IsMerkleizedContinuation
    })

export type CanChoose = t.TypeOf<typeof CanDeposit>
export const CanChoose 
    = t.type(
        { case_index: CaseIndex
        , for_choice : ChoiceId
        , can_choose_between : t.array(Bound)
        , is_merkleized_continuation: IsMerkleizedContinuation
    })

export type ApplicableInputs = t.TypeOf<typeof ApplicableInputs>
export const ApplicableInputs 
  = t.type(
      { notify: optionFromNullable(MarloweState)
      , deposits: t.array(CanDeposit)
      , choices: t.array(CanChoose)
    })

export type Next = t.TypeOf<typeof Next>
export const Next 
  = t.type(
      { can_reduce: t.boolean
      , applicable_inputs: t.array(ApplicableInputs)
    })