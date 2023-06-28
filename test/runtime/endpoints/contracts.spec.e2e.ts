
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/lib/Option';
import * as TE from 'fp-ts/TaskEither'
import { close } from '../../../src/language/core/v1/semantics/contract/close'
import { RuntimeClient } from '../../../src/runtime/client';
import { initialise } from '../../../src/runtime/write/command';
import { initialiseBankAndverifyProvisionning } from '../provisionning'
import { getBankPrivateKey, getBlockfrostContext, getMarloweRuntimeUrl } from '../context';
import { noTags } from '../../../src/runtime/common/metadata/tag';


describe('contracts endpoints', () => {

  const runtimeClient = RuntimeClient(getMarloweRuntimeUrl())

  it(' can build a Tx for Initialising a Marlowe Contract' +
    '(can POST: /contracts/ )', async () => {
      await
        pipe(initialiseBankAndverifyProvisionning
          (RuntimeClient(getMarloweRuntimeUrl()))
          (getBlockfrostContext())
          (getBankPrivateKey())
          , TE.bind('postContractResponse', ({ bank }) =>
            runtimeClient.contracts.post({
              contract: close
              , version: 'v1'
              , metadata: {}
              , tags: {}
              , minUTxODeposit: 2_000_000
            }
              , {
                changeAddress: bank.address
                , usedAddresses: O.none
                , collateralUTxOs: O.none
              }))
          , TE.map(({ postContractResponse }) => postContractResponse)
          , TE.match(
            (e) => { console.dir(e, { depth: null }); expect(e).not.toBeDefined() },
            () => { }))()

    }, 100_000),
    it('can Initialise a Marlowe Contract ' +
      '(can POST: /contracts/ => build the Tx server side' +
      ' and PUT : /contracts/{contractid} => Append the Contract Tx to the Cardano ledger' +
      ' and GET /contracts/{contractid} => provide details about the contract initialised)', async () => {
        await
          pipe(initialiseBankAndverifyProvisionning
            (RuntimeClient(getMarloweRuntimeUrl()))
            (getBlockfrostContext())
            (getBankPrivateKey())
            , TE.bindW('contractDetails', ({ bank }) =>
              initialise
                (runtimeClient)
                (bank)
                ({
                  contract: close
                  , version: 'v1'
                  , metadata: {}
                  , tags: {}
                  , minUTxODeposit: 2_000_000
                }))
            , TE.match(
              (e) => {
                console.dir(e, { depth: null });
                expect(e).not.toBeDefined()
              },
              () => { }))()

      }, 100_000),
    it('can navigate throught Initialised Marlowe Contracts pages' +
      '(GET:  /contracts/)', async () => {
        await
          pipe(initialiseBankAndverifyProvisionning
            (RuntimeClient(getMarloweRuntimeUrl()))
            (getBlockfrostContext())
            (getBankPrivateKey())
            , TE.bindW('firstPage', () => runtimeClient.contracts.getHeadersByRange(O.none)(['swap.L1.by.marlowe.team', "initialised"]))
            , TE.match(
              (e) => { console.dir(e, { depth: null }); expect(e).not.toBeDefined() },
              (a) => { console.log("result",a.firstPage.headers.length)}))()


      }, 100_000)
})

