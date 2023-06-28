import { pipe } from 'fp-ts/function'
import * as Examples from '../../../src/language/core/v1/examples/swaps/swap-token-token'
import { addDays } from 'date-fns/fp'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import { getBankPrivateKey, getBlockfrostContext, getMarloweRuntimeUrl } from '../context';
import { datetoTimeout } from '../../../src/language/core/v1/semantics/contract/when'
import { RuntimeClient } from '../../../src/runtime/client'
import { provisionAnAdaAndTokenProvider } from '../provisionning'
import { adaValue } from '../../../src/language/core/v1/semantics/contract/common/token'

describe('withdrawals endpoints ', () => {

  const runtimeClient = RuntimeClient(getMarloweRuntimeUrl())
  const provisionScheme = 
  { provider : { adaAmount : 20_000_000n}
  , swapper : { adaAmount :20_000_000n , tokenAmount : 50n, tokenName : "TokenA" }}
  
  const executeSwapWithRequiredWithdrawalTillClosing 
    = pipe( provisionAnAdaAndTokenProvider 
              (RuntimeClient(getMarloweRuntimeUrl()))
              (getBlockfrostContext ())
              (getBankPrivateKey())
              (provisionScheme)
          , TE.let (`swapRequest`, ({tokenValueMinted}) => 
              ({ provider : 
                  { roleName : 'Ada provider'
                  , depositTimeout : pipe(Date.now(),addDays(1),datetoTimeout)
                  , value : adaValue(2n)}
               , swapper : 
                  { roleName : 'Token provider'
                  , depositTimeout : pipe(Date.now(),addDays(2),datetoTimeout)
                  , value : tokenValueMinted}
              }))
          , TE.let (`swapContract`, ({swapRequest}) => Examples.mkSwapContract(swapRequest))
          , TE.bindW('contractDetails',({sdk,adaProvider,tokenProvider,swapRequest,swapContract}) => 
              pipe( sdk(adaProvider).commands.initialise 
                      ( { contract: swapContract
                        , roles: {[swapRequest.provider.roleName] : adaProvider.address 
                                 ,[swapRequest.swapper.roleName]  : tokenProvider.address}
                        , version: 'v1'
                        , metadata: {}
                        , tags : {}
                        , minUTxODeposit: 3_000_000})
                  , TE.chainW ((contractDetails) =>       
                    sdk(adaProvider).commands.applyInputs
                        (contractDetails.contractId)
                        ({ version : "v1"
                          , inputs : [swapWithRequiredWithdrawalAndExpectedInputs.adaProviderInputDeposit]
                          , metadata : {}
                          , tags : {}}))
                  , TE.chainW (contractDetails =>       
                    sdk(tokenProvider).commands.applyInputs
                          (contractDetails.contractId)
                          ({ version : "v1"
                            , inputs : [swapWithRequiredWithdrawalAndExpectedInputs.tokenProviderInputDeposit]
                            , metadata : {}
                            , tags : {}})
                            ))) )  

  it('can build a withdraw Tx : ' +
     '(can POST : /withdrawals => ask to build the Tx to withdraw assets on the closed contract )' , async () => {
            
    await 
      pipe( executeSwapWithRequiredWithdrawalTillClosing              
            , TE.bindW('result',({adaProvider,contractDetails}) => 
                  pipe( runtimeClient.withdrawals.post 
                          ( { contractId : contractDetails.contractId
                            , role : 'Ada provider' }
                          , { changeAddress: adaProvider.address
                            , usedAddresses: O.none
                            , collateralUTxOs: O.none})
                      )) 
            , TE.match(
              (e) => { console.dir(e, { depth: null }); expect(e).not.toBeDefined()},
              () => { } )) ()

                              
  },1000_000); 

  it('can withdraw : ' +
     '(can POST : /withdrawals => ask to build the Tx to withdraw assets on the closed contract )' + 
     ' and PUT  : /withdrawals/{withdrawalId} => Append the withdraw Tx to the ledger' + 
     ' and GET  : /withdrawals/{withdrawalId} => retrieve the Tx state', async () => {
            
    await 
      pipe( executeSwapWithRequiredWithdrawalTillClosing              
          , TE.bindW('result',({adaProvider,tokenProvider,contractDetails,sdk}) => 
                      pipe 
                        ( sdk((adaProvider)).commands.withdraw 
                            ( { contractId : contractDetails.contractId
                              , role : 'Ada provider' })
                        , TE.chain (() => 
                          sdk((tokenProvider)).commands.withdraw  
                            ( { contractId : contractDetails.contractId
                              , role : 'Token provider' })) )) 
            , TE.match(
              (e) => { console.dir(e, { depth: null }); expect(e).not.toBeDefined()},
              () => {} )) ()

                              
  },1000_000); 
});

