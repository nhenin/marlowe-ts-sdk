
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/lib/Option';

import { getBankPrivateKey, getBlockfrostContext, getMarloweRuntimeUrl } from '../context';
import { addDays } from 'date-fns/fp'
import { datetoTimeout } from '../../../src/language/core/v1/semantics/contract/when'
import * as Tx from '../../../src/runtime/contract/transaction/id'
import { addMinutes, subMinutes } from 'date-fns'
import { datetoIso8601 } from '../../../src/adapter/time'
import { inputNotify } from '../../../src/language/core/v1/semantics/contract/when/input/notify'
import { initialiseBankAndverifyProvisionning } from '../provisionning'
import { oneNotifyTrue } from '../../../src/language/core/v1/examples/contract-one-notify'
import { RuntimeClient } from '../../../src/runtime/client';


describe('Contracts/{contractd}/Transactions endpoints', () => {

  it('can Build Apply Input Tx : ' + 
     '(can POST: /contracts/{contractId}/transactions => ask to build the Tx to apply input on an initialised Marlowe Contract)', async () => {                           
    await  
      pipe( initialiseBankAndverifyProvisionning
              (RuntimeClient(getMarloweRuntimeUrl()))
              (getBlockfrostContext ())
              (getBankPrivateKey()) 
          , TE.let (`notifyTimeout`,   () => pipe(Date.now(),addDays(1),datetoTimeout))
          , TE.bind('result',({runtimeClient,sdk,bank,notifyTimeout}) =>
                pipe
                  ( sdk.commands.initialise
                    ( { contract: oneNotifyTrue(notifyTimeout)
                        , version: 'v1'
                        , metadata: {}
                        , tags : {}
                        , minUTxODeposit: 2_000_000})
                  , TE.chainW ((contractDetails) =>       
                     runtimeClient.contracts.contract.transactions.post
                        (contractDetails.contractId
                        , { version : "v1"
                          , inputs : [inputNotify]
                          , metadata : {}
                          , tags : {}
                          , invalidBefore    : pipe(Date.now(),(date) => subMinutes(date,5),datetoIso8601)
                          , invalidHereafter : pipe(Date.now(),(date) => addMinutes(date,5),datetoIso8601) }
                        , { changeAddress: bank.address
                          , usedAddresses: O.none
                          , collateralUTxOs: O.none}) )
                  ))
          , TE.map (({result}) => result)
          , TE.match(
              (e) => { console.dir(e, { depth: null }); expect(e).not.toBeDefined()},
              () => {})
          ) ()
                              
  },100_000),
  it('can Apply Inputs : ' + 
     '(can POST: /contracts/{contractId}/transactions => ask to build the Tx to apply input on an initialised Marlowe Contract' + 
     ' ,   PUT:  /contracts/{contractId}/transactions/{transactionId} => Append the Applied Input Tx to the ledger' + 
     ' ,   GET:  /contracts/{contractId}/transactions/{transactionId} => retrieve the Tx state' +
     ' and GET : /contracts/{contractId}/transactions => should see the unsigned transaction listed)', async () => {
    await  
      pipe( initialiseBankAndverifyProvisionning
              (RuntimeClient(getMarloweRuntimeUrl()))
              (getBlockfrostContext ())
              (getBankPrivateKey()) 
          , TE.let (`notifyTimeout`,   () => pipe(Date.now(),addDays(1),datetoTimeout))
          , TE.bind('result',({runtimeClient,sdk,bank,notifyTimeout}) =>
                pipe
                  ( sdk.commands.initialise
                    ( { contract: oneNotifyTrue(notifyTimeout)
                        , version: 'v1'
                        , metadata: {}
                        , tags : {}
                        , minUTxODeposit: 2_000_000})
                  , TE.chainW ((contractDetails) =>       
                        sdk.commands.applyInputs
                          (contractDetails.contractId)
                          ({ version : "v1"
                            , inputs : [inputNotify]
                            , metadata : {}
                            , tags : {}}))
                  , TE.chainFirstW ((txDetails) => 
                        bank.waitConfirmation(pipe(txDetails.transactionId, Tx.idToTxId)))
                  , TE.chainW ( postResult =>  
                     runtimeClient.contracts.contract.transactions.getHeadersByRange (postResult.contractId,O.none))
                  , TE.map ((result) =>  expect(result.headers.length).toBe(1))))
          , TE.match(
              (e) => { console.dir(e, { depth: null }); expect(e).not.toBeDefined()},
              () => {})
          ) ()                                      
  },100_000)
})



