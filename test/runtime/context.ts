import { Network } from "lucid-cardano";
import { Context, getPrivateKeyFromHexString } from "../../src/adapter/wallet/lucid";


export function getBlockfrostContext () : Context {
    const { BLOCKFROST_URL, BLOCKFROST_PROJECT_ID, NETWORK_ID } = process.env;
    return new Context ( BLOCKFROST_PROJECT_ID as string
                             , BLOCKFROST_URL  as string
                             , NETWORK_ID as Network);
  };
  
export function getBankPrivateKey () : string {
    const { BANK_PK } = process.env;
    return getPrivateKeyFromHexString(BANK_PK as string)
}
  
export function getMarloweRuntimeUrl () : string {
    const { MARLOWE_WEB_SERVER_URL} = process.env;
    return MARLOWE_WEB_SERVER_URL as string
};
  