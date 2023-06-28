

import { pipe } from 'fp-ts/function'
import * as Examples from '../../../src/language/core/v1/examples/swaps/swap-ada-token'
import { addDays } from 'date-fns/fp'
import * as TE from 'fp-ts/TaskEither'
import { getBankPrivateKey, getBlockfrostContext, getMarloweRuntimeUrl } from '../context';
import { datetoTimeout } from '../../../src/language/core/v1/semantics/contract/when'
import { provisionAnAdaAndTokenProvider } from '../provisionning'
import { RuntimeClient } from '../../../src/runtime/client';


describe('swap', () => {
  it('can execute the nominal case', async () => {

    const provisionScheme = 
      { adaProvider : { adaAmount : 20_000_000n}
      , tokenprovider : { adaAmount :20_000_000n 
                        , tokenAmount : 50n
                        , tokenName : "TokenA" }}
  
    await 
      pipe( provisionAnAdaAndTokenProvider 
               (RuntimeClient(getMarloweRuntimeUrl()))
               (getBlockfrostContext ())
               (getBankPrivateKey())
               (provisionScheme)
            , TE.let (`swapRequest`,       ({tokenMinted}) => 
                ({ adaDepositTimeout   : pipe(Date.now(),addDays(1),datetoTimeout)
                 , tokenDepositTimeout : pipe(Date.now(),addDays(2),datetoTimeout)
                 , amountOfADA   : 3n
                 , amountOfToken : 10n
                 , token :tokenMinted }))
            , TE.let (`swapWithExpectedInputs`, ({swapRequest}) => 
                  Examples.swapAdaTokenWithExpectedInputs(swapRequest))
            , TE.bindW('swapClosedResult',({sdk,adaProvider,tokenProvider,swapWithExpectedInputs}) => 
                  pipe( sdk(adaProvider).commands.initialise 
                          ( { contract: swapWithExpectedInputs.swap
                            , roles: {'Ada provider'   : adaProvider.address 
                                     ,'Token provider' : tokenProvider.address}
                            , version: 'v1'
                            , metadata: {}
                            , tags : {}
                            , minUTxODeposit: 3_000_000})
                      , TE.chainW ((contractDetails) =>       
                        sdk(adaProvider).commands.applyInputs
                            (contractDetails.contractId)
                            ({ version : "v1"
                              , inputs : [swapWithExpectedInputs.adaProviderInputDeposit]
                              , metadata : {}
                              , tags : {}}))
                      , TE.chainW ((contractDetails) =>       
                        sdk(tokenProvider).commands.applyInputs
                              (contractDetails.contractId)
                              ({ version : "v1"
                                , inputs : [swapWithExpectedInputs.tokenProviderInputDeposit]
                                , metadata : {}
                                , tags : {}})))) 
            , TE.match(
              (e) => { console.dir(e, { depth: null }); expect(e).not.toBeDefined()},
              () => { } )) ()
                              
  },1000_000); 
});

