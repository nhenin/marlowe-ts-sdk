import { AxiosInstance } from 'axios';
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/lib/function';
import * as HTTP from '../../../runtime/common/http';
import {formatValidationErrors} from 'io-ts-reporters'
import { DecodingError } from '../../../runtime/common/codec';
import { ContractId, unContractId } from '../id';
import { Environment } from '../../../language/core/v1/semantics/environment';
import { Next } from '../../../language/core/v1/semantics/next';
import { Party } from '../../../language/core/v1/semantics/contract/common/payee/party';
import { stringify } from 'qs';

export type GET 
    =  ( contractId: ContractId) 
    => (environment : Environment) 
    => (parties : Party[]) 
    => TE.TaskEither<Error | DecodingError, Next>

export const getViaAxios:(axiosInstance: AxiosInstance) => GET
    = (axiosInstance) => (contractId) => (environment) => (parties) =>
        pipe(HTTP.Get(axiosInstance)
                ( contractNextEndpoint(contractId) 
                    + `?validityStart=${environment.validityStart}?validityEnd=${environment.validityEnd}?`
                    +  stringify(({party:parties}), { indices: false }) 
                , { headers: { Accept: 'application/json'
                             , 'Content-Type':'application/json'}})
            , TE.chainW( data => TE.fromEither(E.mapLeft(formatValidationErrors)(Next.decode(data)))))
            

const contractNextEndpoint = (contractId: ContractId):string => 
    (`/contracts/${encodeURIComponent(unContractId(contractId))}/next`)