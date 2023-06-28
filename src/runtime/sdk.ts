import { DecodingError } from './common/codec';
import { ContractDetails } from './contract/details';
import { ContractId } from './contract/id';
import { RuntimeClient, RuntimeClientAPI } from './client';
import { ApplyInputsPayload, InitialisePayload, WithdrawPayload } from './write/command';
import * as Command from './write/command';
import * as Transaction from './contract/transaction/details';
import * as Withdrawal from './contract/withdrawal/details';
import * as TE from 'fp-ts/TaskEither'
import * as T from 'fp-ts/Task'
import { pipe } from 'fp-ts/lib/function';

import { getExtensionInstance } from '../wallet/cip30/index.ts';
import { AddressBech32 } from './common/address';
import { WalletAPI } from '../wallet/api';
import * as S from '../wallet/singleAddress';
import { mkEnvironment } from '../language/core/v1/semantics/environment';
import { addMinutes } from 'date-fns';
import { Next } from '../language/core/v1/semantics/next';
import { Party } from 'src/language/core/v1/semantics/contract/common/payee/party';
import { PolicyId } from './common/policyId';


export type SDK = 
  { commands : {
        initialise  : (payload: InitialisePayload)   => TE.TaskEither<Error | DecodingError,ContractDetails>
        applyInputs : (contractId : ContractId)    
                   => (payload : ApplyInputsPayload) => TE.TaskEither<Error | DecodingError,Transaction.Details>
        withdraw    : (payload : WithdrawPayload)    => TE.TaskEither<Error | DecodingError,Withdrawal.Details>   
    }
    nextAndApplyInput : (contractId: ContractId) => (provideInput : ProvideInput) =>  TE.TaskEither<Error | DecodingError,Next>
  }


export type ProvideInput = (next:Next) => ApplyInputsPayload

export const cip30SDK 
  : (extensionName : string) 
  => (runtimeClient : RuntimeClientAPI) 
  => T.Task<SDK> = 
  (extensionName) => (runtimeUrl) =>
    pipe( getExtensionInstance (extensionName) 
        , T.map (sdk (runtimeUrl)))
    

export const singleAddressSDK 
  :  ( context:S.Context) 
  => (privateKeyBech32: string) 
  => (runtimeClient : RuntimeClientAPI) 
  => T.Task<SDK> = 
  (context) => (privateKeyBech32) => (runtimeUrl) => 
    pipe( S.SingleAddressWallet.Initialise (context,privateKeyBech32)
        , T.map (sdk (runtimeUrl)))


export const sdk 
  :  (runtimeClient : RuntimeClientAPI)  
  =>  (walletApi : WalletAPI) 
  => SDK = (runtimeClient) => (walletAPI) => 
    ({ commands : 
        { initialise : (payload : InitialisePayload) => 
              Command.initialise (runtimeClient)(walletAPI)(payload)
        , applyInputs : (contractId : ContractId) => (payload : ApplyInputsPayload) =>
              Command.applyInputs 
                (runtimeClient)
                (walletAPI)
                (contractId)
                (payload)
        , withdraw : (payload : WithdrawPayload) =>
              Command.withdraw 
                (runtimeClient)
                (walletAPI)
                (payload)
        }
     , nextAndApplyInput : (contractId : ContractId) => (provideInput:ProvideInput) =>
          pipe( runtimeClient.contracts.contract.get (contractId)
              , TE.chain (header => TE.fromTask(getParties(walletAPI)(header.roleTokenMintingPolicyId)))
              , TE.chain( parties => 
                    runtimeClient.contracts.contract.next 
                        (contractId)
                        (mkEnvironment 
                            (new Date()) 
                            (pipe(Date.now(),(date) => addMinutes(date,5))) ) 
                        (parties))
              ) 
    })

export const getParties 
  : (walletApi : WalletAPI) 
  =>  (roleTokenMintingPolicyId : PolicyId) 
  => T.Task<Party[]> 
    = (walletAPI) => (roleMintingPolicyId) => T.of ([])