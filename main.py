import requests
import json
from collections import defaultdict
import base64

app_id = 1272433669

names = ["CompX", "TameQuest", "Janus", "Aurally", "DAOWakanda"]



def get(url):
    response = requests.get(url)
    return json.loads(response.content)

def get_block_timestamp(block):
    block = get(f"https://mainnet-idx.algonode.cloud/v2/blocks/{block}")
    return block["timestamp"]


def get_account_age(address):
    account = get(f"https://mainnet-idx.algonode.cloud/v2/accounts/{address}?include-all=true")
    return account["account"]["created-at-round"]

def get_opt_ins(address):
    data = get(f"https://mainnet-idx.algonode.cloud/v2/accounts/{address}")
    if "account" in data:
        acc = data["account"]
        opt_in_apps = acc["total-apps-opted-in"]
        opt_in_assets = acc["total-assets-opted-in"]
        return opt_in_apps, opt_in_assets, False
    else:
        return 0, 0, True
def get_transactions_before_vote(address, vote_block):
    tx = get(f"https://mainnet-idx.algonode.cloud/v2/transactions?address={address}&address-role=receiver&max-round={vote_block}")
    transactions = tx["transactions"]
    return len(transactions), transactions[0]["sender"]

def get_bab_transactions(votes, ages, next = None):
    url = f"https://mainnet-idx.algonode.cloud/v2/transactions?application-id={app_id}&tx-type=appl&limit=1000"
    if next:
        url += f"&next={next}"
    data = get(url)
    for i, transaction in enumerate(data["transactions"]):
        if ("application-transaction" in transaction):
            application_args = transaction["application-transaction"]["application-args"]
            if len(application_args) == 6:
                address = transaction["sender"]
                vote_block = transaction["confirmed-round"]
                choice = transaction["application-transaction"]["application-args"][3]
                bytes = base64.b64decode(choice)[-5:]
                choices = [int(bt) for bt in bytes]
                if address not in votes["total"]:
                    apps, assets, close_out = get_opt_ins(address)
                    txs_before_vote, first_transaction_from = get_transactions_before_vote(address, vote_block)
                    ages[address] = {
                        "apps": apps,
                        "assets": assets,
                        "close_out": close_out,
                        "first_transaction_from": first_transaction_from,
                        "created_at_timestamp": get_block_timestamp(get_account_age(address)),
                        "received_transactions_before_vote": txs_before_vote,
                    }
                    print(f"TX [{i + 1}/{len(data['transactions'])}]", address, choices, ages[address])
                    votes["total"].add(address)
                    for index, choice in enumerate(choices):
                        if choice == 0:
                            votes[names[index]].add(address)
    return data.get("next-token", None)

votes = defaultdict(lambda: set())
ages = defaultdict(lambda: 0)

try:
    with open("./bab-votes.json", "r") as f:
        data = json.load(f)
        votes = data["votes"]
        for key in votes:
            votes[key] = set(votes[key])
        ages = data["accounts"]
except Exception as e:
    print(e)


next_token = get_bab_transactions(votes, ages)
while next_token is not None:
    print(next_token)
    next_token = get_bab_transactions(votes, ages, next_token)

for key in votes:
    votes[key] = list(votes[key])

with open("./bab-votes.json", "w+") as f:
    f.write(json.dumps({"votes": votes, "accounts": ages}))
