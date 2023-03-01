import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as API from '@blockfrost/blockfrost-js'
import { Blockfrost, Lucid, C, Network, PrivateKey, PolicyId, getAddressDetails, toUnit, fromText } from 'lucid-cardano';
import * as O from 'fp-ts/Option'
import { matchI } from 'ts-adt';
import getUnixTime from 'date-fns/getUnixTime';
import { addDays, addHours,addMinutes, addSeconds } from 'date-fns/fp'


export class Token {
    policyId:string;
    tokenName:string;

    public constructor(policyId:string,tokenName:string){
        this.policyId  = policyId;
        this.tokenName = tokenName;
    }
}
export type Address = string;

export class Configuration {
    projectId:string;
    network:Network;
    blockfrostUrl:string

    public constructor (projectId:string, blockfrostUrl:string,network:Network, ) {
        this.projectId = projectId;
        this.network = network;
        this.blockfrostUrl = blockfrostUrl;
    }
}

export const getPrivateKeyFromHexString = (privateKeyHex:string) : PrivateKey => C.PrivateKey.from_bytes(Buffer.from(privateKeyHex, 'hex')).to_bech32()

export class SingleAddressAccount {
    private privateKeyBech32: string;
    private configuration:Configuration;
    private lucid : Lucid;
    private blockfrostApi: API.BlockFrostAPI;
    
    public address : Address;
    
    private constructor (configuration:Configuration,privateKeyBech32:PrivateKey) {
        this.privateKeyBech32 = privateKeyBech32;
        this.configuration = configuration;
        this.blockfrostApi = new API.BlockFrostAPI({projectId: configuration.projectId}); 
    }

    public static async Initialise ( configuration:Configuration, privateKeyBech32: string) {
        const account = new SingleAddressAccount(configuration,privateKeyBech32);
        await account.initialise();
        return account;
    }

    public static async Random ( configuration:Configuration) {
        const privateKey = C.PrivateKey.generate_ed25519().to_bech32();
        const account = new SingleAddressAccount(configuration,privateKey);
        await account.initialise();
        return account;
    }

    private async initialise () {
        this.lucid = await Lucid.new(new Blockfrost(this.configuration.blockfrostUrl, this.configuration.projectId),this.configuration.network);
        this.lucid.selectWalletFromPrivateKey(this.privateKeyBech32);
        this.address = await this.lucid.wallet.address ();
     }
    
    public async adaBalance () { 
        const content = await this.blockfrostApi.addresses(this.address);
        return pipe( content.amount??[]
            , A.filter((amount) => amount.unit === "lovelace")
            , A.map((amount) => Number(amount.quantity))
            , A.head
            , O.getOrElse(() => 0));
                     
    }
    
    public async tokenBalance (token:Token) { 
        const content = await this.blockfrostApi.addresses(this.address);
        const unit = toUnit(token.policyId, fromText(token.tokenName))
        return pipe( content.amount??[]
            , A.filter((amount) => amount.unit === unit)
            , A.map((amount) => Number(amount.quantity))
            , A.head
            , O.getOrElse(() => 0));
                     
    }

    public async provision(account: SingleAddressAccount, lovelaces: bigint) : Promise<Boolean> {
        console.log ('Provisioning:',account.address); 
        const tx = await this.lucid.newTx()
                    .payToAddress(account.address, { lovelace:lovelaces})
                    .complete();

        const signedTx = await tx.sign().complete();
        const txHash = await signedTx.submit();
        console.log(`transaction ${txHash} submitted.`);
        return this.lucid.awaitTx(txHash);
    }
    
    public async mintTokens(tokenName:string, amount: bigint) : Promise<Token> {
        const { paymentCredential } = getAddressDetails(this.address);
        const before = this. lucid.utils.unixTimeToSlot(pipe(Date.now(),addMinutes(5),getUnixTime))
        const validTo = this. lucid.utils.unixTimeToSlot(pipe(Date.now(),addSeconds(5),getUnixTime))
        const mintingPolicy = this.lucid.utils.nativeScriptFromJson({
            type: "all",
            scripts: [
              {
                type: "before",
                slot:before,
              },
              { type: "sig", keyHash: paymentCredential?.hash! }
            ],
          });
        
        const policyId = this.lucid.utils.mintingPolicyToId(mintingPolicy);    
        const tx = await this.lucid.newTx()
                            .mintAssets({[toUnit(policyId, fromText(tokenName))]: amount})
                            .validTo(validTo)
                            .attachMintingPolicy(mintingPolicy)
                            .complete();
        const signedTx = await tx.sign().complete();
        const txHash = await signedTx.submit();
        console.log(`transaction ${txHash} submitted.`);
        return this.lucid.awaitTx(txHash).then((result) => new Token(policyId,tokenName));
    }
}




// const privateKey = lucid.utils.generatePrivateKey();
//       console.log('Private', privateKey);