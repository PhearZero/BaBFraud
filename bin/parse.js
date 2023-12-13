import fs from "node:fs"
import data from '../bab-votes.json' assert {type: 'json'}

const { accounts, votes } = data

// Closed Accounts are most likely Bots
const bots = {}
// New or Empty Accounts
const lowConfidence = {}
// Users with ecosystem engagement
const valid = {}
// Unknown bad actors, closed accounts we can't associate with a bot account
const actionItems = {}

const GREG = "FRAUDD77SWCXYGJZS7G5GTNISGWQMM3JEIJIUNGOT64CTG25DJNA45EB7Y"
const minTimestamp = 1701410400;

const knownOffenders = [
    "HFKAURI5Q6KC6IHKX4VBV6YYZJNQ7WLQUINSM2HDF6UYJWZULREZVDF5HQ",
    "PJB7E4FCGTO4COTNNTASO3S2CZF4RKEW4XIH2GRKNDQC372GRVSOZEG22U",
    "K3PDDOJ4WTSEQ3AXQTXQBRGWUVCDYHG3VXWVKFP26H2FU4OOLO5MQD4DVM",
    "XYRBD5RCNJMFG5BZBCYUP66PPPJ3WILEM5E2BV2XI4F3JAV7ESCACBORJY",
    "QYXDGS2XJJT7QNR6EJ2YHNZFONU6ROFM6BKTBNVT63ZXQ5OC6IYSPNDJ4U",
    "FAUC7F2DF3UGQFX2QIR5FI5PFKPF6BPVIOSN2X47IKRLO6AMEVA6FFOGUQ",
    "5KOICB2OKDCALDOMS5EOTMN37H2ACRC6CCULJ5VX5O6EOVQFTXIP6DID3U",
    "JZ3GFSWHKR46BDFDCUDMQWVFJ5TO4MZPOQ4TIVVWUWT3G5XOWGHF7VHVZI",
    "2F6R6FFX5653X64NUSXALYCGGXZDBBGNORREQ5BZDRVW4JDBJ5AHOC3SZQ",
    "U7EUN25Y3UBLBUE5DKC4ZNYCMJSOIPSFMGMPPOSFWCW4IL72YTMKEXMNBU",
    "E6HUOCIWONLD2CBU6Z45OY7CQOWAVXGNFKCS77MZSGV6I2KKMFRJMQ4JRY",
    "2IZ4A4RUTTLW2UFINGILDIO3AHHMLWLCILYPXOREVMQ5RPAGC5AT4HS54I",
    "KLLTU6JNZRLDFOEI6K4RBU2YSP3SUWL4CGRMO33EA3F7P2QJ7IXATHY2GY",
    "5GW5VO4JNTHXVH2DYV7HAKBKGQFSCAI4MBUD5EN3FLBGLF4KKRXJE24ASI"
]
Object.keys(accounts).forEach((k)=>{
    const account = accounts[k]
    // Any closed accounts must be treated as malicious
    const isBot = account["close_out"]

    // Newer accounts or Empty Accounts are not included, test to see if the users are active
    const isNewAccount = account["created_at_timestamp"] > minTimestamp
    const isEmptyAccount = account["apps"] === 0 || account["assets"] === 0

    // Filter for any known offenders
    const isBadActor = knownOffenders.includes(k) || knownOffenders.includes(account["first_transaction_from"])

    // Greg, filter him out
    const isGreg = account["first_transaction_from"] === GREG

    if(!isGreg){
        // Exclude bots
        if(isBot){
            // Get actionable items, any accounts that have been closed that we don't know about yet
            if(!isBadActor){
                actionItems[k] = account
            }
            // TODO: Investigate the bots
            bots[k] = account
        }
        // Sorry to any valid users with a sock account for voting
        else if (isEmptyAccount || isNewAccount){
            lowConfidence[k] = account
        }
        // If they are not a known bad actor, they must be an active member of the community
        else if(!isBadActor) {
            valid[k] = account
        }
    }
})

console.log(`Found ${Object.keys(bots).length} bot accounts`)
console.log(`Dropped ${Object.keys(lowConfidence).length} questionable users`)
console.log(`Found ${Object.keys(valid).length} voters`)

fs.writeFileSync('./research/bots.json', JSON.stringify(bots, null, 2))
fs.writeFileSync('./research/action-items.json', JSON.stringify(actionItems, null, 2))
fs.writeFileSync('./research/questionable-users.json', JSON.stringify(lowConfidence, null, 2))
fs.writeFileSync('./research/valid-voters.json', JSON.stringify(valid, null, 2))

const aurally = {}
const tq = {}
const tally = Object.keys(votes).map((k)=>{
    const res = Object.keys(valid).filter((acct)=>{
        const isValid = votes[k].includes(acct)
        if(k === "Aurally"){
            aurally[acct] = valid[acct]
        }
        if(k === "TameQuest"){
            tq[acct] = valid[acct]
        }
        return isValid
    })
    return {name: k, count: res.length}
})

console.log("Results:")
console.log(tally)

fs.writeFileSync("./votes/aurally.json", JSON.stringify(aurally, null, 2))
fs.writeFileSync("./votes/tame-quest.json", JSON.stringify(tq, null, 2))
